import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../../config/apiHelper';

function DirectorDashboard() {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [tranzactiiRecente, setTranzactiiRecente] = useState([]);
    const [cereriPendingList, setCereriPendingList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [statsData, tranzactiiData, testDriveData, discountData] = await Promise.all([
                    apiGet('/api/dashboard/stats'),
                    apiGet('/api/tranzactii'),
                    apiGet('/api/testdrive'),
                    apiGet('/api/discount'),
                ]);
                setStats(statsData);
                setTranzactiiRecente(tranzactiiData.slice(0, 3).map(t => ({
                    vehicle: t.Masina ? `${t.Masina.marca} ${t.Masina.model}` : '—',
                    client: t.clientTranzactie ? `${t.clientTranzactie.nume} ${t.clientTranzactie.prenume}` : '—',
                    date: new Date(t.dataTranzactie).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    amount: `€${(t.suma || 0).toLocaleString()}`,
                    status: t.status,
                    statusColor: t.status === 'Sold' ? 'emerald' : t.status === 'Cancelled' ? 'rose' : 'amber',
                })));
                // Build real pending items for approval panel
                const pending = [];
                testDriveData.filter(td => td.status === 0).forEach(td => {
                    const client = td.client ? `${td.client.nume} ${td.client.prenume}` : '—';
                    const masina = td.Masina ? `${td.Masina.marca} ${td.Masina.model}` : '—';
                    pending.push({ title: `Test Drive — ${masina}`, detail: `${client} • ${new Date(td.dataSolicitare).toLocaleDateString('ro-RO')}`, icon: 'speed', type: 'test-drive', link: '/director/test-drive' });
                });
                discountData.filter(d => d.status === 'Processing').forEach(d => {
                    const client = d.clientTranzactie ? `${d.clientTranzactie.nume} ${d.clientTranzactie.prenume}` : '—';
                    const masina = d.Masina ? `${d.Masina.marca} ${d.Masina.model}` : '—';
                    pending.push({ title: `Discount — ${masina}`, detail: `${client} • ${d.discountProcent || 0}%`, icon: 'sell', type: 'discount', link: '/director/discount' });
                });
                tranzactiiData.filter(t => t.status === 'Processing').forEach(t => {
                    const client = t.clientTranzactie ? `${t.clientTranzactie.nume} ${t.clientTranzactie.prenume}` : '—';
                    const masina = t.Masina ? `${t.Masina.marca} ${t.Masina.model}` : '—';
                    pending.push({ title: `Tranzacție — ${masina}`, detail: `${client} • €${(t.suma || 0).toLocaleString()}`, icon: 'payments', type: 'tranzactie', link: '/director/tranzactii' });
                });
                setCereriPendingList(pending);
            } catch (e) { console.error('Eroare la încărcarea dashboard:', e); }
            finally { setLoading(false); }
        };
        fetchDashboard();
    }, []);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă dashboard-ul...</div></div>;

    const totalVanzari = stats?.totalVanzari || 0;
    const masiniStoc = stats?.masiniStoc || 0;
    const cereriPending = stats?.cereriPending || 0;
    const clientiActivi = stats?.clientiActivi || 0;
    const vanzariFormatted = totalVanzari >= 1000000 ? `€${(totalVanzari / 1000000).toFixed(1)}M` : totalVanzari >= 1000 ? `€${(totalVanzari / 1000).toFixed(0)}K` : `€${totalVanzari}`;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
            {/* KPI Row */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metric 1: Vânzări Luna */}
                <div className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-yellow-500">payments</span>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Vânzări Luna</p>
                            <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">{vanzariFormatted}</h3>
                        </div>
                        <div className="flex items-center text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold">
                            <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
                            {stats?.totalVanzari > 0 ? 'Activ' : '—'}
                        </div>
                    </div>
                    <div className="w-full h-10 mt-auto flex items-end gap-1">
                        <div className="w-1/6 bg-yellow-500/20 h-2 rounded-t"></div>
                        <div className="w-1/6 bg-yellow-500/30 h-4 rounded-t"></div>
                        <div className="w-1/6 bg-yellow-500/40 h-3 rounded-t"></div>
                        <div className="w-1/6 bg-yellow-500/60 h-6 rounded-t"></div>
                        <div className="w-1/6 bg-yellow-500/80 h-5 rounded-t"></div>
                        <div className="w-1/6 bg-yellow-500 h-8 rounded-t animate-pulse"></div>
                    </div>
                </div>

                {/* Metric 2: Mașini în Stoc */}
                <div className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-primary">directions_car</span>
                    </div>
                    <div className="flex justify-between items-start z-10">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Mașini în Stoc</p>
                            <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">{masiniStoc}</h3>
                        </div>
                        <div className="relative size-12 rounded-full border-4 border-slate-700 border-t-primary border-r-primary rotate-45"></div>
                    </div>
                    <div className="mt-auto">
                        <p className="text-xs text-slate-400"><span className="text-primary font-bold">{masiniStoc}</span> mașini disponibile</p>
                    </div>
                </div>

                {/* Metric 3: Cereri Pending */}
                <div className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 border-l-4 border-l-amber-500 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-amber-500">pending_actions</span>
                    </div>
                    <div>
                        <p className="text-amber-200 text-sm font-medium flex items-center gap-2">
                            <span className="size-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Cereri Pending
                        </p>
                        <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">{cereriPending}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-auto">
                        <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">{stats?.testDrivePending || 0} Test Drives</span>
                        <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">{stats?.discountPending || 0} Discounturi</span>
                        <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{stats?.tranzactiiPending || 0} Tranzacții</span>
                    </div>
                </div>

                {/* Metric 4: Clienți Activi */}
                <div className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-teal-400">group</span>
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm font-medium">Clienți Activi</p>
                        <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">{clientiActivi}</h3>
                    </div>
                    <div className="flex -space-x-2 overflow-hidden mt-auto pl-1">
                        {['bg-purple-600', 'bg-blue-600', 'bg-teal-600', 'bg-emerald-600'].map((color, i) => (
                            <div key={i} className={`inline-flex items-center justify-center size-8 rounded-full ring-2 ring-bg-dark ${color} text-xs font-medium text-white`}>
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                        <div className="flex items-center justify-center size-8 rounded-full ring-2 ring-bg-dark bg-teal-900 text-xs font-medium text-teal-200">+12</div>
                    </div>
                </div>
            </section>

            {/* Charts & Lists Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Chart Area (8 cols) */}
                <div className="lg:col-span-8 glass-panel rounded-xl p-6 flex flex-col min-h-[420px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-white text-lg font-bold">Vânzări 2024</h2>
                        <select className="bg-secondary/50 border-none text-white text-sm rounded-lg focus:ring-1 focus:ring-primary py-1 px-3">
                            <option>Yearly</option>
                            <option>Quarterly</option>
                            <option>Monthly</option>
                        </select>
                    </div>
                    <div className="flex-1 w-full relative">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#895af6" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#895af6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {/* Grid Lines */}
                            <line stroke="#2e3245" strokeWidth="1" x1="0" x2="800" y1="250" y2="250" />
                            <line stroke="#2e3245" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="175" y2="175" />
                            <line stroke="#2e3245" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="100" y2="100" />
                            <line stroke="#2e3245" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="25" y2="25" />
                            {/* Chart Fill */}
                            <path d="M0 250 C 100 250, 100 150, 200 180 C 300 210, 300 100, 400 80 C 500 60, 500 150, 600 120 C 700 90, 700 30, 800 50 L 800 300 L 0 300 Z" fill="url(#chartGradient)" />
                            {/* Chart Line */}
                            <path d="M0 250 C 100 250, 100 150, 200 180 C 300 210, 300 100, 400 80 C 500 60, 500 150, 600 120 C 700 90, 700 30, 800 50" fill="none" stroke="#895af6" strokeLinecap="round" strokeWidth="3" />
                        </svg>
                        <div className="flex justify-between text-xs text-slate-500 mt-2 px-2">
                            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span><span>Dec</span>
                        </div>
                    </div>
                </div>

                {/* Approvals List (4 cols) */}
                <div className="lg:col-span-4 glass-panel rounded-xl flex flex-col overflow-hidden">
                    <div className="p-6 pb-2 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-white text-lg font-bold">Cereri de Aprobare</h3>
                        <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{cereriPendingList.length} Noi</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cereriPendingList.length === 0 && (
                            <p className="text-slate-500 text-sm text-center py-8">Nu există cereri în așteptare.</p>
                        )}
                        {cereriPendingList.map((item, i) => (
                            <div key={i} className="bg-secondary/30 hover:bg-secondary/60 transition-colors p-3 rounded-lg flex items-center gap-3 border border-transparent hover:border-primary/30">
                                <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'discount' ? 'bg-gradient-to-br from-amber-500/20 to-amber-900/20' :
                                        item.type === 'tranzactie' ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-900/20' :
                                            'bg-gradient-to-br from-primary/30 to-purple-900/30'
                                    }`}>
                                    <span className={`material-symbols-outlined text-xl ${item.type === 'discount' ? 'text-amber-400' :
                                            item.type === 'tranzactie' ? 'text-emerald-400' :
                                                'text-primary'
                                        }`}>{item.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white text-sm font-semibold truncate">{item.title}</h4>
                                    <p className="text-slate-400 text-xs truncate">{item.detail}</p>
                                </div>
                                <button onClick={() => navigate(item.link)} className="bg-primary text-white p-2 rounded-lg hover:bg-primary/80 transition shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined text-[20px] block">arrow_forward</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bottom Section: Transactions & Quick Actions */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Transactions Table */}
                <div className="lg:col-span-2 glass-panel rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white text-lg font-bold">Tranzacții Recente</h3>
                        <Link to="/director/tranzactii" className="text-primary text-sm font-medium hover:text-primary/80">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
                                    <th className="pb-3 pl-2 font-medium">Vehicle</th>
                                    <th className="pb-3 font-medium">Client</th>
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Amount</th>
                                    <th className="pb-3 font-medium text-right pr-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {tranzactiiRecente.map((tx, i) => (
                                    <tr key={i} className={`${i < 2 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                                        <td className="py-3 pl-2 flex items-center gap-3">
                                            <div className="size-8 rounded bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-sm">directions_car</span>
                                            </div>
                                            <span className="text-white font-medium">{tx.vehicle}</span>
                                        </td>
                                        <td className="py-3 text-slate-300">{tx.client}</td>
                                        <td className="py-3 text-slate-400">{tx.date}</td>
                                        <td className={`py-3 font-medium ${tx.statusColor === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>{tx.amount}</td>
                                        <td className="py-3 text-right pr-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${tx.statusColor}-500/10 text-${tx.statusColor}-400 border border-${tx.statusColor}-500/20`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="glass-panel rounded-xl p-6 flex flex-col">
                    <h3 className="text-white text-lg font-bold mb-4">Acțiuni Rapide</h3>
                    <div className="grid grid-cols-2 gap-4 h-full">
                        {[
                            { icon: 'add_circle', label: 'Adaugă Mașină', color: 'text-primary', to: '/director/masini' },
                            { icon: 'assessment', label: 'Rapoarte PDF', color: 'text-teal-400', to: '/director/rapoarte' },
                            { icon: 'build', label: 'Reparații', color: 'text-amber-400', to: '/director/estimari' },
                            { icon: 'history', label: 'Audit Log', color: 'text-slate-400', to: '/director/audit-log' },
                        ].map((action, i) => (
                            <button key={i} onClick={() => navigate(action.to)} className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-transparent transition-all rounded-xl p-4 flex flex-col items-center justify-center gap-2 group">
                                <span className={`material-symbols-outlined text-3xl ${action.color} group-hover:scale-110 transition-transform`}>{action.icon}</span>
                                <span className="text-white text-sm font-medium">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>


        </main>
    );
}

export default DirectorDashboard;
