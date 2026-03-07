import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../config/apiHelper";
import API_URL from "../../config/api";

const combustibilMap = {
  0: "Benzină",
  1: "Diesel",
  2: "Hibrid",
  3: "Electric",
};

const computeAiMatch = (m) => {
  const scores = [
    m.scorViteza,
    m.scorConfort,
    m.scorConsum,
    m.scorManevrabilitate,
    m.scorPret,
    m.scorDesignInterior,
    m.scorDesignExterior,
    m.scorSpatiu,
    m.scorAcceleratieCuplu,
    m.scorFrana,
  ];
  const valid = scores.filter((s) => s != null);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10);
};
const formatKm = (km) =>
  km >= 1000 ? `${Math.round(km / 1000)}k km` : `${km} km`;

function WishlistMasini() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const ids = JSON.parse(localStorage.getItem("wishlist") || "[]");
      if (ids.length === 0) {
        setWishlist([]);
        setLoading(false);
        return;
      }
      const allMasini = await apiGet("/api/masini");
      const filtered = allMasini
        .filter((m) => ids.includes(m.idMasina))
        .map((m) => ({
          ...m,
          aiMatch: computeAiMatch(m),
          specs: `${combustibilMap[m.combustibil] || "—"} • ${m.anFabricatie} • ${formatKm(m.km)}`,
          imagine: m.imaginePrincipala
            ? `${API_URL}${m.imaginePrincipala}`
            : `https://placehold.co/600x400/2e2249/895af6?text=${encodeURIComponent(m.marca + " " + m.model)}`,
        }));
      setWishlist(filtered);
    } catch (err) {
      console.error("Eroare wishlist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const removeFromWishlist = (id) => {
    const ids = JSON.parse(localStorage.getItem("wishlist") || "[]");
    const updated = ids.filter((wId) => wId !== id);
    localStorage.setItem("wishlist", JSON.stringify(updated));
    setWishlist((prev) => prev.filter((m) => m.idMasina !== id));
  };

  const totalValue = wishlist.reduce(
    (sum, m) =>
      sum +
      (m.esteInPromotie && m.pretPromotional ? m.pretPromotional : m.pretEuro),
    0,
  );

  return (
    <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-[#fb7185] text-3xl">
              favorite
            </span>
            Wishlist-ul Meu
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {wishlist.length > 0
              ? `${wishlist.length} vehicul${wishlist.length > 1 ? "e" : ""} salvate • Valoare totală: €${totalValue.toLocaleString()}`
              : "Nu ai niciun vehicul salvat"}
          </p>
        </div>
        <button
          onClick={() => navigate("/client/catalog")}
          className="flex items-center gap-2 bg-[#895af6] hover:bg-[#7040d6] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-[#895af6]/20"
        >
          <span className="material-symbols-outlined text-[20px]">
            inventory_2
          </span>
          Explorează Catalogul
        </button>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-[#fb7185]">
            <span className="material-symbols-outlined">favorite</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{wishlist.length}</p>
            <p className="text-xs text-slate-400">Vehicule Salvate</p>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-[#D4AF37]">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              €{totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">Valoare Totală</p>
          </div>
        </div>
        {(() => {
          const promos = wishlist.filter(
            (m) => m.esteInPromotie && m.pretPromotional,
          );
          const totalEconomie = promos.reduce(
            (s, m) => s + (m.pretEuro - m.pretPromotional),
            0,
          );
          return (
            <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-white/5 flex items-center justify-center text-[#22c55e]">
                <span className="material-symbols-outlined">savings</span>
              </div>
              <div>
                <p
                  className={`text-2xl font-bold ${totalEconomie > 0 ? "text-[#22c55e]" : "text-white"}`}
                >
                  {totalEconomie > 0
                    ? `−€${totalEconomie.toLocaleString()}`
                    : "€0"}
                </p>
                <p className="text-xs text-slate-400">
                  Economie Promoții
                  {promos.length > 0 ? ` (${promos.length} oferte)` : ""}
                </p>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Empty State */}
      {wishlist.length === 0 && (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center text-center">
          <div className="size-20 rounded-full bg-[#fb7185]/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-[#fb7185]">
              heart_broken
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Wishlist-ul tău este gol
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md">
            Nu ai adăugat niciun vehicul în lista de favorite. Explorează
            catalogul nostru și salvează mașinile care te interesează!
          </p>
          <button
            onClick={() => navigate("/client/catalog")}
            className="flex items-center gap-2 bg-[#895af6] hover:bg-[#7040d6] text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-[#895af6]/20"
          >
            <span className="material-symbols-outlined">inventory_2</span>
            Explorează Catalogul
          </button>
        </div>
      )}

      {/* Wishlist Grid */}
      {wishlist.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {wishlist.map((masina) => {
            const pretAfisat =
              masina.esteInPromotie && masina.pretPromotional
                ? masina.pretPromotional
                : masina.pretEuro;

            return (
              <div
                key={masina.idMasina}
                className="group relative glass-panel rounded-2xl overflow-hidden hover:border-[#895af6]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(137,90,246,0.1)] flex flex-col"
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151022] to-transparent opacity-60 z-10"></div>
                  <img
                    alt={`${masina.marca} ${masina.model}`}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    src={masina.imagine}
                  />

                  {/* Status + Tags */}
                  <div className="absolute top-4 left-4 z-20 flex gap-2">
                    <span className="px-2.5 py-1 bg-green-500/90 backdrop-blur-sm text-[#151022] text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">
                      {masina.status}
                    </span>
                    {masina.esteInPromotie && (
                      <span className="px-2.5 py-1 bg-[#895af6]/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">
                        PROMO
                      </span>
                    )}
                  </div>

                  {/* Remove from Wishlist */}
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={() => removeFromWishlist(masina.idMasina)}
                      className="relative flex items-center justify-center size-10 bg-red-500/80 backdrop-blur-md rounded-full border border-red-400/30 hover:bg-red-600 transition-colors shadow-lg"
                      title="Elimină din Wishlist"
                    >
                      <span className="material-symbols-outlined text-white text-lg">
                        heart_broken
                      </span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 relative">
                  {/* AI Circle */}
                  <div className="absolute -top-6 right-5 z-20 bg-[#151022] rounded-full p-1 border border-white/10 shadow-xl">
                    <div
                      className="relative size-10 flex items-center justify-center rounded-full bg-[#151022]"
                      style={{
                        background: `conic-gradient(#2DD4BF ${masina.aiMatch}%, #334155 0)`,
                      }}
                    >
                      <div className="absolute inset-1 bg-[#151022] rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#2DD4BF]">
                          {masina.aiMatch}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white leading-tight mb-1">
                      {masina.marca} {masina.model}
                    </h3>
                    <p className="text-sm text-gray-400 font-light">
                      {masina.specs}
                    </p>
                  </div>

                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-2xl font-bold text-[#D4AF37]">
                      €{pretAfisat.toLocaleString()}
                    </span>
                    {masina.esteInPromotie && masina.pretPromotional && (
                      <span className="text-sm text-gray-500 line-through mb-1.5">
                        €{masina.pretEuro.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        navigate(`/client/masina/${masina.idMasina}`)
                      }
                      className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">
                        visibility
                      </span>
                      Detalii
                    </button>
                    <button className="py-2.5 px-4 rounded-xl bg-[#895af6] text-white text-sm font-bold shadow-[0_0_15px_rgba(137,90,246,0.4)] hover:shadow-[0_0_25px_rgba(137,90,246,0.6)] hover:bg-[#895af6]/90 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-lg">
                        speed
                      </span>
                      Test Drive
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default WishlistMasini;
