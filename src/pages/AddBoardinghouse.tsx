import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import React, { useRef } from "react";
import type { ChangeEvent } from "react";
import type { Boardinghouse } from "../hooks/useBoardinghouseStorage";
import { addBoardinghouse } from "../hooks/useBoardinghouseStorage";
import { useToast } from "../hooks/use-toast";
import regionData from "../ph-json/region.json";
import provinceData from "../ph-json/province.json";
import cityData from "../ph-json/city.json";
import barangayData from "../ph-json/barangay.json";

export default function AddBoardinghouse() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // form state (controlled)
  const [ownerName, setOwnerName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [facebook, setFacebook] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  // address structure + dropdown options
  type RegionItem = { region_code: string; region_name: string };
  type ProvinceItem = { province_code: string; province_name: string; region_code: string };
  type CityItem = { city_code: string; city_name: string; province_code: string };
  // barangay entries vary; include common keys used in your dataset
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

  const regions: RegionItem[] = (regionData as any) ?? [];
  const provincesAll: ProvinceItem[] = (provinceData as any) ?? [];
  const citiesAll: CityItem[] = (cityData as any) ?? [];
  const barangaysAll: BarangayItem[] = (barangayData as any) ?? [];

  const [selectedRegion, setSelectedRegion] = React.useState<string>("");
  const [selectedProvince, setSelectedProvince] = React.useState<string>("");
  const [selectedCity, setSelectedCity] = React.useState<string>("");
  const [selectedBarangay, setSelectedBarangay] = React.useState<string>("");

  const [provinces, setProvinces] = React.useState<ProvinceItem[]>([]);
  const [cities, setCities] = React.useState<CityItem[]>([]);
  const [barangays, setBarangays] = React.useState<BarangayItem[]>([]);

  const [street, setStreet] = React.useState<string>(""); // House No./Street Name
  const [zipCode, setZipCode] = React.useState<string>("");

  // detect keys used by barangay dataset (memoized)
  const barangayCodeKey = React.useMemo(() => {
    const sample = barangaysAll[0] ?? {};
    if ("brgy_code" in sample) return "brgy_code";
    if ("barangay_code" in sample) return "barangay_code";
    if ("barangayCode" in sample) return "barangayCode";
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

  // region -> provinces
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
    setSelectedProvince("");
    setCities([]);
    setSelectedCity("");
    setBarangays([]);
    setSelectedBarangay("");
  }, [selectedRegion, provincesAll]);

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
    setSelectedCity("");
    setBarangays([]);
    setSelectedBarangay("");
  }, [selectedProvince, citiesAll]);

  // city -> barangays (use city_code match)
  React.useEffect(() => {
    console.log("AddBH: selectedCity =", selectedCity);
    if (!selectedCity) {
      setBarangays([]);
      setSelectedBarangay("");
      return;
    }

    // prefer explicit city_code field on barangays (your dataset uses city_code)
    const filtered = barangaysAll.filter((b) => {
      // primary: match b.city_code
      if (b.city_code != null && String(b.city_code) === String(selectedCity)) return true;
      // fallback: try mun_code, citymunCode etc.
      if (b.mun_code != null && String(b.mun_code) === String(selectedCity)) return true;
      if ((b as any).citymunCode != null && String((b as any).citymunCode) === String(selectedCity)) return true;
      if ((b as any).citymun_code != null && String((b as any).citymun_code) === String(selectedCity)) return true;
      // last resort: check any property equal to selectedCity
      return Object.values(b).some((v) => String(v) === String(selectedCity));
    });

    console.log("AddBH: barangay dataset sample keys:", barangaysAll[0] ? Object.keys(barangaysAll[0]).slice(0, 8) : "empty");
    console.log("AddBH: detected barangay code key:", barangayCodeKey, "name key:", barangayNameKey);
    console.log(`AddBH: filtered barangays for city ${selectedCity} => ${filtered.length} items`);

    setBarangays(filtered);
    setSelectedBarangay("");
  }, [selectedCity, barangaysAll, barangayCodeKey, barangayNameKey]);

  const validate = (): boolean => {
    if (!name.trim()) {
      toast({ title: "Validation", description: "Name is required." });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // resolve display names from selected codes (always attempt to derive the full names)
      const regionName = regions.find((r) => String(r.region_code) === String(selectedRegion))?.region_name ?? "";
      const provinceName = provinces.find((p) => String(p.province_code) === String(selectedProvince))?.province_name ?? "";
      const cityName = cities.find((c) => String(c.city_code) === String(selectedCity))?.city_name ?? "";
      const barangayObj = barangays.find((b) => {
        const code = String((b as any)[barangayCodeKey] ?? (b as any).brgy_code ?? (b as any).barangay_code ?? "");
        return code && String(code) === String(selectedBarangay);
      });
      const barangayName = barangayObj
        ? String((barangayObj as any)[barangayNameKey] ?? (barangayObj as any).brgy_name ?? (barangayObj as any).barangay_name ?? "")
        : "";

      // ensure structuredAddress always contains the chosen values (names + codes + street/zip)
      const structuredAddress = {
        region: regionName,
        region_code: selectedRegion,
        province: provinceName,
        province_code: selectedProvince,
        city: cityName,
        city_code: selectedCity,
        barangay: barangayName,
        barangay_code: selectedBarangay,
        street: street?.trim() ?? "",
        zip: zipCode?.trim() ?? "",
      };

      // compose full address string from all available parts (falls back to whatever the user entered)
      const fullAddressParts = [
        street?.trim(),
        barangayName || undefined,
        cityName || undefined,
        provinceName || undefined,
        regionName || undefined,
      ].filter(Boolean);
      const fullAddressString = fullAddressParts.join(", ");

      // local extended type to allow structuredAddress field without modifying shared type
      type StructuredAddress = {
        region?: string;
        region_code?: string;
        province?: string;
        province_code?: string;
        city?: string;
        city_code?: string;
        barangay?: string;
        barangay_code?: string;
        street?: string;
        zip?: string;
        [k: string]: any;
      };

      type BoardinghouseExtended = Boardinghouse & {
        structuredAddress?: StructuredAddress;
        ownerEmail?: string;
        ownerName?: string;
        contact?: string;
        facebook?: string;
        photos?: string[];
        rooms?: any[];
      };

      const newBH: BoardinghouseExtended = {
        id: "", // hook will generate if empty
        // ensure the boardinghouse is saved under the current owner's email
        ownerEmail: ((): string => {
          try {
            const cu = JSON.parse(localStorage.getItem("currentUser") ?? "null") as { email?: string } | null;
            return cu?.email ?? "";
          } catch {
            return "";
          }
        })(),
        ownerName: ownerName.trim(),
        name: name.trim(),
        contact: contact.trim(),
        address: fullAddressString, // legacy string field kept (now always filled when possible)
        structuredAddress, // NEW structured address object (always included)
        description: description.trim(),
        facebook: facebook.trim(),
        photos: photos,
        rooms: [],
      };

      // cast to Boardinghouse to satisfy addBoardinghouse signature without changing shared types
      addBoardinghouse(newBH as unknown as Boardinghouse);

      toast({ title: "Saved", description: "Boardinghouse added successfully." });
      navigate("/my-boardinghouse");
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save boardinghouse." });
    } finally {
      setSaving(false);
    }
  };

  const UploadPhotosSection: React.FC<{
    photos: (string | File)[];
    setPhotos: React.Dispatch<React.SetStateAction<(string | File)[]>>;
  }> = ({ photos, setPhotos }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const urls = files.map((f) => {
        const url = URL.createObjectURL(f);
        return url;
      });
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
                  transition: "background 0.2s ease",
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
          <h1>Add Boardinghouse</h1>
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
            <Link
              to="/add-room"
              state={{ from: "/add-boardinghouse" }}
              className="btn-add-room-side"
            >
              Add Room
            </Link>
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
            <button
              onClick={handleSave}
              className="btn-save-listing"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Boardinghouse"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}