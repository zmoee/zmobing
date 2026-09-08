import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ContentSection } from './components/content-section'

const schema = z.object({
  watermarkText: z.string(),
  watermarkOpacity: z.coerce.number().min(0).max(1),
  watermarkFontSize: z.coerce.number().min(8).max(96),
})
type WatermarkForm = z.infer<typeof schema>
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export function WatermarkSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const form = useForm<WatermarkForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      watermarkText: '',
      watermarkOpacity: 0.16,
      watermarkFontSize: 18,
    },
  })
  useEffect(() => {
    fetch(`${apiUrl}/settings`, {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('加载水印配置失败')
        return res.json()
      })
      .then((data) =>
        form.reset({
          watermarkText: data.watermarkText || '',
          watermarkOpacity: data.watermarkOpacity ?? 0.16,
          watermarkFontSize: data.watermarkFontSize ?? 18,
        })
      )
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [form])
  const onSubmit = async (values: WatermarkForm) => {
    setSaving(true)
    try {
      const res = await fetch(`${apiUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
        },
        body: JSON.stringify({ ...values, watermarkColor: '#ef4444' }),
      })
      if (!res.ok) throw new Error('保存失败')
      toast.success('水印设置已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }
  return (
    <ContentSection
      title='预览水印'
      desc=''
      action={
        <Button
          className='h-9 px-4'
          type='submit'
          form='watermark-settings-form'
        >
          保存设置
        </Button>
      }
    >
      <Form {...form}>
        <form
          id='watermark-settings-form'
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6'
        >
          <FormField
            control={form.control}
            name='watermarkText'
            render={({ field }) => (
              <FormItem>
                <FormLabel>水印文字</FormLabel>
                <FormControl>
                  <Input
                    placeholder='例如：内部资料 · 禁止外传'
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid grid-cols-2 gap-3'>
            <FormField
              control={form.control}
              name='watermarkOpacity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>透明度（0-1）</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min='0'
                      max='1'
                      step='0.01'
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='watermarkFontSize'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>字号（px）</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min='8'
                      max='96'
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </ContentSection>
  )
}
