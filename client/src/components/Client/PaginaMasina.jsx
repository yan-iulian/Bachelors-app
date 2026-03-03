import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../../config/apiHelper';
import API_URL from '../../config/api';

const combustibilMap = { 0: 'Benzină', 1: 'Diesel', 2: 'Hibrid', 3: 'Electric' };
const categorieMap = { 0: 'Sedan', 1: 'SUV', 2: 'Coupe', 3: 'Hatchback', 4: 'Cabrio', 5: 'Break' };

const computeAiMatch = (m) => {
    const scores = [m.scorViteza, m.scorConfort, m.scorConsum, m.scorManevrabilitate, m.scorPret,
    m.scorDesignInterior, m.scorDesignExterior, m.scorSpatiu, m.scorAcceleratieCuplu, m.scorFrana];
    const valid = scores.filter(s => s != null);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length * 10);
};

const getImagine = (m) => m.imaginePrincipala
    ? `${API_URL}${m.imaginePrincipala}`
    : `https://placehold.co/1200x800/2e2249/895af6?text=${encodeURIComponent(m.marca + ' ' + m.model)}`;

const getRadarScores = (m) => ({
    viteza: Math.round(((m.scorViteza || 0) + (m.scorAcceleratieCuplu || 0)) / 2 * 10),
    design: Math.round(((m.scorDesignInterior || 0) + (m.scorDesignExterior || 0)) / 2 * 10),
    pret: Math.round((m.scorPret || 0) * 10),
    consum: Math.round((m.scorConsum || 0) * 10),
    confort: Math.round((m.scorConfort || 0) * 10),
});

function PaginaMasina() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();

    const [masina, setMasina] = useState(null);
    const [masiniSimilare, setMasiniSimilare] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [currentThumb, setCurrentThumb] = useState(0);
    const [inWishlist, setInWishlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wishlist') || '[]').includes(Number(id)); } catch { return false; }
    });
    const [showTestDrive, setShowTestDrive] = useState(searchParams.get('testdrive') === '1');
    const [showDiscount, setShowDiscount] = useState(false);
    const [showPDF, setShowPDF] = useState(false);
    const [tdForm, setTdForm] = useState({ data: '', ora: '', telefon: '', note: '' });
    const [discForm, setDiscForm] = useState({ pretDorit: '', motiv: '' });
    const [tdSubmitted, setTdSubmitted] = useState(false);
    const [discSubmitted, setDiscSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [showCumpara, setShowCumpara] = useState(false);
    const [tipPlata, setTipPlata] = useState('Cash');
    const [cumparaSubmitted, setCumparaSubmitted] = useState(false);
    const [cumparaStep, setCumparaStep] = useState(1); // 1 = select payment, 2 = warning confirm

    useEffect(() => {
        if (showTestDrive || showDiscount || showPDF || showCumpara) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [showTestDrive, showDiscount, showPDF, showCumpara]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [car, allCars] = await Promise.all([
                    apiGet(`/api/masini/${id}`),
                    apiGet('/api/masini'),
                ]);

                // Enrich car data
                car.aiMatch = computeAiMatch(car);
                car.imagine = getImagine(car);
                car.radarScores = getRadarScores(car);
                car.combustibilText = combustibilMap[car.combustibil] || '—';
                car.categorieText = categorieMap[car.categorieAuto] || '—';

                setMasina(car);

                // Similar cars (same category or brand, excluding current)
                const similar = allCars
                    .filter(m => m.idMasina !== car.idMasina)
                    .map(m => ({
                        ...m,
                        aiMatch: computeAiMatch(m),
                        imagine: getImagine(m),
                        combustibilText: combustibilMap[m.combustibil] || '—',
                    }))
                    .sort((a, b) => {
                        const aScore = (a.categorieAuto === car.categorieAuto ? 10 : 0) + (a.marca === car.marca ? 5 : 0);
                        const bScore = (b.categorieAuto === car.categorieAuto ? 10 : 0) + (b.marca === car.marca ? 5 : 0);
                        return bScore - aScore;
                    })
                    .slice(0, 4);
                setMasiniSimilare(similar);
            } catch (err) {
                setError(err.message || 'Eroare la încărcarea detaliilor mașinii');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // Save this car to "recently viewed" list in localStorage
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('recentlyViewedCars') || '[]');
            const carId = Number(id);
            // Remove if already exists, then prepend
            const updated = [carId, ...stored.filter(x => x !== carId)].slice(0, 10);
            localStorage.setItem('recentlyViewedCars', JSON.stringify(updated));
        } catch { /* ignore */ }
    }, [id]);

    // Reset scroll & thumbnail when navigating between cars
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setCurrentThumb(0);
    }, [id]);

    const toggleWishlist = () => {
        try {
            const list = JSON.parse(localStorage.getItem('wishlist') || '[]');
            const carId = Number(id);
            const updated = list.includes(carId) ? list.filter(wId => wId !== carId) : [...list, carId];
            localStorage.setItem('wishlist', JSON.stringify(updated));
            setInWishlist(!inWishlist);
        } catch { /* ignore */ }
    };

    const handleDownloadPDF = () => setShowPDF(true);

    /* ---------- Generate professional PDF HTML ---------- */
    const generateFisaTehnica = () => {
        if (!masina) return '';
        const now = new Date();
        const dataGen = now.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const oraGen = now.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
        const pretFinal = masina.esteInPromotie && masina.pretPromotional ? masina.pretPromotional : masina.pretEuro;
        const economie = masina.pretEuro - pretFinal;
        const cutie = masina.cutieViteze === 0 ? 'Manuală' : 'Automată';

        return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Fișă Tehnică — ${masina.marca} ${masina.model}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;padding:40px 50px;background:#fff;font-size:14px;max-width:1000px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #895af6;padding-bottom:16px}
.logo{font-size:28px;font-weight:800;color:#895af6;letter-spacing:-1px}
.logo span{color:#1a1a2e}
.logo-sub{font-size:11px;color:#666;margin-top:2px}
.meta{text-align:right;font-size:11px;color:#666;line-height:1.8}
.doc-title{font-size:20px;font-weight:700;margin-bottom:4px;color:#1a1a2e}
.doc-sub{font-size:12px;color:#666;margin-bottom:20px}
.section{margin-bottom:22px}
.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#895af6;margin-bottom:10px;border-bottom:1px solid #e8e8ef;padding-bottom:4px}
.car-img{width:100%;max-width:420px;display:block;margin:0 auto 20px;border-radius:10px;border:2px solid #e8e8ef}
table.specs{width:100%;border-collapse:collapse;margin-top:6px;font-size:12px}
table.specs th{background:#895af6;color:#fff;padding:8px 12px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px}
table.specs td{padding:7px 12px;border-bottom:1px solid #e8e8ef}
table.specs td.label-cell{color:#666;width:42%;font-weight:500}
table.specs td.value-cell{font-weight:700;color:#1a1a2e}
table.specs tr:nth-child(even) td{background:#f8f7ff}
.price-box{display:flex;gap:16px;margin-top:12px}
.price-card{flex:1;background:#f4f0ff;border-radius:10px;padding:16px;text-align:center}
.price-card.main{background:#895af6}
.price-card .value{font-size:22px;font-weight:800;color:#895af6}
.price-card.main .value{color:#fff;font-size:26px}
.price-card .lbl{font-size:10px;color:#666;margin-top:2px;text-transform:uppercase;letter-spacing:1px}
.price-card.main .lbl{color:#e0d4ff}
.price-card.gold{background:#fffbeb;border:2px solid #D4AF37}
.price-card.gold .value{color:#D4AF37}
.desc-box{background:#f8f7ff;border-left:3px solid #895af6;padding:12px 16px;border-radius:0 6px 6px 0;font-size:13px;line-height:1.6;color:#333;margin-top:8px}
.stamp-area{display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;padding-top:18px;border-top:2px solid #e8e8ef}
.sig-block{min-width:160px}
.sig-block .sig-title{font-size:11px;color:#666;margin-bottom:6px}
.sig-block .sig-name{font-weight:700;font-size:13px;margin-bottom:2px}
.sig-block .sig-line{font-size:11px;color:#999;margin-top:6px}
.stamp-seal{width:110px;height:110px;position:relative;display:flex;align-items:center;justify-content:center}
.footer{margin-top:28px;padding-top:10px;border-top:1px solid #e8e8ef;font-size:10px;color:#999;text-align:center;line-height:1.6}
@media print{body{padding:16px}}
</style></head><body>
<div class="header">
  <div>
    <div class="logo">Aer<span>Yan</span></div>
    <div class="logo-sub">Auto Dealership — Fișă Tehnică Vehicul</div>
  </div>
  <div class="meta">
    <div>Nr. Document: <strong>FT-${String(masina.idMasina).padStart(4, '0')}</strong></div>
    <div>Data generării: ${dataGen}</div>
    <div>Ora: ${oraGen}</div>
  </div>
</div>

<div class="doc-title">Fișă Tehnică — ${masina.marca} ${masina.model}</div>
<div class="doc-sub">${masina.combustibilText} · ${masina.categorieText} · ${masina.anFabricatie} · ${Number(masina.km).toLocaleString()} km</div>

<img class="car-img" src="${masina.imagine}" alt="${masina.marca} ${masina.model}" />

<div class="section">
  <div class="section-title">Specificații Tehnice</div>
  <table class="specs">
    <tr><th colspan="2">Identificare</th><th colspan="2">Motor & Performanță</th></tr>
    <tr>
      <td class="label-cell">Marcă / Model</td><td class="value-cell">${masina.marca} ${masina.model}</td>
      <td class="label-cell">Combustibil</td><td class="value-cell">${masina.combustibilText}</td>
    </tr>
    <tr>
      <td class="label-cell">An fabricație</td><td class="value-cell">${masina.anFabricatie}</td>
      <td class="label-cell">Putere motor</td><td class="value-cell">${masina.putereMotor || '—'} CP</td>
    </tr>
    <tr>
      <td class="label-cell">Kilometraj</td><td class="value-cell">${Number(masina.km).toLocaleString()} km</td>
      <td class="label-cell">Capacitate cil.</td><td class="value-cell">${masina.capacitateCilindrica || '—'} cm³</td>
    </tr>
    <tr>
      <td class="label-cell">Categorie</td><td class="value-cell">${masina.categorieText}</td>
      <td class="label-cell">Cutie de viteze</td><td class="value-cell">${cutie}</td>
    </tr>
    <tr>
      <td class="label-cell">Culoare</td><td class="value-cell">${masina.culoare || '—'}</td>
      <td class="label-cell">Loc parcare</td><td class="value-cell">${masina.locParcare || '—'}</td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Preț</div>
  <div class="price-box">
    ${economie > 0 ? `
    <div class="price-card">
      <div class="value" style="text-decoration:line-through;color:#999">€${Number(masina.pretEuro).toLocaleString()}</div>
      <div class="lbl">Preț Inițial</div>
    </div>
    <div class="price-card gold">
      <div class="value">-€${economie.toLocaleString()}</div>
      <div class="lbl" style="color:#b8960f">Economie</div>
    </div>` : ''}
    <div class="price-card main">
      <div class="value">€${Number(pretFinal).toLocaleString()}</div>
      <div class="lbl">Preț Final</div>
    </div>
  </div>
</div>

${masina.descriere ? `
<div class="section">
  <div class="section-title">Descriere Vehicul</div>
  <div class="desc-box">${masina.descriere}</div>
</div>` : ''}

<div class="stamp-area">
  <div class="sig-block">
    <div class="sig-title">Client:</div>
    <div class="sig-name">_______________________</div>
    <div class="sig-line">Semnătură: _______________________</div>
    <div class="sig-line">Data: ${dataGen}</div>
  </div>

  <div class="stamp-seal">
    <svg viewBox="0 0 120 120" width="110" height="110">
      <circle cx="60" cy="60" r="54" fill="none" stroke="#895af6" stroke-width="3"/>
      <circle cx="60" cy="60" r="46" fill="none" stroke="#895af6" stroke-width="1.5" stroke-dasharray="4 3"/>
      <circle cx="60" cy="60" r="28" fill="none" stroke="#895af6" stroke-width="1"/>
      <line x1="32" y1="60" x2="88" y2="60" stroke="#895af6" stroke-width="0.8"/>
      <text x="60" y="56" text-anchor="middle" font-size="9" font-weight="800" fill="#895af6" font-family="Segoe UI,Arial">AERYAN</text>
      <text x="60" y="67" text-anchor="middle" font-size="6.5" font-weight="700" fill="#895af6" font-family="Segoe UI,Arial" letter-spacing="1">VERIFICAT</text>
      <defs><path id="topArc" d="M 14,60 a 46,46 0 0,1 92,0"/><path id="botArc" d="M 106,60 a 46,46 0 0,1 -92,0"/></defs>
      <text font-size="6" fill="#895af6" font-weight="600" font-family="Segoe UI,Arial" letter-spacing="2.5"><textPath href="#topArc" startOffset="50%" text-anchor="middle">AUTO DEALERSHIP</textPath></text>
      <text font-size="5.5" fill="#895af6" font-weight="600" font-family="Segoe UI,Arial" letter-spacing="2"><textPath href="#botArc" startOffset="50%" text-anchor="middle">★ DOCUMENT OFICIAL ★</textPath></text>
      <circle cx="60" cy="60" r="56" fill="none" stroke="#895af6" stroke-width="1" opacity="0.3"/>
    </svg>
  </div>

  <div class="sig-block" style="text-align:right">
    <div class="sig-title">Director AerYan:</div>
    <div class="sig-name">_______________________</div>
    <div class="sig-line">Semnătură: _______________________</div>
    <div class="sig-line">Data: ${dataGen}</div>
  </div>
</div>

<div class="footer">
  Document generat automat din platforma <strong>AerYan Auto Dealership</strong> — ${dataGen} ${oraGen}<br/>
  Fișă tehnică cu caracter informativ. Nu constituie ofertă comercială fermă. AerYan SRL — Toate drepturile rezervate.
</div>
</body></html>`;
    };

    const handlePrintPDF = () => {
        const html = generateFisaTehnica();
        if (!html) return;
        setShowPDF(false);
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 500);
    };

    const handleTestDriveSubmit = async () => {
        try {
            setSubmitError(null);
            const dataProgramata = tdForm.data && tdForm.ora ? `${tdForm.data}T${tdForm.ora}:00` : tdForm.data;
            await apiPost('/api/testdrive', {
                idMasina: masina.idMasina,
                dataProgramata,
            });
            setTdSubmitted(true);
        } catch (err) {
            setSubmitError(err.message || 'Eroare la trimiterea cererii');
        }
    };

    const handleDiscountSubmit = async () => {
        try {
            setSubmitError(null);
            const pretCurent = masina.esteInPromotie && masina.pretPromotional ? masina.pretPromotional : masina.pretEuro;
            const discountProcent = Math.round((1 - Number(discForm.pretDorit) / pretCurent) * 100);
            await apiPost('/api/discount', {
                idMasina: masina.idMasina,
                discountProcent: Math.max(0, Math.min(discountProcent, 100)),
                motivDiscount: discForm.motiv,
            });
            setDiscSubmitted(true);
        } catch (err) {
            setSubmitError(err.message || 'Eroare la trimiterea cererii');
        }
    };

    const handleCumparaSubmit = async () => {
        try {
            setSubmitError(null);
            const pretFinal = masina.esteInPromotie && masina.pretPromotional ? masina.pretPromotional : masina.pretEuro;
            await apiPost('/api/tranzactii', {
                idMasina: masina.idMasina,
                suma: pretFinal,
                tipPlata: tipPlata,
                tip: 'Vanzare',
            });
            setCumparaSubmitted(true);
            // Update car status in real-time
            setMasina(prev => ({ ...prev, status: 'Rezervat' }));
        } catch (err) {
            setSubmitError(err.message || 'Eroare la inițierea tranzacției');
            setCumparaStep(1); // go back to step 1 on error
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#895af6]/30 border-t-[#895af6] rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm">Se încarcă detaliile mașinii...</p>
                </div>
            </div>
        );
    }

    if (error || !masina) {
        return (
            <div className="flex flex-1 items-center justify-center min-h-[60vh]">
                <div className="glass-panel p-8 rounded-2xl text-center max-w-md">
                    <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error</span>
                    <p className="text-white font-semibold mb-2">Mașina nu a fost găsită</p>
                    <p className="text-gray-400 text-sm">{error || 'Verificați ID-ul mașinii.'}</p>
                    <button onClick={() => navigate('/client/catalog')} className="mt-4 px-6 py-2 rounded-xl bg-[#895af6] text-white font-semibold text-sm">Înapoi la Catalog</button>
                </div>
            </div>
        );
    }

    const economie = masina.pretEuro - (masina.pretPromotional || masina.pretEuro);
    const pretCurent = masina.esteInPromotie && masina.pretPromotional ? masina.pretPromotional : masina.pretEuro;

    // Radar chart points calculation (pentagon: 5 axes)
    const radarToPoints = (scores) => {
        const axes = [scores.viteza, scores.design, scores.pret, scores.consum, scores.confort];
        const cx = 50, cy = 50, r = 35;
        const angleStep = (2 * Math.PI) / 5;
        const startAngle = -Math.PI / 2;
        return axes.map((score, i) => {
            const angle = startAngle + i * angleStep;
            const scaledR = (score / 100) * r;
            const x = cx + scaledR * Math.cos(angle);
            const y = cy + scaledR * Math.sin(angle);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
    };

    const bgPentagonPoints = (() => {
        const cx = 50, cy = 50, r = 35;
        const angleStep = (2 * Math.PI) / 5;
        const startAngle = -Math.PI / 2;
        return Array.from({ length: 5 }, (_, i) => {
            const angle = startAngle + i * angleStep;
            return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
        }).join(' ');
    })();

    const innerPentagonPoints = (() => {
        const cx = 50, cy = 50, r = 20;
        const angleStep = (2 * Math.PI) / 5;
        const startAngle = -Math.PI / 2;
        return Array.from({ length: 5 }, (_, i) => {
            const angle = startAngle + i * angleStep;
            return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
        }).join(' ');
    })();

    const dataPoints = radarToPoints(masina.radarScores);

    // Radar data point coordinates for circles
    const radarPointCoords = (() => {
        const axes = [masina.radarScores.viteza, masina.radarScores.design, masina.radarScores.pret, masina.radarScores.consum, masina.radarScores.confort];
        const cx = 50, cy = 50, r = 35;
        const angleStep = (2 * Math.PI) / 5;
        const startAngle = -Math.PI / 2;
        return axes.map((score, i) => {
            const angle = startAngle + i * angleStep;
            const scaledR = (score / 100) * r;
            return { x: cx + scaledR * Math.cos(angle), y: cy + scaledR * Math.sin(angle) };
        });
    })();

    // AI progress circle
    const circumference = 2 * Math.PI * 45;
    const dashOffset = circumference - (masina.aiMatch / 100) * circumference;

    const specs = [
        { icon: 'speed', label: 'Rulaj', value: `${masina.km.toLocaleString()} km` },
        { icon: 'calendar_today', label: 'An Fabricație', value: masina.anFabricatie },
        { icon: 'local_gas_station', label: 'Combustibil', value: masina.combustibilText },
        { icon: 'settings', label: 'Categorie', value: masina.categorieText },
        { icon: 'bolt', label: 'Viteză (scor)', value: `${masina.scorViteza || '—'}/10` },
        { icon: 'airline_seat_recline_extra', label: 'Confort (scor)', value: `${masina.scorConfort || '—'}/10` },
        { icon: 'local_parking', label: 'Loc Parcare', value: masina.locParcare || '—' },
        { icon: 'fingerprint', label: 'ID', value: `#${masina.idMasina}` },
    ];

    const accordions = masina.descriere ? [
        { icon: 'description', title: 'Descriere Detaliată', items: [masina.descriere] },
    ] : [];

    const isIndisponibil = masina.status !== 'Disponibil';
    const statusBadge = {
        'Disponibil': { text: 'DISPONIBIL', color: '#10b981', bg: '' },
        'Rezervat': { text: 'REZERVAT', color: '#f59e0b', bg: 'bg-[#f59e0b]/10' },
        'Vandut': { text: 'VÂNDUT', color: '#ef4444', bg: 'bg-[#ef4444]/10' },
    }[masina.status] || { text: masina.status?.toUpperCase() || 'NECUNOSCUT', color: '#94a3b8', bg: '' };

    return (
        <main className="relative pb-20 overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative w-full h-[60vh] lg:h-[75vh] group">
                {(() => {
                    const allImages = (masina.imagini && masina.imagini.length > 0)
                        ? masina.imagini.map(img => `${API_URL}${img.caleFisier}`)
                        : [masina.imagine];
                    const heroImg = allImages[currentThumb] || allImages[0];
                    return (
                        <>
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                                style={{ backgroundImage: `url('${heroImg}')` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-[#151022] via-[#151022]/20 to-transparent"></div>
                            </div>

                            {/* Overlay Controls & Badges */}
                            <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-12 max-w-[1440px] mx-auto w-full">
                                {/* Top Badges */}
                                <div className="flex flex-wrap gap-3 mt-4">
                                    <div className={`glass-panel px-4 py-1.5 rounded-full flex items-center gap-2 border-l-4 ${statusBadge.bg}`} style={{ borderLeftColor: statusBadge.color }}>
                                        <span className="size-2 rounded-full animate-pulse" style={{ backgroundColor: statusBadge.color }}></span>
                                        <span className="text-xs font-bold tracking-wider text-white">{statusBadge.text}</span>
                                    </div>
                                    {masina.esteInPromotie && (
                                        <div className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2 border-l-4 border-l-[#fb7185] bg-[#fb7185]/10">
                                            <span className="text-xs font-bold tracking-wider text-[#fb7185]">PROMOȚIE -{Math.round((1 - masina.pretPromotional / masina.pretEuro) * 100)}%</span>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation Arrows */}
                                {allImages.length > 1 && (
                                    <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between pointer-events-none">
                                        <button onClick={() => setCurrentThumb((currentThumb - 1 + allImages.length) % allImages.length)}
                                            className="pointer-events-auto size-12 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-all transform hover:scale-105">
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>
                                        <button onClick={() => setCurrentThumb((currentThumb + 1) % allImages.length)}
                                            className="pointer-events-auto size-12 rounded-full glass-panel flex items-center justify-center hover:bg-white/10 transition-all transform hover:scale-105">
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                )}

                                {/* Bottom: Thumbnails */}
                                <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-6 w-full">
                                    <div className="hidden lg:flex gap-3 overflow-x-auto pb-2 scrollbar-hide max-w-2xl">
                                        {allImages.slice(0, 5).map((img, i) => (
                                            <div
                                                key={i}
                                                onClick={() => setCurrentThumb(i)}
                                                className={`w-24 h-16 rounded-lg bg-cover bg-center cursor-pointer transition-all border-2 ${currentThumb === i
                                                        ? 'border-[#895af6] shadow-lg shadow-[#895af6]/20 scale-105'
                                                        : 'border-white/20 opacity-60 hover:opacity-100'
                                                    }`}
                                                style={{ backgroundImage: `url('${img}')` }}
                                            ></div>
                                        ))}
                                        {allImages.length > 5 && (
                                            <div className="w-24 h-16 rounded-lg border border-white/20 flex items-center justify-center glass-panel cursor-pointer hover:bg-white/10 transition-colors">
                                                <span className="text-xs font-bold">+{allImages.length - 5}</span>
                                            </div>
                                        )}
                                    </div>
                                    {allImages.length > 1 && (
                                        <span className="text-xs text-slate-400 glass-panel px-3 py-1 rounded-full">
                                            {currentThumb + 1} / {allImages.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    );
                })()}
            </section>

            {/* Main Grid */}
            <div className="max-w-[1440px] mx-auto px-4 lg:px-12 mt-8 lg:-mt-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-8 flex flex-col gap-8">
                        {/* Title & Rating */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex text-[#D4AF37] text-sm">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <span key={i} className="material-symbols-outlined text-[18px]">
                                            {i < Math.floor(masina.aiMatch / 20) ? 'star' : (i < Math.ceil(masina.aiMatch / 20) ? 'star_half' : 'star_border')}
                                        </span>
                                    ))}
                                </div>
                                <span className="text-white/50 text-xs font-medium">(AI Score: {masina.aiMatch}%)</span>
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                                {masina.marca} {masina.model}
                            </h1>
                            <p className="text-xl text-[#895af6] font-medium">{masina.combustibilText} • {masina.categorieText} • {masina.anFabricatie}</p>
                        </div>

                        {/* Price Box */}
                        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-[#D4AF37]">
                            <div className="flex flex-col">
                                <span className="text-white/50 text-sm uppercase tracking-wider font-semibold mb-1">Preț Final</span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-4xl lg:text-5xl font-bold text-[#D4AF37]">€{pretCurent.toLocaleString()}</span>
                                    {masina.esteInPromotie && masina.pretPromotional && masina.pretPromotional < masina.pretEuro && (
                                        <span className="text-lg text-white/30 line-through decoration-white/30">€{masina.pretEuro.toLocaleString()}</span>
                                    )}
                                </div>
                                {economie > 0 && (
                                    <div className="mt-2 inline-flex">
                                        <span className="bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold px-2 py-1 rounded">Economisești €{economie.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-3 min-w-[200px]">
                                <button onClick={() => navigate('/client/simulare-credit', { state: { pretMasina: pretCurent, numeMasina: `${masina.marca} ${masina.model}` } })}
                                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors border border-white/10 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">calculate</span>
                                    Simulare Credit
                                </button>
                            </div>
                        </div>

                        {/* Specifications Grid */}
                        <div>
                            <h3 className="text-white/80 font-bold mb-4 uppercase tracking-widest text-xs">Specificații Tehnice</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {specs.map((spec, i) => (
                                    <div key={i} className="glass-panel p-4 rounded-xl flex flex-col items-start gap-3 hover:bg-white/5 transition-colors group cursor-default">
                                        <div className="p-2 rounded-lg bg-[#2e2249] text-[#895af6] group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined">{spec.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-white/40 text-xs font-medium">{spec.label}</p>
                                            <p className="text-white font-semibold">{spec.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="text-xl font-bold mb-3">Descriere Vehicul</h3>
                            <p className="text-white/70 leading-relaxed text-sm lg:text-base">
                                {masina.descriere}
                            </p>
                            <button className="mt-4 text-[#895af6] font-bold text-sm flex items-center gap-1 hover:text-[#7040d6] transition-colors">
                                Citește Mai Mult <span className="material-symbols-outlined text-[16px]">expand_more</span>
                            </button>
                        </div>

                        {/* Accordions */}
                        <div className="flex flex-col gap-3">
                            {accordions.map((acc, i) => (
                                <details key={i} className="group glass-panel rounded-xl overflow-hidden">
                                    <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-[#895af6]">{acc.icon}</span>
                                            <span className="font-bold">{acc.title}</span>
                                        </div>
                                        <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                                    </summary>
                                    <div className="p-4 pt-0 text-white/70 text-sm">
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            {acc.items.map((item, j) => (
                                                <li key={j}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* AI Match Card */}
                        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-20">
                                <span className="material-symbols-outlined text-6xl text-[#2DD4BF]">auto_awesome</span>
                            </div>
                            <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
                                <span className="size-2 rounded-full bg-[#2DD4BF] animate-pulse"></span>
                                AerYan AI Match
                            </h3>
                            <div className="flex flex-col items-center gap-6">
                                {/* Circular Progress */}
                                <div className="relative size-32 flex items-center justify-center">
                                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="45" fill="none" stroke="#2e2249" strokeWidth="8"></circle>
                                        <circle
                                            cx="50" cy="50" r="45" fill="none" stroke="#2dd4bf"
                                            strokeWidth="8" strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={dashOffset}
                                        ></circle>
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-3xl font-bold text-white">{masina.aiMatch}%</span>
                                        <span className="text-[10px] uppercase text-[#2DD4BF] tracking-wider font-semibold">Match</span>
                                    </div>
                                </div>

                                {/* Radar Chart */}
                                <div className="w-full h-40 relative flex items-center justify-center">
                                    <svg className="w-full h-full text-white/10 drop-shadow-lg" viewBox="0 0 100 100">
                                        <polygon points={bgPentagonPoints} fill="none" stroke="currentColor" strokeWidth="1"></polygon>
                                        <polygon points={innerPentagonPoints} fill="none" stroke="currentColor" strokeWidth="0.5"></polygon>
                                        <polygon points={dataPoints} fill="rgba(45, 212, 191, 0.2)" stroke="#2dd4bf" strokeWidth="2"></polygon>
                                        {radarPointCoords.map((p, i) => (
                                            <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2" fill="#2dd4bf"></circle>
                                        ))}
                                    </svg>
                                    {/* Labels */}
                                    <div className="absolute top-0 text-[10px] text-white/60">Viteză</div>
                                    <div className="absolute right-0 top-1/3 text-[10px] text-white/60">Design</div>
                                    <div className="absolute bottom-0 right-8 text-[10px] text-white/60">Preț</div>
                                    <div className="absolute bottom-0 left-8 text-[10px] text-white/60">Consum</div>
                                    <div className="absolute left-0 top-1/3 text-[10px] text-white/60">Confort</div>
                                </div>

                                <a onClick={() => navigate('/client/recomandare-ai')} className="text-xs text-[#2DD4BF] underline decoration-[#2DD4BF]/50 hover:text-white transition-colors cursor-pointer">
                                    Modifică Preferințele tale
                                </a>
                            </div>
                        </div>

                        {/* Action Stack */}
                        <div className="flex flex-col gap-3 sticky top-24">
                            {isIndisponibil && (
                                <div className={`w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold ${masina.status === 'Rezervat' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                                    }`}>
                                    <span className="material-symbols-outlined text-[18px]">{masina.status === 'Rezervat' ? 'lock' : 'block'}</span>
                                    {masina.status === 'Rezervat' ? 'Mașină Rezervată — Tranzacție în curs' : 'Mașină Vândută'}
                                </div>
                            )}
                            <button onClick={() => setShowTestDrive(true)} disabled={isIndisponibil}
                                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${isIndisponibil ? 'bg-slate-700 opacity-40 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-[#895af6] to-[#7040d6] hover:brightness-110 shadow-[#895af6]/25'
                                    }`}>
                                <span className="material-symbols-outlined">directions_car</span>
                                Solicită Test Drive
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={toggleWishlist}
                                    className={`py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${inWishlist
                                        ? 'bg-[#fb7185]/20 text-[#fb7185] border border-[#fb7185]/30'
                                        : 'bg-[#2e2249] hover:bg-[#3d2e5e] text-white'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{inWishlist ? 'favorite' : 'favorite_border'}</span>
                                    Wishlist
                                </button>
                                <button onClick={handleDownloadPDF} className="py-3 rounded-xl bg-[#2e2249] hover:bg-[#3d2e5e] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                                    Fișă PDF
                                </button>
                            </div>
                            <button onClick={() => setShowDiscount(true)} disabled={isIndisponibil}
                                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${isIndisponibil ? 'border border-slate-600 text-slate-600 opacity-40 cursor-not-allowed' : 'border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 text-[#D4AF37]'
                                    }`}>
                                <span className="material-symbols-outlined text-[18px]">sell</span>
                                Solicită Discount
                            </button>
                            <button onClick={() => setShowCumpara(true)} disabled={isIndisponibil}
                                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 ${isIndisponibil ? 'bg-slate-700 opacity-40 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-[#10b981] to-[#059669] hover:brightness-110 shadow-[#10b981]/25'
                                    }`}>
                                <span className="material-symbols-outlined">shopping_cart</span>
                                Cumpără Acum
                            </button>

                            {/* Contact Card */}
                            <div className="glass-panel p-4 rounded-xl mt-4 flex items-center gap-4">
                                <div
                                    className="size-12 rounded-full bg-cover bg-center border border-white/10"
                                    style={{ backgroundImage: `url('https://placehold.co/100x100/2e2249/895af6?text=AY')` }}
                                ></div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white">AerYan Showroom</p>
                                    <p className="text-xs text-[#10b981] flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-[#10b981]"></span> Online Acum
                                    </p>
                                </div>
                                <button className="size-10 rounded-full bg-[#10b981] text-white flex items-center justify-center shadow-lg shadow-[#10b981]/20 hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[20px]">chat</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Similar Cars Carousel */}
            <section className="max-w-[1440px] mx-auto px-4 lg:px-12 mt-16 lg:mt-24">
                <div className="mb-4">
                    <h2 className="text-2xl font-bold">Mașini Similare</h2>
                </div>
                <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory -mx-4 px-4 lg:px-0"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#895af6 transparent' }}>
                    {masiniSimilare.map(car => (
                        <div key={car.idMasina}
                            className="min-w-[200px] w-[200px] snap-start glass-panel rounded-xl overflow-hidden group hover:border-[#895af6]/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/client/masina/${car.idMasina}`)}>
                            <div
                                className="h-28 bg-cover bg-center"
                                style={{ backgroundImage: `url('${car.imagine}')` }}
                            ></div>
                            <div className="p-3">
                                <h4 className="font-bold text-white text-sm truncate">{car.marca} {car.model}</h4>
                                <p className="text-[11px] text-white/50 mb-2">{car.anFabricatie} • {car.km.toLocaleString()} km</p>
                                <span className="text-[#D4AF37] font-bold text-sm">€{(car.esteInPromotie ? car.pretPromotional : car.pretEuro).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ==================== Test Drive Modal ==================== */}
            {showTestDrive && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowTestDrive(false); setTdSubmitted(false); setTdForm({ data: '', ora: '', telefon: '', note: '' }); }}></div>
                    <div className="relative glass-panel rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                        {tdSubmitted ? (
                            <div className="p-10 flex flex-col items-center gap-5 text-center animate-[scaleIn_0.3s_ease-out]">
                                <div className="size-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-400 text-4xl">check_circle</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white">Cerere Trimisă!</h2>
                                <p className="text-slate-400 text-sm max-w-sm">Cererea ta de test drive a fost trimisă către Director. Vei primi o notificare când va fi aprobată.</p>
                                <button onClick={() => { setShowTestDrive(false); setTdSubmitted(false); setTdForm({ data: '', ora: '', telefon: '', note: '' }); }}
                                    className="px-8 py-3 rounded-xl bg-[#895af6] text-white font-bold text-sm hover:bg-[#7a4ae0] transition">Închide</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between p-6 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 bg-[#895af6]/20 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#895af6]">directions_car</span>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Programare Test Drive</h2>
                                            <p className="text-xs text-slate-400">{masina.marca} {masina.model}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowTestDrive(false)} className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
                                        <span className="material-symbols-outlined text-slate-400">close</span>
                                    </button>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="flex items-center gap-4 bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                        <div className="size-16 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${masina.imagine}')` }}></div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{masina.marca} {masina.model}</p>
                                            <p className="text-xs text-slate-400">{masina.combustibilText} · {masina.categorieText} · {masina.anFabricatie}</p>
                                            <p className="text-sm font-bold text-[#D4AF37] mt-1">€{pretCurent.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Data Programării *</label>
                                            <input type="date" value={tdForm.data} onChange={e => setTdForm(f => ({ ...f, data: e.target.value }))} min="2026-02-15"
                                                className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ora *</label>
                                            <select value={tdForm.ora} onChange={e => setTdForm(f => ({ ...f, ora: e.target.value }))}
                                                className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] outline-none transition">
                                                <option value="" className="bg-[#1e202d]">Selectează</option>
                                                {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(h => (
                                                    <option key={h} value={h} className="bg-[#1e202d]">{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Telefon Contact *</label>
                                        <input type="tel" value={tdForm.telefon} onChange={e => setTdForm(f => ({ ...f, telefon: e.target.value }))} placeholder="07XX XXX XXX"
                                            className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Note / Preferințe</label>
                                        <textarea value={tdForm.note} onChange={e => setTdForm(f => ({ ...f, note: e.target.value }))} rows={3}
                                            placeholder="Opțional – preferințe de traseu, întrebări..."
                                            className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#895af6] focus:border-[#895af6] placeholder-slate-600 outline-none transition resize-none" />
                                    </div>
                                    <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10 flex items-start gap-2">
                                        <span className="material-symbols-outlined text-amber-400 text-[16px] mt-0.5">info</span>
                                        <p className="text-xs text-amber-400/80">Se percepe o taxă de test drive de <strong>50 €</strong>, achitabilă la sediu în ziua programării.</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-6 border-t border-white/10">
                                    <button onClick={() => setShowTestDrive(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition">Anulează</button>
                                    <button onClick={handleTestDriveSubmit} disabled={!tdForm.data || !tdForm.ora || !tdForm.telefon}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#895af6] to-purple-700 text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Trimite Cerere
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== Discount Modal ==================== */}
            {showDiscount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowDiscount(false); setDiscSubmitted(false); setDiscForm({ pretDorit: '', motiv: '' }); }}></div>
                    <div className="relative glass-panel rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                        {discSubmitted ? (
                            <div className="p-10 flex flex-col items-center gap-5 text-center animate-[scaleIn_0.3s_ease-out]">
                                <div className="size-20 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#D4AF37] text-4xl">sell</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white">Cerere Trimisă!</h2>
                                <p className="text-slate-400 text-sm max-w-sm">Cererea ta de discount a fost trimisă către Director. Vei fi notificat cu decizia acestuia.</p>
                                <button onClick={() => { setShowDiscount(false); setDiscSubmitted(false); setDiscForm({ pretDorit: '', motiv: '' }); }}
                                    className="px-8 py-3 rounded-xl bg-[#D4AF37] text-[#151022] font-bold text-sm hover:bg-[#c9a432] transition">Închide</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between p-6 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#D4AF37]">sell</span>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Solicită Discount</h2>
                                            <p className="text-xs text-slate-400">{masina.marca} {masina.model}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowDiscount(false)} className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
                                        <span className="material-symbols-outlined text-slate-400">close</span>
                                    </button>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-xs text-slate-500">Preț Curent</span>
                                                <p className="text-2xl font-bold text-white font-mono flex items-baseline gap-2">
                                                    €{pretCurent.toLocaleString()}
                                                    {masina.esteInPromotie && <span className="text-sm text-white/30 line-through">€{masina.pretEuro.toLocaleString()}</span>}
                                                </p>
                                            </div>
                                            <div className="size-14 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${masina.imagine}')` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Prețul Dorit (€) *</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37] font-bold">€</span>
                                            <input type="number" value={discForm.pretDorit} onChange={e => setDiscForm(f => ({ ...f, pretDorit: e.target.value }))} placeholder={`Max ${pretCurent.toLocaleString()}`}
                                                className="w-full p-3 pl-8 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] placeholder-slate-600 outline-none transition font-mono" />
                                        </div>
                                        {discForm.pretDorit && Number(discForm.pretDorit) > 0 && Number(discForm.pretDorit) < pretCurent && (
                                            <p className="text-xs mt-2 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px] text-[#D4AF37]">trending_down</span>
                                                <span className="text-[#D4AF37]">Discount solicitat: €{(pretCurent - Number(discForm.pretDorit)).toLocaleString()} ({((pretCurent - Number(discForm.pretDorit)) / pretCurent * 100).toFixed(1)}%)</span>
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Motivul Cererii *</label>
                                        <textarea value={discForm.motiv} onChange={e => setDiscForm(f => ({ ...f, motiv: e.target.value }))} rows={3}
                                            placeholder="Ex: Client fidel, am mai achiziționat de la voi..."
                                            className="w-full p-3 text-sm text-white bg-white/5 border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37] placeholder-slate-600 outline-none transition resize-none" />
                                    </div>
                                    <div className="bg-white/[0.02] rounded-xl p-3 border border-white/5 flex items-start gap-2">
                                        <span className="material-symbols-outlined text-slate-500 text-[16px] mt-0.5">info</span>
                                        <p className="text-xs text-slate-500">Directorul va analiza cererea și va răspunde printr-o notificare. Prețul final este la latitudinea acestuia.</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-6 border-t border-white/10">
                                    <button onClick={() => setShowDiscount(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition">Anulează</button>
                                    <button onClick={handleDiscountSubmit} disabled={!discForm.pretDorit || !discForm.motiv.trim()}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#c9a432] text-[#151022] font-bold text-sm shadow-lg hover:shadow-[#D4AF37]/20 hover:scale-105 transition transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                        Trimite Cerere Discount
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== Purchase Modal ==================== */}
            {showCumpara && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowCumpara(false); setCumparaSubmitted(false); setTipPlata('Cash'); setCumparaStep(1); }}></div>
                    <div className="relative glass-panel rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                        {cumparaSubmitted ? (
                            <div className="p-10 flex flex-col items-center gap-5 text-center animate-[scaleIn_0.3s_ease-out]">
                                <div className="size-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-400 text-4xl">check_circle</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white">Cerere de Achiziție Trimisă!</h2>
                                <p className="text-slate-400 text-sm max-w-sm">Mașina a fost rezervată în numele tău. Directorul va analiza cererea și va aproba tranzacția.</p>
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 w-full">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Total</span>
                                        <span className="text-[#D4AF37] font-bold text-lg">€{pretCurent.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-slate-400">Metoda de plată</span>
                                        <span className="text-white font-medium">{tipPlata}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-slate-400">Status mașină</span>
                                        <span className="text-amber-400 font-bold">Rezervată</span>
                                    </div>
                                </div>
                                <button onClick={() => { setShowCumpara(false); setCumparaSubmitted(false); setTipPlata('Cash'); setCumparaStep(1); }}
                                    className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    Succes — Închide
                                </button>
                            </div>
                        ) : cumparaStep === 2 ? (
                            /* Step 2: Warning confirmation */
                            <div className="p-8 flex flex-col items-center gap-5 text-center">
                                <div className="size-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-400 text-4xl">warning</span>
                                </div>
                                <h2 className="text-xl font-bold text-white">Ești sigur că vrei să cumperi?</h2>
                                <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20 w-full text-left space-y-2">
                                    <p className="text-sm text-amber-300 font-medium flex items-start gap-2">
                                        <span className="material-symbols-outlined text-[16px] mt-0.5">directions_car</span>
                                        {masina.marca} {masina.model} — <span className="text-[#D4AF37] font-bold">€{pretCurent.toLocaleString()}</span>
                                    </p>
                                    <p className="text-sm text-amber-300 font-medium flex items-start gap-2">
                                        <span className="material-symbols-outlined text-[16px] mt-0.5">{tipPlata === 'Cash' ? 'payments' : tipPlata === 'Card' ? 'credit_card' : 'account_balance'}</span>
                                        Plata: {tipPlata}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-400">După confirmare, mașina va fi <strong className="text-amber-400">rezervată</strong> și nu va mai fi disponibilă altor clienți până la verdictul Directorului.</p>
                                {submitError && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 w-full">
                                        <span className="material-symbols-outlined text-red-400 text-[16px]">error</span>
                                        <p className="text-xs text-red-400">{submitError}</p>
                                    </div>
                                )}
                                <div className="flex gap-3 w-full">
                                    <button onClick={() => setCumparaStep(1)}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition">Înapoi</button>
                                    <button onClick={handleCumparaSubmit}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold text-sm shadow-lg hover:scale-105 transition transform flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                                        Confirmă Achiziția
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Step 1: Select payment method */
                            <>
                                <div className="flex items-center justify-between p-6 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 bg-[#10b981]/20 rounded-lg flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#10b981]">shopping_cart</span>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">Cumpără Mașina</h2>
                                            <p className="text-xs text-slate-400">{masina.marca} {masina.model}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowCumpara(false)} className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
                                        <span className="material-symbols-outlined text-slate-400">close</span>
                                    </button>
                                </div>
                                <div className="p-6 space-y-5">
                                    {/* Car Summary */}
                                    <div className="flex items-center gap-4 bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                        <div className="size-16 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundImage: `url('${masina.imagine}')` }}></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">{masina.marca} {masina.model}</p>
                                            <p className="text-xs text-slate-400">{masina.combustibilText} · {masina.categorieText} · {masina.anFabricatie}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{masina.km.toLocaleString()} km</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-[#D4AF37]">€{pretCurent.toLocaleString()}</p>
                                            {economie > 0 && <span className="text-[10px] text-emerald-400">-€{economie.toLocaleString()}</span>}
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Metodă de Plată</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { val: 'Cash', icon: 'payments', label: 'Cash' },
                                                { val: 'Card', icon: 'credit_card', label: 'Card' },
                                                { val: 'Rate', icon: 'account_balance', label: 'Rate' },
                                            ].map(opt => (
                                                <button key={opt.val} onClick={() => setTipPlata(opt.val)}
                                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${tipPlata === opt.val
                                                        ? 'bg-[#10b981]/10 border-[#10b981]/50 text-[#10b981] shadow-lg shadow-[#10b981]/10'
                                                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/5'
                                                        }`}>
                                                    <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                                                    <span className="text-xs font-bold">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Preț vehicul</span>
                                            <span className="text-white">€{masina.pretEuro.toLocaleString()}</span>
                                        </div>
                                        {economie > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Discount promoțional</span>
                                                <span className="text-emerald-400">-€{economie.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-white/10 pt-2 flex justify-between">
                                            <span className="text-white font-bold">Total de plată</span>
                                            <span className="text-[#D4AF37] font-bold text-xl">€{pretCurent.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-6 border-t border-white/10">
                                    <button onClick={() => setShowCumpara(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition">Anulează</button>
                                    <button onClick={() => setCumparaStep(2)}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold text-sm shadow-lg hover:shadow-[#10b981]/20 hover:scale-105 transition transform">
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                        Continuă
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== PDF Preview Modal ==================== */}
            {showPDF && masina && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPDF(false)}></div>
                    <div className="relative glass-panel rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-white/10 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-lg bg-[#895af6]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#895af6]">picture_as_pdf</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Fișă Tehnică</h2>
                                    <p className="text-xs text-slate-400">{masina.marca} {masina.model} · {masina.anFabricatie}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowPDF(false)} className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center transition">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>

                        {/* Document Preview — iframe renders the professional HTML */}
                        <div className="flex-1 overflow-hidden p-4 min-h-0">
                            <iframe
                                title="Previzualizare Fișă Tehnică"
                                className="w-full h-full rounded-xl border border-white/10 bg-white"
                                srcDoc={generateFisaTehnica()}
                                sandbox="allow-same-origin"
                            />
                        </div>

                        {/* Footer actions */}
                        <div className="flex items-center justify-between p-5 border-t border-white/10 shrink-0">
                            <button onClick={() => setShowPDF(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition">
                                Închide
                            </button>
                            <button onClick={handlePrintPDF}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#895af6] to-[#7040d6] text-white font-bold text-sm shadow-lg hover:shadow-[#895af6]/20 hover:scale-105 transition transform">
                                <span className="material-symbols-outlined text-[18px]">print</span>
                                Printează / Salvează PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default PaginaMasina;
