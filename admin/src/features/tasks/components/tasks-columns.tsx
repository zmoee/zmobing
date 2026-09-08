import { type ColumnDef } from '@tanstack/react-table'
import { AlertCircle, Clock3, Eye, ImageOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/components/data-table'
import { statuses } from '../data/data'
import { type Task } from '../data/schema'

export const tasksColumns: ColumnDef<Task>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='订单号' />
    ),
    cell: ({ row }) => (
      <span className='font-mono text-xs'>{row.original.id}</span>
    ),
  },
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='病例名称' />
    ),
    cell: ({ row }) => (
      <span className='truncate font-medium'>{row.original.title}</span>
    ),
  },
  {
    accessorKey: 'imageUrl',
    header: '生成图片',
    enableSorting: false,
    cell: ({ row }) => {
      const { imageUrl, imageKey, imageExpiresAt } = row.original
      const expired =
        imageKey && imageExpiresAt
          ? new Date(imageExpiresAt).getTime() <= Date.now()
          : false
      if (imageUrl && !expired) {
        return (
          <a
            href={imageUrl}
            target='_blank'
            rel='noreferrer'
            title='查看生成图片'
            aria-label='查看生成图片'
            className='inline-flex size-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10'
          >
            <Eye className='size-4' />
          </a>
        )
      }
      return (
        <span
          title={expired ? '图片已过期' : '尚未生成图片'}
          aria-label={expired ? '图片已过期' : '尚未生成图片'}
          className='inline-flex size-8 items-center justify-center rounded-md text-muted-foreground'
        >
          {expired ? (
            <Clock3 className='size-4' />
          ) : (
            <ImageOff className='size-4' />
          )}
        </span>
      )
    },
  },
  {
    accessorKey: 'user',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='用户' />
    ),
    cell: ({ row }) => (
      <span className='text-sm'>{row.original.user || '-'}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='状态' />
    ),
    cell: ({ row }) => {
      const status = statuses.find((item) => item.value === row.original.status)
      const statusClassName =
        {
          CREATED:
            'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
          PROCESSING:
            'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
          SUBMITTED:
            'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
          CANCELED:
            'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
        }[row.original.status] ?? 'border-border bg-muted text-muted-foreground'
      return status ? (
        <Badge variant='outline' className={statusClassName}>
          {status.label}
        </Badge>
      ) : (
        <Badge variant='outline' className={statusClassName}>
          {row.original.status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='积分' />
    ),
    cell: ({ row }) => {
      const price = Number(row.original.price ?? 0)
      const before = row.original.balanceBefore
      const after = row.original.balanceAfter
      return (
        <div className='space-y-0.5 leading-tight'>
          <div className='flex items-center gap-1.5'>
            <span>扣除 {price} 积分</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-5 rounded-full text-muted-foreground hover:text-foreground'
                  aria-label='查看积分余额变更'
                >
                  <AlertCircle className='size-3.5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top' className='text-xs'>
                {before == null || after == null ? (
                  '该订单没有记录余额变更'
                ) : (
                  <span>
                    变更前余额：{before} 积分
                    <br />
                    变更后余额：{after} 积分
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='创建时间' />
    ),
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>
        {row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleString('zh-CN')
          : '-'}
      </span>
    ),
  },
]
