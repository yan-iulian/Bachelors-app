import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../../config/apiHelper";

const tipFiltre = [
  { label: "Toate", val: "Toate", icon: "notifications" },
  { label: "Test Drive", val: "test_drive", icon: "speed" },
  { label: "Estimări", val: "estimare", icon: "rate_review" },
  { label: "Discount", val: "discount", icon: "sell" },
  { label: "Tranzacții", val: "tranzactie", icon: "payments" },
  { label: "Reparații", val: "reparatie", icon: "build" },
  { label: "Sistem", val: "sistem", icon: "settings" },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Acum";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}z`;
  return new Date(dateStr).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
  });
}

const LS_READ_KEY = "notif_read";
const LS_DEL_KEY = "notif_del";

function loadSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}
function saveSet(key, s) {
  localStorage.setItem(key, JSON.stringify([...s]));
}

function NotificariPanel() {
  const navigate = useNavigate();
  const [notificari, setNotificari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTip, setFilterTip] = useState("Toate");
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [quickFilter, setQuickFilter] = useState(null);

  useEffect(() => {
    const fetchNotificari = async () => {
      try {
        const [testDrives, tranzactii, discount, reparatii, dbNotificari] =
          await Promise.all([
            apiGet("/api/testdrive"),
            apiGet("/api/tranzactii"),
            apiGet("/api/discount"),
            apiGet("/api/reparatii"),
            apiGet("/api/notificari"),
          ]);
        const readSet = loadSet(LS_READ_KEY);
        const delSet = loadSet(LS_DEL_KEY);
        const generated = [];
        let id = 1;
        const tdStatusMap = {
          0: "Solicitare",
          1: "Aprobat",
          2: "Respins",
          3: "Efectuat",
        };
        testDrives.forEach((td) => {
          const client = td.client
            ? `${td.client.nume} ${td.client.prenume}`
            : "—";
          const masina = td.Masina
            ? `${td.Masina.marca} ${td.Masina.model}`
            : "—";
          const sk = `td_${td.id}`;
          if (delSet.has(sk)) return;
          generated.push({
            id: id++,
            stableKey: sk,
            tip: "test_drive",
            titlu:
              td.status === 0
                ? "Cerere nouă Test Drive"
                : td.status === 3
                  ? "Test Drive efectuat"
                  : `Test Drive ${tdStatusMap[td.status]}`,
            mesaj: `${client} — ${masina}`,
            data: td.dataSolicitare || td.dataProgramata,
            citit: td.status !== 0 || readSet.has(sk),
            actiune: "/director/test-drive",
            prioritate: td.status === 0 ? "urgent" : "normal",
            icon:
              td.status === 0
                ? "speed"
                : td.status === 3
                  ? "done_all"
                  : "speed",
            color: td.status === 0 ? "text-amber-400" : "text-blue-400",
            bg: td.status === 0 ? "bg-amber-500/10" : "bg-blue-500/10",
            border:
              td.status === 0 ? "border-amber-500/20" : "border-blue-500/20",
          });
        });
        tranzactii.forEach((t) => {
          const client = t.clientTranzactie
            ? `${t.clientTranzactie.nume} ${t.clientTranzactie.prenume}`
            : "—";
          const masina = t.Masina ? `${t.Masina.marca} ${t.Masina.model}` : "—";
          const sk = `tr_${t.idTranzactie}`;
          if (delSet.has(sk)) return;
          generated.push({
            id: id++,
            stableKey: sk,
            tip: "tranzactie",
            titlu:
              t.status === "Processing"
                ? "Tranzacție de aprobat"
                : t.status === "Sold"
                  ? "Vânzare finalizată"
                  : "Tranzacție anulată",
            mesaj: `${client} — ${masina} — €${(t.suma || 0).toLocaleString()}`,
            data: t.dataTranzactie,
            citit: t.status !== "Processing" || readSet.has(sk),
            actiune: "/director/tranzactii",
            prioritate: t.status === "Processing" ? "urgent" : "normal",
            icon: t.status === "Processing" ? "payments" : "check_circle",
            color:
              t.status === "Processing" ? "text-amber-400" : "text-emerald-400",
            bg:
              t.status === "Processing"
                ? "bg-amber-500/10"
                : "bg-emerald-500/10",
            border:
              t.status === "Processing"
                ? "border-amber-500/20"
                : "border-emerald-500/20",
          });
        });
        discount.forEach((d) => {
          const client = d.clientTranzactie
            ? `${d.clientTranzactie.nume} ${d.clientTranzactie.prenume}`
            : "—";
          const masina = d.Masina ? `${d.Masina.marca} ${d.Masina.model}` : "—";
          const sk = `disc_${d.idTranzactie}`;
          if (delSet.has(sk)) return;
          generated.push({
            id: id++,
            stableKey: sk,
            tip: "discount",
            titlu:
              d.status === "Processing"
                ? "Cerere discount primită"
                : d.status === "Approved"
                  ? "Discount aprobat"
                  : "Discount respins",
            mesaj: `${client} — ${masina} — ${d.discountProcent}%`,
            data: d.dataTranzactie,
            citit: d.status !== "Processing" || readSet.has(sk),
            actiune: "/director/discount",
            prioritate: d.status === "Processing" ? "urgent" : "normal",
            icon: d.status === "Processing" ? "sell" : "thumb_up",
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20",
          });
        });
        const statusRepMap = {
          0: "În Așteptare",
          1: "Aprobat · În Lucru",
          2: "Finalizată",
          3: "Estimare Trimisă",
          4: "Respinsă",
        };
        reparatii.forEach((r) => {
          const masina = r.Masina ? `${r.Masina.marca} ${r.Masina.model}` : "—";
          const mecanic = r.mecanic
            ? `${r.mecanic.nume} ${r.mecanic.prenume}`
            : "—";
          const sk = `rep_${r.idReparatie}`;
          if (delSet.has(sk)) return;
          generated.push({
            id: id++,
            stableKey: sk,
            tip: r.statusReparatie === 3 ? "estimare" : "reparatie",
            titlu:
              r.statusReparatie === 3
                ? "Estimare primită de la mecanic"
                : r.statusReparatie === 0
                  ? "Reparație în așteptare"
                  : r.statusReparatie === 2
                    ? "Reparație finalizată"
                    : r.statusReparatie === 4
                      ? "Estimare respinsă"
                      : "Reparație în lucru (aprobată)",
            mesaj: `${masina} — Mecanic: ${mecanic} — Cost: €${(r.cost || 0).toLocaleString()}`,
            data: r.dataInceput || r.dataFinalizare,
            citit: r.statusReparatie !== 3 || readSet.has(sk),
            actiune:
              r.statusReparatie === 3
                ? "/director/estimari"
                : "/director/reparatii",
            prioritate: r.statusReparatie === 3 ? "urgent" : "normal",
            icon:
              r.statusReparatie === 3
                ? "rate_review"
                : r.statusReparatie === 2
                  ? "verified"
                  : "build",
            color: r.statusReparatie === 3 ? "text-amber-400" : "text-teal-400",
            bg: r.statusReparatie === 3 ? "bg-amber-500/10" : "bg-teal-500/10",
            border:
              r.statusReparatie === 3
                ? "border-amber-500/20"
                : "border-teal-500/20",
          });
        });

        // Notificări reale din BD (trimise de mecanici)
        const tipConfigDb = {
          estimare_trimisa: {
            icon: "rate_review",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            tipFiltru: "estimare",
            titlu: "Estimare primită",
          },
          reparatie_finalizata: {
            icon: "verified",
            color: "text-teal-400",
            bg: "bg-teal-500/10",
            border: "border-teal-500/20",
            tipFiltru: "reparatie",
            titlu: "Reparație finalizată",
          },
          reparatie_inceputa: {
            icon: "play_circle",
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20",
            tipFiltru: "reparatie",
            titlu: "Reparație începută",
          },
          status_schimbat: {
            icon: "swap_horiz",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20",
            tipFiltru: "reparatie",
            titlu: "Status reparație schimbat",
          },
        };
        (dbNotificari || []).forEach((n) => {
          const cfg = tipConfigDb[n.tip] || {
            icon: "notifications",
            color: "text-slate-400",
            bg: "bg-slate-500/10",
            border: "border-slate-500/20",
            tipFiltru: "reparatie",
            titlu: "Notificare",
          };
          const sk = `db_${n.idNotificare}`;
          if (delSet.has(sk)) return;
          generated.push({
            id: id++,
            stableKey: sk,
            dbId: n.idNotificare,
            tip: cfg.tipFiltru,
            titlu: `${cfg.titlu} — ${n.numeExpeditor}`,
            mesaj: n.mesaj,
            data: n.createdAt,
            citit: n.citit || readSet.has(sk),
            actiune:
              n.tip === "reparatie_finalizata"
                ? "/director/masini"
                : "/director/estimari",
            actiuneState:
              n.tip === "reparatie_finalizata"
                ? { filterReparat: true }
                : undefined,
            prioritate: !n.citit ? "urgent" : "normal",
            icon: cfg.icon,
            color: cfg.color,
            bg: cfg.bg,
            border: cfg.border,
          });
        });

        // Notificări de sistem (hardcoded – actualizări aplicație)
        const sistemNotifs = [
          {
            titlu: "Actualizare disponibilă",
            mesaj:
              "Aplicația necesită o actualizare la versiunea 2.4.1. Verificați changelog-ul pentru detalii.",
            data: "2026-03-06T08:00:00",
            citit: false,
            prioritate: "urgent",
          },
          {
            titlu: "Se descarcă actualizarea",
            mesaj:
              "Actualizarea v2.4.1 se descarcă în fundal. Progres: 100%. Nu închideți aplicația.",
            data: "2026-03-06T08:15:00",
            citit: true,
            prioritate: "normal",
          },
          {
            titlu: "Repornire necesară",
            mesaj:
              "Actualizarea a fost descărcată. Aplicația este pregătită pentru repornire. Salvați modificările înainte de restart.",
            data: "2026-03-06T08:30:00",
            citit: true,
            prioritate: "urgent",
          },
          {
            titlu: "Aplicație actualizată cu succes",
            mesaj:
              "Aplicația a fost actualizată la versiunea 2.4.1. Noutăți: performanță îmbunătățită, fix-uri de securitate.",
            data: "2026-03-06T09:00:00",
            citit: true,
            prioritate: "normal",
          },
          {
            titlu: "Actualizare planificată",
            mesaj:
              "O nouă actualizare (v2.5.0) va fi disponibilă pe 15 Martie. Funcționalități noi: rapoarte avansate, notificări email.",
            data: "2026-03-05T10:00:00",
            citit: false,
            prioritate: "normal",
          },
        ];
        sistemNotifs.forEach((s, idx) => {
          const sk = `sys_${idx}`;
          if (delSet.has(sk)) return;
          generated.push({
            id: id++,
            stableKey: sk,
            tip: "sistem",
            titlu: s.titlu,
            mesaj: s.mesaj,
            data: s.data,
            citit: s.citit || readSet.has(sk),
            actiune: null,
            prioritate: s.prioritate,
            icon: "system_update",
            color: "text-slate-400",
            bg: "bg-slate-500/10",
            border: "border-slate-500/20",
          });
        });

        generated.sort((a, b) => new Date(b.data) - new Date(a.data));
        setNotificari(generated);
      } catch (e) {
        console.error("Eroare la notificări:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNotificari();
  }, []);

  const necitite = notificari.filter((n) => !n.citit).length;
  const urgente = notificari.filter(
    (n) => n.prioritate === "urgent" && !n.citit,
  ).length;

  const filtered = notificari.filter((n) => {
    if (filterTip !== "Toate" && n.tip !== filterTip) return false;
    if (showOnlyUnread && n.citit) return false;
    if (quickFilter === "necitite" && n.citit) return false;
    if (quickFilter === "urgente" && !(n.prioritate === "urgent" && !n.citit))
      return false;
    if (quickFilter === "actiuni" && !(!n.citit && n.actiune)) return false;
    return true;
  });

  const selectedNotif =
    selectedId !== null ? notificari.find((n) => n.id === selectedId) : null;

  const markAsRead = (id) => {
    const notif = notificari.find((n) => n.id === id);
    if (!notif) return;
    // Persistă în localStorage
    if (notif.stableKey) {
      const s = loadSet(LS_READ_KEY);
      s.add(notif.stableKey);
      saveSet(LS_READ_KEY, s);
    }
    // Dacă are dbId, marchează și în baza de date
    if (notif.dbId) {
      apiPut(`/api/notificari/${notif.dbId}`).catch(() => {});
    }
    setNotificari((prev) =>
      prev.map((n) => (n.id === id ? { ...n, citit: true } : n)),
    );
  };

  const markAllAsRead = () => {
    // Persistă toate în localStorage
    const s = loadSet(LS_READ_KEY);
    notificari.forEach((n) => {
      if (n.stableKey) s.add(n.stableKey);
    });
    saveSet(LS_READ_KEY, s);
    // Marchează și notificările DB
    apiPut("/api/notificari-read-all").catch(() => {});
    setNotificari((prev) => prev.map((n) => ({ ...n, citit: true })));
    setToast("Toate notificările marcate ca citite");
    setTimeout(() => setToast(null), 3000);
  };

  const deleteNotif = (id) => {
    const notif = notificari.find((n) => n.id === id);
    // Persistă ștergerea în localStorage
    if (notif?.stableKey) {
      const s = loadSet(LS_DEL_KEY);
      s.add(notif.stableKey);
      saveSet(LS_DEL_KEY, s);
    }
    setNotificari((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
    setToast("Notificare ștearsă");
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelect = (id) => {
    setSelectedId(id);
    markAsRead(id);
  };

  // Group by day
  const grouped = {};
  filtered.forEach((n) => {
    const d = new Date(n.data);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let dayLabel;
    if (d.toDateString() === today.toDateString()) dayLabel = "Astăzi";
    else if (d.toDateString() === yesterday.toDateString()) dayLabel = "Ieri";
    else
      dayLabel = d.toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    if (!grouped[dayLabel]) grouped[dayLabel] = [];
    grouped[dayLabel].push(n);
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-[#895af6] text-3xl">
              notifications
            </span>
            Centru Notificări
            {necitite > 0 && (
              <span className="bg-[#895af6] text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
                {necitite} noi
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Toate alertele, cererile și actualizările din sistem
          </p>
        </div>
        <div className="flex items-center gap-3">
          {urgente > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-xl">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">
                pending_actions
              </span>
              <span className="text-sm font-bold text-amber-400">
                {urgente} necesită acțiune
              </span>
            </div>
          )}
          <button
            onClick={markAllAsRead}
            disabled={necitite === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">
              done_all
            </span>
            Marchează toate citite
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total",
            val: notificari.length,
            icon: "notifications",
            color: "text-[#895af6]",
            bg: "bg-[#895af6]/10",
            filterKey: null,
            ringHex: "#895af6",
          },
          {
            label: "Necitite",
            val: necitite,
            icon: "mark_email_unread",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            filterKey: "necitite",
            ringHex: "#fbbf24",
          },
          {
            label: "Urgente",
            val: urgente,
            icon: "priority_high",
            color: "text-red-400",
            bg: "bg-red-500/10",
            filterKey: "urgente",
            ringHex: "#f87171",
          },
          {
            label: "Acțiuni necesare",
            val: notificari.filter((n) => !n.citit && n.actiune).length,
            icon: "pending_actions",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            filterKey: "actiuni",
            ringHex: "#34d399",
          },
        ].map((k) => (
          <div
            key={k.label}
            onClick={() =>
              setQuickFilter(quickFilter === k.filterKey ? null : k.filterKey)
            }
            className={`glass-panel rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:ring-2 hover:ring-white/20 ${quickFilter === k.filterKey && k.filterKey !== null ? "ring-2 bg-white/5" : ""}`}
            style={
              quickFilter === k.filterKey && k.filterKey !== null
                ? { "--tw-ring-color": k.ringHex }
                : {}
            }
          >
            <div
              className={
                k.bg + " size-11 rounded-lg flex items-center justify-center"
              }
            >
              <span className={"material-symbols-outlined " + k.color}>
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

      {/* Filters */}
      <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex gap-1 bg-[#0d0a17]/50 p-1 rounded-lg flex-wrap">
          {tipFiltre.map((f) => (
            <button
              key={f.val}
              onClick={() => setFilterTip(f.val)}
              className={
                "flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-md transition " +
                (filterTip === f.val
                  ? "bg-[#895af6] text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5")
              }
            >
              <span className="material-symbols-outlined text-[14px]">
                {f.icon}
              </span>
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showOnlyUnread}
            onChange={(e) => setShowOnlyUnread(e.target.checked)}
            className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#895af6] focus:ring-[#895af6]/50"
          />
          <span className="text-sm text-slate-400">Doar necitite</span>
        </label>
      </div>

      {/* Main Content: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Notifications List */}
        <div
          className="lg:col-span-5 space-y-4 lg:max-h-[calc(100vh-22rem)] lg:overflow-y-auto lg:pr-2"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#895af6 transparent",
          }}
        >
          {filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center gap-4">
              <span className="material-symbols-outlined text-6xl text-slate-600">
                notifications_off
              </span>
              <p className="text-slate-400 text-lg">Nicio notificare găsită</p>
            </div>
          ) : (
            Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {day}
                </h3>
                <div className="space-y-2">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleSelect(n.id)}
                      className={
                        "glass-panel rounded-xl p-4 cursor-pointer transition-all hover:border-[#895af6]/30 group relative " +
                        (selectedId === n.id
                          ? "ring-2 ring-[#895af6]/50 border-[#895af6]/30"
                          : "") +
                        (!n.citit ? " border-l-4 " + n.border : "")
                      }
                    >
                      {/* Urgency badge */}
                      {n.prioritate === "urgent" && !n.citit && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-[#151022] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          ACȚIUNE
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div
                          className={
                            n.bg +
                            " size-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          }
                        >
                          <span
                            className={
                              "material-symbols-outlined text-[18px] " + n.color
                            }
                          >
                            {n.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className={
                                "text-sm font-bold truncate " +
                                (!n.citit ? "text-white" : "text-slate-300")
                              }
                            >
                              {n.titlu}
                            </h4>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              {timeAgo(n.data)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {n.mesaj}
                          </p>
                        </div>
                        {!n.citit && (
                          <div className="size-2.5 rounded-full bg-[#895af6] shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div
          className="lg:col-span-7 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-22rem)] lg:overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#895af6 transparent",
          }}
        >
          {!selectedNotif ? (
            <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center gap-4 h-full min-h-[400px]">
              <div className="size-20 bg-[#895af6]/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-[#895af6]/40">
                  mail
                </span>
              </div>
              <p className="text-slate-400 text-lg">
                Selectează o notificare pentru detalii
              </p>
              <p className="text-slate-500 text-sm">
                Apasă pe orice notificare din lista din stânga
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden">
              {/* Detail Header */}
              <div
                className={"p-6 border-b border-white/10 " + selectedNotif.bg}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={
                        selectedNotif.bg +
                        " size-14 rounded-xl flex items-center justify-center border " +
                        selectedNotif.border
                      }
                    >
                      <span
                        className={
                          "material-symbols-outlined text-2xl " +
                          selectedNotif.color
                        }
                      >
                        {selectedNotif.icon}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {selectedNotif.titlu}
                      </h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span
                          className={
                            "text-xs font-bold px-2.5 py-1 rounded-full " +
                            selectedNotif.bg +
                            " " +
                            selectedNotif.color +
                            " border " +
                            selectedNotif.border
                          }
                        >
                          {tipFiltre.find((f) => f.val === selectedNotif.tip)
                            ?.label || selectedNotif.tip}
                        </span>
                        {selectedNotif.prioritate === "urgent" && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Acțiune necesară
                          </span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            schedule
                          </span>
                          {new Date(selectedNotif.data).toLocaleString(
                            "ro-RO",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <span className="material-symbols-outlined text-slate-400 hover:text-white">
                      close
                    </span>
                  </button>
                </div>
              </div>

              {/* Detail Body */}
              <div className="p-6 space-y-5">
                {/* Message */}
                <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      mail
                    </span>
                    Mesaj Complet
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedNotif.mesaj}
                  </p>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Tip",
                      val:
                        tipFiltre.find((f) => f.val === selectedNotif.tip)
                          ?.label || selectedNotif.tip,
                      icon: "category",
                    },
                    {
                      label: "Prioritate",
                      val:
                        selectedNotif.prioritate === "urgent"
                          ? "Acțiune necesară"
                          : "Informativă",
                      icon: "priority_high",
                    },
                    {
                      label: "Status",
                      val: selectedNotif.citit ? "Citită" : "Necitită",
                      icon: selectedNotif.citit
                        ? "drafts"
                        : "mark_email_unread",
                    },
                    {
                      label: "Data & Ora",
                      val: new Date(selectedNotif.data).toLocaleString(
                        "ro-RO",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      ),
                      icon: "calendar_today",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-white/[0.03] rounded-lg p-3 border border-white/5"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[14px] text-slate-500">
                          {item.icon}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {item.val}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Timeline Context */}
                <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      timeline
                    </span>
                    Context Eveniment
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-[#895af6]"></div>
                      <span className="text-xs text-slate-400">
                        Notificare generată automat de sistem
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-emerald-400"></div>
                      <span className="text-xs text-slate-400">
                        Deschisă și citită la{" "}
                        {new Date().toLocaleTimeString("ro-RO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {selectedNotif.actiune && (
                      <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-amber-400"></div>
                        <span className="text-xs text-slate-400">
                          Acțiune disponibilă — vezi pagina asociată
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <button
                    onClick={() => deleteNotif(selectedNotif.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm font-medium transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                    Șterge
                  </button>
                  <div className="flex gap-3">
                    {!selectedNotif.citit && (
                      <button
                        onClick={() => markAsRead(selectedNotif.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          drafts
                        </span>
                        Marchează citită
                      </button>
                    )}
                    {selectedNotif.actiune && (
                      <button
                        onClick={() =>
                          navigate(
                            selectedNotif.actiune,
                            selectedNotif.actiuneState
                              ? { state: selectedNotif.actiuneState }
                              : undefined,
                          )
                        }
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          open_in_new
                        </span>
                        Deschide Pagina
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

export default NotificariPanel;
