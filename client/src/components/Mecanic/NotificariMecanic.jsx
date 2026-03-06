import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../../config/apiHelper";

const tipConfig = {
  estimare_acceptata: {
    icon: "check_circle",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Estimare Aprobată",
  },
  estimare_respinsa: {
    icon: "cancel",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Estimare Respinsă",
  },
  reparatie_finalizata: {
    icon: "verified",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    label: "Reparație Finalizată",
  },
  status_schimbat: {
    icon: "swap_horiz",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Status Schimbat",
  },
  estimare_trimisa: {
    icon: "send",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    label: "Estimare Trimisă",
  },
};

const defaultTip = {
  icon: "notifications",
  color: "text-slate-400",
  bg: "bg-slate-500/10",
  border: "border-slate-500/20",
  label: "Notificare",
};

function NotificariMecanic() {
  const navigate = useNavigate();
  const [notificari, setNotificari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("toate"); // toate | necitite | aprobate | respinse
  const [toast, setToast] = useState(null);

  const fetchNotificari = useCallback(async () => {
    try {
      const data = await apiGet("/api/notificari");
      setNotificari(data);
    } catch (err) {
      console.error("Eroare la încărcarea notificărilor:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificari();
  }, [fetchNotificari]);

  const markRead = async (id) => {
    try {
      await apiPut(`/api/notificari/${id}`);
      setNotificari((prev) =>
        prev.map((n) => (n.idNotificare === id ? { ...n, citit: true } : n)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await apiPut("/api/notificari-read-all");
      setNotificari((prev) => prev.map((n) => ({ ...n, citit: true })));
      setToast("Toate notificările marcate ca citite");
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "Acum";
    if (diffMin < 60) return `${diffMin} min`;
    if (diffH < 24) return `${diffH}h`;
    if (diffD < 7) return `${diffD}z`;
    return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  };

  // Stats
  const necitite = notificari.filter((n) => !n.citit).length;
  const aprobate = notificari.filter(
    (n) => n.tip === "estimare_acceptata",
  ).length;
  const respinse = notificari.filter(
    (n) => n.tip === "estimare_respinsa",
  ).length;

  // Filter
  const filtered = notificari.filter((n) => {
    if (filter === "necitite") return !n.citit;
    if (filter === "aprobate") return n.tip === "estimare_acceptata";
    if (filter === "respinse") return n.tip === "estimare_respinsa";
    return true;
  });

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Se încarcă notificările...</div>
      </div>
    );

  return (
    <main
      className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6"
      style={{ paddingTop: "6rem" }}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-[#895af6] text-3xl">
              notifications
            </span>
            Notificări
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Notificări globale — decizii Director & actualizări
          </p>
        </div>
        {necitite > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
          >
            <span className="material-symbols-outlined text-lg">done_all</span>
            Marchează toate ca citite
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total",
            val: notificari.length,
            icon: "notifications",
            color: "text-[#895af6]",
            bg: "bg-[#895af6]/10",
            key: "toate",
          },
          {
            label: "Necitite",
            val: necitite,
            icon: "mark_email_unread",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            key: "necitite",
          },
          {
            label: "Aprobate",
            val: aprobate,
            icon: "check_circle",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            key: "aprobate",
          },
          {
            label: "Respinse",
            val: respinse,
            icon: "cancel",
            color: "text-red-400",
            bg: "bg-red-500/10",
            key: "respinse",
          },
        ].map((k) => (
          <div
            key={k.label}
            onClick={() => setFilter(filter === k.key ? "toate" : k.key)}
            className={`glass-panel rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all ${
              filter === k.key
                ? "ring-2 ring-[#895af6] shadow-lg shadow-[#895af6]/10"
                : "hover:border-white/20"
            }`}
          >
            <div
              className={`${k.bg} size-11 rounded-lg flex items-center justify-center`}
            >
              <span className={`material-symbols-outlined ${k.color}`}>
                {k.icon}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{k.val}</p>
              <p className="text-xs text-slate-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Notificări List ── */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-6xl text-slate-600">
            notifications_off
          </span>
          <p className="text-slate-400 text-lg">Nicio notificare.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const cfg = tipConfig[n.tip] || defaultTip;
            const masina = n.Reparatie?.Masina
              ? `${n.Reparatie.Masina.marca} ${n.Reparatie.Masina.model}`
              : null;

            return (
              <div
                key={n.idNotificare}
                onClick={() => {
                  if (!n.citit) markRead(n.idNotificare);
                  if (n.idReparatie) {
                    navigate("/mecanic/reparatii");
                  }
                }}
                className={`glass-panel rounded-xl p-5 flex items-start gap-4 cursor-pointer transition-all group hover:border-[#895af6]/30 ${
                  !n.citit
                    ? "border-l-4 border-l-[#895af6] bg-[#895af6]/[0.03]"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {/* Icon */}
                <div
                  className={`${cfg.bg} size-11 rounded-lg flex items-center justify-center flex-shrink-0 border ${cfg.border}`}
                >
                  <span className={`material-symbols-outlined ${cfg.color}`}>
                    {cfg.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                    >
                      {cfg.label}
                    </span>
                    {!n.citit && (
                      <span className="size-2 rounded-full bg-[#895af6] animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-sm text-white font-medium leading-relaxed">
                    {n.mesaj}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        person
                      </span>
                      {n.numeExpeditor}
                    </span>
                    {masina && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          directions_car
                        </span>
                        {masina}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                      <span className="material-symbols-outlined text-[14px]">
                        schedule
                      </span>
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Action arrow */}
                <span className="material-symbols-outlined text-slate-600 group-hover:text-[#895af6] transition text-xl mt-2">
                  chevron_right
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl shadow-emerald-500/20 animate-[slideUp_0.3s_ease-out]">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </main>
  );
}

export default NotificariMecanic;
