import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

function AuthGuard({ children, roluriPermise }) {
    const { user, token } = useSelector((state) => state.auth)

    if (!token || !user) {
        return <Navigate to="/login" replace />
    }

    if (roluriPermise && !roluriPermise.includes(user.rol)) {
        return <Navigate to="/acces-interzis" replace />
    }

    return children
}

export default AuthGuard
