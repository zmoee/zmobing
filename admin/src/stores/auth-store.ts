import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'

const ACCESS_TOKEN = 'thisisjustarandomstring'
const AUTH_USER = 'authenticated-user'

interface AuthUser {
  accountNo: string
  email: string
  role: string[]
  exp: number
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const cookieState = getCookie(ACCESS_TOKEN)
  const initToken = cookieState ? JSON.parse(cookieState) : ''
  const userCookie = getCookie(AUTH_USER)
  let initUser: AuthUser | null = null
  if (userCookie) {
    try {
      initUser = JSON.parse(decodeURIComponent(userCookie)) as AuthUser
    } catch {
      initUser = null
    }
  }
  if (!initUser && initToken.split('.').length === 3) {
    try {
      const payload = JSON.parse(
        atob(initToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      )
      if (payload.sub && payload.email) {
        initUser = {
          accountNo: payload.sub,
          email: payload.email,
          role: payload.role ? [payload.role] : [],
          exp: typeof payload.exp === 'number' ? payload.exp * 1000 : 0,
        }
      }
    } catch {
      initUser = null
    }
  }
  return {
    auth: {
      user: initUser,
      setUser: (user) =>
        set((state) => {
          if (user) setCookie(AUTH_USER, encodeURIComponent(JSON.stringify(user)))
          else removeCookie(AUTH_USER)
          return { ...state, auth: { ...state.auth, user } }
        }),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          setCookie(ACCESS_TOKEN, JSON.stringify(accessToken))
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          removeCookie(AUTH_USER)
          return { ...state, auth: { ...state.auth, accessToken: '' } }
        }),
      reset: () =>
        set((state) => {
          removeCookie(ACCESS_TOKEN)
          removeCookie(AUTH_USER)
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: '' },
          }
        }),
    },
  }
})
