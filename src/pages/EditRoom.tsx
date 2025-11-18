import { ArrowLeft, Plus } from "lucide-react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import React from "react";
import type { Room, Boardinghouse } from "../hooks/useBoardinghouseStorage";
import { getBoardinghousesByOwner, updateRoom } from "../hooks/useBoardinghouseStorage";
import { useToast } from "../hooks/use-toast";

export default function EditRoom() {
  const location = useLocation();
  const fromState = (location.state as any)?.from as string | undefined;
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const params = useParams<{ bhId?: string; roomId?: string }>();
  const { toast } = useToast();

  const inclusionsList = [
    "Mattress",
    "Electric Fan",
    "Table",
    "Cabinet",
    "Pillow",
    "Aircon",
    "Chair",
  ];

  const [loading, setLoading] = React.useState(true);
  const [boardinghouse, setBoardinghouse] = React.useState<Boardinghouse | null>(null);
  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string>("");

  // room fields
  const [roomName, setRoomName] = React.useState("");
  const [totalBeds, setTotalBeds] = React.useState<number | "">("");
  const [availableBeds, setAvailableBeds] = React.useState<number | "">("");
  const [rentPrice, setRentPrice] = React.useState<number | "">("");
  const [withCR, setWithCR] = React.useState<boolean>(true);
  const [gender, setGender] = React.useState<string>("Any");
  const [cookingAllowed, setCookingAllowed] = React.useState<boolean>(false);
  const [inclusions, setInclusions] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Select-all checkbox ref & sync (for indeterminate state)
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const ref = selectAllRef.current;
    if (!ref) return;
    const all = inclusionsList.length > 0 && inclusions.length === inclusionsList.length;
    const some = inclusions.length > 0 && inclusions.length < inclusionsList.length;
    ref.checked = all;
    ref.indeterminate = some;
  }, [inclusions, inclusionsList]);

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setInclusions([...inclusionsList]);
    } else {
      setInclusions([]);
    }
  };

  // get current user email
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") ?? "null") as { email?: string } | null;
    } catch {
      return null;
    }
  }, []);
  const ownerEmail = currentUser?.email ?? "";

  React.useEffect(() => {
    const bhIdFromParams = params.bhId;
    const bhIdFromStorage = (() => {
      try {
        return localStorage.getItem("selectedBoardinghouseId") ?? "";
      } catch {
        return "";
      }
    })();

    const bhId = bhIdFromParams || bhIdFromStorage;
    if (!bhId) {
      toast({ title: "Missing boardinghouse", description: "No boardinghouse selected for editing rooms." });
      navigate("/my-boardinghouse");
      return;
    }

    if (!ownerEmail) {
      toast({ title: "Not logged in", description: "You must be logged in to edit rooms." });
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const list = getBoardinghousesByOwner(ownerEmail);
      const bh = list.find((b) => b.id === bhId) ?? null;
      if (!bh) {
        toast({ title: "Not found", description: "Boardinghouse not found or you don't have permission." });
        navigate("/my-boardinghouse");
        return;
      }
      setBoardinghouse(bh);
      setRooms(bh.rooms ?? []);

      // auto-select a room to edit:
      // prefer roomId in params, otherwise any selectedRoomId from storage,
      // otherwise default to the first room (if present).
      const roomIdParam = params.roomId ?? localStorage.getItem("selectedRoomId") ?? undefined;
      const roomToUse = roomIdParam ?? (bh.rooms && bh.rooms.length > 0 ? bh.rooms[0].id : undefined);

      if (roomToUse) {
        setSelectedRoomId(roomToUse);
        const r = bh.rooms?.find((x) => x.id === roomToUse);
        if (r) {
          setRoomName(r.roomName);
          setTotalBeds(r.totalBeds);
          setAvailableBeds(r.availableBeds);
          setRentPrice(r.rentPrice);
          setWithCR(Boolean(r.withCR));
          setGender(r.gender || "Any");
          setCookingAllowed(Boolean(r.cookingAllowed));
          setInclusions(r.inclusions || []);
        }
        // cleanup stored selectedRoomId to avoid stale values
        try {
          localStorage.removeItem("selectedRoomId");
        } catch {}
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerEmail, params.bhId, params.roomId, navigate, toast]);

  const onSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    const r = rooms.find((x) => x.id === roomId);
    if (!r) {
      // reset fields
      setRoomName("");
      setTotalBeds("");
      setAvailableBeds("");
      setRentPrice("");
      setWithCR(true);
      setGender("Any");
      setCookingAllowed(false);
      setInclusions([]);
      return;
    }
    setRoomName(r.roomName);
    setTotalBeds(r.totalBeds);
    setAvailableBeds(r.availableBeds);
    setRentPrice(r.rentPrice);
    setWithCR(Boolean(r.withCR));
    setGender(r.gender || "Any");
    setCookingAllowed(Boolean(r.cookingAllowed));
    setInclusions(r.inclusions || []);
  };

  const toggleInclusion = (item: string) => {
    setInclusions((prev) => (prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]));
  };

  const validate = (): boolean => {
    if (!boardinghouse) {
      toast({ title: "No boardinghouse", description: "No boardinghouse selected." });
      return false;
    }
    if (!selectedRoomId) {
      toast({ title: "Select room", description: "Please select a room to edit." });
      return false;
    }
    if (!roomName.trim()) {
      toast({ title: "Validation", description: "Room name is required." });
      return false;
    }
    if (totalBeds === "" || Number(totalBeds) <= 0) {
      toast({ title: "Validation", description: "Total beds must be a positive number." });
      return false;
    }
    if (availableBeds === "" || Number(availableBeds) < 0) {
      toast({ title: "Validation", description: "Available beds must be zero or more." });
      return false;
    }
    if (rentPrice === "" || Number(rentPrice) < 0) {
      toast({ title: "Validation", description: "Rent price must be zero or more." });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || !boardinghouse) return;
    setSaving(true);
    try {
      const updatedRoom: Room = {
        id: selectedRoomId,
        roomName: roomName.trim(),
        totalBeds: Number(totalBeds),
        availableBeds: Number(availableBeds),
        rentPrice: Number(rentPrice),
        withCR,
        gender,
        cookingAllowed,
        inclusions,
      };
      const ok = updateRoom(boardinghouse.id, updatedRoom);
      if (!ok) {
        toast({ title: "Update failed", description: "Failed to update room." });
        setSaving(false);
        return;
      }
      toast({ title: "Updated", description: "Room updated successfully." });
      // refresh local copy of rooms from storage
      const updatedBhList = getBoardinghousesByOwner(ownerEmail);
      const updatedBh = updatedBhList.find((b) => b.id === boardinghouse.id) ?? null;
      setBoardinghouse(updatedBh);
      setRooms(updatedBh?.rooms ?? []);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save room changes." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content" style={{ marginLeft: isMobile ? undefined : "260px", minHeight: "100vh" }}>
          <div className="page-header">
            <Link to={fromState ?? "/added-rooms"} className="back-button">
              <ArrowLeft />
            </Link>
            <h1>Edit Rooms</h1>
          </div>
          <div className="form-container">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

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
          <Link to={fromState ?? "/added-rooms"} className="back-button">
            <ArrowLeft />
          </Link>
          <h1>Edit Rooms</h1>
        </div>

        <div className="form-container">
          {/* removed room selection - page now edits the automatically-selected room */}

          <div className="form-group">
            <label>Room Name:</label>
            <input
              type="text"
              className="form-input-room"
              placeholder="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
           </div>

          <div className="info-section">
            <label className="section-label">Information:</label>
            <div className="info-grid">
              <div className="form-group">
                <label>Total Beds:</label>
                <input type="number" placeholder="10" className="form-input-room" value={totalBeds} onChange={(e) => setTotalBeds(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Beds Available:</label>
                <input type="number" placeholder="10" className="form-input-room" value={availableBeds} onChange={(e) => setAvailableBeds(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Rent Price:</label>
                <input type="number" placeholder="500" className="form-input-room" value={rentPrice} onChange={(e) => setRentPrice(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>With CR:</label>
                <select className="form-select-room" value={withCR ? "yes" : "no"} onChange={(e) => setWithCR(e.target.value === "yes")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Beds Occupied:</label>
                <input type="number" placeholder="5" className="form-input-room" value={totalBeds === "" || availableBeds === "" ? "" : Number(totalBeds) - Number(availableBeds)} readOnly />
              </div>
              <div className="form-group">
                <label>Gender Allowed:</label>
                <select className="form-select-room" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Any</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Cooking Allowed Inside:</label>
                <select className="form-select-room" value={cookingAllowed ? "yes" : "no"} onChange={(e) => setCookingAllowed(e.target.value === "yes")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
          </div>

          <div className="inclusions-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ margin: 0 }}>Inclusions:</label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input ref={selectAllRef} type="checkbox" onChange={handleToggleSelectAll} />
                <span style={{ opacity: 0.9 }}>Select all</span>
              </label>
            </div>
            <div className="inclusions-grid">
              {inclusionsList.map((item) => (
                <label key={item} className="checkbox-label">
                  <input type="checkbox" checked={inclusions.includes(item)} onChange={() => toggleInclusion(item)} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions-with-add">
            <div className="left-actions">
              <button className="btn-save-changes" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button className="btn-cancel" onClick={() => {
                // reset fields
                setSelectedRoomId("");
                setRoomName("");
                setTotalBeds("");
                setAvailableBeds("");
                setRentPrice("");
                setWithCR(true);
                setGender("Any");
                setCookingAllowed(false);
                setInclusions([]);
              }}>Cancel</button>
            </div>
            <Link to="/add-room" className="btn-add-room-float">
              <Plus /> Add room
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
