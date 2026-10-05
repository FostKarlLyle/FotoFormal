/**
 * aiEngine.js — jembatan antara UI dan model gambar Gemini.
 *
 * Dua jalur pemanggilan:
 *  1. `useServerKey`  → lewat backend Express (/api/ai/generate). Dipakai kalau
 *     pemilik aplikasi mengisi GEMINI_API_KEY di .env, sehingga pengguna tidak
 *     perlu API key sendiri.
 *  2. default         → langsung dari browser memakai API key yang ditempel
 *     pengguna. Key disimpan hanya di localStorage browser-nya sendiri.
 */
import {
  buildPortraitPrompt,
  buildRefinePrompt,
  generateFormalPhoto,
  GEMINI_IMAGE_MODELS,
  DEFAULT_MODEL,
  GeminiError,
} from '@shared/gemini'
import { getBackground, getGarment, getSize } from './templates'
import { canvasToBase64, imageToCanvas, loadImage } from './imageUtils'

export { GeminiError, DEFAULT_MODEL }

export const AI_MODEL_OPTIONS = Object.entries(GEMINI_IMAGE_MODELS).map(([id, info]) => ({ id, ...info }))

/** Sisi terpanjang gambar yang dikirim ke API. 1280–1600 px sudah cukup tajam dan hemat kuota. */
const API_IMAGE_MAX_SIDE = 1400

/**
 * Menyiapkan gambar unggahan untuk dikirim ke API: diperkecil, dikompres ke JPEG,
 * lalu dikembalikan sebagai { mimeType, data } base64.
 */
export async function prepareImageForApi(src, { maxSide = API_IMAGE_MAX_SIDE, mimeType = 'image/jpeg', quality = 0.92 } = {}) {
  const img = await loadImage(src)
  const canvas = imageToCanvas(img, { maxSide })
  return { mimeType, data: canvasToBase64(canvas, mimeType, quality) }
}

/**
 * Menyusun prompt utama "ubah jadi foto formal" berdasarkan pilihan pengguna.
 */
export function composeMainPrompt({
  garmentId,
  customGarment,
  backgroundId,
  customBackground = {},
  sizeId,
  gender = 'auto',
  extra = '',
  hasGarmentReference = false,
} = {}) {
  const garment = getGarment(garmentId)
  const background = getBackground(backgroundId)
  const size = getSize(sizeId)

  const garmentText = garmentId === 'custom' && customGarment?.trim() ? customGarment.trim() : garment.prompt

  const bgHex = customBackground.hex || background.hex
  const bgText = customBackground.prompt || background.prompt

  const genderNote =
    gender === 'pria'
      ? 'The person is male; keep the clothing masculine and appropriate.'
      : gender === 'wanita'
        ? 'The person is female; keep the clothing feminine and modest.'
        : ''

  const sizeNote = `The final photo must be a ${size.label} portrait (aspect ratio ${size.ratio}).`

  return buildPortraitPrompt({
    garment: garmentText,
    background: bgText,
    backgroundHex: bgHex,
    framing: `head-and-shoulders framing suitable for a ${size.label} formal photograph, head centred, eyes about 55-60% down from the top edge, generous space above the hair`,
    extra: [sizeNote, genderNote, extra?.trim()].filter(Boolean).join(' '),
    hasGarmentReference,
  })
}

/**
 * Prompt untuk memperbaiki hasil sebelumnya (mis. "dasi terlalu besar").
 */
export function composeRefinePrompt(note) {
  return buildRefinePrompt(note)
}

/**
 * Menjalankan generasi lewat browser (API key pengguna) atau lewat server.
 * @returns {Promise<{dataUrl:string, model:string, path:'browser'|'server'}>}
 */
export async function runAIGeneration({
  apiKey,
  useServerKey = false,
  model = DEFAULT_MODEL,
  prompt,
  images = [], // array data URL / canvas
  aspectRatio,
  signal,
  onProgress,
}) {
  const prepared = []
  for (const img of images) {
    if (!img) continue
    if (typeof img === 'string') prepared.push(await prepareImageForApi(img))
    else prepared.push({ mimeType: 'image/jpeg', data: canvasToBase64(img, 'image/jpeg', 0.92) })
  }

  onProgress?.('Mengirim foto ke model AI…')

  if (useServerKey) {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, images: prepared, aspectRatio, model }),
      signal,
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new GeminiError(json?.error || `Server gagal memproses (HTTP ${res.status}).`, { hint: json?.hint })
    }
    return {
      dataUrl: `data:${json.mimeType || 'image/png'};base64,${json.data}`,
      model,
      path: 'server',
    }
  }

  const result = await generateFormalPhoto({
    apiKey,
    model,
    prompt,
    images: prepared,
    aspectRatio,
    signal,
  })

  return {
    dataUrl: `data:${result.mimeType || 'image/png'};base64,${result.data}`,
    model,
    path: 'browser',
  }
}
