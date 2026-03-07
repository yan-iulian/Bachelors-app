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
  const [kmeansData, setKmeansData] = useState(null);
  const [anomalyData, setAnomalyData] = useState(null);
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

      // Fetch K-Means (with HC cluster count for comparison) + Anomaly in parallel
      const [kmeans, anomaly] = await Promise.all([
        apiPost("/ai/kmeans", { ...body, nrClusteri_hc: hc.nrClusteri }),
        apiPost("/ai/anomaly", { activeKeys }),
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

      // Enrich KMeans cars
      if (kmeans.cars) {
        kmeans.cars = kmeans.cars.map((m) => ({
          ...m,
          imagine: m.imagine
            ? `${API_URL}${m.imagine}`
            : `https://placehold.co/600x400/2e2249/895af6?text=${encodeURIComponent(m.marca + " " + m.model)}`,
        }));
      }
      // Enrich Anomaly cars
      if (anomaly.cars) {
        anomaly.cars = anomaly.cars.map((m) => ({
          ...m,
          imagine: m.imagine
            ? `${API_URL}${m.imagine}`
            : `https://placehold.co/600x400/2e2249/895af6?text=${encodeURIComponent(m.marca + " " + m.model)}`,
        }));
      }

      setCosineResults(enriched);
      setPcaData(pca);
      setHcData(hc);
      setKmeansData(kmeans);
      setAnomalyData(anomaly);

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
    setKmeansData(null);
    setAnomalyData(null);
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
    {
      key: "anomaly",
      label: "Anomalii & Chilipiruri",
      icon: "local_offer",
      color: "text-[#22c55e]",
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
              ? `${cosineResults.length} mașini analizate – 6 algoritmi: Cosine Similarity, PCA, HC, K-Means, Anomaly Detection, Car DNA`
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

          {/* Info Box – format insights */}
          <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-amber-400">
                  psychology
                </span>
                <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-slate-300">
                  Cum funcționează — 6 Algoritmi
                </span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[
                {
                  icon: "auto_awesome",
                  color: "text-[#2DD4BF]",
                  bg: "bg-[#2DD4BF]/5 border-[#2DD4BF]/15",
                  content: (
                    <>
                      <span className="font-semibold text-[#2DD4BF]">
                        Cosine Similarity
                      </span>{" "}
                      — Calculează similaritatea direcțională ponderată între
                      vectorul tău de preferințe și scorurile fiecărei mașini.
                      Măsoară <em>direcția</em> preferinței, nu magnitudinea.
                    </>
                  ),
                },
                {
                  icon: "scatter_plot",
                  color: "text-[#895af6]",
                  bg: "bg-[#895af6]/5 border-[#895af6]/15",
                  content: (
                    <>
                      <span className="font-semibold text-[#895af6]">
                        ACP (Componente Principale)
                      </span>{" "}
                      — Reduce dimensionalitatea celor {criterii.length}{" "}
                      criterii la 2 componente principale, vizualizând mașinile
                      într-un spațiu 2D. Include Scree Plot și cercul
                      corelațiilor.
                    </>
                  ),
                },
                {
                  icon: "account_tree",
                  color: "text-[#D4AF37]",
                  bg: "bg-[#D4AF37]/5 border-[#D4AF37]/15",
                  content: (
                    <>
                      <span className="font-semibold text-[#D4AF37]">
                        AC (Clustering Ierarhic)
                      </span>{" "}
                      — Grupează mașinile în clustere similare folosind metoda
                      Ward. Identifică grupul cel mai compatibil cu profilul tău
                      și afișează indicii Silhouette.
                    </>
                  ),
                },
                {
                  icon: "hub",
                  color: "text-[#3b82f6]",
                  bg: "bg-[#3b82f6]/5 border-[#3b82f6]/15",
                  content: (
                    <>
                      <span className="font-semibold text-[#3b82f6]">
                        K-Means Clustering
                      </span>{" "}
                      — Alternativă la HC cu determinare K optim prin Elbow
                      Method. Compară calitatea partiției K-Means vs Ward,
                      inclusiv radar centroizi și scatter PCA.
                    </>
                  ),
                },
                {
                  icon: "warning",
                  color: "text-[#ef4444]",
                  bg: "bg-[#ef4444]/5 border-[#ef4444]/15",
                  content: (
                    <>
                      <span className="font-semibold text-[#ef4444]">
                        Anomaly Detection
                      </span>{" "}
                      — Detectează mașini sub- sau supraevaluate comparând
                      calitatea generală vs. preț. Folosește Isolation Forest +
                      Z-Score Value Ratio.
                    </>
                  ),
                },
                {
                  icon: "fingerprint",
                  color: "text-[#22c55e]",
                  bg: "bg-[#22c55e]/5 border-[#22c55e]/15",
                  content: (
                    <>
                      <span className="font-semibold text-[#22c55e]">
                        Car DNA
                      </span>{" "}
                      — Amprenta completă pe 10 dimensiuni a fiecărei mașini,
                      comparată vizual cu media flotei. Disponibilă pe pagina de
                      detalii.
                    </>
                  ),
                },
              ].map((ins, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl p-4 border ${ins.bg}`}
                >
                  <span
                    className={`material-symbols-outlined text-[24px] mt-0.5 shrink-0 ${ins.color}`}
                  >
                    {ins.icon}
                  </span>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {ins.content}
                  </p>
                </div>
              ))}
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
                <button
                  onClick={() => setSubTab("kmeans")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all
                                        ${subTab === "kmeans" ? "bg-[#3b82f6]/20 text-[#3b82f6]" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    bubble_chart
                  </span>
                  K-Means
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

              {/* ──── SUB-TAB: K-MEANS ──── */}
              {subTab === "kmeans" && kmeansData && (
                <div className="space-y-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#3b82f6]">
                        bubble_chart
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        K-Means Clustering
                      </h2>
                      <p className="text-xs text-slate-400">
                        Clustering non-ierarhic cu determinare automată a K
                        optim – comparație cu Ward HC
                      </p>
                    </div>
                  </div>

                  {/* Global KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#3b82f6]">
                        {kmeansData.nrClusteri}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">K Optim</p>
                      <p className="text-[10px] text-slate-500">
                        Silhouette max
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#2DD4BF]">
                        {kmeansData.silhouetteGlobal}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Silhouette Global
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#895af6]">
                        {kmeansData.kOptimalElbow}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">K (Elbow)</p>
                      <p className="text-[10px] text-slate-500">
                        derivata a 2-a
                      </p>
                    </div>
                    <div className="glass-panel rounded-xl p-4 text-center">
                      <p className="text-3xl font-bold text-[#D4AF37]">
                        {kmeansData.kOptimalSilhouette}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        K (Silhouette)
                      </p>
                      <p className="text-[10px] text-slate-500">scor maxim</p>
                    </div>
                  </div>

                  {/* User cluster */}
                  <div className="bg-[#3b82f6]/5 rounded-xl p-5 border border-[#3b82f6]/20 flex items-center gap-4">
                    <div className="size-14 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#3b82f6] text-3xl">
                        person_pin
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        Aparții clusterului:{" "}
                        <span className="text-[#3b82f6]">
                          {kmeansData.userClusterLabel}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        K-Means te-a asignat bazat pe distanța euclidiană la
                        centroizii celor {kmeansData.nrClusteri} clustere.
                      </p>
                    </div>
                  </div>

                  {/* Comparație HC vs K-Means */}
                  {kmeansData.comparatie && (
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          compare
                        </span>
                        Comparație: Ward HC vs K-Means
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#D4AF37]/5 rounded-xl p-4 border border-[#D4AF37]/10 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                            Ward HC ({kmeansData.comparatie.hcClusters}{" "}
                            clustere)
                          </p>
                          <p className="text-2xl font-bold text-[#D4AF37]">
                            {kmeansData.comparatie.hcSilhouette}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Silhouette
                          </p>
                        </div>
                        <div className="bg-[#3b82f6]/5 rounded-xl p-4 border border-[#3b82f6]/10 text-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                            K-Means ({kmeansData.comparatie.kmClusters}{" "}
                            clustere)
                          </p>
                          <p className="text-2xl font-bold text-[#3b82f6]">
                            {kmeansData.comparatie.kmSilhouette}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Silhouette
                          </p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center flex flex-col justify-center">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                            Câștigător
                          </p>
                          <p className="text-lg font-bold text-[#2DD4BF]">
                            {kmeansData.comparatie.winner}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            La K respectiv al fiecăruia
                          </p>
                        </div>
                      </div>
                      <div className="bg-[#3b82f6]/5 rounded-lg p-3 border border-[#3b82f6]/10">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          <span className="text-[#3b82f6] font-bold">
                            📊 La aceeași K={kmeansData.comparatie.hcClusters}:
                          </span>{" "}
                          K-Means Sil={kmeansData.comparatie.kmAtHcK_Sil} vs HC
                          Sil={kmeansData.comparatie.hcSilhouette}→{" "}
                          <strong className="text-white">
                            {kmeansData.comparatie.winnerAtSameK}
                          </strong>{" "}
                          produce partiții mai compacte.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cluster cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {kmeansData.clusters?.map((cluster) => (
                      <div
                        key={cluster.id}
                        className={`glass-panel rounded-2xl p-5 space-y-4 transition-all
                          ${cluster.isUserCluster ? "ring-2 ring-[#3b82f6]/40 bg-[#3b82f6]/[0.03]" : ""}`}
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
                                bubble_chart
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
                              <span className="text-[10px] text-[#3b82f6] font-bold">
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

                  {/* ── Grafice K-Means ── */}
                  {kmeansData.charts?.elbow && (
                    <div className="glass-panel rounded-2xl p-8">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          show_chart
                        </span>
                        Elbow Plot – Inerție & Silhouette vs K
                      </h3>
                      <div className="flex justify-center py-4">
                        <img
                          src={`data:image/png;base64,${kmeansData.charts.elbow}`}
                          alt="Elbow Plot"
                          className="w-full max-w-[800px] rounded-xl shadow-lg shadow-black/20"
                        />
                      </div>
                      <div className="mt-6 space-y-3">
                        <div className="bg-[#3b82f6]/5 rounded-lg p-4 border border-[#3b82f6]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#3b82f6] font-bold mb-1">
                              🔬 Tehnic:
                            </span>{" "}
                            Graficul arată inerția (WCSS – suma distanțelor
                            intra-cluster) și coeficientul Silhouette pentru
                            fiecare K de la 2 la 8. Punctul roșu marchează K
                            optim ={" "}
                            <strong className="text-white">
                              {kmeansData.nrClusteri}
                            </strong>
                            . Metoda Elbow caută „cotul" unde scăderea inerției
                            devine mai lentă.
                          </p>
                        </div>
                        <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                              💡 Pe scurt:
                            </span>{" "}
                            Curba violet arată cât de „strânse" sunt grupurile —
                            scade rapid la început, apoi se aplatizează. Punctul
                            unde se oprește scăderea bruscă (cotul) = nr. optim
                            de grupuri. Linia teal arată calitatea separării —
                            mai sus = grupuri mai distincte.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {kmeansData.charts?.scatter && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            scatter_plot
                          </span>
                          Scatter PCA – Clustere K-Means
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${kmeansData.charts.scatter}`}
                            alt="K-Means Scatter"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#3b82f6]/5 rounded-lg p-4 border border-[#3b82f6]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#3b82f6] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Mașinile proiectate pe primele 2 componente
                              principale (PCA), colorate după clusterul K-Means.
                              Romburile = centroizii clusterelor. Steaua teal =
                              preferințele tale. Componentele explică{" "}
                              <strong className="text-white">
                                {kmeansData.pcaExplained?.[0]}% +{" "}
                                {kmeansData.pcaExplained?.[1]}%
                              </strong>{" "}
                              din varianță.
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              O hartă 2D a tuturor mașinilor, colorate pe
                              grupuri. Romburile sunt „centrul" fiecărui grup.
                              Steaua ești tu — grupul care te conține este cel
                              mai compatibil cu gusturile tale.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {kmeansData.charts?.radarCentroids && (
                      <div className="glass-panel rounded-2xl p-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">
                            target
                          </span>
                          Radar Centroizi K-Means
                        </h3>
                        <div className="flex justify-center py-3">
                          <img
                            src={`data:image/png;base64,${kmeansData.charts.radarCentroids}`}
                            alt="Radar Centroizi"
                            className="w-full rounded-xl shadow-lg shadow-black/20"
                          />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="bg-[#3b82f6]/5 rounded-lg p-4 border border-[#3b82f6]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#3b82f6] font-bold mb-1">
                                🔬 Tehnic:
                              </span>{" "}
                              Radarul suprapune profilurile medii (centroizii)
                              ale fiecărui cluster, cu preferințele tale (steaua
                              teal cu linie punctată). Fiecare axă = media unui
                              criteriu pe scara originală (0-10).
                            </p>
                          </div>
                          <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                                💡 Pe scurt:
                              </span>{" "}
                              Fiecare formă colorată = „personalitatea" unui
                              grup de mașini. Linia ta punctată arată ce cauți —
                              grupul cu forma cea mai asemănătoare cu a ta e cel
                              mai potrivit.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {kmeansData.charts?.silhouette && (
                    <div className="glass-panel rounded-2xl p-8">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">
                          equalizer
                        </span>
                        Silhouette Plot – K-Means
                      </h3>
                      <div className="flex justify-center py-3">
                        <img
                          src={`data:image/png;base64,${kmeansData.charts.silhouette}`}
                          alt="K-Means Silhouette"
                          className="w-full max-w-[800px] rounded-xl shadow-lg shadow-black/20"
                        />
                      </div>
                      <div className="mt-6 space-y-3">
                        <div className="bg-[#3b82f6]/5 rounded-lg p-4 border border-[#3b82f6]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#3b82f6] font-bold mb-1">
                              🔬 Tehnic:
                            </span>{" "}
                            Identic cu Silhouette Plot-ul HC, dar pe clustere
                            K-Means. Media globală:{" "}
                            <strong className="text-white">
                              {kmeansData.silhouetteGlobal}
                            </strong>
                            . Compară cu HC Silhouette pentru a vedea care
                            partiție produce grupuri mai compacte.
                          </p>
                        </div>
                        <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                              💡 Pe scurt:
                            </span>{" "}
                            Barele arată cât de bine „se simte" fiecare mașină
                            în grupul ei. Cu cât e mai uniform și lung, cu atât
                            K-Means a făcut o treabă mai bună.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cars in user's KMeans cluster */}
                  {kmeansData.cars && (
                    <div className="glass-panel rounded-2xl overflow-hidden">
                      <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                          Mașini din Clusterul Tău (
                          {kmeansData.userClusterLabel})
                        </h3>
                      </div>
                      <div className="divide-y divide-white/5">
                        {kmeansData.cars
                          .filter((c) => c.cluster === kmeansData.userCluster)
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
                                <h4 className="text-sm font-bold text-white group-hover:text-[#3b82f6] transition truncate">
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

          {/* ── TAB 3: Anomaly Detection ── */}
          {activeTab === "anomaly" && anomalyData && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#22c55e]">
                    local_offer
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Anomaly Detection – Chilipiruri & Supraevaluate
                  </h2>
                  <p className="text-xs text-slate-400">
                    Isolation Forest + Z-Score Value Ratio pe{" "}
                    {anomalyData.totalCars} mașini
                  </p>
                </div>
              </div>

              {/* Info banner */}
              <div className="bg-[#22c55e]/5 rounded-xl p-4 border border-[#22c55e]/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#22c55e] text-xl mt-0.5">
                  psychology
                </span>
                <div>
                  <p className="text-sm font-bold text-[#22c55e] mb-1">
                    Cum funcționează?
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Algoritmul Isolation Forest izolează punctele atipice
                    (anomalii) dintr-un set de date construind arbori de decizie
                    aleatori. Mașinile izolate rapid = anomalii. Apoi, Z-Score
                    Value Ratio compară calitatea generală (media criteriilor)
                    cu prețul normalizat — un ratio pozitiv mare ={" "}
                    <strong className="text-[#22c55e]">chilipir</strong>{" "}
                    (calitate bună, preț mic), un ratio negativ mare ={" "}
                    <strong className="text-[#ef4444]">supraevaluată</strong>{" "}
                    (preț mare, calitate sub așteptări).
                  </p>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="glass-panel rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-[#22c55e]">
                    {anomalyData.nChilipir}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Chilipiruri</p>
                  <p className="text-[10px] text-[#22c55e]">calitate/preț ↑</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-[#ef4444]">
                    {anomalyData.nSupraevaluat}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supraevaluate</p>
                  <p className="text-[10px] text-[#ef4444]">preț/calitate ↑</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-[#f59e0b]">
                    {anomalyData.nOutlier}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Outliers</p>
                  <p className="text-[10px] text-[#f59e0b]">atipice</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white">
                    {anomalyData.avgQuality}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Quality Mediu</p>
                  <p className="text-[10px] text-slate-500">din 10</p>
                </div>
                <div className="glass-panel rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-[#D4AF37]">
                    €{Math.round(anomalyData.medianPrice / 1000)}k
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Preț Median</p>
                  <p className="text-[10px] text-slate-500">flotă</p>
                </div>
              </div>

              {/* Anomaly car cards */}
              {anomalyData.cars?.filter((c) => c.anomalyType !== "normal")
                .length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">
                      flag
                    </span>
                    Mașini Detectate ca Anomalii
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {anomalyData.cars
                      .filter((c) => c.anomalyType !== "normal")
                      .map((masina) => (
                        <div
                          key={masina.idMasina}
                          className={`glass-panel rounded-2xl overflow-hidden group hover:border-white/20 transition-all
                          ${
                            masina.anomalyType === "chilipir"
                              ? "ring-1 ring-[#22c55e]/30"
                              : masina.anomalyType === "supraevaluat"
                                ? "ring-1 ring-[#ef4444]/30"
                                : "ring-1 ring-[#f59e0b]/30"
                          }`}
                        >
                          <div className="flex items-stretch">
                            <div
                              className="w-28 shrink-0 bg-cover bg-center"
                              style={{
                                backgroundImage: `url('${masina.imagine}')`,
                              }}
                            ></div>
                            <div className="flex-1 p-4 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-white truncate">
                                  {masina.marca} {masina.model}
                                </h4>
                                <span
                                  className="text-[10px] px-2.5 py-1 rounded-full font-bold shrink-0"
                                  style={{
                                    backgroundColor: masina.anomalyColor + "20",
                                    color: masina.anomalyColor,
                                  }}
                                >
                                  {masina.anomalyLabel}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {masina.an} · {masina.km?.toLocaleString()} km ·{" "}
                                {combustibilMap[masina.combustibil]}
                              </p>
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="text-[10px] text-slate-500">
                                    Preț
                                  </p>
                                  <p className="text-sm font-bold text-[#D4AF37]">
                                    €{masina.pret?.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">
                                    Quality
                                  </p>
                                  <p className="text-sm font-bold text-[#2DD4BF]">
                                    {masina.qualityScore}/10
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">
                                    Value Ratio
                                  </p>
                                  <p
                                    className={`text-sm font-bold ${masina.valueRatio > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                                  >
                                    {masina.valueRatio > 0 ? "+" : ""}
                                    {masina.valueRatio}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  navigate(`/client/masina/${masina.idMasina}`)
                                }
                                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition flex items-center gap-1 w-fit"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  visibility
                                </span>{" "}
                                Detalii
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── Grafice Anomaly ── */}
              {anomalyData.charts?.scatterQualityPrice && (
                <div className="glass-panel rounded-2xl p-8">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">
                      scatter_plot
                    </span>
                    Scatter – Calitate vs. Preț
                  </h3>
                  <div className="flex justify-center py-4">
                    <img
                      src={`data:image/png;base64,${anomalyData.charts.scatterQualityPrice}`}
                      alt="Quality vs Price"
                      className="w-full max-w-[900px] rounded-xl shadow-lg shadow-black/20"
                    />
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="bg-[#22c55e]/5 rounded-lg p-4 border border-[#22c55e]/10">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <span className="inline-flex items-center gap-1 text-[#22c55e] font-bold mb-1">
                          🔬 Tehnic:
                        </span>{" "}
                        Fiecare punct = o mașină. Axa X = prețul, axa Y = scorul
                        de calitate mediu. Diamantele verzi = chilipiruri
                        (calitate peste linia trendului la preț mic).
                        Triunghiurile roșii = supraevaluate. Linia punctată
                        violet = trendul liniar calitate-preț.
                      </p>
                    </div>
                    <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                          💡 Pe scurt:
                        </span>{" "}
                        Punctele verzi sunt mașini cu un raport calitate/preț
                        excelent — „best deals" din flotă. Punctele roșii sunt
                        mașini care costă mai mult decât ar justifica calitatea
                        lor. Cele neutre sunt în intervalul normal.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {anomalyData.charts?.valueRatioDistribution && (
                  <div className="glass-panel rounded-2xl p-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">
                        show_chart
                      </span>
                      Value Ratio Distribution
                    </h3>
                    <div className="flex justify-center py-3">
                      <img
                        src={`data:image/png;base64,${anomalyData.charts.valueRatioDistribution}`}
                        alt="Value Ratio"
                        className="w-full rounded-xl shadow-lg shadow-black/20"
                      />
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="bg-[#22c55e]/5 rounded-lg p-4 border border-[#22c55e]/10">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          <span className="inline-flex items-center gap-1 text-[#22c55e] font-bold mb-1">
                            🔬 Tehnic:
                          </span>{" "}
                          Value Ratio = Z(quality) − Z(preț). Puncte deasupra
                          pragului verde sunt chilipiruri, sub pragul roșu sunt
                          supraevaluate. Isolation Forest marchează anomaliile
                          independent de ratio.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {anomalyData.charts?.boxPlotCriteria && (
                  <div className="glass-panel rounded-2xl p-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">
                        candlestick_chart
                      </span>
                      Box Plot – Criteriile per Tip
                    </h3>
                    <div className="flex justify-center py-3">
                      <img
                        src={`data:image/png;base64,${anomalyData.charts.boxPlotCriteria}`}
                        alt="Box Plot"
                        className="w-full rounded-xl shadow-lg shadow-black/20"
                      />
                    </div>
                    <div className="mt-6 space-y-3">
                      <div className="bg-[#22c55e]/5 rounded-lg p-4 border border-[#22c55e]/10">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          <span className="inline-flex items-center gap-1 text-[#22c55e] font-bold mb-1">
                            💡 Pe scurt:
                          </span>{" "}
                          Compară scorurile pe fiecare criteriu între mașinile
                          chilipir, normale și supraevaluate. Chilipirurile tind
                          să aibă scoruri mari la mai multe criterii, în ciuda
                          prețului redus.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {anomalyData.charts?.isoScoreDistribution && (
                <div className="glass-panel rounded-2xl p-8">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">
                      forest
                    </span>
                    Isolation Forest – Distribuția Scorurilor
                  </h3>
                  <div className="flex justify-center py-3">
                    <img
                      src={`data:image/png;base64,${anomalyData.charts.isoScoreDistribution}`}
                      alt="Isolation Forest Scores"
                      className="w-full max-w-[800px] rounded-xl shadow-lg shadow-black/20"
                    />
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="bg-[#22c55e]/5 rounded-lg p-4 border border-[#22c55e]/10">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <span className="inline-flex items-center gap-1 text-[#22c55e] font-bold mb-1">
                          🔬 Tehnic:
                        </span>{" "}
                        Histograma scorurilor de anomalie ale Isolation Forest.
                        Scoruri sub pragul roșu = anomalii detectate. Cu cât
                        scorul e mai negativ, cu atât mașina e mai „atipică"
                        față de restul flotei. Contamination ratio setat la 15%
                        din total.
                      </p>
                    </div>
                    <div className="bg-[#2DD4BF]/5 rounded-lg p-4 border border-[#2DD4BF]/10">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <span className="inline-flex items-center gap-1 text-[#2DD4BF] font-bold mb-1">
                          💡 Pe scurt:
                        </span>{" "}
                        Mașinile „normale" sunt grupate în partea dreaptă (scor
                        mare). Cele diferite se separă spre stânga. E ca un
                        filtru care izolează mașinile care „nu se potrivesc" cu
                        restul — fie sunt prea ieftine pentru calitatea lor
                        (chilipir!), fie prea scumpe.
                      </p>
                    </div>
                  </div>
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
