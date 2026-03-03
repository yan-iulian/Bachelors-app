import { Router } from 'express'
import { Op } from 'sequelize'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { authMiddleware, rolMiddleware } from '../middleware/index.js'
import db from '../models/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', 'public', 'images', 'masini')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        cb(null, `car_${req.params.id}_${Date.now()}${ext}`)
    }
})
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp']
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, allowed.includes(ext))
    }
})

const router = Router()

// Toate rutele API necesita autentificare
router.use(authMiddleware)

// ========== MASINI ==========

// GET /api/masini - Director vede toate, Client doar Disponibil
router.get('/masini', async (req, res) => {
    try {
        const where = req.user.rol === 'Director' ? {} : { status: 'Disponibil' }
        const masini = await db.Masina.findAll({
            where,
            include: [{ model: db.ImagineMasina, as: 'imagini', order: [['ordine', 'ASC']] }],
            order: [['idMasina', 'DESC']]
        })
        res.json(masini)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea catalogului' })
    }
})

// GET /api/masini/:id - Detalii masina
router.get('/masini/:id', async (req, res) => {
    try {
        const masina = await db.Masina.findByPk(req.params.id, {
            include: [{ model: db.ImagineMasina, as: 'imagini', order: [['ordine', 'ASC']] }]
        })
        if (!masina) {
            return res.status(404).json({ error: 'Mașina nu a fost găsită' })
        }
        res.json(masina)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea detaliilor' })
    }
})

// POST /api/masini/:id/imagini - Upload imagini (Director)
router.post('/masini/:id/imagini', rolMiddleware('Director'), upload.array('imagini', 10), async (req, res) => {
    try {
        const masina = await db.Masina.findByPk(req.params.id)
        if (!masina) return res.status(404).json({ error: 'Mașina nu a fost găsită' })

        const existente = await db.ImagineMasina.count({ where: { idMasina: masina.idMasina } })

        const imagini = await Promise.all(req.files.map((file, i) =>
            db.ImagineMasina.create({
                caleFisier: `/images/masini/${file.filename}`,
                esteHero: existente === 0 && i === 0,
                ordine: existente + i,
                idMasina: masina.idMasina
            })
        ))

        // Setează imaginePrincipală pe prima imagine dacă nu există
        if (!masina.imaginePrincipala && imagini.length > 0) {
            await masina.update({ imaginePrincipala: imagini[0].caleFisier })
        }

        await db.AuditLog.create({
            actiune: 'UPLOAD_IMAGINI',
            detalii: `${req.files.length} imagin${req.files.length === 1 ? 'e' : 'i'} încărcat${req.files.length === 1 ? 'ă' : 'e'} pentru ${masina.marca} ${masina.model}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })

        res.json(imagini)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea imaginilor' })
    }
})

// DELETE /api/masini/:id/imagini/:idImg - Sterge imagine (Director)
router.delete('/masini/:id/imagini/:idImg', rolMiddleware('Director'), async (req, res) => {
    try {
        const img = await db.ImagineMasina.findOne({
            where: { idImagine: req.params.idImg, idMasina: req.params.id }
        })
        if (!img) return res.status(404).json({ error: 'Imaginea nu a fost găsită' })

        // Șterge fișierul fizic
        const filePath = path.join(__dirname, '..', 'public', img.caleFisier)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

        await img.destroy()

        // Dacă era imaginea principală, setează următoarea
        const masina = await db.Masina.findByPk(req.params.id)
        if (masina && masina.imaginePrincipala === img.caleFisier) {
            const next = await db.ImagineMasina.findOne({
                where: { idMasina: req.params.id },
                order: [['ordine', 'ASC']]
            })
            await masina.update({ imaginePrincipala: next ? next.caleFisier : null })
        }

        res.json({ message: 'Imaginea a fost ștearsă' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la ștergerea imaginii' })
    }
})

// PUT /api/masini/:id/imagini/:idImg/hero - Setează imagine principală
router.put('/masini/:id/imagini/:idImg/hero', rolMiddleware('Director'), async (req, res) => {
    try {
        await db.ImagineMasina.update({ esteHero: false }, { where: { idMasina: req.params.id } })
        const img = await db.ImagineMasina.findOne({
            where: { idImagine: req.params.idImg, idMasina: req.params.id }
        })
        if (!img) return res.status(404).json({ error: 'Imaginea nu a fost găsită' })
        await img.update({ esteHero: true })

        const masina = await db.Masina.findByPk(req.params.id)
        if (masina) await masina.update({ imaginePrincipala: img.caleFisier })

        res.json({ message: 'Imagine principală actualizată' })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la setarea imaginii principale' })
    }
})

// POST /api/masini - Adauga masina (doar Director)
router.post('/masini', rolMiddleware('Director'), async (req, res) => {
    try {
        const masina = await db.Masina.create({
            ...req.body,
            idDirector: req.user.id
        })
        res.status(201).json(masina)

        await db.AuditLog.create({
            actiune: 'ADAUGARE_MASINA',
            detalii: `${masina.marca} ${masina.model} (${masina.anFabricatie}) adăugat în stoc. Preț: ${masina.pretEuro?.toLocaleString()}€. Loc: ${masina.locatie || '—'}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la adăugarea mașinii' })
    }
})

// PUT /api/masini/:id - Editare masina (doar Director)
router.put('/masini/:id', rolMiddleware('Director'), async (req, res) => {
    try {
        const masina = await db.Masina.findByPk(req.params.id)
        if (!masina) {
            return res.status(404).json({ error: 'Mașina nu a fost găsită' })
        }

        const pretVechi = masina.pretEuro
        const pretNou = req.body.pretEuro

        // Dacă prețul scade → promoție automată
        if (pretNou && pretNou < pretVechi) {
            req.body.esteInPromotie = true
            req.body.pretPromotional = pretNou
            req.body.pretEuro = pretVechi // păstrăm prețul original
        }
        // Dacă prețul crește sau rămâne la fel → nu e promoție
        else if (pretNou && pretNou >= pretVechi) {
            req.body.esteInPromotie = false
            req.body.pretPromotional = null
        }

        await masina.update(req.body)
        res.json(masina)

        const actiune = (pretNou && pretNou < pretVechi) ? 'PROMOTIE_MASINA' : 'EDITARE_MASINA'
        const detaliiExtra = (pretNou && pretNou < pretVechi)
            ? ` Promoție: ${pretVechi.toLocaleString()}€ → ${pretNou.toLocaleString()}€.`
            : (pretNou && pretNou > pretVechi) ? ` Preț: ${pretVechi.toLocaleString()}€ → ${pretNou.toLocaleString()}€.` : ''

        await db.AuditLog.create({
            actiune,
            detalii: `${masina.marca} ${masina.model} (${masina.anFabricatie}) a fost actualizat.${detaliiExtra}`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la actualizarea mașinii' })
    }
})

// DELETE /api/masini/:id - Sterge masina (doar Director)
router.delete('/masini/:id', rolMiddleware('Director'), async (req, res) => {
    try {
        const masina = await db.Masina.findByPk(req.params.id)
        if (!masina) {
            return res.status(404).json({ error: 'Mașina nu a fost găsită' })
        }
        const info = `${masina.marca} ${masina.model} (${masina.anFabricatie})`
        await masina.destroy()
        res.json({ message: 'Mașina a fost ștearsă' })

        await db.AuditLog.create({
            actiune: 'STERGERE_MASINA',
            detalii: `${info} a fost ștearsă din stoc.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la ștergerea mașinii' })
    }
})

// ========== TEST DRIVE ==========

// POST /api/testdrive - Solicita test drive (doar Client)
router.post('/testdrive', rolMiddleware('Client'), async (req, res) => {
    try {
        const testDrive = await db.TestDrive.create({
            ...req.body,
            idClient: req.user.id,
            status: 0
        })
        res.status(201).json(testDrive)

        const masina = await db.Masina.findByPk(req.body.idMasina)
        await db.AuditLog.create({
            actiune: 'SOLICITARE_TEST_DRIVE',
            detalii: `${req.user.nume} ${req.user.prenume} a solicitat test drive: ${masina ? masina.marca + ' ' + masina.model : 'ID ' + req.body.idMasina}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la solicitarea test drive-ului' })
    }
})

// GET /api/testdrive - Lista test drive-uri
router.get('/testdrive', async (req, res) => {
    try {
        let where = {}
        if (req.user.rol === 'Client') {
            where.idClient = req.user.id
        }
        const testDrives = await db.TestDrive.findAll({
            where,
            include: [
                { model: db.Masina },
                { model: db.Utilizator, as: 'client', attributes: ['nume', 'prenume', 'email'] }
            ],
            order: [['dataSolicitare', 'DESC']]
        })
        res.json(testDrives)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea test drive-urilor' })
    }
})

// PUT /api/testdrive/:id/aproba - Aproba test drive (doar Director)
router.put('/testdrive/:id/aproba', rolMiddleware('Director'), async (req, res) => {
    try {
        const td = await db.TestDrive.findByPk(req.params.id)
        if (!td) return res.status(404).json({ error: 'Test drive negăsit' })
        await td.update({
            status: 1,
            idDirector: req.user.id,
            dataProgramata: req.body.dataProgramata
        })
        const masina = await db.Masina.findByPk(td.idMasina)
        res.json(td)

        await db.AuditLog.create({
            actiune: 'APROBARE_TEST_DRIVE',
            detalii: `Director a aprobat test drive #${td.id} pentru ${masina ? masina.marca + ' ' + masina.model : '—'}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la aprobarea test drive-ului' })
    }
})

// PUT /api/testdrive/:id/respinge - Respinge test drive (doar Director)
router.put('/testdrive/:id/respinge', rolMiddleware('Director'), async (req, res) => {
    try {
        const td = await db.TestDrive.findByPk(req.params.id)
        if (!td) return res.status(404).json({ error: 'Test drive negăsit' })
        await td.update({
            status: 2,
            idDirector: req.user.id,
            motivRespingere: req.body.motivRespingere
        })
        const masina = await db.Masina.findByPk(td.idMasina)
        res.json(td)

        await db.AuditLog.create({
            actiune: 'RESPINGERE_TEST_DRIVE',
            detalii: `Director a respins test drive #${td.id} pentru ${masina ? masina.marca + ' ' + masina.model : '—'}. Motiv: ${req.body.motivRespingere || '—'}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la respingerea test drive-ului' })
    }
})

// PUT /api/testdrive/:id/efectuat - Marcheaza test drive ca efectuat
router.put('/testdrive/:id/efectuat', rolMiddleware('Director'), async (req, res) => {
    try {
        const td = await db.TestDrive.findByPk(req.params.id)
        if (!td) return res.status(404).json({ error: 'Test drive negăsit' })
        await td.update({ status: 3, idDirector: req.user.id })
        const masina = await db.Masina.findByPk(td.idMasina)
        res.json(td)

        await db.AuditLog.create({
            actiune: 'EFECTUARE_TEST_DRIVE',
            detalii: `Test drive #${td.id} marcat ca efectuat pentru ${masina ? masina.marca + ' ' + masina.model : '—'}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare' })
    }
})

// ========== TRANZACTII ==========

// POST /api/tranzactii - Initiaza tranzactie (doar Client)
router.post('/tranzactii', rolMiddleware('Client'), async (req, res) => {
    try {
        // Verifică dacă mașina este disponibilă
        const masina = await db.Masina.findByPk(req.body.idMasina)
        if (!masina) return res.status(404).json({ error: 'Mașina nu a fost găsită' })
        if (masina.status !== 'Disponibil') {
            return res.status(400).json({ error: `Mașina nu este disponibilă (status: ${masina.status})` })
        }

        const tranzactie = await db.Tranzactie.create({
            ...req.body,
            idClient: req.user.id,
            status: 'Processing'
        })

        // Blochează mașina — status Rezervat
        await masina.update({ status: 'Rezervat' })

        res.status(201).json(tranzactie)

        await db.AuditLog.create({
            actiune: 'INITIERE_TRANZACTIE',
            detalii: `${req.user.nume} ${req.user.prenume} a inițiat tranzacția pentru ${masina.marca} ${masina.model}. Sumă: ${req.body.suma?.toLocaleString()}€.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la inițierea tranzacției' })
    }
})

// GET /api/tranzactii - Lista tranzactii
router.get('/tranzactii', async (req, res) => {
    try {
        let where = {}
        if (req.user.rol === 'Client') {
            where.idClient = req.user.id
        }
        const tranzactii = await db.Tranzactie.findAll({
            where,
            include: [
                { model: db.Masina },
                { model: db.Utilizator, as: 'clientTranzactie', attributes: ['nume', 'prenume'] }
            ],
            order: [['dataTranzactie', 'DESC']]
        })
        res.json(tranzactii)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea tranzacțiilor' })
    }
})

// PUT /api/tranzactii/:id/aproba - Aproba tranzactie (doar Director)
router.put('/tranzactii/:id/aproba', rolMiddleware('Director'), async (req, res) => {
    try {
        const tr = await db.Tranzactie.findByPk(req.params.id)
        if (!tr) return res.status(404).json({ error: 'Tranzacție negăsită' })
        await tr.update({ status: 'Sold', idDirector: req.user.id })
        const masina = await db.Masina.findByPk(tr.idMasina)
        await db.Masina.update({ status: 'Vandut' }, { where: { idMasina: tr.idMasina } })
        res.json(tr)

        await db.AuditLog.create({
            actiune: 'APROBARE_TRANZACTIE',
            detalii: `Director a aprobat vânzarea ${masina ? masina.marca + ' ' + masina.model : '—'}. Sumă: ${tr.suma?.toLocaleString()}€.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la aprobarea tranzacției' })
    }
})

// PUT /api/tranzactii/:id/anuleaza - Anuleaza tranzactie (Director)
router.put('/tranzactii/:id/anuleaza', rolMiddleware('Director'), async (req, res) => {
    try {
        const tr = await db.Tranzactie.findByPk(req.params.id)
        if (!tr) return res.status(404).json({ error: 'Tranzacție negăsită' })
        await tr.update({ status: 'Cancelled', idDirector: req.user.id })
        const masina = await db.Masina.findByPk(tr.idMasina)
        await db.Masina.update({ status: 'Disponibil' }, { where: { idMasina: tr.idMasina } })
        res.json(tr)

        await db.AuditLog.create({
            actiune: 'ANULARE_TRANZACTIE',
            detalii: `Director a anulat tranzacția pentru ${masina ? masina.marca + ' ' + masina.model : '—'}. Sumă: ${tr.suma?.toLocaleString()}€.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la anularea tranzacției' })
    }
})

// ========== REPARATII ==========

// GET /api/reparatii - Lista reparatii
router.get('/reparatii', async (req, res) => {
    try {
        let where = {}
        if (req.user.rol === 'Mecanic') {
            where.idMecanic = req.user.id
        }
        const reparatii = await db.Reparatie.findAll({
            where,
            include: [
                { model: db.Masina },
                { model: db.Utilizator, as: 'mecanic', attributes: ['nume', 'prenume'] },
                { model: db.Piesa }
            ],
            order: [['dataInceput', 'DESC']]
        })
        res.json(reparatii)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea reparațiilor' })
    }
})

// POST /api/reparatii - Inregistreaza reparatie (Director)
router.post('/reparatii', rolMiddleware('Director'), async (req, res) => {
    try {
        const reparatie = await db.Reparatie.create(req.body)
        const masina = req.body.idMasina ? await db.Masina.findByPk(req.body.idMasina) : null
        res.status(201).json(reparatie)

        await db.AuditLog.create({
            actiune: 'INREGISTRARE_REPARATIE',
            detalii: `Reparație #${reparatie.idReparatie} înregistrată pentru ${masina ? masina.marca + ' ' + masina.model : '—'}. Problemă: ${req.body.descriereProblema || '—'}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la înregistrarea reparației' })
    }
})

// PUT /api/reparatii/:id - Actualizeaza reparatie (Mecanic)
router.put('/reparatii/:id', rolMiddleware('Mecanic', 'Director'), async (req, res) => {
    try {
        const reparatie = await db.Reparatie.findByPk(req.params.id)
        if (!reparatie) return res.status(404).json({ error: 'Reparație negăsită' })
        await reparatie.update(req.body)
        const masina = await db.Masina.findByPk(reparatie.idMasina)
        res.json(reparatie)

        await db.AuditLog.create({
            actiune: 'ACTUALIZARE_REPARATIE',
            detalii: `Reparație #${reparatie.idReparatie} actualizată (${masina ? masina.marca + ' ' + masina.model : '—'}). Cost: ${reparatie.cost}€. Status: ${reparatie.statusReparatie}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la actualizarea reparației' })
    }
})

// ========== PIESE ==========

// GET /api/piese - Lista piese
router.get('/piese', rolMiddleware('Mecanic', 'Director'), async (req, res) => {
    try {
        const piese = await db.Piesa.findAll({ order: [['denumire', 'ASC']] })
        res.json(piese)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea pieselor' })
    }
})

// PUT /api/piese/:id - Actualizeaza piesa (stoc, pret etc.)
router.put('/piese/:id', rolMiddleware('Mecanic', 'Director'), async (req, res) => {
    try {
        const piesa = await db.Piesa.findByPk(req.params.id)
        if (!piesa) return res.status(404).json({ error: 'Piesa nu a fost găsită' })
        await piesa.update(req.body)
        res.json(piesa)

        await db.AuditLog.create({
            actiune: 'ACTUALIZARE_PIESA',
            detalii: `Piesa "${piesa.denumire}" actualizată. Preț: ${piesa.pret}€. Stoc: ${piesa.stoc}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la actualizarea piesei' })
    }
})

// POST /api/reparatii/:id/piese - Adauga piese la reparatie
router.post('/reparatii/:id/piese', rolMiddleware('Mecanic', 'Director'), async (req, res) => {
    try {
        const reparatie = await db.Reparatie.findByPk(req.params.id)
        if (!reparatie) return res.status(404).json({ error: 'Reparație negăsită' })
        const { idPiesa } = req.body
        const piesa = await db.Piesa.findByPk(idPiesa)
        if (!piesa) return res.status(404).json({ error: 'Piesa nu a fost găsită' })
        await db.PiesaReparatie.create({ idPiesa, idReparatie: reparatie.idReparatie })
        res.status(201).json({ message: 'Piesă adăugată la reparație' })

        await db.AuditLog.create({
            actiune: 'COMANDA_PIESE',
            detalii: `Mecanic ${req.user.nume} ${req.user.prenume} a comandat piesa: ${piesa.denumire} + pentru reparația #${reparatie.idReparatie}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la adăugarea piesei la reparație' })
    }
})

// ========== UTILIZATORI (Director) ==========

// GET /api/utilizatori - Lista utilizatori activi
router.get('/utilizatori', rolMiddleware('Director'), async (req, res) => {
    try {
        const utilizatori = await db.Utilizator.findAll({
            attributes: { exclude: ['parola'] }
        })
        res.json(utilizatori)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea utilizatorilor' })
    }
})

// ========== CERERI DISCOUNT ==========

// POST /api/discount - Solicita discount (doar Client)
router.post('/discount', rolMiddleware('Client'), async (req, res) => {
    try {
        const { idMasina, discountProcent, motivDiscount } = req.body
        const masina = await db.Masina.findByPk(idMasina)
        if (!masina) return res.status(404).json({ error: 'Mașina nu a fost găsită' })

        const cerere = await db.Tranzactie.create({
            suma: masina.pretEuro,
            tipPlata: 'Nealocat',
            tip: 'Discount',
            discountProcent,
            motivDiscount,
            status: 'Processing',
            idClient: req.user.id,
            idMasina
        })
        res.status(201).json(cerere)

        await db.AuditLog.create({
            actiune: 'CERERE_DISCOUNT',
            detalii: `${req.user.nume} ${req.user.prenume} a solicitat discount ${discountProcent}% pentru ${masina.marca} ${masina.model}. Motiv: ${motivDiscount || '—'}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la solicitarea discount-ului' })
    }
})

// GET /api/discount - Lista cereri discount (Director vede toate, Client doar ale sale)
router.get('/discount', async (req, res) => {
    try {
        let where = { tip: 'Discount' }
        if (req.user.rol === 'Client') {
            where.idClient = req.user.id
        }
        const cereri = await db.Tranzactie.findAll({
            where,
            include: [
                { model: db.Masina },
                { model: db.Utilizator, as: 'clientTranzactie', attributes: ['nume', 'prenume', 'email'] }
            ],
            order: [['dataTranzactie', 'DESC']]
        })
        res.json(cereri)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea cererilor de discount' })
    }
})

// PUT /api/discount/:id/aproba - Aproba discount (Director)
router.put('/discount/:id/aproba', rolMiddleware('Director'), async (req, res) => {
    try {
        const cerere = await db.Tranzactie.findByPk(req.params.id)
        if (!cerere || cerere.tip !== 'Discount') {
            return res.status(404).json({ error: 'Cerere de discount negăsită' })
        }
        await cerere.update({ status: 'Approved', idDirector: req.user.id })

        // Discount-ul rămâne personal pe tranzacție — NU modificăm mașina
        const masina = await db.Masina.findByPk(cerere.idMasina)

        res.json(cerere)

        await db.AuditLog.create({
            actiune: 'APROBARE_DISCOUNT',
            detalii: `Director a aprobat discount personal ${cerere.discountProcent}% pentru ${masina ? masina.marca + ' ' + masina.model : '—'}. Discount valabil doar pentru clientul solicitant.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la aprobarea discount-ului' })
    }
})

// PUT /api/discount/:id/respinge - Respinge discount (Director)
router.put('/discount/:id/respinge', rolMiddleware('Director'), async (req, res) => {
    try {
        const cerere = await db.Tranzactie.findByPk(req.params.id)
        if (!cerere || cerere.tip !== 'Discount') {
            return res.status(404).json({ error: 'Cerere de discount negăsită' })
        }
        await cerere.update({ status: 'Rejected', idDirector: req.user.id })
        const masina = await db.Masina.findByPk(cerere.idMasina)
        res.json(cerere)

        await db.AuditLog.create({
            actiune: 'RESPINGERE_DISCOUNT',
            detalii: `Director a respins discount ${cerere.discountProcent}% pentru ${masina ? masina.marca + ' ' + masina.model : '—'}.`,
            idUtilizator: req.user.id,
            ip: req.ip || req.connection?.remoteAddress
        }).catch(() => { })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la respingerea discount-ului' })
    }
})

// ========== AUDIT LOG ==========

// GET /api/audit-log - Istoric actiuni (doar Director)
router.get('/audit-log', rolMiddleware('Director'), async (req, res) => {
    try {
        const logs = await db.AuditLog.findAll({
            include: [
                { model: db.Utilizator, as: 'utilizator', attributes: ['nume', 'prenume', 'rol'] }
            ],
            order: [['idLog', 'DESC']],
            limit: 100
        })
        res.json(logs)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea audit log-ului' })
    }
})

// ========== DASHBOARD STATS (Director) ==========

// GET /api/dashboard/stats - KPI-uri reale
router.get('/dashboard/stats', rolMiddleware('Director'), async (req, res) => {
    try {
        const totalMasini = await db.Masina.count({ where: { status: 'Disponibil' } })
        const totalClienti = await db.Utilizator.count({ where: { rol: 'Client', activ: true } })
        const testDrivePending = await db.TestDrive.count({ where: { status: 0 } })
        const discountPending = await db.Tranzactie.count({ where: { tip: 'Discount', status: 'Processing' } })
        const tranzactiiPending = await db.Tranzactie.count({ where: { tip: 'Vanzare', status: 'Processing' } })
        const tranzactiiSold = await db.Tranzactie.findAll({
            where: { status: 'Sold' },
            attributes: [[db.sequelize.fn('SUM', db.sequelize.col('suma')), 'totalVanzari']]
        })

        // Monthly sales for the current year (for chart)
        const currentYear = new Date().getFullYear()
        const vanzariLunare = await db.Tranzactie.findAll({
            where: {
                status: 'Sold',
                dataTranzactie: {
                    [Op.gte]: new Date(`${currentYear}-01-01`),
                    [Op.lt]: new Date(`${currentYear + 1}-01-01`)
                }
            },
            attributes: [
                [db.sequelize.fn('EXTRACT', db.sequelize.literal("MONTH FROM \"dataTranzactie\"")), 'luna'],
                [db.sequelize.fn('SUM', db.sequelize.col('suma')), 'total'],
                [db.sequelize.fn('COUNT', db.sequelize.col('idTranzactie')), 'numar']
            ],
            group: [db.sequelize.fn('EXTRACT', db.sequelize.literal("MONTH FROM \"dataTranzactie\""))],
            order: [[db.sequelize.fn('EXTRACT', db.sequelize.literal("MONTH FROM \"dataTranzactie\"")), 'ASC']],
            raw: true
        })

        // Build 12-month array (Jan..Dec), fill with real data
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const found = vanzariLunare.find(v => Number(v.luna) === i + 1)
            return { luna: i + 1, total: found ? Number(found.total) : 0, numar: found ? Number(found.numar) : 0 }
        })

        // Real clients for avatars (latest 5 active clients)
        const clientiRecenti = await db.Utilizator.findAll({
            where: { rol: 'Client', activ: true },
            attributes: ['idUtilizator', 'nume', 'prenume'],
            order: [['dataInregistrare', 'DESC']],
            limit: 5,
            raw: true
        })

        res.json({
            masiniStoc: totalMasini,
            clientiActivi: totalClienti,
            cereriPending: testDrivePending + discountPending + tranzactiiPending,
            testDrivePending,
            discountPending,
            tranzactiiPending,
            totalVanzari: tranzactiiSold[0]?.dataValues?.totalVanzari || 0,
            vanzariLunare: monthlyData,
            clientiRecenti
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea statisticilor' })
    }
})

export default router

