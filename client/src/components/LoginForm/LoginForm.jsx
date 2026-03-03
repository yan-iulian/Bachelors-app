import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
    // 'choice' = split view, 'login' = fullscreen login, 'register' = fullscreen register
    const [view, setView] = useState('choice');

    // Login state
    const [email, setEmail] = useState('');
    const [parola, setParola] = useState('');

    // Register state
    const [regForm, setRegForm] = useState({
        nume: '', prenume: '', email: '', parola: '', parolaConfirm: '', telefon: ''
    });
    const [regError, setRegError] = useState(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector((state) => state.auth);

    const handleLogin = async (e) => {
        e.preventDefault();
        dispatch(clearError());
        const result = await dispatch(login({ email, parola }));
        if (result.meta.requestStatus === 'fulfilled') {
            const rol = result.payload.utilizator.rol;
            if (rol === 'Director') navigate('/director');
            else if (rol === 'Client') navigate('/client');
            else if (rol === 'Mecanic') navigate('/mecanic');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError(null);
        dispatch(clearError());
        if (regForm.parola !== regForm.parolaConfirm) { setRegError('Parolele nu coincid'); return; }
        if (regForm.parola.length < 6) { setRegError('Parola trebuie să aibă minim 6 caractere'); return; }
        const result = await dispatch(register({
            nume: regForm.nume, prenume: regForm.prenume,
            email: regForm.email, parola: regForm.parola, telefon: regForm.telefon,
        }));
        if (result.meta.requestStatus === 'fulfilled') navigate('/client');
    };

    const goBack = () => {
        setView('choice');
        dispatch(clearError());
        setRegError(null);
    };

    // ────────────────────────────────────────────────────────────────
    // Shared input style
    const inputClass = (accent = 'primary') =>
        `w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3.5 pl-13 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-${accent}/50 focus:border-transparent focus:bg-black/40 transition-all`;

    const inputClassSmall = (accent = 'primary') =>
        `w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3 pl-11 pr-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-${accent}/50 focus:border-transparent focus:bg-black/40 transition-all`;

    return (
        <div className="min-h-screen bg-[#0a0714] relative overflow-hidden">

            {/* ==================== CHOICE VIEW — Two image panels ==================== */}
            <div className={`flex h-screen relative transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${view === 'choice' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                {/* ── Centered Logo + Slogan (over both panels) ── */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="size-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl shadow-primary/30">
                            <span className="material-symbols-outlined text-white text-5xl">diamond</span>
                        </div>
                        <h1 className="text-6xl font-bold text-white tracking-tight drop-shadow-lg" style={{ fontFamily: "'Cinzel', serif" }}>AerYan</h1>
                    </div>
                    <p className="text-white/70 text-base tracking-[0.35em] uppercase drop-shadow-md italic" style={{ fontFamily: "'Cinzel', serif" }}>Your Drive On Your Style</p>
                </div>

                {/* ── LEFT — Login Panel ── */}
                <button onClick={() => { setView('login'); dispatch(clearError()); }}
                    className="group relative flex-1 overflow-hidden cursor-pointer text-left focus:outline-none">

                    {/* Background image */}
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 blur-[1px] group-hover:blur-0"
                        style={{ backgroundImage: "url('/login-bg.jpg')" }}></div>

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30 group-hover:from-black/70 group-hover:via-black/30 transition-all duration-500"></div>

                    {/* Separator line right */}
                    <div className="absolute top-0 right-0 w-[1px] h-full bg-white/10 z-10"></div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center px-10 z-10">
                        <div className="size-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-2xl group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-500">
                            <span className="material-symbols-outlined text-white text-4xl">login</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">Autentificare</h2>
                        <p className="text-white/60 text-base text-center max-w-[280px] leading-relaxed group-hover:text-white/80 transition-colors">
                            Conectează-te la contul tău AerYan
                        </p>
                        <div className="mt-8 px-8 py-3 rounded-full border border-white/20 text-white/70 text-sm font-medium group-hover:bg-white/10 group-hover:text-white group-hover:border-white/40 transition-all duration-300 flex items-center gap-2">
                            <span>Intră în cont</span>
                            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </button>

                {/* ── RIGHT — Register Panel ── */}
                <button onClick={() => { setView('register'); dispatch(clearError()); setRegError(null); setRegForm({ nume: '', prenume: '', email: '', parola: '', parolaConfirm: '', telefon: '' }); }}
                    className="group relative flex-1 overflow-hidden cursor-pointer text-left focus:outline-none">

                    {/* Background image */}
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 blur-[1px] group-hover:blur-0"
                        style={{ backgroundImage: "url('/register-bg.jpg')" }}></div>

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30 group-hover:from-black/70 group-hover:via-black/30 transition-all duration-500"></div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center px-10 z-10">
                        <div className="size-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-2xl group-hover:bg-amber-500/20 group-hover:border-amber-400/40 transition-all duration-500">
                            <span className="material-symbols-outlined text-white text-4xl">person_add</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-3 tracking-tight drop-shadow-lg">Cont Nou</h2>
                        <p className="text-white/60 text-base text-center max-w-[280px] leading-relaxed group-hover:text-white/80 transition-colors">
                            Creează un cont și descoperă mașina perfectă
                        </p>
                        <div className="mt-8 px-8 py-3 rounded-full border border-white/20 text-white/70 text-sm font-medium group-hover:bg-white/10 group-hover:text-white group-hover:border-white/40 transition-all duration-300 flex items-center gap-2">
                            <span>Începe acum</span>
                            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* ==================== LOGIN FULLSCREEN ==================== */}
            <div className={`fixed inset-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${view === 'login' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>

                {/* Background image — same as left panel, full */}
                <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-[1200ms]
                    ${view === 'login' ? 'scale-100' : 'scale-110'}`}
                    style={{ backgroundImage: "url('/login-bg.jpg')" }}></div>

                {/* Deep overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-[#0d0520]/80 to-black/85 backdrop-blur-[2px]"></div>

                {/* Back button */}
                <button onClick={goBack}
                    className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white/50 hover:text-white transition-colors group">
                    <div className="size-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </div>
                    <span className="text-sm font-medium">Înapoi</span>
                </button>

                {/* Centered form */}
                <div className="relative h-full flex items-center justify-center z-10">
                    <div className="w-full max-w-[420px] p-8">
                        {/* Logo */}
                        <div className="flex flex-col items-center mb-10">
                            <div className="size-18 bg-gradient-to-br from-primary/30 to-purple-800/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mb-5 border border-primary/30 backdrop-blur-md">
                                <span className="material-symbols-outlined text-white text-5xl">diamond</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white tracking-tight">AerYan</h1>
                            <p className="text-white/40 text-sm mt-2 tracking-wide">Conectează-te la contul tău</p>
                        </div>

                        {error && view === 'login' && (
                            <div className="bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-base">error</span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xl">mail</span>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Adresa de email" required
                                    className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3.5 pl-13 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent focus:bg-black/40 transition-all" />
                            </div>

                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xl">lock</span>
                                <input type="password" value={parola} onChange={(e) => setParola(e.target.value)}
                                    placeholder="Parola" required
                                    className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3.5 pl-13 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent focus:bg-black/40 transition-all" />
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-primary to-purple-700 text-white font-bold text-sm rounded-xl shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                                {loading ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Se autentifică...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">login</span>
                                        Autentificare
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="text-center text-white/30 text-sm mt-8">
                            Nu ai un cont?{' '}
                            <button onClick={() => { setView('register'); dispatch(clearError()); setRegError(null); setRegForm({ nume: '', prenume: '', email: '', parola: '', parolaConfirm: '', telefon: '' }); }}
                                className="text-primary/80 hover:text-white transition-colors font-medium underline underline-offset-2 decoration-primary/30">
                                Creează cont
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            {/* ==================== REGISTER FULLSCREEN ==================== */}
            <div className={`fixed inset-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${view === 'register' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>

                {/* Background image — warm dealership */}
                <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-[1200ms]
                    ${view === 'register' ? 'scale-100' : 'scale-110'}`}
                    style={{ backgroundImage: "url('/register-bg.jpg')" }}></div>

                {/* Deep overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-[#1a0e08]/80 to-black/85 backdrop-blur-[2px]"></div>

                {/* Back button */}
                <button onClick={goBack}
                    className="absolute top-8 left-8 z-20 flex items-center gap-2 text-white/50 hover:text-white transition-colors group">
                    <div className="size-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                    </div>
                    <span className="text-sm font-medium">Înapoi</span>
                </button>

                {/* Centered form */}
                <div className="relative h-full flex items-center justify-center z-10">
                    <div className="w-full max-w-[460px] p-8">
                        {/* Logo */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="size-14 bg-gradient-to-br from-amber-500/30 to-orange-600/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-4 border border-amber-400/30 backdrop-blur-md">
                                <span className="material-symbols-outlined text-white text-3xl">person_add</span>
                            </div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Creează Cont</h1>
                            <p className="text-white/40 text-sm mt-1">Devino client AerYan</p>
                        </div>

                        {(error || regError) && view === 'register' && (
                            <div className="bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-sm mb-5 flex items-center gap-2 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-base">error</span>
                                {regError || error}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">badge</span>
                                    <input type="text" value={regForm.nume} onChange={e => setRegForm(f => ({ ...f, nume: e.target.value }))}
                                        placeholder="Nume" required
                                        className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3 pl-11 pr-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent focus:bg-black/40 transition-all" />
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">person</span>
                                    <input type="text" value={regForm.prenume} onChange={e => setRegForm(f => ({ ...f, prenume: e.target.value }))}
                                        placeholder="Prenume" required
                                        className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3 pl-11 pr-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent focus:bg-black/40 transition-all" />
                                </div>
                            </div>

                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">mail</span>
                                <input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="Adresa de email" required
                                    className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent focus:bg-black/40 transition-all" />
                            </div>

                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">phone</span>
                                <input type="tel" value={regForm.telefon} onChange={e => setRegForm(f => ({ ...f, telefon: e.target.value }))}
                                    placeholder="Telefon (opțional)"
                                    className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent focus:bg-black/40 transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">lock</span>
                                    <input type="password" value={regForm.parola} onChange={e => setRegForm(f => ({ ...f, parola: e.target.value }))}
                                        placeholder="Parolă (min 6)" required
                                        className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3 pl-11 pr-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent focus:bg-black/40 transition-all" />
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg">lock_reset</span>
                                    <input type="password" value={regForm.parolaConfirm} onChange={e => setRegForm(f => ({ ...f, parolaConfirm: e.target.value }))}
                                        placeholder="Confirmă parola" required
                                        className="w-full bg-black/30 backdrop-blur-sm border border-white/15 rounded-xl py-3 pl-11 pr-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-transparent focus:bg-black/40 transition-all" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm rounded-xl shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
                                {loading ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Se creează contul...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">how_to_reg</span>
                                        Creează Cont
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="text-center text-white/30 text-sm mt-6">
                            Ai deja un cont?{' '}
                            <button onClick={() => { setView('login'); dispatch(clearError()); }}
                                className="text-amber-400/80 hover:text-white transition-colors font-medium underline underline-offset-2 decoration-amber-400/30">
                                Autentifică-te
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;
