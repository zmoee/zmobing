import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ContentSection } from '../components/content-section'

const schema = z.object({ inviteEnabled: z.boolean(), inviteCost: z.coerce.number().int().min(0) })
type InviteForm = z.infer<typeof schema>
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export function InviteSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const form = useForm<InviteForm>({ resolver: zodResolver(schema), defaultValues: { inviteEnabled: true, inviteCost: 0 } })
  useEffect(() => { fetch(`${apiUrl}/settings`, { headers: { Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` } }).then(async (res) => { if (!res.ok) throw new Error('加载邀请设置失败'); return res.json() }).then((data) => form.reset({ inviteEnabled: data.inviteEnabled, inviteCost: data.inviteCost })).catch((error) => toast.error(error.message)).finally(() => setLoading(false)) }, [form])
  const onSubmit = async (values: InviteForm) => { setSaving(true); try { const res = await fetch(`${apiUrl}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` }, body: JSON.stringify(values) }); if (!res.ok) throw new Error('保存失败'); toast.success('邀请设置已保存') } catch (error) { toast.error(error instanceof Error ? error.message : '保存失败') } finally { setSaving(false) } }
  return <ContentSection title='邀请用户设置' desc='' action={<Button className='h-9 px-4' type='submit' form='invite-settings-form' disabled={loading || saving}>保存配置</Button>}><Form {...form}><form id='invite-settings-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'><FormField control={form.control} name='inviteEnabled' render={({ field }) => <FormItem className='flex items-center gap-3 space-y-0'><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className='font-normal'>开启邀请用户功能</FormLabel></FormItem>} /><FormField control={form.control} name='inviteCost' render={({ field }) => <FormItem><FormLabel>每次邀请扣除积分</FormLabel><FormControl><Input type='number' min='0' step='1' {...field} /></FormControl><FormMessage /></FormItem>} /></form></Form></ContentSection>
}
