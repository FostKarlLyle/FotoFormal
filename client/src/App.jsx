import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Heart, Settings2, ShieldCheck, Sparkles, Wand2 } from 'lucide-react'
import UploadStep from './components/UploadStep.jsx'
import GarmentStep from './components/GarmentStep.jsx'
import BackgroundStep from './components/BackgroundStep.jsx'
import ResultStep from './components/ResultStep.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import { Button, cx } from './components/ui.jsx'
import { DEFAULT_BACKGROUND, DEFAULT_GARMENT, DEFAULT_SIZE, getBackground, getGarment, getSize } from './lib/templates.js'
import { composeMainPrompt, composeRefinePrompt, runAIGeneration, DEFAULT_MODEL } from './lib/aiEngine.js'
import { renderLocalPhoto } from './lib/localStudio.js'
import { buildPrintCanvas, exportResult, makeFilename } from './lib/render.js'
import { mix } from './lib/imageUtils.js'

const STEPS = [
  { id: 'upload', label: 'Foto', icon: Camera },
  { id: 'garment', label: 'Pakaian', icon: Sparkles },
  { id: 'background', label: 'Latar & Ukuran', icon: Wand2 },
  { id: 'result', label: 'Hasil', icon: ShieldCheck },
]

const STORAGE_KEY = 'fotoformal:settings-v1'

function loadStoredSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function App() {
  const stored = useMemo(loadStoredSettings, [])

  const [step, setStep] = useState('upload')
  const [photo, setPhoto] = useState(null)

  const [mode, setMode] = useState(stored.mode || 'ai')
  const [apiKey, setApiKey] = useState(stored.apiKey || '')
  const [model, setModel] = useState(stored.model || DEFAULT_MODEL)
  const [useServerKey, setUseServerKey] = useState(stored.useServerKey || false)

  const [garmentId, setGarmentId] = useState(stored.garmentId || DEFAULT_GARMENT)
  const [customGarment, setCustomGarment] = useState(stored.customGarment || '')
  const [keepClothes, setKeepClothes] = useState(false)
  const [gender, setGender] = useState(stored.gender || 'auto')

  const [backgroundId, setBackgroundId] = useState(stored.backgroundId || DEFAULT_BACKGROUND)
  const [customHex, setCustomHex] = useState(stored.customHex || '#0F4C9C')
  const [useCustomColor, setUseCustomColor] = useState(false)
  const [bgStyle, setBgStyle] = useState(stored.bgStyle || 'solid')
  const [sizeId, setSizeId] = useState(stored.sizeId || DEFAULT_SIZE)
  const [dpiScale, setDpiScale] = useState(stored.dpiScale || 1)
  const [extra, setExtra] = useState('')

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState({ msg: '', pct: 0 })
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const abortRef = useRef(null)

  const size = getSize(sizeId)
  const background = getBackground(backgroundId)
  const garment = getGarment(garmentId)
  const activeHex = useCustomColor ? customHex : background.hex
  const activeDeepHex = useCustomColor ? mix(customHex, '#000000', 0.22) : background.deepHex

  /* --------------------------- simpan pengaturan --------------------------- */
  useEffect(() => {
    const payload = {
      mode,
      apiKey,
      model,
      useServerKey,
      garmentId,
      customGarment,
      gender,
      backgroundId,
      customHex,
      bgStyle,
      sizeId,
      dpiScale,
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* localStorage penuh / diblokir: tidak masalah */
    }
  }, [mode, apiKey, model, useServerKey, garmentId, customGarment, gender, backgroundId, customHex, bgStyle, sizeId, dpiScale])

  /* --------------------- deteksi proxy AI di server ---------------------- */
  useEffect(() => {
    let alive = true
    fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive || !json) return
        if (json.serverKeyAvailable && !apiKey) setUseServerKey(true)
        if (json.defaultModel && !stored.model && mode === 'ai') setModel(json.defaultModel)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------------------------- timer -------------------------------- */
  useEffect(() => {
    if (!busy) return
    setElapsed(0)
    const t = setInterval(() => setElapsed((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  const needsKey = mode === 'ai' && !useServerKey && !apiKey

  /* ------------------------------ generate ------------------------------ */
  const generate = useCallback(
    async ({ refineNote = null, baseResult = null, overrides = {} } = {}) => {
      if (!photo?.src && !refineNote) return
      const sizeToUse = overrides.size || size
      const hexToUse = overrides.hex || activeHex
      const deepHexToUse = overrides.deepHex || activeDeepHex
      const styleToUse = overrides.bgStyle || bgStyle
      const garmentChoice = overrides.keepClothes !== undefined ? overrides.keepClothes : keepClothes
      const garmentToUse = overrides.garment || garment

      if (mode === 'ai' && needsKey) {
        setError('API key belum diisi. Buka Pengaturan Mesin untuk menempelkan API key, atau beralih ke Mode Lokal.')
        setSettingsOpen(true)
        return
      }

      setBusy(true)
      setError(null)
      const controller = new AbortController()
      abortRef.current = controller

      try {
        let src
        let meta = {}
        let directCanvas = null

        if (refineNote) {
          const baseSrc = baseResult?.dataUrl || result?.dataUrl
          setProgress({ msg: 'Menyesuaikan hasil…', pct: 30 })
          const { dataUrl } = await runAIGeneration({
            apiKey,
            useServerKey,
            model,
            prompt: composeRefinePrompt(refineNote),
            images: [baseSrc],
            aspectRatio: sizeToUse.ratio,
            signal: controller.signal,
            onProgress: (msg) => setProgress({ msg, pct: 45 }),
          })
          src = dataUrl
        } else if (mode === 'local') {
          const local = await renderLocalPhoto({
            imageSrc: photo.src,
            options: {
              backgroundHex: hexToUse,
              backgroundDeepHex: deepHexToUse,
              backgroundStyle: styleToUse,
              garment: garmentChoice ? null : garmentToUse,
              aspectRatio: sizeToUse.ratio,
              outWidth: sizeToUse.width * dpiScale,
              outHeight: sizeToUse.height * dpiScale,
            },
            onProgress: (msg, pct) => setProgress({ msg, pct }),
          })
          src = local.dataUrl
          directCanvas = local.canvas
          meta = { faceDetected: local.faceDetected, clothesReplaced: local.clothesReplaced }
        } else {
          setProgress({ msg: 'Menyiapkan foto…', pct: 12 })
          const prompt = composeMainPrompt({
            garmentId: garmentChoice ? 'custom' : garmentId,
            customGarment: garmentChoice ? 'the person’s existing outfit, neatly presented' : customGarment,
            backgroundId,
            customBackground: useCustomColor
              ? { hex: customHex, prompt: 'solid flat uniform custom-colour' }
              : {},
            sizeId,
            gender,
            extra,
          })
          setProgress({ msg: 'Model AI sedang memproses foto (biasanya 10–40 detik)…', pct: 35 })
          const { dataUrl } = await runAIGeneration({
            apiKey,
            useServerKey,
            model,
            prompt,
            images: [photo.src],
            aspectRatio: sizeToUse.ratio,
            signal: controller.signal,
            onProgress: (msg) => setProgress({ msg, pct: 55 }),
          })
          src = dataUrl
        }

        setProgress({ msg: 'Menyiapkan berkas siap cetak…', pct: 88 })
        // Mode lokal sudah menghasilkan kanvas pada ukuran cetak yang tepat,
        // jadi tidak perlu dipotong ulang (menghindari pergeseran komposisi).
        const print = directCanvas
          ? { canvas: directCanvas, width: directCanvas.width, height: directCanvas.height, dpi: 300 * dpiScale }
          : await buildPrintCanvas(src, { size: sizeToUse, dpiScale, smartCrop: true })

        const item = {
          id: `${Date.now()}`,
          dataUrl: src,
          canvas: print.canvas,
          width: print.width,
          height: print.height,
          dpi: print.dpi,
          thumb: print.canvas.toDataURL('image/jpeg', 0.7),
          sizeLabel: `${sizeToUse.label}`,
          sizeId: sizeToUse.id,
          backgroundId,
          mode,
          model: mode === 'ai' ? model : 'lokal',
          createdAt: new Date().toISOString(),
          parentId: baseResult?.id || null,
          ...meta,
        }

        setResult(item)
        setHistory((prev) => [item, ...prev].slice(0, 8))
        setStep('result')
        setProgress({ msg: '', pct: 100 })
      } catch (err) {
        if (err?.name === 'AbortError') return
        const hint = err?.hint ? ` ${err.hint}` : ''
        setError(`${err?.message || 'Terjadi kesalahan saat memproses foto.'}${hint}`)
      } finally {
        setBusy(false)
        abortRef.current = null
      }
    },
    [
      photo,
      size,
      activeHex,
      activeDeepHex,
      bgStyle,
      keepClothes,
      garment,
      mode,
      needsKey,
      apiKey,
      useServerKey,
      model,
      result,
      garmentId,
      customGarment,
      backgroundId,
      useCustomColor,
      customHex,
      sizeId,
      gender,
      extra,
      dpiScale,
    ],
  )

  const handleExport = useCallback(
    async ({ format = 'png', dpiScale: exportDpi = 1 } = {}) => {
      if (!result) return
      setBusy(true)
      try {
        // Hasil mode lokal pada 300 DPI sudah pas ukurannya: langsung pakai kanvasnya.
        const print =
          result.canvas && exportDpi === 1
            ? { canvas: result.canvas }
            : await buildPrintCanvas(result.dataUrl, { size: getSize(result.sizeId), dpiScale: exportDpi })
        exportResult(print.canvas, {
          format,
          filename: makeFilename({ sizeId: result.sizeId, backgroundId: result.backgroundId, prefix: 'foto-formal' }),
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(false)
      }
    },
    [result],
  )

  const applyPreset = useCallback((preset) => {
    setBackgroundId(preset.background)
    setUseCustomColor(false)
    setGarmentId(preset.garment)
    setSizeId(preset.size)
    setKeepClothes(false)
  }, [])

  const stepIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Camera className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">
                FotoFormal <span className="font-normal text-slate-400">· pas foto otomatis</span>
              </h1>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Ganti latar & pakaian formal tanpa mengubah wajah dan tubuh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cx(
                'hidden rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-block',
                mode === 'ai' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700',
              )}
            >
              {mode === 'ai' ? 'Mode AI' : 'Mode Lokal'}
            </span>
            <Button variant="outline" size="sm" icon={Settings2} onClick={() => setSettingsOpen(true)}>
              Pengaturan
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3">
          <ol className="flex items-center gap-1.5 sm:gap-3">
            {STEPS.map((s, i) => {
              const active = s.id === step
              const done = i < stepIndex
              const reachable = i <= stepIndex || (photo && i < 3)
              return (
                <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                  <button
                    disabled={!reachable || busy}
                    onClick={() => reachable && !busy && setStep(s.id)}
                    className={cx(
                      'flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all',
                      active ? 'bg-slate-900 text-white' : done ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400',
                      !reachable && 'cursor-not-allowed',
                    )}
                  >
                    <span
                      className={cx(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                        active ? 'bg-white/15 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500',
                      )}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className="hidden truncate text-xs font-medium sm:block">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-slate-200" /> : null}
                </li>
              )
            })}
          </ol>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {step === 'upload' ? (
          <UploadStep photo={photo} onPhoto={setPhoto} onNext={() => setStep('garment')} />
        ) : null}

        {step === 'garment' ? (
          <GarmentStep
            garmentId={garmentId}
            setGarmentId={setGarmentId}
            customGarment={customGarment}
            setCustomGarment={setCustomGarment}
            keepClothes={keepClothes}
            setKeepClothes={setKeepClothes}
            gender={gender}
            setGender={setGender}
            mode={mode}
            onBack={() => setStep('upload')}
            onNext={() => setStep('background')}
          />
        ) : null}

        {step === 'background' ? (
          <BackgroundStep
            backgroundId={backgroundId}
            setBackgroundId={setBackgroundId}
            customHex={customHex}
            setCustomHex={setCustomHex}
            useCustomColor={useCustomColor}
            setUseCustomColor={setUseCustomColor}
            bgStyle={bgStyle}
            setBgStyle={setBgStyle}
            sizeId={sizeId}
            setSizeId={setSizeId}
            dpiScale={dpiScale}
            setDpiScale={setDpiScale}
            extra={extra}
            setExtra={setExtra}
            onBack={() => setStep('garment')}
            onGenerate={() => generate()}
            busy={busy}
            progress={progress}
            error={error}
            onDismissError={() => setError(null)}
            mode={mode}
            applyPreset={applyPreset}
          />
        ) : null}

        {step === 'result' ? (
          <ResultStep
            result={result}
            originalSrc={photo?.src}
            history={history}
            onSelectHistory={(id) => {
              const item = history.find((h) => h.id === id)
              if (item) setResult(item)
            }}
            onBack={() => setStep('background')}
            onRegenerate={() => generate()}
            onRefine={(note) => generate({ refineNote: note })}
            onExport={handleExport}
            busy={busy}
            progress={progress}
            error={error}
            onDismissError={() => setError(null)}
          />
        ) : null}

        {busy && step !== 'result' ? (
          <p className="mt-4 text-center text-xs text-slate-400">
            {elapsed > 6 ? `Sudah berjalan ${elapsed} detik — model gambar butuh waktu, mohon tunggu…` : 'Memproses…'}
          </p>
        ) : null}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10">
        <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-6 text-center">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            Dibuat untuk keperluan dokumen resmi. Gunakan dengan etika — hanya foto milikmu
            <Heart className="h-3 w-3 text-rose-400" />
          </p>
          <p className="text-[11px] text-slate-400">
            Mode AI memakai Google Gemini · Mode Lokal memakai MediaPipe di perangkatmu · Tidak ada foto yang disimpan di
            server aplikasi ini.
          </p>
        </div>
      </footer>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        setMode={setMode}
        apiKey={apiKey}
        setApiKey={setApiKey}
        model={model}
        setModel={setModel}
        useServerKey={useServerKey}
        setUseServerKey={setUseServerKey}
      />
    </div>
  )
}
