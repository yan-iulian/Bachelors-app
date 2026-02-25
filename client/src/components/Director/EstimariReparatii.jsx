import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../config/apiHelper';

const combustibilMap = { 0: 'Benzină', 1: 'Diesel', 2: 'Electric', 3: 'Hibrid' };
const categorieMap = { 0: 'Sedan', 1: 'Hatchback', 2: 'Coupe', 3: 'Break', 4: 'SUV', 5: 'Cabrio', 6: 'Combi' };

const prioStyle = {
    HIGH:   { bg: 'bg-red-500/10',   text: 'text-red-400',   border: 'border-red-500/20',   label: 'URGENT' },
    MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'MEDIU' },
    LOW:    { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', label: 'SCĂZUT' },
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
            const data = await apiGet('/api/reparatii');
            setEstimari(data.map(r => ({
                id: r.idReparatie,
                masina: r.Masina ? {
                    marca: r.Masina.marca, model: r.Masina.model,
                    nrInmatriculare: r.Masina.locParcare || 'N/A',
                    anFabricatie: r.Masina.anFabricatie, km: r.Masina.km,
                    combustibil: combustibilMap[r.Masina.combustibil] || 'Benzină',
                    categorieAuto: categorieMap[r.Masina.categorieAuto] || 'Sedan',
                } : { marca: '—', model: '—', nrInmatriculare: 'N/A', anFabricatie: 0, km: 0, combustibil: '—', categorieAuto: '—' },
                mecanic: r.mecanic ? `${r.mecanic.nume} ${r.mecanic.prenume}` : '—',
                prioritate: 'MEDIUM',
                descriereProblema: r.descriereProblema || '',
                pretAchizitie: r.Masina?.pretEuro || 0,
                pretVanzareEstimat: Math.round((r.Masina?.pretEuro || 0) * 1.25),
                costEstimatMecanic: r.cost || 0,
                piese: (r.Piesas || []).map(p => ({
                    nume: p.denumire, cantitate: p.PiesaReparatie?.cantitate || 1, pret: p.pret || 0,
                })),
                dataEstimare: r.dataInceput ? new Date(r.dataInceput).toISOString().split('T')[0] : '—',
                statusDecizie: r.statusReparatie === 0 ? null : r.statusReparatie === 1 ? 'aprobat' : r.statusReparatie === 2 ? 'aprobat' : 'anulat',
            })));
        } catch (e) { console.error('Eroare la încărcarea estimărilor:', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchEstimari(); }, []);

    const detailEst = detailId !== null ? estimari.find(e => e.id === detailId) : null;

    // Indicatori de profitabilitate
    const getIndicatori = (est) => {
        const pretVanzare = pretVanzareEdit[est.id] ?? est.pretVanzareEstimat;
        const investitieTotal = est.pretAchizitie + est.costEstimatMecanic;
        const marjaProfit = pretVanzare - investitieTotal;
        const marjaProcent = investitieTotal > 0 ? (marjaProfit / investitieTotal) * 100 : 0;
        const roi = investitieTotal > 0 ? (marjaProfit / investitieTotal) * 100 : 0;
        const raportCostAchizitie = est.pretAchizitie > 0 ? (est.costEstimatMecanic / est.pretAchizitie) * 100 : 0;
        const raportCostVanzare = pretVanzare > 0 ? (est.costEstimatMecanic / pretVanzare) * 100 : 0;
        return [
            {
                label: 'Marjă Profit',
                value: `${marjaProfit.toLocaleString()} €`,
                detail: `${marjaProcent.toFixed(1)}% din investiție`,
                isGood: marjaProfit > 0,
                icon: 'trending_up',
            },
            {
                label: 'ROI',
                value: `${roi.toFixed(1)}%`,
                detail: roi >= 15 ? 'Investiție profitabilă' : roi >= 0 ? 'Profitabilitate scăzută' : 'Investiție în pierdere',
                isGood: roi >= 15,
                icon: 'monitoring',
            },
            {
                label: 'Cost / Achiziție',
                value: `${raportCostAchizitie.toFixed(1)}%`,
                detail: raportCostAchizitie < 20 ? 'Cost reparație mic' : raportCostAchizitie < 35 ? 'Cost moderat' : 'Cost mare',
                isGood: raportCostAchizitie < 30,
                icon: 'balance',
            },
            {
                label: 'Cost / Preț Vânzare',
                value: `${raportCostVanzare.toFixed(1)}%`,
                detail: raportCostVanzare < 15 ? 'Impact redus' : raportCostVanzare < 25 ? 'Impact moderat' : 'Impact semnificativ',
                isGood: raportCostVanzare < 20,
                icon: 'pie_chart',
            },
        ];
    };

    const handleDecision = (id, action) => {
        setConfirmModal({ id, action });
    };

    const confirmDecision = async () => {
        if (!confirmModal) return;
        try {
            const newStatus = confirmModal.action === 'aprobat' ? 1 : 0;
            await apiPut(`/api/reparatii/${confirmModal.id}`, { statusReparatie: newStatus });
            await fetchEstimari();
        } catch (e) { console.error('Eroare la decizie:', e); }
        const est = estimari.find(e => e.id === confirmModal.id);
        const actionLabel = confirmModal.action === 'aprobat' ? 'aprobată' : 'anulată';
        setToast(`Reparație ${actionLabel} → ${est?.masina?.marca} ${est?.masina?.model}`);
        setTimeout(() => setToast(null), 3500);
        setConfirmModal(null);
        setDetailId(null);
    };

    const pending = estimari.filter(e => e.statusDecizie === null);
    const decided = estimari.filter(e => e.statusDecizie !== null);

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă estimările...</div></div>;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6" style={{ paddingTop: '6rem' }}>
            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#895af6] text-3xl">rate_review</span>
                        Estimări Reparații
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Analizează estimările de cost primite de la mecanici</p>
                </div>
                {pending.length > 0 && (
                    <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-4 py-2 rounded-xl">
                        <span className="material-symbols-outlined text-amber-400">pending_actions</span>
                        <span className="text-sm font-bold text-amber-400">{pending.length} estimări în așteptare</span>
                    </div>
                )}
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Estimări', val: estimari.length, icon: 'rate_review', color: 'text-[#895af6]', bg: 'bg-[#895af6]/10' },
                    { label: 'În Așteptare', val: pending.length, icon: 'pending_actions', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Aprobate', val: estimari.filter(e => e.statusDecizie === 'aprobat').length, icon: 'check_circle', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Anulate', val: estimari.filter(e => e.statusDecizie === 'anulat').length, icon: 'cancel', color: 'text-red-400', bg: 'bg-red-500/10' },
                ].map(k => (
                    <div key={k.label} className="glass-panel rounded-xl p-4 flex items-center gap-3">
                        <div className={`${k.bg} size-11 rounded-lg flex items-center justify-center`}>
                            <span className={`material-symbols-outlined ${k.color}`}>{k.icon}</span>
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
                        <span className="material-symbols-outlined text-amber-400">pending_actions</span>
                        Necesită Decizie
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {pending.map(est => {
                            const indicatori = getIndicatori(est);
                            const pr = prioStyle[est.prioritate];
                            const allGood = indicatori.every(i => i.isGood);
                            const anyBad = indicatori.some(i => !i.isGood);
                            return (
                                <div key={est.id} className="glass-panel rounded-2xl overflow-hidden border border-white/10 hover:border-[#895af6]/30 transition-all cursor-pointer" onClick={() => setDetailId(est.id)}>
                                    <div className="p-5 space-y-4">
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{est.masina.marca} {est.masina.model}</h3>
                                                <p className="text-xs text-slate-400 font-mono">{est.masina.nrInmatriculare} · {est.masina.anFabricatie} · {est.masina.km.toLocaleString()} km</p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 ${pr.bg} ${pr.text} border ${pr.border} text-[10px] font-bold px-2 py-1 rounded-full`}>
                                                <span className="material-symbols-outlined text-[12px]">priority_high</span>
                                                {pr.label}
                                            </span>
                                        </div>

                                        {/* Problem */}
                                        <p className="text-sm text-slate-300 line-clamp-2">{est.descriereProblema}</p>

                                        {/* Financials row */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                                                <p className="text-[10px] text-slate-500 uppercase">Achiziție</p>
                                                <p className="text-sm font-bold text-white font-mono">{est.pretAchizitie.toLocaleString()} €</p>
                                            </div>
                                            <div className="bg-[#895af6]/10 rounded-lg p-3 text-center border border-[#895af6]/20">
                                                <p className="text-[10px] text-[#895af6]/70 uppercase">Cost Reparație</p>
                                                <p className="text-sm font-bold text-[#895af6] font-mono">{est.costEstimatMecanic.toLocaleString()} €</p>
                                            </div>
                                            <div className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
                                                <p className="text-[10px] text-slate-500 uppercase">Vânzare Est.</p>
                                                <p className="text-sm font-bold text-white font-mono">{est.pretVanzareEstimat.toLocaleString()} €</p>
                                            </div>
                                        </div>

                                        {/* Mini indicatori */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {indicatori.map((ind, i) => (
                                                <div key={i} className={`rounded-lg p-2 text-center border ${ind.isGood ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                    <span className={`material-symbols-outlined text-[16px] ${ind.isGood ? 'text-emerald-400' : 'text-red-400'}`}>{ind.icon}</span>
                                                    <p className={`text-xs font-bold ${ind.isGood ? 'text-emerald-400' : 'text-red-400'}`}>{ind.value}</p>
                                                    <p className="text-[9px] text-slate-500 truncate">{ind.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Overall verdict */}
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${allGood ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                            <span className={`material-symbols-outlined ${allGood ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {allGood ? 'thumb_up' : 'warning'}
                                            </span>
                                            <span className={`text-xs font-bold ${allGood ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {allGood ? 'Toți indicatorii sunt favorabili — reparația e profitabilă' : 'Atenție — unii indicatori semnalează risc'}
                                            </span>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-white/5">
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">engineering</span>
                                                {est.mecanic}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                {est.dataEstimare}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">inventory_2</span>
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

            {/* ── Istoric Decizii ── */}
            {decided.length > 0 && (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400">history</span>
                            Istoric Decizii
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/[0.03] border-b border-white/10">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Mașină</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Mecanic</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Cost Reparație</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Achiziție</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Data</th>
                                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">Decizie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {decided.map(est => (
                                    <tr key={est.id} className="hover:bg-white/[0.02] transition cursor-pointer" onClick={() => setDetailId(est.id)}>
                                        <td className="px-5 py-4 text-white font-medium">{est.masina.marca} {est.masina.model}</td>
                                        <td className="px-5 py-4 text-slate-300">{est.mecanic}</td>
                                        <td className="px-5 py-4 text-slate-300 font-mono">{est.costEstimatMecanic.toLocaleString()} €</td>
                                        <td className="px-5 py-4 text-slate-300 font-mono">{est.pretAchizitie.toLocaleString()} €</td>
                                        <td className="px-5 py-4 text-slate-400">{est.dataEstimare}</td>
                                        <td className="px-5 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${est.statusDecizie === 'aprobat'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                                {est.statusDecizie === 'aprobat' ? '✓ Aprobată' : '✕ Anulată'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ Detail Modal ═══ */}
            {detailEst && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailId(null)}></div>
                    <div className="relative glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-[#895af6]/20 rounded-lg flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#895af6]">rate_review</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">{detailEst.masina.marca} {detailEst.masina.model}</h2>
                                    <p className="text-xs text-slate-400">{detailEst.masina.nrInmatriculare} · Estimare de la {detailEst.mecanic}</p>
                                </div>
                            </div>
                            <button onClick={() => setDetailId(null)} className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
                                <span className="material-symbols-outlined text-slate-400 hover:text-white">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Info grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'An', val: detailEst.masina.anFabricatie, icon: 'calendar_month' },
                                    { label: 'Kilometraj', val: `${detailEst.masina.km.toLocaleString()} km`, icon: 'speed' },
                                    { label: 'Combustibil', val: detailEst.masina.combustibil, icon: 'local_gas_station' },
                                    { label: 'Caroserie', val: detailEst.masina.categorieAuto, icon: 'garage' },
                                ].map((item, i) => (
                                    <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="material-symbols-outlined text-[14px] text-slate-500">{item.icon}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">{item.label}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-white">{item.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Problemă */}
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px]">report_problem</span> Problemă Raportată
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed">{detailEst.descriereProblema}</p>
                            </div>

                            {/* Piese estimate */}
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px]">inventory_2</span> Piese / Lucrări Estimate de Mecanic
                                </h4>
                                <div className="space-y-2">
                                    {detailEst.piese.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/[0.02] rounded-lg px-4 py-2.5 border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#895af6] text-[16px]">settings</span>
                                                <span className="text-sm text-white">{p.nume}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                                <span>×{p.cantitate}</span>
                                                <span className="font-mono">{p.pret} €/buc</span>
                                                <span className="font-mono text-sm text-white font-bold">{(p.pret * p.cantitate).toLocaleString()} €</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-end pt-2 border-t border-white/5">
                                        <span className="text-sm font-bold text-[#895af6] font-mono">Total: {detailEst.costEstimatMecanic.toLocaleString()} €</span>
                                    </div>
                                </div>
                            </div>

                            {/* Financial overview */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 text-center">
                                    <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">shopping_cart</span>
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Preț Achiziție</p>
                                    <p className="text-xl font-bold text-white font-mono">{detailEst.pretAchizitie.toLocaleString()} €</p>
                                </div>
                                <div className="bg-[#895af6]/10 rounded-xl p-4 border border-[#895af6]/20 text-center">
                                    <span className="material-symbols-outlined text-[#895af6] text-2xl mb-1">build</span>
                                    <p className="text-[10px] text-[#895af6]/70 uppercase mb-1">Cost Reparație</p>
                                    <p className="text-xl font-bold text-white font-mono">{detailEst.costEstimatMecanic.toLocaleString()} €</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 text-center">
                                    <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">storefront</span>
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Preț Vânzare Est.</p>
                                    {detailEst.statusDecizie === null ? (
                                        <input
                                            type="number"
                                            value={pretVanzareEdit[detailEst.id] ?? detailEst.pretVanzareEstimat}
                                            onChange={e => setPretVanzareEdit(p => ({ ...p, [detailEst.id]: Number(e.target.value) }))}
                                            onClick={e => e.stopPropagation()}
                                            className="w-full text-xl font-bold text-white font-mono text-center bg-transparent border-b border-white/20 focus:border-[#895af6] outline-none py-1"
                                        />
                                    ) : (
                                        <p className="text-xl font-bold text-white font-mono">{detailEst.pretVanzareEstimat.toLocaleString()} €</p>
                                    )}
                                </div>
                            </div>

                            {/* Indicatori Profitabilitate */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px]">analytics</span> Indicatori Profitabilitate
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {getIndicatori(detailEst).map((ind, i) => (
                                        <div key={i} className={`rounded-xl p-4 border flex items-center gap-3 ${ind.isGood ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                            <div className={`size-10 rounded-lg flex items-center justify-center ${ind.isGood ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                                <span className={`material-symbols-outlined ${ind.isGood ? 'text-emerald-400' : 'text-red-400'}`}>{ind.icon}</span>
                                            </div>
                                            <div>
                                                <p className={`text-lg font-bold font-mono ${ind.isGood ? 'text-emerald-400' : 'text-red-400'}`}>{ind.value}</p>
                                                <p className="text-[10px] text-slate-500 uppercase">{ind.label}</p>
                                                <p className={`text-xs ${ind.isGood ? 'text-emerald-400/70' : 'text-red-400/70'}`}>{ind.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Already decided banner */}
                            {detailEst.statusDecizie !== null && (
                                <div className={`rounded-xl p-4 border flex items-center gap-3 ${detailEst.statusDecizie === 'aprobat'
                                    ? 'bg-emerald-500/10 border-emerald-500/20'
                                    : 'bg-red-500/10 border-red-500/20'
                                }`}>
                                    <span className={`material-symbols-outlined text-3xl ${detailEst.statusDecizie === 'aprobat' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {detailEst.statusDecizie === 'aprobat' ? 'check_circle' : 'cancel'}
                                    </span>
                                    <div>
                                        <p className={`text-sm font-bold ${detailEst.statusDecizie === 'aprobat' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            Reparație {detailEst.statusDecizie === 'aprobat' ? 'Aprobată' : 'Anulată'}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {detailEst.statusDecizie === 'aprobat' ? 'Mecanicul a fost notificat să înceapă reparația.' : 'Mecanicul a fost notificat — reparația nu se va efectua.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer — only for pending */}
                        {detailEst.statusDecizie === null && (
                            <div className="flex items-center justify-between p-6 border-t border-white/10">
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    Mecanicul va fi notificat cu decizia ta.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => handleDecision(detailEst.id, 'anulat')}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/20 transition">
                                        <span className="material-symbols-outlined">cancel</span>
                                        Anulează Reparația
                                    </button>
                                    <button onClick={() => handleDecision(detailEst.id, 'aprobat')}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/20 hover:scale-105 transition transform">
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Aprobă Reparația
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ Confirm Modal ═══ */}
            {confirmModal && (() => {
                const est = estimari.find(e => e.id === confirmModal.id);
                const isApprove = confirmModal.action === 'aprobat';
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
                        <div className="relative glass-panel rounded-2xl w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
                            <div className={`p-8 text-center ${isApprove ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                                <div className={`size-20 mx-auto rounded-full flex items-center justify-center mb-4 ${isApprove ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                    <span className={`material-symbols-outlined text-5xl ${isApprove ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isApprove ? 'check_circle' : 'cancel'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">
                                    {isApprove ? 'Aprobă Reparația?' : 'Anulează Reparația?'}
                                </h3>
                                <p className="text-sm text-slate-400 mb-1">
                                    {est?.masina?.marca} {est?.masina?.model} · {est?.masina?.nrInmatriculare}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {isApprove
                                        ? `Mecanicul ${est?.mecanic} va fi notificat să înceapă reparația (${est?.costEstimatMecanic?.toLocaleString()} €).`
                                        : `Mecanicul ${est?.mecanic} va fi notificat că reparația a fost anulată.`
                                    }
                                </p>
                            </div>
                            <div className="flex gap-3 p-5 border-t border-white/10">
                                <button onClick={() => setConfirmModal(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition">
                                    Înapoi
                                </button>
                                <button onClick={confirmDecision}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition ${isApprove
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-emerald-500/20 shadow-lg'
                                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-500/20 shadow-lg'
                                    }`}>
                                    {isApprove ? 'Da, Aprobă' : 'Da, Anulează'}
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
