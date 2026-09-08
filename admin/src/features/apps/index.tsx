import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Eye, Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
type Application = {
  id: string
  name: string
  description: string
  category: string
  price: number
  status: string
  coverUrl?: string | null
}
type WatermarkSettings = {
  watermarkText: string
  watermarkOpacity: number
  watermarkFontSize: number
  watermarkColor: string
}

export function Apps() {
  const token = useAuthStore.getState().auth.accessToken
  const [items, setItems] = useState<Application[]>([])
  const [filter, setFilter] = useState('')
  const [watermark, setWatermark] = useState<WatermarkSettings | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const navigate = useNavigate()
  const load = () =>
    fetch(`${apiUrl}/applications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setItems)
      .catch(() => toast.error('加载病例失败'))
  useEffect(() => {
    load()
    fetch(`${apiUrl}/public/settings`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setWatermark(data))
      .catch(() => undefined)
  }, [])
  const order = (item: Application) => {
    navigate({ to: '/apps/$id', params: { id: item.id } })
  }
  const visible = items.filter(
    (item) =>
      item.status === 'PUBLISHED' &&
      (item.name.toLowerCase().includes(filter.toLowerCase()) ||
        item.description.toLowerCase().includes(filter.toLowerCase()))
  )
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>
      <Main fixed onClick={() => setPreviewId(null)}>
        <div className='mb-5 flex flex-wrap items-center justify-between gap-4'>
          <h1 className='text-2xl font-bold tracking-tight'>病例列表</h1>
          <div className='relative w-full sm:w-64'>
            <Input
              className='h-9 w-full pe-9'
              placeholder='搜索病例...'
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <SearchIcon className='pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          </div>
        </div>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {visible.map((item) => (
            <div key={item.id} className='group relative rounded-lg border p-4'>
              <div className='flex items-start justify-between gap-3'>
                <button
                  type='button'
                  className='relative flex size-10 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-accent'
                  aria-label='预览病例底图'
                  onClick={(event) => {
                    event.stopPropagation()
                    setPreviewId((current) => {
                      const next = current === item.id ? null : item.id
                      return next
                    })
                  }}
                >
                  <Eye className='size-5' />
                </button>
                <Badge variant='secondary'>{item.category}</Badge>
              </div>
              <h2 className='mt-5 font-semibold'>{item.name}</h2>
              <p className='mt-1 line-clamp-3 text-sm text-muted-foreground'>
                {item.description || ''}
              </p>
              <div className='mt-5 flex items-center justify-between'>
                <span className='font-medium'>
                  {item.price === 0 ? '免费' : `${item.price} 积分`}
                </span>
                <Button size='sm' onClick={() => order(item)}>
                  查看详情
                </Button>
              </div>
            </div>
          ))}
        </div>
        {previewId && (
          <div
            className='fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]'
            onClick={() => {
              setPreviewId(null)
            }}
          >
            {(() => {
              const previewItem = visible.find((item) => item.id === previewId)
              if (!previewItem?.coverUrl) return null
              return (
                <div className='relative w-full max-w-2xl overflow-hidden rounded-xl border bg-background p-3 shadow-2xl' onClick={(event) => event.stopPropagation()}>
                  <div className='relative flex max-h-[82vh] items-center justify-center overflow-hidden rounded-lg bg-muted'>
                    <img src={previewItem.coverUrl} alt='病例底图预览' className='block max-h-[70vh] h-auto max-w-full object-contain' />
                    {watermark?.watermarkText && (
                      <div className='pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 gap-5 overflow-hidden p-5' style={{ color: watermark.watermarkColor, opacity: Math.max(0, Math.min(0.26, watermark.watermarkOpacity)) }}>
                        {Array.from({ length: 9 }, (_, index) => (
                          <span key={index} className='flex items-center justify-center text-center font-medium whitespace-nowrap' style={{ transform: 'rotate(-24deg)', fontSize: `${Math.max(10, Math.min(16, watermark.watermarkFontSize))}px` }}>{watermark.watermarkText}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className='mt-2 text-center text-xs text-muted-foreground'>点击空白处关闭预览</p>
                </div>
              )
            })()}
          </div>
        )}
        {visible.length === 0 && (
          <div className='py-20 text-center text-muted-foreground'>
            暂无可用病例。
          </div>
        )}
      </Main>
    </>
  )
}
