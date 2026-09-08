import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TasksProvider } from './components/tasks-provider'
import { TasksTable } from './components/tasks-table'
import { type Task } from './data/schema'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export function Tasks() {
  const [orders, setOrders] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`${apiUrl}/applications/orders/list`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('加载订单失败')
        return response.json()
      })
      .then((data) =>
        setOrders(
          data.map((order: any) => ({
            id: order.id,
            title: order.application?.name || '病例',
            status: order.status,
            label: order.user?.email || '',
            priority: String(order.price),
            user: order.user?.email,
            price: order.price,
            balanceBefore: order.balanceBefore,
            balanceAfter: order.balanceAfter,
            imageUrl: order.imageUrl,
            imageKey: order.imageKey,
            imageExpiresAt: order.imageExpiresAt,
            createdAt: order.createdAt,
          }))
        )
      )
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [])
  return (
    <TasksProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <TasksTable data={orders} isLoading={loading} />
      </Main>
    </TasksProvider>
  )
}
