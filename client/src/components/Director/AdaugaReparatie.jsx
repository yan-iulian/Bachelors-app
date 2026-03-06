import { useState, useEffect } from "react";
import { apiGet, apiPost, apiUpload } from "../../config/apiHelper";

// Maps
const combustibilMap = {
  0: "Benzină",
  1: "Diesel",
  2: "Hibrid",
  3: "Electric",
};
const categorieMap = {
  0: "Sedan",
  1: "SUV",
  2: "Coupe",
  3: "Hatchback",
  4: "Cabrio",
  5: "Break",
};
const prioritateMap = { HIGH: "Urgent", MEDIUM: "Mediu", LOW: "Scăzut" };

const statusLabels = {
  0: "În Așteptare",
  1: "Aprobat · În Lucru",
  2: "Finalizată",
  3: "Estimare Trimisă",
  4: "Estimare Respinsă",
};
const statusColors = {
  0: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  1: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  2: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  3: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  4: "bg-red-500/10 text-red-400 border-red-500/20",
};

const emptyForm = {
  marca: "",
  model: "",
  anFabricatie: 2024,
  km: "",
  combustibil: 0,
  categorieAuto: 4,
  nrInmatriculare: "",
  vin: "",
  locParcare: "",
  descriereProblema: "",
  prioritate: "MEDIUM",
  pretAchizitie: "",
  idMecanic: 1,
};

function AdaugaReparatie() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [istoric, setIstoric] = useState([]);
  const [mecaniciDisponibili, setMecaniciDisponibili] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [successAnim, setSuccessAnim] = useState(false);
  const [photos, setPhotos] = useState([]);

  const fetchData = async () => {
    try {
      const [reparatiiData, utilizatoriData] = await Promise.all([
        apiGet("/api/reparatii"),
        apiGet("/api/utilizatori"),
      ]);
      const mecanici = utilizatoriData.filter((u) => u.rol === "Mecanic");
      setMecaniciDisponibili(
        mecanici.map((m) => ({
          id: m.idUtilizator,
          nume: `${m.nume} ${m.prenume}`,
          specializare: "",
        })),
      );
      setIstoric(
        reparatiiData.map((r) => ({
          id: r.idReparatie,
          masina: r.Masina ? `${r.Masina.marca} ${r.Masina.model}` : "—",
          nrInmatriculare: r.Masina?.locParcare || "N/A",
          mecanic: r.mecanic ? `${r.mecanic.nume} ${r.mecanic.prenume}` : "—",
          dataTrimisa: r.dataInceput
            ? new Date(r.dataInceput).toISOString().split("T")[0]
            : "—",
          prioritate: "MEDIUM",
          pretAchizitie: r.cost || 0,
          status: r.statusReparatie,
        })),
      );
      if (mecanici.length > 0) {
        setFormData((prev) => ({
          ...prev,
          idMecanic: mecanici[0].idUtilizator,
        }));
      }
    } catch (e) {
      console.error("Eroare:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, rawValue) => {
    setFormData((prev) => ({
      ...prev,
      [field]: rawValue === "" ? "" : Number(rawValue),
    }));
  };

  const handleOpen = () => {
    setFormData(emptyForm);
    setPhotos([]);
    setSuccessAnim(false);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (
      !formData.marca.trim() ||
      !formData.model.trim() ||
      !formData.descriereProblema.trim()
    )
      return;
    try {
      const kmVal = formData.km === "" ? 0 : Number(formData.km);
      const pretVal =
        formData.pretAchizitie === "" ? 0 : Number(formData.pretAchizitie);
      const anVal =
        formData.anFabricatie === "" ? 2024 : Number(formData.anFabricatie);

      // Creează mașina cu status 'În service'
      const masinaNoua = await apiPost("/api/masini", {
        marca: formData.marca,
        model: formData.model,
        anFabricatie: anVal,
        km: kmVal,
        combustibil: formData.combustibil,
        pretEuro: pretVal,
        status: "În service",
        categorieAuto: formData.categorieAuto,
        locParcare: formData.locParcare || "N/A",
      });
      // Creează reparația
      const reparatieNoua = await apiPost("/api/reparatii", {
        idMasina: masinaNoua.idMasina,
        idMecanic: formData.idMecanic,
        descriereProblema: formData.descriereProblema,
        cost: pretVal,
        statusReparatie: 0,
      });
      // Upload poze reparație
      if (photos.length > 0) {
        const fd = new FormData();
        photos.forEach((f) => fd.append("imagini", f));
        await apiUpload(
          `/api/reparatii/${reparatieNoua.idReparatie}/imagini`,
          fd,
        );
      }
      // Notifică mecanicul
      await apiPost("/api/notificari", {
        tip: "status_schimbat",
        mesaj: `Director ți-a asignat o nouă reparație: ${formData.marca} ${formData.model} — ${formData.descriereProblema}`,
        idReparatie: reparatieNoua.idReparatie,
        destinatarRol: "Mecanic",
      });
      setSuccessAnim(true);
      const mecanic = mecaniciDisponibili.find(
        (m) => m.id === Number(formData.idMecanic),
      );
      setTimeout(async () => {
        await fetchData();
        setToast(`Reparație trimisă → ${mecanic?.nume || "Mecanic"}`);
        setTimeout(() => setToast(null), 3000);
        setShowModal(false);
        setSuccessAnim(false);
      }, 1500);
    } catch (e) {
      console.error("Eroare la trimiterea reparației:", e);
      setSuccessAnim(false);
      setToast(`Eroare: ${e.message || "Nu s-a putut trimite reparația"}`);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const stats = {
    total: istoric.length,
    trimise: istoric.filter((r) => r.status === 0).length,
    estimari: istoric.filter((r) => r.status === 3).length,
    aprobate: istoric.filter((r) => r.status === 1).length,
  };

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Se încarcă...</div>
      </div>
    );

  return (
    <main
      className="flex-1 max-w-[1600px] mx-auto w-full p-6 space-y-6"
      style={{ paddingTop: "6rem" }}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-[#895af6] text-3xl">
              add_circle
            </span>
            Adaugă Mașină la Reparat
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Trimite mașini către mecanic pentru evaluare și reparație
          </p>
        </div>
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform"
        >
          <span className="material-symbols-outlined">send</span>
          Trimite Reparație Nouă
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Trimise",
            val: stats.total,
            icon: "assignment",
            color: "text-[#895af6]",
            bg: "bg-[#895af6]/10",
          },
          {
            label: "Așteaptă Estimare",
            val: stats.trimise,
            icon: "schedule",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
          {
            label: "Estimări Primite",
            val: stats.estimari,
            icon: "rate_review",
            color: "text-[#895af6]",
            bg: "bg-[#895af6]/10",
          },
          {
            label: "Aprobate / Lucru",
            val: stats.aprobate,
            icon: "check_circle",
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
        ].map((k) => (
          <div
            key={k.label}
            className="glass-panel rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className={`${k.bg} size-11 rounded-lg flex items-center justify-center`}
            >
              <span className={`material-symbols-outlined ${k.color}`}>
                {k.icon}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{k.val}</p>
              <p className="text-xs text-slate-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Istoric Reparații Trimise ── */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">
              history
            </span>
            Istoric Reparații Trimise
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.03] border-b border-white/10">
              <tr>
                <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">
                  Mașină
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">
                  Nr. Înmtr.
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">
                  Mecanic
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">
                  Data
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">
                  Preț Achiziție
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">
                  Prioritate
                </th>
                <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {istoric.map((r) => {
                const pr =
                  r.prioritate === "HIGH"
                    ? "text-red-400 bg-red-500/10 border-red-500/20"
                    : r.prioritate === "MEDIUM"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-slate-400 bg-slate-500/10 border-slate-500/20";
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4 text-white font-medium">
                      {r.masina}
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono text-xs">
                      {r.nrInmatriculare}
                    </td>
                    <td className="px-5 py-4 text-slate-300">{r.mecanic}</td>
                    <td className="px-5 py-4 text-slate-400">
                      {r.dataTrimisa}
                    </td>
                    <td className="px-5 py-4 text-slate-300 font-mono">
                      {r.pretAchizitie?.toLocaleString()} €
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border ${pr}`}
                      >
                        {prioritateMap[r.prioritate]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColors[r.status]}`}
                      >
                        {statusLabels[r.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Modal — Formular Adaugă Reparație ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !successAnim && setShowModal(false)}
          ></div>
          <div className="relative glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
            {/* Success animation overlay */}
            {successAnim && (
              <div className="absolute inset-0 z-30 bg-[#151022]/95 flex flex-col items-center justify-center rounded-2xl">
                <div className="size-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 animate-[scaleIn_0.4s_ease-out]">
                  <span className="material-symbols-outlined text-emerald-400 text-6xl">
                    check_circle
                  </span>
                </div>
                <p className="text-xl font-bold text-white mb-1">
                  Reparație Trimisă!
                </p>
                <p className="text-sm text-slate-400">
                  Mecanicul a fost notificat — așteaptă estimarea costurilor
                </p>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#895af6]/20 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#895af6]">
                    build
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Adaugă Mașină la Reparat
                  </h2>
                  <p className="text-xs text-slate-400">
                    Completează datele mașinii — mecanicul va estima costul
                    reparației
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition"
              >
                <span className="material-symbols-outlined text-slate-400 hover:text-white">
                  close
                </span>
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Secțiune: Date Mașină */}
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#895af6]">
                    directions_car
                  </span>{" "}
                  Date Mașină
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Marca */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Marcă *
                    </label>
                    <input
                      type="text"
                      value={formData.marca}
                      onChange={(e) => handleChange("marca", e.target.value)}
                      placeholder="ex: BMW, Mercedes, Audi..."
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition"
                    />
                  </div>
                  {/* Model */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => handleChange("model", e.target.value)}
                      placeholder="ex: X5 M50i, S-Class..."
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition"
                    />
                  </div>
                  {/* An Fabricație */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      An Fabricație
                    </label>
                    <input
                      type="number"
                      value={formData.anFabricatie}
                      onChange={(e) =>
                        handleNumberChange("anFabricatie", e.target.value)
                      }
                      min={2000}
                      max={2026}
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition"
                    />
                  </div>
                  {/* Kilometraj */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Kilometraj (km)
                    </label>
                    <input
                      type="number"
                      value={formData.km}
                      onChange={(e) => handleNumberChange("km", e.target.value)}
                      min={0}
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition"
                    />
                  </div>
                  {/* Combustibil */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Combustibil
                    </label>
                    <select
                      value={formData.combustibil}
                      onChange={(e) =>
                        handleChange("combustibil", Number(e.target.value))
                      }
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition appearance-none"
                    >
                      {Object.entries(combustibilMap).map(([k, v]) => (
                        <option key={k} value={k} className="bg-[#1a1333]">
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Caroserie */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Tip Caroserie
                    </label>
                    <select
                      value={formData.categorieAuto}
                      onChange={(e) =>
                        handleChange("categorieAuto", Number(e.target.value))
                      }
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition appearance-none"
                    >
                      {Object.entries(categorieMap).map(([k, v]) => (
                        <option key={k} value={k} className="bg-[#1a1333]">
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Nr Înmatriculare */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Nr. Înmatriculare
                    </label>
                    <input
                      type="text"
                      value={formData.nrInmatriculare}
                      onChange={(e) =>
                        handleChange(
                          "nrInmatriculare",
                          e.target.value.toUpperCase(),
                        )
                      }
                      placeholder="ex: B-44-AER"
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition font-mono"
                    />
                  </div>
                  {/* VIN */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      VIN (Serie Șasiu)
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) =>
                        handleChange("vin", e.target.value.toUpperCase())
                      }
                      placeholder="ex: WBAX5M3G5N..."
                      maxLength={17}
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition font-mono"
                    />
                  </div>
                  {/* Loc Parcare */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Loc Parcare *
                    </label>
                    <input
                      type="text"
                      value={formData.locParcare}
                      onChange={(e) =>
                        handleChange("locParcare", e.target.value.toUpperCase())
                      }
                      placeholder="ex: A-12, B-03, Hala 2..."
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Secțiune: Detalii Reparație */}
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#895af6]">
                    build
                  </span>{" "}
                  Detalii Reparație
                </h3>
                <div className="space-y-4">
                  {/* Descriere Problemă */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Descriere Problemă *
                    </label>
                    <textarea
                      value={formData.descriereProblema}
                      onChange={(e) =>
                        handleChange("descriereProblema", e.target.value)
                      }
                      placeholder="Descrie problema constatată la mașină..."
                      rows={4}
                      className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition resize-none"
                    />
                  </div>

                  {/* Upload Poze Reparație */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      Poze Mașină *
                    </label>
                    <div
                      className="relative w-full p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-[#895af6]/40 transition cursor-pointer bg-white/[0.02]"
                      onClick={() =>
                        document.getElementById("photo-input").click()
                      }
                    >
                      <input
                        id="photo-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setPhotos((prev) => [...prev, ...files]);
                          e.target.value = "";
                        }}
                      />
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <span className="material-symbols-outlined text-3xl text-[#895af6]/60">
                          add_a_photo
                        </span>
                        <span className="text-xs">
                          Click pentru a adăuga poze (JPG, PNG, WebP)
                        </span>
                      </div>
                    </div>
                    {photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {photos.map((file, idx) => (
                          <div key={idx} className="relative group/photo">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Poza ${idx + 1}`}
                              className="size-20 object-cover rounded-lg border border-white/10"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotos((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                );
                              }}
                              className="absolute -top-1.5 -right-1.5 size-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition"
                            >
                              <span className="material-symbols-outlined text-white text-[12px]">
                                close
                              </span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Prioritate */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                        Prioritate
                      </label>
                      <div className="flex gap-2">
                        {[
                          {
                            val: "HIGH",
                            label: "Urgent",
                            color: "bg-red-500",
                            hoverBg: "hover:bg-red-500/20",
                          },
                          {
                            val: "MEDIUM",
                            label: "Mediu",
                            color: "bg-amber-500",
                            hoverBg: "hover:bg-amber-500/20",
                          },
                          {
                            val: "LOW",
                            label: "Scăzut",
                            color: "bg-slate-500",
                            hoverBg: "hover:bg-slate-500/20",
                          },
                        ].map((p) => (
                          <button
                            key={p.val}
                            type="button"
                            onClick={() => handleChange("prioritate", p.val)}
                            className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition border ${
                              formData.prioritate === p.val
                                ? `${p.color} text-white border-transparent shadow-sm`
                                : `bg-transparent text-slate-400 border-white/10 ${p.hoverBg}`
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preț Achiziție */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                        Preț Achiziție (€) *
                      </label>
                      <input
                        type="number"
                        value={formData.pretAchizitie}
                        onChange={(e) =>
                          handleNumberChange("pretAchizitie", e.target.value)
                        }
                        min={0}
                        className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition"
                      />
                    </div>

                    {/* Mecanic */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                        Asignează Mecanic
                      </label>
                      <select
                        value={formData.idMecanic}
                        onChange={(e) =>
                          handleChange("idMecanic", Number(e.target.value))
                        }
                        className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition appearance-none"
                      >
                        {mecaniciDisponibili.map((m) => (
                          <option
                            key={m.id}
                            value={m.id}
                            className="bg-[#1a1333]"
                          >
                            {m.nume} — {m.specializare}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-white/10">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  info
                </span>
                Mecanicul va fi notificat și va trimite o estimare a costurilor.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-sm font-medium transition"
                >
                  Anulează
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    !formData.marca.trim() ||
                    !formData.model.trim() ||
                    !formData.descriereProblema.trim() ||
                    !formData.locParcare.trim() ||
                    photos.length === 0 ||
                    formData.pretAchizitie === "" ||
                    Number(formData.pretAchizitie) <= 0
                  }
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="material-symbols-outlined">send</span>
                  Trimite către Mecanic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl shadow-emerald-500/20 animate-[slideUp_0.3s_ease-out]">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </main>
  );
}

export default AdaugaReparatie;
