import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../config/apiHelper';

const statusColors = {
    'Processing': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Sold': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Cancelled': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};
const statusLabels = {
    'Processing': 'Processing',
    'Sold': 'Sold',
    'Cancelled': 'Cancelled',
};
const tipPlataIcons = {
    'Cash': 'payments',
    'Card': 'credit_card',
    'Rate': 'account_balance',
};

function Tranzactii() {
    const [tranzactii, setTranzactii] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Toate');
    const [search, setSearch] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(null);

    const fetchTranzactii = async () => {
        try {
            const data = await apiGet('/api/tranzactii');
            setTranzactii(data.map(t => ({
                idTranzactie: t.idTranzactie,
                client: t.clientTranzactie ? `${t.clientTranzactie.nume} ${t.clientTranzactie.prenume}` : '—',
                email: t.clientTranzactie?.email || '',
                masina: t.Masina ? `${t.Masina.marca} ${t.Masina.model}` : '—',
                suma: t.suma || 0,
                tipPlata: t.tipPlata,
                dataTranzactie: t.dataTranzactie,
                status: t.status,
                tip: 'Vanzare',
            })));
        } catch (e) { console.error('Eroare la încărcarea tranzacțiilor:', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTranzactii(); }, []);

    const filteredTranzactii = tranzactii.filter(t => {
        const matchSearch = `${t.client} ${t.masina}`.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'Toate' || t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const handleApprove = async (id) => {
        try {
            await apiPut(`/api/tranzactii/${id}/aproba`);
            await fetchTranzactii();
        } catch (e) { console.error('Eroare la aprobare:', e); }
        setShowApproveModal(null);
    };

    const handleCancel = async (id) => {
        try {
            await apiPut(`/api/tranzactii/${id}/anuleaza`);
            await fetchTranzactii();
        } catch (e) { console.error('Eroare la anulare:', e); }
        setShowCancelModal(null);
    };

    const totalVanzari = tranzactii.filter(t => t.status === 'Sold').reduce((acc, t) => acc + t.suma, 0);
    const processingCount = tranzactii.filter(t => t.status === 'Processing').length;

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă tranzacțiile...</div></div>;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    Tranzacții
                    {processingCount > 0 && (
                        <span className="bg-amber-500/20 text-amber-400 text-sm font-bold px-2.5 py-0.5 rounded-full">
                            {processingCount} de aprobat
                        </span>
                    )}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Istoricul complet al vânzărilor și tranzacțiilor</p>
            </div>

            {/* Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tranzacții', value: tranzactii.length, icon: 'receipt_long', color: 'text-primary' },
                    { label: 'Processing', value: processingCount, icon: 'schedule', color: 'text-amber-400' },
                    { label: 'Finalizate', value: tranzactii.filter(t => t.status === 'Sold').length, icon: 'check_circle', color: 'text-emerald-400' },
                    { label: 'Total Vânzări', value: `€${(totalVanzari / 1000).toFixed(0)}K`, icon: 'payments', color: 'text-yellow-400' },
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
            <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Caută după client sau mașină..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['Toate', 'Processing', 'Sold', 'Cancelled'].map(s => (
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
            </div>

            {/* Tabel */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-4 font-medium">ID</th>
                                <th className="py-4 px-4 font-medium">Vehicul</th>
                                <th className="py-4 px-4 font-medium">Client</th>
                                <th className="py-4 px-4 font-medium">Data</th>
                                <th className="py-4 px-4 font-medium">Tip Plată</th>
                                <th className="py-4 px-4 font-medium">Sumă</th>
                                <th className="py-4 px-4 font-medium">Status</th>
                                <th className="py-4 px-4 font-medium text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredTranzactii.map((t) => (
                                <tr key={t.idTranzactie} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">#{t.idTranzactie}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-lg bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-lg">directions_car</span>
                                            </div>
                                            <span className="text-white font-medium">{t.masina}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="text-white font-medium">{t.client}</p>
                                            <p className="text-slate-500 text-xs">{t.email}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-300">{new Date(t.dataTranzactie).toLocaleDateString('ro-RO')}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-slate-400 text-[16px]">{tipPlataIcons[t.tipPlata] || 'payment'}</span>
                                            <span className="text-slate-300">{t.tipPlata}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`font-semibold ${t.status === 'Sold' ? 'text-emerald-400' : 'text-white'}`}>
                                            €{t.suma.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[t.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                            {statusLabels[t.status]}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {t.status === 'Processing' && (
                                                <>
                                                    <button onClick={() => setShowApproveModal(t.idTranzactie)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors">
                                                        <span className="material-symbols-outlined text-[16px]">check</span>
                                                        Aprobă
                                                    </button>
                                                    <button onClick={() => setShowCancelModal(t.idTranzactie)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors">
                                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                                        Anulează
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTranzactii.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-slate-500">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                                        Nicio tranzacție găsită
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-white/5 px-4 py-3 flex justify-between items-center text-sm text-slate-400">
                    <span>{filteredTranzactii.length} din {tranzactii.length} tranzacții</span>
                    <span className="text-emerald-400 font-medium">Total vânzări: €{totalVanzari.toLocaleString()}</span>
                </div>
            </div>

            {/* Modal Aprobare */}
            {showApproveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApproveModal(null)} />
                    <div className="relative glass-panel rounded-2xl w-full max-w-md p-6 space-y-5 border border-white/10">
                        <div className="flex flex-col items-center text-center">
                            <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Confirmare Aprobare</h3>
                            <p className="text-slate-400 text-sm mt-2">
                                Confirmi aprobarea tranzacției pentru <span className="text-white font-medium">
                                    {tranzactii.find(t => t.idTranzactie === showApproveModal)?.masina}
                                </span>?
                            </p>
                            <p className="text-emerald-400 font-bold text-lg mt-2">
                                €{tranzactii.find(t => t.idTranzactie === showApproveModal)?.suma.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowApproveModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
                                Anulează
                            </button>
                            <button onClick={() => handleApprove(showApproveModal)}
                                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
                                Aprobă Vânzarea
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Anulare */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelModal(null)} />
                    <div className="relative glass-panel rounded-2xl w-full max-w-md p-6 space-y-5 border border-white/10">
                        <div className="flex flex-col items-center text-center">
                            <div className="size-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-rose-400 text-3xl">cancel</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Confirmare Anulare</h3>
                            <p className="text-slate-400 text-sm mt-2">
                                Ești sigur că vrei să anulezi tranzacția pentru <span className="text-white font-medium">
                                    {tranzactii.find(t => t.idTranzactie === showCancelModal)?.masina}
                                </span>?
                            </p>
                            <p className="text-rose-400 font-bold text-lg mt-2">
                                €{tranzactii.find(t => t.idTranzactie === showCancelModal)?.suma.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowCancelModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
                                Înapoi
                            </button>
                            <button onClick={() => handleCancel(showCancelModal)}
                                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors">
                                Anulează Tranzacția
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Tranzactii;
