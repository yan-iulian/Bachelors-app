import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { logout } from "../../store/authSlice";

function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (!user) return null;

  // Navigation links per role
  const navLinks = {
    Director: [
      { label: "Dashboard", path: "/director", icon: "dashboard" },
      { label: "Mașini", path: "/director/masini", icon: "directions_car" },
      {
        label: "Clienți",
        icon: "groups",
        desc: "Gestionează interacțiunile cu clienții",
        children: [
          {
            label: "Tranzacții",
            path: "/director/tranzactii",
            icon: "payments",
            desc: "Istoric vânzări și achiziții",
          },
          {
            label: "Test Drive",
            path: "/director/test-drive",
            icon: "speed",
            desc: "Cereri programare test drive",
          },
          {
            label: "Discount",
            path: "/director/discount",
            icon: "sell",
            desc: "Solicitări reduceri de preț",
          },
        ],
      },
      {
        label: "Service",
        icon: "home_repair_service",
        desc: "Monitorizare reparații și estimări",
        children: [
          {
            label: "Reparații",
            path: "/director/reparatii",
            icon: "build",
            desc: "Reparații active și finalizate",
          },
          {
            label: "Estimări",
            path: "/director/estimari",
            icon: "rate_review",
            desc: "Estimări cost de la mecanici",
          },
        ],
      },
      { label: "Rapoarte", path: "/director/rapoarte", icon: "picture_as_pdf" },
      {
        label: "Notificări",
        path: "/director/notificari",
        icon: "notifications",
      },
      { label: "Audit Log", path: "/director/audit-log", icon: "history" },
    ],
    Client: [
      { label: "Home", path: "/client", icon: "home" },
      { label: "Catalog", path: "/client/catalog", icon: "inventory_2" },
      { label: "Wishlist", path: "/client/wishlist", icon: "favorite" },
      { label: "Credit", path: "/client/simulare-credit", icon: "calculate" },
      {
        label: "AI Match",
        path: "/client/recomandare-ai",
        icon: "auto_awesome",
      },
      {
        label: "Notificări",
        path: "/client/notificari",
        icon: "notifications",
      },
    ],
    Mecanic: [
      { label: "Activitate", path: "/mecanic/reparatii", icon: "work_history" },
      { label: "Workspace", path: "/mecanic", icon: "construction" },
      { label: "Piese", path: "/mecanic/piese", icon: "inventory_2" },
      {
        label: "Notificări",
        path: "/mecanic/notificari",
        icon: "notifications",
      },
      {
        label: "Fișă PDF",
        path: "/mecanic/fisa-reparatie",
        icon: "picture_as_pdf",
      },
    ],
  };

  const links = navLinks[user.rol] || [];
  const homePath = links.length > 0 ? links[0].path : "/";
  const subtitleMap = {
    Director: "Dashboard Director",
    Client: "Premium Client",
    Mecanic: "Service & Reparații",
  };

  return (
    <header className="sticky top-0 z-50 glass-header" ref={dropdownRef}>
      <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to={homePath} className="flex items-center gap-3 group">
            <div className="size-10 bg-gradient-to-br from-primary to-purple-800 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-white text-2xl">
                diamond
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-xl font-bold tracking-tight leading-none">
                AerYan
              </h1>
              <span className="text-slate-400 text-xs font-medium tracking-widest uppercase">
                {subtitleMap[user.rol]}
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              // Mega-menu group
              if (link.children) {
                const isOpen = openDropdown === link.label;
                const hasActiveChild = link.children.some(
                  (c) => location.pathname === c.path,
                );
                return (
                  <div key={link.label}>
                    <button
                      onClick={() =>
                        setOpenDropdown(isOpen ? null : link.label)
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        hasActiveChild || isOpen
                          ? "bg-primary/15 text-primary shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {link.icon}
                      </span>
                      {link.label}
                      <span
                        className={`material-symbols-outlined text-[16px] transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                );
              }
              // Regular link
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User + Logout */}
        <div className="flex items-center gap-4">
          {/* User Info + Dropdown */}
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-white">
                {user.nume}
              </span>
              <span className="text-xs text-slate-400">{user.rol}</span>
            </div>

            {/* Avatar */}
            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20">
              {user.nume?.charAt(0)}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="glass-card hover:bg-red-500/20 hover:border-red-500/30 transition-all size-10 rounded-full flex items-center justify-center group"
              title="Logout"
            >
              <span className="material-symbols-outlined text-slate-400 group-hover:text-red-400 text-[20px]">
                logout
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Full-width Mega Menu Panels ═══ */}
      {links.map((link) => {
        if (!link.children) return null;
        const isOpen = openDropdown === link.label;
        if (!isOpen) return null;
        return (
          <div
            key={link.label + "-mega"}
            className="absolute top-full left-0 right-0 z-50 animate-[fadeIn_0.15s_ease-out]"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 top-20 bg-black/40 backdrop-blur-sm z-0"
              onClick={() => setOpenDropdown(null)}
            />
            {/* Panel */}
            <div className="relative z-10 bg-[#1a1333]/98 backdrop-blur-2xl border-t border-b border-[#895af6]/15 shadow-2xl shadow-black/40">
              <div className="max-w-[1600px] mx-auto px-6 py-8">
                {/* Group Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="size-10 bg-[#895af6]/15 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#895af6] text-2xl">
                      {link.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {link.label}
                    </h3>
                    {link.desc && (
                      <p className="text-xs text-slate-400">{link.desc}</p>
                    )}
                  </div>
                </div>
                {/* Children Grid */}
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: `repeat(${link.children.length}, minmax(0, 1fr))`,
                  }}
                >
                  {link.children.map((child) => {
                    const isChildActive = location.pathname === child.path;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`group/card flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all ${
                          isChildActive
                            ? "bg-[#895af6]/15 border-[#895af6]/40 shadow-lg shadow-[#895af6]/10"
                            : "bg-white/[0.03] border-white/5 hover:bg-[#895af6]/10 hover:border-[#895af6]/30 hover:shadow-lg hover:shadow-[#895af6]/5 hover:-translate-y-1"
                        }`}
                      >
                        <div
                          className={`size-14 rounded-2xl flex items-center justify-center transition-all ${
                            isChildActive
                              ? "bg-[#895af6]/25"
                              : "bg-white/5 group-hover/card:bg-[#895af6]/20"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-3xl transition-colors ${
                              isChildActive
                                ? "text-[#895af6]"
                                : "text-slate-400 group-hover/card:text-[#895af6]"
                            }`}
                          >
                            {child.icon}
                          </span>
                        </div>
                        <div className="text-center">
                          <span
                            className={`text-base font-bold block transition-colors ${
                              isChildActive ? "text-[#895af6]" : "text-white"
                            }`}
                          >
                            {child.label}
                          </span>
                          {child.desc && (
                            <span className="text-xs text-slate-500 mt-1 block">
                              {child.desc}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </header>
  );
}

export default Navbar;
