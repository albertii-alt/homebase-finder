import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import { useToast } from "../hooks/use-toast";
import regionData from "../ph-json/region.json";
import provinceData from "../ph-json/province.json";
import cityData from "../ph-json/city.json";
import barangayData from "../ph-json/barangay.json";
import type { Boardinghouse } from "../hooks/useBoardinghouseStorage";
import { updateBoardinghouse } from "../hooks/useBoardinghouseStorage";

export default function EditBoardinghouse() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string>("");

  const [bh, setBh] = React.useState<Boardinghouse | null>(null);

  // form fields
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [ownerName, setOwnerName] = React.useState<string>("");

  // address types
  type RegionItem = { region_code?: string; region_name?: string };
  type ProvinceItem = { province_code?: string; province_name?: string; region_code?: string };
  type CityItem = { city_code?: string; city_name?: string; province_code?: string };
  type BarangayItem = {
    brgy_code?: string;
    brgy_name?: string;
    barangay_code?: string;
    barangay_name?: string;
    city_code?: string;
    mun_code?: string;
    citymunCode?: string;
    [k: string]: any;
  };

  // load static lists from JSON
  const regions: RegionItem[] = (regionData as any) ?? [];
  const provincesAll: ProvinceItem[] = (provinceData as any) ?? [];
  const citiesAll: CityItem[] = (cityData as any) ?? [];
  const barangaysAll: BarangayItem[] = (barangayData as any) ?? [];

  // cascading selection state
  const [selectedRegion, setSelectedRegion] = React.useState<string>("");
  const [selectedProvince, setSelectedProvince] = React.useState<string>("");
  const [selectedCity, setSelectedCity] = React.useState<string>("");
  const [selectedBarangay, setSelectedBarangay] = React.useState<string>("");

  const [provinces, setProvinces] = React.useState<ProvinceItem[]>([]);
  const [cities, setCities] = React.useState<CityItem[]>([]);
  const [barangays, setBarangays] = React.useState<BarangayItem[]>([]);

  const [street, setStreet] = React.useState<string>(""); // House No./Street Name
  const [zipCode, setZipCode] = React.useState<string>("");

  // detect barangay code/name keys (dataset uses brgy_code/brgy_name)
  const barangayCodeKey = React.useMemo(() => {
    const sample = barangaysAll[0] ?? {};
    if ("brgy_code" in sample) return "brgy_code";
    if ("barangay_code" in sample) return "barangay_code";
    if ("id" in sample) return "id";
    return "brgy_code";
  }, [barangaysAll]);

  const barangayNameKey = React.useMemo(() => {
    const sample = barangaysAll[0] ?? {};
    if ("brgy_name" in sample) return "brgy_name";
    if ("barangay_name" in sample) return "barangay_name";
    if ("name" in sample) return "name";
    return "brgy_name";
  }, [barangaysAll]);

  // load boardinghouse by id from localStorage on mount (or when params.id changes)
  React.useEffect(() => {
    const id = params.id ?? "";
    setSelectedId(id);
    try {
      const raw = localStorage.getItem("boardinghouses");
      if (!raw) {
        setBh(null);
        setLoading(false);
        return;
      }
      const list = JSON.parse(raw) as Boardinghouse[] | null;
      if (!Array.isArray(list)) {
        setBh(null);
        setLoading(false);
        return;
      }
      const found = list.find((b) => String(b.id) === String(id)) ?? null;
      setBh(found);
      setLoading(false);
    } catch (err) {
      console.warn("Failed to load boardinghouses from localStorage", err);
      setBh(null);
      setLoading(false);
    }
  }, [params.id]);

  // prefill form when bh is loaded
  React.useEffect(() => {
    if (!bh) return;
    setOwnerName(bh.ownerName ?? "");
    setContact(bh.contact ?? "");
    setName(bh.name ?? "");
    setDescription(bh.description ?? "");
    setFacebook(bh.facebook ?? "");
    setPhotos(bh.photos ?? []);

    // if structuredAddress exists, prefill selects and text fields
    const sa: any = (bh as any).structuredAddress ?? null;
    if (sa) {
      if (sa.region_code) {
        setSelectedRegion(String(sa.region_code));
        // populate provinces for this region so the previously saved province remains available
        const provs = provincesAll.filter((p) => String(p.region_code) === String(sa.region_code));
        setProvinces(provs);
      }
      if (sa.province_code) {
        setSelectedProvince(String(sa.province_code));
        // populate cities for this province so the previously saved city remains available
        const cs = citiesAll.filter((c) => String(c.province_code) === String(sa.province_code));
        setCities(cs);
      }
      if (sa.city_code) {
        setSelectedCity(String(sa.city_code));
        // populate barangays for this city so the previously saved barangay remains available
        const brgs = barangaysAll.filter((b) => {
          if ((b as any).city_code != null && String((b as any).city_code) === String(sa.city_code)) return true;
          if ((b as any).mun_code != null && String((b as any).mun_code) === String(sa.city_code)) return true;
          if ((b as any).citymunCode != null && String((b as any).citymunCode) === String(sa.city_code)) return true;
          if ((b as any).citymun_code != null && String((b as any).citymun_code) === String(sa.city_code)) return true;
          return Object.values(b).some((v) => typeof v !== "object" && String(v) === String(sa.city_code));
        });
        setBarangays(brgs);
      }
      // barangay code may be stored under few possible keys
      const saBrgyCode = sa.barangay_code ?? sa.brgy_code ?? sa.brgyCode ?? sa.barangayCode;
      if (saBrgyCode) setSelectedBarangay(String(saBrgyCode));
      setStreet(sa.street ?? "");
      setZipCode(sa.zip ?? "");
    } else {
      // best-effort: parse legacy address string into street
      setStreet(bh.address ?? "");
    }
  }, [bh, provincesAll, citiesAll, barangaysAll]);

  // cascading effects: region -> provinces
  React.useEffect(() => {
    if (!selectedRegion) {
      setProvinces([]);
      setSelectedProvince("");
      setCities([]);
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
      return;
    }
    const filtered = provincesAll.filter((p) => String(p.region_code) === String(selectedRegion));
    setProvinces(filtered);

    // only clear selectedProvince if it's no longer valid for this region
    if (!filtered.some((p) => String(p.province_code) === String(selectedProvince))) {
      setSelectedProvince("");
      setCities([]);
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
    } else {
      // if kept, ensure cities list is populated for the preserved province
      const citiesForProv = citiesAll.filter((c) => String(c.province_code) === String(selectedProvince));
      setCities(citiesForProv);
    }
  }, [selectedRegion, provincesAll, selectedProvince, citiesAll]);

  // province -> cities
  React.useEffect(() => {
    if (!selectedProvince) {
      setCities([]);
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
      return;
    }
    const filtered = citiesAll.filter((c) => String(c.province_code) === String(selectedProvince));
    setCities(filtered);

    // only clear selectedCity if it's no longer valid for this province
    if (!filtered.some((c) => String(c.city_code) === String(selectedCity))) {
      setSelectedCity("");
      setBarangays([]);
      setSelectedBarangay("");
    } else {
      // if kept, ensure barangays list is populated for the preserved city
      const brgs = barangaysAll.filter((b) => {
        if ((b as any).city_code != null && String((b as any).city_code) === String(selectedCity)) return true;
        if ((b as any).mun_code != null && String((b as any).mun_code) === String(selectedCity)) return true;
        if ((b as any).citymunCode != null && String((b as any).citymunCode) === String(selectedCity)) return true;
        if ((b as any).citymun_code != null && String((b as any).citymun_code) === String(selectedCity)) return true;
        return Object.values(b).some((v) => typeof v !== "object" && String(v) === String(selectedCity));
      });
      setBarangays(brgs);
    }
  }, [selectedProvince, citiesAll, selectedCity, barangaysAll]);

  // city -> barangays (match barangay.city_code === selectedCity)
  React.useEffect(() => {
    console.log("EditBH: selectedCity =", selectedCity);
    if (!selectedCity) {
      setBarangays([]);
      setSelectedBarangay("");
      return;
    }

    const filtered = barangaysAll.filter((b) => {
      if (b.city_code != null && String(b.city_code) === String(selectedCity)) return true;
      if (b.mun_code != null && String(b.mun_code) === String(selectedCity)) return true;
      if ((b as any).citymunCode != null && String((b as any).citymunCode) === String(selectedCity)) return true;
      if ((b as any).citymun_code != null && String((b as any).citymun_code) === String(selectedCity)) return true;
      // last resort - compare any primitive value
      return Object.values(b).some((v) => typeof v !== "object" && String(v) === String(selectedCity));
    });

    console.log("EditBH: barangay dataset sample keys:", barangaysAll[0] ? Object.keys(barangaysAll[0]).slice(0, 8) : "empty");
    console.log("EditBH: detected barangay code key:", barangayCodeKey, "name key:", barangayNameKey);
    console.log(`EditBH: filtered barangays for city ${selectedCity} => ${filtered.length} items`);

    setBarangays(filtered);

    // only clear selectedBarangay if it's no longer valid for this city
    if (!filtered.some((b) => String((b as any)[barangayCodeKey] ?? (b as any).brgy_code ?? (b as any).barangay_code ?? "") === String(selectedBarangay))) {
      setSelectedBarangay("");
    }
  }, [selectedCity, barangaysAll, barangayCodeKey, barangayNameKey, selectedBarangay]);

  const validate = (): boolean => {
    if (!name.trim()) {
      toast({ title: "Validation", description: "Name is required." });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || !bh) return;
    setSaving(true);
    try {
      const region = regions.find((r) => String(r.region_code) === String(selectedRegion));
      const province = provinces.find((p) => String(p.province_code) === String(selectedProvince));
      const city = cities.find((c) => String(c.city_code) === String(selectedCity));
      const barangayObj = barangays.find((b) => {
        const code = String((b as any)[barangayCodeKey] ?? (b as any).brgy_code ?? (b as any).barangay_code ?? "");
        return code && String(code) === String(selectedBarangay);
      });

      const updated = {
        ...bh,
        ownerName: ownerName.trim(),
        contact: contact.trim(),
        name: name.trim(),
        description: description.trim(),
        facebook: facebook.trim(),
        photos,
        structuredAddress: {
          region_code: selectedRegion,
          region_name: region?.region_name ?? "",
          province_code: selectedProvince,
          province_name: province?.province_name ?? "",
          city_code: selectedCity,
          city_name: city?.city_name ?? "",
          barangay_code: String((barangayObj as any)?.[barangayCodeKey] ?? (barangayObj as any)?.brgy_code ?? (barangayObj as any)?.barangay_code ?? ""),
          barangay_name: String((barangayObj as any)?.[barangayNameKey] ?? (barangayObj as any)?.brgy_name ?? (barangayObj as any)?.barangay_name ?? ""),
          street: street.trim(),
          zip: zipCode.trim(),
        },
        address: [street, (barangayObj as any)?.[barangayNameKey] ?? "", city?.city_name ?? "", province?.province_name ?? "", region?.region_name ?? ""].filter(Boolean).join(", "),
      } as unknown as Boardinghouse;

      const ok = updateBoardinghouse(updated);
      if (!ok) {
        toast({ title: "Update failed", description: "Failed to update boardinghouse." });
        setSaving(false);
        return;
      }

      toast({ title: "Updated", description: "Boardinghouse updated successfully." });
      setTimeout(() => {
        navigate("/my-boardinghouse");
      }, 600);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  // UploadPhotosSection re-used in Edit (same as Add) so owners can edit photos
  const UploadPhotosSection: React.FC<{
    photos: (string | File)[];
    setPhotos: React.Dispatch<React.SetStateAction<(string | File)[]>>;
  }> = ({ photos, setPhotos }) => {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const urls = files.map((f) => URL.createObjectURL(f));
      setPhotos((prev) => [...prev, ...urls]);
      e.currentTarget.value = "";
    };

    const removePhoto = (index: number) => {
      setPhotos((prev) => {
        const copy = [...prev];
        const removed = copy.splice(index, 1)[0];
        if (typeof removed === "string" && removed.startsWith("blob:")) {
          URL.revokeObjectURL(removed);
        }
        return copy;
      });
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    return (
      <div className="mt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFilesSelected}
          className="hidden"
        />

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
        >
          {photos.map((p, i) => (
            <div
              key={i}
              className="relative rounded-lg shadow-sm overflow-hidden bg-gray-100"
              style={{ minHeight: 120 }}
            >
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => removePhoto(i)}
                className="absolute"
                style={{
                  top: 6,
                  right: 6,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.7)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.5)")
                }
              >
                ✖
              </button>

              {typeof p === "string" ? (
                <img
                  src={p}
                  alt={`photo-${i}`}
                  className="w-full h-36 object-cover"
                  style={{ maxWidth: "100%" }}
                />
              ) : (
                <img
                  src={URL.createObjectURL(p)}
                  alt={`photo-${i}`}
                  className="w-full h-36 object-cover"
                  style={{ maxWidth: "100%" }}
                />
              )}
            </div>
          ))}

          <div
            role="button"
            tabIndex={0}
            onClick={triggerFileInput}
            onKeyDown={(e) => e.key === "Enter" && triggerFileInput()}
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 cursor-pointer"
            style={{ minHeight: 120 }}
          >
            <div className="text-center pointer-events-none">
              <div className="text-2xl font-medium">+ </div>
              <div className="text-sm">Add Photo</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // loading / empty states rendering can be minimal to preserve layout
  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <div className="main-content" style={{ marginLeft: isMobile ? undefined : "260px", minHeight: "100vh" }}>
          <div className="page-header">
            <Link to="/my-boardinghouse" className="back-button">
              <ArrowLeft />
            </Link>
            <h1>Edit Boardinghouse</h1>
          </div>
          <div className="form-container">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bh) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <div className="main-content" style={{ marginLeft: isMobile ? undefined : "260px", minHeight: "100vh" }}>
          <div className="page-header">
            <Link to="/my-boardinghouse" className="back-button">
              <ArrowLeft />
            </Link>
            <h1>Edit Boardinghouse</h1>
          </div>
          <div className="form-container">
            <p>Boardinghouse not found.</p>
          </div>
        </div>
      </div>
    );
  }

  // Main form UI (keeping styling/classNames consistent)
  return (
    <div className="app-layout">
      <Sidebar />
      <div
        className="main-content"
        style={{
          marginLeft: isMobile ? undefined : "260px",
          minHeight: "100vh",
        }}
      >
        <div className="page-header">
          <Link to="/my-boardinghouse" className="back-button">
            <ArrowLeft />
          </Link>
          <h1>Edit Boardinghouse</h1>
        </div>

        <div className="form-container">
          <div className="form-row">
          <div className="form-group">
            <label>Owner Name</label>
            <input
              type="text"
              placeholder="Owner Name"
              className="form-input-room" 
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Contact No.</label>
            <input
              type="text"
              placeholder="Contact No."
              className="form-input-room-half"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            </div>
            <div className="form-group">
            <Link to="/added-rooms" className="btn-add-room-side">
              Added Rooms
            </Link>
            </div>
          </div>
          
          <div className="form-group">
            <label>Boardinghouse Name </label>
            <input
              type="text"
              placeholder="Boardinghouse Name"
              className="form-input-room"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {/* Description input (kept / restored) */}          
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Description"
              className="form-input-room"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className="form-group">
              <label>Facebook Page URL</label>
              <input
                type="text"
                placeholder="Facebook Page URL"
                className="form-input-room"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
              />
          </div>
          <div className="form-group">
            <label>Full Address/Location</label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="form-select"
              >
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r.region_code} value={r.region_code}>
                    {r.region_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="form-select"
                disabled={!provinces.length}
              >
                <option value="">Select Province</option>
                {provinces.map((p) => (
                  <option key={p.province_code} value={p.province_code}>
                    {p.province_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="form-select"
                disabled={!cities.length}
              >
                <option value="">Select City / Municipality</option>
                {cities.map((c) => (
                  <option key={c.city_code} value={c.city_code}>
                    {c.city_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedBarangay}
                onChange={(e) => setSelectedBarangay(e.target.value)}
                className="form-select"
                disabled={!barangays.length}
              >
                <option value="">Select Barangay</option>
                {barangays.map((b) => {
                  const val = String((b as any)[barangayCodeKey] ?? (b as any).brgy_code ?? (b as any).barangay_code ?? "");
                  const label = String((b as any)[barangayNameKey] ?? (b as any).brgy_name ?? (b as any).barangay_name ?? "");
                  return (
                    <option key={val || label} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <input
                type="text"
                placeholder="Zip Code"
                className="form-input"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
              <input
              type="text"
              placeholder="House No. / Street Name"
              className="form-input"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              />
            </div>
          </div>

          <div className="upload-section">
            <label>Upload Photos</label>
            <UploadPhotosSection photos={photos} setPhotos={setPhotos} />
            <p style={{ marginTop: 8, color: "#666" }}>Up to 5 images. Max 2MB each.</p>
          </div>

          <div className="form-actions">
            <button onClick={handleSave} className="btn-save-listing" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
