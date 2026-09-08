import { Outlet } from '@tanstack/react-router'
import { Mail, ShieldCheck, UserCog, UserPlus } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

const sidebarNavItems = [
  { title: '站点配置', href: '/settings', icon: <UserCog size={18} /> },
  {
    title: '预览水印',
    href: '/settings/watermark',
    icon: <ShieldCheck size={18} />,
  },
  { title: 'SMTP 配置', href: '/settings/smtp', icon: <Mail size={18} /> },
  {
    title: '邀请用户设置',
    href: '/settings/invite',
    icon: <UserPlus size={18} />,
  },
]

export function Settings() {
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>
      <Main fixed>
        <div className='flex items-center justify-between gap-3 lg:block'>
          <h1 className='text-2xl font-bold tracking-tight'>系统设置</h1>
          <div className='lg:hidden'>
            <SidebarNav items={sidebarNavItems} />
          </div>
        </div>
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='hidden top-0 lg:sticky lg:block lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
