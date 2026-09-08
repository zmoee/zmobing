import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleFromAccessToken } from '@/lib/auth-role'
import { Settings } from '@/features/settings'

export const Route = createFileRoute('/_authenticated/settings')({
  beforeLoad: () => {
    const auth = useAuthStore.getState().auth
    const role =
      auth.user?.role?.[0] || getRoleFromAccessToken(auth.accessToken)
    if (role !== 'SUPER_ADMIN') throw redirect({ to: '/' })
  },
  component: Settings,
})
