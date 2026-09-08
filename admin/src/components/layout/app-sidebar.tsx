import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getRoleFromAccessToken } from '@/lib/auth-role'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const storedRole = useAuthStore((state) => state.auth.user?.role?.[0])
  const authUser = useAuthStore((state) => state.auth.user)
  const role = storedRole || getRoleFromAccessToken(accessToken)
  const [siteName, setSiteName] = useState(
    sidebarData.teams[0]?.name ?? '周末病历系统'
  )

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/public/settings`
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.siteName) setSiteName(data.siteName)
      })
      .catch(() => undefined)
  }, [])

  const teams = [{ ...sidebarData.teams[0], name: siteName }]
  const currentUser = {
    name: authUser?.accountNo || '用户',
    email: authUser?.email || '',
    avatar: '/avatars/shadcn.jpg',
  }
  const navGroups = sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.url === '/application-management')
          return role === 'SUPER_ADMIN' || role === 'ADMIN'
        if (item.items?.some((subItem) => subItem.url?.startsWith('/settings')))
          return role === 'SUPER_ADMIN'
        return true
      }),
    }))
    .filter((group) => group.items.length > 0)
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher key={siteName} teams={teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
