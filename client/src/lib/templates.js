/**
 * Pilihan latar belakang, pakaian, ukuran cetak, dan paket cepat.
 * `prompt` ditulis dalam bahasa Inggris karena model gambar mengikuti
 * instruksi berbahasa Inggris jauh lebih akurat.
 */

/* ------------------------------- LATAR ----------------------------------- */

export const BACKGROUNDS = [
  {
    id: 'merah',
    label: 'Merah',
    hex: '#C8102E',
    deepHex: '#A00B24',
    prompt: 'solid flat crimson-red',
    note: 'KTP, SIM, paspor Indonesia',
  },
  {
    id: 'biru',
    label: 'Biru',
    hex: '#0F4C9C',
    deepHex: '#0A356B',
    prompt: 'solid flat royal-blue',
    note: 'Ijazah, lamaran kerja',
  },
  {
    id: 'putih',
    label: 'Putih',
    hex: '#FFFFFF',
    deepHex: '#EDEFF2',
    prompt: 'pure flat white',
    note: 'Visa, dokumen internasional',
  },
  {
    id: 'abu',
    label: 'Abu-abu',
    hex: '#B4B9C0',
    deepHex: '#8E949C',
    prompt: 'solid flat light-grey',
    note: 'Foto profesional & LinkedIn',
  },
  {
    id: 'biru-muda',
    label: 'Biru muda',
    hex: '#9EC5EF',
    deepHex: '#7BA7D6',
    prompt: 'solid flat soft light-blue',
    note: 'Sekolah, organisasi',
  },
  {
    id: 'hijau',
    label: 'Hijau',
    hex: '#0E6E4E',
    deepHex: '#0A5138',
    prompt: 'solid flat dark-green',
    note: 'Instansi / kedinasan',
  },
  {
    id: 'krem',
    label: 'Krem',
    hex: '#EFE6D6',
    deepHex: '#D8CCB6',
    prompt: 'solid flat warm cream-beige',
    note: 'Wisuda, konsep hangat',
  },
  {
    id: 'hitam',
    label: 'Hitam',
    hex: '#15171C',
    deepHex: '#000000',
    prompt: 'solid flat deep black',
    note: 'Kesan tegas & formal',
  },
]

export const DEFAULT_BACKGROUND = 'merah'

/* ------------------------------- PAKAIAN --------------------------------- */

export const GARMENTS = [
  {
    id: 'jas-hitam',
    label: 'Jas Hitam + Dasi',
    kind: 'suit',
    prompt:
      'a sharply tailored black formal suit jacket with notch lapels, worn over a crisp white dress shirt with a neatly knotted dark navy necktie',
    colors: { jacket: '#171A1F', shirt: '#F8FAFC', tie: '#1E2A44', accent: '#0B0D10' },
    drawTie: true,
  },
  {
    id: 'jas-navy',
    label: 'Jas Navy + Dasi',
    kind: 'suit',
    prompt:
      'a sharply tailored navy blue formal suit jacket with notch lapels, worn over a crisp white dress shirt with a neatly knotted deep-red necktie',
    colors: { jacket: '#1C2B4A', shirt: '#F8FAFC', tie: '#7A1B2B', accent: '#111B2E' },
    drawTie: true,
  },
  {
    id: 'jas-abu',
    label: 'Jas Abu + Dasi',
    kind: 'suit',
    prompt:
      'a sharply tailored charcoal grey formal suit jacket with notch lapels, worn over a crisp white dress shirt with a neatly knotted matching grey necktie',
    colors: { jacket: '#40464E', shirt: '#F8FAFC', tie: '#2C323A', accent: '#282D33' },
    drawTie: true,
  },
  {
    id: 'blazer-navy',
    label: 'Blazer Navy',
    kind: 'blazer',
    prompt:
      'an elegant tailored navy blue blazer over a plain white blouse with a modest closed neckline',
    colors: { jacket: '#1C2B4A', shirt: '#F8FAFC', tie: null, accent: '#111B2E' },
    drawTie: false,
  },
  {
    id: 'blazer-hitam',
    label: 'Blazer Hitam',
    kind: 'blazer',
    prompt:
      'an elegant fitted black blazer over a plain white blouse with a modest closed neckline',
    colors: { jacket: '#171A1F', shirt: '#F8FAFC', tie: null, accent: '#0B0D10' },
    drawTie: false,
  },
  {
    id: 'kemeja-putih',
    label: 'Kemeja Putih',
    kind: 'shirt',
    prompt:
      'a crisp white long-sleeved button-up dress shirt with a stiff collar, buttoned up neatly',
    colors: { jacket: '#F8FAFC', shirt: '#F8FAFC', tie: null, accent: '#D9DEE5' },
    drawTie: false,
  },
  {
    id: 'kemeja-biru',
    label: 'Kemeja Biru Muda',
    kind: 'shirt',
    prompt:
      'a light blue long-sleeved button-up dress shirt with a stiff collar, buttoned up neatly',
    colors: { jacket: '#BFD8F2', shirt: '#BFD8F2', tie: null, accent: '#96B6D8' },
    drawTie: false,
  },
  {
    id: 'batik',
    label: 'Kemeja Batik Formal',
    kind: 'batik',
    prompt:
      'a formal long-sleeved Indonesian batik shirt with a neat upright collar; dark brown and dark navy traditional batik patterns, elegant and understated',
    colors: { jacket: '#4B3325', shirt: '#4B3325', tie: null, accent: '#2F2016', pattern: 'batik' },
    drawTie: false,
  },
  {
    id: 'kebaya',
    label: 'Kebaya Modern',
    kind: 'kebaya',
    prompt:
      'an elegant Indonesian kebaya blouse in a deep maroon colour with subtle embroidery and a modest closed neckline, formal and neat',
    colors: { jacket: '#7C1F3C', shirt: '#7C1F3C', tie: null, accent: '#58132A' },
    drawTie: false,
  },
  {
    id: 'seragam-sekolah',
    label: 'Seragam Sekolah (Putih)',
    kind: 'shirt',
    prompt:
      'a crisp white short-sleeved school uniform shirt with a neat collar, worn with a dark grey necktie',
    colors: { jacket: '#F8FAFC', shirt: '#F8FAFC', tie: '#4A5058', accent: '#D9DEE5' },
    drawTie: true,
  },
  {
    id: 'custom',
    label: 'Tulis Sendiri',
    kind: 'custom',
    prompt: '',
    colors: { jacket: '#334155', shirt: '#F8FAFC', tie: null, accent: '#1F2937' },
    drawTie: false,
  },
]

export const DEFAULT_GARMENT = 'jas-hitam'

/* -------------------------------- UKURAN --------------------------------- */

const DPI = 300
const cmToPx = (cm, dpi = DPI) => Math.round((cm / 2.54) * dpi)

export const SIZES = [
  {
    id: '2x3',
    label: '2 × 3 cm',
    ratio: '2:3',
    width: cmToPx(2),
    height: cmToPx(3),
    note: 'Pas foto umum, KTP, SIM',
  },
  {
    id: '3x4',
    label: '3 × 4 cm',
    ratio: '3:4',
    width: cmToPx(3),
    height: cmToPx(4),
    note: 'Ijazah, lamaran kerja, paspor RI',
  },
  {
    id: '4x6',
    label: '4 × 6 cm',
    ratio: '2:3',
    width: cmToPx(4),
    height: cmToPx(6),
    note: 'Cetak besar / foto panggung',
  },
  {
    id: '35x45',
    label: '3,5 × 4,5 cm',
    ratio: '3:4',
    width: cmToPx(3.5),
    height: cmToPx(4.5),
    note: 'Visa Schengen & Jepang',
  },
  {
    id: '1x1in',
    label: '1 × 1 inci',
    ratio: '1:1',
    width: 300,
    height: 300,
    note: 'Visa Amerika Serikat',
  },
  {
    id: '2x2in',
    label: '2 × 2 inci',
    ratio: '1:1',
    width: cmToPx(5.08),
    height: cmToPx(5.08),
    note: 'Visa AS, dokumen internasional',
  },
]

export const DEFAULT_SIZE = '3x4'

/* ----------------------------- PAKET CEPAT ------------------------------- */

export const QUICK_PRESETS = [
  {
    id: 'ktp',
    label: 'KTP / SIM',
    background: 'merah',
    garment: 'kemeja-putih',
    size: '2x3',
    caption: 'Latar merah, 2×3 cm',
  },
  {
    id: 'ijazah',
    label: 'Ijazah',
    background: 'biru',
    garment: 'jas-hitam',
    size: '3x4',
    caption: 'Latar biru, jas + dasi',
  },
  {
    id: 'lamaran',
    label: 'Lamaran Kerja',
    background: 'biru',
    garment: 'blazer-navy',
    size: '3x4',
    caption: 'Terlihat profesional',
  },
  {
    id: 'paspor',
    label: 'Paspor RI',
    background: 'merah',
    garment: 'kemeja-putih',
    size: '3x4',
    caption: 'Latar merah, kemeja',
  },
  {
    id: 'visa',
    label: 'Visa',
    background: 'putih',
    garment: 'kemeja-putih',
    size: '35x45',
    caption: 'Latar putih 3,5×4,5',
  },
  {
    id: 'sekolah',
    label: 'Sekolah',
    background: 'biru-muda',
    garment: 'seragam-sekolah',
    size: '3x4',
    caption: 'Seragam putih',
  },
]

/* -------------------------------- Helper --------------------------------- */

export function getBackground(id) {
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0]
}

export function getGarment(id) {
  return GARMENTS.find((g) => g.id === id) || GARMENTS[0]
}

export function getSize(id) {
  return SIZES.find((s) => s.id === id) || SIZES[1]
}

export const GENDER_HINTS = [
  { id: 'auto', label: 'Otomatis' },
  { id: 'pria', label: 'Pria' },
  { id: 'wanita', label: 'Wanita' },
]
