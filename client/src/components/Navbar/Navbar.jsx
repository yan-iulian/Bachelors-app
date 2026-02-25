import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { logout } from '../../store/authSlice';

function Navbar() {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    if (!user) return null;

    // Navigation links per role
    const navLinks = {
        Director: [
            { label: 'Dashboard', path: '/director', icon: 'dashboard' },
            { label: 'Mașini', path: '/director/masini', icon: 'directions_car' },
            { label: 'Tranzacții', path: '/director/tranzactii', icon: 'payments' },
            { label: 'Test Drive', path: '/director/test-drive', icon: 'speed' },
            { label: 'Discount', path: '/director/discount', icon: 'sell' },
            { label: 'Reparații', path: '/director/reparatii', icon: 'build' },
            { label: 'Estimări', path: '/director/estimari', icon: 'rate_review' },
            { label: 'Rapoarte', path: '/director/rapoarte', icon: 'picture_as_pdf' },
            { label: 'Notificări', path: '/director/notificari', icon: 'notifications' },
            { label: 'Audit Log', path: '/director/audit-log', icon: 'history' },
        ],
        Client: [
            { label: 'Home', path: '/client', icon: 'home' },
            { label: 'Catalog', path: '/client/catalog', icon: 'inventory_2' },
            { label: 'Wishlist', path: '/client/wishlist', icon: 'favorite' },
            { label: 'Credit', path: '/client/simulare-credit', icon: 'calculate' },
            { label: 'AI Match', path: '/client/recomandare-ai', icon: 'auto_awesome' },
        ],
        Mecanic: [
            { label: 'Reparații', path: '/mecanic/reparatii', icon: 'build' },
            { label: 'Workspace', path: '/mecanic', icon: 'construction' },
            { label: 'Piese', path: '/mecanic/piese', icon: 'inventory_2' },
            { label: 'Fișă PDF', path: '/mecanic/fisa-reparatie', icon: 'picture_as_pdf' },
        ],
    };

    const links = navLinks[user.rol] || [];
    const homePath = links.length > 0 ? links[0].path : '/';
    const subtitleMap = {
        Director: 'Dashboard Director',
        Client: 'Premium Client',
        Mecanic: 'Service & Reparații',
    };

    return (
        <header className="sticky top-0 z-50 glass-header">
            <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                {/* Left: Logo + Nav */}
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to={homePath} className="flex items-center gap-3 group">
                        <div className="size-10 bg-gradient-to-br from-primary to-purple-800 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-white text-2xl">diamond</span>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-white text-xl font-bold tracking-tight leading-none">AerYan</h1>
                            <span className="text-slate-400 text-xs font-medium tracking-widest uppercase">
                                {subtitleMap[user.rol]}
                            </span>
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {links.map((link) => {
                            const isActive = location.pathname === link.path;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-primary/15 text-primary shadow-sm'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right: User + Logout */}
                <div className="flex items-center gap-4">
                    {/* User Info + Dropdown */}
                    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-semibold text-white">{user.nume}</span>
                            <span className="text-xs text-slate-400">{user.rol}</span>
                        </div>

                        {/* Avatar */}
                        <div className="size-10 rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20">
                            {user.nume?.charAt(0)}
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="glass-card hover:bg-red-500/20 hover:border-red-500/30 transition-all size-10 rounded-full flex items-center justify-center group"
                            title="Logout"
                        >
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-red-400 text-[20px]">logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Navbar;
