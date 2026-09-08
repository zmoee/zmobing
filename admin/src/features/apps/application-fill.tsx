import { useEffect, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, PanelRight, PanelRightClose } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { createStampDataUrl, drawHighFidelityStamp } from '@/lib/stamp-renderer'

const route = getRouteApi('/_authenticated/apps/$id')
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
type Field = {
  fieldKey: string
  description: string
  price: number
  type: string
  required: boolean
  config?: Record<string, unknown>
}
type App = {
  id: string
  name: string
  description: string
  coverUrl?: string | null
  fields: Field[]
}
type WatermarkSettings = {
  watermarkText: string
  watermarkOpacity: number
  watermarkFontSize: number
  watermarkColor: string
}
const readImageForSubmission = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.onload = () => {
      if (file.size <= 4 * 1024 * 1024) {
        resolve(String(reader.result))
        return
      }
      const image = new Image()
      image.onerror = () => reject(new Error('图片解析失败'))
      image.onload = () => {
        const maxSide = 2400
        const scale = Math.min(
          1,
          maxSide / Math.max(image.naturalWidth, image.naturalHeight)
        )
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) return reject(new Error('图片处理失败'))
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })

function drawStamp(
  context: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  config: Record<string, unknown>
) {
  const size = Math.min(rect.width, rect.height)
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const radius = size * 0.42
  const color = String(config.stampColor || '#dc2626')
  context.save()
  context.globalAlpha = Math.max(0, Math.min(1, Number(config.opacity ?? 0.88)))
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = Math.max(2, size * 0.025)
  context.beginPath()
  context.arc(cx, cy, radius, 0, Math.PI * 2)
  context.stroke()
  context.beginPath()
  context.arc(cx, cy, radius * 0.84, 0, Math.PI * 2)
  context.stroke()
  const starRadius = radius * 0.38
  context.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 === 0 ? starRadius : starRadius * 0.42
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  context.closePath()
  context.fill()
  const drawArcText = (text: string, start: number, fontSize: number) => {
    const chars = Array.from(text)
    if (!chars.length) return
    context.font = `bold ${fontSize}px Microsoft YaHei, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    chars.forEach((char, index) => {
      const angle = start + (index / Math.max(1, chars.length - 1) - 0.5) * 1.8
      context.save()
      context.translate(cx + Math.cos(angle) * radius * 0.69, cy + Math.sin(angle) * radius * 0.69)
      context.rotate(angle + Math.PI / 2)
      context.fillText(char, 0, 0)
      context.restore()
    })
  }
  drawArcText(String(config.stampText || '印章文字'), -Math.PI / 2, Math.max(10, size * 0.105))
  drawArcText(String(config.stampCode || ''), Math.PI / 2, Math.max(8, size * 0.075))
  if (config.stampTexture !== false) {
    context.save()
    context.globalAlpha *= 0.22
    context.lineWidth = Math.max(1, size * 0.008)
    for (let i = -radius; i < radius; i += Math.max(5, size * 0.035)) {
      context.beginPath()
      context.moveTo(cx - radius, cy + i)
      context.lineTo(cx + radius, cy + i + radius * 0.12)
      context.stroke()
    }
    context.restore()
  }
  context.restore()
}

export function ApplicationFill() {
  const { id } = route.useParams()
  const navigate = useNavigate()
  const token = useAuthStore.getState().auth.accessToken
  const [app, setApp] = useState<App | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const stampConfigFor = (config: Record<string, unknown>, fieldKey: string) => ({
    ...config,
    stampText:
      config.stampTextEditable === true
        ? values[`${fieldKey}__stampText`] ?? String(config.stampText || '')
        : String(config.stampText || ''),
    stampMiddleText:
      config.stampMiddleTextEditable === true
        ? values[`${fieldKey}__stampMiddleText`] ?? String(config.stampMiddleText || '')
        : String(config.stampMiddleText || ''),
    stampCode:
      config.stampCodeEditable === true
        ? values[`${fieldKey}__stampCode`] ?? String(config.stampCode || '')
        : String(config.stampCode || ''),
    starSize: Number(values[`${fieldKey}__starSize`] ?? config.starSize ?? 0.3),
    orgSize: Number(values[`${fieldKey}__orgSize`] ?? config.orgSize ?? 0.1666),
    orgHeight: Number(values[`${fieldKey}__orgHeight`] ?? config.orgHeight ?? 1),
    orgStretch: Number(values[`${fieldKey}__orgStretch`] ?? config.orgStretch ?? 1),
    orgDistribution: Number(values[`${fieldKey}__orgDistribution`] ?? config.orgDistribution ?? 1),
    codeDistribution: Number(values[`${fieldKey}__codeDistribution`] ?? config.codeDistribution ?? 1),
    middleSize: Number(values[`${fieldKey}__middleSize`] ?? config.middleSize ?? 0.095),
    middleDistribution: Number(values[`${fieldKey}__middleDistribution`] ?? config.middleDistribution ?? 1),
    opacity: Number(values[`${fieldKey}__opacity`] ?? config.opacity ?? 0.88),
    stampTexture: values[`${fieldKey}__stampTexture`] === undefined
      ? config.stampTexture !== false
      : values[`${fieldKey}__stampTexture`] === 'true',
  })
  const resetStampValues = (fieldKey: string) => {
    const suffixes = [
      'stampText',
      'stampMiddleText',
      'stampCode',
      'starSize',
      'orgSize',
      'orgHeight',
      'orgStretch',
      'orgDistribution',
      'codeDistribution',
      'middleSize',
      'middleDistribution',
      'opacity',
      'stampTexture',
    ]
    setValues((previous) => {
      const next = { ...previous }
      suffixes.forEach((suffix) => delete next[`${fieldKey}__${suffix}`])
      return next
    })
    toast.success('印章已恢复默认值')
  }
  const [orderId, setOrderId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 1200, height: 800 })
  const [watermark, setWatermark] = useState<WatermarkSettings | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768
  )
  useEffect(() => {
    fetch(`${apiUrl}/applications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setApp)
      .catch(() => toast.error('加载病例失败'))
  }, [id])
  useEffect(() => {
    fetch(`${apiUrl}/public/settings`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setWatermark(data))
      .catch(() => undefined)
  }, [])
  const submit = async () => {
    if (!app) return
    const missing = app.fields.find(
      (field) => field.required && !values[field.fieldKey]?.trim()
    )
    if (missing) return toast.error(`请填写：${missing.description}`)
    let currentOrder = orderId
    if (!currentOrder) {
      const response = await fetch(`${apiUrl}/applications/${id}/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok)
        return toast.error(
          (await response.json().catch(() => ({}))).message || '下单失败'
        )
      const data = await response.json()
      currentOrder = data.id
      setOrderId(currentOrder)
    }
    const response = await fetch(
      `${apiUrl}/applications/orders/${currentOrder}/submit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: values }),
      }
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return toast.error(error.message || '提交失败，请检查图片大小后重试')
    }
    const imageData = await exportResult()
    if (imageData) {
      const imageResponse = await fetch(
        `${apiUrl}/applications/orders/${currentOrder}/image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageData }),
        }
      )
      if (!imageResponse.ok) {
        const error = await imageResponse.json().catch(() => ({}))
        return toast.error(error.message || '图片上传失败，请稍后重试')
      }
    }
    toast.success('已提交并导出填写结果')
  }
  const requestSubmit = () => {
    if (!app) return
    const missing = app.fields.find(
      (field) => field.required && !values[field.fieldKey]?.trim()
    )
    if (missing) return toast.error(`请填写：${missing.description}`)
    setConfirmOpen(true)
  }
  const exportResult = async (): Promise<string | null> => {
    if (!app) return null
    const canvas = document.createElement('canvas')
    const image = new Image()
    const cover = app.coverUrl
    image.src = cover || ''
    await new Promise<void>((resolve) => {
      image.onload = () => resolve()
      image.onerror = () => resolve()
    })
    const exportScale = 2
    const baseWidth = image.naturalWidth || 1200
    const baseHeight = image.naturalHeight || 800
    canvas.width = baseWidth * exportScale
    canvas.height = baseHeight * exportScale
    const context = canvas.getContext('2d')
    if (!context) return null
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.scale(exportScale, exportScale)
    if (image.naturalWidth)
      context.drawImage(image, 0, 0, baseWidth, baseHeight)
    for (const field of app.fields) {
      const config = field.config || {}
      const x = Number(config.x ?? 40)
      const y = Number(config.y ?? 40)
      const width = Number(config.width ?? 300)
      const height = Number(config.height ?? 60)
      const opacity = Math.max(0, Math.min(1, Number(config.opacity ?? 1)))
      context.save()
      context.globalAlpha = opacity
      if (field.type === 'stamp') {
        drawHighFidelityStamp(context, { x, y, width, height }, stampConfigFor(config, field.fieldKey))
      } else if (field.type === 'image' && values[field.fieldKey]) {
        context.beginPath()
        context.rect(x, y, width, height)
        context.clip()
        const fieldImage = new Image()
        fieldImage.src = values[field.fieldKey]
        await new Promise<void>((resolve) => {
          fieldImage.onload = () => {
            const mode = String(config.imageFit || 'fill')
            if (mode === 'fill') {
              context.drawImage(fieldImage, x, y, width, height)
            } else {
              const ratio =
                mode === 'cover'
                  ? Math.max(
                      width / fieldImage.naturalWidth,
                      height / fieldImage.naturalHeight
                    )
                  : Math.min(
                      width / fieldImage.naturalWidth,
                      height / fieldImage.naturalHeight
                    )
              const drawWidth = fieldImage.naturalWidth * ratio
              const drawHeight = fieldImage.naturalHeight * ratio
              const positionX = Math.max(
                -100,
                Math.min(100, Number(config.imagePositionX ?? 0))
              )
              const positionY = Math.max(
                -100,
                Math.min(100, Number(config.imagePositionY ?? 0))
              )
              context.drawImage(
                fieldImage,
                x +
                  (width - drawWidth) / 2 +
                  ((width - drawWidth) / 2) * (positionX / 100),
                y +
                  (height - drawHeight) / 2 +
                  ((height - drawHeight) / 2) * (positionY / 100),
                drawWidth,
                drawHeight
              )
            }
            resolve()
          }
          fieldImage.onerror = () => resolve()
        })
      }
      if (field.type === 'text') {
        const fontSize = Number(config.fontSize ?? 16)
        const lineHeight = Number(config.lineHeight ?? 1.2) * fontSize
        const content = values[field.fieldKey] || String(config.content || '')
        context.fillStyle = String(config.textColor || '#111827')
        context.font = `${config.fontStyle === 'italic' ? 'italic ' : ''}${config.fontWeight === 'bold' ? 'bold ' : ''}${fontSize}px ${String(config.fontFamily || 'Microsoft YaHei')}`
        context.textAlign = (config.textAlign as CanvasTextAlign) || 'left'
        const charSpacing = Number(config.charSpacing || 0)
        const wrapLine = (line: string) => {
          if (config.autoWrap === false || !line) return [line]
          const wrapped: string[] = []
          let currentLine = ''
          for (const char of Array.from(line)) {
            const candidate = currentLine + char
            const spacingWidth =
              Math.max(0, Array.from(candidate).length - 1) * charSpacing
            if (
              currentLine &&
              context.measureText(candidate).width + spacingWidth >
                width -
                  (wrapped.length === 0 ? Number(config.textIndent || 0) : 0)
            ) {
              wrapped.push(currentLine)
              currentLine = char
            } else {
              currentLine = candidate
            }
          }
          if (currentLine || wrapped.length === 0) wrapped.push(currentLine)
          return wrapped
        }
        const lines = content.split('\n').flatMap(wrapLine)
        const textHeight = lines.length * lineHeight
        const verticalOffset =
          config.verticalAlign === 'middle'
            ? Math.max(0, (height - textHeight) / 2)
            : config.verticalAlign === 'bottom'
              ? Math.max(0, height - textHeight)
              : 0
        const metrics = context.measureText('国')
        const ascent = metrics.actualBoundingBoxAscent || fontSize * 0.8
        const descent = metrics.actualBoundingBoxDescent || fontSize * 0.2
        const baselineOffset = (lineHeight + ascent - descent) / 2
        lines.forEach((line, index) => {
          const drawX =
            x +
            (config.textAlign === 'center'
              ? width / 2
              : config.textAlign === 'right'
                ? width
                : Number(config.textIndent || 0))
          const drawY = y + verticalOffset + baselineOffset + index * lineHeight
          if (!charSpacing) {
            context.fillText(line, drawX, drawY)
            return
          }
          const chars = Array.from(line)
          const widths = chars.map((char) => context.measureText(char).width)
          const totalWidth =
            widths.reduce((sum, item) => sum + item, 0) +
            Math.max(0, chars.length - 1) * charSpacing
          let cursor =
            config.textAlign === 'center'
              ? drawX - totalWidth / 2
              : config.textAlign === 'right'
                ? drawX - totalWidth
                : drawX
          chars.forEach((char, charIndex) => {
            context.fillText(char, cursor, drawY)
            cursor += widths[charIndex] + charSpacing
          })
        })
      }
      context.restore()
    }
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `${app.name}-填写结果.png`
    link.click()
    return url
  }
  if (!app)
    return <main className='p-6 text-muted-foreground'>正在加载病例...</main>
  return (
    <main className='fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-background p-4 md:p-6'>
      <div className='flex shrink-0 items-center justify-between gap-3 pb-3'>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => navigate({ to: '/apps' })}
        >
          <ArrowLeft className='me-2 size-4' />
          返回病例列表
        </Button>
        <div className='flex min-w-0 items-center gap-2'>
          <h1 className='truncate text-lg font-semibold'>{app.name}</h1>
          <Button
            variant='ghost'
            size='icon'
            className='shrink-0'
            title={sidebarOpen ? '收起填写栏' : '展开填写栏'}
            aria-label={sidebarOpen ? '收起填写栏' : '展开填写栏'}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <PanelRightClose /> : <PanelRight />}
          </Button>
        </div>
      </div>
      <div
        className={`relative grid min-h-0 flex-1 ${sidebarOpen ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'lg:grid-cols-1'}`}
      >
        <section className='no-scrollbar min-h-0 overflow-auto bg-background p-2 sm:p-4'>
          <div className='mx-auto w-full max-w-5xl'>
            <div
              className='relative overflow-hidden rounded-lg border bg-background'
              style={{ containerType: 'inline-size' }}
            >
              {app.coverUrl ? (
                <img
                  src={app.coverUrl}
                  alt={`${app.name}底图`}
                  className='block h-auto w-full'
                  onLoad={(event) => {
                    const image = event.currentTarget
                    setImageSize({
                      width: image.naturalWidth || 1200,
                      height: image.naturalHeight || 800,
                    })
                  }}
                />
              ) : (
                <div className='flex aspect-[3/2] items-center justify-center text-sm text-muted-foreground'>
                  暂无底图
                </div>
              )}
              <div className='absolute inset-0'>
                {app.fields.map((field) => {
                  const config = field.config || {}
                  const stampConfig = field.type === 'stamp' ? stampConfigFor(config, field.fieldKey) : config
                  const x = Number(config.x ?? 40)
                  const y = Number(config.y ?? 40)
                  const width = Number(config.width ?? 300)
                  const height = Number(config.height ?? 60)
                  const content =
                    values[field.fieldKey] || String(config.content || '')
                  return (
                    <div
                      key={field.fieldKey}
                      className='absolute flex overflow-hidden border-0 bg-transparent px-1'
                      style={{
                        left: `${(x / imageSize.width) * 100}%`,
                        top: `${(y / imageSize.height) * 100}%`,
                        width: `${(width / imageSize.width) * 100}%`,
                        height: `${(height / imageSize.height) * 100}%`,
                        color: String(config.textColor || '#111827'),
                        opacity: Math.max(
                          0,
                          Math.min(1, Number(config.opacity ?? 1))
                        ),
                        fontFamily: String(
                          config.fontFamily || 'Microsoft YaHei'
                        ),
                        fontSize: `calc(${Number(config.fontSize ?? 16)} * 100cqw / ${imageSize.width})`,
                        fontWeight:
                          config.fontWeight === 'bold' ? '700' : '400',
                        fontStyle:
                          config.fontStyle === 'italic' ? 'italic' : 'normal',
                        lineHeight: Number(config.lineHeight ?? 1.2),
                        alignItems:
                          config.verticalAlign === 'middle'
                            ? 'center'
                            : config.verticalAlign === 'bottom'
                              ? 'flex-end'
                              : 'flex-start',
                        whiteSpace:
                          config.autoWrap === false ? 'pre' : 'pre-wrap',
                        textAlign:
                          (config.textAlign as 'left' | 'center' | 'right') ||
                          'left',
                      }}
                    >
                      {field.type === 'stamp' ? (
                        <img
                          src={createStampDataUrl(Math.min(width, height), stampConfig)}
                          alt='印章'
                          className='h-full w-full object-contain'
                        />
                      ) : field.type === 'image' && values[field.fieldKey] ? (
                        <img
                          src={values[field.fieldKey]}
                          alt=''
                          className='h-full w-full'
                          style={{
                            objectFit:
                              config.imageFit === 'fill'
                                ? 'fill'
                                : config.imageFit === 'cover'
                                  ? 'cover'
                                  : 'contain',
                            objectPosition: `${50 + Number(config.imagePositionX ?? 0) / 2}% ${50 + Number(config.imagePositionY ?? 0) / 2}%`,
                          }}
                        />
                      ) : (
                        <span className='break-words whitespace-pre-wrap'>
                          {content || field.description}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {watermark?.watermarkText && (
                <div
                  className='pointer-events-none absolute inset-0 z-20 grid grid-cols-2 grid-rows-6 gap-x-4 gap-y-10 overflow-hidden p-3 sm:grid-cols-3 sm:grid-rows-6 sm:gap-x-5 sm:gap-y-8 sm:p-4 lg:grid-cols-5 lg:grid-rows-5 lg:gap-x-6 lg:gap-y-8'
                  style={{
                    color: watermark.watermarkColor,
                    opacity: Math.max(
                      0,
                      Math.min(1, watermark.watermarkOpacity)
                    ),
                  }}
                >
                  {Array.from({ length: 30 }, (_, index) => (
                    <span
                      key={index}
                      className={`flex items-center justify-center text-center font-medium whitespace-nowrap ${index >= 12 ? 'hidden sm:flex' : ''} ${index >= 18 ? 'sm:hidden lg:flex' : ''}`}
                      style={{
                        fontSize: `clamp(10px, 2.8vw, ${watermark.watermarkFontSize}px)`,
                        transform: 'rotate(-24deg)',
                      }}
                    >
                      {watermark.watermarkText}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        <aside
          className={`${sidebarOpen ? 'translate-y-0 lg:translate-x-0' : 'translate-y-full lg:hidden'} absolute -start-4 -end-4 bottom-0 z-40 no-scrollbar h-[60vh] min-h-0 w-auto overflow-auto rounded-t-2xl bg-muted p-0 shadow-2xl transition-transform duration-200 ease-out md:-me-6 lg:static lg:inset-auto lg:z-auto lg:mt-4 lg:mb-4 lg:h-auto lg:w-auto lg:translate-y-0 lg:rounded-s-2xl lg:shadow-sm`}
        >
          <div className='flex items-center justify-between px-4 py-3'>
            <h2 className='text-[14px] leading-5 font-semibold'>填写字段</h2>
            <Button
              variant='ghost'
              size='icon'
              className='size-8 lg:hidden'
              title='收起填写栏'
              aria-label='收起填写栏'
              onClick={() => setSidebarOpen(false)}
            >
              <PanelRightClose className='size-4' />
            </Button>
          </div>
          <div className='space-y-3 px-4 py-3'>
            {app.fields.map((field) => (
              <div key={field.fieldKey}>
                <Label>
                  {field.description}
                  {field.required && (
                    <span className='ms-1 text-destructive'>*</span>
                  )}
                </Label>
                {field.type === 'stamp' ? (
                  <div className='mt-2 space-y-3'>
                    {field.config?.stampTextEditable === true && (
                      <div><Label className='text-xs text-muted-foreground'>印章文字</Label><Input className='mt-1' value={values[`${field.fieldKey}__stampText`] ?? String(field.config?.stampText || '')} onChange={(e) => setValues({ ...values, [`${field.fieldKey}__stampText`]: e.target.value })} /></div>
                    )}
                    {field.config?.stampMiddleTextEditable === true && (
                      <div><Label className='text-xs text-muted-foreground'>印章中间文字</Label><Input className='mt-1' value={values[`${field.fieldKey}__stampMiddleText`] ?? String(field.config?.stampMiddleText || '')} onChange={(e) => setValues({ ...values, [`${field.fieldKey}__stampMiddleText`]: e.target.value })} /></div>
                    )}
                    {field.config?.stampCodeEditable === true && (
                      <div><Label className='text-xs text-muted-foreground'>印章编码</Label><Input className='mt-1' value={values[`${field.fieldKey}__stampCode`] ?? String(field.config?.stampCode || '')} onChange={(e) => setValues({ ...values, [`${field.fieldKey}__stampCode`]: e.target.value })} /></div>
                    )}
                    <div className='space-y-3 rounded-md border p-3'>
                      <Label className='text-xs font-medium text-muted-foreground'>印章样式调节</Label>
                      {[
                        ['starSize', '五角星大小', 0.1, 0.6, 0.3],
                        ['orgSize', '名称字号', 0.1, 0.3, 0.1666],
                        ['orgHeight', '名称高度', 0.8, 2.5, 1],
                        ['orgStretch', '名称拉伸', 0.3, 1, 1],
                        ['orgDistribution', '文字分布', 0.5, 1.5, 1],
                        ['codeDistribution', '编码分布', 0.5, 2, 1],
                        ['middleSize', '专用章字号', 0.05, 0.2, 0.095],
                        ['middleDistribution', '专用章分布', 0, 3, 1],
                        ['opacity', '透明度', 0.1, 1, 0.88],
                      ].map(([key, label, min, max, fallback]) => {
                        const value = Number(values[`${field.fieldKey}__${key}`] ?? field.config?.[String(key)] ?? fallback)
                        return (
                          <div key={String(key)} className='space-y-1.5'>
                            <div className='flex items-center justify-between gap-2'>
                              <Label className='text-xs'>{String(label)}</Label>
                              <span className='text-xs tabular-nums text-muted-foreground'>{value}</span>
                            </div>
                            <Slider
                              min={Number(min)}
                              max={Number(max)}
                              step={String(key) === 'orgHeight' || String(key) === 'middleDistribution' ? 0.1 : 0.01}
                              value={[value]}
                              onValueChange={(next) => setValues({ ...values, [`${field.fieldKey}__${String(key)}`]: String(next[0] ?? value) })}
                            />
                          </div>
                        )
                      })}
                      <label className='flex items-center gap-2 text-sm'>
                        <Checkbox
                          checked={values[`${field.fieldKey}__stampTexture`] === undefined ? field.config?.stampTexture !== false : values[`${field.fieldKey}__stampTexture`] === 'true'}
                          onCheckedChange={(checked) => setValues({ ...values, [`${field.fieldKey}__stampTexture`]: String(checked === true) })}
                        />
                        <span>启用印章纹理</span>
                      </label>
                      <Button
                        type='button'
                        variant='outline'
                        className='w-full'
                        onClick={() => resetStampValues(field.fieldKey)}
                      >
                        重置为默认值
                      </Button>
                    </div>
                  </div>
                ) : field.type === 'text' ? (
                  <Textarea
                    className='mt-1 min-h-20 resize-y'
                    value={values[field.fieldKey] || ''}
                    onChange={(e) =>
                      setValues({ ...values, [field.fieldKey]: e.target.value })
                    }
                  />
                ) : (
                  <Input
                    className='mt-1'
                    type='file'
                    accept='image/*'
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const imageData = await readImageForSubmission(file)
                        setValues({ ...values, [field.fieldKey]: imageData })
                      } catch {
                        toast.error('图片读取失败，请重新选择')
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <Button
            className='mx-4 mt-1 mb-4 w-[calc(100%-2rem)]'
            onClick={requestSubmit}
          >
            <Download className='me-2 size-4' />
            提交并导出
          </Button>
        </aside>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认提交并导出？</AlertDialogTitle>
            <AlertDialogDescription>
              本次操作将扣除 {app.price || 0}{' '}
              积分，确认后会提交填写内容并生成图片。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                void submit()
              }}
            >
              确认并导出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
