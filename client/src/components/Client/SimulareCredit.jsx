import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function SimulareCredit() {
    const location = useLocation();
    const navigate = useNavigate();
    const { pretMasina: initialPret, numeMasina } = location.state || {};

    const [pretMasina, setPretMasina] = useState(initialPret || 25000);
    const [avansPercent, setAvansPercent] = useState(20);
    const [perioada, setPerioada] = useState(60);
    const [dobanda, setDobanda] = useState(8.5);
    const [salariuNet, setSalariuNet] = useState(5000);

    // Calculations
    const avans = Math.round(pretMasina * avansPercent / 100);
    const principal = pretMasina - avans;

    const calcRata = (p, n, d) => {
        if (d <= 0 || n <= 0 || p <= 0) return p / (n || 1);
        const r = d / 100 / 12;
        return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    };

    const rataLunara = calcRata(principal, perioada, dobanda);
    const totalPlatit = rataLunara * perioada;
    const totalDobanda = totalPlatit - principal;
    const costTotal = totalPlatit + avans;

    const perioadaOptions = [12, 24, 36, 48, 60, 72, 84];

    // Salary-based affordability
    const procentDinSalariu = salariuNet > 0 ? (rataLunara / salariuNet * 100) : 0;
    const esteAffordable = procentDinSalariu <= 40;

    return (
        <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 space-y-8" style={{ paddingTop: '6rem' }}>
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => navigate(-1)} className="size-9 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#895af6] text-3xl">calculate</span>
                        Simulare Credit Auto
                    </h1>
                </div>
                <p className="text-slate-400 text-sm ml-12">
                    {numeMasina ? `Calculează ratele pentru ${numeMasina}` : 'Estimează ratele lunare pentru finanțarea auto'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column – Inputs */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Prețul mașinii */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">directions_car</span> Prețul Vehiculului
                        </h3>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37] font-bold text-lg">€</span>
                            <input type="number" value={pretMasina} onChange={e => setPretMasina(Math.max(0, Number(e.target.value)))}
                                className="w-full p-4 pl-10 text-2xl font-bold text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition font-mono" />
                        </div>
                        {numeMasina && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                Preț preluat din pagina: {numeMasina}
                            </div>
                        )}
                    </div>

                    {/* Avans */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">savings</span> Avans
                            </h3>
                            <span className="text-lg font-bold text-[#D4AF37] font-mono">€{avans.toLocaleString()} ({avansPercent}%)</span>
                        </div>
                        <input type="range" min={0} max={80} step={5} value={avansPercent} onChange={e => setAvansPercent(Number(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#895af6]" />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span>
                        </div>
                    </div>

                    {/* Perioada */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">calendar_month</span> Perioada de Finanțare
                        </h3>
                        <div className="grid grid-cols-7 gap-2">
                            {perioadaOptions.map(m => (
                                <button key={m} onClick={() => setPerioada(m)}
                                    className={`py-3 rounded-xl text-sm font-bold transition-all ${perioada === m
                                        ? 'bg-[#895af6] text-white shadow-lg shadow-[#895af6]/20'
                                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                    }`}>
                                    {m}
                                    <span className="block text-[10px] font-normal opacity-70">luni</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dobândă */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">percent</span> Rată Dobândă Anuală
                            </h3>
                            <span className="text-lg font-bold text-white font-mono">{dobanda}%</span>
                        </div>
                        <input type="range" min={3} max={15} step={0.5} value={dobanda} onChange={e => setDobanda(Number(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#895af6]" />
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>3%</span><span>9%</span><span>15%</span>
                        </div>
                    </div>

                    {/* Salariu net – Affordability */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span> Verificare Salariu
                        </h3>
                        <div className="flex gap-4 items-end flex-wrap">
                            <div className="flex-1 min-w-[180px]">
                                <label className="text-xs text-slate-500 mb-1 block">Salariu Net Lunar (€)</label>
                                <input type="number" value={salariuNet} onChange={e => setSalariuNet(Math.max(0, Number(e.target.value)))}
                                    className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition font-mono" />
                            </div>
                            <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap ${esteAffordable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                <span className="material-symbols-outlined text-[18px]">{esteAffordable ? 'check_circle' : 'warning'}</span>
                                {procentDinSalariu.toFixed(1)}% din salariu
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            {esteAffordable
                                ? 'Rata lunară se încadrează sub limita recomandată de 40% din venitul net lunar.'
                                : 'Atenție! Rata depășește 40% din venitul net. Se recomandă un avans mai mare sau o perioadă mai lungă.'}
                        </p>
                    </div>
                </div>

                {/* Right Column – Results */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Rata Lunară – Big Card */}
                    <div className="glass-panel rounded-2xl p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-7xl text-[#895af6]">payments</span>
                        </div>
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Rata Lunară Estimată</span>
                        <p className="text-5xl font-bold text-white mt-3 font-mono">
                            €{Math.round(rataLunara).toLocaleString()}
                            <span className="text-lg text-slate-400 font-normal"> / lună</span>
                        </p>
                        <p className="text-sm text-slate-500 mt-2">pentru {perioada} luni ({(perioada / 12).toFixed(1)} ani)</p>
                    </div>

                    {/* Financial Summary */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sumar Financiar</h3>
                        {[
                            { label: 'Preț vehicul', value: `€${pretMasina.toLocaleString()}`, icon: 'directions_car', color: 'text-white' },
                            { label: 'Avans achitat', value: `€${avans.toLocaleString()}`, icon: 'savings', color: 'text-emerald-400' },
                            { label: 'Sumă finanțată', value: `€${principal.toLocaleString()}`, icon: 'account_balance', color: 'text-[#895af6]' },
                            { label: 'Dobândă totală', value: `€${Math.round(totalDobanda).toLocaleString()}`, icon: 'percent', color: 'text-amber-400' },
                            { label: 'Cost total credit', value: `€${Math.round(costTotal).toLocaleString()}`, icon: 'receipt_long', color: 'text-[#D4AF37]' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`material-symbols-outlined text-[16px] ${item.color}`}>{item.icon}</span>
                                    <span className="text-sm text-slate-300">{item.label}</span>
                                </div>
                                <span className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Visual Breakdown */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Structura Plății</h3>
                        <div className="h-6 bg-white/5 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${costTotal > 0 ? (avans / costTotal * 100) : 0}%` }}></div>
                            <div className="bg-[#895af6] h-full transition-all" style={{ width: `${costTotal > 0 ? (principal / costTotal * 100) : 0}%` }}></div>
                            <div className="bg-amber-500 h-full transition-all" style={{ width: `${costTotal > 0 ? (Math.round(totalDobanda) / costTotal * 100) : 0}%` }}></div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs">
                            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-emerald-500"></span> Avans ({costTotal > 0 ? (avans / costTotal * 100).toFixed(1) : 0}%)</span>
                            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#895af6]"></span> Principal ({costTotal > 0 ? (principal / costTotal * 100).toFixed(1) : 0}%)</span>
                            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-amber-500"></span> Dobândă ({costTotal > 0 ? (Math.round(totalDobanda) / costTotal * 100).toFixed(1) : 0}%)</span>
                        </div>
                    </div>

                    {/* Comparare perioade */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Comparare Perioade</h3>
                        <div className="space-y-3">
                            {perioadaOptions.filter(m => m !== perioada).slice(0, 4).map(m => {
                                const rata = calcRata(principal, m, dobanda);
                                const totalDob = rata * m - principal;
                                return (
                                    <button key={m} onClick={() => setPerioada(m)}
                                        className="w-full flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3 border border-white/5 hover:border-[#895af6]/30 transition group">
                                        <div className="text-left">
                                            <span className="text-sm font-bold text-white group-hover:text-[#895af6] transition">{m} luni</span>
                                            <span className="text-[10px] text-slate-500 ml-2">({(m / 12).toFixed(1)} ani)</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-white font-mono">€{Math.round(rata).toLocaleString()}/lună</span>
                                            <span className="text-[10px] text-amber-400 ml-2">+€{Math.round(totalDob).toLocaleString()} dobândă</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 flex items-start gap-2">
                        <span className="material-symbols-outlined text-slate-500 text-[16px] mt-0.5">info</span>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Aceasta este o simulare orientativă. Condițiile reale de finanțare pot diferi în funcție de instituția de credit,
                            scorul de creditare și alte criterii. Contactați Directorul parcului pentru o ofertă personalizată.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default SimulareCredit;
