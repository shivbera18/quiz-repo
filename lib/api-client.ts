const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface FetchOptions extends RequestInit {
  token?: string
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    fetchApi<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, data: any, token?: string) =>
    fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(data), token }),

  patch: <T>(endpoint: string, data: any, token?: string) =>
    fetchApi<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data), token }),

  delete: <T>(endpoint: string, token?: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE', token }),
}

export default api