import {
  ClipboardList,
  Command,
  LayoutDashboard,
  ListTodo,
  Mail,
  Package,
  Settings,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  teams: [{ name: '周末病历系统', logo: Command, plan: '' }],
  navGroups: [
    {
      title: '主要功能',
      items: [
        { title: '仪表盘', url: '/', icon: LayoutDashboard },
        { title: '订单中心', url: '/tasks', icon: ListTodo },
        { title: '病例列表', url: '/apps', icon: Package },
        { title: '用户管理', url: '/users', icon: Users },
      ],
    },
    {
      title: '系统管理',
      items: [
        {
          title: '病例管理',
          url: '/application-management',
          icon: ClipboardList,
        },
        {
          title: '系统设置',
          icon: Settings,
          items: [
            { title: '站点配置', url: '/settings', icon: UserCog },
            {
              title: '预览水印',
              url: '/settings/watermark',
              icon: ShieldCheck,
            },
            { title: 'SMTP 配置', url: '/settings/smtp', icon: Mail },
            { title: '邀请用户设置', url: '/settings/invite', icon: UserPlus },
          ],
        },
      ],
    },
  ],
}
