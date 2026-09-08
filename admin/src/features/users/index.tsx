import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { type User } from './data/schema'

const route = getRouteApi('/_authenticated/users/')
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

type ApiUser = {
  id: string
  email: string
  name: string
  balance: number
  totalRecharge: number
  lastOnlineAt: string | null
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER'
  active: boolean
  invited: boolean
  createdAt: string
}

function toTableUser(user: ApiUser): User {
  const [firstName, ...lastNameParts] = user.name.trim().split(/\s+/)
  const role =
    user.role === 'SUPER_ADMIN'
      ? 'superadmin'
      : user.role === 'ADMIN'
        ? 'admin'
        : 'user'

  return {
    id: user.id,
    firstName: firstName || user.email,
    lastName: lastNameParts.join(' '),
    username: user.email,
    email: user.email,
    phoneNumber: '-',
    balance: user.balance,
    totalRecharge: user.totalRecharge,
    lastOnlineAt: user.lastOnlineAt ? new Date(user.lastOnlineAt) : null,
    status: user.invited ? 'invited' : user.active ? 'active' : 'inactive',
    role,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.createdAt),
  }
}

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let controller: AbortController | null = null
    const loadUsers = () => {
      controller?.abort()
      controller = new AbortController()
      const token = useAuthStore.getState().auth.accessToken
      setIsLoading(true)
      fetch(`${apiUrl}/users?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}))
            throw new Error(body.message || '加载用户失败')
          }
          return response.json() as Promise<ApiUser[]>
        })
        .then((data) => setUsers(data.map(toTableUser)))
        .catch((error: Error) => {
          if (error.name !== 'AbortError') toast.error(error.message)
        })
        .finally(() => setIsLoading(false))
    }
    const handleRefresh = () => loadUsers()
    loadUsers()
    window.addEventListener('users:refresh', handleRefresh)
    return () => {
      controller?.abort()
      window.removeEventListener('users:refresh', handleRefresh)
    }
  }, [])

  return (
    <UsersProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>用户列表</h2>
          </div>
          <UsersPrimaryButtons />
        </div>
        <UsersTable
          data={users}
          search={search}
          navigate={navigate}
          isLoading={isLoading}
        />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
