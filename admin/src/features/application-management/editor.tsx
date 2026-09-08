import { type MouseEvent, useEffect, useRef, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Copy,
  Eraser,
  Grid3X3,
  ImagePlus,
  ImageUp,
  PanelLeft,
  PanelLeftClose,
  Palette,
  Pencil,
  Pipette,
  Redo2,
  RotateCcw,
  Save,
  Stamp,
  Type,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { drawHighFidelityStamp } from '@/lib/stamp-renderer'

const route = getRouteApi('/_authenticated/application-management/$id/edit')
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
type Field = {
  fieldKey: string
  description: string
  type: string
  required: boolean
  config?: Record<string, unknown>
}
type Application = {
  id: string
  name: string
  description: string
  category: string
  price: number
  coverUrl?: string | null
  fields: Field[]
}
type Point = { x: number; y: number }
const clone = (items: Field[]) =>
  items.map((f) => ({ ...f, config: { ...(f.config || {}) } }))
const fieldColors = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]
const sanitizeContent = (value: string, type: string, maxLength: number) => {
  let next = value
  if (type === 'number') next = next.replace(/[^0-9.-]/g, '')
  if (type === 'phone') next = next.replace(/\D/g, '').slice(0, 11)
  if (type === 'idCard') next = next.replace(/[^0-9Xx]/g, '').slice(0, 18)
  return maxLength > 0 ? next.slice(0, maxLength) : next
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  config: Record<string, unknown>
) {
  const size = Math.min(rect.width, rect.height)
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const radius = size * 0.42
  const color = String(config.stampColor || '#dc2626')
  const opacity = Math.max(0, Math.min(1, Number(config.opacity ?? 0.88)))
  const title = String(config.stampText || '印章文字')
  const code = String(config.stampCode || '')
  const borderWidth = Math.max(2, size * 0.025)
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = borderWidth
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.84, 0, Math.PI * 2)
  ctx.stroke()
  const points = 5
  const starRadius = radius * 0.38
  ctx.beginPath()
  for (let i = 0; i < points * 2; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const r = i % 2 === 0 ? starRadius : starRadius * 0.42
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  const drawArcText = (text: string, radiusValue: number, start: number, fontSize: number) => {
    if (!text) return
    const chars = Array.from(text)
    ctx.font = `bold ${fontSize}px Microsoft YaHei, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    chars.forEach((char, index) => {
      const angle = start + (index / Math.max(1, chars.length - 1) - 0.5) * 1.8
      ctx.save()
      ctx.translate(cx + Math.cos(angle) * radiusValue, cy + Math.sin(angle) * radiusValue)
      ctx.rotate(angle + Math.PI / 2)
      ctx.fillText(char, 0, 0)
      ctx.restore()
    })
  }
  drawArcText(title, radius * 0.69, -Math.PI / 2, Math.max(10, size * 0.105))
  if (code) drawArcText(code, radius * 0.69, Math.PI / 2, Math.max(8, size * 0.075))
  if (config.stampTexture !== false) {
    ctx.save()
    ctx.globalAlpha = opacity * 0.22
    ctx.lineWidth = Math.max(1, size * 0.008)
    for (let i = -radius; i < radius; i += Math.max(5, size * 0.035)) {
      ctx.beginPath()
      ctx.moveTo(cx - radius, cy + i)
      ctx.lineTo(cx + radius, cy + i + radius * 0.12)
      ctx.stroke()
    }
    ctx.restore()
  }
  ctx.restore()
}

export function ApplicationEditor() {
  const { id } = route.useParams()
  const navigate = useNavigate()
  const token = useAuthStore.getState().auth.accessToken
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldImageCacheRef = useRef(new Map<string, HTMLImageElement>())
  const canvasViewportRef = useRef<HTMLDivElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const fieldImageInputRef = useRef<HTMLInputElement>(null)
  const [app, setApp] = useState<Application | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [selected, setSelected] = useState(-1)
  const [cover, setCover] = useState('')
  const [grid, setGrid] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [insertMode, setInsertMode] = useState<'text' | 'image' | 'stamp'>('text')
  const [pickingTextColor, setPickingTextColor] = useState(false)
  const [pickPoint, setPickPoint] = useState<Point | null>(null)
  const [canvasCursor, setCanvasCursor] = useState<
    'crosshair' | 'move' | 'nwse-resize' | 'cell'
  >('crosshair')
  const [history, setHistory] = useState<Field[][]>([])
  const [redo, setRedo] = useState<Field[][]>([])
  const [selectionRect, setSelectionRect] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const [canvasBox, setCanvasBox] = useState({ width: 0, height: 0 })
  const [, setLayoutTick] = useState(0)
  const [interaction, setInteraction] = useState<{
    mode: 'select' | 'move' | 'resize'
    start: Point
    base: Record<string, number>
  } | null>(null)
  useEffect(() => {
    fetch(`${apiUrl}/applications/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: Application) => {
        setApp(data)
        setCover(data.coverUrl || '')
        setFields(
          (data.fields || []).map((f) => ({ ...f, config: f.config || {} }))
        )
      })
      .catch(() => toast.error('加载病例失败'))
  }, [id])
  useEffect(() => {
    const update = () => {
      const canvas = canvasRef.current
      if (canvas)
        setCanvasBox({ width: canvas.clientWidth, height: canvas.clientHeight })
    }
    update()
    window.addEventListener('resize', update)
    const viewport = canvasViewportRef.current
    const refreshLayout = () => setLayoutTick((value) => value + 1)
    viewport?.addEventListener('scroll', refreshLayout, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', refreshLayout)
    }
  }, [cover, fields, sidebarOpen])
  useEffect(() => {
    if (fields.length === 0) setSidebarOpen(false)
  }, [fields.length])
  const pushHistory = () => {
    setHistory((h) => [...h.slice(-29), clone(fields)])
    setRedo([])
  }
  const rectOf = (f: Field) => {
    const c = f.config || {}
    return {
      x: Number(c.x ?? 40),
      y: Number(c.y ?? 40),
      width: Number(c.width ?? 300),
      height: Number(c.height ?? 60),
    }
  }
  const updateRect = (key: 'x' | 'y' | 'width' | 'height', value: number) => {
    if (selected < 0) return
    const current = fields[selected]
    const currentRect = current ? rectOf(current) : null
    const lockAspectRatio =
      current?.type === 'image' && current.config?.lockAspectRatio === true
    const ratio =
      currentRect && currentRect.height > 0
        ? currentRect.width / currentRect.height
        : 1
    const nextValue = Math.max(
      key === 'width' ? 40 : key === 'height' ? 30 : 0,
      value
    )
    const sizePatch =
      lockAspectRatio && currentRect && key === 'width'
        ? {
            width: nextValue,
            height: Math.max(30, Math.round(nextValue / ratio)),
          }
        : lockAspectRatio && currentRect && key === 'height'
          ? {
              height: nextValue,
              width: Math.max(40, Math.round(nextValue * ratio)),
            }
          : { [key]: nextValue }
    updateSelected({
      config: {
        ...sizePatch,
        ...(fields[selected]?.type === 'image' &&
        (key === 'width' || key === 'height')
          ? { imageRatio: 'custom' }
          : {}),
      },
    })
  }
  const resetStyle = () => {
    if (selected < 0) return
    pushHistory()
    const field = fields[selected]
    if (field?.type === 'stamp') {
      updateSelected({
        config: {
          stampColor: '#ff0000',
          stampTexture: true,
          starSize: 0.3,
          orgSize: 0.1666,
          orgHeight: 1,
          orgStretch: 1,
          orgDistribution: 1,
          codeDistribution: 1,
          middleSize: 0.095,
          middleDistribution: 1,
          opacity: 0.88,
        },
      })
      return
    }
    if (field?.type === 'image') {
      updateSelected({
        config: {
          imageFit: 'cover',
          imageRatio: 'custom',
          imagePositionX: 0,
          imagePositionY: 0,
          opacity: 1,
          lockAspectRatio: false,
        },
      })
      return
    }
    updateSelected({
      config: {
        fontFamily: 'Microsoft YaHei',
        fontSize: 16,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textColor: '#1f2937',
        textAlign: 'left',
        verticalAlign: 'top',
        lineHeight: 1.2,
        charSpacing: 0,
        textIndent: 0,
        autoWrap: true,
        opacity: 1,
      },
    })
  }
  const setImageRatio = (value: string) => {
    if (selected < 0) return
    if (value === 'custom') {
      updateSelected({ config: { imageRatio: 'custom' } })
      return
    }
    const ratio = Number(value)
    if (!Number.isFinite(ratio) || ratio <= 0) return
    const rect = rectOf(fields[selected])
    updateSelected({
      config: {
        imageRatio: value,
        height: Math.max(30, Math.round(rect.width / ratio)),
      },
    })
  }
  const estimateTextOverflow = (field: Field) => {
    if (field.type !== 'text') return false
    const cfg = field.config || {}
    const content = String(cfg.content || '')
    if (!content) return false
    const r = rectOf(field)
    const fontSize = Number(cfg.fontSize || 16)
    const lineHeight = Number(cfg.lineHeight || 1.2) * fontSize
    const maxChars = Math.max(1, Math.floor(r.width / (fontSize * 0.9)))
    const lines =
      cfg.autoWrap === false
        ? content.split('\n')
        : content
            .split('\n')
            .flatMap(
              (line) => line.match(new RegExp(`.{1,${maxChars}}`, 'g')) || ['']
            )
    return lines.length * lineHeight > r.height
  }
  const snap = (n: number) => (grid ? Math.round(n / 10) * 10 : Math.round(n))
  const point = (e: MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: (e.clientX - r.left) * (e.currentTarget.width / r.width),
      y: (e.clientY - r.top) * (e.currentTarget.height / r.height),
    }
  }
  const draw = (showGuides = true) => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const paint = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      if (grid) {
        ctx.strokeStyle = 'rgba(100,116,139,.18)'
        for (let x = 0; x < c.width; x += 20) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, c.height)
          ctx.stroke()
        }
        for (let y = 0; y < c.height; y += 20) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(c.width, y)
          ctx.stroke()
        }
      }
      fields.forEach((f, i) => {
        const r = rectOf(f)
        const cfg = f.config || {}
        if (f.type === 'stamp') {
          drawHighFidelityStamp(ctx, r, cfg)
        } else if (
          f.type === 'image' &&
          typeof cfg.imageSrc === 'string' &&
          cfg.imageSrc
        ) {
          let image = fieldImageCacheRef.current.get(cfg.imageSrc)
          if (!image) {
            image = new Image()
            fieldImageCacheRef.current.set(cfg.imageSrc, image)
            image.onload = () => draw()
            image.src = cfg.imageSrc
          }
          if (image.complete && image.naturalWidth > 0) {
            ctx.save()
            ctx.globalAlpha = Math.max(0, Math.min(1, Number(cfg.opacity ?? 1)))
            ctx.beginPath()
            ctx.rect(r.x, r.y, r.width, r.height)
            ctx.clip()
            const mode = String(cfg.imageFit || 'fill')
            if (mode === 'fill') {
              ctx.drawImage(image, r.x, r.y, r.width, r.height)
            } else {
              const ratio =
                mode === 'cover'
                  ? Math.max(
                      r.width / image.naturalWidth,
                      r.height / image.naturalHeight
                    )
                  : Math.min(
                      r.width / image.naturalWidth,
                      r.height / image.naturalHeight
                    )
              const width = image.naturalWidth * ratio
              const height = image.naturalHeight * ratio
              const positionX = Math.max(
                -100,
                Math.min(100, Number(cfg.imagePositionX ?? 0))
              )
              const positionY = Math.max(
                -100,
                Math.min(100, Number(cfg.imagePositionY ?? 0))
              )
              ctx.drawImage(
                image,
                r.x +
                  (r.width - width) / 2 +
                  ((r.width - width) / 2) * (positionX / 100),
                r.y +
                  (r.height - height) / 2 +
                  ((r.height - height) / 2) * (positionY / 100),
                width,
                height
              )
            }
            ctx.restore()
          }
        } else if (typeof cfg.content === 'string' && cfg.content) {
          ctx.save()
          ctx.globalAlpha = Math.max(0, Math.min(1, Number(cfg.opacity ?? 1)))
          ctx.fillStyle = String(cfg.textColor || '#1f2937')
          ctx.font = `${cfg.fontStyle === 'italic' ? 'italic ' : ''}${cfg.fontWeight === 'bold' ? 'bold ' : ''}${Number(cfg.fontSize || 16)}px ${String(cfg.fontFamily || 'Microsoft YaHei')}`
          ctx.textAlign = (cfg.textAlign as CanvasTextAlign) || 'left'
          const lineHeight =
            Number(cfg.lineHeight || 1.2) * Number(cfg.fontSize || 16)
          const charSpacing = Number(cfg.charSpacing || 0)
          const rawLines = String(cfg.content).split('\n')
          const wrapLine = (line: string) => {
            if (cfg.autoWrap === false || !line) return [line]
            const chars = Array.from(line)
            const wrapped: string[] = []
            let currentLine = ''
            chars.forEach((char) => {
              const candidate = currentLine + char
              const spacingWidth =
                Math.max(0, Array.from(candidate).length - 1) * charSpacing
              const availableWidth =
                r.width -
                (wrapped.length === 0 ? Number(cfg.textIndent || 0) : 0)
              if (
                currentLine &&
                ctx.measureText(candidate).width + spacingWidth > availableWidth
              ) {
                wrapped.push(currentLine)
                currentLine = char
              } else {
                currentLine = candidate
              }
            })
            if (currentLine || wrapped.length === 0) wrapped.push(currentLine)
            return wrapped
          }
          const lines = rawLines.flatMap(wrapLine)
          const verticalAlign = String(cfg.verticalAlign || 'top')
          const totalTextHeight = lines.length * lineHeight
          const verticalOffset =
            verticalAlign === 'middle'
              ? Math.max(0, (r.height - totalTextHeight) / 2)
              : verticalAlign === 'bottom'
                ? Math.max(0, r.height - totalTextHeight)
                : 0
          const metrics = ctx.measureText('国')
          const ascent =
            metrics.actualBoundingBoxAscent || Number(cfg.fontSize || 16) * 0.8
          const descent =
            metrics.actualBoundingBoxDescent || Number(cfg.fontSize || 16) * 0.2
          const baselineOffset = (lineHeight + ascent - descent) / 2
          const drawLine = (line: string, x: number, y: number) => {
            if (!charSpacing) {
              ctx.fillText(line, x, y)
              return
            }
            const chars = Array.from(line)
            const widths = chars.map((char) => ctx.measureText(char).width)
            const totalWidth =
              widths.reduce((sum, width) => sum + width, 0) +
              Math.max(0, chars.length - 1) * charSpacing
            let cursor =
              cfg.textAlign === 'center'
                ? x - totalWidth / 2
                : cfg.textAlign === 'right'
                  ? x - totalWidth
                  : x
            chars.forEach((char, index) => {
              ctx.fillText(char, cursor, y)
              cursor += widths[index] + charSpacing
            })
          }
          lines.forEach((line, lineIndex) =>
            drawLine(
              line,
              r.x +
                (cfg.textAlign === 'center'
                  ? r.width / 2
                  : cfg.textAlign === 'right'
                    ? r.width
                    : lineIndex === 0
                      ? Number(cfg.textIndent || 0)
                      : 0),
              r.y + verticalOffset + lineHeight * lineIndex + baselineOffset
            )
          )
          ctx.restore()
        }
        if (!showGuides) return
        const radius = 6
        ctx.beginPath()
        ctx.roundRect(r.x, r.y, r.width, r.height, radius)
        ctx.fillStyle =
          i === selected ? 'rgba(37,99,235,.08)' : 'rgba(100,116,139,.035)'
        ctx.fill()
        ctx.setLineDash(i === selected ? [6, 4] : [5, 5])
        ctx.strokeStyle =
          i === selected
            ? '#2563eb'
            : String(cfg.color || fieldColors[i % fieldColors.length])
        ctx.lineWidth = i === selected ? 2 : 1.25
        ctx.stroke()
        ctx.setLineDash([])
        if (i === selected) {
          ctx.fillStyle = '#fff'
          ctx.strokeStyle = '#2563eb'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(r.x + r.width, r.y + r.height, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      })
      if (showGuides && selectionRect) {
        const r = selectionRect
        ctx.save()
        ctx.fillStyle = 'rgba(37,99,235,.10)'
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 1.5
        ctx.setLineDash([7, 4])
        ctx.beginPath()
        ctx.roundRect(r.x, r.y, r.width, r.height, 8)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      }
    }
    if (cover) {
      const image = new Image()
      image.onload = () => {
        c.width = image.naturalWidth || 1200
        c.height = image.naturalHeight || 800
        paint()
        setCanvasBox({ width: c.clientWidth, height: c.clientHeight })
      }
      image.src = cover
    } else {
      c.width = 1200
      c.height = 800
      paint()
    }
  }
  useEffect(() => {
    draw()
  }, [cover, fields, selected, grid, selectionRect, zoom])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selected < 0 || !fields[selected]) return
      const target = event.target as HTMLElement
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !target.matches('input, textarea, [contenteditable="true"]')
      ) {
        event.preventDefault()
        removeSelected()
        return
      }
      if (event.key === 'Escape' && pickingTextColor) {
        setPickingTextColor(false)
        setPickPoint(null)
        return
      }
      if (
        !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
      )
        return
      if (fields[selected].config?.locked === true) return
      const step = event.shiftKey ? 10 : 1
      const r = rectOf(fields[selected])
      const dx =
        event.key === 'ArrowLeft'
          ? -step
          : event.key === 'ArrowRight'
            ? step
            : 0
      const dy =
        event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
      event.preventDefault()
      pushHistory()
      updateSelected({ config: { x: r.x + dx, y: r.y + dy } })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, fields, pickingTextColor])
  const hit = (p: Point) =>
    fields.findIndex((f) => {
      const r = rectOf(f)
      return (
        p.x >= r.x &&
        p.x <= r.x + r.width &&
        p.y >= r.y &&
        p.y <= r.y + r.height
      )
    })
  const down = (e: MouseEvent<HTMLCanvasElement>) => {
    const p = point(e)
    if (pickingTextColor) {
      if (!cover) {
        toast.error('请先上传底图')
        setPickingTextColor(false)
        return
      }
      setCanvasCursor('cell')
      const image = new Image()
      image.onload = () => {
        const sampleCanvas = document.createElement('canvas')
        sampleCanvas.width = canvasRef.current?.width || image.naturalWidth
        sampleCanvas.height = canvasRef.current?.height || image.naturalHeight
        const sampleContext = sampleCanvas.getContext('2d')
        if (!sampleContext) return
        sampleContext.drawImage(
          image,
          0,
          0,
          sampleCanvas.width,
          sampleCanvas.height
        )
        const pixel = sampleContext.getImageData(
          Math.max(0, Math.min(sampleCanvas.width - 1, Math.round(p.x))),
          Math.max(0, Math.min(sampleCanvas.height - 1, Math.round(p.y))),
          1,
          1
        ).data
        const hex = `#${[pixel[0], pixel[1], pixel[2]]
          .map((value) => value.toString(16).padStart(2, '0'))
          .join('')}`
        updateSelected({ config: { textColor: hex } })
        setPickingTextColor(false)
        setPickPoint(null)
        toast.success(`已取色 ${hex}`)
      }
      image.src = cover
      return
    }
    const i = hit(p)
    if (i >= 0) {
      const r = rectOf(fields[i])
      setSelected(i)
      if (fields[i].config?.locked === true) return
      pushHistory()
      setInteraction({
        mode:
          p.x > r.x + r.width - 18 && p.y > r.y + r.height - 18
            ? 'resize'
            : 'move',
        start: p,
        base: r,
      })
      setCanvasCursor(
        p.x > r.x + r.width - 18 && p.y > r.y + r.height - 18
          ? 'nwse-resize'
          : 'move'
      )
      return
    }
    setSelected(-1)
    setEditOpen(false)
    setSelectionRect(null)
    setInteraction({
      mode: 'select',
      start: p,
      base: { x: 0, y: 0, width: 0, height: 0 },
    })
    setCanvasCursor('crosshair')
  }
  const move = (e: MouseEvent<HTMLCanvasElement>) => {
    if (pickingTextColor) {
      setPickPoint(point(e))
      setCanvasCursor('cell')
      return
    }
    if (!interaction) {
      const p = point(e)
      const index = hit(p)
      if (index >= 0) {
        const r = rectOf(fields[index])
        setCanvasCursor(
          p.x > r.x + r.width - 18 && p.y > r.y + r.height - 18
            ? 'nwse-resize'
            : 'move'
        )
      } else {
        setCanvasCursor('crosshair')
      }
      return
    }
    setCanvasCursor(interaction.mode === 'resize' ? 'nwse-resize' : 'move')
    const p = point(e)
    if (interaction.mode === 'select') {
      setSelectionRect({
        x: Math.min(interaction.start.x, p.x),
        y: Math.min(interaction.start.y, p.y),
        width: Math.abs(p.x - interaction.start.x),
        height: Math.abs(p.y - interaction.start.y),
      })
      return
    }
    const dx = p.x - interaction.start.x
    const dy = p.y - interaction.start.y
    const b = interaction.base
    setFields((items) =>
      items.map((f, i) =>
        i !== selected
          ? f
          : {
              ...f,
              config: {
                ...(f.config || {}),
                x: interaction.mode === 'move' ? snap(b.x + dx) : b.x,
                y: interaction.mode === 'move' ? snap(b.y + dy) : b.y,
                ...(interaction.mode === 'resize'
                  ? (() => {
                      const nextWidth = Math.max(40, snap(b.width + dx))
                      const nextHeight = Math.max(30, snap(b.height + dy))
                      if (
                        f.type !== 'image' ||
                        f.config?.lockAspectRatio !== true
                      )
                        return { width: nextWidth, height: nextHeight }
                      const ratio = b.width / Math.max(1, b.height)
                      const scale =
                        Math.abs(dx) >= Math.abs(dy)
                          ? nextWidth / Math.max(1, b.width)
                          : nextHeight / Math.max(1, b.height)
                      const width = Math.max(40, snap(b.width * scale))
                      return {
                        width,
                        height: Math.max(30, snap(width / ratio)),
                      }
                    })()
                  : { width: b.width, height: b.height }),
                ...(f.type === 'image' && interaction.mode === 'resize'
                  ? { imageRatio: 'custom' }
                  : {}),
              },
            }
      )
    )
  }
  const up = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!interaction) return
    if (interaction.mode === 'select') {
      const p = point(e)
      const x = Math.min(interaction.start.x, p.x)
      const y = Math.min(interaction.start.y, p.y)
      const width = Math.abs(p.x - interaction.start.x)
      const height = Math.abs(p.y - interaction.start.y)
      if (width > 45 && height > 35) {
        pushHistory()
        const next = [
          ...fields,
          {
            fieldKey: `field_${fields.length + 1}`,
            description: '新字段',
            type: insertMode,
            required: false,
            config: {
              x: snap(x),
              y: snap(y),
              width: snap(width),
              height: snap(height),
              fontSize: 16,
              charSpacing: 0,
              fontFamily: 'Microsoft YaHei',
              textAlign: 'left',
              ...(insertMode === 'stamp'
                ? {
                    stampText: '印章文字',
                    stampMiddleText: '专用章',
                    stampCode: '',
                    stampTextEditable: true,
                    stampMiddleTextEditable: true,
                    stampCodeEditable: false,
                    stampColor: '#dc2626',
                    stampTexture: true,
                    starSize: 0.3,
                    orgSize: 0.1666,
                    orgHeight: 1,
                    orgStretch: 1,
                    orgDistribution: 1,
                    codeDistribution: 1,
                    middleSize: 0.095,
                    middleDistribution: 1,
                    opacity: 0.88,
                  }
                : {}),
            },
          },
        ]
        setFields(next)
        setSelected(next.length - 1)
      }
      setSelectionRect(null)
    }
    setInteraction(null)
    setCanvasCursor('crosshair')
  }
  const updateSelected = (
    patch: Partial<Field> & { config?: Record<string, unknown> }
  ) =>
    setFields((items) =>
      items.map((f, i) =>
        i === selected
          ? {
              ...f,
              ...patch,
              config: { ...(f.config || {}), ...(patch.config || {}) },
            }
          : f
      )
    )
  const save = async () => {
    if (!app) return
    const r = await fetch(`${apiUrl}/applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: app.name,
        description: app.description,
        category: app.category,
        price: app.price,
        coverUrl: cover,
        fields,
      }),
    })
    if (!r.ok) return toast.error('保存失败')
    toast.success('病例编辑已保存')
  }
  const upload = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCover(String(reader.result))
      toast.success('底图上传成功')
    }
    reader.onerror = () => toast.error('底图读取失败')
    reader.readAsDataURL(file)
  }
  const uploadFieldImage = (file?: File) => {
    if (!file || selected < 0) return
    const reader = new FileReader()
    reader.onload = () => {
      pushHistory()
      updateSelected({
        type: 'image',
        config: { imageSrc: String(reader.result) },
      })
      toast.success('字段图片已上传')
    }
    reader.readAsDataURL(file)
  }
  const undo = () => {
    const prev = history[history.length - 1]
    if (!prev) return
    setRedo((r) => [...r, clone(fields)])
    setFields(prev)
    setHistory((h) => h.slice(0, -1))
  }
  const redoLast = () => {
    const next = redo[redo.length - 1]
    if (!next) return
    setHistory((h) => [...h, clone(fields)])
    setFields(next)
    setRedo((r) => r.slice(0, -1))
  }
  if (!app)
    return (
      <main className='p-6 text-muted-foreground'>正在加载可视化编辑器...</main>
    )
  const current = fields[selected]
  const config = current?.config || {}
  const copySelected = () => {
    if (selected < 0 || !fields[selected]) return
    const source = fields[selected]
    const sourceRect = rectOf(source)
    pushHistory()
    const copy: Field = {
      ...source,
      fieldKey: `${source.fieldKey}_copy_${fields.length + 1}`,
      description: `${source.description || '新字段'} 副本`,
      config: {
        ...(source.config || {}),
        x: sourceRect.x + 20,
        y: sourceRect.y + 20,
        color: fieldColors[(selected + 1) % fieldColors.length],
      },
    }
    setFields((items) => [...items, copy])
    setSelected(fields.length)
    setEditOpen(true)
  }
  const removeSelected = () => {
    if (selected < 0) return
    pushHistory()
    setFields((items) => items.filter((_, index) => index !== selected))
    setSelected(-1)
    setEditOpen(false)
  }
  const selectedToolbarStyle =
    current && canvasBox.width > 0
      ? (() => {
          const r = rectOf(current)
          const canvas = canvasRef.current
          const scaleX = canvas ? canvas.clientWidth / canvas.width : 1
          const scaleY = canvas ? canvas.clientHeight / canvas.height : 1
          const centerX = (r.x + r.width / 2) * scaleX
          const topY = r.y * scaleY
          const bottomY = (r.y + r.height) * scaleY
          const toolbarGap = 8 / zoom
          const toolbarTop =
            topY > 58 ? topY - toolbarGap : bottomY + toolbarGap
          return {
            left: Math.max(110, Math.min(canvasBox.width - 110, centerX)),
            top: toolbarTop,
            transform:
              topY > 58
                ? `translate(-50%, -100%) scale(${1 / zoom})`
                : `translateX(-50%) scale(${1 / zoom})`,
          }
        })()
      : undefined
  return (
    <main className='fixed inset-0 z-50 flex min-h-0 flex-col gap-4 overflow-auto bg-background p-4 md:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <Button
          variant='ghost'
          onClick={() => navigate({ to: '/application-management' })}
        >
          <ArrowLeft className='me-2 size-4' />
          返回病例管理
        </Button>
        <div className='flex flex-wrap gap-2'>
          <input
            ref={coverInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <input
            ref={fieldImageInputRef}
            type='file'
            accept='image/*'
            className='hidden'
            onChange={(e) => uploadFieldImage(e.target.files?.[0])}
          />
          <Button
            variant='ghost'
            size='icon'
            className='text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/50'
            title='上传底图'
            aria-label='上传底图'
            onClick={() => coverInputRef.current?.click()}
          >
            <ImageUp className='size-4' />
          </Button>
          <Button
            variant={insertMode === 'text' ? 'secondary' : 'ghost'}
            size='icon'
            title='文字字段'
            aria-label='文字字段'
            className='text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/50'
            onClick={() => setInsertMode('text')}
          >
            <Type className='size-4' />
          </Button>
          <Button
            variant={insertMode === 'image' ? 'secondary' : 'ghost'}
            size='icon'
            title='图片字段'
            aria-label='图片字段'
            className='text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/50'
            onClick={() => setInsertMode('image')}
          >
            <ImagePlus className='size-4' />
          </Button>
          <Button
            variant={insertMode === 'stamp' ? 'secondary' : 'ghost'}
            size='icon'
            title='印章字段'
            aria-label='印章字段'
            className='text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/50'
            onClick={() => setInsertMode('stamp')}
          >
            <Stamp className='size-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            title='展开/收缩侧边栏'
            aria-label='展开/收缩侧边栏'
            className='text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/50'
            onClick={() => {
              if (!sidebarOpen && fields.length === 0) {
                toast.info('请先在底图上拖拽添加字段')
                return
              }
              setSidebarOpen(!sidebarOpen)
            }}
          >
            {sidebarOpen ? <PanelLeftClose /> : <PanelLeft />}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50'
            title='撤销'
            aria-label='撤销'
            onClick={undo}
          >
            <Undo2 />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50'
            title='还原'
            aria-label='还原'
            onClick={redoLast}
          >
            <Redo2 />
          </Button>
          <Button
            variant={grid ? 'secondary' : 'ghost'}
            size='icon'
            title='网格吸附'
            aria-label='网格吸附'
            className='text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/50'
            onClick={() => setGrid(!grid)}
          >
            <Grid3X3 />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            title='清空字段'
            aria-label='清空字段'
            className='text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/50'
            onClick={() => {
              pushHistory()
              setFields([])
              setSelected(-1)
            }}
          >
            <Eraser />
          </Button>
          <Button
            size='icon'
            title='保存病例'
            aria-label='保存病例'
            className='bg-emerald-600 text-white hover:bg-emerald-700'
            onClick={save}
          >
            <Save />
          </Button>
        </div>
      </div>
      <div
        className={`grid min-h-0 flex-1 gap-4 ${sidebarOpen && editOpen ? 'lg:grid-cols-[180px_minmax(0,1fr)_280px]' : sidebarOpen ? 'lg:grid-cols-[180px_minmax(0,1fr)]' : editOpen ? 'lg:grid-cols-[minmax(0,1fr)_280px]' : 'lg:grid-cols-1'}`}
      >
        {sidebarOpen && fields.length > 0 && (
          <Card className='-ms-4 gap-0 overflow-hidden rounded-s-none border-s-0 py-0 md:-ms-6'>
            <CardHeader className='px-5 py-4'>
              <CardTitle className='text-[14px] leading-5 font-semibold'>
                字段列表
              </CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              {fields.map((f, i) => (
                <button
                  type='button'
                  key={f.fieldKey + i}
                  className={`flex w-full items-center gap-2 border-b px-4 py-3 text-left text-sm transition-colors last:border-b-0 ${i === selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'}`}
                  onClick={() => {
                    setSelected(i)
                    setEditOpen(true)
                  }}
                >
                  <span
                    className='size-2 shrink-0 rounded-full'
                    style={{
                      backgroundColor:
                        i === selected
                          ? '#2563eb'
                          : String(
                              f.config?.color ||
                                fieldColors[i % fieldColors.length]
                            ),
                    }}
                  />
                  <span className='min-w-0 flex-1 truncate'>
                    {f.description || '新字段'}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
        <section className='relative flex min-h-0 min-w-0 flex-col'>
          <h1 className='mb-3 px-1 text-lg font-semibold'>
            {app.name} · 可视化编辑
          </h1>
          <div
            ref={canvasViewportRef}
            className='flex min-h-0 flex-1 items-start justify-start overflow-auto bg-muted/20 p-2 md:p-4'
          >
            <div
              className='relative flex min-h-full min-w-full shrink-0 items-center justify-center'
              style={{
                width: Math.max(128, canvasBox.width * zoom + 128),
                height: Math.max(128, canvasBox.height * zoom + 128),
              }}
            >
              <div
                className='relative isolate inline-block leading-none transition-transform duration-150'
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
              >
                {cover && (
                  <img
                    src={cover}
                    alt='底图'
                    className='pointer-events-none absolute inset-0 z-0 h-full w-full object-fill select-none'
                    draggable={false}
                  />
                )}
                <canvas
                  ref={canvasRef}
                  onMouseDown={down}
                  onMouseMove={move}
                  onMouseUp={up}
                  onMouseLeave={(e) => {
                    if (interaction?.mode === 'select') up(e)
                    if (pickingTextColor) setPickPoint(null)
                    setCanvasCursor('crosshair')
                  }}
                  style={{ imageRendering: 'auto', cursor: canvasCursor }}
                  className='relative z-10 block h-auto max-h-[calc(100vh-180px)] w-auto max-w-full object-contain'
                />
                {pickingTextColor &&
                  pickPoint &&
                  canvasRef.current &&
                  cover && (
                    <div
                      className='pointer-events-none absolute z-20 size-28 overflow-hidden rounded-full border-2 border-white shadow-[0_2px_14px_rgba(15,23,42,.35)]'
                      style={{
                        left:
                          pickPoint.x *
                            (canvasRef.current.clientWidth /
                              canvasRef.current.width) -
                          56,
                        top:
                          pickPoint.y *
                            (canvasRef.current.clientHeight /
                              canvasRef.current.height) -
                          56,
                        backgroundImage: `url(${cover})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: `${canvasRef.current.clientWidth * 4}px ${canvasRef.current.clientHeight * 4}px`,
                        backgroundPosition: `${-(pickPoint.x * (canvasRef.current.clientWidth / canvasRef.current.width) * 4 - 56)}px ${-(pickPoint.y * (canvasRef.current.clientHeight / canvasRef.current.height) * 4 - 56)}px`,
                      }}
                    >
                      <span className='absolute inset-x-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/90 shadow-[0_0_2px_rgba(15,23,42,.8)]' />
                      <span className='absolute inset-y-1/2 start-0 h-px w-full -translate-y-1/2 bg-white/90 shadow-[0_0_2px_rgba(15,23,42,.8)]' />
                    </div>
                  )}
                {current && selectedToolbarStyle && (
                  <div
                    className='absolute z-[100] flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur'
                    style={selectedToolbarStyle}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 px-2 text-xs'
                      title='编辑字段'
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className='me-1 size-3.5' />
                      编辑
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 px-2 text-xs'
                      title='复制字段'
                      onClick={copySelected}
                    >
                      <Copy className='me-1 size-3.5' />
                      复制
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 px-2 text-xs text-destructive hover:text-destructive'
                      title='删除字段'
                      onClick={removeSelected}
                    >
                      <Trash2 className='me-1 size-3.5' />
                      删除
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className='absolute right-4 bottom-4 z-20 flex w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur'>
              <ZoomOut className='size-3.5 shrink-0 text-muted-foreground' />
              <Slider
                min={0.5}
                max={2}
                step={0.01}
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                aria-label='底图缩放比例'
                className='flex-1'
              />
              <ZoomIn className='size-3.5 shrink-0 text-muted-foreground' />
              <span className='min-w-10 text-right text-xs tabular-nums'>
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='size-7 shrink-0'
                title='重置底图'
                aria-label='重置底图'
                onClick={() => setZoom(1)}
              >
                <RotateCcw className='size-4' />
              </Button>
            </div>
          </div>
        </section>
        {editOpen && current && (
          <Card className='-me-4 min-h-0 gap-0 overflow-auto rounded-s-xl rounded-e-none border-e-0 p-0 shadow-sm md:-me-6'>
            <CardHeader className='px-4 py-2'>
              <CardTitle className='text-right text-[14px] leading-5 font-semibold'>
                编辑字段属性
              </CardTitle>
            </CardHeader>
            {current && (
              <CardContent className='min-w-0 space-y-5 px-5 py-4'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    字段说明
                  </Label>
                  <Input
                    className='h-9'
                    value={current.description}
                    onChange={(e) =>
                      updateSelected({ description: e.target.value })
                    }
                  />
                </div>
                {current.type === 'stamp' && (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='space-y-1.5'>
                        <Label className='text-xs text-muted-foreground'>印章文字</Label>
                        <Input
                          className='h-9'
                          value={String(config.stampText ?? '')}
                          onChange={(e) => updateSelected({ config: { stampText: e.target.value } })}
                        />
                      </div>
                      <div className='space-y-1.5'>
                        <Label className='text-xs text-muted-foreground'>印章编码</Label>
                        <Input
                          className='h-9'
                          value={String(config.stampCode ?? '')}
                          onChange={(e) => updateSelected({ config: { stampCode: e.target.value } })}
                        />
                      </div>
                    </div>
                    <div className='space-y-1.5'>
                      <Label className='text-xs text-muted-foreground'>印章中间文字</Label>
                      <Input
                        className='h-9'
                        value={String(config.stampMiddleText ?? '专用章')}
                        onChange={(e) => updateSelected({ config: { stampMiddleText: e.target.value } })}
                        placeholder='例如：合同专用章、财务专用章'
                      />
                    </div>
                    <div className='space-y-2 rounded-md border p-3'>
                      <Label className='text-xs font-medium text-muted-foreground'>用户可填写内容</Label>
                      {[
                        ['stampTextEditable', '允许填写印章文字'],
                        ['stampMiddleTextEditable', '允许填写印章中间文字'],
                        ['stampCodeEditable', '允许填写印章编码'],
                      ].map(([key, label]) => (
                        <label key={key} className='flex items-center gap-2 text-sm'>
                          <Checkbox
                            checked={config[key] === true}
                            onCheckedChange={(checked) => updateSelected({ config: { [key]: checked === true } })}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='space-y-1.5'>
                        <Label className='text-xs text-muted-foreground'>印章颜色</Label>
                        <div className='flex h-9 items-center gap-2 rounded-md border px-2 text-sm'>
                          <span className='size-4 rounded-full bg-red-600' />
                          <span>固定红色</span>
                        </div>
                      </div>
                      <div className='space-y-1.5'>
                        <Label className='text-xs text-muted-foreground'>透明度</Label>
                        <Input
                          className='h-9'
                          type='number'
                          min='0.1'
                          max='1'
                          step='0.05'
                          value={Number(config.opacity ?? 0.88)}
                          onChange={(e) => updateSelected({ config: { opacity: Number(e.target.value) } })}
                        />
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      {[
                        ['starSize', '五角星大小', 0.1, 0.6, 0.01],
                        ['orgSize', '名称字号', 0.1, 0.3, 0.01],
                        ['orgHeight', '名称高度', 0.8, 2.5, 0.1],
                        ['orgStretch', '名称拉伸', 0.3, 1, 0.05],
                        ['orgDistribution', '文字分布', 0.5, 1.5, 0.05],
                        ['codeDistribution', '编码分布', 0.5, 2, 0.05],
                        ['middleSize', '专用章字号', 0.05, 0.2, 0.01],
                        ['middleDistribution', '专用章分布', 0, 3, 0.1],
                      ].map(([key, label, min, max, step]) => (
                        <div key={String(key)} className='space-y-1.5'>
                          <Label className='text-xs text-muted-foreground'>{String(label)}</Label>
                          <Input
                            className='h-9'
                            type='number'
                            min={Number(min)}
                            max={Number(max)}
                            step={Number(step)}
                            value={Number(config[String(key)] ?? min)}
                            onChange={(e) => updateSelected({ config: { [String(key)]: Number(e.target.value) } })}
                          />
                        </div>
                      ))}
                    </div>
                    <label className='flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm'>
                      <Checkbox
                        checked={config.stampTexture !== false}
                        onCheckedChange={(checked) => updateSelected({ config: { stampTexture: checked === true } })}
                      />
                      <span>启用印章纹理</span>
                    </label>
                  </div>
                )}
                {current.type === 'text' && (
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground'>
                      字段内容
                    </Label>
                    <Textarea
                      className='min-h-20 resize-y'
                      value={String(config.content || '')}
                      onChange={(e) =>
                        updateSelected({
                          config: {
                            content: sanitizeContent(
                              e.target.value,
                              String(config.inputType || 'text'),
                              Number(config.maxLength || 0)
                            ),
                          },
                        })
                      }
                      placeholder='请输入字段内容'
                    />
                    {estimateTextOverflow(current) && (
                      <p className='mt-1 text-xs text-destructive'>
                        文字超出选区范围
                      </p>
                    )}
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-xs text-muted-foreground'>
                          最大字数
                        </Label>
                        <Input
                          className='mt-1.5 h-9'
                          type='number'
                          min='0'
                          value={Number(config.maxLength ?? 0)}
                          onChange={(e) =>
                            updateSelected({
                              config: { maxLength: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className='text-xs text-muted-foreground'>
                          输入类型
                        </Label>
                        <Select
                          value={String(config.inputType ?? 'text')}
                          onValueChange={(value) =>
                            updateSelected({ config: { inputType: value } })
                          }
                        >
                          <SelectTrigger className='mt-1.5 h-9 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='text'>普通文本</SelectItem>
                            <SelectItem value='number'>数字</SelectItem>
                            <SelectItem value='date'>日期</SelectItem>
                            <SelectItem value='phone'>手机号</SelectItem>
                            <SelectItem value='idCard'>身份证号</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                {current.type === 'image' && (
                  <div className='space-y-3'>
                    <Label className='text-xs font-medium text-muted-foreground'>
                      字段图片
                    </Label>
                    <Button
                      className='h-9 w-full justify-center'
                      variant='outline'
                      onClick={() => fieldImageInputRef.current?.click()}
                    >
                      <ImagePlus className='me-1 size-4' />
                      上传字段图片
                    </Button>
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <Label className='text-xs text-muted-foreground'>
                          图片显示
                        </Label>
                        <Select
                          value={String(config.imageFit ?? 'fill')}
                          onValueChange={(value) =>
                            updateSelected({ config: { imageFit: value } })
                          }
                        >
                          <SelectTrigger className='mt-1.5 h-9 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='fill'>拉伸填充</SelectItem>
                            <SelectItem value='contain'>等比适应</SelectItem>
                            <SelectItem value='cover'>等比裁剪</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className='text-xs text-muted-foreground'>
                          占位比例
                        </Label>
                        <Select
                          value={String(config.imageRatio ?? 'custom')}
                          onValueChange={setImageRatio}
                        >
                          <SelectTrigger className='mt-1.5 h-9 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='custom'>自定义</SelectItem>
                            <SelectItem value='1'>1:1 正方形</SelectItem>
                            <SelectItem value='1.333333'>4:3 横向</SelectItem>
                            <SelectItem value='0.75'>3:4 竖向</SelectItem>
                            <SelectItem value='1.777778'>16:9 宽屏</SelectItem>
                            <SelectItem value='0.5625'>9:16 竖屏</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className='col-span-2 flex items-center gap-2 text-sm'>
                        <Checkbox
                          checked={config.lockAspectRatio === true}
                          onCheckedChange={(checked) =>
                            updateSelected({
                              config: { lockAspectRatio: checked === true },
                            })
                          }
                        />
                        锁定比例
                      </label>
                      <div>
                        <div className='flex items-center justify-between'>
                          <Label className='text-xs'>图片位置 X</Label>
                          <span className='text-xs text-muted-foreground tabular-nums'>
                            {Number(config.imagePositionX ?? 0)}%
                          </span>
                        </div>
                        <Slider
                          className='mt-3'
                          min={-100}
                          max={100}
                          step={1}
                          value={[Number(config.imagePositionX ?? 0)]}
                          onValueChange={([value]) =>
                            updateSelected({
                              config: { imagePositionX: value },
                            })
                          }
                          aria-label='图片横向位置'
                        />
                      </div>
                      <div>
                        <div className='flex items-center justify-between'>
                          <Label className='text-xs'>图片位置 Y</Label>
                          <span className='text-xs text-muted-foreground tabular-nums'>
                            {Number(config.imagePositionY ?? 0)}%
                          </span>
                        </div>
                        <Slider
                          className='mt-3'
                          min={-100}
                          max={100}
                          step={1}
                          value={[Number(config.imagePositionY ?? 0)]}
                          onValueChange={([value]) =>
                            updateSelected({
                              config: { imagePositionY: value },
                            })
                          }
                          aria-label='图片纵向位置'
                        />
                      </div>
                      <div className='col-span-2'>
                        <Label className='text-xs'>透明度</Label>
                        <Input
                          className='mt-1'
                          type='number'
                          min='0'
                          max='1'
                          step='0.1'
                          value={Number(config.opacity ?? 1)}
                          onChange={(e) =>
                            updateSelected({
                              config: { opacity: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className='space-y-3'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    字段 Key
                  </Label>
                  <Input
                    className='h-9 w-full'
                    value={current.fieldKey}
                    onChange={(e) =>
                      updateSelected({ fieldKey: e.target.value })
                    }
                  />
                  <Label className='pt-1 text-xs font-medium text-muted-foreground'>
                    位置与尺寸
                  </Label>
                  <div className='grid grid-cols-2 gap-3'>
                    {(['x', 'y', 'width', 'height'] as const).map((key) => (
                      <div key={key}>
                        <Label className='text-xs text-muted-foreground'>
                          {key === 'x'
                            ? '横坐标'
                            : key === 'y'
                              ? '纵坐标'
                              : key === 'width'
                                ? '宽度'
                                : '高度'}
                        </Label>
                        <Input
                          className='mt-1.5 h-9'
                          type='number'
                          min={key === 'width' ? 40 : key === 'height' ? 30 : 0}
                          value={rectOf(current)[key]}
                          onChange={(e) =>
                            updateRect(key, Number(e.target.value))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <label className='flex items-center gap-2 pt-1 text-sm'>
                    <Checkbox
                      checked={config.locked === true}
                      onCheckedChange={(checked) =>
                        updateSelected({ config: { locked: checked === true } })
                      }
                    />
                    锁定位置和尺寸
                  </label>
                  {current.type === 'text' && (
                    <>
                      <Label className='pt-1'>行高倍数</Label>
                      <Input
                        className='w-full'
                        placeholder='行高'
                        type='number'
                        min='0.6'
                        max='3'
                        step='0.1'
                        value={Number(config.lineHeight ?? 1.2)}
                        onChange={(e) =>
                          updateSelected({
                            config: { lineHeight: Number(e.target.value) },
                          })
                        }
                      />
                    </>
                  )}
                </div>
                {current.type === 'text' && (
                  <div className='space-y-2'>
                    <Label className='text-xs font-medium text-muted-foreground'>
                      字体与对齐
                    </Label>
                    <div className='grid grid-cols-2 gap-3'>
                      <Select
                        value={String(config.fontFamily ?? 'Microsoft YaHei')}
                        onValueChange={(value) =>
                          updateSelected({ config: { fontFamily: value } })
                        }
                      >
                        <SelectTrigger className='h-9 w-full'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Microsoft YaHei'>
                            微软雅黑
                          </SelectItem>
                          <SelectItem value='SimSun'>宋体</SelectItem>
                          <SelectItem value='SimHei'>黑体</SelectItem>
                          <SelectItem value='KaiTi'>楷体</SelectItem>
                          <SelectItem value='FangSong'>仿宋</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(config.textAlign ?? 'left')}
                        onValueChange={(value) =>
                          updateSelected({ config: { textAlign: value } })
                        }
                      >
                        <SelectTrigger className='h-9 w-full'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='left'>左对齐</SelectItem>
                          <SelectItem value='center'>居中</SelectItem>
                          <SelectItem value='right'>右对齐</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(config.verticalAlign ?? 'top')}
                        onValueChange={(value) =>
                          updateSelected({ config: { verticalAlign: value } })
                        }
                      >
                        <SelectTrigger className='col-span-2 h-9 w-full'>
                          <SelectValue placeholder='垂直对齐' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='top'>顶部对齐</SelectItem>
                          <SelectItem value='middle'>垂直居中</SelectItem>
                          <SelectItem value='bottom'>底部对齐</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {current.type === 'text' && (
                  <div className='space-y-2'>
                    <Label className='text-xs font-medium text-muted-foreground'>
                      字形
                    </Label>
                    <div className='grid grid-cols-2 gap-3 text-sm'>
                      <label className='flex h-9 items-center gap-2 rounded-md border px-3'>
                        <Checkbox
                          checked={config.fontWeight === 'bold'}
                          onCheckedChange={(checked) =>
                            updateSelected({
                              config: {
                                fontWeight:
                                  checked === true ? 'bold' : 'normal',
                              },
                            })
                          }
                        />
                        粗体
                      </label>
                      <label className='flex h-9 items-center gap-2 rounded-md border px-3'>
                        <Checkbox
                          checked={config.fontStyle === 'italic'}
                          onCheckedChange={(checked) =>
                            updateSelected({
                              config: {
                                fontStyle:
                                  checked === true ? 'italic' : 'normal',
                              },
                            })
                          }
                        />
                        斜体
                      </label>
                    </div>
                  </div>
                )}
                {current.type === 'text' && (
                  <div className='space-y-1'>
                    <Label>文字颜色</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant='outline'
                          className='w-full justify-start gap-2'
                        >
                          <span
                            className='size-4 rounded border'
                            style={{
                              backgroundColor: String(
                                config.textColor || '#1f2937'
                              ),
                            }}
                          />
                          <Palette className='size-4' />
                          选择颜色
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className='w-56 space-y-3'>
                        <Button
                          type='button'
                          variant='outline'
                          className='w-full justify-start gap-2'
                          onClick={() => {
                            setPickingTextColor(true)
                            toast.info('请点击底图中的任意位置取色')
                          }}
                        >
                          <Pipette className='size-4' />
                          从底图取色
                        </Button>
                        <div className='grid grid-cols-6 gap-2'>
                          {[
                            '#111827',
                            '#334155',
                            '#dc2626',
                            '#ea580c',
                            '#ca8a04',
                            '#16a34a',
                            '#0891b2',
                            '#2563eb',
                            '#7c3aed',
                            '#db2777',
                            '#ffffff',
                            '#000000',
                          ].map((color) => (
                            <button
                              key={color}
                              type='button'
                              className='size-7 rounded-md border shadow-sm transition-transform hover:scale-110'
                              style={{ backgroundColor: color }}
                              title={color}
                              aria-label={`选择颜色 ${color}`}
                              onClick={() =>
                                updateSelected({ config: { textColor: color } })
                              }
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <div className='space-y-2'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    选区边框颜色
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className='w-full justify-start gap-2'
                      >
                        <span
                          className='size-4 rounded-full border'
                          style={{
                            backgroundColor: String(config.color || '#3b82f6'),
                          }}
                        />
                        选择选区颜色
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-56'>
                      <div className='grid grid-cols-6 gap-2'>
                        {fieldColors.map((color) => (
                          <button
                            key={color}
                            type='button'
                            className='size-7 rounded-full border shadow-sm transition-transform hover:scale-110'
                            style={{ backgroundColor: color }}
                            title={color}
                            aria-label={`选择选区颜色 ${color}`}
                            onClick={() =>
                              updateSelected({ config: { color } })
                            }
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className='space-y-3 pt-1'>
                  <label className='flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm'>
                    <Checkbox
                      checked={current.required}
                      onCheckedChange={(v) =>
                        updateSelected({ required: v === true })
                      }
                    />
                    必填字段
                  </label>
                  {current.type === 'text' && (
                    <label className='flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm'>
                      <Checkbox
                        checked={config.autoWrap !== false}
                        onCheckedChange={(checked) =>
                          updateSelected({
                            config: { autoWrap: checked === true },
                          })
                        }
                      />
                      自动换行
                    </label>
                  )}
                </div>
                {current.type === 'text' && (
                  <div className='space-y-1'>
                    <Label>文字排版尺寸</Label>
                    <div className='grid grid-cols-2 gap-2'>
                      <div>
                        <Label className='text-xs'>字号（px）</Label>
                        <Input
                          className='mt-1'
                          type='number'
                          min='1'
                          value={Number(config.fontSize ?? 16)}
                          onChange={(e) =>
                            updateSelected({
                              config: { fontSize: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className='text-xs'>字间距（px）</Label>
                        <Input
                          className='mt-1'
                          type='number'
                          min='-1000'
                          max='1000'
                          value={Number(config.charSpacing ?? 0)}
                          onChange={(e) =>
                            updateSelected({
                              config: { charSpacing: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className='text-xs'>首行缩进（px）</Label>
                        <Input
                          className='mt-1'
                          type='number'
                          min='0'
                          value={Number(config.textIndent ?? 0)}
                          onChange={(e) =>
                            updateSelected({
                              config: { textIndent: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className='grid grid-cols-2 gap-3 pt-2'>
                  <Button type='button' variant='outline' onClick={resetStyle}>
                    恢复默认样式
                  </Button>
                  <Button
                    type='button'
                    variant='destructive'
                    onClick={() => {
                      pushHistory()
                      setFields(fields.filter((_, i) => i !== selected))
                      setSelected(-1)
                      setEditOpen(false)
                    }}
                  >
                    <Trash2 className='me-2 size-4' />
                    删除字段
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </main>
  )
}
