import { createFileRoute } from '@tanstack/react-router'
import { InviteSettings } from '@/features/settings/invite'

export const Route = createFileRoute('/_authenticated/settings/invite')({ component: InviteSettings })
