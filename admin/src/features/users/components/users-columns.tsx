import { type ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { roles, callTypes } from '../data/data'
import { type User } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const usersColumns: ColumnDef<User>[] = [
  {
    id: 'actions',
    header: () => null,
    cell: DataTableRowActions,
    enableSorting: false,
    enableHiding: false,
    meta: { className: 'w-12 min-w-12 sticky start-0 z-10 bg-background' },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title='邮箱' />,
    cell: ({ row }) => <div className='min-w-52 pe-4 text-nowrap'>{row.getValue('email')}</div>,
    meta: { className: 'min-w-60' },
    enableHiding: false,
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => <DataTableColumnHeader column={column} title='余额' />,
    cell: ({ row }) => <div className='min-w-28 pe-4 tabular-nums'>{Number(row.getValue('balance') ?? 0).toFixed(2)}</div>,
    meta: { className: 'min-w-32' },
    enableSorting: false,
  },
  {
    accessorKey: 'totalRecharge',
    header: ({ column }) => <DataTableColumnHeader column={column} title='总充值' />,
    cell: ({ row }) => <div className='min-w-28 pe-4 tabular-nums'>{Number(row.getValue('totalRecharge') ?? 0).toFixed(2)}</div>,
    meta: { className: 'min-w-32' },
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title='状态' />,
    cell: ({ row }) => {
      const status = row.original.status
      const statusLabels = { active: '启用', inactive: '停用', invited: '已邀请', suspended: '已暂停' } as const
      return <Badge variant='outline' className={cn('capitalize', callTypes.get(status))}>{statusLabels[status]}</Badge>
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    meta: { className: 'min-w-28' },
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => <DataTableColumnHeader column={column} title='角色' />,
    cell: ({ row }) => {
      const userType = roles.find(({ value }) => value === row.original.role)
      if (!userType) return null
      return <div className='flex items-center gap-x-2'>
        {userType.icon && <userType.icon size={16} className='text-muted-foreground' />}
        <span className='text-sm'>{userType.label}</span>
      </div>
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    meta: { className: 'min-w-36' },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'lastOnlineAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title='最后在线时间' />,
    cell: ({ row }) => {
      const value = row.original.lastOnlineAt
      return <div className='min-w-44 whitespace-nowrap text-muted-foreground'>
        {value ? value.toLocaleString('zh-CN', { hour12: false }) : '暂无记录'}
      </div>
    },
    meta: { className: 'min-w-52' },
    enableSorting: false,
  },
]
