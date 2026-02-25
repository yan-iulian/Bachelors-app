import API_URL from './api'

/**
 * Helper pentru apeluri API autentificate.
 * Adaugă automat Authorization header cu token-ul din localStorage.
 */
export const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
})

/**
 * Fetch wrapper cu autentificare. Aruncă eroare dacă response nu e ok.
 */
export const apiFetch = async (endpoint, options = {}) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...authHeaders(),
            ...(options.headers || {})
        }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Eroare la comunicarea cu serverul')
    return data
}

export const apiGet = (endpoint) => apiFetch(endpoint)
export const apiPost = (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) })
export const apiPut = (endpoint, body) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body) })
export const apiDelete = (endpoint) => apiFetch(endpoint, { method: 'DELETE' })
