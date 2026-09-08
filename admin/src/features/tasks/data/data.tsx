import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Circle,
  CheckCircle,
  AlertCircle,
  Timer,
  HelpCircle,
  CircleOff,
} from 'lucide-react'

export const labels = [
  {
    value: 'bug',
    label: '问题',
  },
  {
    value: 'feature',
    label: '功能',
  },
  {
    value: 'documentation',
    label: '文档',
  },
]

export const statuses = [
  {
    label: '已创建',
    value: 'CREATED' as const,
    icon: HelpCircle,
  },
  {
    label: '已创建',
    value: 'CREATED' as const,
    icon: Circle,
  },
  {
    label: '处理中',
    value: 'PROCESSING' as const,
    icon: Timer,
  },
  {
    label: '已提交',
    value: 'SUBMITTED' as const,
    icon: CheckCircle,
  },
  {
    label: '已取消',
    value: 'CANCELED' as const,
    icon: CircleOff,
  },
]

export const priorities = [
  {
    label: '低',
    value: 'low' as const,
    icon: ArrowDown,
  },
  {
    label: '中',
    value: 'medium' as const,
    icon: ArrowRight,
  },
  {
    label: '高',
    value: 'high' as const,
    icon: ArrowUp,
  },
  {
    label: '紧急',
    value: 'critical' as const,
    icon: AlertCircle,
  },
]
