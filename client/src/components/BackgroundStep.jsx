import { useState } from 'react'
import { Check, Palette, Ruler, Sparkles, Wand2 } from 'lucide-react'
import { Alert, Button, Card, Chip, SectionTitle, Segmented, cx } from './ui.jsx'
import { BACKGROUNDS, QUICK_PRESETS, SIZES } from '../lib/templates.js'
import { isLight } from '../lib/imageUtils.js'

export default function BackgroundStep({
  backgroundId,
  setBackgroundId,
  customHex,
  setCustomHex,
  useCustomColor,
  setUseCustomColor,
  bgStyle,
  setBgStyle,
  sizeId,
  setSizeId,
  dpiScale,
  setDpiScale,
  extra,
  setExtra,
  onBack,
  onGenerate,
  busy,
  progress,
  error,
  onDismissError,
  mode,
  applyPreset,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="fade-in space-y-5">
      <Card>
        <SectionTitle
          icon={Sparkles}
          title="Paket cepat"
          subtitle="Sekali klik, semua pengaturan langsung menyesuaikan kebutuhan dokumen."
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <span
                className="h-8 w-6 rounded-md ring-1 ring-slate-900/10"
                style={{ background: BACKGROUNDS.find((b) => b.id === p.background)?.hex }}
              />
              <span>
                <span className="block text-xs font-semibold text-slate-800 group-hover:text-indigo-700">{p.label}</span>
                <span className="block text-[10px] text-slate-500">{p.caption}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle
            icon={Palette}
            title="3. Latar belakang"
            subtitle="Pilih warna latar sesuai kebutuhan dokumen atau selera kamu."
          />
          <div className="grid grid-cols-4 gap-3">
            {BACKGROUNDS.map((bg) => {
              const active = backgroundId === bg.id && !useCustomColor
              return (
                <button
                  key={bg.id}
                  onClick={() => {
                    setBackgroundId(bg.id)
                    setUseCustomColor(false)
                  }}
                  className="group text-center"
                  title={bg.note}
                >
                  <span
                    className={cx(
                      'relative block aspect-square w-full rounded-xl ring-1 transition-all',
                      active ? 'ring-2 ring-indigo-600 ring-offset-2' : 'ring-slate-900/10 group-hover:ring-slate-900/25',
                    )}
                    style={{ background: bg.hex }}
                  >
                    {active ? (
                      <Check className={cx('absolute inset-0 m-auto h-5 w-5', isLight(bg.hex) ? 'text-slate-900' : 'text-white')} />
                    ) : null}
                  </span>
                  <span className="mt-1.5 block text-[11px] font-medium text-slate-600">{bg.label}</span>
                </button>
              )
            })}

            <button
              onClick={() => setUseCustomColor(true)}
              className="group text-center"
              title="Warna khusus"
            >
              <span
                className={cx(
                  'relative grid aspect-square w-full place-items-center rounded-xl ring-1 transition-all',
                  useCustomColor ? 'ring-2 ring-indigo-600 ring-offset-2' : 'ring-slate-900/10 group-hover:ring-slate-900/25',
                )}
                style={{
                  background: useCustomColor
                    ? customHex
                    : 'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #6366f1, #d946ef, #ef4444)',
                }}
              >
                {useCustomColor ? <Check className={cx('h-5 w-5', isLight(customHex) ? 'text-slate-900' : 'text-white')} /> : null}
              </span>
              <span className="mt-1.5 block text-[11px] font-medium text-slate-600">Warna lain</span>
            </button>
          </div>

          {useCustomColor ? (
            <div className="fade-in mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} />
              <input
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)}
                className="h-9 w-28 rounded-lg border border-slate-300 px-2 font-mono text-xs uppercase outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-500">
                Kode warna bebas. Contoh: <span className="font-mono">#0F4C9C</span>
              </span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="text-xs font-medium text-slate-600">Gaya latar</span>
            <Segmented
              value={bgStyle}
              onChange={setBgStyle}
              options={[
                { value: 'solid', label: 'Polos' },
                { value: 'gradient', label: 'Gradasi studio' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle
            icon={Ruler}
            title="Ukuran cetak"
            subtitle="Hasil diunduh tepat pada ukuran fisik ini dengan kerapatan 300 DPI (standar cetak)."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                className={cx(
                  'rounded-xl border p-3 text-left transition-all',
                  sizeId === s.id
                    ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <span className="block text-xs font-semibold text-slate-800">{s.label}</span>
                <span className="mt-0.5 block text-[10px] text-slate-500">{s.note}</span>
                <span className="mt-1 block font-mono text-[10px] text-slate-400">
                  {s.width}×{s.height} px @300dpi
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {showAdvanced ? '− Sembunyikan' : '+ Opsi lanjutan & catatan tambahan'}
            </button>
            {showAdvanced ? (
              <div className="fade-in mt-3 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-600">Resolusi lebih tinggi</span>
                  <Segmented
                    value={String(dpiScale)}
                    onChange={(v) => setDpiScale(Number(v))}
                    options={[
                      { value: '1', label: '300 DPI' },
                      { value: '2', label: '600 DPI' },
                    ]}
                  />
                </div>
                {mode === 'ai' ? (
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-600">Catatan tambahan untuk AI (opsional)</label>
                    <textarea
                      value={extra}
                      onChange={(e) => setExtra(e.target.value)}
                      rows={2}
                      placeholder="Contoh: hilangkan bayangan di leher, jangan terlalu banyak retouching"
                      className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {error ? (
            <div className="w-full sm:max-w-md">
              <Alert tone="error" onClose={onDismissError}>
                {error}
              </Alert>
            </div>
          ) : busy ? (
            <div className="w-full sm:w-80">
              <p className="mb-2 text-xs font-medium text-slate-700">{progress?.msg || 'Memproses…'}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${progress?.pct || 8}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-800">Siap diproses</p>
              <p className="text-xs text-slate-500">
                {mode === 'ai'
                  ? 'Foto akan diproses oleh Google Gemini (butuh API key yang valid).'
                  : 'Diproses 100% di browser kamu — tidak butuh API key, tidak butuh internet setelah model termuat.'}
              </p>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="outline" onClick={onBack} disabled={busy}>
            ← Kembali
          </Button>
          <Button size="lg" icon={Wand2} onClick={onGenerate} loading={busy} disabled={busy}>
            {busy ? 'Memproses…' : 'Buat foto formal'}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Chip active className="pointer-events-none">
          {BACKGROUNDS.find((b) => b.id === backgroundId)?.label ?? 'Warna khusus'}
        </Chip>
        <Chip className="pointer-events-none">{SIZES.find((s) => s.id === sizeId)?.label}</Chip>
        <Chip className="pointer-events-none">{bgStyle === 'solid' ? 'Latar polos' : 'Latar gradasi'}</Chip>
      </div>
    </div>
  )
}
