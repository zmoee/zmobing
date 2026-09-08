import { Separator } from '@/components/ui/separator'

type ContentSectionProps = {
  title: string
  desc: string
  action?: React.ReactNode
  children: React.JSX.Element
}

export function ContentSection({ title, desc, action, children }: ContentSectionProps) {
  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex flex-none items-start justify-between gap-4'>
        <div>
        <h3 className='text-lg font-medium'>{title}</h3>
        {desc && <p className='text-sm text-muted-foreground'>{desc}</p>}
        </div>
        {action}
      </div>
      <Separator className='my-4 flex-none' />
      <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
        <div className='-mx-1 px-1.5 lg:max-w-xl'>{children}</div>
      </div>
    </div>
  )
}
