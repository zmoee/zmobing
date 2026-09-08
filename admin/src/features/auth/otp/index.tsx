import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { OtpForm } from './components/otp-form'

export function Otp() {
  return (
    <AuthLayout>
      <Card className='max-w-md gap-4'>
        <CardHeader>
          <CardTitle className='text-base tracking-tight'>重置密码</CardTitle>
          <CardDescription>请输入邮箱收到的验证码，并设置新密码。</CardDescription>
        </CardHeader>
        <CardContent><OtpForm /></CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            没有收到验证码？{' '}
            <Link to='/forgot-password' className='underline underline-offset-4 hover:text-primary'>重新发送验证码</Link>。
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
