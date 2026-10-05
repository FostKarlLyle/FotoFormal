import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  History,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Alert, Button, Card, SectionTitle, Segmented, cx } from './ui.jsx'

export default function ResultStep({
  result,
  originalSrc,
  history,
  onSelectHistory,
  onBack,
  onRegenerate,
  onRefine,
  onExport,
  busy,
  progress,
  error,
  onDismissError,
}) {
  const [position, setPosition] = useState(52)
  const [format, setFormat] = useState('png')
  const [dpiScale, setDpiScale] = useState(1)
  const [refineNote, setRefineNote] = useState('')
  const frameRef = useRef(null)

  const previewSrc = useMemo(() => result?.canvas?.toDataURL('image/jpeg', 0.92) || result?.dataUrl, [result])

  const dragging = useRef(false)
  const updateFromEvent = (clientX) => {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, pct)))
  }

  if (!result) return null

  return (
    <div className="fade-in grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Card className="flex flex-col">
        <SectionTitle
          icon={CheckCircle2}
          title="4. Hasil foto formal"
          subtitle={`${result.sizeLabel} • ${result.width}×${result.height} px • ${result.dpi} DPI • ${
            result.mode === 'ai' ? 'Mode AI' : 'Mode Lokal'
          }`}
          action={
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
              siap cetak
            </span>
          }
        />

        <div
          ref={frameRef}
          onPointerDown={(e) => {
            dragging.current = true
            updateFromEvent(e.clientX)
          }}
          onPointerMove={(e) => dragging.current && updateFromEvent(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
          className="relative mx-auto w-full max-w-[380px] cursor-ew-resize overflow-hidden rounded-2xl bg-slate-900/5 shadow-inner select-none"
          style={{ aspectRatio: `${result.width} / ${result.height}` }}
        >
          <img src={previewSrc} alt="Hasil foto formal" className="absolute inset-0 h-full w-full object-cover" />
          {/* Foto asli dipotong dengan clip-path supaya lebarnya selalu sama dengan bingkai */}
          <img
            src={originalSrc}
            alt="Foto asli"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          />
          <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.45)]" style={{ left: `${position}%` }}>
            <span className="absolute top-1/2 left-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-700 shadow-lg">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
          </div>
          <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-slate-900/65 px-2 py-0.5 text-[10px] font-medium text-white">
            Sebelum
          </span>
          <span className="pointer-events-none absolute right-2 bottom-2 rounded-md bg-slate-900/65 px-2 py-0.5 text-[10px] font-medium text-white">
            Sesudah
          </span>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-400">
          Geser garis putih untuk membandingkan. Wajah & proporsi tubuh harus tetap sama seperti foto asli.
        </p>

        {result.mode === 'local' ? (
          <div className="mt-3">
            <Alert tone={result.clothesReplaced ? 'warn' : 'info'}>
              {result.faceDetected
                ? 'Wajah terdeteksi — komposisi & ukuran kepala sudah otomatis disesuaikan.'
                : 'Wajah tidak terdeteksi, foto dipotong dengan komposisi standar. Coba foto yang lebih terang dan menghadap kamera.'}
              {result.clothesReplaced
                ? ' Area pakaian diwarnai ulang sesuai pilihanmu (bukan pakaian baru) — pakai Mode AI untuk hasil fotoreal.'
                : ''}
            </Alert>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3">
            <Alert tone="error" onClose={onDismissError}>
              {error}
            </Alert>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <Segmented
            value={String(dpiScale)}
            onChange={(v) => setDpiScale(Number(v))}
            options={[
              { value: '1', label: '300 DPI' },
              { value: '2', label: '600 DPI' },
            ]}
          />
          <Segmented
            value={format}
            onChange={setFormat}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpg', label: 'JPG' },
            ]}
          />
          <Button
            icon={Download}
            onClick={() => onExport({ format, dpiScale })}
            loading={busy}
            disabled={busy}
            className="ml-auto"
          >
            Unduh hasil
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={RotateCcw} onClick={onBack}>
            Ubah pengaturan
          </Button>
          <Button variant="outline" size="sm" icon={ImageIcon} onClick={onRegenerate} disabled={busy}>
            Proses ulang
          </Button>
          {result.parentId ? (
            <span className="self-center text-[11px] text-slate-400">hasil revisi</span>
          ) : null}
        </div>
      </Card>

      <div className="space-y-5">
        {result.mode === 'ai' ? (
          <Card>
            <SectionTitle
              icon={Sparkles}
              title="Belum pas? Minta revisi"
              subtitle="Tulis instruksi kecil, lalu model akan memperbaiki tanpa mengubah identitas wajah."
            />
            <textarea
              value={refineNote}
              onChange={(e) => setRefineNote(e.target.value)}
              rows={2}
              placeholder="Contoh: rapikan rambut yang menutupi telinga, tambah sedikit kecerahan wajah"
              className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">Revisi memakai 1 permintaan tambahan ke API.</p>
              <Button
                size="sm"
                onClick={() => {
                  if (!refineNote.trim()) return
                  onRefine(refineNote.trim())
                  setRefineNote('')
                }}
                loading={busy}
                disabled={busy || !refineNote.trim()}
              >
                Kirim revisi
              </Button>
            </div>
            {busy && progress?.msg ? (
              <div className="mt-3">
                <p className="mb-2 text-xs text-slate-600">{progress.msg}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress.pct || 40}%` }} />
                </div>
              </div>
            ) : null}
          </Card>
        ) : (
          <Card>
            <SectionTitle
              icon={AlertTriangle}
              title="Ingin hasil lebih fotoreal?"
              subtitle="Mode AI (Gemini) bisa benar-benar mengganti model pakaian, bukan sekadar mewarnai."
            />
            <Alert tone="info">
              Buka <strong>Pengaturan Mesin → Mode AI</strong>, tempel API key Google AI Studio (ada kuota gratis), lalu
              proses ulang foto ini. Kualitas pakaian dan latarnya akan jauh lebih meyakinkan.
            </Alert>
          </Card>
        )}

        {history.length > 1 ? (
          <Card>
            <SectionTitle icon={History} title="Riwayat sesi ini" subtitle="Klik untuk kembali ke hasil sebelumnya." />
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory(item.id)}
                  className={cx(
                    'shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                    item.id === result.id ? 'border-indigo-500' : 'border-transparent hover:border-slate-300',
                  )}
                >
                  <img src={item.thumb} alt="Hasil sebelumnya" className="h-24 w-auto object-cover" />
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <SectionTitle icon={CheckCircle2} title="Checklist sebelum dipakai" />
          <ul className="space-y-2 text-xs text-slate-600">
            {[
              'Wajah masih sama dan mudah dikenali',
              'Tidak ada bagian tubuh yang berubah bentuk',
              'Warna latar sesuai permintaan dokumen',
              'Tidak ada teks, logo, atau objek aneh di latar',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
