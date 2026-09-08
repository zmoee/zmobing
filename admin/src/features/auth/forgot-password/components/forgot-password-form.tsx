import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  email: z.email({ error: (iss) => (iss.input === '' ? '请输入邮箱' : undefined) }),
})

export function ForgotPasswordForm({ className, ...props }: React.HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { email: '' } })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || '发送失败')
      toast.success('验证码已发送到邮箱')
      navigate({ to: '/otp', search: { email: data.email } })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送失败')
    } finally { setIsLoading(false) }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('grid gap-2', className)} {...props}>
        <FormField control={form.control} name='email' render={({ field }) => (
          <FormItem>
            <FormLabel>邮箱</FormLabel>
            <FormControl><Input placeholder='name@example.com' {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button className='mt-2' disabled={isLoading}>
          发送验证码
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  )
}
