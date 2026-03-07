import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPut, apiPost } from "../../config/apiHelper";
import API_URL from "../../config/api";

// DB statusReparatie: 0=Așteptare, 1=Aprobat/În Lucru, 2=Finalizat, 3=Estimare Trimisă, 4=Respins
const statusMap = {
  0: "Așteptare",
  1: "Aprobat · În Lucru",
  2: "Finalizat",
  3: "Estimare Trimisă",
  4: "Respins",
};
const combustibilMap = {
  0: "Benzină",
  1: "Diesel",
  2: "Hibrid",
  3: "Electric",
};

// ── Component ────────────────────────────────────────────────────────
const statusLabels = {
  0: "AȘTEPTARE",
  1: "APROBAT · ÎN LUCRU",
  2: "FINALIZAT",
  3: "ESTIMARE TRIMISĂ",
  4: "RESPINS",
};

function MecanicHome() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reparatii, setReparatii] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchVin, setSearchVin] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch reparații din API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiGet("/api/reparatii");
        const mapped = data.map((r) => ({
          idReparatie: r.idReparatie,
          idMasina: r.idMasina || r.Masina?.idMasina,
          masina: r.Masina
            ? {
                marca: r.Masina.marca || "N/A",
                model: r.Masina.model || "",
              }
            : { marca: "N/A", model: "" },
          vin: r.Masina?.vin || null,
          statusReparatie: r.statusReparatie,
          descriereProblema: r.descriereProblema || "",
          dataInceput: r.dataInceput
            ? new Date(r.dataInceput).toISOString().split("T")[0]
            : "",
          dataFinalizare: r.dataFinalizare
            ? new Date(r.dataFinalizare).toISOString().split("T")[0]
            : null,
          cost: r.cost || 0,
          mecanic: r.mecanic ? `${r.mecanic.prenume} ${r.mecanic.nume}` : "N/A",
          imagine: r.Masina?.imaginePrincipala
            ? `${API_URL}${r.Masina.imaginePrincipala}`
            : r.imaginiReparatie && JSON.parse(r.imaginiReparatie).length > 0
              ? `${API_URL}${JSON.parse(r.imaginiReparatie)[0]}`
              : "https://placehold.co/800x400/2e2249/895af6?text=Auto",
          imaginiReparatie: r.imaginiReparatie
            ? JSON.parse(r.imaginiReparatie)
            : [],
          piese: (r.Piesas || []).map((p) => ({
            idPiesa: p.idPiesa,
            denumire: p.denumire,
            categorie: p.categorie,
            stoc: p.stoc,
            pret: p.pret,
          })),
        }));
        setReparatii(mapped);
        if (mapped.length > 0) setSelectedId(mapped[0].idReparatie);
      } catch (err) {
        setError("Eroare la încărcarea reparațiilor.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-select reparația dacă vine din pagina Reparații cu state.repId
  useEffect(() => {
    if (location.state?.repId) {
      const exists = reparatii.find(
        (r) => r.idReparatie === location.state.repId,
      );
      if (exists) setSelectedId(location.state.repId);
    }
  }, [location.state, reparatii]);

  // Confirmare status
  const [confirmModal, setConfirmModal] = useState(null);
  const [notificariLog, setNotificariLog] = useState([]);
  const [toast, setToast] = useState(null);

  // Persist confirmedStarts in localStorage so the button doesn't reappear on refresh
  const [confirmedStarts, setConfirmedStarts] = useState(() => {
    try {
      const stored = localStorage.getItem("confirmedStarts");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const updateConfirmedStarts = (repId) => {
    setConfirmedStarts((prev) => {
      const next = new Set([...prev, repId]);
      localStorage.setItem("confirmedStarts", JSON.stringify([...next]));
      return next;
    });
  };

  // ── Score modal state (afișat la finalizare) ──
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreRepId, setScoreRepId] = useState(null);

  // ── VIN verification modal state ──
  const [showVinModal, setShowVinModal] = useState(false);
  const [vinInput, setVinInput] = useState("");
  const [vinResult, setVinResult] = useState(null); // null | 'match' | 'mismatch' | 'no-vin'
  const defaultScores = {
    scorViteza: 5,
    scorConfort: 5,
    scorConsum: 5,
    scorManevrabilitate: 5,
    scorPret: 5,
    scorDesignInterior: 5,
    scorDesignExterior: 5,
    scorSpatiu: 5,
    scorAcceleratieCuplu: 5,
    scorFrana: 5,
  };
  const [scores, setScores] = useState({ ...defaultScores });

  // ── Filtrare reparații ──
  const reparatiiFiltrate = reparatii.filter((r) => {
    if (searchVin) {
      const q = searchVin.toLowerCase();
      return (
        `${r.masina.marca} ${r.masina.model}`.toLowerCase().includes(q) ||
        r.descriereProblema.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selected =
    reparatii.find((r) => r.idReparatie === selectedId) || reparatii[0];

  // ── Acțiuni ──
  const cereConfirmare = (newStatus) => {
    if (!selected) return;
    // Mecanicul poate avansa doar de la 1 (Aprobat) la 2 (Finalizat)
    if (selected.statusReparatie !== 1 || newStatus !== 2) return;
    // Deschide modalul de scoruri în loc de confirmare directă
    setScoreRepId(selected.idReparatie);
    setScores({ ...defaultScores });
    setShowScoreModal(true);
  };

  const confirmStartRepair = async () => {
    if (!selected || selected.statusReparatie !== 1) return;
    if (confirmedStarts.has(selected.idReparatie)) return;
    try {
      await apiPost("/api/notificari", {
        tip: "reparatie_inceputa",
        mesaj: `Mecanicul ${selected.mecanic} a confirmat începutul reparației pentru ${selected.masina.marca} ${selected.masina.model}.`,
        idReparatie: selected.idReparatie,
        destinatarRol: "Director",
      });
      updateConfirmedStarts(selected.idReparatie);
      setToast(
        `Început confirmat → ${selected.masina.marca} ${selected.masina.model}`,
      );
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Eroare la confirmare început:", err);
      setToast("Eroare la trimiterea confirmării.");
      setTimeout(() => setToast(null), 4000);
    }
  };

  const submitScoresAndFinalize = async () => {
    if (!scoreRepId) return;
    const rep = reparatii.find((r) => r.idReparatie === scoreRepId);
    if (!rep) return;
    try {
      // 1. Salvează scorurile pe mașină + status "Reparat"
      await apiPut(`/api/masini/${rep.idMasina}`, {
        ...scores,
        status: "Reparat",
      });
      // 2. Finalizează reparația
      await apiPut(`/api/reparatii/${scoreRepId}`, {
        statusReparatie: 2,
        dataFinalizare: new Date().toISOString(),
      });
      // 3. Notifică directorul
      await apiPost("/api/notificari", {
        tip: "reparatie_finalizata",
        mesaj: `Reparația pentru ${rep.masina.marca} ${rep.masina.model} a fost FINALIZATĂ. Scorurile au fost atribuite. Mașina este gata pentru catalog.`,
        idReparatie: scoreRepId,
        destinatarRol: "Director",
      });
      // 4. Update local
      setReparatii((prev) =>
        prev.map((r) =>
          r.idReparatie === scoreRepId ? { ...r, statusReparatie: 2 } : r,
        ),
      );
      setToast(
        `Scoruri salvate & reparație finalizată → ${rep.masina.marca} ${rep.masina.model}`,
      );
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Eroare la finalizare cu scoruri:", err);
      setToast("Eroare la finalizare. Încearcă din nou.");
      setTimeout(() => setToast(null), 4000);
    }
    setShowScoreModal(false);
    setScoreRepId(null);
  };

  const totalPiese = selected
    ? selected.piese.reduce((s, p) => s + p.pret, 0)
    : 0;

  const statusBadge = (s) => {
    if (s === 1)
      return {
        label: "APROBAT · ÎN LUCRU",
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/20",
        dot: true,
      };
    if (s === 2)
      return {
        label: "FINALIZAT",
        bg: "bg-emerald-500/10",
        text: "text-emerald-500",
        border: "border-emerald-500/20",
        icon: "check",
      };
    if (s === 3)
      return {
        label: "ESTIMARE TRIMISĂ",
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/20",
        icon: "send",
      };
    if (s === 4)
      return {
        label: "RESPINS",
        bg: "bg-red-500/10",
        text: "text-red-400",
        border: "border-red-500/20",
        icon: "cancel",
      };
    return {
      label: "AȘTEPTARE",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/20",
      icon: "hourglass_top",
    };
  };

  const progressColor = (s) => {
    if (s === 2) return "bg-emerald-500";
    if (s === 1) return "bg-[#895af6] shadow-[0_0_8px_rgba(137,90,246,0.6)]";
    if (s === 3) return "bg-purple-500";
    if (s === 4) return "bg-red-500";
    return "bg-slate-500";
  };

  const tabs = [];

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
  if (reparatii.length === 0)
    return (
      <div className="min-h-screen bg-[#151022] pt-20 flex items-center justify-center">
        <p className="text-slate-400">Nu există reparații asignate.</p>
      </div>
    );

  return (
    <div
      className="min-h-screen bg-[#151022] pt-20 flex flex-col"
      style={{ height: "calc(100vh)" }}
    >
      {/* Header subtitle (sub Navbar) */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 min-h-0 overflow-hidden">
        {/* ═══ LEFT — Lista Reparații ═══ */}
        <section className="col-span-12 md:col-span-4 lg:col-span-3 rounded-2xl flex flex-col min-h-0 bg-[#130f24]/80 border border-[#895af6]/15 shadow-[inset_0_1px_0_rgba(137,90,246,0.08)]">
          {/* Header */}
          <div className="p-4 border-b border-[#895af6]/15 bg-[#895af6]/[0.04]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#895af6] text-xl">
                build
              </span>
              Reparații
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Lista reparațiilor asignate
            </p>
          </div>

          {/* Search */}
          <div className="p-4 pb-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
              </div>
              <input
                type="text"
                value={searchVin}
                onChange={(e) => setSearchVin(e.target.value)}
                placeholder="Caută marcă, model..."
                className="block w-full p-2.5 pl-10 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-500 transition-all focus:bg-white/10 outline-none"
              />
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-4">
            {reparatiiFiltrate.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">
                Nicio reparație găsită.
              </p>
            )}
            {reparatiiFiltrate.map((r) => {
              const badge = statusBadge(r.statusReparatie);
              const isSelected = r.idReparatie === selectedId;
              return (
                <div
                  key={r.idReparatie}
                  onClick={() => setSelectedId(r.idReparatie)}
                  className={`rounded-xl p-4 cursor-pointer relative group transition border ${
                    isSelected
                      ? "bg-[#211834] border-[#895af6]/40 shadow-lg hover:border-[#895af6]"
                      : "bg-white/[0.03] border-transparent hover:bg-white/[0.06] hover:border-white/10"
                  }`}
                >
                  {r.statusReparatie === 1 && (
                    <div className="absolute right-3 top-3">
                      <span className="material-symbols-outlined text-amber-500 animate-pulse text-lg">
                        timelapse
                      </span>
                    </div>
                  )}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full ${badge.bg} px-2 py-0.5 text-xs font-medium ${badge.text} border ${badge.border}`}
                    >
                      {badge.dot && (
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                      )}
                      {badge.icon && (
                        <span className="material-symbols-outlined text-[14px]">
                          {badge.icon}
                        </span>
                      )}
                      {badge.label}
                    </span>
                  </div>
                  <h3
                    className={`font-bold text-lg leading-tight ${isSelected ? "text-white" : "text-slate-200 group-hover:text-white"}`}
                  >
                    {r.masina.marca} {r.masina.model}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {r.descriereProblema?.substring(0, 50)}...
                  </p>
                  <div className="mt-4 space-y-2">
                    {r.statusReparatie === 1 && (
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Progres</span>
                        <span>
                          {r.statusReparatie === 2
                            ? 100
                            : r.statusReparatie === 1
                              ? 50
                              : r.statusReparatie === 3
                                ? 25
                                : 0}
                          %
                        </span>
                      </div>
                    )}
                    <div
                      className={`h-1.5 w-full bg-slate-700 rounded-full overflow-hidden ${r.statusReparatie === 0 ? "opacity-50" : ""}`}
                    >
                      <div
                        className={`h-full ${progressColor(r.statusReparatie)} rounded-full transition-all`}
                        style={{
                          width: `${r.statusReparatie === 2 ? 100 : r.statusReparatie === 1 ? 50 : r.statusReparatie === 3 ? 25 : r.statusReparatie === 4 ? 10 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        calendar_today
                      </span>{" "}
                      {r.dataInceput}
                    </span>
                    <span className="text-xs text-slate-500">
                      {r.piese.length} piese
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ═══ CENTER — Workspace ═══ */}
        <section className="glass-panel col-span-12 md:col-span-8 lg:col-span-6 rounded-2xl flex flex-col min-h-0 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-24">
            {/* Car Header */}
            <div className="relative h-48 w-full group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1333] via-transparent to-transparent z-10"></div>
              <div
                className="w-full h-full bg-center bg-cover"
                style={{ backgroundImage: `url('${selected.imagine}')` }}
              ></div>
              <div className="absolute bottom-4 left-6 z-20 flex flex-wrap items-end justify-between w-[calc(100%-3rem)] gap-2">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {selected.masina.marca} {selected.masina.model}
                  </h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-300">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        assignment_ind
                      </span>{" "}
                      {selected.mecanic}
                    </span>
                    <span className="flex items-center gap-1 font-mono opacity-70">
                      <span className="material-symbols-outlined text-base">
                        calendar_today
                      </span>{" "}
                      {selected.dataInceput}
                    </span>
                  </div>
                </div>
                {/* Status Toggle — doar pentru status 1 (Aprobat) și 2 (Finalizat) */}
                {selected.statusReparatie === 1 ||
                selected.statusReparatie === 2 ? (
                  <div className="flex items-center bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10">
                    <span className="hidden sm:block text-xs font-bold px-3 py-1.5 text-slate-400">
                      STATUS:
                    </span>
                    {[
                      { val: 1, label: "ÎN LUCRU" },
                      { val: 2, label: "FINALIZAT" },
                    ].map((s) => {
                      const currentStatus = selected.statusReparatie;
                      const isCurrent = currentStatus === s.val;
                      const isLocked = s.val < currentStatus;
                      const isFullyLocked = currentStatus === 2;
                      const disabled = isLocked || isFullyLocked || isCurrent;

                      return (
                        <button
                          key={s.val}
                          onClick={() => !disabled && cereConfirmare(s.val)}
                          disabled={disabled}
                          className={`text-xs font-bold px-4 py-1.5 rounded transition flex items-center gap-2 ${
                            isLocked
                              ? "text-slate-600 cursor-not-allowed opacity-40"
                              : isCurrent
                                ? s.val === 1
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "bg-emerald-500 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {isLocked && (
                            <span className="material-symbols-outlined text-[12px]">
                              lock
                            </span>
                          )}
                          {isCurrent && s.val === 1 && !isLocked && (
                            <span className="animate-pulse size-2 bg-white rounded-full"></span>
                          )}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`flex items-center gap-2 backdrop-blur-md rounded-lg px-3 py-2 border ${
                      selected.statusReparatie === 0
                        ? "bg-amber-500/10 border-amber-500/20"
                        : selected.statusReparatie === 3
                          ? "bg-purple-500/10 border-purple-500/20"
                          : "bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        selected.statusReparatie === 0
                          ? "text-amber-400"
                          : selected.statusReparatie === 3
                            ? "text-purple-400"
                            : "text-red-400"
                      }`}
                    >
                      {selected.statusReparatie === 0
                        ? "edit_note"
                        : selected.statusReparatie === 3
                          ? "hourglass_top"
                          : "cancel"}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        selected.statusReparatie === 0
                          ? "text-amber-400"
                          : selected.statusReparatie === 3
                            ? "text-purple-400"
                            : "text-red-400"
                      }`}
                    >
                      {selected.statusReparatie === 0
                        ? "Necesită estimare"
                        : selected.statusReparatie === 3
                          ? "Așteptare decizie Director"
                          : "Estimare respinsă — mașina nu mai este în sarcina ta"}
                    </span>
                    {selected.statusReparatie === 0 && (
                      <button
                        onClick={() =>
                          navigate("/mecanic/reparatii", {
                            state: { openEstimate: selected.idReparatie },
                          })
                        }
                        className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-xs shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          calculate
                        </span>
                        Creează Estimare
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-8">
              {/* Problem Description + Attachments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#895af6] text-lg">
                      medical_services
                    </span>{" "}
                    Descriere Problemă
                  </label>
                  <textarea
                    readOnly
                    value={selected.descriereProblema}
                    className="w-full h-32 bg-[#0d0a17]/50 border border-white/10 rounded-xl p-3 text-sm text-slate-200 resize-none placeholder-slate-600 outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#895af6] text-lg">
                      directions_car
                    </span>{" "}
                    Imagine Vehicul
                  </label>
                  {selected.imaginiReparatie &&
                  selected.imaginiReparatie.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selected.imaginiReparatie.map((src, i) => (
                        <a
                          key={i}
                          href={`${API_URL}${src}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden border border-white/10 hover:border-[#895af6]/40 transition h-32"
                        >
                          <img
                            src={`${API_URL}${src}`}
                            alt={`Poza vehicul ${i + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-white/10 h-32">
                      <div
                        className="w-full h-full bg-center bg-cover"
                        style={{
                          backgroundImage: `url('${selected.imagine}')`,
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Parts Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#895af6] text-lg">
                      build
                    </span>{" "}
                    Piese Necesare
                  </label>
                  <button
                    onClick={() => navigate("/mecanic/piese")}
                    className="text-xs text-[#895af6] font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      inventory_2
                    </span>{" "}
                    Gestiune Piese
                  </button>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-400 min-w-[500px]">
                    <thead className="text-xs text-slate-200 uppercase bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-3">Piesă</th>
                        <th className="px-6 py-3">Categorie</th>
                        <th className="px-6 py-3 text-center">Stoc</th>
                        <th className="px-6 py-3 text-right">Preț</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-[#0d0a17]/30">
                      {selected.piese.map((p) => (
                        <tr
                          key={p.idPiesa}
                          className="hover:bg-white/[0.03] transition"
                        >
                          <td className="px-6 py-3 font-medium text-white">
                            {p.denumire}
                          </td>
                          <td className="px-6 py-3 text-slate-400">
                            {p.categorie}
                          </td>
                          <td
                            className={`px-6 py-3 text-center ${p.stoc === 0 ? "text-red-400" : p.stoc <= 3 ? "text-amber-500" : "text-emerald-500"}`}
                          >
                            {p.stoc} buc
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-white">
                            €{p.pret.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-white/5 border-t border-white/10">
                      <tr>
                        <td
                          className="px-6 py-3 text-right font-bold text-slate-300"
                          colSpan="3"
                        >
                          TOTAL PIESE
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-xl text-[#895af6] font-mono">
                          €{totalPiese.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#1a1333]/95 backdrop-blur-xl border-t border-white/10 p-4 flex flex-wrap items-center justify-between z-30 gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/mecanic/fisa-reparatie")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
              >
                <span className="material-symbols-outlined text-lg">print</span>
                <span className="hidden sm:inline">Printează Fișă</span>
              </button>
              <button
                onClick={() => navigate("/mecanic/reparatii")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
              >
                <span className="material-symbols-outlined text-lg">list</span>
                <span className="hidden sm:inline">Toate Reparațiile</span>
              </button>
            </div>
            {selected &&
              selected.statusReparatie === 1 &&
              !confirmedStarts.has(selected.idReparatie) && (
                <button
                  onClick={confirmStartRepair}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-bold text-sm shadow-lg transition transform bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-amber-500/20 hover:scale-105"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  Confirmă Începutul Reparației
                </button>
              )}
            <button
              onClick={() => cereConfirmare(2)}
              disabled={!selected || selected.statusReparatie !== 1}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-white font-bold text-sm shadow-lg transition transform ml-auto ${
                !selected || selected.statusReparatie !== 1
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-teal-500/20 hover:scale-105"
              }`}
            >
              <span className="material-symbols-outlined">check_circle</span>
              Marchează FINALIZAT
            </button>
          </div>
        </section>

        {/* ═══ RIGHT — Alerts & Quick Actions ═══ */}
        <section className="col-span-12 md:col-span-12 lg:col-span-3 flex flex-col gap-6 min-h-0 overflow-y-auto bg-[#1a1333]/60 rounded-2xl p-4 border border-[#895af6]/10">
          {/* Notificări Director */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#895af6]">
                notifications_active
              </span>{" "}
              Notificări Trimise
              {notificariLog.length > 0 && (
                <span className="ml-auto text-xs bg-[#895af6] text-white px-2 py-0.5 rounded-full">
                  {notificariLog.length}
                </span>
              )}
            </h3>
            {notificariLog.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                Nicio notificare trimisă.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {notificariLog.map((n) => (
                  <div
                    key={n.id}
                    className="bg-white/[0.03] rounded-lg p-3 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">
                        {n.masina}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {n.ora}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <span className="text-slate-500">{n.an}</span> &middot;{" "}
                      {n.delaStatus} →{" "}
                      <span className="text-[#895af6] font-medium">
                        {n.laStatus}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">
                warning
              </span>{" "}
              Alerte Stoc
            </h3>
            {selected &&
              selected.piese.filter((p) => p.stoc <= 3).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-3">
                  Nicio alertă de stoc.
                </p>
              )}
            {selected &&
              selected.piese
                .filter((p) => p.stoc <= 3)
                .map((p, i) => (
                  <div
                    key={i}
                    className={`${
                      p.stoc === 0
                        ? "bg-red-500/10 border-l-4 border-red-500"
                        : "bg-amber-500/10 border-l-4 border-amber-500"
                    } rounded p-3 hover:opacity-90 transition`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p
                          className={`text-sm font-bold ${p.stoc === 0 ? "text-red-100" : "text-amber-100"}`}
                        >
                          {p.denumire}
                        </p>
                        <p
                          className={`text-xs mt-1 ${p.stoc === 0 ? "text-red-300" : "text-amber-300"}`}
                        >
                          Stoc: {p.stoc} buc
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {/* Quick Actions */}
          <div className="glass-panel rounded-2xl p-5 flex-1">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#895af6]">
                bolt
              </span>{" "}
              Acțiuni Rapide
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: "inventory_2",
                  label: "Gestiune Piese",
                  path: "/mecanic/piese",
                },
                {
                  icon: "build",
                  label: "Reparații",
                  path: "/mecanic/reparatii",
                },
                {
                  icon: "picture_as_pdf",
                  label: "Fișe PDF",
                  path: "/mecanic/fisa-reparatie",
                },
              ].map((a) => (
                <button
                  key={a.icon}
                  onClick={() => navigate(a.path)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.03] hover:bg-[#895af6]/20 border border-white/5 hover:border-[#895af6]/50 transition group"
                >
                  <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-[#895af6] mb-2 transition-colors">
                    {a.icon}
                  </span>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white">
                    {a.label}
                  </span>
                </button>
              ))}
              {/* VIN Verification Button */}
              <button
                onClick={() => {
                  setVinInput("");
                  setVinResult(null);
                  setShowVinModal(true);
                }}
                disabled={!selected || selected.statusReparatie !== 1}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition group ${
                  !selected || selected.statusReparatie !== 1
                    ? "bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed"
                    : "bg-white/[0.03] hover:bg-amber-500/20 border-white/5 hover:border-amber-500/50"
                }`}
              >
                <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-amber-400 mb-2 transition-colors">
                  qr_code_scanner
                </span>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white">
                  Verificare VIN
                </span>
              </button>
            </div>
          </div>

          {/* Info Reparație */}
          <div className="glass-panel rounded-2xl p-5 bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#895af6]">
                info
              </span>{" "}
              Detalii
            </h3>
            {selected && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Mecanic</span>
                  <span className="text-white font-medium">
                    {selected.mecanic}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Data Început</span>
                  <span className="text-white font-medium">
                    {selected.dataInceput}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Cost</span>
                  <span className="text-white font-medium">
                    €{selected.cost}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ═══ Modal Verificare VIN ═══ */}
      {showVinModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowVinModal(false)}
          ></div>
          <div className="relative glass-panel rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="size-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-amber-400">
                  qr_code_scanner
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-1">
              Verificare VIN
            </h3>
            <p className="text-sm text-slate-400 text-center mb-1">
              <span className="text-white font-medium">
                {selected.masina.marca} {selected.masina.model}
              </span>
            </p>
            <p className="text-xs text-slate-500 text-center mb-5">
              Introdu sau lipește VIN-ul scanat de pe vehicul pentru a verifica
              dacă corespunde cu cel din baza de date.
            </p>

            {/* VIN Input */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                VIN scanat
              </label>
              <input
                type="text"
                value={vinInput}
                onChange={(e) => {
                  setVinInput(e.target.value.toUpperCase());
                  setVinResult(null);
                }}
                maxLength={17}
                placeholder="ex: WBAPH5C55BA123456"
                className="w-full bg-[#0d0a17]/50 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-mono tracking-[0.2em] text-center focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 placeholder-slate-600 uppercase"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5 text-center">
                {vinInput.length}/17 caractere
              </p>
            </div>

            {/* Result */}
            {vinResult === "match" && (
              <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-400 text-xl">
                    verified
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">
                    VIN Verificat cu Succes
                  </p>
                  <p className="text-xs text-emerald-300/70 mt-0.5">
                    VIN-ul scanat corespunde cu cel din baza de date.
                  </p>
                </div>
              </div>
            )}
            {vinResult === "mismatch" && (
              <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-400 text-xl">
                    gpp_bad
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-400">
                    VIN nu corespunde!
                  </p>
                  <p className="text-xs text-red-300/70 mt-0.5">
                    VIN-ul scanat nu se potrivește cu cel din baza de date.
                    Verifică vehiculul și contactează directorul.
                  </p>
                </div>
              </div>
            )}
            {vinResult === "no-vin" && (
              <div className="mb-5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-400 text-xl">
                    warning
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-400">
                    VIN lipsă în baza de date
                  </p>
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    Această mașină nu are un VIN înregistrat. Contactează
                    directorul pentru a-l adăuga.
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowVinModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
              >
                Închide
              </button>
              <button
                onClick={() => {
                  const dbVin = selected.vin;
                  if (!dbVin) {
                    setVinResult("no-vin");
                    return;
                  }
                  const scanned = vinInput.trim().toUpperCase();
                  const stored = dbVin.trim().toUpperCase();
                  setVinResult(scanned === stored ? "match" : "mismatch");
                }}
                disabled={vinInput.trim().length === 0}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">
                  fact_check
                </span>
                Verifică VIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Scoruri + Finalizare ═══ */}
      {showScoreModal &&
        (() => {
          const rep = reparatii.find((r) => r.idReparatie === scoreRepId);
          if (!rep) return null;
          const scoreFields = [
            { key: "scorViteza", label: "Viteză Maximă", icon: "speed" },
            {
              key: "scorConfort",
              label: "Confort",
              icon: "airline_seat_recline_extra",
            },
            { key: "scorConsum", label: "Consum", icon: "local_gas_station" },
            {
              key: "scorManevrabilitate",
              label: "Manevrabilitate",
              icon: "swap_driving_apps_wheel",
            },
            {
              key: "scorPret",
              label: "Raport Calitate-Preț",
              icon: "price_check",
            },
            {
              key: "scorDesignInterior",
              label: "Design Interior",
              icon: "dashboard",
            },
            {
              key: "scorDesignExterior",
              label: "Design Exterior",
              icon: "directions_car",
            },
            { key: "scorSpatiu", label: "Spațiu", icon: "open_in_full" },
            {
              key: "scorAcceleratieCuplu",
              label: "Accelerație / Cuplu",
              icon: "bolt",
            },
            { key: "scorFrana", label: "Frânare", icon: "do_not_disturb_on" },
          ];
          const allSet = Object.values(scores).every((v) => v > 0);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowScoreModal(false)}
              ></div>
              <div className="relative glass-panel rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/10">
                {/* Header */}
                <div className="flex justify-center mb-4">
                  <div className="size-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-emerald-400">
                      star_rate
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-1">
                  Atribuie Scoruri & Finalizează
                </h3>
                <p className="text-sm text-slate-400 text-center mb-2">
                  <span className="text-white font-medium">
                    {rep.masina.marca} {rep.masina.model}
                  </span>
                </p>
                <p className="text-xs text-amber-400/80 text-center mb-5 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    warning
                  </span>
                  Scorurile sunt obligatorii și nu vor putea fi modificate de
                  Director.
                </p>

                {/* Scores Grid */}
                <div className="grid grid-cols-1 gap-2.5 mb-6">
                  {scoreFields.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-500 shrink-0">
                        {s.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-slate-400">
                            {s.label}
                          </span>
                          <span
                            className={`text-sm font-bold font-mono ${scores[s.key] >= 7 ? "text-emerald-400" : scores[s.key] >= 4 ? "text-amber-400" : "text-red-400"}`}
                          >
                            {scores[s.key].toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={scores[s.key]}
                          onChange={(e) =>
                            setScores((prev) => ({
                              ...prev,
                              [s.key]: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#895af6] bg-white/10"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Average */}
                <div className="flex items-center justify-between bg-[#895af6]/10 rounded-xl px-4 py-3 border border-[#895af6]/20 mb-5">
                  <span className="text-sm font-medium text-[#895af6]">
                    Scor Mediu General
                  </span>
                  <span className="text-lg font-bold font-mono text-white">
                    {(
                      Object.values(scores).reduce((a, b) => a + b, 0) / 10
                    ).toFixed(1)}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowScoreModal(false);
                      setScoreRepId(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={submitScoresAndFinalize}
                    disabled={!allSet}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">
                      check_circle
                    </span>
                    Salvează & Finalizează
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#895af6] text-white px-5 py-3 rounded-xl shadow-2xl shadow-[#895af6]/20 animate-[slideUp_0.3s_ease-out]">
          <span className="material-symbols-outlined">
            notifications_active
          </span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}

export default MecanicHome;
