import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ContentSection } from '../components/content-section'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export function SettingsProfile() {
  const [siteName, setSiteName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${apiUrl}/settings`, {
      headers: { Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('加载站点配置失败')
        return response.json()
      })
      .then((data) => setSiteName(data.siteName || '周末病历系统'))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false))
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!siteName.trim()) return toast.error('请输入站点名称')
    setSaving(true)
    try {
      const response = await fetch(`${apiUrl}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}`,
        },
        body: JSON.stringify({ siteName: siteName.trim() }),
      })
      if (!response.ok) throw new Error('保存站点配置失败')
      toast.success('站点配置已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ContentSection
      title='站点配置'
      desc=''
      action={
        <Button
          className='h-9 px-4'
          type='submit'
          form='site-settings-form'
          disabled={loading || saving}
        >
          {saving ? '保存中...' : '保存配置'}
        </Button>
      }
    >
      <form id='site-settings-form' onSubmit={save} className='max-w-xl space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='site-name'>站点名称</Label>
          <Input
            id='site-name'
            value={siteName}
            onChange={(event) => setSiteName(event.target.value)}
            disabled={loading || saving}
            placeholder='请输入站点名称'
          />
        </div>
      </form>
    </ContentSection>
  )
}
