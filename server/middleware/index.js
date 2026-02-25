import jwt from 'jsonwebtoken'

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ error: 'Token lipsă' })
    }

    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (err) {
        return res.status(401).json({ error: 'Token invalid sau expirat' })
    }
}

export const rolMiddleware = (...roluriPermise) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Neautentificat' })
        }
        if (!roluriPermise.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Acces interzis pentru rolul tău' })
        }
        next()
    }
}

export const genericErrorMiddleware = (err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: 'Eroare internă de server' })
}
