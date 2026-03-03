import { useState, useEffect } from 'react';
import { apiGet } from '../../config/apiHelper';

/* Rapoarte disponibile */
const rapoarteConfig = [
    {
        id: 'inventar',
        titlu: 'Raport Inventar Parc Auto',
        descriere: 'Lista completă a mașinilor din stoc cu prețuri, kilometraj și status.',
        icon: 'inventory_2',
        color: 'text-[#895af6]',
        bg: 'bg-[#895af6]/10',
        border: 'border-[#895af6]/20',
    },
    {
        id: 'vanzari',
        titlu: 'Raport Vânzări Lunare',
        descriere: 'Sumar vânzări — total, metode de plată, revenue pe perioadă.',
        icon: 'payments',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
    },
    {
        id: 'reparatii',
        titlu: 'Raport Reparații Service',
        descriere: 'Costuri reparații, status lucrări, cost mediu pe mașină.',
        icon: 'build',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
    },
    {
        id: 'factura',
        titlu: 'Factură Proformă Vânzare',
        descriere: 'Generează factură PDF pentru o tranzacție selectată.',
        icon: 'receipt_long',
        color: 'text-teal-400',
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20',
    },
];

/* ------------------------------------------------------------------ */
/*  Helper: generează conținut PDF (simulare — printează datele)       */
/* ------------------------------------------------------------------ */
function generatePDFContent(tipRaport, facturaId, masiniStoc, tranzactiiData, reparatiiData) {
    const now = new Date();
    const dataGenerare = now.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const oraGenerare = now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    let html = `
        <html><head><title>AerYan — ${tipRaport}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 40px; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #895af6; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: 800; color: #895af6; letter-spacing: -1px; }
            .logo span { color: #1a1a2e; }
            .meta { text-align: right; font-size: 12px; color: #666; line-height: 1.8; }
            .title { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #1a1a2e; }
            .subtitle { font-size: 13px; color: #666; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th { background: #895af6; color: #fff; padding: 10px 12px; text-align: left; font-weight: 600; }
            td { padding: 9px 12px; border-bottom: 1px solid #e8e8ef; }
            tr:nth-child(even) td { background: #f8f7ff; }
            .total-row { background: #895af6 !important; color: #fff; font-weight: 700; }
            .total-row td { border: none; }
            .summary { margin-top: 24px; display: flex; gap: 16px; flex-wrap: wrap; }
            .summary-card { flex: 1; min-width: 140px; background: #f4f0ff; border-radius: 8px; padding: 16px; text-align: center; }
            .summary-card .value { font-size: 24px; font-weight: 800; color: #895af6; }
            .summary-card .label { font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
            .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e8ef; font-size: 11px; color: #999; text-align: center; }
            .factura-box { border: 2px solid #895af6; border-radius: 12px; padding: 24px; margin-top: 16px; }
            .factura-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
            .factura-row:last-child { border: none; }
            .factura-label { color: #666; }
            .factura-value { font-weight: 600; }
            .factura-total { font-size: 28px; font-weight: 800; color: #895af6; text-align: right; margin-top: 16px; }
            .stamp { display: inline-block; border: 3px solid #895af6; border-radius: 50%; padding: 12px 20px; font-weight: 800; color: #895af6; text-transform: uppercase; transform: rotate(-12deg); margin-top: 16px; font-size: 14px; letter-spacing: 2px; }
            @media print { body { padding: 20px; } }
        </style></head><body>
        <div class="header">
            <div>
                <div class="logo">Aer<span>Yan</span></div>
                <div style="fontSize:12px;color:#666;margin-top:4px">Premium Auto Dealership</div>
            </div>
            <div class="meta">
                <div>Data: ${dataGenerare}</div>
                <div>Ora: ${oraGenerare}</div>
                <div>Generat de: Director Matei</div>
            </div>
        </div>`;

    if (tipRaport === 'inventar') {
        const totalStoc = masiniStoc.reduce((s, m) => s + m.pret, 0);
        const disponibile = masiniStoc.filter(m => m.status === 'Disponibil').length;
        html += `
            <div class="title">Raport Inventar Parc Auto</div>
            <div class="subtitle">Situația completă a vehiculelor din stoc la data de ${dataGenerare}</div>
            <div class="summary">
                <div class="summary-card"><div class="value">${masiniStoc.length}</div><div class="label">Total vehicule</div></div>
                <div class="summary-card"><div class="value">${disponibile}</div><div class="label">Disponibile</div></div>
                <div class="summary-card"><div class="value">€${(totalStoc / 1000).toFixed(0)}K</div><div class="label">Valoare stoc</div></div>
                <div class="summary-card"><div class="value">€${(totalStoc / masiniStoc.length / 1000).toFixed(0)}K</div><div class="label">Preț mediu</div></div>
            </div>
            <table>
                <tr><th>#</th><th>Marcă</th><th>Model</th><th>An</th><th>Km</th><th>Status</th><th>Preț (€)</th></tr>
                ${masiniStoc.map((m, i) => `<tr><td>${i + 1}</td><td>${m.marca}</td><td>${m.model}</td><td>${m.an}</td><td>${m.km.toLocaleString()}</td><td>${m.status}</td><td style="text-align:right;font-weight:600">${m.pret.toLocaleString()}</td></tr>`).join('')}
                <tr class="total-row"><td colspan="6" style="text-align:right">TOTAL VALOARE STOC</td><td style="text-align:right">€${totalStoc.toLocaleString()}</td></tr>
            </table>`;
    }

    if (tipRaport === 'vanzari') {
        const sold = tranzactiiData.filter(t => t.status === 'Sold');
        const totalRevenue = sold.reduce((s, t) => s + t.suma, 0);
        const byPlata = {};
        sold.forEach(t => { byPlata[t.tipPlata] = (byPlata[t.tipPlata] || 0) + t.suma; });
        html += `
            <div class="title">Raport Vânzări Lunare</div>
            <div class="subtitle">Sumar tranzacții finalizate — Februarie 2026</div>
            <div class="summary">
                <div class="summary-card"><div class="value">${sold.length}</div><div class="label">Tranzacții finalizate</div></div>
                <div class="summary-card"><div class="value">€${(totalRevenue / 1000).toFixed(0)}K</div><div class="label">Revenue total</div></div>
                <div class="summary-card"><div class="value">€${(totalRevenue / sold.length / 1000).toFixed(0)}K</div><div class="label">Valoare medie</div></div>
                <div class="summary-card"><div class="value">${tranzactiiData.filter(t => t.status === 'Processing').length}</div><div class="label">În procesare</div></div>
            </div>
            <table>
                <tr><th>ID</th><th>Client</th><th>Mașină</th><th>Data</th><th>Plata</th><th>Sumă (€)</th></tr>
                ${sold.map(t => `<tr><td>${t.id}</td><td>${t.client}</td><td>${t.masina}</td><td>${t.data}</td><td>${t.tipPlata}</td><td style="text-align:right;font-weight:600">${t.suma.toLocaleString()}</td></tr>`).join('')}
                <tr class="total-row"><td colspan="5" style="text-align:right">TOTAL REVENUE</td><td style="text-align:right">€${totalRevenue.toLocaleString()}</td></tr>
            </table>
            <div style="margin-top:20px">
                <div class="subtitle">Distribuție pe metode de plată:</div>
                ${Object.entries(byPlata).map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px"><span>${k}</span><span style="font-weight:600">€${v.toLocaleString()}</span></div>`).join('')}
            </div>`;
    }

    if (tipRaport === 'reparatii') {
        const finalizate = reparatiiData.filter(r => r.status === 'Finalizat');
        const totalCost = reparatiiData.reduce((s, r) => s + r.cost, 0);
        const costMediu = finalizate.length > 0 ? finalizate.reduce((s, r) => s + r.cost, 0) / finalizate.length : 0;
        html += `
            <div class="title">Raport Reparații Service</div>
            <div class="subtitle">Situația lucrărilor de service — Februarie 2026</div>
            <div class="summary">
                <div class="summary-card"><div class="value">${reparatiiData.length}</div><div class="label">Total reparații</div></div>
                <div class="summary-card"><div class="value">${finalizate.length}</div><div class="label">Finalizate</div></div>
                <div class="summary-card"><div class="value">€${totalCost.toLocaleString()}</div><div class="label">Cost total</div></div>
                <div class="summary-card"><div class="value">€${costMediu.toLocaleString()}</div><div class="label">Cost mediu</div></div>
            </div>
            <table>
                <tr><th>ID</th><th>Mașină</th><th>Mecanic</th><th>Data</th><th>Status</th><th>Cost (€)</th></tr>
                ${reparatiiData.map(r => `<tr><td>${r.id}</td><td>${r.masina}</td><td>${r.mecanic}</td><td>${r.data}</td><td>${r.status}</td><td style="text-align:right;font-weight:600">${r.cost > 0 ? r.cost.toLocaleString() : '—'}</td></tr>`).join('')}
                <tr class="total-row"><td colspan="5" style="text-align:right">COST TOTAL SERVICE</td><td style="text-align:right">€${totalCost.toLocaleString()}</td></tr>
            </table>`;
    }

    if (tipRaport === 'factura') {
        const trx = tranzactiiData.find(t => t.id === facturaId) || tranzactiiData[0];
        const tva = trx.suma * 0.19;
        const totalCuTVA = trx.suma + tva;
        html += `
            <div class="title">Factură Proformă</div>
            <div class="subtitle">Nr. ${trx.id} — Data emitere: ${dataGenerare}</div>
            <div class="factura-box">
                <div style="display:flex;justify-content:space-between;margin-bottom:20px">
                    <div>
                        <div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Vânzător</div>
                        <div style="font-weight:700;font-size:16px">AerYan SRL</div>
                        <div style="font-size:13px;color:#666">CUI: RO12345678</div>
                        <div style="font-size:13px;color:#666">Str. Auto Premium Nr. 42, București</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Cumpărător</div>
                        <div style="font-weight:700;font-size:16px">${trx.client}</div>
                        <div style="font-size:13px;color:#666">Client înregistrat</div>
                    </div>
                </div>
                <table>
                    <tr><th>Descriere</th><th>Cantitate</th><th>Preț unitar (€)</th><th>Total (€)</th></tr>
                    <tr><td>${trx.masina}</td><td style="text-align:center">1</td><td style="text-align:right">${trx.suma.toLocaleString()}</td><td style="text-align:right;font-weight:600">${trx.suma.toLocaleString()}</td></tr>
                </table>
                <div style="margin-top:20px;text-align:right">
                    <div class="factura-row"><span class="factura-label">Subtotal</span><span class="factura-value">€${trx.suma.toLocaleString()}</span></div>
                    <div class="factura-row"><span class="factura-label">TVA (19%)</span><span class="factura-value">€${tva.toLocaleString()}</span></div>
                    <div class="factura-row" style="border-top:2px solid #895af6;padding-top:12px"><span style="font-size:18px;font-weight:800">TOTAL DE PLATĂ</span><span style="font-size:24px;font-weight:800;color:#895af6">€${totalCuTVA.toLocaleString()}</span></div>
                </div>
                <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end">
                    <div>
                        <div style="font-size:12px;color:#999">Metoda de plată: <strong style="color:#1a1a2e">${trx.tipPlata}</strong></div>
                        <div style="font-size:12px;color:#999;margin-top:4px">Status: <strong style="color:#1a1a2e">${trx.status === 'Sold' ? 'Achitat' : 'În procesare'}</strong></div>
                    </div>
                    <div class="stamp">${trx.status === 'Sold' ? 'ACHITAT' : 'PROFORMĂ'}</div>
                </div>
            </div>`;
    }

    html += `
        <div class="footer">
            Document generat automat din platforma AerYan — ${dataGenerare} ${oraGenerare}<br/>
            Acest document are caracter informativ. AerYan SRL — Toate drepturile rezervate.
        </div>
        </body></html>`;

    return html;
}

/* ================================================================= */
/*  COMPONENT                                                         */
/* ================================================================= */
function RapoartePDF() {
    const [selectedReport, setSelectedReport] = useState(null);
    const [facturaSelectata, setFacturaSelectata] = useState(null);
    const [previewHtml, setPreviewHtml] = useState(null);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [masiniStoc, setMasiniStoc] = useState([]);
    const [tranzactiiData, setTranzactiiData] = useState([]);
    const [reparatiiData, setReparatiiData] = useState([]);
    const [generatedHistory, setGeneratedHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('aeryan_rapoarte_history');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [masini, tranzactii, reparatii] = await Promise.all([
                    apiGet('/api/masini'),
                    apiGet('/api/tranzactii'),
                    apiGet('/api/reparatii'),
                ]);
                setMasiniStoc(masini.map(m => ({
                    id: m.idMasina, marca: m.marca, model: m.model, an: m.anFabricatie,
                    pret: m.pretEuro, status: m.status, km: m.km,
                })));
                const trxMapped = tranzactii.map(t => ({
                    id: `TRX-${String(t.idTranzactie).padStart(3, '0')}`,
                    idOriginal: t.idTranzactie,
                    client: t.clientTranzactie ? `${t.clientTranzactie.nume} ${t.clientTranzactie.prenume}` : '—',
                    masina: t.Masina ? `${t.Masina.marca} ${t.Masina.model}` : '—',
                    suma: t.suma || 0,
                    tipPlata: t.tipPlata || 'Cash',
                    data: t.dataTranzactie ? new Date(t.dataTranzactie).toISOString().split('T')[0] : '—',
                    status: t.status,
                }));
                setTranzactiiData(trxMapped);
                if (trxMapped.length > 0) setFacturaSelectata(trxMapped[0].id);
                const statusRepMap = { 0: 'În așteptare', 1: 'În lucru', 2: 'Finalizat' };
                setReparatiiData(reparatii.map(r => ({
                    id: `REP-${String(r.idReparatie).padStart(3, '0')}`,
                    masina: r.Masina ? `${r.Masina.marca} ${r.Masina.model}` : '—',
                    mecanic: r.mecanic ? `${r.mecanic.nume} ${r.mecanic.prenume}` : '—',
                    cost: r.cost || 0,
                    status: statusRepMap[r.statusReparatie] || 'În așteptare',
                    data: r.dataInceput ? new Date(r.dataInceput).toISOString().split('T')[0] : '—',
                })));
            } catch (e) { console.error('Eroare la încărcarea datelor rapoarte:', e); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    const handlePreview = (tipId) => {
        const fId = tipId === 'factura' ? facturaSelectata : null;
        const html = generatePDFContent(tipId, fId, masiniStoc, tranzactiiData, reparatiiData);
        setPreviewHtml(html);
        setSelectedReport(tipId);
    };

    const handleDownload = () => {
        if (!previewHtml) return;
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(previewHtml);
        printWindow.document.close();
        printWindow.document.title = 'AerYan — Raport PDF';
        printWindow.focus();
        printWindow.onafterprint = () => printWindow.close();
        setTimeout(() => printWindow.print(), 400);

        const cfg = rapoarteConfig.find(r => r.id === selectedReport);
        const label = selectedReport === 'factura' ? `Factură ${facturaSelectata}` : cfg?.titlu || selectedReport;
        const now = new Date();
        setGeneratedHistory(prev => {
            const updated = [
                { tip: label, data: `${now.toLocaleDateString('ro-RO')} ${now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`, pagini: selectedReport === 'factura' ? 1 : 2 },
                ...prev,
            ];
            try { localStorage.setItem('aeryan_rapoarte_history', JSON.stringify(updated)); } catch { }
            return updated;
        });
        setToast(`${label} — deschis pentru tipărire/descărcare`);
        setTimeout(() => setToast(null), 3500);
    };

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă datele...</div></div>;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6" style={{ paddingTop: '6rem' }}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#895af6] text-3xl">picture_as_pdf</span>
                        Rapoarte & Facturi PDF
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Generează rapoarte de inventar, vânzări, service sau facturi proformă</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Documentele se deschid în fereastră nouă pentru Print / Save as PDF
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Tipuri rapoarte', val: rapoarteConfig.length, icon: 'description', color: 'text-[#895af6]', bg: 'bg-[#895af6]/10' },
                    { label: 'Mașini în stoc', val: masiniStoc.length, icon: 'directions_car', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Tranzacții', val: tranzactiiData.length, icon: 'payments', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Rapoarte generate', val: generatedHistory.length, icon: 'history', color: 'text-teal-400', bg: 'bg-teal-500/10' },
                ].map(k => (
                    <div key={k.label} className="glass-panel rounded-xl p-4 flex items-center gap-3">
                        <div className={k.bg + ' size-11 rounded-lg flex items-center justify-center'}>
                            <span className={'material-symbols-outlined ' + k.color}>{k.icon}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{k.val}</p>
                            <p className="text-xs text-slate-400">{k.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Report Types Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {rapoarteConfig.map(r => (
                    <div key={r.id}
                        onClick={() => { setSelectedReport(r.id); setPreviewHtml(null); }}
                        className={'glass-panel rounded-2xl p-6 cursor-pointer group transition-all hover:border-[#895af6]/30 hover:shadow-lg hover:shadow-[#895af6]/5 '
                            + (selectedReport === r.id ? 'ring-2 ring-[#895af6]/50 border-[#895af6]/30' : '')}>
                        <div className={r.bg + ' size-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform'}>
                            <span className={'material-symbols-outlined text-2xl ' + r.color}>{r.icon}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#895af6] transition">{r.titlu}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{r.descriere}</p>
                        <div className="mt-4 flex items-center gap-1 text-xs text-[#895af6] opacity-0 group-hover:opacity-100 transition">
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            Selectează pentru generare
                        </div>
                    </div>
                ))}
            </div>

            {/* Selected Report Panel */}
            {selectedReport && (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    {/* Panel header */}
                    <div className="p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {(() => {
                                const cfg = rapoarteConfig.find(r => r.id === selectedReport);
                                return (
                                    <>
                                        <div className={cfg.bg + ' size-10 rounded-lg flex items-center justify-center'}>
                                            <span className={'material-symbols-outlined ' + cfg.color}>{cfg.icon}</span>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">{cfg.titlu}</h2>
                                            <p className="text-xs text-slate-400">{cfg.descriere}</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Factura Selector */}
                            {selectedReport === 'factura' && (
                                <select value={facturaSelectata} onChange={e => { setFacturaSelectata(e.target.value); setPreviewHtml(null); }}
                                    className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:ring-[#895af6] focus:border-[#895af6] outline-none transition">
                                    {tranzactiiData.map(t => (
                                        <option key={t.id} value={t.id} className="bg-[#1a1333] text-white">
                                            {t.id} — {t.client} — €{t.suma.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button onClick={() => handlePreview(selectedReport)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition">
                                <span className="material-symbols-outlined text-[18px]">visibility</span>
                                Previzualizare
                            </button>
                            <button onClick={handleDownload} disabled={!previewHtml}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Descarcă / Printează PDF
                            </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="p-6">
                        {!previewHtml ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                <span className="material-symbols-outlined text-6xl mb-3">preview</span>
                                <p className="text-lg font-medium">Apasă „Previzualizare" pentru a vedea raportul</p>
                                <p className="text-sm mt-1">Documentul va fi afișat mai jos înainte de descărcare</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/30">
                                <div className="bg-slate-100 px-4 py-2 flex items-center gap-2 border-b">
                                    <div className="flex gap-1.5">
                                        <div className="size-3 rounded-full bg-red-400"></div>
                                        <div className="size-3 rounded-full bg-amber-400"></div>
                                        <div className="size-3 rounded-full bg-emerald-400"></div>
                                    </div>
                                    <span className="text-xs text-slate-500 ml-2 font-mono">AerYan — {rapoarteConfig.find(r => r.id === selectedReport)?.titlu}</span>
                                </div>
                                <iframe
                                    srcDoc={previewHtml}
                                    title="PDF Preview"
                                    className="w-full border-0"
                                    style={{ height: '600px' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Generated History */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">history</span>
                    Istoric Rapoarte Generate
                </h3>
                {generatedHistory.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Niciun raport generat încă.</p>
                ) : (
                    <div className="space-y-2">
                        {generatedHistory.map((h, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-4 py-3 border border-white/5 hover:bg-white/[0.05] transition">
                                <div className="flex items-center gap-3">
                                    <div className="size-9 bg-[#895af6]/10 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#895af6] text-[18px]">description</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{h.tip}</p>
                                        <p className="text-xs text-slate-500">{h.data}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-slate-500">{h.pagini} {h.pagini === 1 ? 'pagină' : 'pagini'}</span>
                                    <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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

export default RapoartePDF;
