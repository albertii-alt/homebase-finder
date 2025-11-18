import React from "react";
import { ArrowLeft, Plus, Trash } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import "../styles/boardinghouse.css";
import { useIsMobile } from "../hooks/use-mobile";
import type { Boardinghouse } from "../hooks/useBoardinghouseStorage";
import {
  getBoardinghousesByOwner,
  deleteBoardinghouse,
} from "../hooks/useBoardinghouseStorage";
import { useToast } from "../hooks/use-toast";

export default function MyBoardinghouse() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();

  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") ?? "null") as { email?: string; role?: string } | null;
    } catch {
      return null;
    }
  }, []);

  React.useEffect(() => {
    if (!currentUser || currentUser.role !== "owner") {
      toast({ title: "Access denied", description: "Owners only page." });
      navigate("/interface");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownerEmail = currentUser?.email ?? "";

  const [boardinghouses, setBoardinghouses] = React.useState<Boardinghouse[]>([]);

  const load = React.useCallback(() => {
    if (!ownerEmail) {
      setBoardinghouses([]);
      return;
    }
    const list = getBoardinghousesByOwner(ownerEmail);
    setBoardinghouses(list);
  }, [ownerEmail]);

  React.useEffect(() => {
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "boardinghouses") {
        load();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const handleDelete = (id: string) => {
    const okConfirm = window.confirm("Are you sure you want to delete this boardinghouse?");
    if (!okConfirm) return;

    const ok = deleteBoardinghouse(id);
    if (!ok) {
      toast({ title: "Delete failed", description: "Failed to delete boardinghouse." });
      return;
    }

    // refresh local list immediately
    load();

    toast({ title: "Deleted", description: "Boardinghouse deleted successfully." });

    if (getBoardinghousesByOwner(ownerEmail).length === 0) {
      toast({ title: "No boardinghouses found", description: "You have no boardinghouses left." });
    }
  };

  const handleEdit = (id: string) => {
    try {
      localStorage.setItem("selectedBoardinghouseId", id);
    } catch {
      console.warn("Failed to save selectedBoardinghouseId");
    }
    navigate(`/edit-boardinghouse/${id}`);
  };

  // Optional: Delete All (owner's boardinghouses) for testing
  const handleDeleteAll = () => {
    const okConfirm = window.confirm("Are you sure you want to delete ALL your boardinghouses? This cannot be undone.");
    if (!okConfirm) return;

    // delete each boardinghouse for this owner
    const list = getBoardinghousesByOwner(ownerEmail);
    for (const bh of list) {
      deleteBoardinghouse(bh.id);
    }

    // refresh UI
    load();
    toast({ title: "Deleted", description: "All boardinghouses deleted." });
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
        <div className="page-header" style={{ display: "flex", alignItems: "center" }}>
          <Link to="/dashboard" className="back-button">
            <ArrowLeft />
          </Link>
          <h1>My Boardinghouse</h1>

          {/* show compact Add + Delete All only when there are boardinghouses;
              buttons aligned to the right using marginLeft: 'auto' */}
          {boardinghouses.length > 0 && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {/* "Add" here now navigates to Added Rooms overview for the selected boardinghouse */}
              <Link
                to="/add-boardinghouse"
                className="btn-add-small"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 20,
                  textDecoration: "none",
                  color: "white",
                  background: "linear-gradient(90deg,#0ea5e9,#06b6d4)", // cyan/blue for Add
                  boxShadow: "0 8px 20px rgba(6,182,212,0.12)",
                }}
              >
                <Plus /> <span>Add</span>
              </Link>

              <button
                className="btn-delete-all"
                onClick={handleDeleteAll}
                title="Delete all boardinghouses (testing)"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(90deg,#ef4444,#dc2626)", // red gradient
                  boxShadow: "0 8px 24px rgba(220,38,38,0.18)",
                }}
              >
                <Trash /> <span>Delete All</span>
              </button>
            </div>
          )}
        </div>

        <div className="boardinghouse-list">
          {boardinghouses.length === 0 ? (
            <div
              className="empty-state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: 40,
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0 }}>No boardinghouses yet. Add one to get started.</p>
              <Link to="/add-boardinghouse" className="add-button" style={{ marginTop: 8 }}>
                <Plus /> Add Boardinghouse
              </Link>
            </div>
          ) : (
            boardinghouses.map((bh) => (
              <div key={bh.id} className="boardinghouse-card">
                <img
                  src={bh.photos && bh.photos.length ? bh.photos[0] : "/placeholder.svg"}
                  alt={bh.name}
                  className="bh-image"
                />
                <div className="bh-info">
                  <h2>{bh.name}</h2>
                  <p>{bh.address}</p>
                  <p>Contact: {bh.contact}</p>
                  <p>Rooms: {bh.rooms?.length ?? 0}</p>
                  {/* Room list intentionally hidden in overview */}
                </div>
                <div className="bh-actions">
                  <button className="btn-edit" onClick={() => handleEdit(bh.id)}>
                    Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(bh.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
