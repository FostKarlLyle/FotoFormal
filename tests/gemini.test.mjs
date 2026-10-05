/**
 * Uji unit untuk lapisan pemanggilan Gemini (shared/gemini.js).
 * Jalankan: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPortraitPrompt,
  buildRefinePrompt,
  buildRequestBody,
  endpointFor,
  extractImage,
  extractText,
  generateFormalPhoto,
  stripDataUrl,
  GeminiError,
  API_BASE,
} from '../shared/gemini.js'

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AARAA'.repeat(6)

test('prompt utama memuat aturan mempertahankan identitas', () => {
  const prompt = buildPortraitPrompt({
    garment: 'a tailored black suit jacket',
    background: 'solid flat crimson-red',
    backgroundHex: '#c8102e',
  })
  assert.match(prompt, /exactly the same person/i)
  assert.match(prompt, /a tailored black suit jacket/)
  assert.match(prompt, /solid flat crimson-red/)
  assert.match(prompt, /#C8102E/)
  assert.match(prompt, /Do not beautify, slim, reshape/i)
})

test('prompt utama menyebut gambar referensi pakaian bila ada', () => {
  const prompt = buildPortraitPrompt({ garment: 'navy blazer', background: 'white', hasGarmentReference: true })
  assert.match(prompt, /SECOND reference image/)
})

test('prompt revisi meminta mempertahankan sisanya', () => {
  const prompt = buildRefinePrompt('rapikan rambut yang menutupi telinga')
  assert.match(prompt, /rapikan rambut/)
  assert.match(prompt, /same person, the same face/)
})

test('body untuk model generasi baru (interactions)', () => {
  const body = buildRequestBody({
    model: 'gemini-3.1-flash-image',
    prompt: 'halo',
    images: [{ mimeType: 'image/jpeg', data: `data:image/jpeg;base64,${PNG}` }],
    aspectRatio: '3:4',
  })
  assert.equal(body.model, 'gemini-3.1-flash-image')
  assert.equal(body.input[0].type, 'text')
  assert.equal(body.input[1].type, 'image')
  assert.equal(body.input[1].data, PNG, 'prefix data URL harus dibuang')
  assert.deepEqual(body.response_format, { type: 'image', mime_type: 'image/png', aspect_ratio: '3:4' })
  assert.equal(endpointFor('gemini-3.1-flash-image'), `${API_BASE}/interactions`)
})

test('body untuk model klasik memakai generateContent', () => {
  const body = buildRequestBody({
    model: 'gemini-2.5-flash-image',
    prompt: 'halo',
    images: [{ mimeType: 'image/png', data: PNG }],
  })
  assert.equal(body.contents[0].parts[0].text, 'halo')
  assert.equal(body.contents[0].parts[1].inline_data.mime_type, 'image/png')
  assert.deepEqual(body.generationConfig.responseModalities, ['IMAGE'])
  assert.equal(
    endpointFor('gemini-2.5-flash-image'),
    `${API_BASE}/models/gemini-2.5-flash-image:generateContent`,
  )
})

test('extractImage menangani berbagai bentuk respons Google', () => {
  const classic = {
    candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG } }] } }],
  }
  assert.deepEqual(extractImage(classic), { data: PNG, mimeType: 'image/png' })

  const snake = { output_image: { mime_type: 'image/png', data: PNG } }
  assert.equal(extractImage(snake)?.data, PNG)

  const camel = { output: { image: { mimeType: 'image/jpeg', bytesBase64Encoded: PNG } } }
  assert.deepEqual(extractImage(camel), { data: PNG, mimeType: 'image/jpeg' })

  const outputs = { outputs: [{ type: 'image', mime_type: 'image/png', data: PNG }] }
  assert.equal(extractImage(outputs)?.data, PNG)

  const generated = { generatedImages: [{ image: { imageBytes: PNG } }] }
  assert.equal(extractImage(generated)?.data, PNG)
})

test('extractImage mengembalikan teks bila model menolak', () => {
  const refusal = { candidates: [{ content: { parts: [{ text: 'Maaf, saya tidak bisa membantu.' }] } }] }
  const result = extractImage(refusal)
  assert.equal(result?.data, undefined)
  assert.match(result.text, /tidak bisa membantu/)
  assert.match(extractText(refusal), /tidak bisa membantu/)
})

test('stripDataUrl bekerja untuk data URL dan base64 polos', () => {
  assert.equal(stripDataUrl(`data:image/png;base64,${PNG}`), PNG)
  assert.equal(stripDataUrl(PNG), PNG)
})

test('generateFormalPhoto mengirim header & mengembalikan gambar', async () => {
  let captured = null
  const fakeFetch = async (url, init) => {
    captured = { url, init }
    return new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG } }] } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const result = await generateFormalPhoto({
    apiKey: 'kunci-uji',
    model: 'gemini-2.5-flash-image',
    prompt: 'ubah jadi foto formal',
    images: [{ mimeType: 'image/jpeg', data: PNG }],
    fetchImpl: fakeFetch,
  })

  assert.equal(result.data, PNG)
  assert.equal(captured.init.headers['x-goog-api-key'], 'kunci-uji')
  assert.ok(captured.url.endsWith(':generateContent'))
  const body = JSON.parse(captured.init.body)
  assert.equal(body.contents[0].parts[0].text, 'ubah jadi foto formal')
})

test('generateFormalPhoto menerjemahkan error kuota (429)', async () => {
  const fakeFetch = async () =>
    new Response(JSON.stringify({ error: { message: 'quota exceeded', status: 'RESOURCE_EXHAUSTED' } }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })

  await assert.rejects(
    () => generateFormalPhoto({ apiKey: 'x', prompt: 'p', images: [], fetchImpl: fakeFetch }),
    (err) => {
      assert.ok(err instanceof GeminiError)
      assert.equal(err.status, 429)
      assert.match(err.message, /Kuota/)
      assert.ok(err.hint)
      return true
    },
  )
})

test('generateFormalPhoto menjelaskan kegagalan jaringan', async () => {
  const fakeFetch = async () => {
    throw new TypeError('fetch failed')
  }
  await assert.rejects(
    () => generateFormalPhoto({ apiKey: 'x', prompt: 'p', images: [], fetchImpl: fakeFetch }),
    (err) => {
      assert.match(err.message, /Tidak bisa menghubungi server Google/)
      return true
    },
  )
})

test('generateFormalPhoto menolak tanpa API key', async () => {
  await assert.rejects(() => generateFormalPhoto({ apiKey: '', prompt: 'p', images: [] }), /API key belum diisi/)
})
