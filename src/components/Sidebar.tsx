import { Home, Building2, Plus, Settings, LogOut, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LogoutModal from "@/components/LogoutModal"; // added import

type CurrentUser = {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
  loggedIn?: boolean;
};

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // submenu open state for "My Boardinghouse"
  const [myBHOpen, setMyBHOpen] = useState<boolean>(() => {
    const p = location.pathname;
    return ["/my-boardinghouse", "/add-room", "/edit-boardinghouse", "/edit-room"].some((r) =>
      p.startsWith(r)
    );
  });

  // auto-toggle submenu when route changes
  useEffect(() => {
    const p = location.pathname;
    const shouldOpen = ["/my-boardinghouse", "/add-room", "/edit-boardinghouse", "/edit-room"].some((r) =>
      p.startsWith(r)
    );
    setMyBHOpen(shouldOpen);
  }, [location.pathname]);

  // load current user from localStorage and keep it reactive across tabs
  const readUser = (): CurrentUser => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        name: parsed?.name ?? "Guest",
        email: parsed?.email ?? "",
        role: (parsed?.role ?? "tenant").toString(),
        avatar:
          parsed?.avatar ??
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
            parsed?.name ?? "Guest"
          )}`,
        loggedIn: parsed?.loggedIn ?? false,
      };
    } catch {
      return {
        name: "Guest",
        email: "",
        role: "tenant",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Guest`,
        loggedIn: false,
      };
    }
  };

  const [user, setUser] = useState<CurrentUser>(() => readUser());
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const onStorage = () => setUser(readUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const performLogout = () => {
    localStorage.removeItem("currentUser");
    setUser(readUser());
    navigate("/auth");
  };
  const handleLogoutClick = () => setShowLogoutModal(true);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    // note: My Boardinghouse will render a nested submenu below instead of a flat entry
    { icon: Building2, label: "My Boardinghouse", path: "/my-boardinghouse" },
    { icon: Plus, label: "Add New", path: "/add-boardinghouse" },
    { icon: Settings, label: "Account Settings", path: "/account-settings" },
    // Logout handled via onClick to ensure cleanup + redirect
    { icon: LogOut, label: "Logout", path: "#" },
  ];

  return (
    <div
      className="sidebar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "260px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
      }}
    >
      {/* Return to Interface (upper-left inside sidebar) */}
      <button
        type="button"
        aria-label="Go to interface"
        onClick={() => navigate("/interface")}
        className="nav-arrow arrow-left sidebar-return"
        style={{ position: "absolute", top: 12, left: 12, width: 40, height: 40, zIndex: 50 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* hide scroll indicator when My Boardinghouse submenu is open (still scrollable) */}
      {myBHOpen && (
        <style>{`
          .sidebar-nav.submenu-open {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
          }
          .sidebar-nav.submenu-open::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}</style>
      )}
      {/* Top navigation / back chevron could remain here (if present) */}
      <div
        className="sidebar-profile"
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 8,
        }}
      >
        <div
          className="profile-avatar"
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
          }}
        >
          <img src={user.avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div className="profile-info" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{user.name}</h3>
          <p className="capitalize" style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>{user.role}</p>
          {user.email && <p className="sidebar-email" style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 4 }}>{user.email}</p>}
        </div>
      </div>

      {/* single divider removed as requested */}

      <nav
        className={`sidebar-nav ${myBHOpen ? "submenu-open" : ""}`}
        style={{
          overflowY: myBHOpen ? "auto" : "hidden", // prevent scrollbars when submenu closed
          WebkitOverflowScrolling: "touch",
          flex: 1,
          padding: "12px 0",
        }}
      >
        {/* render top-level items but handle My Boardinghouse as a toggle with submenu */}
        {menuItems.map((item) => {
          if (item.label === "My Boardinghouse") {
            const isActive = ["/my-boardinghouse", "/add-room", "/edit-boardinghouse", "/edit-room"].some((r) =>
              location.pathname.startsWith(r)
            );
            return (
              <div key={item.label}>
                <button
                  type="button"
                  aria-expanded={myBHOpen}
                  aria-controls="sidebar-my-bh-submenu"
                  onClick={() => setMyBHOpen((s) => !s)}
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 180ms ease" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <item.icon className="sidebar-nav-icon" />
                    <span>{item.label}</span>
                  </span>

                  {/* Chevron with rotate animation */}
                  <ChevronDown
                    size={18}
                    aria-hidden
                    style={{
                      transform: myBHOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 240ms cubic-bezier(0.2, 0, 0, 1)",
                      color: isActive ? "#0369a1" : "#6b7280",
                      marginLeft: 8,
                    }}
                  />
                </button>

                {/* Submenu - animated collapse using max-height + opacity for smooth drop */}
                <div
                  id="sidebar-my-bh-submenu"
                  className="sidebar-submenu"
                  style={{
                    maxHeight: myBHOpen ? 420 : 0,
                    overflow: "hidden",
                    transition: "max-height 320ms cubic-bezier(0.2,0,0,1), opacity 220ms ease",
                    opacity: myBHOpen ? 1 : 0,
                    paddingLeft: 20,
                    marginTop: 6,
                  }}
                >
                  <Link to="/my-boardinghouse" className={`sidebar-nav-item ${location.pathname === "/my-boardinghouse" ? "active" : ""}`} style={{ display: "block", paddingLeft: 12 }}>
                    <span>Overview</span>
                  </Link>
                  <Link to="/add-room" className={`sidebar-nav-item ${location.pathname === "/add-room" ? "active" : ""}`} style={{ display: "block", paddingLeft: 12 }}>
                    <span>Add Room</span>
                  </Link>
                  {/* build edit link from stored selectedBoardinghouseId when present */}
                  {(() => {
                    const selected = typeof window !== "undefined" ? localStorage.getItem("selectedBoardinghouseId") : null;
                    const editHref = selected ? `/edit-boardinghouse/${selected}` : "/edit-boardinghouse";
                    const editActive = location.pathname.startsWith("/edit-boardinghouse");
                    return (
                      <Link
                        to={editHref}
                        className={`sidebar-nav-item ${editActive ? "active" : ""}`}
                        style={{ display: "block", paddingLeft: 12 }}
                      >
                        <span>Edit Boardinghouse</span>
                      </Link>
                    );
                  })()}
                  <Link to="/edit-room" className={`sidebar-nav-item ${location.pathname.startsWith("/edit-room") ? "active" : ""}`} style={{ display: "block", paddingLeft: 12 }}>
                    <span>Edit Room</span>
                  </Link>
                </div>
              </div>
            );
          }

          if (item.label === "Logout") {
            return (
              <button
                key={item.label}
                onClick={handleLogoutClick}
                className="sidebar-nav-item logout-button"
                type="button"
                style={{ width: "100%", textAlign: "left" }}
              >
                <item.icon className="sidebar-nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-nav-item ${location.pathname === item.path ? "active" : ""}`}
            >
              <item.icon className="sidebar-nav-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* logout confirm modal */}
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          performLogout();
          setShowLogoutModal(false);
        }}
      />
    </div>
  );
};
