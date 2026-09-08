import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleFromAccessToken } from '@/lib/auth-role'
import { ApplicationEditor } from '@/features/application-management/editor'

export const Route = createFileRoute(
  '/_authenticated/application-management/$id/edit'
)({
  beforeLoad: () => {
    const auth = useAuthStore.getState().auth
    const role =
      auth.user?.role?.[0] || getRoleFromAccessToken(auth.accessToken)
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN')
      throw redirect({ to: '/apps' })
  },
  component: ApplicationEditor,
})
