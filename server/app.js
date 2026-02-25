import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import routers from './routers/index.js'
import { genericErrorMiddleware } from './middleware/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

const corsOptions = {
    origin: 'http://localhost:5173',
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use(express.json())

// Servire fișiere statice (imagini mașini etc.)
app.use(express.static(path.join(__dirname, 'public')))

// Rute
app.use('/auth', routers.auth)
app.use('/api', routers.api)
app.use('/ai', routers.ai)

// Error handler
app.use(genericErrorMiddleware)

export default app
