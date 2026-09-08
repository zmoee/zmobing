type StampRect = { x: number; y: number; width: number; height: number }

export function drawHighFidelityStamp(ctx: CanvasRenderingContext2D, rect: StampRect, config: Record<string, unknown>) {
  const size = Math.max(40, Math.min(rect.width, rect.height))
  const margin = 20
  const canvasSize = Math.ceil(size + margin * 2)
  const off = document.createElement('canvas'); off.width = canvasSize; off.height = canvasSize
  const stamp = off.getContext('2d'); if (!stamp) return
  const cx = canvasSize / 2; const cy = canvasSize / 2; const radius = size / 2; const border = size * 0.025
  const color = '#ff0000'
  const title = String(config.stampText || '\u5370\u7ae0\u6587\u5b57')
  const middle = String(config.stampMiddleText || '\u4e13\u7528\u7ae0')
  const code = String(config.stampCode || '')
  const c = { starSize: Number(config.starSize ?? 0.3), orgSize: Number(config.orgSize ?? 0.1666), orgHeight: Number(config.orgHeight ?? 1), orgStretch: Number(config.orgStretch ?? 1), orgDistribution: Number(config.orgDistribution ?? 1), codeDistribution: Number(config.codeDistribution ?? 1), middleSize: Number(config.middleSize ?? 0.095), middleDistribution: Number(config.middleDistribution ?? 1), enablePostBold: config.enablePostBold !== false, enableBoldNoise: config.enableBoldNoise !== false, postBoldStrength: Number(config.postBoldStrength ?? 1), boldNoiseStrength: Number(config.boldNoiseStrength ?? 12) }
  stamp.save(); stamp.strokeStyle = color; stamp.fillStyle = color; stamp.lineWidth = border
  stamp.beginPath(); stamp.arc(cx, cy, radius - border / 2, 0, Math.PI * 2); stamp.stroke()
  drawStar(stamp, cx, cy, size * c.starSize / 2)
  drawSecurityLines(stamp, cx, cy, radius - border / 2, border, size)
  const inner = radius - border
  if (title) drawArcText(stamp, title, cx, cy, inner - size * 0.0285 - size * c.orgSize / 2, size * c.orgSize, color, c.orgStretch, c.orgHeight, c.orgDistribution, false, '"SimSun", "STSong", serif')
  if (code) drawArcText(stamp, code, cx, cy, inner - size * 0.0261 - size * 0.0333 / 2, size * 0.0333, color, 1.35, 1, c.codeDistribution, true, 'Arial, Helvetica, sans-serif')
  if (middle) drawMiddleText(stamp, middle, cx, cy + radius * 0.46, size * c.middleSize, color, c.middleDistribution)
  stamp.restore()
  if (config.stampTexture !== false) {
    applyRealisticEffect(stamp, canvasSize, canvasSize)
    if (c.enablePostBold || c.enableBoldNoise) applyTextureEffects(stamp, canvasSize, canvasSize, c)
  }
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, Number(config.opacity ?? 0.88)))
  ctx.drawImage(off, rect.x + (rect.width - canvasSize) / 2, rect.y + (rect.height - canvasSize) / 2)
  ctx.restore()
}

function drawMiddleText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, fontSize: number, color: string, distribution: number) {
  const chars = Array.from(text); ctx.save(); ctx.font = `bold ${fontSize}px "SimSun", "STSong", serif`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const widths = chars.map((char) => ctx.measureText(char).width); const spacing = Math.max(0, fontSize * 0.35 * distribution); const total = widths.reduce((sum, value) => sum + value, 0) + spacing * Math.max(0, chars.length - 1); let x = cx - total / 2
  chars.forEach((char, index) => { ctx.fillText(char, x + widths[index] / 2, y); x += widths[index] + spacing }); ctx.restore()
}

export function createStampDataUrl(size: number, config: Record<string, unknown>) {
  const canvas = document.createElement('canvas'); canvas.width = Math.max(40, Math.ceil(size)); canvas.height = canvas.width
  const context = canvas.getContext('2d'); if (!context) return ''
  drawHighFidelityStamp(context, { x: 0, y: 0, width: canvas.width, height: canvas.height }, config)
  return canvas.toDataURL('image/png')
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI); ctx.beginPath(); const dig = (Math.PI / 5) * 4
  for (let i = 0; i < 5; i += 1) ctx.lineTo(Math.sin(i * dig) * radius, Math.cos(i * dig) * radius)
  ctx.closePath(); ctx.fill(); ctx.restore()
}

function drawArcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, fontSize: number, color: string, stretch: number, scaleY: number, distribution: number, bottom: boolean, family: string) {
  ctx.save(); ctx.font = `bold ${fontSize}px ${family}`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const count = text.length; const base = bottom ? Math.PI / 3.5 : count < 5 ? Math.PI / 1.5 : count > 12 ? Math.PI * 1.6 : Math.PI * 1.5
  const range = base * distribution; const start = bottom ? Math.PI / 2 + range / 2 : -Math.PI / 2 - range / 2; const step = bottom ? -range / Math.max(1, count - 1) : range / Math.max(1, count - 1)
  for (let i = 0; i < count; i += 1) { const angle = count === 1 ? (bottom ? Math.PI / 2 : -Math.PI / 2) : start + i * step; ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle + Math.PI / 2); ctx.translate(0, -radius); if (bottom) ctx.rotate(Math.PI); ctx.scale(stretch, scaleY); ctx.fillText(text[i], 0, 0); ctx.restore() }
  ctx.restore()
}

function drawSecurityLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, border: number, size: number) {
  ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = size * 0.0047; const length = border * 1.2
  for (let i = 0; i < 8; i += 1) { const angle = Math.random() * Math.PI * 2; const cos = Math.cos(angle); const sin = Math.sin(angle); ctx.beginPath(); ctx.moveTo(cx + (radius - length / 2) * cos, cy + (radius - length / 2) * sin); ctx.lineTo(cx + (radius + length / 2) * cos, cy + (radius + length / 2) * sin); ctx.stroke() }
  ctx.restore()
}

function applyTextureEffects(ctx: CanvasRenderingContext2D, width: number, height: number, c: { enablePostBold: boolean; enableBoldNoise: boolean; postBoldStrength: number; boldNoiseStrength: number }) {
  if (c.enablePostBold) { const temp = document.createElement('canvas'); temp.width = width; temp.height = height; const t = temp.getContext('2d'); if (t) { t.drawImage(ctx.canvas, 0, 0); ctx.save(); ctx.globalAlpha = 0.6; const s = c.postBoldStrength; for (const p of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 0.7, y: 0.7 }, { x: -0.7, y: -0.7 }]) ctx.drawImage(temp, p.x * s, p.y * s); ctx.restore() } }
  if (c.enableBoldNoise) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); const count = c.boldNoiseStrength * 20; for (let i = 0; i < count; i += 1) { const x = Math.random() * width; const y = Math.random() * height; const r = Math.random() > 0.95 ? 2.5 + Math.random() : Math.random() > 0.8 ? 1.5 + Math.random() : 0.5 + Math.random() * 0.5; ctx.moveTo(x, y); ctx.arc(x, y, r, 0, Math.PI * 2) }; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore() }
}

function applyRealisticEffect(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const image = ctx.getImageData(0, 0, width, height); const data = image.data; const original = new Uint8ClampedArray(data); const aging = 0.8
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const i = (y * width + x) * 4; if (original[i + 3] < 10) continue; const density = (Math.sin(x * 0.12) * Math.cos(y * 0.08) * 0.3 + Math.random() * 0.7 + 1) / 2; let alpha = original[i + 3]; if (density < aging * 0.9) alpha -= ((aging * 0.9 - density) / (aging * 0.9)) * 255 * 1.8; else alpha -= Math.random() * aging * 40; data[i + 3] = Math.max(0, Math.min(255, alpha + (Math.random() - 0.5) * 60)) }
  ctx.putImageData(image, 0, 0)
}
