import { useEffect, useMemo, useState } from 'react'
import { FileText, ImageOff, ListOrdered, Users, Wallet } from 'lucide-react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

type Order = {
  price?: number
  createdAt?: string
  imageKey?: string | null
  imageExpiresAt?: string | null
  application?: { name?: string }
}

type StatCardData = {
  label: string
  value: string
  icon: typeof FileText
  tone: string
}

function StatCard({ label, value, icon: Icon, tone }: StatCardData) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{label}</CardTitle>
        <span className={`rounded-md p-2 ${tone}`}>
          <Icon className='size-4' />
        </span>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-semibold tabular-nums'>{value}</div>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const token = useAuthStore((state) => state.auth.accessToken)
  const role = useAuthStore((state) => state.auth.user?.role?.[0]) || 'USER'
  const [cards, setCards] = useState<StatCardData[] | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    let active = true
    const headers = { Authorization: `Bearer ${token}` }
    const load = async () => {
      try {
        const [ordersResponse, userResponse] = await Promise.all([
          fetch(`${apiUrl}/applications/orders/list`, { headers }),
          fetch(`${apiUrl}/users/me`, { headers }),
        ])
        if (!ordersResponse.ok || !userResponse.ok)
          throw new Error('加载仪表盘数据失败')
        const orders = (await ordersResponse.json()) as Order[]
        const currentUser = await userResponse.json()
        if (!active) return
        setOrders(orders)

        if (role === 'SUPER_ADMIN') {
          const [applicationsResponse, usersResponse] = await Promise.all([
            fetch(`${apiUrl}/applications`, { headers }),
            fetch(`${apiUrl}/users`, { headers }),
          ])
          if (!applicationsResponse.ok || !usersResponse.ok)
            throw new Error('加载管理员数据失败')
          const applications = await applicationsResponse.json()
          const users = await usersResponse.json()
          const monthStart = new Date()
          monthStart.setDate(1)
          monthStart.setHours(0, 0, 0, 0)
          const monthlyPoints = orders
            .filter(
              (order) =>
                order.createdAt && new Date(order.createdAt) >= monthStart
            )
            .reduce((total, order) => total + Number(order.price || 0), 0)
          setCards([
            {
              label: '病例总数',
              value: String(applications.length),
              icon: FileText,
              tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
            },
            {
              label: '订单总数',
              value: String(orders.length),
              icon: ListOrdered,
              tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
            },
            {
              label: '本月消耗积分',
              value: String(monthlyPoints),
              icon: Wallet,
              tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
            },
            {
              label: '用户总数',
              value: String(users.length),
              icon: Users,
              tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
            },
          ])
        } else {
          const expiredImages = orders.filter(
            (order) =>
              order.imageKey &&
              order.imageExpiresAt &&
              new Date(order.imageExpiresAt).getTime() <= Date.now()
          ).length
          setCards([
            {
              label: '当前积分余额',
              value: String(currentUser.balance ?? 0),
              icon: Wallet,
              tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
            },
            {
              label: '总充值',
              value: String(currentUser.totalRecharge ?? 0),
              icon: Wallet,
              tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
            },
            {
              label: '我的订单数',
              value: String(orders.length),
              icon: ListOrdered,
              tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
            },
            {
              label: '过期图片数',
              value: String(expiredImages),
              icon: ImageOff,
              tone: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
            },
          ])
        }
      } catch (error) {
        if (active)
          toast.error(
            error instanceof Error ? error.message : '加载仪表盘数据失败'
          )
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [role, token])

  const displayCards = useMemo(
    () =>
      cards ??
      (role === 'SUPER_ADMIN'
        ? ['病例总数', '订单总数', '本月消耗积分', '用户总数']
        : ['当前积分余额', '总充值', '我的订单数', '过期图片数']
      ).map((label) => ({
        label,
        value: '...',
        icon: FileText,
        tone: 'bg-muted text-muted-foreground',
      })),
    [cards, role]
  )

  const orderTrend = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const nextDate = new Date(date)
      nextDate.setDate(date.getDate() + 1)
      return {
        name: `${date.getMonth() + 1}/${date.getDate()}`,
        total: orders.filter((order) => {
          if (!order.createdAt) return false
          const createdAt = new Date(order.createdAt)
          return createdAt >= date && createdAt < nextDate
        }).length,
      }
    })
  }, [orders])

  const popularApplications = useMemo(() => {
    const counts = new Map<string, number>()
    orders.forEach((order) => {
      const name = order.application?.name || '未命名病例'
      counts.set(name, (counts.get(name) || 0) + 1)
    })
    return [...counts.entries()]
      .sort(([, left], [, right]) => right - left)
      .slice(0, 5)
  }, [orders])

  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>
      <Main>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {displayCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-7'>
          <Card className='lg:col-span-4'>
            <CardHeader>
              <CardTitle>近 7 天订单数量</CardTitle>
            </CardHeader>
            <CardContent className='ps-2'>
              <ResponsiveContainer width='100%' height={280}>
                <BarChart data={orderTrend}>
                  <XAxis
                    dataKey='name'
                    stroke='#888888'
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke='#888888'
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--foreground)',
                    }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Bar
                    dataKey='total'
                    name='订单数'
                    fill='currentColor'
                    className='text-primary'
                    activeBar={false}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className='lg:col-span-3'>
            <CardHeader>
              <CardTitle>热门病例 Top 5</CardTitle>
            </CardHeader>
            <CardContent>
              {popularApplications.length > 0 ? (
                <div className='space-y-4'>
                  {popularApplications.map(([name], index) => (
                    <div key={name} className='flex items-center gap-3'>
                      <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium'>
                        {index + 1}
                      </span>
                      <span className='min-w-0 flex-1 truncate text-sm'>
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='flex h-[220px] items-center justify-center text-sm text-muted-foreground'>
                  暂无订单数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
