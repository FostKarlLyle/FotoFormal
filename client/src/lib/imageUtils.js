/** Utilitas gambar generik: baca berkas, skala, kanvas, unduh. */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20 MB

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca berkas foto.'))
    reader.readAsDataURL(file)
  })
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Berkas ini sepertinya bukan gambar yang valid.'))
    img.src = src
  })
}

/** Skala gambar turun supaya sisi terpanjang <= maxSide (menghemat token & waktu proses). */
export function fitToMaxSide(width, height, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function imageToCanvas(img, { maxSide } = {}) {
  const size = maxSide ? fitToMaxSide(img.naturalWidth, img.naturalHeight, maxSide) : { width: img.naturalWidth, height: img.naturalHeight }
  const canvas = createCanvas(size.width, size.height)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, size.width, size.height)
  return canvas
}

/** Konversi data URL / URL gambar menjadi objek kanvas siap proses. */
export async function srcToCanvas(src, opts) {
  const img = await loadImage(src)
  return imageToCanvas(img, opts)
}

export function canvasToBase64(canvas, mimeType = 'image/png', quality = 0.95) {
  return canvas.toDataURL(mimeType, quality).split(',')[1] || ''
}

export function canvasToDataURL(canvas, mimeType = 'image/png', quality = 0.95) {
  return canvas.toDataURL(mimeType, quality)
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/* ------------------------------ warna ----------------------------------- */

export function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '').trim()
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0').slice(0, 6)
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHex({ r, g, b }) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function luminance({ r, g, b }) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export function mix(colorA, colorB, t) {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  })
}

export function relativeLuminance(hex) {
  return luminance(hexToRgb(hex))
}

export function isLight(hex) {
  return relativeLuminance(hex) > 0.62
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
