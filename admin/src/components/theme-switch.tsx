import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    const themeColor = isDark ? '#020817' : '#fff'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [isDark])

  return (
    <Button
      variant='ghost'
      size='icon'
      className='scale-95 rounded-full'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? (
        <Sun className='size-[1.2rem]' />
      ) : (
        <Moon className='size-[1.2rem]' />
      )}
    </Button>
  )
}
