import { Logo } from '@/assets/logo'
import { useEffect, useState } from 'react'

type AuthLayoutProps = {
  children: React.ReactNode
  brandName?: string
}

export function AuthLayout({ children, brandName }: AuthLayoutProps) {
  const [siteName, setSiteName] = useState(brandName || '周末病历系统')
  useEffect(() => {
    if (brandName) return
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/public/settings`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data?.siteName && setSiteName(data.siteName))
      .catch(() => undefined)
  }, [brandName])
  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo className='me-2' />
          <h1 className='text-xl font-medium'>{siteName}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
