import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import React from "react";
import type { Room } from "../hooks/useBoardinghouseStorage";
import { addRoom, getBoardinghousesByOwner } from "../hooks/useBoardinghouseStorage";
import { useToast } from "../hooks/use-toast";

export default function AddRoom() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const fromState = (location.state as any)?.from as string | undefined;

  // when rendering page header, use fromState for back button target
  // (if fromState not provided, fall back to MyBoardinghouse)
  const backTarget = fromState ?? "/my-boardinghouse";

  const inclusionsList = [
    "Mattress",
    "Electric Fan",
    "Table",
    "Cabinet",
    "Pillow",
    "Aircon",
    "Chair",
  ];

  // Select-all checkbox ref & sync (for indeterminate state)
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);

  // form state
  const [roomName, setRoomName] = React.useState("");
  const [totalBeds, setTotalBeds] = React.useState<number | "">("");
  const [availableBeds, setAvailableBeds] = React.useState<number | "">("");
  const [rentPrice, setRentPrice] = React.useState<number | "">("");
  const [withCR, setWithCR] = React.useState<boolean>(true);
  const [gender, setGender] = React.useState<string>("Any");
  const [cookingAllowed, setCookingAllowed] = React.useState<boolean>(false);
  const [inclusions, setInclusions] = React.useState<string[]>([]);
  const [adding, setAdding] = React.useState(false);

  // detect selected boardinghouse id from localStorage
  const selectedBoardinghouseId = React.useMemo(() => {
    try {
      return localStorage.getItem("selectedBoardinghouseId") ?? "";
    } catch {
      return "";
    }
  }, []);

  // get current user
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") ?? "null") as { name?: string; email?: string; role?: string } | null;
    } catch {
      return null;
    }
  }, []);
  React.useEffect(() => {
    if (!currentUser || currentUser.role !== "owner") {
      toast({ title: "Access denied", description: "Only owners can add rooms." });
      navigate("/interface");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const ref = selectAllRef.current;
    if (!ref) return;
    const all = inclusionsList.length > 0 && inclusions.length === inclusionsList.length;
    const some = inclusions.length > 0 && inclusions.length < inclusionsList.length;
    ref.checked = all;
    ref.indeterminate = some;
  }, [inclusions, inclusionsList]);

  const toggleInclusion = (item: string) => {
    setInclusions((prev) =>
      prev.includes(item)
        ? prev.filter((p) => p !== item)
        : [...prev, item]
    );
  };

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setInclusions([...inclusionsList]);
    } else {
      setInclusions([]);
    }
  };

  const validate = (): boolean => {
    if (!selectedBoardinghouseId) {
      alert("No boardinghouse selected. Please select a boardinghouse first.");
      return false;
    }

    // ensure selected boardinghouse belongs to current owner
    if (currentUser?.role === "owner" && currentUser.email) {
      const owned = getBoardinghousesByOwner(currentUser.email);
      if (!owned.find((b) => b.id === selectedBoardinghouseId)) {
        alert("Selected boardinghouse does not belong to your account.");
        return false;
      }
    }

    if (!roomName.trim()) {
      alert("Room name is required.");
      return false;
    }
    if (totalBeds === "" || Number(totalBeds) <= 0) {
      alert("Total beds must be a positive number.");
      return false;
    }
    if (availableBeds === "" || Number(availableBeds) < 0) {
      alert("Available beds must be zero or more.");
      return false;
    }
    if (rentPrice === "" || Number(rentPrice) < 0) {
      alert("Rent price must be zero or more.");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setRoomName("");
    setTotalBeds("");
    setAvailableBeds("");
    setRentPrice("");
    setWithCR(true);
    setGender("Any");
    setCookingAllowed(false);
    setInclusions([]);
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setAdding(true);
    try {
      const newRoom: Room = {
        id: "", // hook will generate if empty
        roomName: roomName.trim(),
        totalBeds: Number(totalBeds),
        availableBeds: Number(availableBeds),
        rentPrice: Number(rentPrice),
        withCR,
        gender,
        cookingAllowed,
        inclusions,
      };
      const added = addRoom(selectedBoardinghouseId, newRoom);
      if (!added) {
        alert("Failed to add room. Boardinghouse not found or not owned by you.");
      } else {
        toast({ title: "Saved", description: "Room added successfully." });
        resetForm();
        // keep user on page to add more or navigate back
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add room.");
    } finally {
      setAdding(false);
    }
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
          <Link to={backTarget} className="back-button">
            <ArrowLeft />
          </Link>
          <h1>Add Room</h1>
        </div>

        <div className="form-container">
          <div className="form-group">
            <label>Room Name:</label>
            <input
              type="text"
              placeholder="Room 101"
              className="form-input-room"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>

          <div className="info-section">
            <label className="section-label">Information:</label>
            <div className="info-grid">
              <div className="form-group">
                <label>Total Beds:</label>
                <input
                  type="number"
                  placeholder="10"
                  className="form-input-room"
                  value={totalBeds}
                  onChange={(e) =>
                    setTotalBeds(
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="form-group">
                <label>Beds Available:</label>
                <input
                  type="number"
                  placeholder="10"
                  className="form-input-room"
                  value={availableBeds}
                  onChange={(e) =>
                    setAvailableBeds(
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="form-group">
                <label>Rent Price:</label>
                <input
                  type="number"
                  placeholder="500"
                  className="form-input-room"
                  value={rentPrice}
                  onChange={(e) =>
                    setRentPrice(
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="form-group">
                <label>With CR:</label>
                <select
                  className="form-select-room"
                  value={withCR ? "yes" : "no"}
                  onChange={(e) => setWithCR(e.target.value === "yes")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Beds Occupied:</label>
                <input
                  type="number"
                  placeholder="5"
                  className="form-input-room"
                  value={
                    totalBeds === "" || availableBeds === ""
                      ? ""
                      : (Number(totalBeds) - Number(availableBeds))
                  }
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Gender Allowed:</label>
                <select
                  className="form-select-room"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Any</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Cooking Allowed Inside:</label>
                <select
                  className="form-select-room"
                  value={cookingAllowed ? "yes" : "no"}
                  onChange={(e) => setCookingAllowed(e.target.value === "yes")}
                >
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
                  <input
                    type="checkbox"
                    checked={inclusions.includes(item)}
                    onChange={() => toggleInclusion(item)}
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button
              className="btn-add"
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? "Adding..." : "Add"}
            </button>
            <button
              className="btn-cancel"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
