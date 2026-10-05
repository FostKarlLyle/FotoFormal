import { Info, Pencil, Shirt, UserRound } from 'lucide-react'
import { Alert, Button, Card, GarmentThumb, SectionTitle, Segmented, Toggle, cx } from './ui.jsx'
import { GARMENTS, GENDER_HINTS } from '../lib/templates.js'

export default function GarmentStep({
  garmentId,
  setGarmentId,
  customGarment,
  setCustomGarment,
  keepClothes,
  setKeepClothes,
  gender,
  setGender,
  mode,
  onBack,
  onNext,
}) {
  return (
    <div className="fade-in space-y-5">
      <Card>
        <SectionTitle
          icon={Shirt}
          title="2. Pilih pakaian formal"
          subtitle="Model AI akan memakaikan pakaian ini ke tubuhmu — postur dan bentuk tubuh asli tetap dipertahankan."
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Perkiraan penampilan</span>
            <Segmented value={gender} onChange={setGender} options={GENDER_HINTS.map((g) => ({ value: g.id, label: g.label }))} />
          </div>
          <Button variant={keepClothes ? 'dark' : 'outline'} size="sm" onClick={() => setKeepClothes(!keepClothes)}>
            {keepClothes ? '✓ Pakaian tidak diubah' : 'Jangan ubah pakaian saya'}
          </Button>
        </div>

        <div className={cx('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', keepClothes && 'pointer-events-none opacity-40')}>
          {GARMENTS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGarmentId(g.id)}
              className={cx(
                'group flex items-center gap-3 rounded-2xl border p-3 text-left transition-all',
                garmentId === g.id
                  ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-200'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <GarmentThumb garment={g} className="h-14 w-16 shrink-0 rounded-lg ring-1 ring-slate-900/5" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-800">{g.label}</span>
                <span className="mt-0.5 flex gap-1">
                  {[g.colors.jacket, g.colors.shirt, g.colors.tie].filter(Boolean).map((c, i) => (
                    <span key={i} className="h-3 w-3 rounded-full ring-1 ring-slate-900/10" style={{ background: c }} />
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>

        {garmentId === 'custom' && !keepClothes ? (
          <div className="mt-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-600">
              <Pencil className="h-3.5 w-3.5" /> Deskripsikan pakaian yang kamu inginkan
            </label>
            <textarea
              value={customGarment}
              onChange={(e) => setCustomGarment(e.target.value)}
              rows={3}
              placeholder="Contoh: blazer wol abu-abu gelap dengan kemeja putih dan dasi motif garis tipis"
              className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              Tulis sedetail mungkin (jenis kain, warna, motif) supaya hasilnya sesuai bayanganmu.
            </p>
          </div>
        ) : null}

        {mode === 'local' ? (
          <div className="mt-4">
            <Alert tone="warn" title="Catatan untuk Mode Lokal">
              Mode lokal tidak bisa “menjahit” pakaian baru. Yang dilakukan adalah mengganti warna area pakaian yang
              terdeteksi (plus menambahkan kerah & dasi bila polanya jas). Untuk penggantian pakaian yang benar-benar
              baru, gunakan Mode AI.
            </Alert>
          </div>
        ) : null}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Kembali
        </Button>
        <Button onClick={onNext} disabled={keepClothes ? false : garmentId === 'custom' && !customGarment.trim()}>
          Lanjut pilih latar & ukuran
        </Button>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Ujung-ujungnya keputusan ada di tanganmu: kalau hasil ganti pakaian terasa kurang pas, coba model lain, ubah
        deskripsi, atau aktifkan “Pakaian tidak diubah”.
      </p>
    </div>
  )
}
