import { useState, useEffect } from 'react';
import { apiGet } from '../../config/apiHelper';

/* ------------------------------------------------------------------ */
/*  Fișe Reparație PDF — Mecanic                                       */
/* ------------------------------------------------------------------ */
const combustibilMap = { 0: 'Benzină', 1: 'Diesel', 2: 'Hibrid', 3: 'Electric' };
const categorieMap = { 0: 'Sedan', 1: 'SUV', 2: 'Coupe', 3: 'Hatchback', 4: 'Cabrio', 5: 'Break' };

const statusMap = {
    0: 'Așteptare', 1: 'În Lucru', 2: 'Finalizat',
};
const statusStyle = {
    0: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: 'inbox' },
    1: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: 'engineering' },
    2: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', icon: 'verified' },
};
/* ------------------------------------------------------------------ */
/*  Generare HTML pentru Fișă Reparație                                */
/* ------------------------------------------------------------------ */
function generateFisaPDF(rep) {
    const now = new Date();
    const dataGenerare = now.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const oraGenerare = now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    const costPiese = rep.piese.reduce((s, p) => s + p.pret, 0);

    return `<html><head><title>Fișă Reparație — ${rep.masina.marca} ${rep.masina.model}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 36px; background: #fff; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #895af6; padding-bottom: 16px; }
    .logo { font-size: 26px; font-weight: 800; color: #895af6; letter-spacing: -1px; }
    .logo span { color: #1a1a2e; }
    .meta { text-align: right; font-size: 11px; color: #666; line-height: 1.8; }
    .doc-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #1a1a2e; }
    .doc-sub { font-size: 12px; color: #666; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #895af6; margin-bottom: 10px; border-bottom: 1px solid #e8e8ef; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f4f4f8; }
    .info-label { color: #888; font-size: 12px; }
    .info-value { font-weight: 600; font-size: 12px; }
    .desc-box { background: #f8f7ff; border-left: 3px solid #895af6; padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 13px; line-height: 1.6; color: #333; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th { background: #895af6; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #e8e8ef; }
    tr:nth-child(even) td { background: #f8f7ff; }
    .total-row { background: #895af6 !important; color: #fff; font-weight: 700; }
    .total-row td { border: none; }
    .cost-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    .cost-card { background: #f4f0ff; border-radius: 8px; padding: 14px; text-align: center; }
    .cost-card .value { font-size: 20px; font-weight: 800; color: #895af6; }
    .cost-card .label { font-size: 10px; color: #666; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px; }
    .stamp-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; padding-top: 16px; border-top: 2px solid #e8e8ef; }
    .stamp-box { border: 2px dashed #ccc; border-radius: 8px; width: 180px; height: 80px; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
    .status-lucru { background: #dbeafe; color: #2563eb; }
    .status-finalizat { background: #d1fae5; color: #059669; }
    .status-other { background: #f1f5f9; color: #64748b; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e8e8ef; font-size: 10px; color: #999; text-align: center; }
    @media print { body { padding: 16px; } }
</style></head><body>
    <div class="header">
        <div>
            <div class="logo">Aer<span>Yan</span></div>
            <div style="font-size:11px;color:#666;margin-top:2px">Service Auto — Fișă Reparație</div>
        </div>
        <div class="meta">
            <div>Nr. Fișă: <strong>FR-${String(rep.idReparatie).padStart(4, '0')}</strong></div>
            <div>Data generării: ${dataGenerare}</div>
            <div>Ora: ${oraGenerare}</div>
        </div>
    </div>

    <div class="doc-title">Fișă de Reparație #${rep.idReparatie}</div>
    <div class="doc-sub">
        ${rep.masina.marca} ${rep.masina.model}
        &nbsp;&nbsp;
        <span class="status-badge ${rep.statusReparatie === 1 ? 'status-lucru' : rep.statusReparatie === 2 ? 'status-finalizat' : 'status-other'}">${statusMap[rep.statusReparatie]}</span>
    </div>

    <div class="section">
        <div class="section-title">Informații Vehicul</div>
        <div class="info-grid">
            <div class="info-row"><span class="info-label">Marcă / Model</span><span class="info-value">${rep.masina.marca} ${rep.masina.model}</span></div>
            <div class="info-row"><span class="info-label">An Fabricație</span><span class="info-value">${rep.masina.anFabricatie}</span></div>
            <div class="info-row"><span class="info-label">Kilometraj</span><span class="info-value">${Number(rep.masina.km).toLocaleString()} km</span></div>
            <div class="info-row"><span class="info-label">Combustibil</span><span class="info-value">${rep.masina.combustibil}</span></div>
            <div class="info-row"><span class="info-label">Caroserie</span><span class="info-value">${rep.masina.categorieAuto}</span></div>
            <div class="info-row"><span class="info-label">Preț Vehicul</span><span class="info-value">€${Number(rep.masina.pretEuro).toLocaleString()}</span></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Detalii Reparație</div>
        <div class="info-grid">
            <div class="info-row"><span class="info-label">Mecanic responsabil</span><span class="info-value">${rep.mecanic}</span></div>
            <div class="info-row"><span class="info-label">Data început</span><span class="info-value">${rep.dataInceput || '—'}</span></div>
            <div class="info-row"><span class="info-label">Data finalizare</span><span class="info-value">${rep.dataFinalizare || 'În desfășurare'}</span></div>
            <div class="info-row"><span class="info-label">Cost total</span><span class="info-value">€${Number(rep.cost).toLocaleString()}</span></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Descriere Problemă</div>
        <div class="desc-box">${rep.descriereProblema}</div>
    </div>

    <div class="section">
        <div class="section-title">Piese Utilizate</div>
        <table>
            <tr><th>#</th><th>Denumire</th><th>Categorie</th><th style="text-align:right">Preț (€)</th></tr>
            ${rep.piese.map((p, i) => `<tr><td>${i + 1}</td><td>${p.denumire}</td><td>${p.categorie || '—'}</td><td style="text-align:right;font-weight:600">${Number(p.pret).toLocaleString()}</td></tr>`).join('')}
            <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL PIESE</td><td style="text-align:right">€${costPiese.toLocaleString()}</td></tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Sumar Costuri</div>
        <div class="cost-grid">
            <div class="cost-card">
                <div class="value">€${costPiese.toLocaleString()}</div>
                <div class="label">Piese & Materiale</div>
            </div>
            <div class="cost-card" style="background:#895af6;border-radius:8px">
                <div class="value" style="color:#fff;font-size:24px">€${Number(rep.cost).toLocaleString()}</div>
                <div class="label" style="color:#e0d4ff">Cost Total</div>
            </div>
        </div>
    </div>

    <div class="stamp-area">
        <div>
            <div style="font-size:11px;color:#666;margin-bottom:4px">Mecanic responsabil:</div>
            <div style="font-weight:700;font-size:14px">${rep.mecanic}</div>
            <div style="font-size:11px;color:#999;margin-top:2px">Semnătură: _______________________</div>
        </div>
        <div class="stamp-box">Ștampilă service</div>
        <div style="text-align:right">
            <div style="font-size:11px;color:#666;margin-bottom:4px">Director:</div>
            <div style="font-weight:700;font-size:14px">_______________________</div>
            <div style="font-size:11px;color:#999;margin-top:2px">Semnătură: _______________________</div>
        </div>
    </div>

    <div class="footer">
        Document generat automat din platforma AerYan — ${dataGenerare} ${oraGenerare}<br/>
        Fișă de reparație cu caracter informativ. AerYan SRL — Toate drepturile rezervate.
    </div>
</body></html>`;
}

/* ================================================================= */
/*  COMPONENT                                                         */
/* ================================================================= */
function FisaReparatiePDF() {
    const [reparatiiData, setReparatiiData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [previewHtml, setPreviewHtml] = useState(null);
    const [toast, setToast] = useState(null);
    const [printHistory, setPrintHistory] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const data = await apiGet('/api/reparatii');
                const mapped = (Array.isArray(data) ? data : []).map(r => ({
                    idReparatie: r.idReparatie,
                    masina: {
                        marca: r.Masina?.marca || '—',
                        model: r.Masina?.model || '—',
                        anFabricatie: r.Masina?.anFabricatie || '—',
                        km: r.Masina?.km || 0,
                        combustibil: combustibilMap[r.Masina?.combustibil] ?? '—',
                        categorieAuto: categorieMap[r.Masina?.categorieAuto] ?? '—',
                        pretEuro: r.Masina?.pretEuro || 0,
                        imaginePrincipala: r.Masina?.imaginePrincipala || '',
                    },
                    statusReparatie: r.statusReparatie,
                    descriereProblema: r.descriereProblema || '—',
                    cost: r.cost || 0,
                    mecanic: r.mecanic ? `${r.mecanic.prenume} ${r.mecanic.nume}` : '—',
                    dataInceput: r.dataInceput || null,
                    dataFinalizare: r.dataFinalizare || null,
                    piese: (r.Piesas || []).map(p => ({
                        denumire: p.denumire,
                        categorie: p.categorie || '—',
                        pret: p.pret || 0,
                    })),
                }));
                setReparatiiData(mapped);
            } catch (e) {
                console.error(e);
                setError('Eroare la încărcarea reparațiilor.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const selectedRep = selectedId !== null ? reparatiiData.find(r => r.idReparatie === selectedId) : null;

    const handlePreview = (id) => {
        const rep = reparatiiData.find(r => r.idReparatie === id);
        if (!rep) return;
        setSelectedId(id);
        setPreviewHtml(generateFisaPDF(rep));
    };

    const handlePrint = () => {
        if (!previewHtml || !selectedRep) return;
        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(previewHtml);
        win.document.close();
        win.document.title = `AerYan — Fișă Reparație FR-${String(selectedRep.idReparatie).padStart(4, '0')}`;
        win.focus();
        win.onafterprint = () => win.close();
        setTimeout(() => win.print(), 400);

        const now = new Date();
        setPrintHistory(prev => [
            {
                masina: `${selectedRep.masina.marca} ${selectedRep.masina.model}`,
                fisa: `FR-${String(selectedRep.idReparatie).padStart(4, '0')}`,
                data: `${now.toLocaleDateString('ro-RO')} ${now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`,
            },
            ...prev,
        ]);
        setToast(`Fișă FR-${String(selectedRep.idReparatie).padStart(4, '0')} — deschisă pentru tipărire`);
        setTimeout(() => setToast(null), 3500);
    };

    // Stats
    const finalizate = reparatiiData.filter(r => r.statusReparatie === 2).length;
    const inLucru = reparatiiData.filter(r => r.statusReparatie === 1).length;
    const costTotal = reparatiiData.reduce((s, r) => s + r.cost, 0);

    if (loading) return (
        <main className="flex-1 flex items-center justify-center" style={{ paddingTop: '6rem' }}>
            <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-[#895af6] text-4xl animate-spin">progress_activity</span>
                <span className="text-slate-400 text-sm">Se încarcă reparațiile…</span>
            </div>
        </main>
    );
    if (error) return (
        <main className="flex-1 flex items-center justify-center" style={{ paddingTop: '6rem' }}>
            <div className="glass-panel rounded-2xl p-8 text-center max-w-md">
                <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
                <p className="text-red-400">{error}</p>
            </div>
        </main>
    );

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6" style={{ paddingTop: '6rem' }}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#895af6] text-3xl">picture_as_pdf</span>
                        Fișe Reparație PDF
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Generează fișe de reparație printabile pentru fiecare lucrare</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Selectează o reparație → Previzualizare → Print / Save as PDF
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Reparații', val: reparatiiData.length, icon: 'build', color: 'text-[#895af6]', bg: 'bg-[#895af6]/10' },
                    { label: 'În Lucru', val: inLucru, icon: 'engineering', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Finalizate', val: finalizate, icon: 'verified', color: 'text-teal-400', bg: 'bg-teal-500/10' },
                    { label: 'Cost Total Service', val: `€${(costTotal / 1000).toFixed(1)}K`, icon: 'payments', color: 'text-amber-400', bg: 'bg-amber-500/10' },
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

            {/* Repair Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {reparatiiData.map(r => {
                    const st = statusStyle[r.statusReparatie] || statusStyle[0];
                    const isSelected = selectedId === r.idReparatie;
                    return (
                        <div key={r.idReparatie}
                            onClick={() => handlePreview(r.idReparatie)}
                            className={'glass-panel rounded-2xl p-5 cursor-pointer group transition-all hover:border-[#895af6]/30 hover:shadow-lg hover:shadow-[#895af6]/5 '
                                + (isSelected ? 'ring-2 ring-[#895af6]/50 border-[#895af6]/30' : '')}>
                            {/* Top row */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-[#895af6] transition">
                                        {r.masina.marca} {r.masina.model}
                                    </h3>
                                    <p className="text-xs text-slate-400">{r.masina.anFabricatie} · {r.masina.combustibil}</p>
                                </div>
                                <span className={'inline-flex items-center gap-1 ' + st.bg + ' ' + st.text + ' border ' + st.border + ' text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap'}>
                                    <span className="material-symbols-outlined text-[12px]">{st.icon}</span>
                                    {statusMap[r.statusReparatie]}
                                </span>
                            </div>

                            {/* Problem */}
                            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed mb-3">{r.descriereProblema}</p>

                            {/* Piese tags */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {r.piese.map((p, i) => (
                                    <span key={i} className="text-[10px] bg-white/5 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full">
                                        {p.denumire}
                                    </span>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">person</span>
                                        {r.mecanic}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-white font-mono">€{Number(r.cost).toLocaleString()}</span>
                            </div>

                            {/* Hover hint */}
                            <div className="mt-3 flex items-center gap-1 text-xs text-[#895af6] opacity-0 group-hover:opacity-100 transition">
                                <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                                Click pentru previzualizare fișă PDF
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Preview Panel */}
            {selectedRep && previewHtml && (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-[#895af6]/10 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#895af6]">description</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Fișă FR-{String(selectedRep.idReparatie).padStart(4, '0')} — {selectedRep.masina.marca} {selectedRep.masina.model}
                                </h2>
                                <p className="text-xs text-slate-400">Mecanic: {selectedRep.mecanic}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setSelectedId(null); setPreviewHtml(null); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                                Închide
                            </button>
                            <button onClick={handlePrint}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform">
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Descarcă / Printează PDF
                            </button>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="bg-white rounded-xl overflow-hidden shadow-2xl shadow-black/30">
                            <div className="bg-slate-100 px-4 py-2 flex items-center gap-2 border-b">
                                <div className="flex gap-1.5">
                                    <div className="size-3 rounded-full bg-red-400"></div>
                                    <div className="size-3 rounded-full bg-amber-400"></div>
                                    <div className="size-3 rounded-full bg-emerald-400"></div>
                                </div>
                                <span className="text-xs text-slate-500 ml-2 font-mono">
                                    AerYan — Fișă Reparație FR-{String(selectedRep.idReparatie).padStart(4, '0')}
                                </span>
                            </div>
                            <iframe
                                srcDoc={previewHtml}
                                title="PDF Preview"
                                className="w-full border-0"
                                style={{ height: '700px' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Print History */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400">history</span>
                    Istoric Fișe Printate
                </h3>
                {printHistory.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">Nicio fișă printată încă.</p>
                ) : (
                    <div className="space-y-2">
                        {printHistory.map((h, i) => (
                            <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-4 py-3 border border-white/5 hover:bg-white/[0.05] transition">
                                <div className="flex items-center gap-3">
                                    <div className="size-9 bg-[#895af6]/10 rounded-lg flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#895af6] text-[18px]">description</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{h.masina}</p>
                                        <p className="text-xs text-slate-500">{h.fisa} · {h.data}</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
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

export default FisaReparatiePDF;
