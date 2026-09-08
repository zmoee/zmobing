import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ContentSection } from '../components/content-section'

const schema = z.object({ smtpHost: z.string(), smtpPort: z.coerce.number().int().min(1).max(65535), smtpUser: z.string(), smtpPassword: z.string(), smtpFrom: z.string() })
type SmtpForm = z.infer<typeof schema>
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export function SmtpSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const form = useForm<SmtpForm>({ resolver: zodResolver(schema), defaultValues: { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPassword: '', smtpFrom: '' } })
  useEffect(() => {
    fetch(`${apiUrl}/settings`, { headers: { Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` } }).then(async (res) => { if (!res.ok) throw new Error('加载 SMTP 配置失败'); return res.json() }).then((data) => form.reset({ smtpHost: data.smtpHost, smtpPort: data.smtpPort, smtpUser: data.smtpUser, smtpPassword: data.smtpPassword, smtpFrom: data.smtpFrom })).catch((error) => toast.error(error.message)).finally(() => setLoading(false))
  }, [form])
  const onSubmit = async (values: SmtpForm) => { setSaving(true); try { const res = await fetch(`${apiUrl}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` }, body: JSON.stringify(values) }); if (!res.ok) throw new Error('保存失败'); toast.success('SMTP 配置已保存') } catch (error) { toast.error(error instanceof Error ? error.message : '保存失败') } finally { setSaving(false) } }
  return <ContentSection title='SMTP 配置' desc='' action={<Button className='h-9 px-4' type='submit' form='smtp-settings-form'>保存配置</Button>}><Form {...form}><form id='smtp-settings-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'><div className='grid gap-4 sm:grid-cols-2'>
    <FormField control={form.control} name='smtpHost' render={({ field }) => <FormItem><FormLabel>SMTP 服务器</FormLabel><FormControl><Input placeholder='smtp.example.com' disabled={loading} {...field} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name='smtpPort' render={({ field }) => <FormItem><FormLabel>SMTP 端口</FormLabel><FormControl><Input type='number' placeholder='587' {...field} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name='smtpUser' render={({ field }) => <FormItem><FormLabel>SMTP 用户名</FormLabel><FormControl><Input placeholder='邮箱账号' {...field} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name='smtpPassword' render={({ field }) => <FormItem><FormLabel>SMTP 密码</FormLabel><FormControl><Input type='password' placeholder='邮箱密码或授权码' {...field} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name='smtpFrom' render={({ field }) => <FormItem className='sm:col-span-2'><FormLabel>发件人邮箱</FormLabel><FormControl><Input type='email' placeholder='noreply@example.com' {...field} /></FormControl><FormMessage /></FormItem>} />
  </div></form></Form></ContentSection>
}
