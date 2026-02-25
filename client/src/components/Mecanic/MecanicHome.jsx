import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiGet, apiPut } from '../../config/apiHelper';
import API_URL from '../../config/api';

// DB statusReparatie: 0=Așteptare, 1=În Lucru, 2=Finalizat
const statusMap = { 0: 'Așteptare', 1: 'În Lucru', 2: 'Finalizat' };
const combustibilMap = { 0: 'Benzină', 1: 'Diesel', 2: 'Hibrid', 3: 'Electric' };

// ── Component ────────────────────────────────────────────
const statusLabels = { 0: 'AȘTEPTARE', 1: 'ÎN LUCRU', 2: 'FINALIZAT' };

function MecanicHome() {
    const location = useLocation();
    const navigate = useNavigate();
    const [reparatii, setReparatii] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [searchVin, setSearchVin] = useState('');
    const [noteExpanded, setNoteExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch reparații din API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await apiGet('/api/reparatii');
                const mapped = data.map(r => ({
                    idReparatie: r.idReparatie,
                    masina: r.Masina ? {
                        marca: r.Masina.marca || 'N/A',
                        model: r.Masina.model || '',
                    } : { marca: 'N/A', model: '' },
                    statusReparatie: r.statusReparatie,
                    descriereProblema: r.descriereProblema || '',
                    dataInceput: r.dataInceput ? new Date(r.dataInceput).toISOString().split('T')[0] : '',
                    dataFinalizare: r.dataFinalizare ? new Date(r.dataFinalizare).toISOString().split('T')[0] : null,
                    cost: r.cost || 0,
                    mecanic: r.mecanic ? `${r.mecanic.prenume} ${r.mecanic.nume}` : 'N/A',
                    imagine: r.Masina?.imaginePrincipala ? `${API_URL}${r.Masina.imaginePrincipala}` : 'https://placehold.co/800x400/2e2249/895af6?text=Auto',
                    piese: (r.Piesas || []).map(p => ({
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
                setError('Eroare la încărcarea reparațiilor.');
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
            const exists = reparatii.find(r => r.idReparatie === location.state.repId);
            if (exists) setSelectedId(location.state.repId);
        }
    }, [location.state, reparatii]);

    // Confirmare status
    const [confirmModal, setConfirmModal] = useState(null);
    const [lockedFloor, setLockedFloor] = useState({});
    const [notificariLog, setNotificariLog] = useState([]);
    const [toast, setToast] = useState(null);

    // ── Filtrare reparații ──
    const reparatiiFiltrate = reparatii.filter(r => {
        if (searchVin) {
            const q = searchVin.toLowerCase();
            return `${r.masina.marca} ${r.masina.model}`.toLowerCase().includes(q)
                || r.descriereProblema.toLowerCase().includes(q);
        }
        return true;
    });

    const selected = reparatii.find(r => r.idReparatie === selectedId) || reparatii[0];

    // ── Acțiuni ──
    const cereConfirmare = (newStatus) => {
        if (!selected) return;
        const floor = lockedFloor[selected.idReparatie];
        // Nu permite revenire la un status deja blocat sau re-selectarea aceluiași status
        if (floor !== undefined && newStatus <= floor) return;
        if (newStatus === selected.statusReparatie) return;
        setConfirmModal({ idReparatie: selected.idReparatie, newStatus });
    };

    const confirmaSchimbare = async () => {
        if (!confirmModal) return;
        const { idReparatie, newStatus } = confirmModal;
        const rep = reparatii.find(r => r.idReparatie === idReparatie);
        try {
            await apiPut(`/api/reparatii/${idReparatie}`, { statusReparatie: newStatus });
        } catch (err) { console.error(err); }
        // Schimbă status local
        setReparatii(prev => prev.map(r =>
            r.idReparatie === idReparatie
                ? { ...r, statusReparatie: newStatus }
                : r
        ));
        // Blochează statusurile anterioare (nu poți reveni sub noul status)
        setLockedFloor(prev => ({ ...prev, [idReparatie]: newStatus }));
        // Notificare către Director
        const now = new Date();
        const msg = {
            id: Date.now(),
            ora: now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
            data: now.toLocaleDateString('ro-RO'),
            masina: `${rep.masina.marca} ${rep.masina.model}`,
            an: rep.masina.anFabricatie,
            delaStatus: statusLabels[rep.statusReparatie],
            laStatus: statusLabels[newStatus],
        };
        setNotificariLog(prev => [msg, ...prev]);
        // Toast
        setToast(`Director notificat: ${msg.masina} → ${msg.laStatus}`);
        setTimeout(() => setToast(null), 3000);
        setConfirmModal(null);
    };

    const totalPiese = selected ? selected.piese.reduce((s, p) => s + p.pret, 0) : 0;

    const statusBadge = (s) => {
        if (s === 1) return { label: 'ÎN LUCRU', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: true };
        if (s === 2) return { label: 'FINALIZAT', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: 'check' };
        return { label: 'AȘTEPTARE', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', icon: 'hourglass_top' };
    };

    const progressColor = (s) => {
        if (s === 2) return 'bg-emerald-500';
        if (s === 1) return 'bg-[#895af6] shadow-[0_0_8px_rgba(137,90,246,0.6)]';
        return 'bg-slate-500';
    };

    const tabs = [];

    if (loading) return (
        <div className="min-h-screen bg-[#151022] pt-20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#895af6] text-5xl animate-spin">progress_activity</span>
        </div>
    );
    if (error) return (
        <div className="min-h-screen bg-[#151022] pt-20 flex items-center justify-center">
            <p className="text-red-400">{error}</p>
        </div>
    );
    if (reparatii.length === 0) return (
        <div className="min-h-screen bg-[#151022] pt-20 flex items-center justify-center">
            <p className="text-slate-400">Nu există reparații asignate.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#151022] pt-20 flex flex-col" style={{ height: 'calc(100vh)' }}>
            {/* Header subtitle (sub Navbar) */}
            <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 min-h-0 overflow-hidden">

                {/* ═══ LEFT — Lista Reparații ═══ */}
                <section className="glass-panel col-span-12 md:col-span-4 lg:col-span-3 rounded-2xl flex flex-col min-h-0">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-[#151022]/30">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#895af6] text-xl">build</span>
                            Reparații
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Lista reparațiilor asignate</p>
                    </div>

                    {/* Search */}
                    <div className="p-4 pb-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                <span className="material-symbols-outlined text-[18px]">search</span>
                            </div>
                            <input
                                type="text"
                                value={searchVin}
                                onChange={e => setSearchVin(e.target.value)}
                                placeholder="Caută marcă, model..."
                                className="block w-full p-2.5 pl-10 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-500 transition-all focus:bg-white/10 outline-none"
                            />
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-4">
                        {reparatiiFiltrate.length === 0 && (
                            <p className="text-center text-slate-500 text-sm py-8">Nicio reparație găsită.</p>
                        )}
                        {reparatiiFiltrate.map(r => {
                            const badge = statusBadge(r.statusReparatie);
                            const isSelected = r.idReparatie === selectedId;
                            return (
                                <div
                                    key={r.idReparatie}
                                    onClick={() => setSelectedId(r.idReparatie)}
                                    className={`rounded-xl p-4 cursor-pointer relative group transition border ${isSelected
                                        ? 'bg-[#211834] border-[#895af6]/40 shadow-lg hover:border-[#895af6]'
                                        : 'bg-white/[0.03] border-transparent hover:bg-white/[0.06] hover:border-white/10'
                                    }`}
                                >
                                    {r.statusReparatie === 1 && (
                                        <div className="absolute right-3 top-3">
                                            <span className="material-symbols-outlined text-amber-500 animate-pulse text-lg">timelapse</span>
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full ${badge.bg} px-2 py-0.5 text-xs font-medium ${badge.text} border ${badge.border}`}>
                                            {badge.dot && <span className="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                                            {badge.icon && <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>}
                                            {badge.label}
                                        </span>
                                    </div>
                                    <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                                        {r.masina.marca} {r.masina.model}
                                    </h3>
                                    <p className="text-slate-400 text-sm mt-1">{r.descriereProblema?.substring(0, 50)}...</p>
                                    <div className="mt-4 space-y-2">
                                        {r.statusReparatie === 1 && (
                                            <div className="flex justify-between text-xs text-slate-300">
                                                <span>Progres</span>
                                                <span>{r.statusReparatie === 2 ? 100 : r.statusReparatie === 1 ? 50 : 0}%</span>
                                            </div>
                                        )}
                                        <div className={`h-1.5 w-full bg-slate-700 rounded-full overflow-hidden ${r.statusReparatie === 0 ? 'opacity-50' : ''}`}>
                                            <div className={`h-full ${progressColor(r.statusReparatie)} rounded-full transition-all`} style={{ width: `${r.statusReparatie === 2 ? 100 : r.statusReparatie === 1 ? 50 : 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span> {r.dataInceput}
                                        </span>
                                        <span className="text-xs text-slate-500">{r.piese.length} piese</span>
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
                            <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url('${selected.imagine}')` }}></div>
                            <div className="absolute bottom-4 left-6 z-20 flex flex-wrap items-end justify-between w-[calc(100%-3rem)] gap-2">
                                <div>
                                    <h2 className="text-3xl font-bold text-white tracking-tight">{selected.masina.marca} {selected.masina.model}</h2>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-300">
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">assignment_ind</span> {selected.mecanic}</span>
                                        <span className="flex items-center gap-1 font-mono opacity-70"><span className="material-symbols-outlined text-base">calendar_today</span> {selected.dataInceput}</span>
                                    </div>
                                </div>
                                {/* Status Toggle */}
                                <div className="flex items-center bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/10">
                                    <span className="hidden sm:block text-xs font-bold px-3 py-1.5 text-slate-400">STATUS:</span>
                                    {[{ val: 0, label: 'AȘTEPTARE' }, { val: 1, label: 'ÎN LUCRU' }, { val: 2, label: 'FINALIZAT' }].map(s => {
                                        const floor = lockedFloor[selected.idReparatie];
                                        const isLocked = floor !== undefined && s.val < floor;
                                        const isFullyLocked = floor === 2; // totul blocat dacă e FINALIZAT
                                        const isCurrent = selected.statusReparatie === s.val;
                                        const disabled = isLocked || (isFullyLocked && !isCurrent) || (isCurrent && floor !== undefined);

                                        return (
                                            <button
                                                key={s.val}
                                                onClick={() => !disabled && cereConfirmare(s.val)}
                                                disabled={disabled}
                                                className={`text-xs font-bold px-4 py-1.5 rounded transition flex items-center gap-2 ${
                                                    isLocked
                                                        ? 'text-slate-600 cursor-not-allowed opacity-40'
                                                        : isCurrent
                                                            ? s.val === 1
                                                                ? 'bg-amber-500 text-white shadow-sm'
                                                                : s.val === 2
                                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                                    : 'bg-slate-600 text-white shadow-sm'
                                                            : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {isLocked && <span className="material-symbols-outlined text-[12px]">lock</span>}
                                                {isCurrent && s.val === 1 && !isLocked && (
                                                    <span className="animate-pulse size-2 bg-white rounded-full"></span>
                                                )}
                                                {s.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 space-y-8">
                            {/* Problem Description + Attachments */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#895af6] text-lg">medical_services</span> Descriere Problemă
                                    </label>
                                    <textarea
                                        readOnly
                                        value={selected.descriereProblema}
                                        className="w-full h-32 bg-[#0d0a17]/50 border border-white/10 rounded-xl p-3 text-sm text-slate-200 resize-none placeholder-slate-600 outline-none"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#895af6] text-lg">image</span> Atașamente
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="aspect-square rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-500 text-3xl">no_photography</span>
                                        </div>
                                        <div className="aspect-square rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-500 text-3xl">no_photography</span>
                                        </div>
                                        <div className="aspect-square rounded-lg bg-white/[0.03] border border-white/10 border-dashed flex items-center justify-center cursor-pointer hover:bg-white/5 transition">
                                            <span className="material-symbols-outlined text-slate-500">add_a_photo</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Parts Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#895af6] text-lg">build</span> Piese Necesare
                                    </label>
                                    <button className="text-xs text-[#895af6] font-bold hover:underline">+ Adaugă Piesă</button>
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
                                            {selected.piese.map(p => (
                                                <tr key={p.idPiesa} className="hover:bg-white/[0.03] transition">
                                                    <td className="px-6 py-3 font-medium text-white">{p.denumire}</td>
                                                    <td className="px-6 py-3 text-slate-400">{p.categorie}</td>
                                                    <td className={`px-6 py-3 text-center ${p.stoc === 0 ? 'text-red-400' : p.stoc <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                        {p.stoc} buc
                                                    </td>
                                                    <td className="px-6 py-3 text-right font-mono text-white">{p.pret.toLocaleString()} RON</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-white/5 border-t border-white/10">
                                            <tr>
                                                <td className="px-6 py-3 text-right font-bold text-slate-300" colSpan="3">TOTAL PIESE</td>
                                                <td className="px-6 py-3 text-right font-bold text-xl text-[#895af6] font-mono">{totalPiese.toLocaleString()} RON</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Expandable Notes */}
                            <div className="border border-white/10 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition">
                                <button onClick={() => setNoteExpanded(prev => !prev)} className="w-full flex items-center justify-between p-4 text-left">
                                    <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-slate-400">description</span> Note Tehnice
                                    </span>
                                    <span className={`material-symbols-outlined text-slate-500 transition-transform ${noteExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                </button>
                                {noteExpanded && (
                                    <div className="px-4 pb-4">
                                        <textarea
                                            readOnly
                                            value={selected.descriereProblema || 'Nicio descriere adăugată.'}
                                            className="w-full h-24 bg-[#0d0a17]/50 border border-white/10 rounded-lg p-3 text-sm text-slate-300 resize-none outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sticky Action Footer */}
                    <div className="absolute bottom-0 left-0 right-0 bg-[#1a1333]/95 backdrop-blur-xl border-t border-white/10 p-4 flex flex-wrap items-center justify-between z-30 gap-3">
                        <div className="flex gap-3">
                            <button onClick={() => navigate('/mecanic/fisa-reparatie')} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition">
                                <span className="material-symbols-outlined text-lg">print</span>
                                <span className="hidden sm:inline">Printează Fișă</span>
                            </button>
                            <button onClick={() => { /* Status changes are already visible to director via NotificariPanel */ }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition">
                                <span className="material-symbols-outlined text-lg">send</span>
                                <span className="hidden sm:inline">Notifică Director</span>
                            </button>
                        </div>
                        <button
                            onClick={() => cereConfirmare(2)}
                            disabled={!selected || lockedFloor[selected?.idReparatie] === 2}
                            className={`flex items-center gap-2 px-8 py-2.5 rounded-lg text-white font-bold text-sm shadow-lg transition transform ml-auto ${
                                !selected || lockedFloor[selected?.idReparatie] === 2
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-teal-500/20 hover:scale-105'
                            }`}
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            Marchează FINALIZAT
                        </button>
                    </div>
                </section>

                {/* ═══ RIGHT — Alerts & Quick Actions ═══ */}
                <section className="col-span-12 md:col-span-12 lg:col-span-3 flex flex-col gap-6 min-h-0 overflow-y-auto">
                    {/* Notificări Director */}
                    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#895af6]">notifications_active</span> Notificări Trimise
                            {notificariLog.length > 0 && (
                                <span className="ml-auto text-xs bg-[#895af6] text-white px-2 py-0.5 rounded-full">{notificariLog.length}</span>
                            )}
                        </h3>
                        {notificariLog.length === 0 ? (
                            <p className="text-xs text-slate-500 text-center py-3">Nicio notificare trimisă.</p>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {notificariLog.map(n => (
                                    <div key={n.id} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-white">{n.masina}</span>
                                            <span className="text-[10px] text-slate-500">{n.ora}</span>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            <span className="text-slate-500">{n.an}</span> &middot; {n.delaStatus} → <span className="text-[#895af6] font-medium">{n.laStatus}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stock Alerts */}
                    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">warning</span> Alerte Stoc
                        </h3>
                        {selected && selected.piese.filter(p => p.stoc <= 3).length === 0 && (
                            <p className="text-xs text-slate-500 text-center py-3">Nicio alertă de stoc.</p>
                        )}
                        {selected && selected.piese.filter(p => p.stoc <= 3).map((p, i) => (
                            <div key={i} className={`${p.stoc === 0
                                ? 'bg-red-500/10 border-l-4 border-red-500'
                                : 'bg-amber-500/10 border-l-4 border-amber-500'
                            } rounded p-3 hover:opacity-90 transition`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`text-sm font-bold ${p.stoc === 0 ? 'text-red-100' : 'text-amber-100'}`}>{p.denumire}</p>
                                        <p className={`text-xs mt-1 ${p.stoc === 0 ? 'text-red-300' : 'text-amber-300'}`}>Stoc: {p.stoc} buc</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="glass-panel rounded-2xl p-5 flex-1">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#895af6]">bolt</span> Acțiuni Rapide
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: 'qr_code_scanner', label: 'Scanare VIN' },
                                { icon: 'inventory_2', label: 'Comandă Piese' },
                                { icon: 'calendar_month', label: 'Programări' },
                                { icon: 'history', label: 'Istoric' },
                            ].map(a => (
                                <button key={a.icon} className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/[0.03] hover:bg-[#895af6]/20 border border-white/5 hover:border-[#895af6]/50 transition group">
                                    <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-[#895af6] mb-2 transition-colors">{a.icon}</span>
                                    <span className="text-xs font-medium text-slate-300 group-hover:text-white">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info Reparație */}
                    <div className="glass-panel rounded-2xl p-5 bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#895af6]">info</span> Detalii
                        </h3>
                        {selected && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Mecanic</span>
                                    <span className="text-white font-medium">{selected.mecanic}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Data Început</span>
                                    <span className="text-white font-medium">{selected.dataInceput}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Cost</span>
                                    <span className="text-white font-medium">{selected.cost} RON</span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* ═══ Modal Confirmare Status ═══ */}
            {confirmModal && (() => {
                const rep = reparatii.find(r => r.idReparatie === confirmModal.idReparatie);
                const newLabel = statusLabels[confirmModal.newStatus];
                const oldLabel = statusLabels[rep?.statusReparatie];
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}></div>
                        <div className="relative glass-panel rounded-2xl w-full max-w-md p-6 shadow-2xl border border-white/10">
                            {/* Icon */}
                            <div className="flex justify-center mb-5">
                                <div className={`size-16 rounded-full flex items-center justify-center ${
                                    confirmModal.newStatus === 2 ? 'bg-emerald-500/20' : confirmModal.newStatus === 1 ? 'bg-amber-500/20' : 'bg-slate-500/20'
                                }`}>
                                    <span className={`material-symbols-outlined text-4xl ${
                                        confirmModal.newStatus === 2 ? 'text-emerald-400' : confirmModal.newStatus === 1 ? 'text-amber-400' : 'text-slate-400'
                                    }`}>
                                        {confirmModal.newStatus === 2 ? 'check_circle' : confirmModal.newStatus === 1 ? 'play_circle' : 'pause_circle'}
                                    </span>
                                </div>
                            </div>
                            {/* Text */}
                            <h3 className="text-xl font-bold text-white text-center mb-2">Confirmare Schimbare Status</h3>
                            <p className="text-sm text-slate-400 text-center mb-6">
                                Schimbi statusul reparației <span className="text-white font-medium">{rep?.masina.marca} {rep?.masina.model}</span> din <span className="font-medium text-slate-300">{oldLabel}</span> în <span className={`font-bold ${
                                    confirmModal.newStatus === 2 ? 'text-emerald-400' : confirmModal.newStatus === 1 ? 'text-amber-400' : 'text-slate-300'
                                }`}>{newLabel}</span>?
                            </p>
                            <p className="text-xs text-slate-500 text-center mb-6 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                Directorul va fi notificat automat. Statusul nu va mai putea fi modificat.
                            </p>
                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
                                >
                                    Anulează
                                </button>
                                <button
                                    onClick={confirmaSchimbare}
                                    className={`flex-1 px-4 py-3 rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg ${
                                        confirmModal.newStatus === 2
                                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:shadow-emerald-500/20'
                                            : confirmModal.newStatus === 1
                                                ? 'bg-amber-500 hover:bg-amber-600'
                                                : 'bg-slate-600 hover:bg-slate-500'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-lg">send</span>
                                    Confirmă & Notifică
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#895af6] text-white px-5 py-3 rounded-xl shadow-2xl shadow-[#895af6]/20 animate-[slideUp_0.3s_ease-out]">
                    <span className="material-symbols-outlined">notifications_active</span>
                    <span className="text-sm font-medium">{toast}</span>
                </div>
            )}
        </div>
    );
}

export default MecanicHome;
