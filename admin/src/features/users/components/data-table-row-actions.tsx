import { type Row } from '@tanstack/react-table'
import { UserPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type User } from '../data/schema'
import { useUsers } from './users-provider'

type DataTableRowActionsProps = { row: Row<User> }

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useUsers()
  return (
    <Button
      variant='ghost'
      className='flex h-8 w-8 p-0'
      onClick={() => {
        setCurrentRow(row.original)
        setOpen('edit')
      }}
      title='编辑用户'
      aria-label='编辑用户'
    >
      <UserPen size={16} />
    </Button>
  )
}
