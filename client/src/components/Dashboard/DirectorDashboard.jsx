import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { apiGet } from "../../config/apiHelper";

function DirectorDashboard() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tranzactiiRecente, setTranzactiiRecente] = useState([]);
  const [cereriPendingList, setCereriPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientiModal, setShowClientiModal] = useState(false);
  const [clientiList, setClientiList] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsData, tranzactiiData, testDriveData, discountData] =
          await Promise.all([
            apiGet("/api/dashboard/stats"),
            apiGet("/api/tranzactii"),
            apiGet("/api/testdrive"),
            apiGet("/api/discount"),
          ]);
        setStats(statsData);
        setTranzactiiRecente(
          tranzactiiData.slice(0, 3).map((t) => ({
            vehicle: t.Masina ? `${t.Masina.marca} ${t.Masina.model}` : "—",
            client: t.clientTranzactie
              ? `${t.clientTranzactie.nume} ${t.clientTranzactie.prenume}`
              : "—",
            date: new Date(t.dataTranzactie).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            amount: `€${(t.suma || 0).toLocaleString()}`,
            status: t.status,
            statusColor:
              t.status === "Sold"
                ? "emerald"
                : t.status === "Cancelled"
                  ? "rose"
                  : "amber",
          })),
        );
        // Build real pending items for approval panel
        const pending = [];
        testDriveData
          .filter((td) => td.status === 0)
          .forEach((td) => {
            const client = td.client
              ? `${td.client.nume} ${td.client.prenume}`
              : "—";
            const masina = td.Masina
              ? `${td.Masina.marca} ${td.Masina.model}`
              : "—";
            pending.push({
              title: `Test Drive — ${masina}`,
              detail: `${client} • ${new Date(td.dataSolicitare).toLocaleDateString("ro-RO")}`,
              icon: "speed",
              type: "test-drive",
              link: "/director/test-drive",
            });
          });
        discountData
          .filter((d) => d.status === "Processing")
          .forEach((d) => {
            const client = d.clientTranzactie
              ? `${d.clientTranzactie.nume} ${d.clientTranzactie.prenume}`
              : "—";
            const masina = d.Masina
              ? `${d.Masina.marca} ${d.Masina.model}`
              : "—";
            pending.push({
              title: `Discount — ${masina}`,
              detail: `${client} • ${d.discountProcent || 0}%`,
              icon: "sell",
              type: "discount",
              link: "/director/discount",
            });
          });
        tranzactiiData
          .filter((t) => t.status === "Processing")
          .forEach((t) => {
            const client = t.clientTranzactie
              ? `${t.clientTranzactie.nume} ${t.clientTranzactie.prenume}`
              : "—";
            const masina = t.Masina
              ? `${t.Masina.marca} ${t.Masina.model}`
              : "—";
            pending.push({
              title: `Tranzacție — ${masina}`,
              detail: `${client} • €${(t.suma || 0).toLocaleString()}`,
              icon: "payments",
              type: "tranzactie",
              link: "/director/tranzactii",
            });
          });
        setCereriPendingList(pending);
      } catch (e) {
        console.error("Eroare la încărcarea dashboard:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Se încarcă dashboard-ul...</div>
      </div>
    );

  const totalVanzari = stats?.totalVanzari || 0;
  const masiniStoc = stats?.masiniStoc || 0;
  const masiniReparate = stats?.masiniReparate || 0;
  const cereriPending = stats?.cereriPending || 0;
  const clientiActivi = stats?.clientiActivi || 0;
  const vanzariFormatted =
    totalVanzari >= 1000000
      ? `€${(totalVanzari / 1000000).toFixed(1)}M`
      : totalVanzari >= 1000
        ? `€${(totalVanzari / 1000).toFixed(0)}K`
        : `€${totalVanzari}`;
  const vanzariLunare = stats?.vanzariLunare || [];
  const clientiRecenti = stats?.clientiRecenti || [];
  const currentYear = new Date().getFullYear();
  const monthNames = [
    "Ian",
    "Feb",
    "Mar",
    "Apr",
    "Mai",
    "Iun",
    "Iul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const maxVanzare = Math.max(...vanzariLunare.map((v) => v.total), 1);

  return (
    <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6">
      {/* KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Vânzări Luna */}
        <div className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-yellow-500">
              payments
            </span>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium">Vânzări Luna</p>
              <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">
                {vanzariFormatted}
              </h3>
            </div>
            <div className="flex items-center text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold">
              <span className="material-symbols-outlined text-sm mr-1">
                trending_up
              </span>
              {stats?.totalVanzari > 0 ? "Activ" : "—"}
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
        <div
          onClick={() => navigate("/director/masini")}
          className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-primary">
              directions_car
            </span>
          </div>
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-slate-400 text-sm font-medium">
                Mașini în Stoc
              </p>
              <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">
                {masiniStoc}
              </h3>
            </div>
            <div className="relative size-12 rounded-full border-4 border-slate-700 border-t-primary border-r-primary rotate-45"></div>
          </div>
          <div className="mt-auto">
            <p className="text-xs text-slate-400">
              <span className="text-primary font-bold">{masiniStoc}</span>{" "}
              mașini disponibile
            </p>
          </div>
        </div>

        {/* Metric 3: Cereri Pending */}
        <div className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 border-l-4 border-l-amber-500 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-amber-500">
              pending_actions
            </span>
          </div>
          <div>
            <p className="text-amber-200 text-sm font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse"></span>
              Cereri Pending
            </p>
            <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">
              {cereriPending}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button
              onClick={() => navigate("/director/test-drive")}
              className="text-xs px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/25 hover:border-amber-500/40 transition-all cursor-pointer"
            >
              {stats?.testDrivePending || 0} Test Drives
            </button>
            <button
              onClick={() => navigate("/director/discount")}
              className="text-xs px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20 hover:bg-purple-500/25 hover:border-purple-500/40 transition-all cursor-pointer"
            >
              {stats?.discountPending || 0} Discounturi
            </button>
            <button
              onClick={() => navigate("/director/tranzactii")}
              className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 hover:bg-blue-500/25 hover:border-blue-500/40 transition-all cursor-pointer"
            >
              {stats?.tranzactiiPending || 0} Tranzacții
            </button>
          </div>
        </div>

        {/* Metric 4: Conturi Clienți */}
        <div
          onClick={async () => {
            try {
              const data = await apiGet("/api/clienti");
              setClientiList(data);
              setShowClientiModal(true);
            } catch (e) {
              console.error(e);
            }
          }}
          className="glass-panel p-6 rounded-xl flex flex-col justify-between h-40 relative overflow-hidden group cursor-pointer hover:ring-1 hover:ring-teal-500/30 transition-all"
        >
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-teal-400">
              group
            </span>
          </div>
          <div>
            <p className="text-slate-400 text-sm font-medium">
              Conturi Clienți
            </p>
            <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">
              {clientiActivi}
            </h3>
          </div>
          <div className="flex -space-x-2 overflow-hidden mt-auto pl-1">
            {clientiRecenti.length > 0 ? (
              <>
                {clientiRecenti.map((c, i) => {
                  const colors = [
                    "bg-purple-600",
                    "bg-blue-600",
                    "bg-teal-600",
                    "bg-emerald-600",
                    "bg-indigo-600",
                  ];
                  const initials =
                    `${(c.nume || "")[0] || ""}${(c.prenume || "")[0] || ""}`.toUpperCase();
                  return (
                    <div
                      key={c.idUtilizator}
                      className={`inline-flex items-center justify-center size-8 rounded-full ring-2 ring-[#151022] ${colors[i % colors.length]} text-xs font-medium text-white`}
                      title={`${c.nume} ${c.prenume}`}
                    >
                      {initials}
                    </div>
                  );
                })}
                {clientiActivi > clientiRecenti.length && (
                  <div className="flex items-center justify-center size-8 rounded-full ring-2 ring-[#151022] bg-teal-900 text-xs font-medium text-teal-200">
                    +{clientiActivi - clientiRecenti.length}
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-500">Niciun client încă</span>
            )}
          </div>
        </div>
      </section>

      {/* Banner Mașini Reparate — gata de publicare */}
      {masiniReparate > 0 && (
        <div
          onClick={() =>
            navigate("/director/masini", { state: { filterReparat: true } })
          }
          className="glass-panel rounded-xl p-4 flex items-center justify-between gap-4 border border-teal-500/30 bg-teal-500/5 cursor-pointer hover:bg-teal-500/10 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-teal-500/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-teal-400 text-2xl">
                build_circle
              </span>
            </div>
            <div>
              <p className="text-white font-bold text-sm flex items-center gap-2">
                <span className="size-2 rounded-full bg-teal-400 animate-pulse" />
                {masiniReparate}{" "}
                {masiniReparate === 1
                  ? "mașină reparată așteaptă"
                  : "mașini reparate așteaptă"}{" "}
                publicarea în catalog
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                Verifică scorurile atribuite de mecanic și publică vehiculele
                disponibile pentru clienți
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-teal-400 text-xl group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </div>
      )}

      {/* Charts & Lists Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Area (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-lg font-bold">
              Vânzări {currentYear}
            </h2>
            <div className="text-xs text-slate-400">
              Total:{" "}
              <span className="text-primary font-bold">{vanzariFormatted}</span>{" "}
              din{" "}
              <span className="text-white font-bold">
                {vanzariLunare.reduce((a, v) => a + v.numar, 0)}
              </span>{" "}
              vânzări
            </div>
          </div>
          {/* Grid lines */}
          <div className="flex-1 w-full relative">
            <div
              className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-1"
              style={{ bottom: "40px" }}
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 w-full">
                  <span className="text-[9px] text-slate-600 w-8 text-right shrink-0">
                    €{((maxVanzare * (4 - i)) / 4 / 1000).toFixed(0)}K
                  </span>
                  <div className="flex-1 border-b border-white/[0.04]"></div>
                </div>
              ))}
              <div className="flex items-center gap-2 w-full">
                <span className="text-[9px] text-slate-600 w-8 text-right shrink-0">
                  €0
                </span>
                <div className="flex-1 border-b border-white/[0.06]"></div>
              </div>
            </div>
            {/* Bars */}
            <div
              className="relative flex items-end gap-2 px-10 pb-1"
              style={{ height: "300px" }}
            >
              {vanzariLunare.map((v, i) => {
                const barH =
                  maxVanzare > 0
                    ? Math.max(Math.round((v.total / maxVanzare) * 280), 6)
                    : 6;
                const currentMonth = new Date().getMonth();
                const isCurrentMonth = i === currentMonth;
                const hasSales = v.total > 0;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end group cursor-default relative"
                    style={{ height: "100%" }}
                  >
                    {/* Floating tooltip */}
                    {hasSales && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none group-hover:-translate-y-2">
                        <div className="bg-[#1e1636] border border-primary/30 rounded-lg px-2.5 py-1.5 shadow-xl shadow-primary/10 whitespace-nowrap">
                          <p className="text-[10px] text-white font-bold">
                            €{v.total.toLocaleString()}
                          </p>
                          <p className="text-[8px] text-slate-400">
                            {v.numar} vânzăr{v.numar === 1 ? "e" : "i"}
                          </p>
                        </div>
                        <div className="w-2 h-2 bg-[#1e1636] border-r border-b border-primary/30 rotate-45 mx-auto -mt-1"></div>
                      </div>
                    )}
                    {/* Bar */}
                    <div className="flex items-end justify-center w-full">
                      <div
                        className={`w-[65%] rounded-xl transition-all duration-500 relative overflow-hidden ${
                          isCurrentMonth
                            ? "shadow-[0_0_20px_rgba(137,90,246,0.4)] group-hover:shadow-[0_0_30px_rgba(137,90,246,0.6)]"
                            : hasSales
                              ? "group-hover:shadow-[0_0_15px_rgba(137,90,246,0.25)]"
                              : ""
                        }`}
                        style={{
                          height: `${barH}px`,
                          background: hasSales
                            ? isCurrentMonth
                              ? "linear-gradient(to top, #7c3aed, #a78bfa, #c4b5fd)"
                              : "linear-gradient(to top, #6d28d9, #895af6, #a78bfa)"
                            : "rgba(255,255,255,0.03)",
                          transform: "scaleY(1)",
                          transformOrigin: "bottom",
                        }}
                      >
                        {/* Glass shine effect */}
                        {hasSales && (
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.12] to-white/0 group-hover:via-white/20 transition-all duration-500"></div>
                        )}
                        {/* Top highlight */}
                        {hasSales && (
                          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-xl"></div>
                        )}
                      </div>
                    </div>
                    {/* Month label */}
                    <span
                      className={`text-[10px] mt-2 font-medium ${isCurrentMonth ? "text-primary font-bold" : hasSales ? "text-slate-400" : "text-slate-600"}`}
                    >
                      {monthNames[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Approvals List (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-xl flex flex-col overflow-hidden max-h-[340px]">
          <div className="p-6 pb-2 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-white text-lg font-bold">Cereri de Aprobare</h3>
            <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {cereriPendingList.length} Noi
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cereriPendingList.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">
                Nu există cereri în așteptare.
              </p>
            )}
            {cereriPendingList.map((item, i) => (
              <div
                key={i}
                className="bg-secondary/30 hover:bg-secondary/60 transition-colors p-3 rounded-lg flex items-center gap-3 border border-transparent hover:border-primary/30"
              >
                <div
                  className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === "discount"
                      ? "bg-gradient-to-br from-amber-500/20 to-amber-900/20"
                      : item.type === "tranzactie"
                        ? "bg-gradient-to-br from-emerald-500/20 to-emerald-900/20"
                        : "bg-gradient-to-br from-primary/30 to-purple-900/30"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      item.type === "discount"
                        ? "text-amber-400"
                        : item.type === "tranzactie"
                          ? "text-emerald-400"
                          : "text-primary"
                    }`}
                  >
                    {item.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-sm font-semibold truncate">
                    {item.title}
                  </h4>
                  <p className="text-slate-400 text-xs truncate">
                    {item.detail}
                  </p>
                </div>
                <button
                  onClick={() => navigate(item.link)}
                  className="bg-primary text-white p-2 rounded-lg hover:bg-primary/80 transition shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-[20px] block">
                    arrow_forward
                  </span>
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
            <Link
              to="/director/tranzactii"
              className="text-primary text-sm font-medium hover:text-primary/80"
            >
              View All
            </Link>
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
                  <tr
                    key={i}
                    className={`${i < 2 ? "border-b border-white/5" : ""} hover:bg-white/5 transition-colors`}
                  >
                    <td className="py-3 pl-2 flex items-center gap-3">
                      <div className="size-8 rounded bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-sm">
                          directions_car
                        </span>
                      </div>
                      <span className="text-white font-medium">
                        {tx.vehicle}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{tx.client}</td>
                    <td className="py-3 text-slate-400">{tx.date}</td>
                    <td
                      className={`py-3 font-medium ${tx.statusColor === "emerald" ? "text-emerald-400" : "text-white"}`}
                    >
                      {tx.amount}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${tx.statusColor}-500/10 text-${tx.statusColor}-400 border border-${tx.statusColor}-500/20`}
                      >
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
              {
                icon: "add_circle",
                label: "Adaugă Mașină",
                color: "text-primary",
                to: "/director/masini",
                state: { openAdd: true },
              },
              {
                icon: "assessment",
                label: "Rapoarte PDF",
                color: "text-teal-400",
                to: "/director/rapoarte",
              },
              {
                icon: "build",
                label: "Reparații",
                color: "text-amber-400",
                to: "/director/estimari",
              },
              {
                icon: "history",
                label: "Audit Log",
                color: "text-slate-400",
                to: "/director/audit-log",
              },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() =>
                  navigate(
                    action.to,
                    action.state ? { state: action.state } : undefined,
                  )
                }
                className="bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-transparent transition-all rounded-xl p-4 flex flex-col items-center justify-center gap-2 group"
              >
                <span
                  className={`material-symbols-outlined text-3xl ${action.color} group-hover:scale-110 transition-transform`}
                >
                  {action.icon}
                </span>
                <span className="text-white text-sm font-medium">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Modal Conturi Clienți */}
      {showClientiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowClientiModal(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative glass-panel rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden p-6 border border-white/10 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">
                  group
                </span>
                Conturi Clienți
                <span className="text-sm font-normal text-slate-400">
                  ({clientiList.length})
                </span>
              </h2>
              <button
                onClick={() => setShowClientiModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="bg-secondary/80 backdrop-blur text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Înregistrat</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clientiList.map((c) => {
                    const initials =
                      `${(c.nume || "")[0] || ""}${(c.prenume || "")[0] || ""}`.toUpperCase();
                    const colors = [
                      "bg-purple-600",
                      "bg-blue-600",
                      "bg-teal-600",
                      "bg-emerald-600",
                      "bg-indigo-600",
                    ];
                    const color = colors[c.idUtilizator % colors.length];
                    return (
                      <tr
                        key={c.idUtilizator}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`inline-flex items-center justify-center size-8 rounded-full ${color} text-xs font-medium text-white`}
                            >
                              {initials}
                            </div>
                            <span className="text-sm text-white font-medium">
                              {c.nume} {c.prenume}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-400">
                          {c.email}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-400">
                          {c.dataInregistrare
                            ? new Date(c.dataInregistrare).toLocaleDateString(
                                "ro-RO",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                              c.activ
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                            }`}
                          >
                            {c.activ ? "Activ" : "Inactiv"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {clientiList.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-500"
                      >
                        Niciun client înregistrat
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default DirectorDashboard;
