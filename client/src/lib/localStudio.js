/**
 * localStudio.js — Mesin "Mode Lokal (tanpa API key)".
 *
 * Semuanya berjalan di dalam browser pengguna, foto tidak pernah dikirim ke mana pun.
 * Memakai MediaPipe Tasks Vision:
 *   • FaceDetector  (blaze_face_short_range) → menemukan kepala untuk crop otomatis
 *   • ImageSegmenter (selfie_multiclass_256x256) → memisahkan orang dari latar,
 *     sekaligus memberi tahu mana piksel pakaian:
 *        0 = latar, 1 = rambut, 2 = kulit tubuh, 3 = kulit wajah, 4 = pakaian, 5 = aksesori
 *
 * Keterbatasan (jujur): hasil terbaik pada foto dengan latar yang tidak terlalu
 * ramai dan pencahayaan rata. Mode AI (Gemini) memberi hasil jauh lebih fotoreal,
 * terutama untuk mengganti model pakaian.
 */
import { FilesetResolver, FaceDetector, ImageSegmenter } from '@mediapipe/tasks-vision'
import { clamp, createCanvas, hexToRgb, mix, srcToCanvas } from './imageUtils.js'

const WASM_LOCAL = '/mediapipe/wasm'
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_BASE = 'https://storage.googleapis.com/mediapipe-models'
const FACE_MODEL = `${MODEL_BASE}/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`
const SEG_MODEL = `${MODEL_BASE}/image_segmenter/selfie_multiclass_256x256/float16/1/selfie_multiclass_256x256.tflite`

const CATEGORY = { BACKGROUND: 0, HAIR: 1, BODY_SKIN: 2, FACE_SKIN: 3, CLOTHES: 4, ACCESSORIES: 5 }

let visionPromise = null
let faceDetectorPromise = null
let segmenterPromise = null

async function loadVision(onProgress) {
  if (!visionPromise) {
    visionPromise = (async () => {
      onProgress?.('Menyiapkan mesin lokal (WebAssembly)…')
      try {
        return await FilesetResolver.forVisionTasks(WASM_LOCAL)
      } catch {
        onProgress?.('Aset lokal tidak ditemukan, memakai CDN…')
        return FilesetResolver.forVisionTasks(WASM_CDN)
      }
    })()
  }
  return visionPromise
}

export async function getFaceDetector(onProgress) {
  if (!faceDetectorPromise) {
    faceDetectorPromise = (async () => {
      const vision = await loadVision(onProgress)
      onProgress?.('Memuat model deteksi wajah…')
      try {
        return await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.4,
        })
      } catch (err) {
        throw modelLoadError('model deteksi wajah', err)
      }
    })().catch((err) => {
      faceDetectorPromise = null
      throw err
    })
  }
  return faceDetectorPromise
}

/** Pesan error yang ramah pengguna saat model MediaPipe gagal diunduh. */
function modelLoadError(what, err) {
  return new Error(
    `Gagal mengunduh ${what} dari Google (storage.googleapis.com). ` +
      'Periksa koneksi internet, matikan VPN/adblock, atau pakai Mode AI. ' +
      `Detail: ${err?.message || err}`,
  )
}

export async function getSegmenter(onProgress) {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await loadVision(onProgress)
      onProgress?.('Memuat model pemisah latar…')
      try {
        return await ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: SEG_MODEL, delegate: 'GPU' },
          runningMode: 'IMAGE',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        })
      } catch (err) {
        throw modelLoadError('model pemisah latar', err)
      }
    })().catch((err) => {
      segmenterPromise = null
      throw err
    })
  }
  return segmenterPromise
}

/** Memuat semua model lebih awal supaya tombol "Proses" terasa instan. */
export async function warmUpLocalEngine(onProgress) {
  await Promise.all([getFaceDetector(onProgress), getSegmenter(onProgress)])
  return true
}

/* -------------------------------------------------------------------------- */
/* Deteksi & segmentasi                                                        */
/* -------------------------------------------------------------------------- */

export async function detectFaceBox(canvas, onProgress) {
  try {
    const detector = await getFaceDetector(onProgress)
    const result = detector.detect(canvas)
    const det = result?.detections?.[0]
    if (!det) return null
    const box = det.boundingBox || det.locationData
    const x = box.originX ?? box.relativeBoundingBox?.xMin * canvas.width
    const y = box.originY ?? box.relativeBoundingBox?.yMin * canvas.height
    const w = box.width ?? box.relativeBoundingBox?.width * canvas.width
    const h = box.height ?? box.relativeBoundingBox?.height * canvas.height
    if (!w || !h) return null
    return { x, y, width: w, height: h, cx: x + w / 2, cy: y + h / 2 }
  } catch (err) {
    console.warn('[local] deteksi wajah gagal:', err)
    return null
  }
}

/** Mengembalikan { data, width, height } berisi id kategori per piksel. */
export async function segmentCategories(canvas, onProgress) {
  const segmenter = await getSegmenter(onProgress)
  const result = segmenter.segment(canvas)
  const mask = result?.categoryMask
  if (!mask) throw new Error('Gagal memisahkan orang dari latar belakang.')
  const data = mask.getAsUint8Array()
  const size = { data, width: mask.width, height: mask.height }
  mask.close?.()
  return size
}

/* -------------------------------------------------------------------------- */
/* Pengolahan mask                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Mask dari segmenter beresolusi rendah (256px) sehingga tepinya bergerigi.
 * Fungsi ini:
 *   1. memperbesar mask dengan nearest-neighbour,
 *   2. menghitung ulang alpha di sekitar tepi memakai kemiripan warna dengan latar,
 *      sehingga rambut dan tepi bahu jadi jauh lebih halus.
 */
function buildAlphaChannel(imageData, mask, { band = 3, threshold = 78 } = {}) {
  const { width, height } = imageData
  const px = imageData.data
  const alpha = new Uint8ClampedArray(width * height)

  const maskAt = (x, y) => {
    const mx = clamp(Math.floor((x / width) * mask.width), 0, mask.width - 1)
    const my = clamp(Math.floor((y / height) * mask.height), 0, mask.height - 1)
    return mask.data[my * mask.width + mx]
  }

  // Warna latar diestimasi dari cincin piksel yang jelas-jelas latar.
  let br = 0
  let bg = 0
  let bb = 0
  let count = 0
  const step = Math.max(1, Math.floor(Math.min(width, height) / 120))
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const cat = maskAt(x, y)
      const nearEdge = x < step * 3 || y < step * 3 || x > width - step * 3 || y > height - step * 3
      if (cat === CATEGORY.BACKGROUND && nearEdge) {
        const i = (y * width + x) * 4
        br += px[i]
        bg += px[i + 1]
        bb += px[i + 2]
        count++
      }
    }
  }
  if (!count) {
    br = 240
    bg = 240
    bb = 240
  } else {
    br /= count
    bg /= count
    bb /= count
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const cat = maskAt(x, y)
      if (cat !== CATEGORY.BACKGROUND) {
        alpha[idx] = 255
        continue
      }
      // Piksel "latar" tapi warnanya jauh dari warna latar → kemungkinan bagian orang
      // yang tidak terdeteksi (rambut/tangan). Cek hanya di sekitar tepi mask.
      let touchesPerson = false
      for (let dy = -band; dy <= band && !touchesPerson; dy += band) {
        for (let dx = -band; dx <= band; dx += band) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          if (maskAt(nx, ny) !== CATEGORY.BACKGROUND) {
            touchesPerson = true
            break
          }
        }
      }
      if (!touchesPerson) {
        alpha[idx] = 0
        continue
      }
      const i = idx * 4
      const dist = Math.sqrt((px[i] - br) ** 2 + (px[i + 1] - bg) ** 2 + (px[i + 2] - bb) ** 2)
      alpha[idx] = dist > threshold ? 255 : clamp(Math.round((dist / threshold) * 255 * 0.85), 0, 255)
    }
  }

  // Perhalus alpha (blur 3x3 sederhana) supaya tepi tidak bergerigi.
  const smoothed = new Uint8ClampedArray(alpha)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      let sum = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += alpha[idx + dy * width + dx]
      smoothed[idx] = sum / 9
    }
  }
  return smoothed
}

function buildClothesMask(mask, width, height) {
  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    const my = clamp(Math.floor((y / height) * mask.height), 0, mask.height - 1)
    for (let x = 0; x < width; x++) {
      const mx = clamp(Math.floor((x / width) * mask.width), 0, mask.width - 1)
      out[y * width + x] = mask.data[my * mask.width + mx] === CATEGORY.CLOTHES ? 1 : 0
    }
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Crop sadar-wajah                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Menghitung kotak crop untuk pas foto:
 *   • tinggi kepala ≈ 62% tinggi foto (standar pas foto formal)
 *   • jarak dari tepi atas ke ubun-ubun ≈ 7% tinggi foto
 *   • kepala tepat di tengah secara horizontal
 */
export function computeCropBox(imgWidth, imgHeight, aspectRatio, faceBox) {
  const [aw, ah] = String(aspectRatio || '3:4').split(':').map(Number)
  const ratio = ah > 0 && aw > 0 ? aw / ah : 3 / 4

  if (!faceBox) {
    // Tanpa wajah: crop tengah dengan komposisi potret standar.
    let h = imgHeight
    let w = h * ratio
    if (w > imgWidth) {
      w = imgWidth
      h = w / ratio
    }
    return {
      x: Math.max(0, (imgWidth - w) / 2),
      y: Math.max(0, (imgHeight - h) * 0.18),
      width: w,
      height: h,
    }
  }

  const headHeight = faceBox.height * 1.55 // tinggi wajah ≈ 65% tinggi kepala
  const cropHeight = Math.min(imgHeight, headHeight / 0.62)
  const cropWidth = Math.min(imgWidth, cropHeight * ratio)
  const finalHeight = cropWidth / ratio <= cropHeight ? cropWidth / ratio : cropHeight

  const headTop = faceBox.y - faceBox.height * 0.42
  const y = clamp(headTop - finalHeight * 0.07, 0, Math.max(0, imgHeight - finalHeight))
  const x = clamp(faceBox.cx - cropWidth / 2, 0, Math.max(0, imgWidth - cropWidth))

  return { x, y, width: Math.min(cropWidth, imgWidth), height: Math.min(finalHeight, imgHeight) }
}

/* -------------------------------------------------------------------------- */
/* Menggambar ulang pakaian (tanpa AI generatif)                               */
/* -------------------------------------------------------------------------- */

/**
 * Mengubah warna area pakaian pada foto asli menjadi warna jas/kemeja pilihan,
 * dengan tetap mempertahankan lipatan, bayangan, dan tekstur kain
 * (memetakan kecerahan asli ke gradasi warna target).
 */
function recolorClothes(targetCanvas, clothesMask, alphaChannel, garment) {
  const ctx = targetCanvas.getContext('2d')
  const { width, height } = targetCanvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const px = imageData.data

  const base = hexToRgb(garment.colors.jacket)
  const dark = hexToRgb(mix(garment.colors.jacket, garment.colors.accent || '#000000', 0.75))
  const light = hexToRgb(mix(garment.colors.jacket, '#ffffff', 0.35))

  for (let i = 0; i < width * height; i++) {
    if (!clothesMask[i]) continue
    if (alphaChannel[i] < 12) continue
    const o = i * 4
    const l = (0.2126 * px[o] + 0.7152 * px[o + 1] + 0.0722 * px[o + 2]) / 255
    // kurva kontras sedikit supaya bentuk lipatan tetap terbaca
    const t = clamp((l - 0.18) / 0.72, 0, 1)
    // gradasi: gelap → warna dasar → terang
    const from = t < 0.5 ? dark : base
    const to = t < 0.5 ? base : light
    const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5
    px[o] = from.r + (to.r - from.r) * k
    px[o + 1] = from.g + (to.g - from.g) * k
    px[o + 2] = from.b + (to.b - from.b) * k
  }
  ctx.putImageData(imageData, 0, 0)

  if (garment.colors.pattern === 'batik') drawBatikPattern(ctx, clothesMask, alphaChannel, width, height, garment)
}

function drawBatikPattern(ctx, clothesMask, alphaChannel, width, height, garment) {
  const pattern = createCanvas(width, height)
  const pctx = pattern.getContext('2d')
  pctx.fillStyle = 'rgba(255,255,255,0.10)'
  const cell = Math.max(14, Math.round(Math.min(width, height) / 26))
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const i = y * width + x
      if (!clothesMask[i] || alphaChannel[i] < 40) continue
      pctx.save()
      pctx.translate(x, y)
      pctx.rotate(Math.PI / 4)
      pctx.fillRect(-cell * 0.22, -cell * 0.22, cell * 0.44, cell * 0.44)
      pctx.restore()
      pctx.beginPath()
      pctx.arc(x + cell / 2, y + cell / 2, cell * 0.16, 0, Math.PI * 2)
      pctx.fill()
    }
  }
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.55
  ctx.drawImage(pattern, 0, 0)
  ctx.restore()
}

/**
 * Menggambar kerah kemeja + dasi di atas area pakaian, memakai geometri wajah.
 */
function drawCollarAndTie(ctx, faceBox, garment, { width, height, clothesMask, alphaChannel, outputBox }) {
  if (!faceBox) return
  const scale = outputBox.scale
  const cx = (faceBox.cx - outputBox.x) * scale
  const chinY = (faceBox.y + faceBox.height - outputBox.y) * scale
  const faceW = faceBox.width * scale
  const faceH = faceBox.height * scale

  const neckY = chinY + faceH * 0.62
  if (neckY > height) return

  const shirt = garment.colors.shirt
  const tie = garment.colors.tie

  const maskLayer = createCanvas(width, height)
  const mctx = maskLayer.getContext('2d')
  // batasi lukisan hanya pada area pakaian
  const clothesLayer = createCanvas(width, height)
  const cctx = clothesLayer.getContext('2d')
  const cdata = cctx.createImageData(width, height)
  for (let i = 0; i < width * height; i++) {
    const on = clothesMask[i] && alphaChannel[i] > 40 ? 255 : 0
    cdata.data[i * 4] = 255
    cdata.data[i * 4 + 1] = 255
    cdata.data[i * 4 + 2] = 255
    cdata.data[i * 4 + 3] = on
  }
  cctx.putImageData(cdata, 0, 0)
  mctx.drawImage(clothesLayer, 0, 0)
  mctx.globalCompositeOperation = 'source-in'

  // 1) Kemeja: bentuk V di bawah dagu
  mctx.fillStyle = shirt
  mctx.beginPath()
  mctx.moveTo(cx - faceW * 0.62, neckY)
  mctx.lineTo(cx, neckY + faceH * 1.5)
  mctx.lineTo(cx + faceW * 0.62, neckY)
  mctx.closePath()
  mctx.fill()

  // 2) Kerah kiri-kanan
  mctx.fillStyle = mix(shirt, '#000000', 0.08)
  mctx.beginPath()
  mctx.moveTo(cx - faceW * 0.72, neckY - faceH * 0.06)
  mctx.lineTo(cx - faceW * 0.2, neckY + faceH * 0.16)
  mctx.lineTo(cx - faceW * 0.62, neckY + faceH * 0.5)
  mctx.closePath()
  mctx.fill()
  mctx.beginPath()
  mctx.moveTo(cx + faceW * 0.72, neckY - faceH * 0.06)
  mctx.lineTo(cx + faceW * 0.2, neckY + faceH * 0.16)
  mctx.lineTo(cx + faceW * 0.62, neckY + faceH * 0.5)
  mctx.closePath()
  mctx.fill()

  // 3) Dasi
  if (garment.drawTie && tie) {
    mctx.fillStyle = tie
    mctx.beginPath()
    mctx.moveTo(cx, neckY + faceH * 0.05)
    mctx.lineTo(cx + faceW * 0.11, neckY + faceH * 0.34)
    mctx.lineTo(cx + faceW * 0.07, neckY + faceH * 1.45)
    mctx.lineTo(cx - faceW * 0.07, neckY + faceH * 1.45)
    mctx.lineTo(cx - faceW * 0.11, neckY + faceH * 0.34)
    mctx.closePath()
    mctx.fill()
    // simpul
    mctx.fillStyle = mix(tie, '#000000', 0.25)
    mctx.beginPath()
    mctx.moveTo(cx - faceW * 0.1, neckY + faceH * 0.02)
    mctx.lineTo(cx + faceW * 0.1, neckY + faceH * 0.02)
    mctx.lineTo(cx + faceW * 0.07, neckY + faceH * 0.2)
    mctx.lineTo(cx - faceW * 0.07, neckY + faceH * 0.2)
    mctx.closePath()
    mctx.fill()
  }

  ctx.save()
  ctx.globalAlpha = 0.94
  ctx.drawImage(maskLayer, 0, 0)
  ctx.restore()
}

/* -------------------------------------------------------------------------- */
/* Alur utama mode lokal                                                       */
/* -------------------------------------------------------------------------- */

/**
 * @param {object} opts
 * @param {string} opts.imageSrc           Data URL foto asli.
 * @param {object} opts.options
 * @param {string} opts.options.backgroundHex
 * @param {string} [opts.options.backgroundDeepHex]
 * @param {'solid'|'gradient'} [opts.options.backgroundStyle]
 * @param {object|null} opts.options.garment  Objek pakaian dari templates.js (null = jangan ubah pakaian).
 * @param {string} opts.options.aspectRatio   '3:4'
 * @param {number} opts.options.outWidth       Lebar keluaran (px, sudah termasuk DPI).
 * @param {number} opts.options.outHeight
 * @param {(msg:string, pct:number)=>void} [opts.onProgress]
 */
export async function renderLocalPhoto({ imageSrc, options, onProgress }) {
  const {
    backgroundHex = '#C8102E',
    backgroundDeepHex,
    backgroundStyle = 'solid',
    garment = null,
    aspectRatio = '3:4',
    outWidth = 354,
    outHeight = 472,
    headScale = 0.62,
  } = options || {}

  onProgress?.('Membaca foto…', 5)
  const sourceCanvas = await srcToCanvas(imageSrc, { maxSide: 1400 })

  onProgress?.('Mendeteksi wajah…', 20)
  const faceBox = await detectFaceBox(sourceCanvas, (m) => onProgress?.(m, 20))

  onProgress?.('Memisahkan orang dari latar…', 45)
  const mask = await segmentCategories(sourceCanvas, (m) => onProgress?.(m, 45))

  const ctxSrc = sourceCanvas.getContext('2d')
  const imageData = ctxSrc.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)

  onProgress?.('Menghaluskan tepi & mengganti latar…', 65)
  const alphaChannel = buildAlphaChannel(imageData, mask)
  const clothesMask = buildClothesMask(mask, sourceCanvas.width, sourceCanvas.height)

  // Kanvas potret pada resolusi cetak
  const out = createCanvas(outWidth, outHeight)
  const octx = out.getContext('2d')
  octx.imageSmoothingEnabled = true
  octx.imageSmoothingQuality = 'high'

  // 1) Latar belakang
  const rgb = hexToRgb(backgroundHex)
  if (backgroundStyle === 'gradient') {
    const grad = octx.createLinearGradient(0, 0, 0, outHeight)
    grad.addColorStop(0, mix(backgroundHex, '#ffffff', 0.16))
    grad.addColorStop(0.55, backgroundHex)
    grad.addColorStop(1, backgroundDeepHex || mix(backgroundHex, '#000000', 0.18))
    octx.fillStyle = grad
  } else {
    octx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  }
  octx.fillRect(0, 0, outWidth, outHeight)

  // 2) Crop sadar-wajah
  const crop = computeCropBox(sourceCanvas.width, sourceCanvas.height, aspectRatio, faceBox)

  // 3) Orang (dipotong dari latar) di atas latar baru
  const personCanvas = createCanvas(sourceCanvas.width, sourceCanvas.height)
  const pctx = personCanvas.getContext('2d')
  const personData = new ImageData(new Uint8ClampedArray(imageData.data), sourceCanvas.width, sourceCanvas.height)
  for (let i = 0; i < alphaChannel.length; i++) personData.data[i * 4 + 3] = alphaChannel[i]
  pctx.putImageData(personData, 0, 0)

  octx.drawImage(
    personCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outWidth,
    outHeight,
  )

  // 4) Ganti pakaian (opsional)
  let clothesReplaced = false
  if (garment) {
    onProgress?.('Menyesuaikan pakaian…', 80)
    // Simpan versi seukuran keluaran supaya pewarnaan tepat piksel demi piksel.
    const clothesAtOutput = new Uint8Array(outWidth * outHeight)
    const alphaAtOutput = new Uint8ClampedArray(outWidth * outHeight)
    for (let y = 0; y < outHeight; y++) {
      const sy = Math.floor(crop.y + (y / outHeight) * crop.height)
      for (let x = 0; x < outWidth; x++) {
        const sx = Math.floor(crop.x + (x / outWidth) * crop.width)
        const srcIdx = sy * sourceCanvas.width + sx
        const dstIdx = y * outWidth + x
        clothesAtOutput[dstIdx] = clothesMask[srcIdx] || 0
        alphaAtOutput[dstIdx] = alphaChannel[srcIdx] || 0
      }
    }
    recolorClothes(out, clothesAtOutput, alphaAtOutput, garment)
    const scale = outWidth / crop.width
    drawCollarAndTie(octx, faceBox, garment, {
      width: outWidth,
      height: outHeight,
      clothesMask: clothesAtOutput,
      alphaChannel: alphaAtOutput,
      outputBox: { x: crop.x, y: crop.y, scale },
    })
    clothesReplaced = true
  }

  onProgress?.('Menyelesaikan…', 95)

  return {
    dataUrl: out.toDataURL('image/png'),
    canvas: out,
    width: outWidth,
    height: outHeight,
    faceDetected: !!faceBox,
    clothesReplaced,
    faceBox,
    sourceWidth: sourceCanvas.width,
    sourceHeight: sourceCanvas.height,
    headScale,
  }
}

export { CATEGORY }
