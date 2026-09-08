import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { FilePenLine, Pencil, Plus, Send, Trash2, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
type Field = {
  fieldKey: string
  description: string
  type?: string
  required?: boolean
  config?: Record<string, unknown>
}
type Application = {
  id: string
  name: string
  category: string
  price: number
  coverUrl?: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'OFFLINE'
  fields: Field[]
}

const blank = { name: '', price: '0' }

export function ApplicationManagement() {
  const token = useAuthStore.getState().auth.accessToken
  const navigate = useNavigate()
  const [items, setItems] = useState<Application[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [editItem, setEditItem] = useState<Application | null>(null)
  const [editForm, setEditForm] = useState(blank)
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null)
  const load = () =>
    fetch(`${apiUrl}/applications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setItems)
      .catch(() => toast.error('加载病例失败'))
  useEffect(() => {
    load()
  }, [])
  const startCreate = () => {
    setForm(blank)
    setOpen(true)
  }
  const startEdit = (item: Application) => {
    navigate({
      to: '/application-management/$id/edit',
      params: { id: item.id },
    })
  }
  const startBasicEdit = (item: Application) => {
    setEditItem(item)
    setEditForm({ name: item.name, price: String(item.price) })
  }
  const saveBasicEdit = async () => {
    if (!editItem) return
    if (!editForm.name.trim()) return toast.error('请输入病例名称')
    const response = await fetch(`${apiUrl}/applications/${editItem.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: editForm.name.trim(),
        price: Number(editForm.price) || 0,
        category: editItem.category,
        coverUrl: editItem.coverUrl,
        fields: editItem.fields,
      }),
    })
    if (!response.ok) {
      toast.error((await response.json().catch(() => ({}))).message || '保存失败')
      return
    }
    toast.success('病例信息已更新')
    setEditItem(null)
    load()
  }
  const save = async () => {
    if (!form.name.trim()) return toast.error('请输入病例名称')
    const response = await fetch(`${apiUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: form.name, price: Number(form.price) || 0 }),
    })
    if (!response.ok) {
      toast.error(
        (await response.json().catch(() => ({}))).message || '保存失败'
      )
      return
    }
    const created = await response.json()
    toast.success('病例已创建')
    setOpen(false)
    navigate({
      to: '/application-management/$id/edit',
      params: { id: created.id },
    })
  }
  const updateStatus = async (
    item: Application,
    status: Application['status']
  ) => {
    const response = await fetch(`${apiUrl}/applications/${item.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) return toast.error('状态更新失败')
    load()
  }
  const remove = async (item: Application) => {
    setDeleteTarget(item)
  }
  const confirmRemove = async () => {
    if (!deleteTarget) return
    const item = deleteTarget
    setDeleteTarget(null)
    const response = await fetch(`${apiUrl}/applications/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return toast.error(error.message || '删除失败')
    }
    toast.success('病例已删除')
    load()
  }
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>
      <Main fixed>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h1 className='text-2xl font-bold tracking-tight'>病例管理</h1>
          <Button onClick={startCreate}>
            <Plus className='me-2 size-4' />
            新建病例
          </Button>
        </div>
        <div className='grid gap-4 pt-6 md:grid-cols-2 lg:grid-cols-3'>
          {items.map((item) => (
            <div key={item.id} className='overflow-hidden rounded-lg border'>
              {item.coverUrl ? (
                <img
                  src={item.coverUrl}
                  alt=''
                  className='h-36 w-full object-cover'
                />
              ) : (
                <div className='flex h-36 items-center justify-center bg-muted text-muted-foreground'>
                  暂无底图
                </div>
              )}
              <div className='p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h2 className='font-semibold'>{item.name}</h2>
                  </div>
                  <Badge
                    variant={
                      item.status === 'PUBLISHED' ? 'default' : 'secondary'
                    }
                  >
                    {item.status === 'PUBLISHED'
                      ? '已发布'
                      : item.status === 'OFFLINE'
                        ? '已下架'
                        : '草稿'}
                  </Badge>
                </div>
                <div className='mt-5 text-sm text-muted-foreground'>
                  {item.category} ·{' '}
                  {item.price === 0 ? '免费' : `${item.price} 积分`}
                </div>
                <div className='mt-4 flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => startBasicEdit(item)}
                  >
                    <FilePenLine className='me-1 size-4' />
                    编辑病例
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => startEdit(item)}
                  >
                    <Pencil className='me-1 size-4' />
                    可视化编辑
                  </Button>
                  {item.status === 'PUBLISHED' ? (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => updateStatus(item, 'OFFLINE')}
                    >
                      <PowerOff className='me-1 size-4' />
                      下架
                    </Button>
                  ) : (
                    <Button
                      size='sm'
                      onClick={() => updateStatus(item, 'PUBLISHED')}
                    >
                      <Send className='me-1 size-4' />
                      发布
                    </Button>
                  )}
                  <Button
                    size='sm'
                    variant='ghost'
                    className='text-destructive'
                    onClick={() => remove(item)}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {items.length === 0 && (
          <div className='py-20 text-center text-muted-foreground'>
            暂无病例，点击“新建病例”开始创建。
          </div>
        )}
      </Main>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>新建病例</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='space-y-2'>
              <Label>病例名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='例如：门诊病历'
              />
            </div>
            <div className='space-y-2'>
              <Label>价格（积分）</Label>
              <Input
                type='number'
                min='0'
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={save}>创建并编辑</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editItem)}
        onOpenChange={(value) => !value && setEditItem(null)}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>编辑病例</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='edit-application-name'>病例名称</Label>
              <Input
                id='edit-application-name'
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='edit-application-price'>价格（积分）</Label>
              <Input
                id='edit-application-price'
                type='number'
                min='0'
                value={editForm.price}
                onChange={(e) =>
                  setEditForm({ ...editForm, price: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditItem(null)}>
              取消
            </Button>
            <Button onClick={saveBasicEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除病例？</AlertDialogTitle>
            <AlertDialogDescription>
              删除“{deleteTarget?.name}
              ”后，相关字段和使用记录也会一并移除，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
