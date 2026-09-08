import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'
import { isAccessTokenValid } from '@/lib/auth-role'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const auth = useAuthStore.getState().auth
    if (!isAccessTokenValid(auth.accessToken)) {
      auth.reset()
      throw redirect({ to: '/sign', search: { redirect: location.href } })
    }
  },
  component: AuthenticatedLayout,
})
