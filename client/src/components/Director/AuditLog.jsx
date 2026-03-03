import { useState, useEffect } from 'react';
import { apiGet } from '../../config/apiHelper';

const actiuneColors = {
    'LOGIN': 'text-slate-300 bg-slate-500/10',
    'INREGISTRARE_CONT': 'text-indigo-400 bg-indigo-500/10',
    'ADAUGARE_MASINA': 'text-[#895af6] bg-[#895af6]/10',
    'EDITARE_MASINA': 'text-blue-400 bg-blue-500/10',
    'PROMOTIE_MASINA': 'text-green-400 bg-green-500/10',
    'STERGERE_MASINA': 'text-red-400 bg-red-500/10',
    'SOLICITARE_TEST_DRIVE': 'text-amber-400 bg-amber-500/10',
    'APROBARE_TEST_DRIVE': 'text-emerald-400 bg-emerald-500/10',
    'RESPINGERE_TEST_DRIVE': 'text-rose-400 bg-rose-500/10',
    'EFECTUARE_TEST_DRIVE': 'text-teal-400 bg-teal-500/10',
    'INITIERE_TRANZACTIE': 'text-cyan-400 bg-cyan-500/10',
    'APROBARE_TRANZACTIE': 'text-emerald-400 bg-emerald-500/10',
    'ANULARE_TRANZACTIE': 'text-rose-400 bg-rose-500/10',
    'INREGISTRARE_REPARATIE': 'text-indigo-400 bg-indigo-500/10',
    'ACTUALIZARE_REPARATIE': 'text-blue-400 bg-blue-500/10',
    'ACTUALIZARE_PIESA': 'text-blue-400 bg-blue-500/10',
    'COMANDA_PIESE': 'text-amber-400 bg-amber-500/10',
    'CERERE_DISCOUNT': 'text-violet-400 bg-violet-500/10',
    'APROBARE_DISCOUNT': 'text-emerald-400 bg-emerald-500/10',
    'RESPINGERE_DISCOUNT': 'text-rose-400 bg-rose-500/10',
    'EXPORT_RAPORT': 'text-sky-400 bg-sky-500/10',
    'UPLOAD_IMAGINI': 'text-fuchsia-400 bg-fuchsia-500/10',
};
const actiuneIcons = {
    'LOGIN': 'login',
    'INREGISTRARE_CONT': 'person_add',
    'ADAUGARE_MASINA': 'add_circle',
    'EDITARE_MASINA': 'edit',
    'PROMOTIE_MASINA': 'local_offer',
    'STERGERE_MASINA': 'delete',
    'SOLICITARE_TEST_DRIVE': 'speed',
    'APROBARE_TEST_DRIVE': 'check_circle',
    'RESPINGERE_TEST_DRIVE': 'cancel',
    'EFECTUARE_TEST_DRIVE': 'task_alt',
    'INITIERE_TRANZACTIE': 'payments',
    'APROBARE_TRANZACTIE': 'check_circle',
    'ANULARE_TRANZACTIE': 'cancel',
    'INREGISTRARE_REPARATIE': 'build',
    'ACTUALIZARE_REPARATIE': 'engineering',
    'ACTUALIZARE_PIESA': 'settings',
    'COMANDA_PIESE': 'shopping_cart',
    'CERERE_DISCOUNT': 'sell',
    'APROBARE_DISCOUNT': 'thumb_up',
    'RESPINGERE_DISCOUNT': 'thumb_down',
    'EXPORT_RAPORT': 'download',
    'UPLOAD_IMAGINI': 'photo_camera',
};
const rolColors = {
    'Director': 'text-[#895af6]',
    'Client': 'text-teal-400',
    'Mecanic': 'text-amber-400',
};
const rolBgColors = {
    'Director': 'bg-[#895af6]/20 text-[#895af6] border-[#895af6]/30',
    'Client': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'Mecanic': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

function getActiuneStyle(actiune) {
    return actiuneColors[actiune] || 'text-slate-400 bg-slate-500/10';
}
function getActiuneIcon(actiune) {
    return actiuneIcons[actiune] || 'info';
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
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filterRol === r
                                ? (r === 'Toate' ? 'bg-white/15 text-white border-white/20'
                                    : rolBgColors[r] || 'bg-white/15 text-white border-white/20')
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
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
                                const style = getActiuneStyle(l.actiune);
                                const icon = getActiuneIcon(l.actiune);
                                const { date, time } = formatDateTime(l.dataOra);
                                return (
                                    <tr key={l.idLog} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{l.idLog}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`size-8 rounded-lg flex items-center justify-center ${style}`}>
                                                    <span className="material-symbols-outlined text-[16px]">{icon}</span>
                                                </div>
                                                <span className="text-white font-medium">{l.actiune.replace(/_/g, ' ')}</span>
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
