import { useState, useEffect } from 'react';
import { apiGet } from '../../config/apiHelper';

const actiuneColors = {
    'Aprobare': 'text-emerald-400 bg-emerald-500/10',
    'Respingere': 'text-rose-400 bg-rose-500/10',
    'Adăugare': 'text-primary bg-primary/10',
    'Editare': 'text-blue-400 bg-blue-500/10',
    'Ștergere': 'text-rose-400 bg-rose-500/10',
    'Login': 'text-slate-400 bg-slate-500/10',
    'Solicitare': 'text-amber-400 bg-amber-500/10',
    'Finalizare': 'text-teal-400 bg-teal-500/10',
    'Înregistrare': 'text-blue-400 bg-blue-500/10',
};
const actiuneIcons = {
    'Aprobare': 'check_circle',
    'Respingere': 'cancel',
    'Adăugare': 'add_circle',
    'Editare': 'edit',
    'Ștergere': 'delete',
    'Login': 'login',
    'Solicitare': 'send',
    'Finalizare': 'task_alt',
    'Înregistrare': 'note_add',
};
const rolColors = {
    'Director': 'text-primary',
    'Client': 'text-teal-400',
    'Mecanic': 'text-amber-400',
};

function getActiuneKey(actiune) {
    return Object.keys(actiuneColors).find(k => actiune.startsWith(k)) || 'Login';
}

function AuditLog() {
    const [loguri, setLoguri] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRol, setFilterRol] = useState('Toate');

    useEffect(() => {
        const fetchLoguri = async () => {
            try {
                const data = await apiGet('/api/audit-log');
                setLoguri(data.map(l => ({
                    idLog: l.idLog,
                    actiune: l.actiune,
                    detalii: l.detalii,
                    dataOra: l.dataOra || l.createdAt,
                    ip: l.ip || '—',
                    utilizator: l.utilizator ? `${l.utilizator.nume} ${l.utilizator.prenume}` : '—',
                    rol: l.utilizator?.rol || '—',
                })));
            } catch (e) { console.error('Eroare la încărcarea logurilor:', e); }
            finally { setLoading(false); }
        };
        fetchLoguri();
    }, []);

    const filteredLoguri = loguri.filter(l => {
        const matchSearch = `${l.actiune} ${l.detalii} ${l.utilizator}`.toLowerCase().includes(search.toLowerCase());
        const matchRol = filterRol === 'Toate' || l.rol === filterRol;
        return matchSearch && matchRol;
    });

    const formatDateTime = (iso) => {
        const d = new Date(iso);
        return {
            date: d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă logurile...</div></div>;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Audit Log</h1>
                <p className="text-slate-400 text-sm mt-1">Istoricul tuturor acțiunilor din aplicație — cine, ce, când</p>
            </div>

            {/* Filters */}
            <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Caută în loguri..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['Toate', 'Director', 'Client', 'Mecanic'].map(r => (
                        <button
                            key={r}
                            onClick={() => setFilterRol(r)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterRol === r
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline / Tabel */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-4 font-medium w-12">#</th>
                                <th className="py-4 px-4 font-medium">Acțiune</th>
                                <th className="py-4 px-4 font-medium">Detalii</th>
                                <th className="py-4 px-4 font-medium">Utilizator</th>
                                <th className="py-4 px-4 font-medium">Data & Ora</th>
                                <th className="py-4 px-4 font-medium">IP</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredLoguri.map((l) => {
                                const key = getActiuneKey(l.actiune);
                                const { date, time } = formatDateTime(l.dataOra);
                                return (
                                    <tr key={l.idLog} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{l.idLog}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`size-8 rounded-lg flex items-center justify-center ${actiuneColors[key]}`}>
                                                    <span className="material-symbols-outlined text-[16px]">{actiuneIcons[key]}</span>
                                                </div>
                                                <span className="text-white font-medium">{l.actiune}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 max-w-xs">
                                            <p className="truncate" title={l.detalii}>{l.detalii}</p>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="size-7 rounded-full bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center text-white text-xs font-bold">
                                                    {l.utilizator.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <p className="text-white text-sm">{l.utilizator}</p>
                                                    <p className={`text-xs font-medium ${rolColors[l.rol]}`}>{l.rol}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="text-slate-300 text-sm">{date}</p>
                                                <p className="text-slate-500 text-xs">{time}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 font-mono text-xs">{l.ip}</td>
                                    </tr>
                                );
                            })}
                            {filteredLoguri.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-slate-500">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">manage_search</span>
                                        Niciun log găsit
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-white/5 px-4 py-3 flex justify-between items-center text-sm text-slate-400">
                    <span>{filteredLoguri.length} intrări afișate</span>
                    <span className="text-xs">Ultimele 100 de acțiuni</span>
                </div>
            </div>
        </main>
    );
}

export default AuditLog;
