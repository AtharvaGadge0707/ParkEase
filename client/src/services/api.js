const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const apiRequest = async (
  path,
  { token, method = 'GET', body } = {},
) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  let data

  try {
    data = await response.json()
  } catch {
    // Response body was empty or was not valid JSON.
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Something went wrong.')
  }

  return data ?? {}
}