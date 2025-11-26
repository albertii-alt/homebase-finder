import { useEffect, useMemo, useState, useRef } from "react";
import { Menu, Home, Info, LayoutDashboard, HelpCircle, Shield, Settings, LogOut, Heart } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import '../styles/interface.css';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import LogoutModal from "@/components/LogoutModal";
import regionsJson from "../ph-json/region.json";

interface CurrentUser {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
  loggedIn?: boolean;
}

type Room = {
  id: string;
  roomName: string;
  totalBeds: number;
  availableBeds: number;
  rentPrice: number;
  withCR?: boolean;
  gender?: string;
  cookingAllowed?: boolean;
  inclusions?: string[];
};

type Boardinghouse = {
  id: string;
  ownerEmail?: string;
  ownerName?: string;
  name: string;
  contact?: string;
  address?: string;
  description?: string;
  facebook?: string;
  photos?: string[];
  rooms?: Room[];
};

type Region = {
  id: number;
  psgc_code: string;
  region_name: string;
  region_code: string;
};

type PriceFilterValue = "below-500" | "500-1000" | "1000-above";
type GenderFilterValue = "male" | "female" | "any";

const REGIONS: Region[] = regionsJson as Region[];
const REGION_ALL = "all";
const PRICE_ALL = "all";
const GENDER_ALL = "all";

const priceLabelMap: Record<PriceFilterValue, string> = {
  "below-500": "Below ₱500",
  "500-1000": "₱500 – ₱1,000",
  "1000-above": "₱1,000 and above",
};

const genderLabelMap: Record<GenderFilterValue, string> = {
  male: "Male",
  female: "Female",
  any: "Any",
};

const regionMatchesBoardinghouse = (bh: Boardinghouse, regionCode: string): boolean => {
  const region = REGIONS.find((r) => r.region_code === regionCode);
  if (!region) return false;

  const address = (bh.address ?? "").toLowerCase();
  const regionName = region.region_name.toLowerCase();
  if (address.includes(regionName)) return true;

  const candidates = [
    (bh as any).regionCode,
    (bh as any).region_code,
    (bh as any).region,
    (bh as any).regionName,
    (bh as any).region_name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return candidates.some((value) => value === regionCode || regionName.includes(value) || value.includes(regionName));
};

const priceMatchesBoardinghouse = (bh: Boardinghouse, range: PriceFilterValue): boolean => {
  if (!bh.rooms || bh.rooms.length === 0) return false;
  return bh.rooms.some((room) => {
    const price = Number(room.rentPrice ?? 0);
    if (!Number.isFinite(price)) return false;
    switch (range) {
      case "below-500":
        return price > 0 && price < 500;
      case "500-1000":
        return price >= 500 && price <= 1000;
      case "1000-above":
        return price >= 1000;
      default:
        return false;
    }
  });
};

const genderMatchesBoardinghouse = (bh: Boardinghouse, gender: GenderFilterValue): boolean => {
  if (!bh.rooms || bh.rooms.length === 0) {
    return gender === "any";
  }
  return bh.rooms.some((room) => {
    const value = String(room.gender ?? "").toLowerCase();
    if (!value) return gender === "any";
    if (gender === "any") {
      return ["any", "either", "mixed", "coed", "co-ed", "unisex"].some((token) => value.includes(token));
    }
    return value === gender;
  });
};

const Interface = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // read current user from localStorage (set by Auth.tsx)
  const raw = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
  const parsed: CurrentUser | null = raw ? JSON.parse(raw) : null;

  const user: CurrentUser = {
    name: parsed?.name ?? "Guest",
    email: parsed?.email ?? "",
    role: (parsed?.role ?? "tenant").toString().toLowerCase(),
    avatar: parsed?.avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(parsed?.name ?? "Guest")}`,
    loggedIn: parsed?.loggedIn ?? false,
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/auth");
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { icon: Home, label: "Home", onClick: () => navigate("/interface") },
    { icon: Info, label: "About", onClick: () => navigate("/about") },
    { icon: Heart, label: "Favorites", onClick: () => navigate("/favorites") },
    // Dashboard only visible for owners
    ...(user.role === "owner" ? [{ icon: LayoutDashboard, label: "Dashboard", onClick: () => navigate("/dashboard") }] : []),
    { icon: HelpCircle, label: "Help", onClick: () => {} },
    { icon: Shield, label: "Privacy & Policy", onClick: () => {} },
    { icon: Settings, label: "Settings", onClick: () => {} },
    { icon: LogOut, label: "Logout", onClick: () => setShowLogoutModal(true) },
  ];

  // local state for boardinghouses loaded from localStorage
  const [boardinghouses, setBoardinghouses] = useState<Boardinghouse[]>([]);

  // filters / search (input values)
  const [searchInput, setSearchInput] = useState("");
  const [regionInput, setRegionInput] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<PriceFilterValue | null>(null);
  const [genderInput, setGenderInput] = useState<GenderFilterValue | null>(null);

  // applied filters (only change when Search is clicked)
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedRegion, setAppliedRegion] = useState<string | null>(null);
  const [appliedPrice, setAppliedPrice] = useState<PriceFilterValue | null>(null);
  const [appliedGender, setAppliedGender] = useState<GenderFilterValue | null>(null);

  // keep last serialized value to detect same-tab changes (storage event won't fire in same tab)
  const lastDataRef = useRef<string>("");

  const loadFromStorage = () => {
    try {
      const rawBH = localStorage.getItem("boardinghouses");
      if (!rawBH) {
        setBoardinghouses([]);
        lastDataRef.current = "[]";
        return;
      }
      // parse and normalize
      const parsedBH = JSON.parse(rawBH) as Boardinghouse[] | null;
      const arr = Array.isArray(parsedBH) ? parsedBH : [];
      setBoardinghouses(arr);
      lastDataRef.current = rawBH;
    } catch (err) {
      console.warn("Failed to parse boardinghouses from localStorage", err);
      setBoardinghouses([]);
      lastDataRef.current = "[]";
    }
  };

  useEffect(() => {
    loadFromStorage();

    // respond to storage events (other windows / tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "boardinghouses") {
        loadFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);

    // simple same-tab polling to detect changes made elsewhere in app
    const interval = setInterval(() => {
      try {
        const rawBH = localStorage.getItem("boardinghouses") ?? "[]";
        if (rawBH !== lastDataRef.current) {
          loadFromStorage();
        }
      } catch {
        // ignore
      }
    }, 800);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derive unique location options from loaded boardinghouses
  const selectedRegion = useMemo(
    () => (appliedRegion ? REGIONS.find((region) => region.region_code === appliedRegion) : undefined),
    [appliedRegion]
  );

  const filterChips = useMemo(() => {
     const chips: { label: string; value: string }[] = [];
    if (appliedSearch.trim()) chips.push({ label: "Search", value: `"${appliedSearch.trim()}"` });
    if (selectedRegion) chips.push({ label: "Region", value: selectedRegion.region_name });
    if (appliedPrice) chips.push({ label: "Price", value: priceLabelMap[appliedPrice] });
    if (appliedGender) chips.push({ label: "Gender", value: genderLabelMap[appliedGender] });
    return chips;
  }, [appliedSearch, selectedRegion, appliedPrice, appliedGender]);

  const handleClearFilters = () => {
    setSearchInput("");
    setRegionInput(null);
    setPriceInput(null);
    setGenderInput(null);
    setAppliedSearch("");
    setAppliedRegion(null);
    setAppliedPrice(null);
    setAppliedGender(null);
  };

  const handleApplyFilters = () => {
    setAppliedSearch(searchInput);
    setAppliedRegion(regionInput);
    setAppliedPrice(priceInput);
    setAppliedGender(genderInput);
  };

  // apply search + filters
  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return boardinghouses.filter((bh) => {
      // search by name or address
      if (q) {
        const inName = bh.name?.toLowerCase().includes(q);
        const inAddress = bh.address?.toLowerCase().includes(q);
        if (!inName && !inAddress) return false;
      }
      if (appliedRegion && !regionMatchesBoardinghouse(bh, appliedRegion)) {
        return false;
      }
      if (appliedPrice && !priceMatchesBoardinghouse(bh, appliedPrice)) {
        return false;
      }
      if (appliedGender && !genderMatchesBoardinghouse(bh, appliedGender)) {
        return false;
      }

      return true;
    });
  }, [boardinghouses, appliedSearch, appliedRegion, appliedPrice, appliedGender]);

  const hasAvailableRooms = (bh: Boardinghouse) => {
    if (!bh.rooms || bh.rooms.length === 0) return false;
    return bh.rooms.some((r) => Number(r.availableBeds) > 0);
  };

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("favoriteBoardinghouses");
      const parsedFav = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsedFav) ? parsedFav : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (boardinghouseId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(boardinghouseId)
        ? prev.filter((id) => id !== boardinghouseId)
        : [...prev, boardinghouseId];
      localStorage.setItem("favoriteBoardinghouses", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo + small profile on left */}
            <div className="flex items-center gap-4">
              <div className="logo-icon">
                <img className="img-logo" src="/HomebaseFinderOfficialLogo.png" alt="Homebase Finder Logo" />
              </div>
              <div className="logo-text">
                <div className="logo-title">HOMEBASE</div>
                <div className="logo-subtitle">FINDER</div>
              </div>
            </div>

            {/* Desktop Navigation + (no profile shown here) */}
            {/* Profile & logout are intentionally moved into the sidebar so owner and tenant see the same header. */}
            <div className="hidden md:flex items-center gap-8">
              <nav className="flex items-center gap-6">
                <a href="/interface" className="text-white font-semibold hover:text-cyan-100 transition-colors">
                  Home
                </a>
                <a href="/about" className="text-white font-semibold hover:text-cyan-100 transition-colors">
                  About
                </a>
              </nav>

              {/* For desktop we only show login/register when NOT logged in.
                  When logged in, user profile + logout are available in the sidebar (Sheet). */}
              {!user.loggedIn && (
                <div className="flex items-center gap-4">
                  <a href="/auth" className="text-white font-semibold hover:text-cyan-100 transition-colors">
                    Login
                  </a>
                  <a href="/auth" className="text-white font-semibold hover:text-cyan-100 transition-colors">
                    Register
                  </a>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-white">
                <div className="flex flex-col h-full">
                  {/* User Profile - use real currentUser data */}
                  <div className="flex flex-col items-center py-6 border-b">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-24 h-24 rounded-full mb-3 bg-gradient-to-br from-cyan-400 to-blue-500 p-1"
                    />
                    <h3 className="text-xl font-bold text-foreground">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground capitalize mt-1">{user.role}</p>
                  </div>

                  {/* Menu Items */}
                  <nav className="sidebar-menu flex-1 py-6 overflow-y-auto">
                    {menuItems.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          item.onClick();
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 text-foreground hover:bg-slate-100 transition-colors text-left"
                      >
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-lg">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logout modal used by top menu */}
            <LogoutModal
              open={showLogoutModal}
              onClose={() => setShowLogoutModal(false)}
              onConfirm={() => {
                handleLogout();
                setShowLogoutModal(false);
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="filters-header">
            <h2 className="filters-title text-foreground">Filters</h2>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
              className="filter-action-btn"
            >
               Reset Filters
             </Button>
          </div>

          <div className="filters-grid">
            <div className="filter-item md:col-span-2">
               <label className="filter-label" htmlFor="filter-search">Search</label>
               <Input
                 id="filter-search"
                 value={searchInput}
                 onChange={(event) => setSearchInput(event.target.value)}
                 placeholder="Search by name or address"
                 className="bg-slate-50"
               />
             </div>

            <div className="filter-item">
              <label className="filter-label">Region</label>
              <Select
                value={regionInput ?? REGION_ALL}
                onValueChange={(value) => setRegionInput(value === REGION_ALL ? null : value)}
              >
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={REGION_ALL}>All Regions</SelectItem>
                  {REGIONS.map((region) => (
                    <SelectItem key={region.region_code} value={region.region_code}>
                      {region.region_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="filter-item">
              <label className="filter-label">Price Range</label>
              <Select
                value={priceInput ?? PRICE_ALL}
                onValueChange={(value) =>
                  setPriceInput(value === PRICE_ALL ? null : (value as PriceFilterValue))
                }
              >
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRICE_ALL}>All Prices</SelectItem>
                  <SelectItem value="below-500">Below ₱500</SelectItem>
                  <SelectItem value="500-1000">₱500 – ₱1,000</SelectItem>
                  <SelectItem value="1000-above">₱1,000 and above</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="filter-item">
              <label className="filter-label">Gender</label>
              <Select
                value={genderInput ?? GENDER_ALL}
                onValueChange={(value) =>
                  setGenderInput(value === GENDER_ALL ? null : (value as GenderFilterValue))
                }
              >
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENDER_ALL}>Any Gender</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="any">Any / Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="filter-item">
              <label className="filter-label" aria-hidden="true">&nbsp;</label>
              <Button
                type="button"
                onClick={handleApplyFilters}
                className="filter-action-btn w-full"
              >
                Search
              </Button>
             </div>
          </div>

          <div className="filters-active-summary">
            <span className="font-semibold">{filtered.length}</span>
            <span>{filtered.length === 1 ? "result" : "results"}</span>
            {filterChips.length === 0 ? (
               <span className="text-slate-500">showing all boardinghouses</span>
             ) : (
               filterChips.map((chip) => (
                 <span key={`${chip.label}-${chip.value}`} className="filter-chip">
                   {chip.label}: {chip.value}
                 </span>
               ))
             )}
          </div>
        </div>

        {/* Properties Section */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-6">All Boardinghouses</h2>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-inner border border-dashed border-slate-300 p-10 text-center text-slate-600">
              No boardinghouses match your current filters.
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((property) => {
                const firstPricedRoom = property.rooms?.find(
                  (room) => typeof room.rentPrice === "number"
                );
                const formattedPrice =
                  firstPricedRoom && Number.isFinite(firstPricedRoom.rentPrice)
                    ? `₱${Number(firstPricedRoom.rentPrice).toLocaleString()} / month`
                    : "Price not available";
                const isFavorite = favoriteIds.includes(property.id);

                return (
                  <div
                    key={property.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow property-card"
                  >
                    <button
                      type="button"
                      className="favorite-toggle"
                      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                      onClick={() => toggleFavorite(property.id)}
                    >
                      <Heart
                        size={18}
                        color={isFavorite ? "#f87171" : "#94a3b8"}
                        fill={isFavorite ? "#f87171" : "transparent"}
                      />
                    </button>

                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="aspect-video md:aspect-auto">
                        <img
                          src={property.photos?.[0] ?? "/placeholder.svg"}
                          alt={property.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-8 text-white flex flex-col justify-center">
                        <h3 className="text-3xl font-bold mb-4">{property.name}</h3>
                        <p className="text-white/90 mb-4 line-clamp-4">{property.description}</p>

                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm">{property.address}</span>
                        </div>

                        <div className="text-2xl font-bold mb-4">{formattedPrice}</div>

                        <Button
                          variant="outline"
                          className="bg-white/10 border-white/50 text-white hover:bg-white/20 hover:text-white"
                          onClick={() => navigate(`/boardinghouse/${property.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Interface;
