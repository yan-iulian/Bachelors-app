import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiGet, apiPut, apiPost } from "../../config/apiHelper";
import API_URL from "../../config/api";

/* ------------------------------------------------------------------ */
/*  DB statusReparatie:                                                */
/*  0=Așteptare, 1=Aprobat/În Lucru, 2=Finalizat,                     */
/*  3=Estimare Trimisă, 4=Estimare Respinsă                            */
/* ------------------------------------------------------------------ */
const combustibilMap = {
  0: "Benzină",
  1: "Diesel",
  2: "Hibrid",
  3: "Electric",
};
const categorieMap = {
  0: "Sedan",
  1: "SUV",
  2: "Coupe",
  3: "Hatchback",
  4: "Cabrio",
  5: "Break",
};

const statusMap = {
  0: "Așteptare",
  1: "Aprobat · În Lucru",
  2: "Finalizat",
  3: "Estimare Trimisă",
  4: "Respins",
};
const statusStyle = {
  0: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    icon: "inbox",
  },
  1: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    icon: "engineering",
  },
  2: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
    icon: "verified",
  },
  3: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    icon: "send",
  },
  4: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    icon: "cancel",
  },
};
function ReparatiiMecanic() {
  const location = useLocation();
  const [reparatii, setReparatii] = useState([]);
  const [activeTab, setActiveTab] = useState("estimare");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === Estimate creation state ===
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estimateRepId, setEstimateRepId] = useState(null);
  const [estimatePiese, setEstimatePiese] = useState([]);
  const [newPiesa, setNewPiesa] = useState({ nume: "", cantitate: 1, pret: 0 });
  const [dbPiese, setDbPiese] = useState([]);

  // Fetch reparații din API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, pieseData] = await Promise.all([
          apiGet("/api/reparatii"),
          apiGet("/api/piese"),
        ]);
        setDbPiese(pieseData);
        const mapped = data.map((r) => ({
          idReparatie: r.idReparatie,
          masina: r.Masina
            ? {
                marca: r.Masina.marca || "N/A",
                model: r.Masina.model || "",
                anFabricatie: r.Masina.anFabricatie || "",
                km: r.Masina.km || 0,
                combustibil: combustibilMap[r.Masina.combustibil] || "N/A",
                categorieAuto: categorieMap[r.Masina.categorieAuto] || "N/A",
                pretEuro: r.Masina.pretEuro || 0,
                locParcare: r.Masina.locParcare || "N/A",
              }
            : {
                marca: "N/A",
                model: "",
                anFabricatie: "",
                km: 0,
                combustibil: "",
                categorieAuto: "",
                pretEuro: 0,
                locParcare: "N/A",
              },
          statusReparatie: r.statusReparatie,
          descriereProblema: r.descriereProblema || "",
          dataInceput: r.dataInceput
            ? new Date(r.dataInceput).toISOString().split("T")[0]
            : "",
          cost: r.cost || 0,
          mecanic: r.mecanic ? `${r.mecanic.prenume} ${r.mecanic.nume}` : "N/A",
          imagine: r.Masina?.imaginePrincipala
            ? `${API_URL}${r.Masina.imaginePrincipala}`
            : r.imaginiReparatie && JSON.parse(r.imaginiReparatie).length > 0
              ? `${API_URL}${JSON.parse(r.imaginiReparatie)[0]}`
              : "https://placehold.co/600x350/2e2249/895af6?text=Auto",
          piese: (r.Piesas || []).map((p) => ({
            idPiesa: p.idPiesa,
            denumire: p.denumire,
            categorie: p.categorie,
            stoc: p.stoc,
            pret: p.pret,
          })),
          pieseEstimate: (r.Piesas || []).map((p) => ({
            nume: p.denumire,
            cantitate: 1,
            pret: p.pret,
          })),
          costEstimatMecanic: r.cost || 0,
          imaginiReparatie: r.imaginiReparatie
            ? JSON.parse(r.imaginiReparatie)
            : [],
        }));
        setReparatii(mapped);
      } catch (err) {
        setError("Eroare la încărcarea reparațiilor.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-open estimate modal dacă vine din workspace cu state.openEstimate
  useEffect(() => {
    if (location.state?.openEstimate && reparatii.length > 0) {
      const repId = location.state.openEstimate;
      const rep = reparatii.find((r) => r.idReparatie === repId);
      if (rep && rep.statusReparatie === 0) {
        openEstimateModal(repId);
        // Clear the state so it doesn't re-trigger
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, reparatii]);

  // Tab -> status mapping
  const tabStatuses = {
    estimare: [0, 3],
    reparat: [1],
    finalizate: [2],
    respinse: [4],
  };

  // Filtrare
  const filtered = reparatii.filter((r) => {
    const allowed = tabStatuses[activeTab] || [0, 1, 2, 3, 4];
    if (!allowed.includes(r.statusReparatie)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.masina.marca + " " + r.masina.model).toLowerCase().includes(q) ||
        r.descriereProblema.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const detailRep =
    detailId !== null
      ? reparatii.find((r) => r.idReparatie === detailId)
      : null;

  // Stats
  const stats = {
    total: reparatii.length,
    asteptare: reparatii.filter((r) => r.statusReparatie === 0).length,
    respinse: reparatii.filter((r) => r.statusReparatie === 4).length,
    estimareTrimisa: reparatii.filter((r) => r.statusReparatie === 3).length,
    inLucru: reparatii.filter((r) => r.statusReparatie === 1).length,
    finalizate: reparatii.filter((r) => r.statusReparatie === 2).length,
  };

  const tabs = [
    {
      key: "estimare",
      label: "Estimare",
      icon: "calculate",
      statuses: [0, 3],
      color: "amber",
    },
    {
      key: "reparat",
      label: "De Reparat",
      icon: "build",
      statuses: [1],
      color: "blue",
    },
    {
      key: "finalizate",
      label: "Finalizate",
      icon: "verified",
      statuses: [2],
      color: "teal",
    },
    {
      key: "respinse",
      label: "Respinse",
      icon: "block",
      statuses: [4],
      color: "red",
    },
  ];

  // === Estimate handlers ===
  const openEstimateModal = (repId) => {
    const rep = reparatii.find((r) => r.idReparatie === repId);
    setEstimateRepId(repId);
    setEstimatePiese(rep?.pieseEstimate?.length ? [...rep.pieseEstimate] : []);
    setNewPiesa({ nume: "", cantitate: 1, pret: 0 });
    setShowEstimateModal(true);
  };

  const addPiesa = () => {
    if (!newPiesa.nume.trim() || newPiesa.pret <= 0) return;
    const match = dbPiese.find(
      (p) => p.denumire.toLowerCase() === newPiesa.nume.trim().toLowerCase(),
    );
    setEstimatePiese((prev) => [
      ...prev,
      { ...newPiesa, idPiesa: match?.idPiesa || null },
    ]);
    setNewPiesa({ nume: "", cantitate: 1, pret: 0 });
  };

  const removePiesa = (idx) => {
    setEstimatePiese((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalEstimat = estimatePiese.reduce(
    (s, p) => s + p.pret * p.cantitate,
    0,
  );

  const submitEstimate = async () => {
    if (estimatePiese.length === 0) return;
    try {
      // Salvează cost + schimbă status la 3 (Estimare Trimisă)
      await apiPut(`/api/reparatii/${estimateRepId}`, {
        cost: totalEstimat,
        statusReparatie: 3,
      });
      // Link piese to reparatie in DB
      for (const p of estimatePiese) {
        if (p.idPiesa) {
          try {
            await apiPost(`/api/reparatii/${estimateRepId}/piese`, {
              idPiesa: p.idPiesa,
            });
          } catch (e) {
            console.error("Eroare la linkare piesa:", e);
          }
        }
      }
      // Creează notificare pentru Director
      const rep = reparatii.find((r) => r.idReparatie === estimateRepId);
      await apiPost("/api/notificari", {
        tip: "estimare_trimisa",
        mesaj: `Estimare de ${totalEstimat.toLocaleString()} € trimisă pentru ${rep?.masina?.marca} ${rep?.masina?.model}`,
        idReparatie: estimateRepId,
        destinatarRol: "Director",
      });
    } catch (err) {
      console.error(err);
    }
    setReparatii((prev) =>
      prev.map((r) =>
        r.idReparatie === estimateRepId
          ? {
              ...r,
              pieseEstimate: [...estimatePiese],
              costEstimatMecanic: totalEstimat,
              cost: totalEstimat,
              statusReparatie: 3,
            }
          : r,
      ),
    );
    setToast("Estimare trimisă către Director!");
    setTimeout(() => setToast(null), 3000);
    setShowEstimateModal(false);
    setDetailId(null);
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#151022] pt-20 flex items-center justify-center">
        <span className="material-symbols-outlined text-[#895af6] text-5xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-[#151022] pt-20 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );

  return (
    <main
      className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6"
      style={{ paddingTop: "6rem" }}
    >
      {/* -- Header -- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-[#895af6] text-3xl">
              work_history
            </span>
            Activitate
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Masini trimise de Director pentru evaluare si reparatie
          </p>
        </div>
        {stats.total > 0 && (
          <div className="flex items-center gap-2 bg-[#895af6]/15 border border-[#895af6]/30 px-4 py-2 rounded-xl">
            <span className="material-symbols-outlined text-[#895af6]">
              build
            </span>
            <span className="text-sm font-bold text-[#895af6]">
              {stats.total} reparații
            </span>
          </div>
        )}
      </div>

      {/* -- Tabs -- */}
      <div className="glass-panel rounded-2xl p-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {tabs
            .filter((t) => t.key === "estimare" || t.key === "reparat")
            .map((t) => {
              const count = reparatii.filter((r) =>
                t.statuses.includes(r.statusReparatie),
              ).length;
              const isActive = activeTab === t.key;
              const colorMap = {
                amber: {
                  activeBg: "bg-amber-500/20",
                  activeBorder: "border-amber-400/40",
                  activeText: "text-amber-400",
                  badge: "bg-amber-500/30 text-amber-300",
                },
                blue: {
                  activeBg: "bg-blue-500/20",
                  activeBorder: "border-blue-400/40",
                  activeText: "text-blue-400",
                  badge: "bg-blue-500/30 text-blue-300",
                },
                teal: {
                  activeBg: "bg-teal-500/20",
                  activeBorder: "border-teal-400/40",
                  activeText: "text-teal-400",
                  badge: "bg-teal-500/30 text-teal-300",
                },
                red: {
                  activeBg: "bg-red-500/20",
                  activeBorder: "border-red-400/40",
                  activeText: "text-red-400",
                  badge: "bg-red-500/30 text-red-300",
                },
              };
              const c = colorMap[t.color];
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={
                    "flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all " +
                    (isActive
                      ? c.activeBg +
                        " " +
                        c.activeText +
                        " border " +
                        c.activeBorder +
                        " shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent")
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {t.icon}
                  </span>
                  {t.label}
                  <span
                    className={
                      "text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center " +
                      (isActive ? c.badge : "bg-white/5 text-slate-500")
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs
            .filter((t) => t.key === "finalizate" || t.key === "respinse")
            .map((t) => {
              const count = reparatii.filter((r) =>
                t.statuses.includes(r.statusReparatie),
              ).length;
              const isActive = activeTab === t.key;
              const colorMap = {
                amber: {
                  activeBg: "bg-amber-500/20",
                  activeBorder: "border-amber-400/40",
                  activeText: "text-amber-400",
                  badge: "bg-amber-500/30 text-amber-300",
                },
                blue: {
                  activeBg: "bg-blue-500/20",
                  activeBorder: "border-blue-400/40",
                  activeText: "text-blue-400",
                  badge: "bg-blue-500/30 text-blue-300",
                },
                teal: {
                  activeBg: "bg-teal-500/20",
                  activeBorder: "border-teal-400/40",
                  activeText: "text-teal-400",
                  badge: "bg-teal-500/30 text-teal-300",
                },
                red: {
                  activeBg: "bg-red-500/20",
                  activeBorder: "border-red-400/40",
                  activeText: "text-red-400",
                  badge: "bg-red-500/30 text-red-300",
                },
              };
              const c = colorMap[t.color];
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={
                    "flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all " +
                    (isActive
                      ? c.activeBg +
                        " " +
                        c.activeText +
                        " border " +
                        c.activeBorder +
                        " shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent")
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {t.icon}
                  </span>
                  {t.label}
                  <span
                    className={
                      "text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center " +
                      (isActive ? c.badge : "bg-white/5 text-slate-500")
                    }
                  >
                    {count}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* -- Search -- */}
      <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[18px]">
              search
            </span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută marcă, model sau problemă..."
            className="w-full p-2.5 pl-10 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-500 outline-none transition"
          />
        </div>
      </div>

      {/* -- Cards Grid -- */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-6xl text-slate-600">
            search_off
          </span>
          <p className="text-slate-400 text-lg">Nicio reparatie gasita.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const st = statusStyle[r.statusReparatie] || statusStyle[0];
            const isFinalizat = r.statusReparatie === 2;
            return (
              <div
                key={r.idReparatie}
                onClick={() => setDetailId(r.idReparatie)}
                className={
                  "glass-panel rounded-2xl overflow-hidden cursor-pointer group transition-all hover:border-[#895af6]/30 hover:shadow-lg hover:shadow-[#895af6]/5 relative" +
                  (isFinalizat ? " opacity-60 grayscale-[40%]" : "")
                }
              >
                <div className="relative h-44 bg-[#1a1333] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151022] via-transparent to-transparent z-10"></div>
                  <div
                    className="w-full h-full bg-center bg-cover transition-transform group-hover:scale-105"
                    style={{ backgroundImage: "url('" + r.imagine + "')" }}
                  ></div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#895af6] transition">
                        {r.masina.marca} {r.masina.model}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {r.masina.anFabricatie} &middot;{" "}
                        {r.masina.km?.toLocaleString()} km
                      </p>
                    </div>
                    <span
                      className={
                        "inline-flex items-center gap-1 " +
                        st.bg +
                        " " +
                        st.text +
                        " border " +
                        st.border +
                        " text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
                      }
                    >
                      <span className="material-symbols-outlined text-[12px]">
                        {st.icon}
                      </span>
                      {statusMap[r.statusReparatie]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                    {r.descriereProblema}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        assignment_ind
                      </span>
                      {r.mecanic}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        calendar_today
                      </span>
                      {r.dataInceput}
                    </span>
                    <span className="flex items-center gap-1 ml-auto font-mono text-slate-300">
                      <span className="material-symbols-outlined text-[14px]">
                        sell
                      </span>
                      Preț: {r.masina.pretEuro?.toLocaleString()} &euro;
                    </span>
                  </div>
                  {/* Piese tags */}
                  {r.piese && r.piese.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.piese.map((p, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-white/5 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full"
                        >
                          {p.denumire}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Action hint for Așteptare status */}
                  {r.statusReparatie === 0 && (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                      <span className="material-symbols-outlined text-amber-400 text-[16px]">
                        edit_note
                      </span>
                      <span className="text-xs text-amber-400 font-medium">
                        Necesită estimare cost
                      </span>
                    </div>
                  )}
                  {/* Estimare trimisă — așteptare decizie */}
                  {r.statusReparatie === 3 && (
                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-lg">
                      <span className="material-symbols-outlined text-purple-400 text-[16px]">
                        hourglass_top
                      </span>
                      <span className="text-xs text-purple-400 font-medium">
                        Estimare trimisă — așteptare decizie Director
                      </span>
                    </div>
                  )}
                  {/* Estimare respinsă — mașina închisă */}
                  {r.statusReparatie === 4 && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                      <span className="material-symbols-outlined text-red-400 text-[16px]">
                        block
                      </span>
                      <span className="text-xs text-red-400 font-medium">
                        Estimare respinsă — mașina nu mai este în sarcina ta
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === Detail Modal === */}
      {detailRep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailId(null)}
          ></div>
          <div className="relative glass-panel rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-white/10 shadow-2xl">
            {/* Header image */}
            <div className="relative h-52">
              <div className="absolute inset-0 bg-gradient-to-t from-[#151022] via-[#151022]/40 to-transparent z-10"></div>
              <div
                className="w-full h-full bg-center bg-cover"
                style={{ backgroundImage: "url('" + detailRep.imagine + "')" }}
              ></div>
              <button
                onClick={() => setDetailId(null)}
                className="absolute top-4 right-4 z-20 size-9 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition"
              >
                <span className="material-symbols-outlined text-white">
                  close
                </span>
              </button>
              <div className="absolute bottom-4 left-6 z-20">
                <h2 className="text-2xl font-bold text-white">
                  {detailRep.masina.marca} {detailRep.masina.model}
                </h2>
                <p className="text-sm text-slate-300">
                  {detailRep.masina.anFabricatie} &middot;{" "}
                  {detailRep.masina.km?.toLocaleString()} km
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Status row */}
              <div className="flex flex-wrap gap-3">
                {(() => {
                  const st =
                    statusStyle[detailRep.statusReparatie] || statusStyle[0];
                  return (
                    <span
                      className={
                        "inline-flex items-center gap-1.5 " +
                        st.bg +
                        " " +
                        st.text +
                        " border " +
                        st.border +
                        " text-xs font-bold px-3 py-1.5 rounded-full"
                      }
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {st.icon}
                      </span>
                      {statusMap[detailRep.statusReparatie]}
                    </span>
                  );
                })()}
                <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-300 border border-white/10 text-xs font-bold px-3 py-1.5 rounded-full font-mono">
                  <span className="material-symbols-outlined text-[14px]">
                    sell
                  </span>
                  Preț: {detailRep.masina.pretEuro?.toLocaleString()} &euro;
                </span>
              </div>

              {/* Loc Parcare — vizibil */}
              <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="size-12 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-400 text-2xl">
                    local_parking
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-400/70 uppercase tracking-widest font-bold">
                    Loc Parcare
                  </span>
                  <p className="text-2xl font-black text-white tracking-wide">
                    {detailRep.masina.locParcare}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Marca / Model",
                    val: detailRep.masina.marca + " " + detailRep.masina.model,
                    icon: "directions_car",
                  },
                  {
                    label: "An Fabricație",
                    val: detailRep.masina.anFabricatie,
                    icon: "calendar_month",
                  },
                  {
                    label: "Kilometraj",
                    val: (detailRep.masina.km || 0).toLocaleString() + " km",
                    icon: "speed",
                  },
                  {
                    label: "Combustibil",
                    val: detailRep.masina.combustibil,
                    icon: "local_gas_station",
                  },
                  {
                    label: "Caroserie",
                    val: detailRep.masina.categorieAuto,
                    icon: "garage",
                  },
                  {
                    label: "Mecanic",
                    val: detailRep.mecanic,
                    icon: "assignment_ind",
                  },
                  {
                    label: "Data Început",
                    val: detailRep.dataInceput,
                    icon: "event",
                  },
                  {
                    label: "Preț Achiziție",
                    val: detailRep.cost + " €",
                    icon: "payments",
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

              {/* Problema */}
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">
                    report_problem
                  </span>{" "}
                  Descriere Problema
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {detailRep.descriereProblema}
                </p>
              </div>

              {/* Poze Reparatie */}
              {detailRep.imaginiReparatie &&
                detailRep.imaginiReparatie.length > 0 && (
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">
                        photo_library
                      </span>{" "}
                      Poze Mașină
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detailRep.imaginiReparatie.map((src, i) => (
                        <a
                          key={i}
                          href={`${API_URL}${src}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg border border-white/10 hover:border-[#895af6]/40 transition group/img"
                        >
                          <img
                            src={`${API_URL}${src}`}
                            alt={`Poza reparație ${i + 1}`}
                            className="w-full h-32 object-cover group-hover/img:scale-105 transition-transform"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              {/* Piese (daca exista) */}
              {detailRep.piese && detailRep.piese.length > 0 && (
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      inventory_2
                    </span>{" "}
                    Piese Asociate
                  </h4>
                  <div className="space-y-2">
                    {detailRep.piese.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2 border border-white/5"
                      >
                        <span className="text-sm text-white">{p.denumire}</span>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Stoc: {p.stoc}</span>
                          <span className="font-mono text-slate-300">
                            €{p.pret?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t border-white/5">
                      <span className="text-sm font-bold text-white font-mono">
                        Total: €
                        {detailRep.piese
                          .reduce((s, p) => s + (p.pret || 0), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div>
                  {detailRep.cost > 0 && (
                    <>
                      <span className="text-xs text-slate-500">
                        Preț Achiziție
                      </span>
                      <p className="text-2xl font-bold text-white font-mono">
                        €{detailRep.cost.toLocaleString()}
                      </p>
                    </>
                  )}
                  {detailRep.statusReparatie === 0 && (
                    <p className="text-sm text-amber-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">
                        warning
                      </span>
                      Necesită estimare cost!
                    </p>
                  )}
                  {detailRep.statusReparatie === 4 && (
                    <p className="text-sm text-red-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">
                        block
                      </span>
                      Estimare respinsă — mașina nu mai este în sarcina ta
                    </p>
                  )}
                  {detailRep.statusReparatie === 3 && (
                    <p className="text-sm text-purple-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">
                        hourglass_top
                      </span>
                      Estimare trimisă — așteptare decizie
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {/* Așteptare -> Creează Estimare */}
                  {detailRep.statusReparatie === 0 && (
                    <button
                      onClick={() => openEstimateModal(detailRep.idReparatie)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform"
                    >
                      <span className="material-symbols-outlined">
                        calculate
                      </span>
                      Creează Estimare
                    </button>
                  )}
                  {/* Respins — fără acțiuni */}
                  {detailRep.statusReparatie === 4 && (
                    <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
                      <span className="material-symbols-outlined text-[18px]">
                        block
                      </span>
                      Închis — fără acțiuni disponibile
                    </div>
                  )}
                  {/* Estimare trimisă — așteptare */}
                  {detailRep.statusReparatie === 3 && (
                    <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold">
                      <span className="material-symbols-outlined text-[18px]">
                        hourglass_top
                      </span>
                      Așteptare decizie Director
                    </div>
                  )}
                  {/* În Lucru (Aprobat) -> Deschide Workspace */}
                  {detailRep.statusReparatie === 1 && (
                    <Link
                      to="/mecanic"
                      state={{ repId: detailRep.idReparatie }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform"
                    >
                      <span className="material-symbols-outlined">build</span>
                      Deschide Workspace
                    </Link>
                  )}
                  {/* Finalizat */}
                  {detailRep.statusReparatie === 2 && (
                    <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-bold">
                      <span className="material-symbols-outlined text-[18px]">
                        verified
                      </span>
                      Finalizat
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Estimate Creation Modal === */}
      {showEstimateModal &&
        (() => {
          const rep = reparatii.find((r) => r.idReparatie === estimateRepId);
          if (!rep) return null;
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowEstimateModal(false)}
              ></div>
              <div className="relative glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-[#895af6]/20 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#895af6]">
                        calculate
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Estimare Cost Reparatie
                      </h2>
                      <p className="text-xs text-slate-400">
                        {rep.masina.marca} {rep.masina.model} &middot;{" "}
                        {rep.masina.anFabricatie}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEstimateModal(false)}
                    className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
                  >
                    <span className="material-symbols-outlined text-slate-400 hover:text-white">
                      close
                    </span>
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* Problema */}
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Problema Raportata
                    </h4>
                    <p className="text-sm text-slate-300">
                      {rep.descriereProblema}
                    </p>
                  </div>

                  {/* Info: Pret achizitie */}
                  <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <span className="material-symbols-outlined text-slate-400">
                      sell
                    </span>
                    <div>
                      <span className="text-xs text-slate-500">
                        Pret Masina
                      </span>
                      <p className="text-lg font-bold text-white font-mono">
                        {rep.masina.pretEuro?.toLocaleString()} &euro;
                      </p>
                    </div>
                  </div>

                  {/* Add piese */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">
                        add_circle
                      </span>{" "}
                      Adauga Piese / Lucrari Necesare
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        list="estimate-piese-list"
                        value={newPiesa.nume}
                        onChange={(e) => {
                          const val = e.target.value;
                          const match = dbPiese.find(
                            (p) =>
                              p.denumire.toLowerCase() ===
                              val.toLowerCase().trim(),
                          );
                          setNewPiesa((p) => ({
                            ...p,
                            nume: val,
                            pret: match ? match.pret : p.pret,
                          }));
                        }}
                        placeholder="Denumire piesa / lucrare..."
                        className="flex-1 p-2.5 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition"
                      />
                      <datalist id="estimate-piese-list">
                        {dbPiese.map((p) => (
                          <option key={p.idPiesa} value={p.denumire} />
                        ))}
                      </datalist>
                      <input
                        type="number"
                        value={newPiesa.cantitate}
                        onChange={(e) =>
                          setNewPiesa((p) => ({
                            ...p,
                            cantitate: Math.max(1, Number(e.target.value)),
                          }))
                        }
                        min={1}
                        className="w-16 p-2.5 text-sm text-white bg-white/5 border border-white/10 rounded-xl text-center outline-none transition"
                        placeholder="Cant."
                      />
                      <input
                        type="number"
                        value={newPiesa.pret || ""}
                        onChange={(e) =>
                          setNewPiesa((p) => ({
                            ...p,
                            pret: Number(e.target.value),
                          }))
                        }
                        min={0}
                        className="w-24 p-2.5 text-sm text-white bg-white/5 border border-white/10 rounded-xl text-center outline-none transition"
                        placeholder="Pret"
                      />
                      <button
                        onClick={addPiesa}
                        disabled={!newPiesa.nume.trim() || newPiesa.pret <= 0}
                        className="px-4 py-2.5 rounded-xl bg-[#895af6] text-white font-bold text-sm hover:bg-[#7a4ae0] transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          add
                        </span>
                      </button>
                    </div>

                    {/* Lista piese */}
                    {estimatePiese.length > 0 && (
                      <div className="space-y-2">
                        {estimatePiese.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between bg-white/[0.03] rounded-lg px-4 py-3 border border-white/5 group/piesa"
                          >
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[#895af6] text-[16px]">
                                settings
                              </span>
                              <span className="text-sm text-white font-medium">
                                {p.nume}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-slate-400">
                                x{p.cantitate}
                              </span>
                              <span className="text-xs text-slate-400">
                                {p.pret} €/buc
                              </span>
                              <span className="text-sm font-bold text-white font-mono">
                                {(p.pret * p.cantitate).toLocaleString()} €
                              </span>
                              <button
                                onClick={() => removePiesa(i)}
                                className="size-7 rounded-full hover:bg-red-500/20 flex items-center justify-center transition opacity-0 group-hover/piesa:opacity-100"
                              >
                                <span className="material-symbols-outlined text-red-400 text-[16px]">
                                  close
                                </span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {estimatePiese.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2 block">
                          playlist_add
                        </span>
                        <p className="text-sm">
                          Adauga piesele necesare pentru estimare
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="bg-[#895af6]/10 rounded-xl p-5 border border-[#895af6]/20 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#895af6]/70 uppercase tracking-wider">
                        Total Cost Estimat
                      </span>
                      <p className="text-3xl font-bold text-white font-mono">
                        {totalEstimat.toLocaleString()}{" "}
                        <span className="text-lg text-slate-400">€</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500">
                        Raport Cost/Achizitie
                      </span>
                      <p
                        className={
                          "text-lg font-bold font-mono " +
                          ((rep.masina.pretEuro || 0) > 0 &&
                          totalEstimat / (rep.masina.pretEuro || 1) > 0.3
                            ? "text-red-400"
                            : "text-emerald-400")
                        }
                      >
                        {(rep.masina.pretEuro || 0) > 0
                          ? (
                              (totalEstimat / (rep.masina.pretEuro || 1)) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/10">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      info
                    </span>
                    Estimarea va fi salvată. Directorul poate revizui costul în
                    panoul de Estimări.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEstimateModal(false)}
                      className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition"
                    >
                      Anuleaza
                    </button>
                    <button
                      onClick={submitEstimate}
                      disabled={estimatePiese.length === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="material-symbols-outlined">send</span>
                      Trimite Estimare catre Director
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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

export default ReparatiiMecanic;
