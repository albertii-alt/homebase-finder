import React from "react";
import { ArrowLeft } from "lucide-react";
import { Plus, Edit, Trash } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { useIsMobile } from "../hooks/use-mobile";
import "../styles/boardinghouse.css";
import { useToast } from "../hooks/use-toast";
import { getBoardinghousesByOwner, deleteRoom } from "../hooks/useBoardinghouseStorage";

export default function AddedRooms(): JSX.Element {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  // current user (session)
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") ?? "null") as { email?: string; role?: string } | null;
    } catch {
      return null;
    }
  }, []);

  const ownerEmail = currentUser?.email ?? "";

  // selected boardinghouse id - prefer explicit selection in localStorage
  const [selectedBhId, setSelectedBhId] = React.useState<string>(() => {
    try {
      return localStorage.getItem("selectedBoardinghouseId") ?? "";
    } catch {
      return "";
    }
  });

  const [boardinghouse, setBoardinghouse] = React.useState<any | null>(null);
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    setLoading(true);
    try {
      if (!ownerEmail) {
        setBoardinghouse(null);
        setRooms([]);
        return;
      }
      const list = getBoardinghousesByOwner(ownerEmail);
      let bh = null;
      if (selectedBhId) {
        bh = list.find((b) => String(b.id) === String(selectedBhId)) ?? null;
      }
      // if selected not found, fall back to first owned boardinghouse
      if (!bh && list.length > 0) {
        bh = list[0];
        try {
          localStorage.setItem("selectedBoardinghouseId", bh.id);
          setSelectedBhId(bh.id);
        } catch {}
      }
      setBoardinghouse(bh);
      setRooms((bh?.rooms ?? []) as any[]);
    } finally {
      setLoading(false);
    }
  }, [ownerEmail, selectedBhId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleAddRoom = () => {
    if (!boardinghouse) {
      toast({ title: "No boardinghouse", description: "Please select or create a boardinghouse first." });
      navigate("/my-boardinghouse");
      return;
    }
    // ensure selected boardinghouse is set for AddRoom page
    try {
      localStorage.setItem("selectedBoardinghouseId", boardinghouse.id);
    } catch {}
    navigate("/add-room", { state: { from: "/added-rooms" } });
  };

  const handleEditRoom = (roomId: string) => {
    if (!boardinghouse) return;
    try {
      localStorage.setItem("selectedBoardinghouseId", boardinghouse.id);
      localStorage.setItem("selectedRoomId", roomId);
    } catch {}
    // include return target so EditRoom can render the correct back button
    navigate("/edit-room", { state: { from: `/added-rooms` } });
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!boardinghouse) return;
    const ok = deleteRoom(boardinghouse.id, roomId);
    if (!ok) {
      toast({ title: "Delete failed", description: "Failed to delete room." });
      return;
    }
    toast({ title: "Deleted", description: "Room removed." });
    // reload local copy
    load();
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content" style={{ marginLeft: isMobile ? undefined : "260px", minHeight: "100vh" }}>
          <div className="page-header">
            <h1>Added Rooms</h1>
          </div>
          <div className="form-container">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no boardinghouse at all, redirect user to MyBoardinghouse so they can add one
  if (!boardinghouse) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content" style={{ marginLeft: isMobile ? undefined : "260px", minHeight: "100vh" }}>
          <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/edit-boardinghouse" className="back-button">
              <ArrowLeft />
            </Link>
            <h1>Added Rooms</h1>
            <div style={{ marginLeft: "auto" }}>
              <Link to="/add-boardinghouse" className="add-button">
                <Plus /> Add Boardinghouse
              </Link>
            </div>
          </div>

          <div className="form-container">
            <p>No boardinghouse found. Please create one first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ marginLeft: isMobile ? undefined : "260px", minHeight: "100vh" }}>
        <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to={`/edit-boardinghouse/${boardinghouse.id}`} className="back-button">
            <ArrowLeft />
          </Link>
          <h1>Added Rooms</h1>

          {/* Add Room button on the top-right */}
          <div style={{ marginLeft: "auto" }}>
            <button
              onClick={handleAddRoom}
              aria-label="Add room"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(90deg,#0ea5e9,#06b6d4)",
                color: "#fff",
                boxShadow: "0 8px 20px rgba(6,182,212,0.12)",
              }}
            >
              <Plus /> Add Room
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 980, marginTop: 18 }}>
          <div style={{ marginBottom: 14, color: "#374151" }}>
            <strong style={{ display: "block", fontSize: 16 }}>{boardinghouse.name}</strong>
            <small style={{ color: "#6b7280" }}>{boardinghouse.address}</small>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {rooms.length === 0 ? (
              <div style={{ padding: 20, background: "#f1fdfc", borderRadius: 10, color: "#0f172a" }}>
                <div style={{ fontWeight: 600 }}>No rooms yet</div>
                <div style={{ color: "#475569" }}>Use "Add Room" to create rooms for this boardinghouse.</div>
              </div>
            ) : (
              rooms.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#ecfeff",
                    padding: "18px 20px",
                    borderRadius: 12,
                    boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.02)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{r.roomName}</div>
                    <div style={{ color: "#0f172a", opacity: 0.8, marginTop: 6 }}>
                      ₱{Number(r.rentPrice).toLocaleString()}/month - {r.availableBeds ?? 0}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <button
                      onClick={() => handleEditRoom(r.id)}
                      aria-label="Edit room"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#0f172a",
                        padding: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Edit />
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Delete this room?")) return;
                        handleDeleteRoom(r.id);
                      }}
                      aria-label="Delete room"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#0f172a",
                        padding: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Trash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}