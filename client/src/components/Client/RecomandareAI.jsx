import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiPost } from "../../config/apiHelper";
import API_URL from "../../config/api";

const combustibilMap = {
  0: "Benzină",
  1: "Diesel",
  2: "Hibrid",
  3: "Electric",
};

const criteriiQuick = [
  {
    key: "performanta",
    label: "Performanță",
    icon: "speed",
    desc: "Putere, accelerație, dinamică de condus",
  },
  {
    key: "design",
    label: "Design",
    icon: "palette",
    desc: "Estetică exterioară și interioară",
  },
  {
    key: "confort",
    label: "Confort",
    icon: "airline_seat_recline_extra",
    desc: "Suspensie, izolare fonică, echipamente",
  },
  {
    key: "pret",
    label: "Preț Accesibil",
    icon: "savings",
    desc: "Buget redus, raport calitate-preț",
  },
];

const criteriiDetailed = [
  ...criteriiQuick,
  {
    key: "consum",
    label: "Consum Redus",
    icon: "eco",
    desc: "Eficiență, consum mic, prietenos cu mediul",
  },
  {
    key: "siguranta",
    label: "Siguranță",
    icon: "shield",
    desc: "Sisteme de frânare, stabilitate, siguranță activă",
  },
  {
    key: "spatiu",
    label: "Spațiu Interior",
    icon: "width_full",
    desc: "Portbagaj, locuri, spațiu interior generos",
  },
];

/* ─── SVG Mini-chart helpers ─────────────────────────────────── */

function ClusterProfile({ profile, activeKeys, color }) {
  if (!profile) return null;
  const maxVal = 10;
  return (
    <div className="flex flex-wrap gap-1.5">
      {activeKeys.map((k) => {
        const val = profile[k] || 0;
        const pct = (val / maxVal) * 100;
        return (
          <div key={k} className="flex items-center gap-1.5 w-full">
            <span className="text-[10px] text-slate-400 w-20 text-right truncate">
              {k}
            </span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] text-slate-300 w-6">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */

function RecomandareAI() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const userId = user?.id || "guest";
  const [tipTest, setTipTest] = useState("quick");

  // Load saved preferences per user
  const loadSavedPrefs = () => {
    try {
      const saved = localStorage.getItem(`aiPrefs_${userId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      performanta: 5,
      design: 5,
      confort: 5,
      pret: 5,
      consum: 5,
      siguranta: 5,
      spatiu: 5,
    };
  };

  const [preferinte, setPreferinte] = useState(loadSavedPrefs);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cosine");
  const [subTab, setSubTab] = useState("pca");

  // Results from AI service
  const [cosineResults, setCosineResults] = useState([]);
  const [pcaData, setPcaData] = useState(null);
  const [hcData, setHcData] = useState(null);
  const [aiError, setAiError] = useState("");

  const criterii = tipTest === "quick" ? criteriiQuick : criteriiDetailed;
  const activeKeys = criterii.map((c) => c.key);

  const handleSubmit = async () => {
    setLoading(true);
    setAiError("");
    try {
      const body = { preferinte, activeKeys };
      const [cosine, pca, hc] = await Promise.all([
        apiPost("/ai/cosine", body),
        apiPost("/ai/pca", body),
        apiPost("/ai/hc", body),
      ]);

      // Enrich cosine results with image URLs
      const enriched = cosine.map((m) => ({
        ...m,
        combustibilLabel: combustibilMap[m.combustibil] || "—",
        imagine: m.imagine
          ? `${API_URL}${m.imagine}`
          : `https://placehold.co/600x400/2e2249/895af6?text=${encodeURIComponent(m.marca + " " + m.model)}`,
        specs: `${combustibilMap[m.combustibil] || "—"} · ${m.an} · ${m.km >= 1000 ? Math.round(m.km / 1000) + "k" : m.km} km`,
      }));

      // Enrich HC cars
      if (hc.cars) {
        hc.cars = hc.cars.map((m) => ({
          ...m,
          imagine: m.imagine
            ? `${API_URL}${m.imagine}`
            : `https://placehold.co/600x400/2e2249/895af6?text=${encodeURIComponent(m.marca + " " + m.model)}`,
        }));
      }

      setCosineResults(enriched);
      setPcaData(pca);
      setHcData(hc);

      // Persist per-user: AI match scores and preferences
      const matchMap = {};
      cosine.forEach((m) => {
        matchMap[m.idMasina] = m.match;
      });
      localStorage.setItem(`aiMatchScores_${userId}`, JSON.stringify(matchMap));
      localStorage.setItem(`aiPrefs_${userId}`, JSON.stringify(preferinte));

      setShowResults(true);
      setActiveTab("cosine");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Eroare AI:", err);
      setAiError(err.message || "Serviciul AI nu este disponibil.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setCosineResults([]);
    setPcaData(null);
    setHcData(null);
    setAiError("");
    setPreferinte(loadSavedPrefs());
  };

  const matchColor = (pct) => {
    if (pct >= 75)
      return {
        text: "text-emerald-400",
        hex: "#10b981",
        ring: "ring-emerald-500/30",
      };
    if (pct >= 60)
      return {
        text: "text-[#2DD4BF]",
        hex: "#2DD4BF",
        ring: "ring-[#2DD4BF]/30",
      };
    if (pct >= 45)
      return {
        text: "text-[#895af6]",
        hex: "#895af6",
        ring: "ring-[#895af6]/30",
      };
    return {
      text: "text-slate-400",
      hex: "#64748b",
      ring: "ring-slate-500/30",
    };
  };

  const tabs = [
    {
      key: "cosine",
      label: "Recomandări",
      icon: "auto_awesome",
      color: "text-[#2DD4BF]",
    },
    {
      key: "pasionati",
      label: "Pentru Pasionați",
      icon: "science",
      color: "text-[#895af6]",
    },
  ];

  return (
    <main
      className="flex-1 max-w-[1200px] mx-auto w-full p-6 space-y-8"
      style={{ paddingTop: "6rem" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="size-9 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition"
            >
              <span className="material-symbols-outlined text-white">
                arrow_back
              </span>
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="material-symbols-outlined text-[#2DD4BF] text-3xl">
                auto_awesome
              </span>
              Recomandare AI
            </h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">
            {showResults
              ? `${cosineResults.length} mașini analizate – 3 algoritmi: Cosine Similarity, PCA, Clustering Ierarhic`
              : "Completează preferințele tale și descoperă mașina potrivită"}
          </p>
        </div>
        {showResults && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition"
          >
            <span className="material-symbols-outlined text-[18px]">
              refresh
            </span>
            Reia Testul
          </button>
        )}
      </div>

      {!showResults ? (
        /* ==================== QUIZ PHASE ==================== */
        <div className="space-y-6">
          {/* Test Type Toggle */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              Tip Test
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setTipTest("quick")}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  tipTest === "quick"
                    ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-[#2DD4BF]">
                    bolt
                  </span>
                  <span className="text-white font-bold">Test Rapid</span>
                </div>
                <p className="text-xs text-slate-400">
                  4 criterii esențiale – rezultate rapide
                </p>
              </button>
              <button
                onClick={() => setTipTest("detailed")}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  tipTest === "detailed"
                    ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-[#895af6]">
                    tune
                  </span>
                  <span className="text-white font-bold">Test Detaliat</span>
                </div>
                <p className="text-xs text-slate-400">
                  7 criterii – precizie maximă
                </p>
              </button>
            </div>
          </div>

          {/* Criteria Sliders */}
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                tune
              </span>
              Setează Preferințele ({criterii.length} criterii)
            </h3>
            {criterii.map((c) => (
              <div key={c.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-9 bg-white/5 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#2DD4BF] text-[18px]">
                        {c.icon}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">
                        {c.label}
                      </span>
                      <p className="text-[10px] text-slate-500">{c.desc}</p>
                    </div>
                  </div>
                  <span
                    className={`text-lg font-bold font-mono ${preferinte[c.key] >= 7 ? "text-[#2DD4BF]" : preferinte[c.key] >= 4 ? "text-white" : "text-slate-500"}`}
                  >
                    {preferinte[c.key]}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 w-16">Puțin</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={preferinte[c.key]}
                    onChange={(e) =>
                      setPreferinte((p) => ({
                        ...p,
                        [c.key]: Number(e.target.value),
                      }))
                    }
                    className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#2DD4BF]"
                  />
                  <span className="text-[10px] text-slate-500 w-16 text-right">
                    Foarte mult
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-teal-600 text-white font-bold text-lg shadow-lg shadow-[#2DD4BF]/20 hover:shadow-[#2DD4BF]/30 hover:scale-105 transition transform disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Se analizează...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-2xl">
                    auto_awesome
                  </span>
                  Descoperă Mașinile Potrivite
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-400 text-xl mt-0.5">
                error
              </span>
              <div>
                <p className="text-sm font-bold text-red-400 mb-1">
                  Eroare Serviciu AI
                </p>
                <p className="text-xs text-slate-400">{aiError}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Asigură-te că serviciul Python rulează:{" "}
                  <code className="text-slate-300">
                    python ai_service/app.py
                  </code>
                </p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-[#2DD4BF]/5 rounded-xl p-4 border border-[#2DD4BF]/10 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#2DD4BF] text-xl mt-0.5">
              psychology
            </span>
            <div>
              <p className="text-sm font-bold text-[#2DD4BF] mb-2">
                Cum funcționează? – 3 Algoritmi
              </p>
              <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <p>
                  <strong className="text-[#2DD4BF]">
                    1. Cosine Similarity (Similaritate Cosinus)
                  </strong>{" "}
                  — Calculează similaritatea direcțională ponderată între
                  vectorul tău de preferințe și scorurile fiecărei mașini.
                  Măsoară <em>direcția</em> preferinței, nu magnitudinea,
                  oferind rezultate mai precise decât distanța euclidiană.
                </p>
                <p>
                  <strong className="text-[#895af6]">
                    2. ACP (Analiza Componentelor Principale)
                  </strong>{" "}
                  — Reduce dimensionalitatea celor {criterii.length} criterii la
                  2 componente principale, permițând vizualizarea mașinilor și a
                  preferințelor tale într-un spațiu 2D. Include Scree Plot,
                  cercul corelațiilor și criteriile Kaiser/Cattell.
                </p>
                <p>
                  <strong className="text-[#D4AF37]">
                    3. AC (Analiza Clusterilor Ierarhici)
                  </strong>{" "}
                  — Grupează mașinile în clustere similare folosind metoda Ward.
                  Identifică grupul de mașini cel mai compatibil cu profilul tău
                  și afișează indicii Silhouette pentru validarea calității
                  partiției.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== RESULTS PHASE ==================== */
        <div className="space-y-6">
          {/* Tab Bar */}
          <div className="glass-panel rounded-2xl p-2 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all
                                    ${
                                      activeTab === tab.key
                                        ? "bg-white/10 text-white shadow-lg"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                    }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${activeTab === tab.key ? tab.color : ""}`}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: Cosine Similarity Results ── */}
          {activeTab === "cosine" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-lg bg-[#2DD4BF]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2DD4BF]">
                    auto_awesome
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Cosine Similarity – Recomandări
                  </h2>
                  <p className="text-xs text-slate-400">
                    Mașini ordonate după similaritatea cosinus ajustată
                    (Pearson) cu preferințele tale
                  </p>
                </div>
              </div>

              {/* ── User Preference Summary ── */}
              <div className="glass-panel rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#2DD4BF]">
                    person
                  </span>
                  Preferințele Tale – Profilul Utilizat în Analiză
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {activeKeys.map((k) => {
                    const val = preferinte[k];
                    const label = criterii.find((c) => c.key === k)?.label || k;
                    const pct = (val / 10) * 100;
                    return (
                      <div
                        key={k}
                        className="bg-white/5 rounded-xl p-3 text-center space-y-1.5"
                      >
                        <p
                          className={`text-2xl font-bold font-mono ${val >= 7 ? "text-[#2DD4BF]" : val >= 4 ? "text-white" : "text-slate-500"}`}
                        >
                          {val}
                        </p>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                val >= 7
                                  ? "#2DD4BF"
                                  : val >= 4
                                    ? "#895af6"
                                    : "#64748b",
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Top 3 Podium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cosineResults.slice(0, 3).map((masina, idx) => {
                  const mc = matchColor(masina.match);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div
                      key={masina.idMasina}
                      className={`glass-panel rounded-2xl overflow-hidden group hover:border-[#2DD4BF]/30 transition-all relative ${idx === 0 ? "ring-2 ring-[#2DD4BF]/40 md:-translate-y-2" : ""}`}
                    >
                      <div className="absolute top-3 left-3 z-20 text-2xl">
                        {medals[idx]}
                      </div>
                      <div className="absolute top-3 right-3 z-20">
                        <div
                          className={`relative size-12 rounded-full flex items-center justify-center ring-2 ${mc.ring}`}
                          style={{
                            background: `conic-gradient(${mc.hex} ${masina.match}%, #334155 0)`,
                          }}
                        >
                          <div className="absolute inset-1 bg-[#151022] rounded-full flex items-center justify-center">
                            <span className={`text-xs font-bold ${mc.text}`}>
                              {masina.match}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="relative h-44 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#151022] to-transparent z-10"></div>
                        <div
                          className="w-full h-full bg-center bg-cover transition-transform group-hover:scale-105"
                          style={{
                            backgroundImage: `url('${masina.imagine}')`,
                          }}
                        ></div>
                      </div>
                      <div className="p-5 space-y-3">
                        <h3 className="text-lg font-bold text-white group-hover:text-[#2DD4BF] transition">
                          {masina.marca} {masina.model}
                        </h3>
                        <p className="text-xs text-slate-400">{masina.specs}</p>
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <span className="bg-white/5 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full">
                            {masina.an}
                          </span>
                          <span className="bg-white/5 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full">
                            {masina.km?.toLocaleString()} km
                          </span>
                          <span className="bg-white/5 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full">
                            {masina.combustibilLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-lg font-bold text-[#D4AF37] font-mono">
                            €{masina.pret?.toLocaleString()}
                          </span>
                          <button
                            onClick={() =>
                              navigate(`/client/masina/${masina.idMasina}`)
                            }
                            className="text-xs px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              visibility
                            </span>{" "}
                            Detalii
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Rest of results */}
              {cosineResults.length > 3 && (
                <div className="glass-panel rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                      Alte Rezultate
                    </h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {cosineResults.slice(3).map((masina, idx) => {
                      const mc = matchColor(masina.match);
                      return (
                        <div
                          key={masina.idMasina}
                          className="flex items-center gap-5 p-4 hover:bg-white/[0.02] transition group"
                        >
                          <span className="text-sm font-bold text-slate-500 w-6 text-center">
                            #{idx + 4}
                          </span>
                          <div
                            className="size-14 rounded-lg bg-cover bg-center shrink-0"
                            style={{
                              backgroundImage: `url('${masina.imagine}')`,
                            }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white group-hover:text-[#2DD4BF] transition truncate">
                              {masina.marca} {masina.model}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {masina.an} · {masina.km?.toLocaleString()} km ·{" "}
                              {masina.combustibilLabel}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-[#D4AF37] font-mono hidden sm:block">
                            €{masina.pret?.toLocaleString()}
                          </span>
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${mc.text} bg-white/5`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              auto_awesome
                            </span>
                            {masina.match}%
                          </div>
                          <button
                            onClick={() =>
                              navigate(`/client/masina/${masina.idMasina}`)
                            }
                            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition hidden sm:block"
                          >
                            Detalii
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Pentru Pasionați (PCA + HC) ── */}
          {activeTab === "pasionati" && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="bg-[#895af6]/5 rounded-xl p-4 border border-[#895af6]/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#895af6] text-xl mt-0.5">
                  school
                </span>
                <div>
                  <p className="text-sm font-bold text-[#895af6] mb-1">
                    Secțiune Avansată
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Analize statistice multidimensionale aplicate pe cele{" "}
                    {activeKeys.length} criterii. Graficele matplotlib sunt
                    generate de serviciul Python și includ interpretări
                    automate.
                  </p>
                </div>
              </div>

              {/* Sub-tab bar */}
              <div className="glass-panel rounded-xl p-1.5 flex gap-1">
                <button
                  onClick={() => setSubTab("pca")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all
                                        ${subTab === "pca" ? "bg-[#895af6]/20 text-[#895af6]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    scatter_plot
                  </span>
                  Analiză PCA
                </button>
                <button
                  onClick={() => setSubTab("hc")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all
                                        ${subTab === "hc" ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    hub
                  </span>
                  Clusteri Ierarhici
                </button>
              </div>

              {/* ── USER PREFERENCES REMINDER ── */}
              <div className="glass-panel rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#2DD4BF]">
                    person
                  </span>
                  Profilul tău utilizat în analize
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeKeys.map((k) => {
                    const val = preferinte[k];
                    const label = criterii.find((c) => c.key === k)?.label || k;
                    return (
                      <span
                        key={k}
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${val >= 7 ? "border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-[#2DD4BF]" : val >= 4 ? "border-white/10 bg-white/5 text-slate-300" : "border-white/5 bg-white/[0.02] text-slate-500"}`}
                      >
                        {label}: {val}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* ──── SUB-TAB: PCA ──── */}
              {subTab === "pca" && pcaData && (
                <div className="space-y-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-lg bg-[#895af6]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#895af6]">
                        scatter_plot
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Analiza Componentelor Principale (ACP)
                      </h2>
                      <p className="text-xs text-slate-400">
                        Reducere dimensională – mașinile vizualizate în spațiul
                        componentelor principale
                      </p>
                    </div>
                  </div>

                  {/* Criteria info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#2DD4BF]">
                        {pcaData.kaiserComponents}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Componente (Kaiser)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        eigenvalue {">"} 1
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#895af6]">
                        {pcaData.cattellComponents}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Componente (Cattell)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        cotitură scree plot
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#D4AF37]">
                        {pcaData.variance80Components}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Componente (≥80% varianță)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {
                          pcaData.cumulativeVariance?.[
                            pcaData.variance80Components - 1
                          ]
                        }
                        % explicat
                      </p>
                    </div>
                  </div>

                  {/* Scree Plot */}
                  {pcaData.charts?.screePlot && (
                    <div className="glass-panel rounded-2xl p-8">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          bar_chart
                        </span>
                        Scree Plot – Varianța Componentelor
                      </h3>
                      <div className="flex justify-center py-4">
                        <img
                          src={`data:image/png;base64,${pcaData.charts.screePlot}`}
                          alt="Scree Plot"
                          className="w-full max-w-[800px] rounded-xl shadow-lg shadow-black/20"
                        />
                      </div>
                      <div className="mt-6 space-y-3">
                        <div className="bg-[#895af6]/5 rounded-lg p-4 border border-[#895af6]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#895af6] font-bold mb-1">
                              🔬 Tehnic:
                            </span>{" "}
                            Fiecare bară reprezintă o componentă principală.
                            Componentele cu eigenvalue {">"} 1 (linia roșie
                            Kaiser) rețin mai multă informație decât o variabilă
                            originală. Criteriul Kaiser reține{" "}
                            <strong className="text-white">
                              {pcaData.kaiserComponents}
                            </strong>{" "}
                            componente, Cattell (cotitură) sugerează{" "}
                            <strong className="text-white">
                              {pcaData.cattellComponents}
                            </strong>
                            . Primele 2 componente explică{" "}
                            <strong className="text-white">
                              {pcaData.cumulativeVariance?.[1]}%
                            </strong>{" "}
                            din varianța totală.
                          </p>
                        </div>
                        <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                              💡 Pe scurt:
                            </span>{" "}
                            Acest grafic arată câte „dimensiuni" contează cu
                            adevărat. Fiecare bară e o dimensiune – cele mai
                            înalte capturează cele mai multe diferențe între
                            mașini. Practic, din{" "}
                            {pcaData.eigenvalues?.length || 7} criterii, doar{" "}
                            <strong className="text-white">
                              {pcaData.kaiserComponents}
                            </strong>{" "}
                            sunt cu adevărat importante pentru a distinge
                            mașinile între ele.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PCA Scatter + Correlation Circle */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {pcaData.charts?.scatterPlot && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            scatter_plot
                          </span>
                          Mașini pe C1 vs C2
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${pcaData.charts.scatterPlot}`}
                            alt="PCA Scatter C1 vs C2"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#895af6]/5 rounded-lg p-4 border border-[#895af6]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#895af6] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Fiecare punct violet = o mașină, steaua teal ={" "}
                              <strong className="text-[#2DD4BF]">
                                preferințele tale
                              </strong>{" "}
                              proiectate în spațiul componentelor C1 și C2.
                              Distanța euclidiană în acest plan reflectă
                              similaritatea multidimensională.
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              Imaginează-ți o hartă a tuturor mașinilor. Steaua
                              teal ești tu – mașinile cele mai aproape de tine
                              pe hartă sunt cele care se potrivesc cel mai bine
                              cu gusturile tale.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {pcaData.charts?.correlationCircle && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            trip_origin
                          </span>
                          Cercul Corelațiilor
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${pcaData.charts.correlationCircle}`}
                            alt="Cercul Corelațiilor"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#895af6]/5 rounded-lg p-4 border border-[#895af6]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#895af6] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Variabilele aproape de cercul unitar sunt bine
                              reprezentate. Cele în aceeași direcție sunt
                              corelate pozitiv, cele opuse – invers corelate.
                              Unghiul dintre vectori reflectă corelația dintre
                              criterii.
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              Acest cerc arată care criterii „merg împreună". De
                              exemplu, dacă doi vectori pointează în aceeași
                              direcție, mașinile bune la unul tind să fie bune
                              și la celălalt. Vectorii opuși = compromis între
                              cele două criterii.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Corelograma + Comunalități */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {pcaData.charts?.correlogram && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            grid_on
                          </span>
                          Corelograma – Variabile × Componente
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${pcaData.charts.correlogram}`}
                            alt="Corelograma"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#895af6]/5 rounded-lg p-4 border border-[#895af6]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#895af6] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Heatmap-ul arată corelația fiecărei variabile cu
                              fiecare componentă principală. Valorile apropiate
                              de ±1 (roșu/albastru intens) indică o contribuție
                              semnificativă a acelui criteriu la componenta
                              respectivă.
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              Acest tabel colorat arată cât de mult influențează
                              fiecare criteriu (performanță, design etc.)
                              rezultatele analizei. Culorile intense = criteriul
                              contează mult pe acea dimensiune.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {pcaData.charts?.comunalitati && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            data_usage
                          </span>
                          Comunalități Cumulate
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${pcaData.charts.comunalitati}`}
                            alt="Comunalități"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#895af6]/5 rounded-lg p-4 border border-[#895af6]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#895af6] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Comunalitatea = proporția din varianța unei
                              variabile explicată de componentele reținute.
                              Valori &gt; 0.5 indică o bună reprezentare.
                              Criteriile cu comunalitate scăzută pierd
                              informație prin reducerea dimensională.
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              Acest grafic arată cât de bine este „capturat"
                              fiecare criteriu de analiza noastră. Barele mari =
                              criteriul e bine reprezentat și contează în
                              rezultate. Barele mici = analiza pierde ceva din
                              informația acelui criteriu.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──── SUB-TAB: HC ──── */}
              {subTab === "hc" && hcData && (
                <div className="space-y-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#D4AF37]">
                        hub
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Analiza Clusterilor Ierarhici (AC)
                      </h2>
                      <p className="text-xs text-slate-400">
                        Mașinile grupate în clustere similare – metoda Ward
                      </p>
                    </div>
                  </div>

                  {/* Global stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#D4AF37]">
                        {hcData.nrClusteri}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Nr. Clustere Optim
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#2DD4BF]">
                        {hcData.silhouetteGlobal}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Silhouette Global
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#895af6]">
                        {hcData.pasMaxim}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Joncțiune Max.
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#fb7185]">
                        {hcData.valoarePrag}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Prag Joncțiune
                      </p>
                    </div>
                  </div>

                  {/* User's cluster highlight */}
                  <div className="bg-[#2DD4BF]/5 rounded-xl p-5 border border-[#2DD4BF]/20 flex items-center gap-4">
                    <div className="size-14 rounded-xl bg-[#2DD4BF]/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#2DD4BF] text-3xl">
                        person_pin
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        Aparții clusterului:{" "}
                        <span className="text-[#2DD4BF]">
                          {hcData.userClusterLabel}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Bazat pe preferințele tale, mașinile din acest grup sunt
                        cele mai compatibile cu profilul tău.
                      </p>
                    </div>
                  </div>

                  {/* Cluster cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hcData.clusters?.map((cluster) => (
                      <div
                        key={cluster.id}
                        className={`glass-panel rounded-2xl p-5 space-y-4 transition-all
                                            ${cluster.isUserCluster ? "ring-2 ring-[#2DD4BF]/40 bg-[#2DD4BF]/[0.03]" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="size-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: cluster.color + "20" }}
                            >
                              <span
                                className="material-symbols-outlined text-xl"
                                style={{ color: cluster.color }}
                              >
                                hub
                              </span>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">
                                {cluster.label}
                              </h3>
                              <p className="text-[10px] text-slate-500">
                                {cluster.count} mașini
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-sm font-bold"
                              style={{ color: cluster.color }}
                            >
                              Sil: {cluster.silhouette}
                            </p>
                            {cluster.isUserCluster && (
                              <span className="text-[10px] text-[#2DD4BF] font-bold">
                                ✓ CLUSTER-UL TĂU
                              </span>
                            )}
                          </div>
                        </div>
                        <ClusterProfile
                          profile={cluster.profile}
                          activeKeys={activeKeys}
                          color={cluster.color}
                        />
                      </div>
                    ))}
                  </div>

                  {/* ── Grafice HC (matplotlib) ── */}
                  {hcData.charts?.dendrogram && (
                    <div className="glass-panel rounded-2xl p-8">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          account_tree
                        </span>
                        Dendrograma – Metoda Ward
                      </h3>
                      <div className="flex justify-center overflow-x-auto py-4">
                        <img
                          src={`data:image/png;base64,${hcData.charts.dendrogram}`}
                          alt="Dendrograma"
                          className="w-full max-w-[900px] rounded-xl shadow-lg shadow-black/20"
                        />
                      </div>
                      <div className="mt-6 space-y-3">
                        <div className="bg-[#D4AF37]/5 rounded-lg p-4 border border-[#D4AF37]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#D4AF37] font-bold mb-1">
                              🔬 Tehnic:
                            </span>{" "}
                            Dendrograma ilustrează procesul de aglomerare
                            ierarhică. Fiecare frunză = o mașină, iar înălțimea
                            la care se unesc două ramuri = distanța Ward. Linia
                            roșie punctată = pragul optim de tăiere →
                            <strong className="text-white">
                              {" "}
                              {hcData.nrClusteri} clustere
                            </strong>
                            . Grupurile sub prag formează clustere compacte cu
                            caracteristici similare.
                          </p>
                        </div>
                        <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                              💡 Pe scurt:
                            </span>{" "}
                            Gândește-te la un arbore genealogic al mașinilor.
                            Cele care se unesc jos pe arbore sunt foarte
                            asemănătoare. Linia roșie „taie" arborele și creează{" "}
                            <strong className="text-white">
                              {hcData.nrClusteri}
                            </strong>{" "}
                            grupuri – fiecare grup conține mașini cu
                            personalități similare.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {hcData.charts?.silhouette && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            equalizer
                          </span>
                          Silhouette Plot
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${hcData.charts.silhouette}`}
                            alt="Silhouette Plot"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#D4AF37]/5 rounded-lg p-4 border border-[#D4AF37]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#D4AF37] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Coeficientul Silhouette per mașină arată cât de
                              bine se potrivește fiecare în clusterul său.
                              Valori apropiate de 1 = asignare excelentă, ~0 =
                              la limită, negative = posibil clusterul greșit.
                              Media globală:{" "}
                              <strong className="text-white">
                                {hcData.silhouetteGlobal}
                              </strong>
                              .
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              Fiecare bară orizontală = o mașină. Bara lungă =
                              mașina se potrivește bine cu grupul ei. Bara
                              scurtă sau negativă = mașina e la limită între
                              două grupuri. Cu cât barele sunt mai lungi și
                              uniforme, cu atât gruparea e mai bună.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {hcData.charts?.histograms && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            bar_chart
                          </span>
                          Distribuția Variabilelor pe Clustere
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${hcData.charts.histograms}`}
                            alt="Histograme"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#D4AF37]/5 rounded-lg p-4 border border-[#D4AF37]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#D4AF37] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Histogramele arată distribuția valorilor
                              standardizate ale primelor 3 criterii, colorate pe
                              clustere. Suprapunere mică = clustere bine
                              separate pe acel criteriu. Suprapunere mare =
                              criteriul nu diferențiază clusterele.
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              Aceste histograme arată cum se diferențiază
                              grupurile de mașini pe fiecare criteriu. Când
                              culorile nu se suprapun = acel criteriu face
                              diferența clară între grupuri. Când se suprapun
                              mult = mașinile din grupuri diferite sunt similare
                              pe acel criteriu.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cars in user's cluster */}
                  {hcData.cars && (
                    <div className="glass-panel rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                          Mașini din Clusterul Tău ({hcData.userClusterLabel})
                        </h3>
                      </div>
                      <div className="divide-y divide-white/5">
                        {hcData.cars
                          .filter((c) => c.cluster === hcData.userCluster)
                          .map((masina, idx) => (
                            <div
                              key={masina.idMasina}
                              className="flex items-center gap-5 p-4 hover:bg-white/[0.02] transition group"
                            >
                              <span
                                className="text-sm font-bold w-6 text-center"
                                style={{ color: masina.clusterColor }}
                              >
                                #{idx + 1}
                              </span>
                              <div
                                className="size-14 rounded-lg bg-cover bg-center shrink-0"
                                style={{
                                  backgroundImage: `url('${masina.imagine}')`,
                                }}
                              ></div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white group-hover:text-[#2DD4BF] transition truncate">
                                  {masina.marca} {masina.model}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  {masina.an} · {masina.km?.toLocaleString()} km
                                  · {combustibilMap[masina.combustibil]}
                                </p>
                              </div>
                              <span className="text-lg font-bold text-[#D4AF37] font-mono hidden sm:block">
                                €{masina.pret?.toLocaleString()}
                              </span>
                              <span
                                className="text-[10px] px-2 py-1 rounded-full font-bold"
                                style={{
                                  backgroundColor: masina.clusterColor + "20",
                                  color: masina.clusterColor,
                                }}
                              >
                                Sil: {masina.silhouette}
                              </span>
                              <button
                                onClick={() =>
                                  navigate(`/client/masina/${masina.idMasina}`)
                                }
                                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition hidden sm:block"
                              >
                                Detalii
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Retry + Actions */}
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
              Reia Testul
            </button>
            <button
              onClick={() => navigate("/client/catalog")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#895af6] text-white font-bold text-sm hover:bg-[#7a4ae0] transition"
            >
              <span className="material-symbols-outlined text-[18px]">
                inventory_2
              </span>
              Catalog Complet
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default RecomandareAI;
