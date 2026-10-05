import { useEffect, useState } from 'react'
import { Brain, Cpu, ExternalLink, Eye, EyeOff, KeyRound, Server, Sparkles } from 'lucide-react'
import { Alert, Button, cx, Segmented, Toggle } from './ui.jsx'
import { AI_MODEL_OPTIONS, DEFAULT_MODEL } from '../lib/aiEngine.js'

export default function SettingsPanel({
  open,
  onClose,
  mode,
  setMode,
  apiKey,
  setApiKey,
  model,
  setModel,
  useServerKey,
  setUseServerKey,
}) {
  const [status, setStatus] = useState(null)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => alive && setStatus(json))
      .catch(() => alive && setStatus(null))
    return () => {
      alive = false
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="fade-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Pengaturan Mesin</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Mode pengolahan</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ModeCard
                active={mode === 'ai'}
                onClick={() => setMode('ai')}
                icon={Sparkles}
                title="Mode AI"
                badge="Kualitas terbaik"
                desc="Foto dikirim ke Google Gemini untuk mengganti pakaian & latar secara fotoreal."
              />
              <ModeCard
                active={mode === 'local'}
                onClick={() => setMode('local')}
                icon={Cpu}
                title="Mode Lokal"
                badge="Gratis & privat"
                desc="Diproses di browser tanpa API key. Foto tidak keluar dari perangkat."
              />
            </div>
          </div>

          {mode === 'ai' ? (
            <>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  <p className="text-xs font-semibold text-slate-700">API key Google AI Studio</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value.trim())}
                      placeholder="AIza..."
                      className="h-10 w-full rounded-xl border border-slate-300 px-3 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                      aria-label={showKey ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Disimpan hanya di browser kamu (localStorage) dan dikirim langsung ke Google.{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                  >
                    Ambil API key <ExternalLink className="h-3 w-3" />
                  </a>
                </p>

                {status?.serverKeyAvailable ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <Toggle
                      checked={useServerKey}
                      onChange={setUseServerKey}
                      label="Pakai API key dari server"
                      hint="Server aplikasi sudah dikonfigurasi, jadi kamu tidak perlu API key sendiri."
                    />
                  </div>
                ) : status?.serverKeyConfigured && !status?.serverAiEnabled ? (
                  <p className="mt-2 text-[11px] text-amber-600">
                    Server punya GEMINI_API_KEY, tetapi ENABLE_SERVER_AI masih false di .env.
                  </p>
                ) : null}
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <Brain className="h-3.5 w-3.5" /> Model
                </p>
                <div className="space-y-2">
                  {AI_MODEL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setModel(opt.id)}
                      className={cx(
                        'w-full rounded-xl border p-3 text-left transition-all',
                        model === opt.id
                          ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">{opt.label}</span>
                        {opt.id === DEFAULT_MODEL ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            paling kompatibel
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">{opt.id}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{opt.note}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Alert tone="info">
                Kalau muncul error <strong>404 model not found</strong>, artinya akun kamu belum punya akses ke model
                tersebut — pilih <strong>Nano Banana (klasik)</strong> yang paling luas dukungannya.
              </Alert>
            </>
          ) : (
            <Alert tone="info" title="Mode Lokal">
              Semua proses berjalan di perangkat kamu memakai MediaPipe (WebAssembly). Saat pertama dipakai, browser
              akan mengunduh dua model kecil (± 1 MB) dari Google. Setelah itu bisa dipakai offline.
              <br />
              <br />
              Cocok untuk mengganti latar belakang. Untuk hasil paling bagus, foto dengan latar cukup polos dan
              pencahayaan rata.
            </Alert>
          )}

          <Alert tone="warn" title="Etika pemakaian">
            Gunakan hanya foto milikmu sendiri atau yang kamu punya izinnya. Jangan memakai hasil untuk menyesatkan,
            memalsukan identitas, atau keperluan penipuan.
          </Alert>

          {!status?.serverKeyAvailable ? (
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Server className="h-3.5 w-3.5" /> Proxy AI server: tidak aktif
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ModeCard({ active, onClick, icon: Icon, title, desc, badge }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-2xl border p-3.5 text-left transition-all',
        active ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cx('h-4 w-4', active ? 'text-indigo-600' : 'text-slate-500')} />
        <span className="text-xs font-semibold text-slate-800">{title}</span>
      </div>
      {badge ? (
        <span className="mt-2 inline-block rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {badge}
        </span>
      ) : null}
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{desc}</p>
    </button>
  )
}
