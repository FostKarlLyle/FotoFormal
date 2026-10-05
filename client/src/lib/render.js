/**
 * render.js — menyiapkan hasil akhir agar siap cetak.
 *
 * Hasil dari AI bisa datang dengan rasio yang tidak persis sama dengan ukuran
 * cetak yang dipilih. Di sini gambar dipotong ulang secara "sadar wajah"
 * (kalau mesin deteksi wajah tersedia di browser), lalu digambar ulang pada
 * resolusi cetak 300 DPI (atau 600 DPI bila dipilih).
 */
import { createCanvas, downloadDataUrl, loadImage } from './imageUtils.js'
import { detectFaceBox } from './localStudio.js'

const BASE_DPI = 300

/**
 * @param {string} src data URL hasil AI / mode lokal
 * @param {object} opts
 * @param {{width:number,height:number,ratio:string,label:string}} opts.size
 * @param {number} [opts.dpiScale] 1 = 300 DPI, 2 = 600 DPI
 * @param {boolean} [opts.smartCrop] gunakan deteksi wajah untuk komposisi
 */
export async function buildPrintCanvas(src, { size, dpiScale = 1, smartCrop = true } = {}) {
  const img = await loadImage(src)
  const targetW = Math.round(size.width * dpiScale)
  const targetH = Math.round(size.height * dpiScale)
  const targetRatio = targetW / targetH

  let crop = null
  if (smartCrop) {
    try {
      const probe = createCanvas(img.naturalWidth, img.naturalHeight)
      probe.getContext('2d').drawImage(img, 0, 0)
      const face = await detectFaceBox(probe)
      if (face) crop = cropAroundFace(img.naturalWidth, img.naturalHeight, targetRatio, face)
    } catch {
      // mesin deteksi tidak tersedia (mis. model gagal diunduh) → crop tengah biasa
      crop = null
    }
  }
  if (!crop) crop = centerCrop(img.naturalWidth, img.naturalHeight, targetRatio)

  const canvas = createCanvas(targetW, targetH)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, targetW, targetH)
  return { canvas, width: targetW, height: targetH, dpi: BASE_DPI * dpiScale }
}

function centerCrop(w, h, ratio) {
  let cw = w
  let ch = cw / ratio
  if (ch > h) {
    ch = h
    cw = ch * ratio
  }
  return { x: (w - cw) / 2, y: Math.max(0, (h - ch) * 0.35), width: cw, height: ch }
}

function cropAroundFace(w, h, ratio, face) {
  const headHeight = face.height * 1.55
  let ch = Math.min(h, headHeight / 0.62)
  let cw = Math.min(w, ch * ratio)
  ch = Math.min(ch, cw / ratio)

  const headTop = face.y - face.height * 0.42
  const y = Math.min(Math.max(0, headTop - ch * 0.07), Math.max(0, h - ch))
  const x = Math.min(Math.max(0, face.cx - cw / 2), Math.max(0, w - cw))
  return { x, y, width: cw, height: ch }
}

export function exportResult(canvas, { format = 'png', filename = 'foto-formal', quality = 0.95 } = {}) {
  const mime = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const dataUrl = canvas.toDataURL(mime, quality)
  const ext = mime === 'image/jpeg' ? 'jpg' : 'png'
  downloadDataUrl(dataUrl, `${filename}.${ext}`)
}

export function makeFilename({ sizeId, backgroundId, prefix = 'foto-formal', stamp = true }) {
  const d = new Date()
  const time = stamp
    ? `-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
    : ''
  return `${prefix}-${sizeId}-${backgroundId}${time}`
}
