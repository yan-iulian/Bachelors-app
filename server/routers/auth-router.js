import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../models/index.js'

const router = Router()

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { nume, prenume, email, parola, telefon, adresa, rol } = req.body

        // Verificare email existent
        const exista = await db.Utilizator.findOne({ where: { email } })
        if (exista) {
            return res.status(400).json({ error: 'Email-ul este deja înregistrat' })
        }

        // Criptare parolă
        const parolaCriptata = await bcrypt.hash(parola, 10)

        // Creare utilizator — doar Client permis din frontend
        const utilizator = await db.Utilizator.create({
            nume,
            prenume,
            email,
            parola: parolaCriptata,
            telefon,
            adresa,
            rol: 'Client'
        })

        // Generare JWT pentru auto-login
        const token = jwt.sign(
            {
                id: utilizator.idUtilizator,
                email: utilizator.email,
                rol: utilizator.rol,
                nume: utilizator.nume,
                prenume: utilizator.prenume
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.status(201).json({
            message: 'Cont creat cu succes',
            token,
            utilizator: {
                id: utilizator.idUtilizator,
                nume: utilizator.nume,
                prenume: utilizator.prenume,
                email: utilizator.email,
                rol: utilizator.rol
            }
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la înregistrare' })
    }
})

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, parola } = req.body

        // Cautare utilizator
        const utilizator = await db.Utilizator.findOne({ where: { email } })
        if (!utilizator) {
            return res.status(401).json({ error: 'Email sau parolă incorectă' })
        }

        // Verificare cont activ
        if (!utilizator.activ) {
            return res.status(403).json({ error: 'Contul este dezactivat' })
        }

        // Verificare parolă
        const parolaCorecta = await bcrypt.compare(parola, utilizator.parola)
        if (!parolaCorecta) {
            return res.status(401).json({ error: 'Email sau parolă incorectă' })
        }

        // Generare JWT
        const token = jwt.sign(
            {
                id: utilizator.idUtilizator,
                email: utilizator.email,
                rol: utilizator.rol,
                nume: utilizator.nume,
                prenume: utilizator.prenume
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        )

        res.json({
            message: 'Autentificare reușită',
            token,
            utilizator: {
                id: utilizator.idUtilizator,
                nume: utilizator.nume,
                prenume: utilizator.prenume,
                email: utilizator.email,
                rol: utilizator.rol
            }
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Eroare la autentificare' })
    }
})

export default router
