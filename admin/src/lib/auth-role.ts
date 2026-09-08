export function getRoleFromAccessToken(token: string) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return undefined
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    )
    return typeof decoded.role === 'string' ? decoded.role : undefined
  } catch {
    return undefined
  }
}

export function isAccessTokenValid(token: string) {
  if (!token) return false
  const parts = token.split('.')
  // Keep compatibility with non-JWT tokens used by local development/tests.
  if (parts.length !== 3) return true
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    )
    return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
