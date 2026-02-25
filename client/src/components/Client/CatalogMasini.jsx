import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../config/apiHelper';
import API_URL from '../../config/api';

const combustibilMap = { 0: 'Benzină', 1: 'Diesel', 2: 'Hibrid', 3: 'Electric' };
const categorieMap = { 0: 'Sedan', 1: 'SUV', 2: 'Coupe', 3: 'Hatchback', 4: 'Cabrio', 5: 'Break' };

// Read persisted AI match scores from the recommendation test (localStorage)
const getAiMatchScores = () => {
    try {
        const raw = localStorage.getItem('aiMatchScores');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
};

const matchColor = (pct) => {
    if (pct >= 75) return { text: 'text-emerald-400', hex: '#34d399', ring: 'ring-emerald-400/40' };
    if (pct >= 60) return { text: 'text-teal-400',    hex: '#2dd4bf', ring: 'ring-teal-400/40' };
    if (pct >= 45) return { text: 'text-violet-400',  hex: '#a78bfa', ring: 'ring-violet-400/40' };
    return { text: 'text-slate-400', hex: '#94a3b8', ring: 'ring-slate-400/40' };
};

const formatKm = (km) => km >= 1000 ? `${Math.round(km / 1000)}k km` : `${km} km`;
const getSpecs = (m) => `${combustibilMap[m.combustibil] || '—'} • ${m.anFabricatie} • ${formatKm(m.km)}`;
const getImagine = (m) => m.imaginePrincipala
    ? `${API_URL}${m.imaginePrincipala}`
    : `https://placehold.co/600x400/2e2249/895af6?text=${encodeURIComponent(m.marca + ' ' + m.model)}`;

const ITEMS_PER_PAGE = 12;

function CatalogMasini() {
    const navigate = useNavigate();
    const [masini, setMasini] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState(() => getAiMatchScores() ? 'ai' : 'newest');
    const [paginaCurenta, setPaginaCurenta] = useState(1);
    const [aiScores, setAiScores] = useState(() => getAiMatchScores());
    const hasAiTest = aiScores !== null;
    const [wishlist, setWishlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; }
    });

    // Filtre state
    const [aiMinScore, setAiMinScore] = useState(0);
    const [selectedBrands, setSelectedBrands] = useState([]);
    const [fuelFilter, setFuelFilter] = useState(null);
    const [selectedCaroserii, setSelectedCaroserii] = useState([]);
    const [yearMin, setYearMin] = useState(2000);
    const [yearMax, setYearMax] = useState(2025);
    const [priceMin, setPriceMin] = useState(0);
    const [priceMax, setPriceMax] = useState(200000);

    // Fetch masini from API
    useEffect(() => {
        const fetchMasini = async () => {
            try {
                setLoading(true);
                const data = await apiGet('/api/masini');
                const scores = getAiMatchScores();
                setAiScores(scores);
                const enriched = data.map(m => ({
                    ...m,
                    aiMatch: scores ? (scores[m.idMasina] ?? null) : null,
                    specs: getSpecs(m),
                    imagine: getImagine(m),
                }));
                setMasini(enriched);
                if (enriched.length > 0) {
                    const years = enriched.map(m => m.anFabricatie);
                    const prices = enriched.map(m => m.esteInPromotie && m.pretPromotional ? m.pretPromotional : m.pretEuro);
                    setYearMin(Math.min(...years));
                    setYearMax(Math.max(...years));
                    setPriceMin(Math.floor(Math.min(...prices) / 10000) * 10000);
                    setPriceMax(Math.ceil(Math.max(...prices) / 10000) * 10000);
                }
            } catch (err) {
                setError(err.message || 'Eroare la încărcarea mașinilor');
            } finally {
                setLoading(false);
            }
        };
        fetchMasini();
    }, []);

    // Re-check AI scores when user navigates back (e.g. after completing AI test)
    useEffect(() => {
        const handleFocus = () => {
            const fresh = getAiMatchScores();
            if (JSON.stringify(fresh) !== JSON.stringify(aiScores)) {
                setAiScores(fresh);
                setMasini(prev => prev.map(m => ({
                    ...m,
                    aiMatch: fresh ? (fresh[m.idMasina] ?? null) : null,
                })));
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [aiScores]);

    // Dynamic filter bounds from data
    const allBrands = [...new Set(masini.map(m => m.marca))];
    const ABS_MIN_YEAR = masini.length > 0 ? Math.min(...masini.map(m => m.anFabricatie)) : 2000;
    const ABS_MAX_YEAR = masini.length > 0 ? Math.max(...masini.map(m => m.anFabricatie)) : 2025;
    const ABS_MIN_PRICE = masini.length > 0 ? Math.floor(Math.min(...masini.map(m => m.esteInPromotie && m.pretPromotional ? m.pretPromotional : m.pretEuro)) / 10000) * 10000 : 0;
    const ABS_MAX_PRICE = masini.length > 0 ? Math.ceil(Math.max(...masini.map(m => m.pretEuro)) / 10000) * 10000 : 200000;

    const toggleWishlist = (id) => {
        const updated = wishlist.includes(id) ? wishlist.filter(wId => wId !== id) : [...wishlist, id];
        setWishlist(updated);
        localStorage.setItem('wishlist', JSON.stringify(updated));
    };

    const toggleBrand = (brand) => {
        setSelectedBrands(prev =>
            prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
        );
    };

    const toggleCaroserie = (cat) => {
        setSelectedCaroserii(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const resetFilters = () => {
        setAiMinScore(0);
        setSelectedBrands([]);
        setFuelFilter(null);
        setSelectedCaroserii([]);
        setYearMin(ABS_MIN_YEAR);
        setYearMax(ABS_MAX_YEAR);
        setPriceMin(ABS_MIN_PRICE);
        setPriceMax(ABS_MAX_PRICE);
    };

    // Filter
    const filteredMasini = masini.filter(m => {
        const pret = m.esteInPromotie && m.pretPromotional ? m.pretPromotional : m.pretEuro;
        if (selectedBrands.length > 0 && !selectedBrands.includes(m.marca)) return false;
        if (selectedCaroserii.length > 0 && !selectedCaroserii.includes(m.categorieAuto)) return false;
        if (fuelFilter && combustibilMap[m.combustibil] !== fuelFilter) return false;
        if (hasAiTest && aiMinScore > 0 && (m.aiMatch === null || m.aiMatch < aiMinScore)) return false;
        if (m.anFabricatie < yearMin || m.anFabricatie > yearMax) return false;
        if (pret < priceMin || pret > priceMax) return false;
        return true;
    });

    // Sort
    const sortedMasini = [...filteredMasini].sort((a, b) => {
        if (sortBy === 'ai') return (b.aiMatch || 0) - (a.aiMatch || 0);
        if (sortBy === 'price-low') return (a.esteInPromotie ? a.pretPromotional : a.pretEuro) - (b.esteInPromotie ? b.pretPromotional : b.pretEuro);
        if (sortBy === 'price-high') return (b.esteInPromotie ? b.pretPromotional : b.pretEuro) - (a.esteInPromotie ? a.pretPromotional : a.pretEuro);
        if (sortBy === 'newest') return b.anFabricatie - a.anFabricatie;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedMasini.length / ITEMS_PER_PAGE);
    const paginatedMasini = sortedMasini.slice((paginaCurenta - 1) * ITEMS_PER_PAGE, paginaCurenta * ITEMS_PER_PAGE);

    const recentViewed = masini.filter(m => m.status !== 'Vândut').slice(0, 5);

    // Slider percentages
    const yearMinPct = ABS_MAX_YEAR > ABS_MIN_YEAR ? ((yearMin - ABS_MIN_YEAR) / (ABS_MAX_YEAR - ABS_MIN_YEAR)) * 100 : 0;
    const yearMaxPct = ABS_MAX_YEAR > ABS_MIN_YEAR ? ((yearMax - ABS_MIN_YEAR) / (ABS_MAX_YEAR - ABS_MIN_YEAR)) * 100 : 100;
    const priceMinPct = ABS_MAX_PRICE > ABS_MIN_PRICE ? ((priceMin - ABS_MIN_PRICE) / (ABS_MAX_PRICE - ABS_MIN_PRICE)) * 100 : 0;
    const priceMaxPct = ABS_MAX_PRICE > ABS_MIN_PRICE ? ((priceMax - ABS_MIN_PRICE) / (ABS_MAX_PRICE - ABS_MIN_PRICE)) * 100 : 100;

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#895af6]/30 border-t-[#895af6] rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm">Se încarcă catalogul...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-1 items-center justify-center min-h-[60vh]">
                <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
                    <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error</span>
                    <p className="text-white font-semibold mb-2">Eroare la încărcare</p>
                    <p className="text-gray-400 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 pt-6 px-6 pb-12 gap-8 max-w-[1920px] mx-auto w-full">
            {/* Sidebar Filtre */}
            <aside className="hidden lg:flex flex-col w-80 shrink-0 gap-6 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white tracking-wide">Filtre</h2>
                    <button onClick={resetFilters} className="text-xs font-medium text-[#895af6] hover:text-white transition-colors">Resetează</button>
                </div>

                {/* AI Match Score */}
                <div className="glass-panel p-5 rounded-2xl space-y-4 border-t-2 border-t-[#2DD4BF]/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#2DD4BF]/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex justify-between items-center z-10 relative">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#2DD4BF] text-xl">smart_toy</span>
                            <span className="text-sm font-semibold text-white">AI Match Score</span>
                        </div>
                        {hasAiTest && <span className="text-xs font-bold bg-[#2DD4BF]/20 text-[#2DD4BF] px-2 py-1 rounded-md">&gt; {aiMinScore}%</span>}
                    </div>
                    {hasAiTest ? (
                        <>
                            <p className="text-xs text-gray-400">Procentele sunt calculate pe baza testului tău AI.</p>
                            <div className="relative h-2 bg-white/10 rounded-full mt-2">
                                <div className="absolute h-full bg-gradient-to-r from-teal-500 to-[#2DD4BF] rounded-full" style={{ width: `${aiMinScore}%` }}></div>
                                <input
                                    type="range" min="0" max="100" value={aiMinScore}
                                    onChange={e => setAiMinScore(parseInt(e.target.value))}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                />
                                <div className="absolute size-4 bg-white border-2 border-[#2DD4BF] rounded-full -top-1 shadow-[0_0_10px_rgba(45,212,191,0.5)] pointer-events-none" style={{ left: `${aiMinScore}%`, transform: 'translateX(-50%)' }}></div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-400">Completează testul AI din secțiunea <strong className="text-[#2DD4BF]">Recomandare AI</strong> pentru a vedea cât de bine se potrivește fiecare mașină cu preferințele tale.</p>
                            <button
                                onClick={() => navigate('/client/recomandare-ai')}
                                className="w-full py-2 rounded-lg bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-[#2DD4BF] text-xs font-bold hover:bg-[#2DD4BF]/20 transition flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                Fă Testul AI
                            </button>
                        </div>
                    )}
                </div>

                {/* Brand */}
                <div className="glass-panel p-5 rounded-2xl">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Brand</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {allBrands.map(brand => (
                            <button
                                key={brand}
                                onClick={() => toggleBrand(brand)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0 ${
                                    selectedBrands.includes(brand)
                                        ? 'bg-[#895af6] text-white border-[#895af6] shadow-[0_0_10px_rgba(137,90,246,0.3)]'
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                                }`}
                            >
                                {brand}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preț */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Preț</h3>
                    <div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">De la</span>
                            <span className="font-bold text-white">€{priceMin.toLocaleString()}</span>
                        </div>
                        <div className="relative h-1.5 bg-white/10 rounded-full">
                            <div className="absolute h-full bg-[#895af6] rounded-full" style={{ width: `${priceMinPct}%` }}></div>
                            <input type="range" min={ABS_MIN_PRICE} max={ABS_MAX_PRICE} step={5000} value={priceMin}
                                onChange={e => { const v = parseInt(e.target.value); if (v <= priceMax) setPriceMin(v); }}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                            <div className="absolute size-4 bg-[#895af6] border-2 border-white rounded-full -top-1.5 shadow-lg pointer-events-none"
                                style={{ left: `${priceMinPct}%`, transform: 'translateX(-50%)' }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">Până la</span>
                            <span className="font-bold text-white">€{priceMax.toLocaleString()}</span>
                        </div>
                        <div className="relative h-1.5 bg-white/10 rounded-full">
                            <div className="absolute h-full bg-[#895af6] rounded-full" style={{ width: `${priceMaxPct}%` }}></div>
                            <input type="range" min={ABS_MIN_PRICE} max={ABS_MAX_PRICE} step={5000} value={priceMax}
                                onChange={e => { const v = parseInt(e.target.value); if (v >= priceMin) setPriceMax(v); }}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                            <div className="absolute size-4 bg-[#895af6] border-2 border-white rounded-full -top-1.5 shadow-lg pointer-events-none"
                                style={{ left: `${priceMaxPct}%`, transform: 'translateX(-50%)' }}></div>
                        </div>
                    </div>
                </div>

                {/* An */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">An</h3>
                    <div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">De la</span>
                            <span className="font-bold text-white">{yearMin}</span>
                        </div>
                        <div className="relative h-1.5 bg-white/10 rounded-full">
                            <div className="absolute h-full bg-[#895af6] rounded-full" style={{ width: `${yearMinPct}%` }}></div>
                            <input type="range" min={ABS_MIN_YEAR} max={ABS_MAX_YEAR} value={yearMin}
                                onChange={e => { const v = parseInt(e.target.value); if (v <= yearMax) setYearMin(v); }}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                            <div className="absolute size-4 bg-[#895af6] border-2 border-white rounded-full -top-1.5 shadow-lg pointer-events-none"
                                style={{ left: `${yearMinPct}%`, transform: 'translateX(-50%)' }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center text-xs mb-2">
                            <span className="text-gray-400">Până la</span>
                            <span className="font-bold text-white">{yearMax}</span>
                        </div>
                        <div className="relative h-1.5 bg-white/10 rounded-full">
                            <div className="absolute h-full bg-[#895af6] rounded-full" style={{ width: `${yearMaxPct}%` }}></div>
                            <input type="range" min={ABS_MIN_YEAR} max={ABS_MAX_YEAR} value={yearMax}
                                onChange={e => { const v = parseInt(e.target.value); if (v >= yearMin) setYearMax(v); }}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                            <div className="absolute size-4 bg-[#895af6] border-2 border-white rounded-full -top-1.5 shadow-lg pointer-events-none"
                                style={{ left: `${yearMaxPct}%`, transform: 'translateX(-50%)' }}></div>
                        </div>
                    </div>
                </div>

                {/* Tip Combustibil */}
                <div className="glass-panel p-5 rounded-2xl">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Tip Combustibil</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {Object.values(combustibilMap).map(f => (
                            <button
                                key={f}
                                onClick={() => setFuelFilter(prev => prev === f ? null : f)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0 ${fuelFilter === f
                                    ? 'bg-[#895af6] text-white border-[#895af6] shadow-[0_0_10px_rgba(137,90,246,0.3)]'
                                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tip Caroserie */}
                <div className="glass-panel p-5 rounded-2xl">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Tip Caroserie</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 0, name: 'Sedan', path: 'M5 11l2-3h10l2 3v6h-2v-1H7v1H5v-6zM3 11v6h2v-6H3zm18 0v6h-2v-6h2zM7 14h2v2H7v-2zm8 0h2v2h-2v-2z' },
                            { id: 1, name: 'Hatchback', path: 'M4 11l2-4h8l4 4v6h-2v-1H6v1H4v-6zm2 2v2h2v-2H6zm10 0v2h2v-2h-2zm-9-4l-1.5 2h13l-2.5-2H7z' },
                            { id: 2, name: 'Coupe', path: 'M3 12l2.5-3.5h13L21 12v6h-2v-1H5v1H3v-6zm3.5-2l-1.5 2h14l-1.5-2H6.5zM7 14h2v2H7v-2zm8 0h2v2h-2v-2z' },
                            { id: 3, name: 'Break', path: 'M4 11l1-3h13l2 3v6h-2v-1H6v1H4v-6zm2 2v2h2v-2H6zm10 0v2h2v-2h-2zm-9-4l-.7 2h11.4l.7-2H7z' },
                            { id: 4, name: 'SUV', path: 'M4 10l1.5-4h13L20 10v7h-2v-1H6v1H4v-7zm3 4h2v2H7v-2zm8 0h2v2h-2v-2zm-8.5-4l-1 2.5h12l-1-2.5H6.5z' },
                            { id: 5, name: 'Cabrio', path: 'M3 12l2-3h14l2 3v5h-2v-1H5v1H3v-5zm3.5-1.5l-1 1.5h13l-1-1.5h-11zM7 14h2v2H7v-2zm8 0h2v2h-2v-2z' },
                        ].map(c => (
                            <button
                                key={c.id}
                                onClick={() => toggleCaroserie(c.id)}
                                className={`flex flex-col items-center justify-center gap-2 p-2 rounded-xl border transition-all group h-20 ${selectedCaroserii.includes(c.id)
                                    ? 'bg-[#895af6]/20 border-[#895af6] text-[#895af6] shadow-[0_0_10px_rgba(137,90,246,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-[#895af6]/20 hover:border-[#895af6]/50 hover:text-white text-gray-400'
                                    }`}
                            >
                                <svg className="w-8 h-8 group-hover:scale-110 transition-transform fill-current" viewBox="0 0 24 24">
                                    <path d={c.path}></path>
                                </svg>
                                <span className="text-[10px] font-medium">{c.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Header + Sort */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Catalog Mașini</h1>
                        <p className="text-gray-400 text-sm">{paginatedMasini.length} vehicule afișate din {masini.length} disponibile</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-sm text-gray-400">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="bg-transparent border-none text-white text-sm font-medium focus:ring-0 cursor-pointer p-0 pr-6"
                            >
                                {hasAiTest && <option value="ai" className="bg-[#151022]">AI Match %</option>}
                                <option value="price-low" className="bg-[#151022]">Preț: Crescător</option>
                                <option value="price-high" className="bg-[#151022]">Preț: Descrescător</option>
                                <option value="newest" className="bg-[#151022]">Cele mai noi</option>
                            </select>
                        </div>
                        <button className="lg:hidden p-2 bg-white/5 border border-white/10 rounded-lg text-white">
                            <span className="material-symbols-outlined">filter_list</span>
                        </button>
                    </div>
                </div>

                {/* Car Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {paginatedMasini.map(masina => {
                        const isVandut = masina.status === 'Vândut';
                        const pretAfisat = masina.esteInPromotie && masina.pretPromotional ? masina.pretPromotional : masina.pretEuro;
                        const mc = masina.aiMatch != null ? matchColor(masina.aiMatch) : null;
                        const aiColor = mc ? mc.hex : '#64748b';
                        const aiText = masina.aiMatch != null ? `${masina.aiMatch}%` : '—';

                        return (
                            <div
                                key={masina.idMasina}
                                className={`group relative glass-panel rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${isVandut
                                    ? 'grayscale opacity-70 hover:opacity-100 hover:grayscale-0'
                                    : 'hover:border-[#895af6]/50 hover:shadow-[0_0_30px_rgba(137,90,246,0.1)]'
                                    }`}
                            >
                                {/* Image */}
                                <div className="relative h-60 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#151022] to-transparent opacity-60 z-10"></div>
                                    <img
                                        alt={`${masina.marca} ${masina.model}`}
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                        src={masina.imagine}
                                    />

                                    {/* Status Badge */}
                                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                                        {isVandut ? (
                                            <span className="px-2.5 py-1 bg-gray-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">Vândut</span>
                                        ) : (
                                            <span className="px-2.5 py-1 bg-green-500/90 backdrop-blur-sm text-[#151022] text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">Disponibil</span>
                                        )}
                                        {masina.combustibil === 3 && (
                                            <span className="px-2.5 py-1 bg-[#2DD4BF]/90 backdrop-blur-sm text-[#151022] text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">Electric</span>
                                        )}
                                    </div>

                                    {/* Wishlist Button */}
                                    {!isVandut && (
                                        <div className="absolute top-4 right-4 z-20">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleWishlist(masina.idMasina); }}
                                                className={`relative flex items-center justify-center size-10 backdrop-blur-md rounded-full border transition-all duration-300 ${
                                                    wishlist.includes(masina.idMasina)
                                                        ? 'bg-red-500/20 border-red-400/30 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                                                        : 'bg-black/60 border-white/10 hover:bg-black/80'
                                                }`}
                                            >
                                                <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${
                                                    wishlist.includes(masina.idMasina) ? 'text-red-400' : 'text-white'
                                                }`}>
                                                    {wishlist.includes(masina.idMasina) ? 'favorite' : 'favorite_border'}
                                                </span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Promo Ribbon */}
                                    {masina.esteInPromotie && !isVandut && (
                                        <div className="absolute -right-8 top-6 z-20 rotate-45 bg-[#895af6] py-1 px-10 shadow-lg text-[10px] font-bold text-white tracking-widest border border-white/20">
                                            PROMO
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5 flex flex-col flex-1 relative">
                                    {/* AI Match Circle */}
                                    {hasAiTest ? (
                                        <div className="absolute -top-6 right-5 z-20 bg-[#151022] rounded-full p-1 border border-white/10 shadow-xl">
                                            <div
                                                className={`relative size-12 flex items-center justify-center rounded-full ${mc ? mc.ring : ''}`}
                                                style={{ background: `conic-gradient(${aiColor} ${masina.aiMatch ?? 0}%, #334155 0)` }}
                                            >
                                                <div className="absolute inset-1 bg-[#151022] rounded-full flex items-center justify-center">
                                                    <span className={`text-[11px] font-bold ${mc ? mc.text : 'text-slate-500'}`}>{aiText}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute -top-6 right-5 z-20 bg-[#151022] rounded-full p-1 border border-white/10 shadow-xl">
                                            <div className="relative size-12 flex items-center justify-center rounded-full bg-white/5">
                                                <div className="absolute inset-1 bg-[#151022] rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-600 text-[16px]">smart_toy</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-white leading-tight mb-1">{masina.marca} {masina.model}</h3>
                                        <p className="text-sm text-gray-400 font-light">{masina.specs}</p>
                                    </div>

                                    <div className="flex items-end gap-3 mb-6">
                                        {isVandut ? (
                                            <span className="text-2xl font-bold text-gray-500">€{masina.pretEuro.toLocaleString()}</span>
                                        ) : (
                                            <>
                                                <span className="text-2xl font-bold text-[#D4AF37]">€{pretAfisat.toLocaleString()}</span>
                                                {masina.esteInPromotie && masina.pretPromotional && (
                                                    <span className="text-sm text-gray-500 line-through mb-1.5">€{masina.pretEuro.toLocaleString()}</span>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Buttons */}
                                    <div className="mt-auto">
                                        {isVandut ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                <button className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed opacity-50" disabled>
                                                    Indisponibil
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => navigate(`/client/masina/${masina.idMasina}`)}
                                                    className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <span className="material-symbols-outlined text-lg">visibility</span>
                                                    Vezi Detalii
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/client/masina/${masina.idMasina}?testdrive=1`)}
                                                    className="py-2.5 px-4 rounded-xl bg-[#895af6] text-white text-sm font-bold shadow-[0_0_15px_rgba(137,90,246,0.4)] hover:shadow-[0_0_25px_rgba(137,90,246,0.6)] hover:bg-[#895af6]/90 transition-all flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-lg">speed</span>
                                                    Test Drive
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12 mb-8">
                    <button
                        onClick={() => setPaginaCurenta(p => Math.max(1, p - 1))}
                        disabled={paginaCurenta === 1}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let page;
                            if (totalPages <= 5) { page = i + 1; }
                            else if (paginaCurenta <= 3) { page = i + 1; }
                            else if (paginaCurenta >= totalPages - 2) { page = totalPages - 4 + i; }
                            else { page = paginaCurenta - 2 + i; }
                            return (
                                <button
                                    key={page}
                                    onClick={() => setPaginaCurenta(page)}
                                    className={`size-9 rounded-lg font-medium transition-all ${paginaCurenta === page
                                        ? 'bg-[#895af6] text-white font-bold shadow-lg shadow-[#895af6]/20'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        {totalPages > 5 && paginaCurenta < totalPages - 2 && (
                            <>
                                <span className="text-gray-500">...</span>
                                <button
                                    onClick={() => setPaginaCurenta(totalPages)}
                                    className={`size-9 rounded-lg font-medium transition-all ${paginaCurenta === totalPages
                                        ? 'bg-[#895af6] text-white font-bold shadow-lg shadow-[#895af6]/20'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    {totalPages}
                                </button>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => setPaginaCurenta(p => Math.min(totalPages, p + 1))}
                        disabled={paginaCurenta === totalPages}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
                )}

                {/* Vehicule Vizualizate Recent */}
                <section className="mt-4 mb-2 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-base font-bold text-white tracking-tight">Vehicule Vizualizate Recent</h2>
                        <div className="flex gap-2">
                            <button className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-base">chevron_left</span>
                            </button>
                            <button className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-base">chevron_right</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                        {recentViewed.map(masina => (
                            <div
                                key={masina.idMasina}
                                onClick={() => navigate(`/client/masina/${masina.idMasina}`)}
                                className="min-w-[180px] w-[180px] glass-panel rounded-xl overflow-hidden snap-start hover:border-[#895af6]/50 transition-all duration-300 group cursor-pointer hover:shadow-[0_0_20px_rgba(137,90,246,0.1)] flex flex-col"
                            >
                                <div className="h-20 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#151022] to-transparent opacity-50 z-10"></div>
                                    <img
                                        alt={`${masina.marca} ${masina.model}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        src={masina.imagine}
                                    />
                                </div>
                                <div className="p-2 flex flex-col gap-1">
                                    <h3 className="text-xs font-bold text-white truncate">{masina.marca} {masina.model}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-[#D4AF37]">€{(masina.esteInPromotie && masina.pretPromotional ? masina.pretPromotional : masina.pretEuro).toLocaleString()}</span>
                                        <button className="size-5 rounded-md bg-white/5 hover:bg-[#895af6] text-gray-400 hover:text-white flex items-center justify-center transition-colors">
                                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default CatalogMasini;
