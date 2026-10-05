import { useCallback, useRef, useState } from 'react'
import { Camera, ImagePlus, Lightbulb, RefreshCw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { Alert, Button, Card, SectionTitle, cx } from './ui.jsx'
import { MAX_UPLOAD_BYTES, formatBytes, readFileAsDataURL } from '../lib/imageUtils.js'

const TIPS = [
  { icon: UserRound, text: 'Wajah menghadap kamera, tidak terhalang rambut atau tangan.' },
  { icon: Lightbulb, text: 'Pencahayaan rata (tidak setengah gelap), hindari backlight jendela.' },
  { icon: Camera, text: 'Ambil dari jarak dada ke atas supaya bahu ikut terlihat.' },
  { icon: ShieldCheck, text: 'Resolusi minimal 800 px sisi terpanjang agar hasil tetap tajam.' },
]

const SAMPLES = [
  { id: 'pria', label: 'Contoh pria', src: '/samples/contoh-pria.jpg' },
  { id: 'wanita', label: 'Contoh wanita', src: '/samples/contoh-wanita.jpg' },
]

export default function UploadStep({ photo, onPhoto, onNext, samplesAvailable = true }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = useCallback(
    async (file) => {
      setError(null)
      if (!file) return
      if (!file.type.startsWith('image/')) {
        setError('Berkas harus berupa gambar (JPG, PNG, atau WEBP).')
        return
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`Ukuran foto terlalu besar (${formatBytes(file.size)}). Maksimal 20 MB.`)
        return
      }
      try {
        const src = await readFileAsDataURL(file)
        onPhoto({ src, name: file.name, size: file.size, kind: 'file' })
      } catch (err) {
        setError(err.message)
      }
    },
    [onPhoto],
  )

  return (
    <div className="fade-in grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <Card className="flex flex-col">
        <SectionTitle
          icon={ImagePlus}
          title="1. Unggah foto kamu"
          subtitle="Gunakan foto yang sudah ada — selfie, foto wisuda, atau foto formal lama. Wajah dan tubuh tidak akan diubah."
          action={
            photo ? (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onPhoto(null)}>
                Ganti
              </Button>
            ) : null
          }
        />

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          onClick={() => inputRef.current?.click()}
          className={cx(
            'relative flex min-h-[320px] flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-all',
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/40',
          )}
        >
          {photo ? (
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-3">
              <img
                src={photo.src}
                alt="Pratinjau foto"
                className="max-h-[380px] w-auto rounded-xl object-contain shadow-lg ring-1 ring-slate-900/10"
              />
              <p className="max-w-full truncate text-xs text-slate-500">
                {photo.kind === 'sample' ? 'Foto contoh' : photo.name}
                {photo.size ? ` • ${formatBytes(photo.size)}` : ''}
              </p>
            </div>
          ) : (
            <div className="pop-in flex flex-col items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                <ImagePlus className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Tarik foto ke sini atau klik untuk memilih</p>
                <p className="mt-1 text-xs text-slate-500">JPG, PNG, atau WEBP • maksimal 20 MB</p>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {error ? (
          <div className="mt-3">
            <Alert tone="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </div>
        ) : null}

        {!photo && samplesAvailable ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Belum punya foto siap pakai? Coba contoh ini:</p>
            <div className="flex flex-wrap gap-3">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onPhoto({ src: s.src, name: s.label, kind: 'sample' })
                  }}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-2 pr-3 transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <img src={s.src} alt={s.label} className="h-12 w-9 rounded-lg object-cover" />
                  <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            Foto tidak disimpan di server. Mode AI mengirim foto ke Google Gemini memakai API key kamu.
          </p>
          <Button onClick={onNext} disabled={!photo} icon={RefreshCw} className="shrink-0">
            Lanjut pilih pakaian
          </Button>
        </div>
      </Card>

      <div className="space-y-5">
        <Card>
          <SectionTitle icon={Lightbulb} title="Tips supaya hasilnya maksimal" />
          <ul className="space-y-3">
            {TIPS.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <tip.icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-xs leading-relaxed text-slate-600">{tip.text}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Yang berubah & tidak berubah</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/15 p-3">
              <p className="font-semibold">Berubah</p>
              <ul className="mt-1.5 space-y-1 opacity-90">
                <li>• Latar belakang</li>
                <li>• Pakaian</li>
                <li>• Pencahayaan studio</li>
              </ul>
            </div>
            <div className="rounded-xl bg-white/15 p-3">
              <p className="font-semibold">Tetap sama</p>
              <ul className="mt-1.5 space-y-1 opacity-90">
                <li>• Wajah & ekspresi</li>
                <li>• Bentuk tubuh</li>
                <li>• Warna kulit</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed opacity-80">
            Semua instruksi ke model AI selalu menyertakan aturan “identitas orang di foto tidak boleh berubah”.
          </p>
        </Card>
      </div>
    </div>
  )
}
