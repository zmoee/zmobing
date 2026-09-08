import { createFileRoute } from '@tanstack/react-router'
import { WatermarkSettings } from '@/features/settings/watermark'

export const Route = createFileRoute('/_authenticated/settings/watermark')({
  component: WatermarkSettings,
})
