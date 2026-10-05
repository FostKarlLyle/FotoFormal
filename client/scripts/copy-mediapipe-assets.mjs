/**
 * Menyalin file runtime WebAssembly MediaPipe Tasks Vision dari node_modules
 * ke client/public/mediapipe/wasm supaya:
 *   - tidak ada ketergantungan ke CDN eksternal saat mode lokal dipakai,
 *   - tetap tersedia di dev server maupun hasil build produksi.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT = path.resolve(__dirname, '..')
const SRC = path.join(CLIENT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const DEST = path.join(CLIENT, 'public', 'mediapipe', 'wasm')

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)
    if (entry.isDirectory()) copyDir(src, dest)
    else fs.copyFileSync(src, dest)
  }
}

try {
  if (!fs.existsSync(SRC)) {
    console.warn('[mediapipe] folder wasm tidak ditemukan, lewati penyalinan:', SRC)
  } else {
    copyDir(SRC, DEST)
    console.log('[mediapipe] aset wasm disiapkan di public/mediapipe/wasm')
  }
} catch (err) {
  console.warn('[mediapipe] gagal menyalin aset wasm:', err.message)
}
