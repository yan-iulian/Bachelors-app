import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../config/apiHelper';

const statusMap = { 0: 'Solicitare', 1: 'Aprobat', 2: 'Respins', 3: 'Efectuat' };
const statusColors = {
    0: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    1: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    2: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    3: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};
const statusIcons = { 0: 'schedule', 1: 'check_circle', 2: 'cancel', 3: 'done_all' };

function CereriTestDrive() {
    const [cereri, setCereri] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('Toate');
    const [showApproveModal, setShowApproveModal] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [dataProgramata, setDataProgramata] = useState('');
    const [motivRespingere, setMotivRespingere] = useState('');

    const fetchCereri = async () => {
        try {
            const data = await apiGet('/api/testdrive');
            setCereri(data.map(td => ({
                id: td.id,
                client: td.client ? `${td.client.nume} ${td.client.prenume}` : '—',
                email: td.client?.email || '',
                telefon: td.client?.telefon || '',
                masina: td.Masina ? `${td.Masina.marca} ${td.Masina.model}` : '—',
                idMasina: td.idMasina,
                dataSolicitare: td.dataSolicitare,
                dataProgramata: td.dataProgramata,
                status: td.status,
                motivRespingere: td.motivRespingere,
            })));
        } catch (e) { console.error('Eroare la încărcarea cererilor:', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCereri(); }, []);
    const filteredCereri = cereri.filter(c => {
        if (filterStatus === 'Toate') return true;
        return statusMap[c.status] === filterStatus;
    });

    const handleApprove = async (id) => {
        try {
            await apiPut(`/api/testdrive/${id}/aproba`, { dataProgramata });
            await fetchCereri();
        } catch (e) { console.error('Eroare la aprobare:', e); }
        setShowApproveModal(null);
        setDataProgramata('');
    };

    const handleReject = async (id) => {
        try {
            await apiPut(`/api/testdrive/${id}/respinge`, { motivRespingere });
            await fetchCereri();
        } catch (e) { console.error('Eroare la respingere:', e); }
        setShowRejectModal(null);
        setMotivRespingere('');
    };

    const handleEfectuat = async (id) => {
        try {
            await apiPut(`/api/testdrive/${id}/efectuat`);
            await fetchCereri();
        } catch (e) { console.error('Eroare la marcarea ca efectuat:', e); }
    };

    const pendingCount = cereri.filter(c => c.status === 0).length;

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă cererile...</div></div>;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        Cereri Test Drive
                        {pendingCount > 0 && (
                            <span className="bg-amber-500/20 text-amber-400 text-sm font-bold px-2.5 py-0.5 rounded-full">
                                {pendingCount} pending
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Gestionează cererile de test drive de la clienți</p>
                </div>
            </div>

            {/* Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Cereri', value: cereri.length, icon: 'speed', color: 'text-primary' },
                    { label: 'Pending', value: cereri.filter(c => c.status === 0).length, icon: 'schedule', color: 'text-amber-400' },
                    { label: 'Aprobate', value: cereri.filter(c => c.status === 1).length, icon: 'check_circle', color: 'text-emerald-400' },
                    { label: 'Respinse', value: cereri.filter(c => c.status === 2).length, icon: 'cancel', color: 'text-rose-400' },
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
                {['Toate', 'Solicitare', 'Aprobat', 'Respins', 'Efectuat'].map(s => (
                    <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Tabel */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-4 font-medium">ID</th>
                                <th className="py-4 px-4 font-medium">Client</th>
                                <th className="py-4 px-4 font-medium">Mașină</th>
                                <th className="py-4 px-4 font-medium">Data Solicitare</th>
                                <th className="py-4 px-4 font-medium">Data Programată</th>
                                <th className="py-4 px-4 font-medium">Status</th>
                                <th className="py-4 px-4 font-medium text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredCereri.map((c) => (
                                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">#{c.id}</td>
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="text-white font-semibold">{c.client}</p>
                                            <p className="text-slate-500 text-xs">{c.email}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="size-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-sm">directions_car</span>
                                            </div>
                                            <span className="text-white">{c.masina}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-300">{new Date(c.dataSolicitare).toLocaleDateString('ro-RO')}</td>
                                    <td className="py-3 px-4 text-slate-300">
                                        {c.dataProgramata ? new Date(c.dataProgramata).toLocaleDateString('ro-RO') : <span className="text-slate-600">—</span>}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[c.status]}`}>
                                            <span className="material-symbols-outlined text-xs">{statusIcons[c.status]}</span>
                                            {statusMap[c.status]}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-1">
                                            {c.status === 0 && (
                                                <>
                                                    <button onClick={() => { setShowApproveModal(c.id); setDataProgramata(''); }}
                                                        className="p-2 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors" title="Aprobă">
                                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                    </button>
                                                    <button onClick={() => { setShowRejectModal(c.id); setMotivRespingere(''); }}
                                                        className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors" title="Respinge">
                                                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                    </button>
                                                </>
                                            )}
                                            {c.status === 1 && (
                                                <button onClick={() => handleEfectuat(c.id)}
                                                    className="p-2 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition-colors" title="Marchează Efectuat">
                                                    <span className="material-symbols-outlined text-[18px]">done_all</span>
                                                </button>
                                            )}
                                            {c.status === 2 && c.motivRespingere && (
                                                <span className="text-xs text-slate-500 italic max-w-[200px] truncate" title={c.motivRespingere}>
                                                    {c.motivRespingere}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCereri.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-slate-500">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                                        Nicio cerere de test drive
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
                            <h3 className="text-lg font-bold text-white">Aprobă Test Drive</h3>
                            <p className="text-slate-400 text-sm mt-2">
                                Selectează data programată pentru test drive-ul solicitat de <span className="text-white font-medium">{cereri.find(c => c.id === showApproveModal)?.client}</span>.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Data Programată</label>
                            <input type="date" value={dataProgramata} onChange={e => setDataProgramata(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowApproveModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
                                Anulează
                            </button>
                            <button onClick={() => handleApprove(showApproveModal)} disabled={!dataProgramata}
                                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Aprobă
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Respingere */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectModal(null)} />
                    <div className="relative glass-panel rounded-2xl w-full max-w-md p-6 space-y-5 border border-white/10">
                        <div className="flex flex-col items-center text-center">
                            <div className="size-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-rose-400 text-3xl">cancel</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Respinge Test Drive</h3>
                            <p className="text-slate-400 text-sm mt-2">
                                Introdu motivul respingerii cererii de la <span className="text-white font-medium">{cereri.find(c => c.id === showRejectModal)?.client}</span>.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Motiv Respingere</label>
                            <textarea rows={3} value={motivRespingere} onChange={e => setMotivRespingere(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                placeholder="ex: Mașina nu este disponibilă..." />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRejectModal(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
                                Anulează
                            </button>
                            <button onClick={() => handleReject(showRejectModal)} disabled={!motivRespingere.trim()}
                                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Respinge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default CereriTestDrive;
