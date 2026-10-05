/**
 * server/index.js
 * ---------------------------------------------------------------------------
 * Server Express untuk FotoFormal.
 *
 * Perannya kecil dengan sengaja:
 *   1. Menyajikan hasil build frontend (client/dist) untuk mode produksi.
 *   2. Menyediakan endpoint status + proxy AI OPSIONAL. Pada mode default,
 *      aplikasi memanggil Google Gemini langsung dari browser memakai API key
 *      milik pengguna, sehingga key tidak pernah menyentuh server ini.
 *
 * Jalankan: npm run dev   (server + vite sekaligus)
 * ---------------------------------------------------------------------------
 */
import 'dotenv/config'
import express from 'express'
import compression from 'compression'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { generateFormalPhoto, DEFAULT_MODEL, GEMINI_IMAGE_MODELS } from '../shared/gemini.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CLIENT_DIST = path.join(ROOT, 'client', 'dist')

const PORT = Number(process.env.PORT || 8787)
const SERVER_KEY = (process.env.GEMINI_API_KEY || '').trim()
const SERVER_AI_ENABLED = String(process.env.ENABLE_SERVER_AI || '').toLowerCase() === 'true' && !!SERVER_KEY

const app = express()
app.disable('x-powered-by')
app.use(compression())
app.use(express.json({ limit: '30mb' }))

/* ------------------------------- API ------------------------------------- */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'fotoformal', time: new Date().toISOString() })
})

app.get('/api/ai/status', (_req, res) => {
  res.json({
    serverKeyAvailable: !!SERVER_KEY && SERVER_AI_ENABLED,
    serverKeyConfigured: !!SERVER_KEY,
    serverAiEnabled: SERVER_AI_ENABLED,
    defaultModel: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    models: Object.entries(GEMINI_IMAGE_MODELS).map(([id, info]) => ({ id, ...info })),
  })
})

// Rate limit sederhana (in-memory) agar proxy server tidak disalahgunakan.
const hits = new Map()
const WINDOW_MS = 10 * 60 * 1000
const MAX_HITS = 30

function rateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip) || { count: 0, reset: now + WINDOW_MS }
  if (now > entry.reset) {
    entry.count = 0
    entry.reset = now + WINDOW_MS
  }
  entry.count += 1
  hits.set(ip, entry)
  return entry.count > MAX_HITS
}

app.post('/api/ai/generate', async (req, res) => {
  if (!SERVER_AI_ENABLED) {
    return res.status(503).json({
      error: 'Mode AI server tidak aktif. Isi GEMINI_API_KEY dan set ENABLE_SERVER_AI=true di file .env.',
      code: 'SERVER_AI_DISABLED',
    })
  }
  if (rateLimited(req.ip || 'unknown')) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.', code: 'RATE_LIMITED' })
  }

  const { prompt, images = [], aspectRatio, model = process.env.GEMINI_MODEL || DEFAULT_MODEL } = req.body || {}
  if (!prompt) return res.status(400).json({ error: 'Field "prompt" wajib diisi.' })

  try {
    const result = await generateFormalPhoto({
      apiKey: SERVER_KEY,
      model,
      prompt,
      images,
      aspectRatio,
    })
    res.json(result)
  } catch (err) {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500
    res.status(status).json({ error: err.message || 'Gagal memproses gambar.', hint: err.hint, code: err.code })
  }
})

/* --------------------------- Static frontend ------------------------------ */

const hasBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'))

if (hasBuild) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1h', index: false }))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'))
  })
} else {
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.status(200).type('html').send(`<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>FotoFormal — server aktif</title>
<style>body{font-family:system-ui,sans-serif;max-width:44rem;margin:8vh auto;padding:0 1.5rem;line-height:1.6;color:#111}
code{background:#f3f4f6;padding:.15rem .4rem;border-radius:.3rem}</style></head>
<body>
  <h1>✅ Server FotoFormal aktif</h1>
  <p>Belum ada hasil build frontend. Untuk pengembangan, buka dev server Vite
  (biasanya <a href="http://localhost:5173">http://localhost:5173</a>) yang otomatis
  mem-proxy <code>/api</code> ke server ini.</p>
  <p>Untuk mode produksi jalankan <code>npm run build</code> lalu <code>npm start</code>.</p>
</body></html>`)
  })
}

/* -------------------------------- Start ---------------------------------- */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[fotoformal] API server siap di http://0.0.0.0:${PORT}`)
  console.log(`[fotoformal] mode AI server: ${SERVER_AI_ENABLED ? 'AKTIF (pakai GEMINI_API_KEY dari .env)' : 'nonaktif (browser memakai API key pengguna)'}`)
  console.log(`[fotoformal] frontend build: ${hasBuild ? 'ditemukan di client/dist' : 'belum ada (pakai vite dev server)'}`)
})
