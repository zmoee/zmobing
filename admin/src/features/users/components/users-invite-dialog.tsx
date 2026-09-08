import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailPlus, Send } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { roles } from '../data/data'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? '请输入要邀请的邮箱。' : undefined),
  }),
  role: z.string().min(1, '请选择角色。'),
})

type UserInviteForm = z.infer<typeof formSchema>

type UserInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersInviteDialog({
  open,
  onOpenChange,
}: UserInviteDialogProps) {
  const form = useForm<UserInviteForm>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', role: '' },
  })
  const [inviteCost, setInviteCost] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<UserInviteForm | null>(
    null
  )
  const [verificationOpen, setVerificationOpen] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const currentRole = useAuthStore((state) => state.auth.user?.role?.[0])
  const inviteRoleItems = roles
    .filter(({ value }) => value !== 'superadmin')
    .filter(({ value }) => currentRole === 'SUPER_ADMIN' || value === 'user')
    .map(({ label, value }) => ({ label, value }))
  useEffect(() => {
    if (!open) return
    fetch(`${apiUrl}/settings`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
      },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setInviteCost(Number(data.inviteCost || 0)))
      .catch(() => undefined)
  }, [open])
  const isSubmitting = form.formState.isSubmitting

  const onSubmit = async (values: UserInviteForm) => {
    if (values.role === 'admin' && currentRole !== 'SUPER_ADMIN') {
      return toast.error('管理员只能邀请普通用户')
    }
    setPendingValues(values)
    setSendingCode(true)
    try {
      const response = await fetch(`${apiUrl}/users/invite/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` },
        body: JSON.stringify({ email: values.email }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || '验证码发送失败')
      setVerificationCode('')
      setVerificationOpen(true)
      toast.success('验证码已发送，请查收邮箱')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '验证码发送失败')
    } finally {
      setSendingCode(false)
    }
  }
  const verifyCode = async () => {
    if (!pendingValues || !/^\d{4}$/.test(verificationCode)) return toast.error('请输入4位验证码')
    const response = await fetch(`${apiUrl}/users/invite/verification/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` },
      body: JSON.stringify({ email: pendingValues.email, code: verificationCode }),
    })
    if (!response.ok) return toast.error((await response.json().catch(() => ({}))).message || '验证码错误')
    const data = await response.json()
    setVerificationToken(data.verificationToken)
    setVerificationOpen(false)
    setConfirmOpen(true)
  }
  const confirmInvite = async () => {
    if (!pendingValues) return
    const values = pendingValues
    setConfirmOpen(false)
    try {
      const role =
        values.role === 'superadmin'
          ? 'ADMIN'
          : values.role === 'admin'
            ? 'ADMIN'
            : 'USER'
      const response = await fetch(`${apiUrl}/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
        },
        body: JSON.stringify({ email: values.email, role, verificationToken }),
      })
      if (!response.ok)
        throw new Error(
          (await response.json().catch(() => ({}))).message || '邀请失败'
        )
      toast.success('用户邀请已创建')
      form.reset()
      setPendingValues(null)
      setVerificationToken('')
      onOpenChange(false)
      window.dispatchEvent(new CustomEvent('users:refresh'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '邀请失败')
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(state) => {
          form.reset()
          setPendingValues(null)
          setVerificationCode('')
          setVerificationToken('')
          setVerificationOpen(false)
          setConfirmOpen(false)
          onOpenChange(state)
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader className='text-start'>
            <DialogTitle className='flex items-center gap-2'>
              <MailPlus /> 邀请用户
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              id='user-invite-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>邮箱</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='请输入邮箱地址'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='请选择角色'
                      className='w-full'
                      items={inviteRoleItems}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter className='gap-y-2'>
            <DialogClose asChild>
              <Button variant='outline'>取消</Button>
            </DialogClose>
            <Button
              type='submit'
              form='user-invite-form'
              disabled={isSubmitting || sendingCode}
            >
              {sendingCode ? '发送验证码...' : '发送验证码'}{' '}
              <Send />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认邀请用户？</AlertDialogTitle>
            <AlertDialogDescription>
              本次邀请将扣除 {inviteCost}{' '}
              积分，扣除的积分将全部转移到被邀请者账号。确认继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInvite}>
              确认邀请
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={verificationOpen} onOpenChange={setVerificationOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>验证邮箱</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            验证码已发送到 {pendingValues?.email}，10分钟内有效。
          </p>
          <Input
            value={verificationCode}
            onChange={(event) =>
              setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 4))
            }
            inputMode='numeric'
            maxLength={4}
            placeholder='请输入4位验证码'
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setVerificationOpen(false)}>
              取消
            </Button>
            <Button onClick={verifyCode}>验证</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
