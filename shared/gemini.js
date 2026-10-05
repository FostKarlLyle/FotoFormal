/**
 * shared/gemini.js
 * ---------------------------------------------------------------------------
 * Inti pemanggilan Gemini Image ("Nano Banana") untuk mengubah foto menjadi
 * foto formal: mengganti pakaian + latar belakang TANPA mengubah wajah & tubuh.
 *
 * File ini sengaja bebas dari API Node maupun DOM supaya bisa dipakai dua-duanya:
 *   - di browser (mode default, API key milik pengguna, tidak pernah dikirim ke server)
 *   - di server Express (mode opsional kalau GEMINI_API_KEY diisi di .env)
 *
 * Hanya memakai `fetch` yang sudah tersedia di browser modern dan Node 18+.
 * ---------------------------------------------------------------------------
 */

/** Daftar model yang didukung. Kunci = id model di Google API. */
export const GEMINI_IMAGE_MODELS = {
  'gemini-3.1-flash-lite-image': {
    label: 'Nano Banana 2 Lite',
    note: 'Paling cepat & paling murah. Cocok untuk volume besar.',
    api: 'interactions',
    aspectRatio: true,
    supportsReferenceImage: true,
  },
  'gemini-3.1-flash-image': {
    label: 'Nano Banana 2',
    note: 'Seimbang: kualitas tinggi, mendukung multi gambar referensi.',
    api: 'interactions',
    aspectRatio: true,
    supportsReferenceImage: true,
  },
  'gemini-3-pro-image': {
    label: 'Nano Banana Pro',
    note: 'Kualitas terbaik untuk detail rumit. Paling mahal/lambat.',
    api: 'interactions',
    aspectRatio: true,
    supportsReferenceImage: true,
  },
  'gemini-2.5-flash-image': {
    label: 'Nano Banana (klasik)',
    note: 'Legacy. Cukup bagus, tetap didukung banyak akun.',
    api: 'generateContent',
    aspectRatio: false,
    supportsReferenceImage: true,
  },
}

export const DEFAULT_MODEL = 'gemini-2.5-flash-image'

export const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

/* -------------------------------------------------------------------------- */
/* Prompt                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Menyusun prompt "cetak biru" hasil akhir yang sangat ketat menjaga identitas
 * orang di foto: wajah, tubuh, pose, dan proporsi harus identik.
 *
 * @param {object} opts
 * @param {string} opts.garment          Deskripsi pakaian formal (bahasa Inggris, lebih akurat untuk model).
 * @param {string} opts.background       Deskripsi latar belakang.
 * @param {string} [opts.backgroundHex]  Warna latar '#RRGGBB'.
 * @param {string} [opts.framing]        Contoh: 'head and shoulders composition'.
 * @param {string} [opts.extra]          Catatan tambahan dari pengguna.
 * @param {boolean} [opts.hasGarmentReference] Ada gambar referensi pakaian sebagai gambar kedua.
 */
export function buildPortraitPrompt({
  garment,
  background,
  backgroundHex,
  framing = 'head-and-shoulders composition with the head centred and a little space above the hair',
  extra = '',
  hasGarmentReference = false,
} = {}) {
  const hex = backgroundHex ? ` (exact colour ${backgroundHex.toUpperCase()})` : ''

  const garmentInstruction = hasGarmentReference
    ? `Dress the person in the outfit shown in the SECOND reference image: copy its style, cut, fabric, colour and details faithfully (${garment} as a written description). It must be worn naturally on this person's own shoulders, neck and body.`
    : `Dress the person in: ${garment} — neatly fitted, formal, well-tailored, with a natural modest neckline.`

  return [
    'Task: retouch the supplied photo into a professional studio portrait for an ID / passport / job-application photo.',
    '',
    'ABSOLUTE RULE — the person must remain exactly the same person:',
    'keep the exact same face, facial features, eyes, eyebrows, nose, mouth, jawline, ears, skin tone, skin texture, hairstyle, hair colour, age, body shape, body proportions, shoulder width, head angle and pose as in the input photo.',
    'The result must be instantly recognisable as the exact same individual. Do NOT beautify, slim, reshape, age or re-draw the face or the body. This is a clothing-and-background retouch, not a new portrait of a similar-looking person.',
    '',
    'Change exactly these two things and nothing else:',
    `1. CLOTHING: ${garmentInstruction} Keep the person's own body shape and posture, and make the garment follow the real anatomy with believable folds, seams and shadows.`,
    `2. BACKGROUND: remove the entire existing background including every object behind the person, and replace it with a plain, completely uniform, flat ${background} studio backdrop${hex}. Even lighting across the backdrop, no gradient banding, no vignette, no texture, no shadow cast on the wall, no text, no watermark, no logo.`,
    '',
    `Final image: ${framing}, straight-on eye-level camera angle, sharp focus on the face, soft even studio lighting on the face without harsh shadows, natural true-to-life skin texture, photorealistic, high detail, clean crisp edges around the hair.`,
    'Do not crop the top of the head. Do not add any extra people, props or text.',
    extra ? `Additional direction from the user: ${extra}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Prompt pengulangan: memakai hasil pertama sebagai dasar untuk mengoreksi. */
export function buildRefinePrompt(note) {
  return [
    'Edit the supplied image, which is already a formal portrait.',
    'Apply only this correction:',
    note,
    '',
    'Keep everything else byte-for-byte the same: the same person, the same face and expression, the same clothing, the same background colour, the same framing and lighting. Do not change the identity of the person in any way.',
  ].join('\n')
}

/* -------------------------------------------------------------------------- */
/* Request builder                                                             */
/* -------------------------------------------------------------------------- */

export function modelInfo(model) {
  return GEMINI_IMAGE_MODELS[model] || GEMINI_IMAGE_MODELS[DEFAULT_MODEL]
}

/**
 * @param {object} opts
 * @param {string} opts.model
 * @param {string} opts.prompt
 * @param {Array<{mimeType:string, data:string}>} [opts.images] base64 tanpa prefix data:
 * @param {string} [opts.aspectRatio] contoh '3:4'
 * @param {string} [opts.mimeType] format keluaran yang diminta
 */
export function buildRequestBody({ model, prompt, images = [], aspectRatio, mimeType = 'image/png' }) {
  const info = modelInfo(model)

  if (info.api === 'interactions') {
    const input = [{ type: 'text', text: prompt }]
    for (const img of images) {
      input.push({ type: 'image', mime_type: img.mimeType || 'image/jpeg', data: stripDataUrl(img.data) })
    }
    const response_format = { type: 'image', mime_type: mimeType }
    if (aspectRatio && info.aspectRatio) response_format.aspect_ratio = aspectRatio
    return { model, input, response_format }
  }

  // Endpoint klasik: models/{model}:generateContent
  const parts = [{ text: prompt }]
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: stripDataUrl(img.data) } })
  }
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  }
  if (aspectRatio && info.aspectRatio) {
    body.generationConfig.imageConfig = { aspectRatio }
  }
  return body
}

export function endpointFor(model) {
  const info = modelInfo(model)
  return info.api === 'interactions'
    ? `${API_BASE}/interactions`
    : `${API_BASE}/models/${model}:generateContent`
}

export function stripDataUrl(data) {
  if (typeof data !== 'string') return data
  const idx = data.indexOf('base64,')
  return idx >= 0 ? data.slice(idx + 7) : data
}

/* -------------------------------------------------------------------------- */
/* Response parsing                                                            */
/* -------------------------------------------------------------------------- */

const IMAGE_MIME = /^image\//

/**
 * Mencari gambar hasil di dalam respons. Google sudah beberapa kali mengubah
 * bentuk respons (inlineData, inline_data, output_image, outputs[],
 * generatedImages[].image.imageBytes, dst.) sehingga kita cari secara
 * terstruktur dulu, lalu jatuh ke pencarian rekursif sebagai jaring pengaman.
 */
export function extractImage(payload) {
  if (!payload) return null

  // Bentuk paling umum
  const fastPaths = [
    () => payload.output_image,
    () => payload.outputImage,
    () => payload.output?.image,
    () => payload.image,
    () => payload.outputs,
    () => payload.response?.output_image,
  ]
  for (const pick of fastPaths) {
    const found = deepFind(pick())
    if (found) return found
  }

  // Bentuk klasik generateContent
  const parts = payload?.candidates?.[0]?.content?.parts
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const found = deepFind(part?.inlineData || part?.inline_data || part)
      if (found) return found
    }
  }

  // Teks penolakan / catatan dari model
  const text = extractText(payload)
  if (text) return { text }

  return deepFind(payload, 0)
}

function deepFind(node, depth = 0) {
  if (!node || depth > 8) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFind(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object') return null

  const raw =
    node.data ??
    node.bytesBase64Encoded ??
    node.imageBytes ??
    node.base64 ??
    node.b64_json
  const mime =
    node.mime_type ?? node.mimeType ?? node.mime ?? node.image?.mimeType ?? node.content_type

  if (typeof raw === 'string' && raw.length > 200 && (!mime || IMAGE_MIME.test(String(mime)))) {
    return { data: stripDataUrl(raw), mimeType: mime || 'image/png' }
  }

  for (const value of Object.values(node)) {
    const found = deepFind(value, depth + 1)
    if (found) return found
  }
  return null
}

/** Mengumpulkan semua teks pada respons (untuk pesan penolakan / error model). */
export function extractText(payload) {
  const chunks = []
  const walk = (node, depth = 0) => {
    if (!node || depth > 8) return
    if (typeof node === 'string') return
    if (Array.isArray(node)) return node.forEach((n) => walk(n, depth + 1))
    if (typeof node !== 'object') return
    if (typeof node.text === 'string') chunks.push(node.text)
    if (typeof node.output_text === 'string') chunks.push(node.output_text)
    for (const [key, value] of Object.entries(node)) {
      if (key === 'data' || key === 'imageBytes' || key === 'bytesBase64Encoded') continue
      walk(value, depth + 1)
    }
  }
  walk(payload)
  return chunks.join('\n').trim()
}

export class GeminiError extends Error {
  constructor(message, { status, code, hint } = {}) {
    super(message)
    this.name = 'GeminiError'
    this.status = status
    this.code = code
    this.hint = hint
  }
}

function friendlyError(status, message = '') {
  const msg = String(message)
  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(msg)) {
    return new GeminiError('API key tidak valid.', { status, hint: 'Periksa kembali API key dari Google AI Studio.' })
  }
  if (status === 401 || status === 403) {
    return new GeminiError('API key ditolak / tidak punya akses ke model ini.', {
      status,
      hint: 'Pastikan API key benar, Generative Language API aktif, dan model tersedia untuk akunmu.',
    })
  }
  if (status === 404) {
    return new GeminiError('Model tidak ditemukan untuk API key ini.', {
      status,
      hint: 'Coba pilih model lain di panel Pengaturan, misalnya Nano Banana (klasik).',
    })
  }
  if (status === 429) {
    return new GeminiError('Kuota/limit permintaan tercapai.', {
      status,
      hint: 'Tunggu sebentar lalu coba lagi, atau ganti ke model lain.',
    })
  }
  return new GeminiError(msg || `Permintaan gagal (HTTP ${status}).`, { status })
}

/* -------------------------------------------------------------------------- */
/* Pemanggilan utama                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Memanggil Gemini untuk menghasilkan foto formal.
 * @returns {Promise<{data:string, mimeType:string, text?:string}>} gambar base64
 */
export async function generateFormalPhoto({
  apiKey,
  model = DEFAULT_MODEL,
  prompt,
  images = [],
  aspectRatio,
  mimeType = 'image/png',
  signal,
  fetchImpl = globalThis.fetch,
}) {
  if (!apiKey) throw new GeminiError('API key belum diisi.', { hint: 'Masukkan API key Google AI Studio terlebih dahulu.' })
  if (!prompt) throw new GeminiError('Prompt kosong.')

  const body = buildRequestBody({ model, prompt, images, aspectRatio, mimeType })
  const url = endpointFor(model)

  let response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new GeminiError(
      'Tidak bisa menghubungi server Google. Periksa koneksi internet / pemblokiran jaringan.',
      { hint: 'Beberapa jaringan kantor atau sekolah memblokir generativelanguage.googleapis.com.' },
    )
  }

  let json = null
  const raw = await response.text()
  try {
    json = raw ? JSON.parse(raw) : null
  } catch {
    json = null
  }

  if (!response.ok) {
    const message = json?.error?.message || raw?.slice(0, 300) || response.statusText
    throw friendlyError(response.status, message)
  }

  const result = extractImage(json)
  if (!result) {
    throw new GeminiError('Model tidak mengembalikan gambar.', {
      hint: 'Coba lagi, atau ubah deskripsi pakaian/latar.',
    })
  }
  if (result.text && !result.data) {
    throw new GeminiError(`Model menolak permintaan: ${result.text.slice(0, 300)}`, {
      hint: 'Gunakan foto orang (bukan kartun/anak di bawah umur), dan pastikan deskripsi wajar.',
    })
  }
  return result
}

/** Daftar model image yang tersedia untuk API key tertentu (opsional, untuk validasi). */
export async function listImageModels(apiKey, fetchImpl = globalThis.fetch) {
  if (!apiKey) throw new GeminiError('API key belum diisi.')
  const res = await fetchImpl(`${API_BASE}/models?pageSize=200`, {
    headers: { 'x-goog-api-key': apiKey },
  })
  if (!res.ok) throw friendlyError(res.status, await res.text())
  const json = await res.json()
  const models = (json.models || []).map((m) => String(m.name || '').replace('models/', ''))
  return models
}
