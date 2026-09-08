import { useEffect, useState } from 'react'
import { MailPlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  const [inviteEnabled, setInviteEnabled] = useState(true)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/settings`, { headers: { Authorization: `Bearer ${useAuthStore.getState().auth.accessToken}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data) setInviteEnabled(data.inviteEnabled !== false) })
      .catch(() => undefined)
  }, [])
  return (
    <div className='flex gap-2'>
      <Button
        className='h-9 space-x-1 px-4'
        disabled={!inviteEnabled}
        title={inviteEnabled ? '邀请用户' : '邀请用户功能已关闭'}
        onClick={() => setOpen('invite')}
      >
        <span>邀请用户</span> <MailPlus size={18} />
      </Button>
    </div>
  )
}
