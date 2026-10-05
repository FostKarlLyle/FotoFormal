/**
 * Smoke test: mount aplikasi hasil build di dalam jsdom, lalu telusuri
 * langkah 1→3 dan periksa jalur error saat API key belum diisi.
 * Jalankan: node /tmp/ffsmoke/smoke.mjs
 */
import fs from 'node:fs'
import { JSDOM } from 'jsdom'

/**
 * Pakai: npm run test:ui
 * Membutuhkan hasil build di client/dist (npm run build) dan paket `jsdom`.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '..', 'client', 'dist', 'assets')
const BUNDLE =
  process.argv[2] ||
  (() => {
    if (!fs.existsSync(DIST)) throw new Error('Jalankan `npm run build` lebih dulu.')
    const file = fs.readdirSync(DIST).find((f) => f.endsWith('.js'))
    if (!file) throw new Error('Bundel JS tidak ditemukan di client/dist/assets.')
    return path.join(DIST, file)
  })()

const html = `<!doctype html><html><body><div id="root"></div></body></html>`
const dom = new JSDOM(html, {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
  resources: undefined,
})

const win = dom.window
const define = (name, value) => {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  } catch (err) {
    console.warn('tidak bisa set global', name, err.message)
  }
}
define('window', win)
define('document', win.document)
define('navigator', win.navigator)
define('localStorage', win.localStorage)
define('sessionStorage', win.sessionStorage)
define('Image', win.Image)
define('HTMLCanvasElement', win.HTMLCanvasElement)
define('HTMLImageElement', win.HTMLImageElement)
define('ImageData', win.ImageData)
define('requestAnimationFrame', win.requestAnimationFrame.bind(win))
define('cancelAnimationFrame', win.cancelAnimationFrame.bind(win))
define('getComputedStyle', win.getComputedStyle.bind(win))
define('CustomEvent', win.CustomEvent)
define('Event', win.Event)
define('MutationObserver', win.MutationObserver)
define('DOMParser', win.DOMParser)
define('fetch', async () => {
  throw new Error('fetch dinonaktifkan dalam smoke test')
})

const errors = []
const origError = console.error
console.error = (...args) => {
  errors.push(args.map(String).join(' '))
  origError(...args)
}

await import(`file://${BUNDLE}`)
await new Promise((r) => setTimeout(r, 600))

const text = () => win.document.body.textContent || ''
const fail = []
const check = (label, cond) => {
  console.log(`${cond ? '✅' : '❌'} ${label}`)
  if (!cond) fail.push(label)
}

check('halaman termuat & langkah 1 tampil', text().includes('Unggah foto kamu'))
check('tips ditampilkan', text().includes('Tips supaya hasilnya maksimal'))
check('tombol contoh foto tersedia', text().includes('Contoh pria'))

const findButton = (label) =>
  [...win.document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().includes(label))

const click = (el) => {
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }))
}

// 1 → 2
click(findButton('Contoh pria'))
await new Promise((r) => setTimeout(r, 200))
check('foto contoh terpilih (pratinjau muncul)', !!win.document.querySelector('img[alt="Pratinjau foto"]'))
click(findButton('Lanjut pilih pakaian'))
await new Promise((r) => setTimeout(r, 200))
check('langkah 2 tampil', text().includes('Pilih pakaian formal'))
check('kartu pakaian ter-render', text().includes('Jas Hitam + Dasi'))

click(findButton('Lanjut pilih latar & ukuran'))
await new Promise((r) => setTimeout(r, 200))
check('langkah 3 tampil', text().includes('Paket cepat'))
check('pilihan ukuran tampil', text().includes('3 × 4 cm'))

// preset cepat
click(findButton('Ijazah'))
await new Promise((r) => setTimeout(r, 200))
check('preset ijazah diterapkan', text().includes('Biru') || text().includes('Latar biru'))

// tombol proses tanpa API key → harus muncul pesan ramah
click(findButton('Buat foto formal'))
await new Promise((r) => setTimeout(r, 300))
check('error API key kosong muncul', text().includes('API key belum diisi'))
check('panel pengaturan terbuka', text().includes('Mode pengolahan'))

// ganti ke Mode Lokal
click(findButton('Mode Lokal'))
await new Promise((r) => setTimeout(r, 200))
check('mode lokal bisa dipilih', text().includes('Gratis & privat'))
click(findButton('Tutup'))
await new Promise((r) => setTimeout(r, 200))
check('panel pengaturan tertutup', !text().includes('Mode pengolahan'))

// tutup pesan error, lalu proses di mode lokal (tidak boleh minta API key)
click([...win.document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '×'))
await new Promise((r) => setTimeout(r, 150))
check('pesan error bisa ditutup', !text().includes('API key belum diisi'))

click(findButton('Buat foto formal'))
await new Promise((r) => setTimeout(r, 300))
check('mode lokal langsung memproses tanpa API key', text().includes('Memproses'))
check('mode lokal tidak meminta API key', !text().includes('API key belum diisi'))

console.log('\n--- console.error selama uji ---')
if (!errors.length) console.log('(tidak ada)')
errors.slice(0, 6).forEach((e) => console.log(' •', e.slice(0, 200)))

console.log(fail.length ? `\nGAGAL: ${fail.length} pemeriksaan` : '\nSEMUA PEMERIKSAAN LULUS')
process.exit(fail.length ? 1 : 0)
