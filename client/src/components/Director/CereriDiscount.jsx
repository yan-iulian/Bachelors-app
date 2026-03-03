import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../config/apiHelper';

const statusColors = {
    'Processing': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Rejected': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};
const statusIcons = {
    'Processing': 'schedule',
    'Approved': 'check_circle',
    'Rejected': 'cancel',
};
const statusLabels = {
    'Processing': 'Pending',
    'Approved': 'Aprobat',
    'Rejected': 'Respins',
};

// DB-ul poate avea 'Sold'/'Cancelled' (din seed/tranzactii) sau 'Approved'/'Rejected' (din endpoint-uri discount)
const normalizeStatus = (s) => {
    if (s === 'Sold' || s === 'Approved') return 'Approved';
    if (s === 'Cancelled' || s === 'Rejected') return 'Rejected';
    return 'Processing';
};

function CereriDiscount() {
    const [cereri, setCereri] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Toate');
    const [showDetailModal, setShowDetailModal] = useState(null);

    const fetchCereri = async () => {
        try {
            const data = await apiGet('/api/discount');
            setCereri(data.map(d => ({
                idTranzactie: d.idTranzactie,
                client: d.clientTranzactie ? `${d.clientTranzactie.nume} ${d.clientTranzactie.prenume}` : '—',
                email: d.clientTranzactie?.email || '',
                masina: d.Masina ? `${d.Masina.marca} ${d.Masina.model}` : '—',
                pretOriginal: d.Masina?.pretEuro || 0,
                discountProcent: d.discountProcent,
                motivDiscount: d.motivDiscount || '',
                dataTranzactie: d.dataTranzactie,
                status: normalizeStatus(d.status),
            })));
        } catch (e) { console.error('Eroare la încărcarea cererilor de discount:', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCereri(); }, []);

    const filteredCereri = cereri.filter(c => {
        if (filterStatus === 'Toate') return true;
        return c.status === filterStatus;
    });

    const handleApprove = async (id) => {
        try {
            await apiPut(`/api/discount/${id}/aproba`);
            await fetchCereri();
        } catch (e) { console.error('Eroare la aprobare:', e); }
        setShowDetailModal(null);
    };

    const handleReject = async (id) => {
        try {
            await apiPut(`/api/discount/${id}/respinge`);
            await fetchCereri();
        } catch (e) { console.error('Eroare la respingere:', e); }
        setShowDetailModal(null);
    };

    const pendingCount = cereri.filter(c => c.status === 'Processing').length;

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă cererile de discount...</div></div>;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    Cereri Discount
                    {pendingCount > 0 && (
                        <span className="bg-amber-500/20 text-amber-400 text-sm font-bold px-2.5 py-0.5 rounded-full">
                            {pendingCount} pending
                        </span>
                    )}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Vizualizează și gestionează cererile de reducere de preț</p>
            </div>

            {/* Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Cereri', value: cereri.length, icon: 'sell', color: 'text-primary' },
                    { label: 'Pending', value: cereri.filter(c => c.status === 'Processing').length, icon: 'schedule', color: 'text-amber-400' },
                    { label: 'Aprobate', value: cereri.filter(c => c.status === 'Approved').length, icon: 'check_circle', color: 'text-emerald-400' },
                    { label: 'Respinse', value: cereri.filter(c => c.status === 'Rejected').length, icon: 'cancel', color: 'text-rose-400' },
                ].map((s, i) => (
                    <div key={i} className="glass-panel rounded-xl p-4 flex items-center gap-3">
                        <div className={`size-10 rounded-lg bg-white/5 flex items-center justify-center ${s.color}`}>
                            <span className="material-symbols-outlined">{s.icon}</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{s.value}</p>
                            <p className="text-xs text-slate-400">{s.label}</p>
                        </div>
                    </div>
                ))}
            </section>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {['Toate', 'Processing', 'Approved', 'Rejected'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {s === 'Toate' ? 'Toate' : statusLabels[s]}
                    </button>
                ))}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCereri.map(c => {
                    const pretRedus = c.pretOriginal * (1 - c.discountProcent / 100);
                    const economie = c.pretOriginal - pretRedus;

                    return (
                        <div key={c.idTranzactie} className="glass-panel rounded-xl p-5 flex flex-col gap-4 border border-transparent hover:border-primary/20 transition-colors">
                            {/* Top: Status + ID */}
                            <div className="flex justify-between items-start">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[c.status]}`}>
                                    <span className="material-symbols-outlined text-xs">{statusIcons[c.status]}</span>
                                    {statusLabels[c.status]}
                                </span>
                                <span className="text-slate-500 text-xs font-mono">#{c.idTranzactie}</span>
                            </div>

                            {/* Client */}
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-gradient-to-br from-primary/30 to-purple-900/30 flex items-center justify-center text-white font-bold text-sm">
                                    {c.client.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{c.client}</p>
                                    <p className="text-slate-500 text-xs">{c.email}</p>
                                </div>
                            </div>

                            {/* Masina + Pret */}
                            <div className="bg-white/5 rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-lg">directions_car</span>
                                    <span className="text-white font-medium text-sm">{c.masina}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-slate-500 line-through text-xs">€{c.pretOriginal.toLocaleString()}</span>
                                        <span className="text-emerald-400 font-bold ml-2">€{pretRedus.toLocaleString()}</span>
                                    </div>
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-xs font-bold">
                                        -{c.discountProcent}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">Economie: €{economie.toLocaleString()}</p>
                            </div>

                            {/* Motiv */}
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Motiv:</p>
                                <p className="text-sm text-slate-300 italic line-clamp-2">„{c.motivDiscount}"</p>
                            </div>

                            {/* Data */}
                            <p className="text-xs text-slate-500">{new Date(c.dataTranzactie).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

                            {/* Actions */}
                            {c.status === 'Processing' && (
                                <div className="flex gap-2 mt-auto">
                                    <button onClick={() => handleApprove(c.idTranzactie)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">check</span>
                                        Aprobă
                                    </button>
                                    <button onClick={() => handleReject(c.idTranzactie)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                        Respinge
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredCereri.length === 0 && (
                    <div className="col-span-full glass-panel rounded-xl p-12 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-600 mb-2 block">inbox</span>
                        <p className="text-slate-500">Nicio cerere de discount</p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default CereriDiscount;
