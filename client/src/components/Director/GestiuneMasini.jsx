import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../config/apiHelper';

const combustibilMap = { 0: 'Benzină', 1: 'Diesel', 2: 'Electric', 3: 'Hibrid' };
const categorieMap = { 0: 'Sedan', 1: 'Hatchback', 2: 'Coupe', 3: 'Break', 4: 'SUV', 5: 'Cabrio', 6: 'Combi' };
const statusColors = {
    'Disponibil': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Rezervat': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Vandut': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'În service': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const emptyMasina = {
    marca: '', model: '', anFabricatie: 2024, km: 0, combustibil: 0,
    pretEuro: 0, status: 'Disponibil', categorieAuto: 0, locParcare: '',
    esteInPromotie: false, pretPromotional: null
};

function GestiuneMasini() {
    const [masini, setMasini] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('Toate');
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [editingMasina, setEditingMasina] = useState(null);
    const [formData, setFormData] = useState(emptyMasina);

    const fetchMasini = async () => {
        try {
            const data = await apiGet('/api/masini');
            setMasini(data);
        } catch (e) { console.error('Eroare la încărcarea mașinilor:', e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMasini(); }, []);

    // Filtrare
    const filteredMasini = masini.filter(m => {
        const matchSearch = `${m.marca} ${m.model} ${m.locParcare}`.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'Toate' || m.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const handleOpenAdd = () => {
        setEditingMasina(null);
        setFormData(emptyMasina);
        setShowModal(true);
    };

    const handleOpenEdit = (masina) => {
        setEditingMasina(masina);
        setFormData({ ...masina });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingMasina) {
                await apiPut(`/api/masini/${editingMasina.idMasina}`, formData);
            } else {
                await apiPost('/api/masini', formData);
            }
            await fetchMasini();
        } catch (e) { console.error('Eroare la salvare:', e); }
        setShowModal(false);
    };

    const handleDelete = async (id) => {
        try {
            await apiDelete(`/api/masini/${id}`);
            await fetchMasini();
        } catch (e) { console.error('Eroare la ștergere:', e); }
        setShowDeleteConfirm(null);
    };

    const stats = {
        total: masini.length,
        disponibile: masini.filter(m => m.status === 'Disponibil').length,
        rezervate: masini.filter(m => m.status === 'Rezervat').length,
        inService: masini.filter(m => m.status === 'În service').length,
    };

    if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-slate-400 text-lg">Se încarcă mașinile...</div></div>;

    return (
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gestiune Mașini</h1>
                    <p className="text-slate-400 text-sm mt-1">Administrează parcul auto — adaugă, editează sau șterge vehicule</p>
                </div>
                <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Adaugă Mașină
                </button>
            </div>

            {/* Stats mini */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Vehicule', value: stats.total, icon: 'directions_car', color: 'text-primary' },
                    { label: 'Disponibile', value: stats.disponibile, icon: 'check_circle', color: 'text-emerald-400' },
                    { label: 'Rezervate', value: stats.rezervate, icon: 'bookmark', color: 'text-amber-400' },
                    { label: 'În Service', value: stats.inService, icon: 'build', color: 'text-rose-400' },
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
            <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Caută după marcă, model sau loc parcare..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['Toate', 'Disponibil', 'Rezervat', 'În service'].map(s => (
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
            </div>

            {/* Tabel */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wider">
                                <th className="py-4 px-4 font-medium">ID</th>
                                <th className="py-4 px-4 font-medium">Vehicul</th>
                                <th className="py-4 px-4 font-medium">An</th>
                                <th className="py-4 px-4 font-medium">KM</th>
                                <th className="py-4 px-4 font-medium">Combustibil</th>
                                <th className="py-4 px-4 font-medium">Categorie</th>
                                <th className="py-4 px-4 font-medium">Preț</th>
                                <th className="py-4 px-4 font-medium">Loc Parcare</th>
                                <th className="py-4 px-4 font-medium">Status</th>
                                <th className="py-4 px-4 font-medium text-right">Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredMasini.map((m) => (
                                <tr key={m.idMasina} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">#{m.idMasina}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 rounded-lg bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-lg">directions_car</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">{m.marca} {m.model}</p>
                                                {m.esteInPromotie && (
                                                    <span className="text-xs text-amber-400 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs">local_offer</span>
                                                        Promoție
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-300">{m.anFabricatie}</td>
                                    <td className="py-3 px-4 text-slate-300">{m.km.toLocaleString()} km</td>
                                    <td className="py-3 px-4 text-slate-300">{combustibilMap[m.combustibil]}</td>
                                    <td className="py-3 px-4 text-slate-300">{categorieMap[m.categorieAuto]}</td>
                                    <td className="py-3 px-4">
                                        {m.esteInPromotie && m.pretPromotional ? (
                                            <div>
                                                <span className="text-slate-500 line-through text-xs">€{m.pretEuro.toLocaleString()}</span>
                                                <span className="text-emerald-400 font-semibold ml-1">€{m.pretPromotional.toLocaleString()}</span>
                                            </div>
                                        ) : (
                                            <span className="text-white font-semibold">€{m.pretEuro.toLocaleString()}</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-300 font-mono text-xs">{m.locParcare}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[m.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleOpenEdit(m)} className="p-2 rounded-lg hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors" title="Editează">
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button onClick={() => setShowDeleteConfirm(m.idMasina)} className="p-2 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors" title="Șterge">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredMasini.length === 0 && (
                                <tr>
                                    <td colSpan="10" className="py-12 text-center text-slate-500">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
                                        Niciun vehicul găsit
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-white/5 px-4 py-3 flex justify-between items-center text-sm text-slate-400">
                    <span>{filteredMasini.length} din {masini.length} vehicule</span>
                </div>
            </div>

            {/* Modal Adaugă/Editează */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-white/10">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingMasina ? 'Editează Mașină' : 'Adaugă Mașină Nouă'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Marca */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Marca {editingMasina && <span className="text-slate-500 text-xs ml-1">(needitabil)</span>}</label>
                                <input type="text" value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                    disabled={!!editingMasina}
                                    className={`w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${editingMasina ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="ex: BMW" />
                            </div>
                            {/* Model */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Model {editingMasina && <span className="text-slate-500 text-xs ml-1">(needitabil)</span>}</label>
                                <input type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    disabled={!!editingMasina}
                                    className={`w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${editingMasina ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="ex: X5 xDrive40i" />
                            </div>
                            {/* An Fabricatie */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">An Fabricație {editingMasina && <span className="text-slate-500 text-xs ml-1">(needitabil)</span>}</label>
                                <input type="number" value={formData.anFabricatie} onChange={e => setFormData({ ...formData, anFabricatie: parseInt(e.target.value) || 0 })}
                                    disabled={!!editingMasina}
                                    className={`w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${editingMasina ? 'opacity-50 cursor-not-allowed' : ''}`} />
                            </div>
                            {/* Kilometraj */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Kilometraj {editingMasina && <span className="text-slate-500 text-xs ml-1">(needitabil)</span>}</label>
                                <input type="number" value={formData.km} onChange={e => setFormData({ ...formData, km: parseInt(e.target.value) || 0 })}
                                    disabled={!!editingMasina}
                                    className={`w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${editingMasina ? 'opacity-50 cursor-not-allowed' : ''}`} />
                            </div>
                            {/* Combustibil */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Combustibil {editingMasina && <span className="text-slate-500 text-xs ml-1">(needitabil)</span>}</label>
                                <select value={formData.combustibil} onChange={e => setFormData({ ...formData, combustibil: parseInt(e.target.value) })}
                                    disabled={!!editingMasina}
                                    className={`w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${editingMasina ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {Object.entries(combustibilMap).map(([k, v]) => <option key={k} value={k} className="bg-[#1e2030]">{v}</option>)}
                                </select>
                            </div>
                            {/* Categorie */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Categorie {editingMasina && <span className="text-slate-500 text-xs ml-1">(needitabil)</span>}</label>
                                <select value={formData.categorieAuto} onChange={e => setFormData({ ...formData, categorieAuto: parseInt(e.target.value) })}
                                    disabled={!!editingMasina}
                                    className={`w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${editingMasina ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {Object.entries(categorieMap).map(([k, v]) => <option key={k} value={k} className="bg-[#1e2030]">{v}</option>)}
                                </select>
                            </div>
                            {/* Pret */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Preț (€)</label>
                                <input type="number" value={formData.pretEuro} onChange={e => setFormData({ ...formData, pretEuro: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            {/* Loc Parcare */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Loc Parcare</label>
                                <input type="text" value={formData.locParcare} onChange={e => setFormData({ ...formData, locParcare: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" placeholder="ex: A-01" />
                            </div>
                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                                    {['Disponibil', 'Rezervat', 'Vandut', 'În service'].map(s => <option key={s} value={s} className="bg-[#1e2030]">{s}</option>)}
                                </select>
                            </div>
                            {/* Promotie */}
                            <div className="flex flex-col justify-end">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={formData.esteInPromotie}
                                        onChange={e => setFormData({ ...formData, esteInPromotie: e.target.checked, pretPromotional: e.target.checked ? formData.pretPromotional : null })}
                                        className="w-4 h-4 rounded bg-white/5 border-white/20 text-primary focus:ring-primary focus:ring-offset-0" />
                                    <span className="text-sm text-slate-300">Este în promoție</span>
                                </label>
                                {formData.esteInPromotie && (
                                    <input type="number" value={formData.pretPromotional || ''} onChange={e => setFormData({ ...formData, pretPromotional: parseFloat(e.target.value) || 0 })}
                                        className="mt-2 w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Preț promoțional (€)" />
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
                                Anulează
                            </button>
                            <button onClick={handleSave} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
                                {editingMasina ? 'Salvează Modificările' : 'Adaugă Mașină'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmare Ștergere */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
                    <div className="relative glass-panel rounded-2xl w-full max-w-md p-6 space-y-5 border border-white/10">
                        <div className="flex flex-col items-center text-center">
                            <div className="size-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-rose-400 text-3xl">warning</span>
                            </div>
                            <h3 className="text-lg font-bold text-white">Confirmare Ștergere</h3>
                            <p className="text-slate-400 text-sm mt-2">
                                Ești sigur că vrei să ștergi <span className="text-white font-medium">
                                    {masini.find(m => m.idMasina === showDeleteConfirm)?.marca} {masini.find(m => m.idMasina === showDeleteConfirm)?.model}
                                </span>? Acțiunea este irreversibilă.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
                                Anulează
                            </button>
                            <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 transition-colors">
                                Șterge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default GestiuneMasini;
