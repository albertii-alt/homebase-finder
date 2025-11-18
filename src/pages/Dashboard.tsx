import { Building2, Bed, Bath, ChefHat, DoorOpen, Plus, Edit, Image, AlertCircle, TrendingUp, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import "../styles/dashboard.css";
import { useIsMobile } from "../hooks/use-mobile";
import React from "react";
import { getBoardinghousesByOwner, getAllRooms } from "../hooks/useBoardinghouseStorage";
import { useToast } from "../hooks/use-toast";
import { useNavigate } from "react-router-dom";
// Recharts for Data Overview
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  // current user
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") ?? "null") as { email?: string; role?: string } | null;
    } catch {
      return null;
    }
  }, []);

  React.useEffect(() => {
    if (!currentUser || currentUser.role !== "owner") {
      toast({ title: "Access denied", description: "Dashboard is for owners only." });
      navigate("/interface");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [boardinghouses, setBoardinghouses] = React.useState(() => {
    if (currentUser?.role === "owner" && currentUser.email) {
      return getBoardinghousesByOwner(currentUser.email);
    }
    return [];
  });

  const [rooms, setRooms] = React.useState(() => {
    // get all rooms then filter to owner's boardinghouses
    if (currentUser?.role === "owner" && currentUser.email) {
      const bhs = getBoardinghousesByOwner(currentUser.email);
      return bhs.flatMap((b) => b.rooms || []);
    }
    return [];
  });

  // activity log and reminders
  const [activityLog, setActivityLog] = React.useState<
    Array<{ ts: number; message: string; type?: string; meta?: any }>
  >([]);
  const [alerts, setAlerts] = React.useState<Array<{ id: string; message: string }>>([]);

  const fetchData = React.useCallback(() => {
    if (currentUser?.role === "owner" && currentUser.email) {
      const bhs = getBoardinghousesByOwner(currentUser.email);
      setBoardinghouses(bhs);
      setRooms(bhs.flatMap((b) => b.rooms || []));
      // build activity log: prefer stored activityLog, otherwise synthesize from data
      try {
        // Read raw value first. If an array exists (even empty) treat it as authoritative.
        const raw = localStorage.getItem("activityLog");
        const stored = raw ? JSON.parse(raw) : null;
        if (Array.isArray(stored)) {
          // Use stored array exactly (empty array means user cleared intentionally).
          setActivityLog(stored.slice().sort((a: any, b: any) => (b.ts || 0) - (a.ts || 0)));
        } else {
          const synthetic: Array<{ ts: number; message: string; type?: string; meta?: any }> = [];
          const now = Date.now();
          bhs.forEach((bh, i) => {
            // use bh.updatedAt if exists, otherwise synthetic timestamp
            const ts = (bh as any).updatedAt ? Number((bh as any).updatedAt) : now - i * 1000;
            synthetic.push({ ts, message: `Boardinghouse saved: ${bh.name || "(no name)"}`, type: "boardinghouse", meta: { id: bh.id } });
            (bh.rooms || []).forEach((r: any, j: number) => {
              const rts = r.updatedAt ? Number(r.updatedAt) : now - (i + j + 1) * 1000;
              synthetic.push({ ts: rts, message: `Room saved: ${r.roomName || "(no name)"} — ${bh.name || ""}`, type: "room", meta: { bhId: bh.id, roomId: r.id } });
            });
          });
          setActivityLog(synthetic.sort((a, b) => b.ts - a.ts));
        }
      } catch {
        setActivityLog([]);
      }

      // read dismissed alerts so we don't show dismissed ones
      const dismissed = (JSON.parse(localStorage.getItem("dismissedAlerts") ?? "[]") as string[]) || [];
      // build reminders/alerts for missing required fields (per boardinghouse)
      const newAlerts: Array<{ id: string; message: string }> = [];
      bhs.forEach((bh) => {
        const bhRooms = bh.rooms || [];
        // missing rooms
        if (bhRooms.length === 0) {
          newAlerts.push({ id: `bh-${bh.id}-norooms`, message: `Boardinghouse "${bh.name || bh.id}" has no rooms.` });
        }

        // per-room missing fields
        bhRooms.forEach((r: any) => {
          if (!r.roomName || !String(r.roomName).trim()) {
            newAlerts.push({ id: `bh-${bh.id}-room-${r.id}-name`, message: `Boardinghouse "${bh.name || bh.id}" — Room (${r.id}) is missing a name.` });
          }
          if (r.totalBeds == null || r.totalBeds === "") {
            newAlerts.push({ id: `bh-${bh.id}-room-${r.id}-totalBeds`, message: `Boardinghouse "${bh.name || bh.id}" — Room "${r.roomName || r.id}" is missing total beds.` });
          }
          if (r.rentPrice == null || r.rentPrice === "") {
            newAlerts.push({ id: `bh-${bh.id}-room-${r.id}-rent`, message: `Boardinghouse "${bh.name || bh.id}" — Room "${r.roomName || r.id}" is missing rent price.` });
          }
        });

        // boardinghouse-level missing fields (AddBoardinghouse / EditBoardinghouse)
        // list of required fields shown on the Add/Edit pages
        const bhMissing: Array<{ key: string; label: string }> = [
          { key: "ownerName", label: "Owner Name" },
          { key: "contact", label: "Contact No." },
          { key: "name", label: "Boardinghouse Name" },
          { key: "description", label: "Description" },
          { key: "facebook", label: "Facebook Page URL" },
        ];

        // structured address parts
        const sa: any = (bh as any).structuredAddress ?? {};
        const addrMissing: Array<{ key: string; label: string; present: boolean }> = [
          { key: "region", label: "Region", present: Boolean(sa.region || sa.region_code) },
          { key: "province", label: "Province", present: Boolean(sa.province || sa.province_code) },
          { key: "city", label: "City / Municipality", present: Boolean(sa.city || sa.city_code) },
          { key: "barangay", label: "Barangay", present: Boolean(sa.barangay || sa.barangay_code) },
          { key: "street", label: "Street / House No.", present: Boolean(sa.street) },
          { key: "zip", label: "Zip Code", present: Boolean(sa.zip) },
        ];

        bhMissing.forEach((f) => {
          if (!(bh as any)[f.key] || !String((bh as any)[f.key]).trim()) {
            newAlerts.push({ id: `bh-${bh.id}-missing-${f.key}`, message: `Boardinghouse "${bh.name || bh.id}" is missing: ${f.label} (Add/Edit Boardinghouse page).` });
          }
        });

        addrMissing.forEach((a) => {
          if (!a.present) {
            newAlerts.push({ id: `bh-${bh.id}-missing-addr-${a.key}`, message: `Boardinghouse "${bh.name || bh.id}" is missing address field: ${a.label} (Add/Edit Boardinghouse page).` });
          }
        });

        // photos check - notify if no photos uploaded
        const photos = (bh as any).photos || [];
        if (!Array.isArray(photos) || photos.length === 0) {
          newAlerts.push({ id: `bh-${bh.id}-missing-photos`, message: `Boardinghouse "${bh.name || bh.id}" has no photos. (Add/Edit Boardinghouse page)` });
        }
      });
      // filter out any dismissed alerts before setting state
      setAlerts(newAlerts.filter((a) => !dismissed.includes(a.id)));
    } else {
      setBoardinghouses([]);
      setRooms([]);
      setActivityLog([]);
      setAlerts([]);
    }
  }, [currentUser?.email, currentUser?.role]);

  React.useEffect(() => {
    fetchData();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "boardinghouses" || e.key === "activityLog" || e.key === "alertsCleared") fetchData();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fetchData]);

  const totalBoardinghouses = boardinghouses.length;
  const totalRooms = rooms.length;
  const roomsWithCR = rooms.filter((r) => Boolean(r.withCR)).length;
  const roomsWithCooking = rooms.filter((r) => Boolean(r.cookingAllowed)).length;
  const availableRooms = rooms.filter((r) => Number(r.availableBeds) > 0).length;

  const summaryStats = [
    { icon: Building2, title: "Total Boardinghouses", value: totalBoardinghouses, color: "#06b6d4" },
    { icon: Bed, title: "Total Rooms", value: totalRooms, color: "#3b82f6" },
    { icon: Bath, title: "Rooms with CR", value: roomsWithCR, color: "#8b5cf6" },
    { icon: ChefHat, title: "Rooms with Cooking Allowed", value: roomsWithCooking, color: "#10b981" },
    { icon: DoorOpen, title: "Available Rooms", value: availableRooms, color: "#f59e0b" },
  ];

  const roomsDetailed = React.useMemo(() => {
    return rooms.map((r) => ({
      ...r,
      boardinghouseName: boardinghouses.find((b) => (b.rooms || []).some((rr) => rr.id === r.id))?.name ?? "Unknown",
    })) as Array<typeof rooms[number] & { boardinghouseName: string }>;
  }, [boardinghouses, rooms]);

  const handleRefresh = () => {
    fetchData();
    toast({ title: "Dashboard refreshed", description: "Dashboard data refreshed successfully" });
  };

  // Clear recent updates (activity log)
  const clearActivity = () => {
    try {
      // Persist an explicit empty array so fetchData treats it as intentionally cleared
      localStorage.setItem("activityLog", JSON.stringify([]));
    } catch {}
    setActivityLog([]);
    toast({ title: "Recent updates cleared" });
  };

  // Clear reminders/alerts
  const clearAlerts = () => {
    try {
      // persist a flag so other tabs/windows can respond (if needed)
      // mark all current alerts as dismissed so they won't be rebuilt on fetch
      const existing = alerts.map((a) => a.id);
      const prev = JSON.parse(localStorage.getItem("dismissedAlerts") ?? "[]") as string[];
      const merged = Array.from(new Set([...(prev || []), ...existing]));
      localStorage.setItem("dismissedAlerts", JSON.stringify(merged));
    } catch {}
    setAlerts([]);
    toast({ title: "Reminders & Alerts cleared" });
  };
  
  // delete a single activity item (persisted to activityLog)
  const deleteActivityItem = (tsKey: number, metaId?: string | number) => {
    const idKey = `${tsKey}-${metaId ?? ""}`;
    const next = activityLog.filter((a) => `${a.ts}-${a.meta?.id ?? ""}` !== idKey);
    try {
      // persist remaining activities
      localStorage.setItem("activityLog", JSON.stringify(next));
    } catch {}
    setActivityLog(next);
    toast({ title: "Activity removed" });
  };

  // dismiss a single alert (persisted to dismissedAlerts so it won't be rebuilt)
  const dismissAlertItem = (alertId: string) => {
    const next = alerts.filter((a) => a.id !== alertId);
    try {
      const prev = JSON.parse(localStorage.getItem("dismissedAlerts") ?? "[]") as string[];
      const merged = Array.from(new Set([...(prev || []), alertId]));
      localStorage.setItem("dismissedAlerts", JSON.stringify(merged));
    } catch {}
    setAlerts(next);
    toast({ title: "Reminder dismissed" });
  };
  
  // single expand/collapse state controlling both sections
  const [expandedAll, setExpandedAll] = React.useState(false);
  const LIST_COLLAPSE_COUNT = 5; // show up to 5 items when collapsed

  // measure real DOM heights for robust collapsed/expanded sizing (avoids clipping)
  const activityListRef = React.useRef<HTMLDivElement | null>(null);
  const alertsListRef = React.useRef<HTMLDivElement | null>(null);
  const bottomGridRef = React.useRef<HTMLDivElement | null>(null);

  const [activityCollapsedH, setActivityCollapsedH] = React.useState<number>(0);
  const [activityExpandedH, setActivityExpandedH] = React.useState<number>(0);
  const [alertsCollapsedH, setAlertsCollapsedH] = React.useState<number>(0);
  const [alertsExpandedH, setAlertsExpandedH] = React.useState<number>(0);

  const measureListHeights = (listEl: HTMLDivElement | null, count: number) => {
    if (!listEl) return { collapsed: 0, expanded: 0 };
    const children = Array.from(listEl.children) as HTMLElement[];
    // expanded is the scrollHeight (includes padding)
    const expanded = listEl.scrollHeight || children.reduce((s, c) => s + c.getBoundingClientRect().height, 0);
    const cs = window.getComputedStyle(listEl);
    const gap = parseFloat(cs.rowGap || cs.gap || "0") || 0;
    const padTop = parseFloat(cs.paddingTop || "0") || 0;
    const padBottom = parseFloat(cs.paddingBottom || "0") || 0;

    const visibleChildren = children.slice(0, Math.max(0, Math.min(count, children.length)));
    const collapsed = visibleChildren.reduce((s, c, idx) => s + c.getBoundingClientRect().height + (idx > 0 ? gap : 0), 0) + padTop + padBottom;
    const SAFETY = 4;
    return { collapsed: Math.ceil(collapsed + SAFETY), expanded: Math.ceil(expanded + SAFETY) };
  };

  // measure whenever lists change or window resizes
  React.useLayoutEffect(() => {
    const measureAll = () => {
      const a = measureListHeights(activityListRef.current, LIST_COLLAPSE_COUNT);
      setActivityCollapsedH(a.collapsed || 48);
      setActivityExpandedH(a.expanded || Math.max(a.collapsed, 200));
      const b = measureListHeights(alertsListRef.current, LIST_COLLAPSE_COUNT);
      setAlertsCollapsedH(b.collapsed || 48);
      setAlertsExpandedH(b.expanded || Math.max(b.collapsed, 200));
    };
    measureAll();
    const onResize = () => measureAll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activityLog, alerts, LIST_COLLAPSE_COUNT]);

  // helpers used by the toggle buttons
  const activityHasMore = activityLog.length > LIST_COLLAPSE_COUNT;
  const alertsHasMore = alerts.length > LIST_COLLAPSE_COUNT;
 
  const toggleExpandAll = () => {
     setExpandedAll((prev) => {
       const next = !prev;
       // if we're expanding, scroll the bottom grid into view after the height transition starts/finishes
       if (!prev) {
         // match transition duration (360ms) and allow slight extra time
         window.setTimeout(() => {
           bottomGridRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
         }, 420);
       } else {
         // when collapsing, gently ensure the top of the bottom-grid is visible
         window.setTimeout(() => {
           bottomGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
         }, 200);
       }
       return next;
     });
   };

  // Quick action helpers
  const goAddBoardinghouse = () => navigate("/add-boardinghouse");
  const goAddRoom = () => {
    // preselect first boardinghouse if present
    if (boardinghouses.length > 0) {
      try {
        localStorage.setItem("selectedBoardinghouseId", boardinghouses[0].id);
      } catch {}
    }
    navigate("/add-room");
  };
  const goEditRoom = () => {
    if (boardinghouses.length > 0) {
      try {
        localStorage.setItem("selectedBoardinghouseId", boardinghouses[0].id);
      } catch {}
    }
    navigate("/edit-room");
  };
  const goUploadPhotos = () => {
    if (boardinghouses.length > 0) {
      try {
        localStorage.setItem("selectedBoardinghouseId", boardinghouses[0].id);
      } catch {}
    }
    navigate("/my-boardinghouse");
  };

  // Data for charts (insert near other calculations)
  const roomsByGenderCounts = React.useMemo(() => {
    const male = rooms.filter((r) => String(r.gender ?? "").toLowerCase() === "male").length;
    const female = rooms.filter((r) => String(r.gender ?? "").toLowerCase() === "female").length;
    const anyCount = rooms.filter((r) => {
      const g = String(r.gender ?? "").toLowerCase();
      return g !== "male" && g !== "female";
    }).length;
    return { male, female, any: anyCount };
  }, [rooms]);

   const roomsWithCRPercent = totalRooms > 0 ? Math.round((roomsWithCR / totalRooms) * 100) : 0;
   const maxGenderCount = Math.max(1, roomsByGenderCounts.male, roomsByGenderCounts.female, roomsByGenderCounts.any);
 
   return (
     <div className="app-layout">
      <Sidebar />
      <div
        className="main-content dashboard-content"
        style={{
          marginLeft: isMobile ? undefined : "260px",
          minHeight: "100vh",
        }}
      >
        {/* Header */}
        <div className="dashboard-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 className="dashboard-title">Dashboard</h1>
            <button
              className="btn-refresh"
              onClick={handleRefresh}
              style={{ marginLeft: 8 }}
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <p className="dashboard-subtitle">Welcome back</p>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards-grid">
          {summaryStats.map((stat, index) => (
            <div key={index} className="summary-card">
              <div className="summary-card-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <stat.icon size={28} />
              </div>
              <div className="summary-card-content">
                <p className="summary-card-title">{stat.title}</p>
                <p className="summary-card-value">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Boardinghouse Summary Table */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Boardinghouse Summary</h2>
          </div>

          {boardinghouses.length === 0 ? (
            <div className="empty-state">
              <p>No boardinghouses added yet.</p>
              <p>Add a boardinghouse to see this summary.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Boardinghouse Name</th>
                    <th>Location</th>
                    <th>Total Rooms</th>
                    <th>Available Rooms</th>
                    <th>With CR</th>
                    <th>Cooking Allowed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {boardinghouses.map((bh) => {
                    const total = bh.rooms?.length ?? 0;
                    const available = (bh.rooms ?? []).filter((r) => Number(r.availableBeds) > 0).length;
                    const anyCR = (bh.rooms ?? []).some((r) => r.withCR) ? "Yes" : "No";
                    const anyCooking = (bh.rooms ?? []).some((r) => r.cookingAllowed) ? "Yes" : "No";
                    return (
                      <tr key={bh.id}>
                        <td className="font-semibold text-blue-600">{bh.name}</td>
                        <td>{bh.address}</td>
                        <td>{total}</td>
                        <td>{available}</td>
                        <td>{anyCR}</td>
                        <td>{anyCooking}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-view"
                              onClick={() => {
                                try {
                                  localStorage.setItem("selectedBoardinghouseId", bh.id);
                                } catch {}
                                navigate("/my-boardinghouse");
                              }}
                            >
                              View
                            </button>
                            <button
                              className="btn-edit"
                              onClick={() => {
                                try {
                                  localStorage.setItem("selectedBoardinghouseId", bh.id);
                                } catch {}
                                navigate(`/edit-boardinghouse/${bh.id}`);
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Room Overview Section */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Room Overview</h2>
          </div>

          {roomsDetailed.length === 0 ? (
            <div className="empty-state">
              <p>No rooms added yet.</p>
              <p>Add rooms to boardinghouses to see room overview here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Room Name</th>
                    <th>Boardinghouse</th>
                    <th>Beds Available</th>
                    <th>Gender Allowed</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roomsDetailed.map((room) => (
                    <tr key={room.id}>
                      <td className="font-semibold">{room.roomName}</td>
                      <td>{room.boardinghouseName}</td>
                      <td>{room.availableBeds}</td>
                      <td>{room.gender}</td>
                      <td>
                        <span className={`status-badge status-${room.availableBeds > 0 ? "active" : "full"}`}>
                          {room.availableBeds > 0 ? "🟢 Active" : "⚪ Full"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Data Overview Section (Recharts) */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Data Overview</h2>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 320px", padding: 12, background: "#fff", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Rooms by Gender</p>
              {/*
                Build the data for the bar chart. ResponsiveContainer keeps the chart responsive.
              */}
              {(() => {
                const genderData = [
                    { name: "Male", value: roomsByGenderCounts.male },
                    { name: "Female", value: roomsByGenderCounts.female },
                    { name: "Any/Other", value: roomsByGenderCounts.any },
                ];
                const colors = ["#3b82f6", "#ec4899", "#6b7280"];
                return (
                  <div style={{ width: "100%", height: 180, marginTop: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={genderData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={24} />
                    <Tooltip formatter={(v: any) => [v, "Rooms"]} />
                        <Bar dataKey="value" barSize={36}>
                          {genderData.map((entry, idx) => (
                            <Cell key={`c-${idx}`} fill={colors[idx % colors.length]} />
                          ))}
                        </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
                );
              })()}
            </div>

            <div style={{ flex: "0 0 240px", padding: 12, background: "#fff", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,.05)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Rooms with CR</p>
              {(() => {
                const crData = [
                  { name: "With CR", value: roomsWithCR },
                  { name: "Without CR", value: Math.max(0, totalRooms - roomsWithCR) },
                ];
                const CR_COLORS = ["#10b981", "#e5e7eb"];
                return (
              <div style={{ width: "100%", height: 140, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                          data={crData}
                      innerRadius={34}
                      outerRadius={56}
                          dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      labelLine={false}
                    >
                          {crData.map((entry, idx) => (
                            <Cell key={`cr-${idx}`} fill={CR_COLORS[idx % CR_COLORS.length]} />
                          ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={24} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
                );
              })()}
              <div style={{ marginTop: 6, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{roomsWithCRPercent}%</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{roomsWithCR} of {totalRooms} rooms</div>
              </div>
            </div>
              </div>
            </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={goAddBoardinghouse}>
              <Plus size={20} />
              Add New Boardinghouse
            </button>
            <button className="quick-action-btn" onClick={goAddRoom}>
              <Plus size={20} />
              Add Room
            </button>
            <button className="quick-action-btn" onClick={goEditRoom}>
              <Edit size={20} />
              Edit Room
            </button>
            <button className="quick-action-btn" onClick={goUploadPhotos}>
              <Image size={20} />
              Upload Boardinghouse Photos
            </button>
          </div>
              </div>

        {/* Bottom Grid: Recent Activities & Alerts */}
        <div className="bottom-grid" ref={bottomGridRef}>
          {/* Recent Updates */}
          <div className="dashboard-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="section-title" style={{ margin: 0 }}>Recent Updates</h2>
              <button
                onClick={clearActivity}
                className="btn-clear"
                style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}
                aria-label="Clear recent updates"
              >
                Clear All
              </button>
            </div>

            {/* animated container - uses containerStyle(count) which reads expandedAll */}
            <div
              style={{
                overflow: "hidden",
                maxHeight: expandedAll ? activityExpandedH : activityCollapsedH,
                transition: "max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease",
                willChange: "max-height",
              }}
              aria-live="polite"
            >
              <div className="activity-feed" ref={activityListRef}>
                {activityLog.length === 0 ? (
                  <div className="activity-item">
                    <div className="activity-content">
                      <p className="activity-text">No recent activity available.</p>
                    </div>
                  </div>
                ) : (
                  activityLog.map((a, i) => {
                    const itemKey = `${a.ts}-${a.meta?.id ?? i}`;
                    return (
                      <div key={itemKey} className="activity-item" style={{ position: "relative" }}>
                        <button
                          onClick={() => deleteActivityItem(a.ts, a.meta?.id)}
                          aria-label="Delete activity"
                          title="Delete"
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 14,
                            color: "#9ca3af",
                          }}
                        >
                          ×
                        </button>
                        <div className="activity-icon">
                          <TrendingUp size={16} />
                        </div>
                        <div className="activity-content">
                          <p className="activity-text">{a.message}</p>
                          <p className="activity-time">{new Date(a.ts).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* bottom-right Show All / Show less button - toggles both panels */}
            {activityLog.length > LIST_COLLAPSE_COUNT && (
               <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                 <button
                   onClick={toggleExpandAll}
                   className="btn-toggle"
                   style={{ background: "transparent", border: "none", color: "#374151", cursor: "pointer", fontSize: 13 }}
                   aria-expanded={expandedAll}
                 >
                   {expandedAll ? "Show less" : `Show all (${activityLog.length})`}
                 </button>
               </div>
             )}
           </div>
 
           {/* Reminders/Alerts */}
           <div className="dashboard-section">
             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
               <h2 className="section-title" style={{ margin: 0 }}>Reminders & Alerts</h2>
               <button
                 onClick={clearAlerts}
                 className="btn-clear"
                 style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14 }}
                 aria-label="Clear reminders and alerts"
               >
                 Clear All
               </button>
             </div>

             {/* animated container - shares expandedAll state so toggling one toggles both */}
             <div
              style={{
                overflow: "hidden",
                maxHeight: expandedAll ? alertsExpandedH : alertsCollapsedH,
                transition: "max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease",
                willChange: "max-height",
              }}
              aria-live="polite"
            >
              <div className="alerts-container" ref={alertsListRef}>
                {alerts.length === 0 ? (
                  <div className="alert-item alert-ok">
                    <AlertCircle size={20} />
                    <span>All required fields appear filled.</span>
                  </div>
                ) : (
                  alerts.map((al) => (
                    <div key={al.id} className="alert-item alert-warning" title={al.message} style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
                      <button
                        onClick={() => dismissAlertItem(al.id)}
                        aria-label="Dismiss alert"
                        title="Dismiss"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "#92400e",
                        }}
                      >
                        ×
                      </button>
                      <AlertCircle size={18} />
                      <span>{al.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* bottom-right Show All / Show less button - toggles both panels */}
            {alerts.length > LIST_COLLAPSE_COUNT && (
             <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
               <button
                 onClick={toggleExpandAll}
                 className="btn-toggle"
                 style={{ background: "transparent", border: "none", color: "#374151", cursor: "pointer", fontSize: 13 }}
                 aria-expanded={expandedAll}
               >
                 {expandedAll ? "Show less" : `Show all (${alerts.length})`}
               </button>
             </div>
           )}
          </div>
        </div>
      </div>
    </div>
   );
}
export default Dashboard;