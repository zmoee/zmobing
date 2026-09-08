import { createFileRoute } from '@tanstack/react-router'
import { ApplicationFill } from '@/features/apps/application-fill'

export const Route = createFileRoute('/_authenticated/apps/$id')({ component: ApplicationFill })
