import { API_URL } from './config'

const TOKEN_KEY = 'order_tracker_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Same as fetch, but attaches the login token automatically.
// If the server says 401, we clear the token and tell the app to show the login page.
export function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${API_URL}${path}`, { ...options, headers }).then((res) => {
    if (res.status === 401) {
      clearToken()
      window.dispatchEvent(new Event('auth-expired'))
    }
    return res
  })
}