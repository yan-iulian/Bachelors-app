import { useState, useEffect } from "react";
import { apiGet, apiPut, apiPost } from "../../config/apiHelper";

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

const prioStyle = {
  HIGH: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
    label: "URGENT",
  },
  MEDIUM: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    label: "MEDIU",
  },
  LOW: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    label: "SCĂZUT",
  },
};

function EstimariReparatii() {
  const [estimari, setEstimari] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [pretVanzareEdit, setPretVanzareEdit] = useState({});

  const fetchEstimari = async () => {
    try {
      const data = await apiGet("/api/reparatii");
      setEstimari(
        data.map((r) => ({
          id: r.idReparatie,
          masina: r.Masina
            ? {
                marca: r.Masina.marca,
                model: r.Masina.model,
                nrInmatriculare: r.Masina.locParcare || "N/A",
                anFabricatie: r.Masina.anFabricatie,
                km: r.Masina.km,
                combustibil: combustibilMap[r.Masina.combustibil] || "Benzină",
                categorieAuto: categorieMap[r.Masina.categorieAuto] || "Sedan",
              }
            : {
                marca: "—",
                model: "—",
                nrInmatriculare: "N/A",
                anFabricatie: 0,
                km: 0,
                combustibil: "—",
                categorieAuto: "—",
              },
          mecanic: r.mecanic ? `${r.mecanic.nume} ${r.mecanic.prenume}` : "—",
          prioritate: (() => {
            const cost = r.cost || 0;
            const achizitie = r.Masina?.pretEuro || 0;
            const vanzareEst = Math.round(achizitie * 1.25);
            const investitie = achizitie + cost;
            const roi =
              investitie > 0
                ? ((vanzareEst - investitie) / investitie) * 100
                : 0;
            const costRatio = achizitie > 0 ? (cost / achizitie) * 100 : 0;
            if (roi < 0 || costRatio > 30) return "HIGH";
            if (roi > 15 && costRatio < 20) return "LOW";
            return "MEDIUM";
          })(),
          descriereProblema: r.descriereProblema || "",
          pretAchizitie: r.Masina?.pretEuro || 0,
          pretVanzareEstimat: Math.round((r.Masina?.pretEuro || 0) * 1.25),
          costEstimatMecanic: r.cost || 0,
          piese: (r.Piesas || []).map((p) => ({
            nume: p.denumire,
            cantitate: p.PiesaReparatie?.cantitate || 1,
            pret: p.pret || 0,
          })),
          dataEstimare: r.dataInceput
            ? new Date(r.dataInceput).toISOString().split("T")[0]
            : "—",
          statusDecizie:
            r.statusReparatie === 3
              ? null
              : r.statusReparatie === 1 || r.statusReparatie === 2
                ? "aprobat"
                : r.statusReparatie === 4
                  ? "anulat"
                  : "na",
        })),
      );
    } catch (e) {
      console.error("Eroare la încărcarea estimărilor:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimari();
  }, []);

  const detailEst =
    detailId !== null ? estimari.find((e) => e.id === detailId) : null;

  // Indicatori de profitabilitate
  const getIndicatori = (est) => {
    const pretVanzare = pretVanzareEdit[est.id] ?? est.pretVanzareEstimat;
    const investitieTotal = est.pretAchizitie + est.costEstimatMecanic;
    const marjaProfit = pretVanzare - investitieTotal;
    const marjaProcent =
      investitieTotal > 0 ? (marjaProfit / investitieTotal) * 100 : 0;
    const roi = investitieTotal > 0 ? (marjaProfit / investitieTotal) * 100 : 0;
    const raportCostAchizitie =
      est.pretAchizitie > 0
        ? (est.costEstimatMecanic / est.pretAchizitie) * 100
        : 0;
    const raportCostVanzare =
      pretVanzare > 0 ? (est.costEstimatMecanic / pretVanzare) * 100 : 0;
    return [
      {
        label: "Marjă Profit",
        value: `${marjaProfit.toLocaleString()} €`,
        detail: `${marjaProcent.toFixed(1)}% din investiție`,
        isGood: marjaProfit > 0,
        icon: "trending_up",
      },
      {
        label: "ROI",
        value: `${roi.toFixed(1)}%`,
        detail:
          roi >= 15
            ? "Investiție profitabilă"
            : roi >= 0
              ? "Profitabilitate scăzută"
              : "Investiție în pierdere",
        isGood: roi >= 15,
        icon: "monitoring",
      },
      {
        label: "Cost / Achiziție",
        value: `${raportCostAchizitie.toFixed(1)}%`,
        detail:
          raportCostAchizitie < 20
            ? "Cost reparație mic"
            : raportCostAchizitie < 35
              ? "Cost moderat"
              : "Cost mare",
        isGood: raportCostAchizitie < 30,
        icon: "balance",
      },
      {
        label: "Cost / Preț Vânzare",
        value: `${raportCostVanzare.toFixed(1)}%`,
        detail:
          raportCostVanzare < 15
            ? "Impact redus"
            : raportCostVanzare < 25
              ? "Impact moderat"
              : "Impact semnificativ",
        isGood: raportCostVanzare < 20,
        icon: "pie_chart",
      },
    ];
  };

  const handleDecision = (id, action) => {
    setConfirmModal({ id, action });
  };

  const confirmDecision = async () => {
    if (!confirmModal) return;
    const est = estimari.find((e) => e.id === confirmModal.id);
    try {
      const newStatus = confirmModal.action === "aprobat" ? 1 : 4;
      await apiPut(`/api/reparatii/${confirmModal.id}`, {
        statusReparatie: newStatus,
      });
      // Creează notificare pentru Mecanic
      await apiPost("/api/notificari", {
        tip:
          confirmModal.action === "aprobat"
            ? "estimare_acceptata"
            : "estimare_respinsa",
        mesaj:
          confirmModal.action === "aprobat"
            ? `Estimarea de ${est?.costEstimatMecanic?.toLocaleString()} € pentru ${est?.masina?.marca} ${est?.masina?.model} a fost APROBATĂ. Puteți începe reparația.`
            : `Estimarea de ${est?.costEstimatMecanic?.toLocaleString()} € pentru ${est?.masina?.marca} ${est?.masina?.model} a fost RESPINSĂ. Vă rugăm să refaceți estimarea.`,
        idReparatie: confirmModal.id,
        destinatarRol: "Mecanic",
      });
      await fetchEstimari();
    } catch (e) {
      console.error("Eroare la decizie:", e);
    }
    const actionLabel =
      confirmModal.action === "aprobat" ? "aprobată" : "anulată";
    setToast(
      `Reparație ${actionLabel} → ${est?.masina?.marca} ${est?.masina?.model}`,
    );
    setTimeout(() => setToast(null), 3500);
    setConfirmModal(null);
    setDetailId(null);
  };

  const pending = estimari.filter((e) => e.statusDecizie === null);
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Se încarcă estimările...</div>
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
              rate_review
            </span>
            Estimări Reparații
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analizează estimările de cost primite de la mecanici
          </p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-xl">
            <span className="material-symbols-outlined text-amber-400">
              pending_actions
            </span>
            <span className="text-sm font-bold text-amber-400">
              {pending.length} estimări în așteptare
            </span>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Estimări",
            val: estimari.length,
            icon: "rate_review",
            color: "text-[#895af6]",
            bg: "bg-[#895af6]/10",
          },
          {
            label: "În Așteptare",
            val: pending.length,
            icon: "pending_actions",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
          {
            label: "Aprobate",
            val: estimari.filter((e) => e.statusDecizie === "aprobat").length,
            icon: "check_circle",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Anulate",
            val: estimari.filter((e) => e.statusDecizie === "anulat").length,
            icon: "cancel",
            color: "text-red-400",
            bg: "bg-red-500/10",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="glass-panel rounded-xl p-4 flex items-center gap-3"
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

      {/* ── Estimări în Așteptare ── */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400">
              pending_actions
            </span>
            Necesită Decizie
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {pending.map((est) => {
              const indicatori = getIndicatori(est);
              const pr = prioStyle[est.prioritate];
              const allGood = indicatori.every((i) => i.isGood);
              const anyBad = indicatori.some((i) => !i.isGood);
              return (
                <div
                  key={est.id}
                  className="glass-panel rounded-2xl overflow-hidden border border-white/10 hover:border-[#895af6]/30 transition-all cursor-pointer"
                  onClick={() => setDetailId(est.id)}
                >
                  <div className="p-5 space-y-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {est.masina.marca} {est.masina.model}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {est.masina.nrInmatriculare} ·{" "}
                          {est.masina.anFabricatie} ·{" "}
                          {est.masina.km.toLocaleString()} km
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 ${pr.bg} ${pr.text} border ${pr.border} text-[10px] font-bold px-2 py-1 rounded-full`}
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          priority_high
                        </span>
                        {pr.label}
                      </span>
                    </div>

                    {/* Problem */}
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {est.descriereProblema}
                    </p>

                    {/* Financials row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase">
                          Achiziție
                        </p>
                        <p className="text-sm font-bold text-white font-mono">
                          {est.pretAchizitie.toLocaleString()} €
                        </p>
                      </div>
                      <div className="bg-[#895af6]/10 rounded-lg p-3 text-center border border-[#895af6]/20">
                        <p className="text-[10px] text-[#895af6]/70 uppercase">
                          Cost Reparație
                        </p>
                        <p className="text-sm font-bold text-[#895af6] font-mono">
                          {est.costEstimatMecanic.toLocaleString()} €
                        </p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase">
                          Vânzare Est.
                        </p>
                        <p className="text-sm font-bold text-white font-mono">
                          {est.pretVanzareEstimat.toLocaleString()} €
                        </p>
                      </div>
                    </div>

                    {/* Mini indicatori */}
                    <div className="grid grid-cols-4 gap-2">
                      {indicatori.map((ind, i) => (
                        <div
                          key={i}
                          className={`rounded-lg p-2 text-center border ${ind.isGood ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] ${ind.isGood ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {ind.icon}
                          </span>
                          <p
                            className={`text-xs font-bold ${ind.isGood ? "text-emerald-400" : "text-red-400"}`}
                          >
                            {ind.value}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate">
                            {ind.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Overall verdict */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${allGood ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}
                    >
                      <span
                        className={`material-symbols-outlined ${allGood ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {allGood ? "thumb_up" : "warning"}
                      </span>
                      <span
                        className={`text-xs font-bold ${allGood ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {allGood
                          ? "Toți indicatorii sunt favorabili — reparația e profitabilă"
                          : "Atenție — unii indicatori semnalează risc"}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-white/5">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          engineering
                        </span>
                        {est.mecanic}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          calendar_today
                        </span>
                        {est.dataEstimare}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          inventory_2
                        </span>
                        {est.piese.length} piese
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sumar Analize ── */}
      {estimari.length > 0 &&
        (() => {
          // Doar estimări reale (trimise/aprobate/anulate), NU cele "na" (în așteptare fără estimare)
          const estimariReale = estimari.filter(
            (e) => e.statusDecizie !== "na" && e.masina.marca !== "—",
          );
          if (estimariReale.length === 0) return null;
          const allIndicatori = estimariReale.map((est) => {
            const pretVanzare =
              pretVanzareEdit[est.id] ?? est.pretVanzareEstimat;
            const investitie = est.pretAchizitie + est.costEstimatMecanic;
            const marjaProfit = pretVanzare - investitie;
            const roi = investitie > 0 ? (marjaProfit / investitie) * 100 : 0;
            const costRatio =
              est.pretAchizitie > 0
                ? (est.costEstimatMecanic / est.pretAchizitie) * 100
                : 0;
            return {
              ...est,
              roi,
              marjaProfit,
              costRatio,
              investitie,
              pretVanzare,
            };
          });
          const avgRoi =
            allIndicatori.length > 0
              ? allIndicatori.reduce((s, e) => s + e.roi, 0) /
                allIndicatori.length
              : 0;
          const totalInvestment = allIndicatori.reduce(
            (s, e) => s + e.investitie,
            0,
          );
          const totalProfit = allIndicatori.reduce(
            (s, e) => s + e.marjaProfit,
            0,
          );
          const highRisk = estimariReale.filter(
            (e) => e.prioritate === "HIGH",
          ).length;
          const medRisk = estimariReale.filter(
            (e) => e.prioritate === "MEDIUM",
          ).length;
          const lowRisk = estimariReale.filter(
            (e) => e.prioritate === "LOW",
          ).length;
          const bestEst = allIndicatori.reduce(
            (best, e) => (e.roi > (best?.roi ?? -999) ? e : best),
            null,
          );
          const worstEst = allIndicatori.reduce(
            (worst, e) => (e.roi < (worst?.roi ?? 999) ? e : worst),
            null,
          );
          const avgCostRatio =
            allIndicatori.length > 0
              ? allIndicatori.reduce((s, e) => s + e.costRatio, 0) /
                allIndicatori.length
              : 0;

          return (
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
              <div className="p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#895af6]">
                    analytics
                  </span>
                  Sumar Analize Profitabilitate
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Privire de ansamblu asupra tuturor estimărilor din perspectiva
                  rentabilității
                </p>
              </div>

              <div className="p-5 space-y-5">
                {/* Top metrics row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#895af6] text-lg">
                        monitoring
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        ROI Mediu
                      </span>
                    </div>
                    <p
                      className={`text-2xl font-bold font-mono ${avgRoi >= 15 ? "text-emerald-400" : avgRoi >= 0 ? "text-amber-400" : "text-red-400"}`}
                    >
                      {avgRoi.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {avgRoi >= 15
                        ? "Profitabilitate bună"
                        : avgRoi >= 0
                          ? "Profitabilitate moderată"
                          : "Investiții în pierdere"}
                    </p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#895af6] text-lg">
                        account_balance
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Investiție Totală
                      </span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-white">
                      {totalInvestment.toLocaleString()} €
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Achiziție + reparații
                    </p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#895af6] text-lg">
                        trending_up
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Profit Estimat Total
                      </span>
                    </div>
                    <p
                      className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {totalProfit >= 0 ? "+" : ""}
                      {totalProfit.toLocaleString()} €
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Dacă toate se vând la preț estimat
                    </p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[#895af6] text-lg">
                        balance
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Cost / Achiziție Mediu
                      </span>
                    </div>
                    <p
                      className={`text-2xl font-bold font-mono ${avgCostRatio < 20 ? "text-emerald-400" : avgCostRatio < 35 ? "text-amber-400" : "text-red-400"}`}
                    >
                      {avgCostRatio.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {avgCostRatio < 20
                        ? "Costuri de reparație mici"
                        : avgCostRatio < 35
                          ? "Costuri moderate"
                          : "Costuri ridicate"}
                    </p>
                  </div>
                </div>

                {/* Best/Worst + Risk distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Best / Worst */}
                  <div className="space-y-4">
                    {bestEst && (
                      <div
                        className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/15 cursor-pointer hover:border-emerald-500/30 transition"
                        onClick={() => setDetailId(bestEst.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-emerald-400">
                            emoji_events
                          </span>
                          <span className="text-xs font-bold text-emerald-400 uppercase">
                            Cea Mai Profitabilă
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {bestEst.masina.marca} {bestEst.masina.model}
                            </p>
                            <p className="text-xs text-slate-400">
                              {bestEst.mecanic} · {bestEst.dataEstimare}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold font-mono text-emerald-400">
                              +{bestEst.roi.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-slate-500">ROI</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {worstEst && worstEst.id !== bestEst?.id && (
                      <div
                        className="bg-red-500/5 rounded-xl p-4 border border-red-500/15 cursor-pointer hover:border-red-500/30 transition"
                        onClick={() => setDetailId(worstEst.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-red-400">
                            trending_down
                          </span>
                          <span className="text-xs font-bold text-red-400 uppercase">
                            Cel Mai Riscant
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {worstEst.masina.marca} {worstEst.masina.model}
                            </p>
                            <p className="text-xs text-slate-400">
                              {worstEst.mecanic} · {worstEst.dataEstimare}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold font-mono text-red-400">
                              {worstEst.roi.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-slate-500">ROI</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Risk distribution */}
                  <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">
                        shield
                      </span>
                      Distribuție Risc
                    </h4>
                    <div className="space-y-3">
                      {[
                        {
                          label: "Urgent",
                          count: highRisk,
                          color: "red",
                          icon: "error",
                        },
                        {
                          label: "Mediu",
                          count: medRisk,
                          color: "amber",
                          icon: "warning",
                        },
                        {
                          label: "Scăzut",
                          count: lowRisk,
                          color: "emerald",
                          icon: "check_circle",
                        },
                      ].map((r) => {
                        const pct =
                          estimariReale.length > 0
                            ? (r.count / estimariReale.length) * 100
                            : 0;
                        return (
                          <div key={r.label} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`material-symbols-outlined text-${r.color}-400 text-[16px]`}
                                >
                                  {r.icon}
                                </span>
                                <span className="text-sm text-slate-300">
                                  {r.label}
                                </span>
                              </div>
                              <span
                                className={`text-sm font-bold font-mono text-${r.color}-400`}
                              >
                                {r.count}{" "}
                                <span className="text-slate-500 font-normal text-xs">
                                  ({pct.toFixed(0)}%)
                                </span>
                              </span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  r.color === "red"
                                    ? "bg-red-500"
                                    : r.color === "amber"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Insight-uri Automate (standalone) ── */}
                {(() => {
                  const insights = [];
                  const V = ({ children, c }) => (
                    <span className={`font-semibold ${c || "text-white/90"}`}>
                      {children}
                    </span>
                  );

                  // 1. ROI overview
                  const profitable = allIndicatori.filter(
                    (e) => e.roi >= 15,
                  ).length;
                  const moderate = allIndicatori.filter(
                    (e) => e.roi >= 0 && e.roi < 15,
                  ).length;
                  const losing = allIndicatori.filter((e) => e.roi < 0).length;
                  if (profitable === allIndicatori.length) {
                    insights.push({
                      icon: "verified",
                      color: "text-emerald-400",
                      bg: "bg-emerald-500/5 border-emerald-500/15",
                      content: (
                        <>
                          Toate cele <V>{allIndicatori.length}</V> estimări au
                          ROI <V c="text-emerald-400">≥ 15%</V>. Portofoliul e
                          solid.
                        </>
                      ),
                    });
                  } else if (losing > 0) {
                    const lossSum = Math.abs(
                      allIndicatori
                        .filter((e) => e.roi < 0)
                        .reduce((s, e) => s + e.marjaProfit, 0),
                    );
                    insights.push({
                      icon: "warning",
                      color: "text-red-400",
                      bg: "bg-red-500/5 border-red-500/15",
                      content: (
                        <>
                          <V c="text-red-400">{losing}</V> din{" "}
                          {allIndicatori.length} estimări au ROI negativ —
                          investiții în pierdere de{" "}
                          <V c="text-red-400">{lossSum.toLocaleString()} €</V>.
                        </>
                      ),
                    });
                  } else {
                    insights.push({
                      icon: "info",
                      color: "text-cyan-400",
                      bg: "bg-cyan-500/5 border-cyan-500/15",
                      content: (
                        <>
                          ROI mediu portofoliu:{" "}
                          <V c="text-cyan-400">{avgRoi.toFixed(1)}%</V> —{" "}
                          <V>{profitable}</V> estimăr
                          {profitable === 1 ? "e" : "i"} performant
                          {profitable === 1 ? "ă" : "e"} (≥15%) și{" "}
                          <V>{moderate}</V> cu potențial de optimizare.
                        </>
                      ),
                    });
                  }

                  // 2. Cost ratio
                  const criticalRepairs = allIndicatori.filter(
                    (e) => e.costRatio > 30,
                  );
                  const moderateRepairs = allIndicatori.filter(
                    (e) => e.costRatio > 15 && e.costRatio <= 30,
                  );
                  if (criticalRepairs.length > 0) {
                    insights.push({
                      icon: "account_balance",
                      color: "text-red-400",
                      bg: "bg-red-500/5 border-red-500/15",
                      content: (
                        <>
                          <V c="text-red-400">{criticalRepairs.length}</V> mașin
                          {criticalRepairs.length === 1 ? "ă are" : "i au"}{" "}
                          costul reparației <V c="text-red-400">&gt; 30%</V> din
                          achiziție:{" "}
                          {criticalRepairs.map((e, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <V>
                                {e.masina.marca} {e.masina.model}
                              </V>{" "}
                              ({e.costRatio.toFixed(0)}%)
                            </span>
                          ))}
                          .
                        </>
                      ),
                    });
                  } else if (moderateRepairs.length > 0) {
                    insights.push({
                      icon: "account_balance",
                      color: "text-amber-400",
                      bg: "bg-amber-500/5 border-amber-500/15",
                      content: (
                        <>
                          <V c="text-amber-400">{moderateRepairs.length}</V>{" "}
                          mașin{moderateRepairs.length === 1 ? "ă are" : "i au"}{" "}
                          cost reparație între <V c="text-amber-400">15-30%</V>{" "}
                          din achiziție:{" "}
                          {moderateRepairs.map((e, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <V>
                                {e.masina.marca} {e.masina.model}
                              </V>{" "}
                              ({e.costRatio.toFixed(0)}%)
                            </span>
                          ))}
                          .
                        </>
                      ),
                    });
                  } else {
                    insights.push({
                      icon: "savings",
                      color: "text-emerald-400",
                      bg: "bg-emerald-500/5 border-emerald-500/15",
                      content: (
                        <>
                          Costurile de reparație sunt{" "}
                          <V c="text-emerald-400">sub 15%</V> din prețul de
                          achiziție pentru toate mașinile. Raport cost/achiziție
                          mediu: <V>{avgCostRatio.toFixed(1)}%</V>.
                        </>
                      ),
                    });
                  }

                  // 3. Comparație mecanici
                  const byMecanic = {};
                  allIndicatori.forEach((e) => {
                    if (!byMecanic[e.mecanic]) byMecanic[e.mecanic] = [];
                    byMecanic[e.mecanic].push(e);
                  });
                  const mecanicNames = Object.keys(byMecanic).filter(
                    (m) => m !== "—",
                  );
                  if (mecanicNames.length >= 2) {
                    const mecanicAvg = mecanicNames
                      .map((m) => ({
                        nume: m,
                        avgCost:
                          byMecanic[m].reduce(
                            (s, e) => s + e.costEstimatMecanic,
                            0,
                          ) / byMecanic[m].length,
                        count: byMecanic[m].length,
                      }))
                      .sort((a, b) => a.avgCost - b.avgCost);
                    const cheapest = mecanicAvg[0];
                    const priciest = mecanicAvg[mecanicAvg.length - 1];
                    if (priciest.avgCost > cheapest.avgCost * 1.1) {
                      insights.push({
                        icon: "engineering",
                        color: "text-blue-400",
                        bg: "bg-blue-500/5 border-blue-500/15",
                        content: (
                          <>
                            Diferență între mecanici: <V>{cheapest.nume}</V>{" "}
                            estimează în medie{" "}
                            <V c="text-blue-400">
                              {Math.round(cheapest.avgCost).toLocaleString()} €
                            </V>{" "}
                            ({cheapest.count} est.), iar <V>{priciest.nume}</V>{" "}
                            estimează{" "}
                            <V c="text-blue-400">
                              {Math.round(priciest.avgCost).toLocaleString()} €
                            </V>{" "}
                            ({priciest.count} est.).
                          </>
                        ),
                      });
                    } else {
                      const avgAll = Math.round(
                        mecanicAvg.reduce((s, m) => s + m.avgCost, 0) /
                          mecanicAvg.length,
                      );
                      insights.push({
                        icon: "engineering",
                        color: "text-slate-400",
                        bg: "bg-slate-500/5 border-slate-500/15",
                        content: (
                          <>
                            <V>{mecanicNames.length}</V> mecanici activi cu
                            estimări similare (diferență &lt; 10%). Cost mediu:{" "}
                            <V>{avgAll.toLocaleString()} €</V>.
                          </>
                        ),
                      });
                    }
                  } else if (mecanicNames.length === 1) {
                    const m = mecanicNames[0];
                    const mAvg = Math.round(
                      byMecanic[m].reduce(
                        (s, e) => s + e.costEstimatMecanic,
                        0,
                      ) / byMecanic[m].length,
                    );
                    insights.push({
                      icon: "engineering",
                      color: "text-slate-400",
                      bg: "bg-slate-500/5 border-slate-500/15",
                      content: (
                        <>
                          Un singur mecanic activ: <V>{m}</V> cu{" "}
                          <V>{byMecanic[m].length}</V> estimăr
                          {byMecanic[m].length === 1 ? "e" : "i"} și cost mediu
                          de <V>{mAvg.toLocaleString()} €</V>.
                        </>
                      ),
                    });
                  }

                  // 4. Capital blocat / status decizii
                  const pendingInv = allIndicatori.filter(
                    (e) => e.statusDecizie === null,
                  );
                  const approvedInv = allIndicatori.filter(
                    (e) => e.statusDecizie === "aprobat",
                  );
                  const rejectedInv = allIndicatori.filter(
                    (e) => e.statusDecizie === "anulat",
                  );
                  if (pendingInv.length > 0) {
                    const blockedCapital = pendingInv.reduce(
                      (s, e) => s + e.investitie,
                      0,
                    );
                    insights.push({
                      icon: "lock_clock",
                      color: "text-purple-400",
                      bg: "bg-purple-500/5 border-purple-500/15",
                      content: (
                        <>
                          <V c="text-purple-400">
                            {blockedCapital.toLocaleString()} €
                          </V>{" "}
                          capital blocat în{" "}
                          <V c="text-purple-400">{pendingInv.length}</V> estimăr
                          {pendingInv.length === 1 ? "e" : "i"} care așteaptă
                          decizie.
                        </>
                      ),
                    });
                  } else {
                    const totalDecided =
                      approvedInv.length + rejectedInv.length;
                    const approvalRate =
                      totalDecided > 0
                        ? ((approvedInv.length / totalDecided) * 100).toFixed(0)
                        : 0;
                    insights.push({
                      icon: "task_alt",
                      color: "text-purple-400",
                      bg: "bg-purple-500/5 border-purple-500/15",
                      content: (
                        <>
                          Toate estimările au decizie:{" "}
                          <V c="text-emerald-400">{approvedInv.length}</V>{" "}
                          aprobat{approvedInv.length === 1 ? "ă" : "e"},{" "}
                          <V c="text-red-400">{rejectedInv.length}</V> respins
                          {rejectedInv.length === 1 ? "ă" : "e"} — rată aprobare{" "}
                          <V c="text-purple-400">{approvalRate}%</V>.
                        </>
                      ),
                    });
                  }

                  // 5. Best margin opportunity
                  if (bestEst && bestEst.roi > 0) {
                    const statusLabel =
                      bestEst.statusDecizie === null
                        ? "în așteptare — prioritizează aprobarea"
                        : bestEst.statusDecizie === "aprobat"
                          ? "deja aprobată ✓"
                          : "respinsă";
                    insights.push({
                      icon: "trending_up",
                      color: "text-emerald-400",
                      bg: "bg-emerald-500/5 border-emerald-500/15",
                      content: (
                        <>
                          Cea mai profitabilă:{" "}
                          <V>
                            {bestEst.masina.marca} {bestEst.masina.model}
                          </V>{" "}
                          — ROI{" "}
                          <V c="text-emerald-400">{bestEst.roi.toFixed(1)}%</V>,
                          marjă{" "}
                          <V c="text-emerald-400">
                            +{bestEst.marjaProfit.toLocaleString()} €
                          </V>{" "}
                          ({statusLabel}).
                        </>
                      ),
                    });
                  }

                  // 6. ROI spread
                  if (allIndicatori.length >= 2 && bestEst && worstEst) {
                    const spread = bestEst.roi - worstEst.roi;
                    if (spread > 15) {
                      insights.push({
                        icon: "swap_vert",
                        color: "text-amber-400",
                        bg: "bg-amber-500/5 border-amber-500/15",
                        content: (
                          <>
                            Ecart mare de profitabilitate: ROI variază de la{" "}
                            <V c="text-red-400">{worstEst.roi.toFixed(1)}%</V>{" "}
                            la{" "}
                            <V c="text-emerald-400">
                              {bestEst.roi.toFixed(1)}%
                            </V>{" "}
                            (diferență{" "}
                            <V c="text-amber-400">{spread.toFixed(0)}pp</V>).
                            Cauzele —{">"} diferențe de costuri, evaluarea
                            mecanicilor sau segmentul auto.
                          </>
                        ),
                      });
                    } else {
                      insights.push({
                        icon: "swap_vert",
                        color: "text-slate-400",
                        bg: "bg-slate-500/5 border-slate-500/15",
                        content: (
                          <>
                            Profitabilitate uniformă: variație de doar{" "}
                            <V>{spread.toFixed(0)}%</V> între estimări (
                            <V>{worstEst.roi.toFixed(1)}%</V> →{" "}
                            <V>{bestEst.roi.toFixed(1)}%</V>). Estimările sunt
                            bine calibrate.
                          </>
                        ),
                      });
                    }
                  }

                  // 7. Concentrare pe branduri
                  const byBrand = {};
                  allIndicatori.forEach((e) => {
                    const b = e.masina.marca;
                    if (!byBrand[b]) byBrand[b] = [];
                    byBrand[b].push(e);
                  });
                  const brandNames = Object.keys(byBrand).filter(
                    (b) => b !== "—",
                  );
                  if (brandNames.length >= 2) {
                    const brandStats = brandNames
                      .map((b) => ({
                        brand: b,
                        count: byBrand[b].length,
                        avgRoi:
                          byBrand[b].reduce((s, e) => s + e.roi, 0) /
                          byBrand[b].length,
                      }))
                      .sort((a, b) => b.avgRoi - a.avgRoi);
                    const best = brandStats[0];
                    const most = brandStats.sort(
                      (a, b) => b.count - a.count,
                    )[0];
                    insights.push({
                      icon: "directions_car",
                      color: "text-indigo-400",
                      bg: "bg-indigo-500/5 border-indigo-500/15",
                      content: (
                        <>
                          Brandul cel mai profitabil:{" "}
                          <V c="text-indigo-400">{best.brand}</V> cu ROI mediu{" "}
                          <V c="text-indigo-400">{best.avgRoi.toFixed(1)}%</V>.
                          {most.brand !== best.brand && (
                            <>
                              {" "}
                              Cel mai frecvent: <V>{most.brand}</V> (
                              {most.count} estimări).
                            </>
                          )}
                          {most.brand === best.brand && (
                            <>
                              {" "}
                              Este și cel mai frecvent cu <V>
                                {most.count}
                              </V>{" "}
                              estimări.
                            </>
                          )}
                        </>
                      ),
                    });
                  } else if (brandNames.length === 1) {
                    const b = brandNames[0];
                    const bRoi =
                      byBrand[b].reduce((s, e) => s + e.roi, 0) /
                      byBrand[b].length;
                    insights.push({
                      icon: "directions_car",
                      color: "text-indigo-400",
                      bg: "bg-indigo-500/5 border-indigo-500/15",
                      content: (
                        <>
                          Un singur brand în portofoliu:{" "}
                          <V c="text-indigo-400">{b}</V> cu{" "}
                          <V>{byBrand[b].length}</V> estimăr
                          {byBrand[b].length === 1 ? "e" : "i"} și ROI mediu{" "}
                          <V>{bRoi.toFixed(1)}%</V>.
                        </>
                      ),
                    });
                  }

                  // 8. Quick wins — investiție mică, ROI mare
                  if (allIndicatori.length >= 2) {
                    const avgInv =
                      allIndicatori.reduce((s, e) => s + e.investitie, 0) /
                      allIndicatori.length;
                    const quickWins = allIndicatori.filter(
                      (e) => e.investitie < avgInv && e.roi > avgRoi,
                    );
                    if (quickWins.length > 0) {
                      insights.push({
                        icon: "bolt",
                        color: "text-yellow-400",
                        bg: "bg-yellow-500/5 border-yellow-500/15",
                        content: (
                          <>
                            <V c="text-yellow-400">
                              {quickWins.length} quick win
                              {quickWins.length > 1 ? "-uri" : ""}
                            </V>
                            : estimări cu investiție sub media de{" "}
                            <V>{Math.round(avgInv).toLocaleString()} €</V> dar
                            ROI peste <V>{avgRoi.toFixed(1)}%</V> —{" "}
                            {quickWins.map((e, i) => (
                              <span key={i}>
                                {i > 0 && ", "}
                                <V>
                                  {e.masina.marca} {e.masina.model}
                                </V>
                              </span>
                            ))}
                            .
                          </>
                        ),
                      });
                    } else {
                      insights.push({
                        icon: "bolt",
                        color: "text-slate-400",
                        bg: "bg-slate-500/5 border-slate-500/15",
                        content: (
                          <>
                            Niciun quick win identificat — toate estimările cu
                            ROI peste medie au și investiție peste medie (
                            <V>{Math.round(avgInv).toLocaleString()} €</V>).
                          </>
                        ),
                      });
                    }
                  }

                  // 9. Complexitate reparații (nr piese)
                  {
                    const totalPiese = allIndicatori.reduce(
                      (s, e) => s + (e.piese?.length || 0),
                      0,
                    );
                    const avgPiese =
                      allIndicatori.length > 0
                        ? totalPiese / allIndicatori.length
                        : 0;
                    const complex = allIndicatori.filter(
                      (e) => (e.piese?.length || 0) > avgPiese + 1,
                    );
                    if (complex.length > 0) {
                      insights.push({
                        icon: "build",
                        color: "text-orange-400",
                        bg: "bg-orange-500/5 border-orange-500/15",
                        content: (
                          <>
                            Complexitate ridicată:{" "}
                            <V c="text-orange-400">{complex.length}</V> estimăr
                            {complex.length === 1 ? "e" : "i"} au peste{" "}
                            <V>{Math.ceil(avgPiese + 1)}</V> piese (media:{" "}
                            <V>{avgPiese.toFixed(1)}</V> piese/est.) —{" "}
                            {complex.map((e, i) => (
                              <span key={i}>
                                {i > 0 && ", "}
                                <V>
                                  {e.masina.marca} {e.masina.model}
                                </V>{" "}
                                ({e.piese.length} piese)
                              </span>
                            ))}
                            .
                          </>
                        ),
                      });
                    } else {
                      insights.push({
                        icon: "build",
                        color: "text-slate-400",
                        bg: "bg-slate-500/5 border-slate-500/15",
                        content: (
                          <>
                            Complexitate uniformă: media de{" "}
                            <V>{avgPiese.toFixed(1)}</V> piese per reparație,
                            fără excepții semnificative.
                          </>
                        ),
                      });
                    }
                  }

                  // 10. Valoare totală portofoliu (big picture)
                  insights.push({
                    icon: "account_balance_wallet",
                    color:
                      totalProfit >= 0 ? "text-emerald-400" : "text-red-400",
                    bg:
                      totalProfit >= 0
                        ? "bg-emerald-500/5 border-emerald-500/15"
                        : "bg-red-500/5 border-red-500/15",
                    content: (
                      <>
                        Portofoliu total:{" "}
                        <V>{totalInvestment.toLocaleString()} €</V> investiți,
                        profit estimat{" "}
                        <V
                          c={
                            totalProfit >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {totalProfit >= 0 ? "+" : ""}
                          {totalProfit.toLocaleString()} €
                        </V>
                        .
                        {totalInvestment > 0 && (
                          <>
                            {" "}
                            Randament global:{" "}
                            <V
                              c={
                                totalProfit >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              {((totalProfit / totalInvestment) * 100).toFixed(
                                1,
                              )}
                              %
                            </V>
                            .
                          </>
                        )}
                      </>
                    ),
                  });

                  // 11. Estimări vechi fără decizie
                  {
                    const pendingOld = allIndicatori.filter((e) => {
                      if (e.statusDecizie !== null) return false;
                      if (!e.dataEstimare || e.dataEstimare === "—")
                        return false;
                      const days = Math.floor(
                        (Date.now() - new Date(e.dataEstimare).getTime()) /
                          86400000,
                      );
                      return days > 7;
                    });
                    if (pendingOld.length > 0) {
                      insights.push({
                        icon: "schedule",
                        color: "text-red-400",
                        bg: "bg-red-500/5 border-red-500/15",
                        content: (
                          <>
                            <V c="text-red-400">{pendingOld.length}</V> estimăr
                            {pendingOld.length === 1 ? "e" : "i"} fără decizie
                            de peste <V c="text-red-400">7 zile</V> —{" "}
                            {pendingOld.map((e, i) => {
                              const days = Math.floor(
                                (Date.now() -
                                  new Date(e.dataEstimare).getTime()) /
                                  86400000,
                              );
                              return (
                                <span key={i}>
                                  {i > 0 && ", "}
                                  <V>
                                    {e.masina.marca} {e.masina.model}
                                  </V>{" "}
                                  ({days} zile)
                                </span>
                              );
                            })}
                            . Necesită atenție urgentă.
                          </>
                        ),
                      });
                    } else {
                      const pendingAll = allIndicatori.filter(
                        (e) => e.statusDecizie === null,
                      );
                      if (pendingAll.length > 0) {
                        insights.push({
                          icon: "schedule",
                          color: "text-slate-400",
                          bg: "bg-slate-500/5 border-slate-500/15",
                          content: (
                            <>
                              <V>{pendingAll.length}</V> estimăr
                              {pendingAll.length === 1 ? "e" : "i"} în
                              așteptare, toate recente (&lt; 7 zile). Timp de
                              decizie bun.
                            </>
                          ),
                        });
                      }
                    }
                  }

                  // 12. Risc concentrat (HIGH pe un singur mecanic sau brand)
                  {
                    const highRiskEst = allIndicatori.filter(
                      (e) => e.prioritate === "HIGH",
                    );
                    if (highRiskEst.length >= 2) {
                      const hrByMecanic = {};
                      const hrByBrand = {};
                      highRiskEst.forEach((e) => {
                        if (e.mecanic !== "—")
                          hrByMecanic[e.mecanic] =
                            (hrByMecanic[e.mecanic] || 0) + 1;
                        if (e.masina.marca !== "—")
                          hrByBrand[e.masina.marca] =
                            (hrByBrand[e.masina.marca] || 0) + 1;
                      });
                      const topMecanic = Object.entries(hrByMecanic).sort(
                        (a, b) => b[1] - a[1],
                      )[0];
                      const topBrand = Object.entries(hrByBrand).sort(
                        (a, b) => b[1] - a[1],
                      )[0];
                      const alerts = [];
                      if (
                        topMecanic &&
                        topMecanic[1] >= Math.ceil(highRiskEst.length * 0.6)
                      ) {
                        alerts.push(
                          <>
                            <V>{topMecanic[0]}</V> concentrează{" "}
                            <V c="text-rose-400">{topMecanic[1]}</V> din{" "}
                            {highRiskEst.length} cazuri urgente
                          </>,
                        );
                      }
                      if (
                        topBrand &&
                        topBrand[1] >= Math.ceil(highRiskEst.length * 0.6)
                      ) {
                        alerts.push(
                          <>
                            <V>{topBrand[0]}</V> concentrează{" "}
                            <V c="text-rose-400">{topBrand[1]}</V> din{" "}
                            {highRiskEst.length} cazuri urgente
                          </>,
                        );
                      }
                      if (alerts.length > 0) {
                        insights.push({
                          icon: "crisis_alert",
                          color: "text-rose-400",
                          bg: "bg-rose-500/5 border-rose-500/15",
                          content: (
                            <>
                              Risc concentrat:{" "}
                              {alerts.map((a, i) => (
                                <span key={i}>
                                  {i > 0 && "; "}
                                  {a}
                                </span>
                              ))}
                              . Diversifică alocarea pentru a reduce expunerea.
                            </>
                          ),
                        });
                      } else {
                        insights.push({
                          icon: "crisis_alert",
                          color: "text-slate-400",
                          bg: "bg-slate-500/5 border-slate-500/15",
                          content: (
                            <>
                              <V>{highRiskEst.length}</V> estimări urgente
                              distribuite echilibrat între mecanici și branduri.
                              Fără concentrare de risc.
                            </>
                          ),
                        });
                      }
                    }
                  }

                  return (
                    <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#895af6]">
                          auto_awesome
                        </span>
                        Insight-uri Automate
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {insights.map((ins, i) => (
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
                  );
                })()}
              </div>
            </div>
          );
        })()}

      {/* ═══ Detail Modal ═══ */}
      {detailEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailId(null)}
          ></div>
          <div className="relative glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#895af6]/20 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#895af6]">
                    rate_review
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {detailEst.masina.marca} {detailEst.masina.model}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {detailEst.masina.nrInmatriculare} · Estimare de la{" "}
                    {detailEst.mecanic}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
              >
                <span className="material-symbols-outlined text-slate-400 hover:text-white">
                  close
                </span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "An",
                    val: detailEst.masina.anFabricatie,
                    icon: "calendar_month",
                  },
                  {
                    label: "Kilometraj",
                    val: `${detailEst.masina.km.toLocaleString()} km`,
                    icon: "speed",
                  },
                  {
                    label: "Combustibil",
                    val: detailEst.masina.combustibil,
                    icon: "local_gas_station",
                  },
                  {
                    label: "Caroserie",
                    val: detailEst.masina.categorieAuto,
                    icon: "garage",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] rounded-lg p-3 border border-white/5"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="material-symbols-outlined text-[14px] text-slate-500">
                        {item.icon}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {item.val}
                    </p>
                  </div>
                ))}
              </div>

              {/* Problemă */}
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">
                    report_problem
                  </span>{" "}
                  Problemă Raportată
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {detailEst.descriereProblema}
                </p>
              </div>

              {/* Piese estimate */}
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">
                    inventory_2
                  </span>{" "}
                  Piese / Lucrări Estimate de Mecanic
                </h4>
                <div className="space-y-2">
                  {detailEst.piese.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white/[0.02] rounded-lg px-4 py-2.5 border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#895af6] text-[16px]">
                          settings
                        </span>
                        <span className="text-sm text-white">{p.nume}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>×{p.cantitate}</span>
                        <span className="font-mono">{p.pret} €/buc</span>
                        <span className="font-mono text-sm text-white font-bold">
                          {(p.pret * p.cantitate).toLocaleString()} €
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t border-white/5">
                    <span className="text-sm font-bold text-[#895af6] font-mono">
                      Total: {detailEst.costEstimatMecanic.toLocaleString()} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 text-center">
                  <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">
                    shopping_cart
                  </span>
                  <p className="text-[10px] text-slate-500 uppercase mb-1">
                    Preț Achiziție
                  </p>
                  <p className="text-xl font-bold text-white font-mono">
                    {detailEst.pretAchizitie.toLocaleString()} €
                  </p>
                </div>
                <div className="bg-[#895af6]/10 rounded-xl p-4 border border-[#895af6]/20 text-center">
                  <span className="material-symbols-outlined text-[#895af6] text-2xl mb-1">
                    build
                  </span>
                  <p className="text-[10px] text-[#895af6]/70 uppercase mb-1">
                    Cost Reparație
                  </p>
                  <p className="text-xl font-bold text-white font-mono">
                    {detailEst.costEstimatMecanic.toLocaleString()} €
                  </p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 text-center">
                  <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">
                    storefront
                  </span>
                  <p className="text-[10px] text-slate-500 uppercase mb-1">
                    Preț Vânzare Est.
                  </p>
                  {detailEst.statusDecizie === null ? (
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={
                          pretVanzareEdit[detailEst.id] ??
                          detailEst.pretVanzareEstimat
                        }
                        onChange={(e) =>
                          setPretVanzareEdit((p) => ({
                            ...p,
                            [detailEst.id]: Number(e.target.value),
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-28 text-xl font-bold text-white font-mono text-right bg-transparent border-b border-white/20 focus:border-[#895af6] outline-none py-1"
                      />
                      <span className="text-xl font-bold text-white font-mono">
                        €
                      </span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-white font-mono">
                      {detailEst.pretVanzareEstimat.toLocaleString()} €
                    </p>
                  )}
                </div>
              </div>

              {/* Indicatori Profitabilitate */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">
                    analytics
                  </span>{" "}
                  Indicatori Profitabilitate
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {getIndicatori(detailEst).map((ind, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 border flex items-center gap-3 ${ind.isGood ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}
                    >
                      <div
                        className={`size-10 rounded-lg flex items-center justify-center ${ind.isGood ? "bg-emerald-500/20" : "bg-red-500/20"}`}
                      >
                        <span
                          className={`material-symbols-outlined ${ind.isGood ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {ind.icon}
                        </span>
                      </div>
                      <div>
                        <p
                          className={`text-lg font-bold font-mono ${ind.isGood ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {ind.value}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase">
                          {ind.label}
                        </p>
                        <p
                          className={`text-xs ${ind.isGood ? "text-emerald-400/70" : "text-red-400/70"}`}
                        >
                          {ind.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Already decided banner */}
              {detailEst.statusDecizie !== null && (
                <div
                  className={`rounded-xl p-4 border flex items-center gap-3 ${
                    detailEst.statusDecizie === "aprobat"
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-red-500/10 border-red-500/20"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-3xl ${detailEst.statusDecizie === "aprobat" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {detailEst.statusDecizie === "aprobat"
                      ? "check_circle"
                      : "cancel"}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-bold ${detailEst.statusDecizie === "aprobat" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      Reparație{" "}
                      {detailEst.statusDecizie === "aprobat"
                        ? "Aprobată"
                        : "Anulată"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {detailEst.statusDecizie === "aprobat"
                        ? "Mecanicul a fost notificat să înceapă reparația."
                        : "Mecanicul a fost notificat — reparația nu se va efectua."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer — only for pending */}
            {detailEst.statusDecizie === null && (
              <div className="flex items-center justify-between p-6 border-t border-white/10">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    info
                  </span>
                  Mecanicul va fi notificat cu decizia ta.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecision(detailEst.id, "anulat")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/20 transition"
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    Anulează Reparația
                  </button>
                  <button
                    onClick={() => handleDecision(detailEst.id, "aprobat")}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/20 hover:scale-105 transition transform"
                  >
                    <span className="material-symbols-outlined">
                      check_circle
                    </span>
                    Aprobă Reparația
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Confirm Modal ═══ */}
      {confirmModal &&
        (() => {
          const est = estimari.find((e) => e.id === confirmModal.id);
          const isApprove = confirmModal.action === "aprobat";
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setConfirmModal(null)}
              ></div>
              <div className="relative glass-panel rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
                <div
                  className={`p-8 text-center ${isApprove ? "bg-emerald-500/5" : "bg-red-500/5"}`}
                >
                  <div
                    className={`size-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isApprove ? "bg-emerald-500/20" : "bg-red-500/20"}`}
                  >
                    <span
                      className={`material-symbols-outlined text-5xl ${isApprove ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {isApprove ? "check_circle" : "cancel"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {isApprove ? "Aprobă Reparația?" : "Anulează Reparația?"}
                  </h3>
                  <p className="text-sm text-slate-400 mb-1">
                    {est?.masina?.marca} {est?.masina?.model} ·{" "}
                    {est?.masina?.nrInmatriculare}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isApprove
                      ? `Mecanicul ${est?.mecanic} va fi notificat să înceapă reparația (${est?.costEstimatMecanic?.toLocaleString()} €).`
                      : `Mecanicul ${est?.mecanic} va fi notificat că reparația a fost anulată.`}
                  </p>
                </div>
                <div className="flex gap-3 p-5 border-t border-white/10">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition"
                  >
                    Înapoi
                  </button>
                  <button
                    onClick={confirmDecision}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition ${
                      isApprove
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-emerald-500/20 shadow-lg"
                        : "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-500/20 shadow-lg"
                    }`}
                  >
                    {isApprove ? "Da, Aprobă" : "Da, Anulează"}
                  </button>
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

export default EstimariReparatii;
