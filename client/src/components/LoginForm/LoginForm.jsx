import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../../store/authSlice';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [parola, setParola] = useState('');
    const [showRegister, setShowRegister] = useState(false);

    // Register form fields
    const [regForm, setRegForm] = useState({ nume: '', prenume: '', email: '', parola: '', parolaConfirm: '', telefon: '' });
    const [regError, setRegError] = useState(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector((state) => state.auth);

    const handleSubmit = async (e) => {
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
        if (regForm.parola !== regForm.parolaConfirm) {
            setRegError('Parolele nu coincid');
            return;
        }
        if (regForm.parola.length < 6) {
            setRegError('Parola trebuie să aibă minim 6 caractere');
            return;
        }
        const result = await dispatch(register({
            nume: regForm.nume,
            prenume: regForm.prenume,
            email: regForm.email,
            parola: regForm.parola,
            telefon: regForm.telefon,
        }));
        if (result.meta.requestStatus === 'fulfilled') {
            navigate('/client');
        }
    };

    const openRegister = () => {
        setShowRegister(true);
        dispatch(clearError());
        setRegError(null);
        setRegForm({ nume: '', prenume: '', email: '', parola: '', parolaConfirm: '', telefon: '' });
    };

    const closeRegister = () => {
        setShowRegister(false);
        dispatch(clearError());
        setRegError(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-bg-dark"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-800/20 rounded-full blur-3xl"></div>

            {/* "Nu ai cont?" — top right */}
            {!showRegister && (
                <button
                    onClick={openRegister}
                    className="absolute top-6 right-6 z-20 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-primary/40 hover:bg-primary/10 transition-all text-sm font-medium backdrop-blur-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Nu ai cont?
                </button>
            )}

            {/* ==================== LOGIN CARD ==================== */}
            {!showRegister && (
                <div className="glass-panel rounded-2xl p-10 w-full max-w-md relative z-10 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="size-16 bg-gradient-to-br from-primary to-purple-800 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
                            <span className="material-symbols-outlined text-white text-4xl">diamond</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">AerYan</h1>
                        <p className="text-slate-400 text-sm mt-1">Autentificare în platformă</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="email@aeryan.ro"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Parolă</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
                                <input
                                    type="password"
                                    value={parola}
                                    onChange={(e) => setParola(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-primary to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
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
                </div>
            )}

            {/* ==================== REGISTER CARD ==================== */}
            {showRegister && (
                <div className="glass-panel rounded-2xl p-10 w-full max-w-lg relative z-10 shadow-2xl animate-[scaleIn_0.25s_ease-out]">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="size-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
                            <span className="material-symbols-outlined text-white text-3xl">person_add</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Creare Cont Nou</h1>
                        <p className="text-slate-400 text-sm mt-1">Completează datele pentru a deveni client AerYan</p>
                    </div>

                    {/* Errors */}
                    {(error || regError) && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {regError || error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        {/* Nume + Prenume */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nume *</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">badge</span>
                                    <input type="text" value={regForm.nume} onChange={e => setRegForm(f => ({ ...f, nume: e.target.value }))} required
                                        placeholder="Popescu"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Prenume *</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">person</span>
                                    <input type="text" value={regForm.prenume} onChange={e => setRegForm(f => ({ ...f, prenume: e.target.value }))} required
                                        placeholder="Ion"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email *</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">mail</span>
                                <input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} required
                                    placeholder="ion.popescu@email.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                            </div>
                        </div>

                        {/* Telefon */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Telefon</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">phone</span>
                                <input type="tel" value={regForm.telefon} onChange={e => setRegForm(f => ({ ...f, telefon: e.target.value }))}
                                    placeholder="07XX XXX XXX"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                            </div>
                        </div>

                        {/* Parola + Confirmare */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Parolă *</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">lock</span>
                                    <input type="password" value={regForm.parola} onChange={e => setRegForm(f => ({ ...f, parola: e.target.value }))} required
                                        placeholder="Min. 6 caractere"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirmă Parola *</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">lock_reset</span>
                                    <input type="password" value={regForm.parolaConfirm} onChange={e => setRegForm(f => ({ ...f, parolaConfirm: e.target.value }))} required
                                        placeholder="Repetă parola"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center justify-between pt-2">
                            <button type="button" onClick={closeRegister}
                                className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                Anulează
                            </button>
                            <button type="submit" disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Se creează...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                                        Confirmă & Creează Cont
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default LoginForm;
