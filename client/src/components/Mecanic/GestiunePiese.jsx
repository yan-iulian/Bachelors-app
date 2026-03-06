import { useState, useEffect } from "react";
import { apiGet, apiPut } from "../../config/apiHelper";

function GestiunePiese() {
  const [allPiese, setAllPiese] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [categorieActiva, setCategorieActiva] = useState("Toate");
  const [stocFilter, setStocFilter] = useState("Toate");
  const [sortBy, setSortBy] = useState("denumire");
  const [selectedPiesa, setSelectedPiesa] = useState(null);
  const [showComandaModal, setShowComandaModal] = useState(false);
  const [comandaFurnizor, setComandaFurnizor] = useState(null);
  const [comandaCantitate, setComandaCantitate] = useState(1);
  const [comandaTrimisa, setComandaTrimisa] = useState(false);

  // Fetch piese din API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiGet("/api/piese");
        setAllPiese(data);
      } catch (err) {
        setError("Eroare la încărcarea pieselor.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Deduplicare: o singură intrare per denumire (cea cu cel mai mic preț)
  const pieseUnice = Object.values(
    allPiese.reduce((acc, p) => {
      if (!acc[p.denumire] || p.pret < acc[p.denumire].pret) {
        acc[p.denumire] = { ...p, nrFurnizori: 0 };
      }
      return acc;
    }, {}),
  );
  allPiese.forEach((p) => {
    const unic = pieseUnice.find((u) => u.denumire === p.denumire);
    if (unic) unic.nrFurnizori++;
  });

  const piese = pieseUnice;
  const categorii = [...new Set(allPiese.map((p) => p.categorie))];

  // Furnizori disponibili pentru piesa selectată
  const furnizoriPiesa = selectedPiesa
    ? allPiese.filter((p) => p.denumire === selectedPiesa.denumire)
    : [];

  const deschideComanda = () => {
    setComandaFurnizor(null);
    setComandaCantitate(1);
    setComandaTrimisa(false);
    setShowComandaModal(true);
  };

  const trimiteComanda = async () => {
    if (!comandaFurnizor) return;
    try {
      const newStoc = (comandaFurnizor.stoc || 0) + comandaCantitate;
      await apiPut(`/api/piese/${comandaFurnizor.idPiesa}`, { stoc: newStoc });
      // Refresh piese din API
      const data = await apiGet("/api/piese");
      setAllPiese(data);
      setComandaTrimisa(true);
      setTimeout(() => {
        setShowComandaModal(false);
        setComandaTrimisa(false);
        // Refresh selected piesa panel
        if (selectedPiesa) {
          const updated = data.find((p) => p.idPiesa === selectedPiesa.idPiesa);
          if (updated)
            setSelectedPiesa({
              ...updated,
              nrFurnizori: selectedPiesa.nrFurnizori,
            });
        }
      }, 1500);
    } catch (e) {
      console.error("Eroare la trimiterea comenzii:", e);
      setComandaTrimisa(false);
    }
  };

  // ── Filtrare ──
  const pieseFiltrate = piese
    .filter((p) => {
      if (categorieActiva !== "Toate" && p.categorie !== categorieActiva)
        return false;
      if (stocFilter === "In Stoc" && p.stoc === 0) return false;
      if (stocFilter === "Stoc Scăzut" && p.stoc > 3) return false;
      if (stocFilter === "Lipsă" && p.stoc !== 0) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.denumire.toLowerCase().includes(q) ||
          p.categorie.toLowerCase().includes(q) ||
          p.compatibilitate.toLowerCase().includes(q) ||
          p.furnizorNume.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "denumire") return a.denumire.localeCompare(b.denumire);
      if (sortBy === "pret-asc") return a.pret - b.pret;
      if (sortBy === "pret-desc") return b.pret - a.pret;
      if (sortBy === "stoc") return a.stoc - b.stoc;
      return 0;
    });

  const stocBadge = (stoc) => {
    if (stoc === 0)
      return {
        label: "Lipsă",
        cls: "bg-red-500/10 text-red-400 border-red-500/20",
      };
    if (stoc <= 3)
      return {
        label: "Stoc Scăzut",
        cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    return {
      label: "In Stoc",
      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  };

  // KPI-uri
  const totalPiese = piese.length;
  const valoareTotala = piese.reduce((s, p) => s + p.pret * p.stoc, 0);
  const stocZero = piese.filter((p) => p.stoc === 0).length;
  const stocScazut = piese.filter((p) => p.stoc > 0 && p.stoc <= 3).length;

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
    <div className="min-h-screen bg-[#151022] pt-20 px-6 pb-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Gestiune Piese</h1>
        <p className="text-gray-400 text-sm">
          Inventar piese, stoc și furnizori
        </p>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Piese",
            value: totalPiese,
            icon: "inventory_2",
            color: "text-[#895af6]",
          },
          {
            label: "Valoare Stoc",
            value: `€${(valoareTotala / 1000).toFixed(0)}k`,
            icon: "payments",
            color: "text-emerald-400",
          },
          {
            label: "Stoc Zero",
            value: stocZero,
            icon: "error",
            color: "text-red-400",
          },
          {
            label: "Stoc Scăzut",
            value: stocScazut,
            icon: "warning",
            color: "text-amber-400",
          },
        ].map((k, i) => (
          <div key={i} className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`material-symbols-outlined text-2xl ${k.color}`}>
                {k.icon}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-slate-400 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl p-4 mb-6 space-y-4">
        {/* Row 1: Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-[18px]">
                search
              </span>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută piesă, categorie, compatibilitate..."
              className="block w-full p-2.5 pl-10 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-500 outline-none"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white outline-none cursor-pointer shrink-0"
          >
            <option value="denumire" className="bg-[#1a1333] text-white">
              Nume A-Z
            </option>
            <option value="pret-asc" className="bg-[#1a1333] text-white">
              Preț ↑
            </option>
            <option value="pret-desc" className="bg-[#1a1333] text-white">
              Preț ↓
            </option>
            <option value="stoc" className="bg-[#1a1333] text-white">
              Stoc ↑
            </option>
          </select>
        </div>

        {/* Row 2: Categorie filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Categorie:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {["Toate", ...categorii].map((c) => (
              <button
                key={c}
                onClick={() => setCategorieActiva(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  categorieActiva === c
                    ? "bg-[#895af6] text-white border-[#895af6]"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Stoc filters */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Stoc:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {["Toate", "In Stoc", "Stoc Scăzut", "Lipsă"].map((s) => (
              <button
                key={s}
                onClick={() => setStocFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  stocFilter === s
                    ? "bg-[#895af6] text-white border-[#895af6]"
                    : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="max-w-7xl mx-auto mb-4 text-sm text-slate-400">
        {pieseFiltrate.length} piese din {piese.length} afișate
      </div>

      {/* Table + Detail split */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden lg:max-h-[calc(100vh-20rem)]">
          <div
            className="overflow-x-auto overflow-y-auto lg:max-h-[calc(100vh-20rem)]"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#895af6 transparent",
            }}
          >
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-200 uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Denumire</th>
                  <th className="px-6 py-4">Categorie</th>
                  <th className="px-6 py-4">Compatibilitate</th>
                  <th className="px-6 py-4 text-center">Stoc</th>
                  <th className="px-6 py-4 text-right">Preț</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pieseFiltrate.map((p) => {
                  const badge = stocBadge(p.stoc);
                  const isSelected = selectedPiesa?.idPiesa === p.idPiesa;
                  return (
                    <tr
                      key={p.idPiesa}
                      onClick={() => setSelectedPiesa(p)}
                      className={`cursor-pointer transition ${isSelected ? "bg-[#895af6]/10" : "hover:bg-white/[0.03]"}`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">
                          {p.denumire}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {p.categorie}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {p.compatibilitate}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.cls}`}
                        >
                          {p.stoc === 0 ? badge.label : p.stoc}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white">
                        €{p.pret.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                {pieseFiltrate.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <span className="material-symbols-outlined text-4xl mb-2 block">
                        search_off
                      </span>
                      Nicio piesă găsită.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div
          className="glass-panel rounded-2xl p-6 flex flex-col lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-20rem)] lg:overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#895af6 transparent",
          }}
        >
          {selectedPiesa ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-12 rounded-xl bg-[#895af6]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#895af6] text-2xl">
                    build
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedPiesa.denumire}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedPiesa.categorie}
                  </p>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">Preț (de la)</p>
                    <p className="text-lg font-bold text-white font-mono">
                      €{selectedPiesa.pret.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-1">Stoc Total</p>
                    <p
                      className={`text-lg font-bold ${furnizoriPiesa.reduce((s, p) => s + p.stoc, 0) === 0 ? "text-red-400" : furnizoriPiesa.reduce((s, p) => s + p.stoc, 0) <= 3 ? "text-amber-400" : "text-emerald-400"}`}
                    >
                      {furnizoriPiesa.reduce((s, p) => s + p.stoc, 0)} buc
                    </p>
                  </div>
                </div>

                <div className="bg-white/[0.03] rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Compatibilitate</p>
                  <p className="text-sm text-white font-medium">
                    {selectedPiesa.compatibilitate}
                  </p>
                </div>

                {/* Lista furnizori */}
                <div>
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">
                      store
                    </span>
                    {furnizoriPiesa.length}{" "}
                    {furnizoriPiesa.length === 1
                      ? "furnizor disponibil"
                      : "furnizori disponibili"}
                  </p>
                  <div className="space-y-2">
                    {furnizoriPiesa.map((f) => (
                      <div
                        key={f.idPiesa}
                        className="bg-white/[0.03] rounded-xl p-3 flex items-center gap-3 border border-white/5"
                      >
                        <div className="size-8 rounded-full bg-white flex items-center justify-center text-[#151022] font-bold text-xs shrink-0">
                          {f.furnizorNume.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {f.furnizorNume}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="font-mono">
                              €{f.pret.toLocaleString()}
                            </span>
                            <span>•</span>
                            <span
                              className={
                                f.stoc === 0
                                  ? "text-red-400"
                                  : f.stoc <= 3
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                              }
                            >
                              {f.stoc === 0 ? "Lipsă" : `${f.stoc} buc`}
                            </span>
                            <span>•</span>
                            <span>{f.timpLivrareOre}h</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={deschideComanda}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#895af6] text-white font-bold text-sm hover:bg-[#7a4de0] transition shadow-lg hover:shadow-[#895af6]/20"
              >
                <span className="material-symbols-outlined">shopping_cart</span>
                Comandă Piesă
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">
                touch_app
              </span>
              <p className="text-slate-400 text-sm">
                Selectează o piesă din tabel pentru a vedea detaliile
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Modal Comandă — Alege Furnizor ═══ */}
      {showComandaModal && selectedPiesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowComandaModal(false)}
          ></div>
          <div className="relative glass-panel rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-white/10">
            {/* Close */}
            <button
              onClick={() => setShowComandaModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {comandaTrimisa ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center py-8">
                <div className="size-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-emerald-400 text-4xl">
                    check_circle
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Comandă Trimisă!
                </h3>
                <p className="text-sm text-slate-400 text-center">
                  {comandaCantitate}x {selectedPiesa.denumire} de la{" "}
                  <span className="text-white font-medium">
                    {comandaFurnizor?.furnizorNume}
                  </span>
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#895af6]">
                      shopping_cart
                    </span>
                    Comandă Piesă
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedPiesa.denumire} — {selectedPiesa.categorie}
                  </p>
                </div>

                {/* Cantitate */}
                <div className="mb-6">
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Cantitate
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setComandaCantitate((prev) => Math.max(1, prev - 1))
                      }
                      className="size-10 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <span className="text-xl font-bold text-white w-12 text-center">
                      {comandaCantitate}
                    </span>
                    <button
                      onClick={() => setComandaCantitate((prev) => prev + 1)}
                      className="size-10 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                {/* Lista furnizori */}
                <div className="mb-6">
                  <label className="text-sm font-semibold text-slate-300 mb-3 block">
                    Alege Furnizor ({furnizoriPiesa.length} disponibili)
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {furnizoriPiesa.map((f) => {
                      const isChosen = comandaFurnizor?.idPiesa === f.idPiesa;
                      return (
                        <button
                          key={f.idPiesa}
                          onClick={() => setComandaFurnizor(f)}
                          className={`w-full text-left rounded-xl p-4 border transition-all ${
                            isChosen
                              ? "bg-[#895af6]/15 border-[#895af6] shadow-[0_0_15px_rgba(137,90,246,0.15)]"
                              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isChosen ? "bg-[#895af6] text-white" : "bg-white text-[#151022]"}`}
                            >
                              {f.furnizorNume.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white">
                                {f.furnizorNume}
                              </p>
                              <p className="text-xs text-slate-400">
                                {f.furnizorTelefon}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-white font-mono">
                                €{f.pret.toLocaleString()}
                              </p>
                              <div className="flex items-center gap-2 justify-end text-xs mt-0.5">
                                <span
                                  className={
                                    f.stoc === 0
                                      ? "text-red-400"
                                      : f.stoc <= 3
                                        ? "text-amber-400"
                                        : "text-emerald-400"
                                  }
                                >
                                  {f.stoc === 0
                                    ? "Lipsă stoc"
                                    : `${f.stoc} în stoc`}
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[12px]">
                                    local_shipping
                                  </span>{" "}
                                  {f.timpLivrareOre}h
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total + Submit */}
                {comandaFurnizor && (
                  <div className="bg-white/[0.03] rounded-xl p-4 mb-4 flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Total comandă:
                    </span>
                    <span className="text-xl font-bold text-[#895af6] font-mono">
                      €
                      {(
                        comandaFurnizor.pret * comandaCantitate
                      ).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowComandaModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={trimiteComanda}
                    disabled={!comandaFurnizor}
                    className={`flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2 ${
                      comandaFurnizor
                        ? "bg-[#895af6] hover:bg-[#7a4de0] shadow-lg hover:shadow-[#895af6]/20"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      send
                    </span>
                    Trimite Comandă
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GestiunePiese;
