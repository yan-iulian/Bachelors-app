import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../config/apiHelper';

function ClientHome() {
    const navigate = useNavigate();
    const user = useSelector(state => state.auth.user);
    const prenume = user?.prenume || 'Client';

    const [masiniCount, setMasiniCount] = useState(0);
    const [testDriveCount, setTestDriveCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const wishlistIds = (() => { try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; } })();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [masini, testDrives] = await Promise.all([
                    apiGet('/api/masini'),
                    apiGet('/api/testdrive').catch(() => []),
                ]);
                setMasiniCount(masini.length);
                setTestDriveCount(Array.isArray(testDrives) ? testDrives.length : 0);
            } catch (err) {
                console.error('Eroare la încărcarea datelor:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const kpis = [
        { label: 'Mașini Disponibile', value: masiniCount, icon: 'directions_car', color: 'text-[#895af6]', bgGlow: 'from-[#895af6]/20 to-purple-900/20' },
        { label: 'Wishlist', value: wishlistIds.length, icon: 'favorite', color: 'text-[#fb7185]', bgGlow: 'from-[#fb7185]/20 to-rose-900/20' },
        { label: 'Test Drives Programate', value: testDriveCount, icon: 'speed', color: 'text-[#2DD4BF]', bgGlow: 'from-[#2DD4BF]/20 to-teal-900/20' },
    ];

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">
                        Bun venit, <span className="text-[#895af6]">{prenume}</span>! 👋
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Descoperă mașina perfectă cu ajutorul AI-ului nostru inteligent</p>
                </div>
                <button
                    onClick={() => navigate('/client/catalog')}
                    className="flex items-center gap-2 bg-[#895af6] hover:bg-[#7040d6] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-[#895af6]/20"
                >
                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                    Explorează Catalogul
                </button>
            </div>

            {/* KPI Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {kpis.map((kpi, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-6 flex items-center gap-5 hover:border-white/10 transition-all group">
                        <div className={`size-14 rounded-xl bg-gradient-to-br ${kpi.bgGlow} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <span className={`material-symbols-outlined text-2xl ${kpi.color}`}>{kpi.icon}</span>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-white">{kpi.value}</p>
                            <p className="text-sm text-slate-400">{kpi.label}</p>
                        </div>
                    </div>
                ))}
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Catalog', icon: 'inventory_2', route: '/client/catalog', color: 'text-[#895af6]' },
                    { label: 'Wishlist', icon: 'favorite', route: '/client/wishlist', color: 'text-[#fb7185]' },
                    { label: 'Simulare Credit', icon: 'calculate', route: '/client/simulare-credit', color: 'text-[#2DD4BF]' },
                    { label: 'AI Match', icon: 'auto_awesome', route: '/client/recomandare-ai', color: 'text-[#D4AF37]' },
                ].map((action, i) => (
                    <button
                        key={i}
                        onClick={() => navigate(action.route)}
                        className="glass-card rounded-xl p-4 flex flex-col items-center gap-3 hover:bg-white/5 transition-all group cursor-pointer"
                    >
                        <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className={`material-symbols-outlined text-2xl ${action.color}`}>{action.icon}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
                    </button>
                ))}
            </section>

            {/* Două acțiuni principale */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Catalog CTA */}
                <div
                    onClick={() => navigate('/client/catalog')}
                    className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center gap-5 cursor-pointer group hover:border-[#895af6]/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(137,90,246,0.1)]"
                >
                    <div className="size-20 rounded-2xl bg-gradient-to-br from-[#895af6]/20 to-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-4xl text-[#895af6]">inventory_2</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Explorează Catalogul</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Descoperă toate mașinile disponibile, filtrează după marcă, preț, combustibil și multe altele.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-[#895af6] font-semibold text-sm group-hover:gap-3 transition-all">
                        <span>Vezi Catalogul</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </div>
                </div>

                {/* AI Test CTA */}
                <div
                    onClick={() => navigate('/client/recomandare-ai')}
                    className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center gap-5 cursor-pointer group hover:border-[#2DD4BF]/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(45,212,191,0.1)]"
                >
                    <div className="size-20 rounded-2xl bg-gradient-to-br from-[#2DD4BF]/20 to-teal-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="material-symbols-outlined text-4xl text-[#2DD4BF]">auto_awesome</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Test Recomandare AI</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Completează un scurt chestionar și AI-ul nostru îți va recomanda mașinile perfecte pentru tine.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-[#2DD4BF] font-semibold text-sm group-hover:gap-3 transition-all">
                        <span>Începe Testul</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default ClientHome;
