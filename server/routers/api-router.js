import { Router } from 'express'
import { authMiddleware, rolMiddleware } from '../middleware/index.js'
import db from '../models/index.js'

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
        const masina = await db.Masina.findByPk(req.params.id)
        if (!masina) {
            return res.status(404).json({ error: 'Mașina nu a fost găsită' })
        }
        res.json(masina)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea detaliilor' })
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
        await masina.update(req.body)
        res.json(masina)
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
        await masina.destroy()
        res.json({ message: 'Mașina a fost ștearsă' })
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
        res.json(td)
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
        res.json(td)
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
        res.json(td)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare' })
    }
})

// ========== TRANZACTII ==========

// POST /api/tranzactii - Initiaza tranzactie (doar Client)
router.post('/tranzactii', rolMiddleware('Client'), async (req, res) => {
    try {
        const tranzactie = await db.Tranzactie.create({
            ...req.body,
            idClient: req.user.id,
            status: 'Processing'
        })
        res.status(201).json(tranzactie)
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
        // Marcheaza masina ca vanduta
        await db.Masina.update({ status: 'Vandut' }, { where: { idMasina: tr.idMasina } })
        res.json(tr)
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
        res.json(tr)
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
        res.status(201).json(reparatie)
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
        res.json(reparatie)
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

        // Aplicam discount-ul pe masina
        const masina = await db.Masina.findByPk(cerere.idMasina)
        if (masina) {
            const pretNou = masina.pretEuro * (1 - cerere.discountProcent / 100)
            await masina.update({ esteInPromotie: true, pretPromotional: pretNou })
        }

        res.json(cerere)
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
        res.json(cerere)
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
            order: [['dataOra', 'DESC']],
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

        res.json({
            masiniStoc: totalMasini,
            clientiActivi: totalClienti,
            cereriPending: testDrivePending + discountPending + tranzactiiPending,
            testDrivePending,
            discountPending,
            tranzactiiPending,
            totalVanzari: tranzactiiSold[0]?.dataValues?.totalVanzari || 0
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la încărcarea statisticilor' })
    }
})

export default router

