import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'

const schema = z.object({ otp: z.string().length(6, '请输入 6 位验证码。'), password: z.string().min(8, '密码至少需要 8 个字符。'), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { message: '两次输入的密码不一致。', path: ['confirmPassword'] })

export function OtpForm({ className, ...props }: React.HTMLAttributes<HTMLFormElement>) {
  const { email } = useSearch({ from: '/(auth)/otp' })
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { otp: '', password: '', confirmPassword: '' } })
  const otp = form.watch('otp')
  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!email) { toast.error('缺少邮箱地址，请重新发送验证码'); return }
    setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: values.otp, password: values.password }) })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || '密码重置失败')
      toast.success('密码已重置，请重新登录')
      navigate({ to: '/sign' })
    } catch (error) { toast.error(error instanceof Error ? error.message : '密码重置失败') } finally { setLoading(false) }
  }
  return <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className={cn('grid gap-3', className)} {...props}>
    <FormField control={form.control} name='otp' render={({ field }) => <FormItem><FormLabel>验证码</FormLabel><FormControl><InputOTP maxLength={6} {...field} containerClassName='justify-between'><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={2} /><InputOTPSlot index={3} /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup></InputOTP></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name='password' render={({ field }) => <FormItem><FormLabel>新密码</FormLabel><FormControl><Input type='password' placeholder='请输入新密码' {...field} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name='confirmPassword' render={({ field }) => <FormItem><FormLabel>确认新密码</FormLabel><FormControl><Input type='password' placeholder='请再次输入新密码' {...field} /></FormControl><FormMessage /></FormItem>} />
    <Button className='mt-2' disabled={otp.length < 6 || loading}>{loading ? '提交中...' : '确认重置'}</Button>
  </form></Form>
}
