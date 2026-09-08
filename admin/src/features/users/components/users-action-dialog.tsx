import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Minus, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { SelectDropdown } from '@/components/select-dropdown'
import { roles } from '../data/data'
import { type User } from '../data/schema'

const formSchema = z.object({
  email: z.email({ error: (iss) => (iss.input === '' ? '邮箱不能为空。' : undefined) }),
  balanceAmount: z.string().refine((value) => value === '' || (Number(value) > 0 && Number.isFinite(Number(value))), '请输入有效的余额金额。'),
  balanceAction: z.enum(['add', 'deduct']),
  role: z.string().min(1, '请选择角色。'),
  password: z.string().refine((value) => value === '' || value.length >= 8, '密码至少需要 8 个字符。'),
  status: z.enum(['active', 'inactive']),
})
type UserForm = z.infer<typeof formSchema>

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export function UsersActionDialog({ currentRow, open, onOpenChange }: UserActionDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const form = useForm<UserForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: currentRow?.email ?? '', balanceAmount: '', balanceAction: 'add', role: currentRow?.role ?? 'user', password: '', status: currentRow?.status === 'inactive' ? 'inactive' : 'active' },
  })

  useEffect(() => {
    form.reset({ email: currentRow?.email ?? '', balanceAmount: '', balanceAction: 'add', role: currentRow?.role ?? 'user', password: '', status: currentRow?.status === 'inactive' ? 'inactive' : 'active' })
  }, [currentRow, form, open])

  const onSubmit = async (values: UserForm) => {
    if (!currentRow) return
    setIsSaving(true)
    try {
      const response = await fetch(`${apiUrl}/users/${currentRow.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
        },
        body: JSON.stringify({
          email: values.email,
          balanceDelta: values.balanceAmount === '' ? 0 : (values.balanceAction === 'add' ? 1 : -1) * Number(values.balanceAmount),
          role: values.role === 'superadmin' ? 'SUPER_ADMIN' : values.role === 'admin' ? 'ADMIN' : 'USER',
          password: values.password || undefined,
          active: values.status === 'active',
        }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || '保存失败')
      toast.success('用户信息已更新')
      onOpenChange(false)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>编辑用户</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id='user-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField control={form.control} name='email' render={({ field }) => (
              <FormItem><FormLabel>邮箱</FormLabel><FormControl><Input type='email' placeholder='请输入邮箱地址' {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='balanceAmount' render={({ field }) => (
              <FormItem><FormLabel>余额增减</FormLabel><FormControl><div className='flex gap-2'><Input type='number' min='0' step='0.01' placeholder='请输入金额' {...field} /><FormField control={form.control} name='balanceAction' render={({ field: actionField }) => (<div className='flex shrink-0 gap-1'><Button type='button' size='icon' variant={actionField.value === 'add' ? 'default' : 'outline'} onClick={() => actionField.onChange('add')} title='增加余额' aria-label='增加余额'><Plus /></Button><Button type='button' size='icon' variant={actionField.value === 'deduct' ? 'destructive' : 'outline'} onClick={() => actionField.onChange('deduct')} title='扣除余额' aria-label='扣除余额'><Minus /></Button></div>)} /></div></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='role' render={({ field }) => (
              <FormItem><FormLabel>角色</FormLabel><SelectDropdown defaultValue={field.value} onValueChange={field.onChange} placeholder='请选择角色' className='w-full' items={roles.map(({ label, value }) => ({ label, value }))} /><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='password' render={({ field }) => (
              <FormItem><FormLabel>重置密码</FormLabel><FormControl><div className='flex gap-2'><PasswordInput className='flex-1' placeholder='留空表示不修改' {...field} /><Button type='button' size='icon' variant='outline' title='生成随机密码' aria-label='生成随机密码' onClick={() => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'; const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); form.setValue('password', password, { shouldDirty: true, shouldValidate: true }) }}><RefreshCw /></Button></div></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name='status' render={({ field }) => (
              <FormItem><FormLabel>账号状态</FormLabel><SelectDropdown defaultValue={field.value} onValueChange={field.onChange} placeholder='请选择状态' className='w-full' items={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} /><FormMessage /></FormItem>
            )} />
          </form>
        </Form>
        <DialogFooter><Button type='submit' form='user-form' disabled={isSaving}>{isSaving ? '保存中...' : '保存更改'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
