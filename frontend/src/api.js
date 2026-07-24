import axios from 'axios'

// Em produção (Vercel): usa VITE_API_URL definida nas env vars do Vercel
// Em desenvolvimento (local): usa o proxy do vite.config.js → localhost:3000
const BASE_URL = import.meta.env.VITE_API_URL || ''
console.log('📡 [API Service] URL Base configurada:', BASE_URL || 'Proxy local do Vite');

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token')
      if (token !== 'bypass-local-dev-token') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api
