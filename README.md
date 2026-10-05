# FotoFormal

**Ubah foto apa pun menjadi foto formal siap cetak dalam beberapa detik — lengkap dengan latar belakang dan pakaian formal pilihan, tanpa mengubah wajah dan tubuh orang di foto.**

Dibuat untuk kebutuhan pas foto sehari-hari di Indonesia: KTP, SIM, ijazah, lamaran kerja, paspor, visa, sampai foto profil LinkedIn. Hasil diunduh dalam ukuran fisik asli (300 DPI / 600 DPI) sehingga bisa langsung dicetak.

---

## ✨ Fitur

| Fitur | Keterangan |
| --- | --- |
| Unggah foto bebas | Selfie, foto wisuda, atau foto lama dengan latar berantakan. JPG / PNG / WEBP hingga 20 MB. |
| Identitas dijaga | Prompt AI selalu menegaskan wajah, ekspresi, warna kulit, bentuk tubuh, dan pose **tidak boleh berubah** — hanya pakaian dan latar yang diganti. |
| Pakaian formal | Jas hitam/navy/abu + dasi, blazer, kemeja putih/biru, batik formal, kebaya, seragam sekolah, atau deskripsi bebas (mis. *"blazer wol abu dengan dasi motif garis"*). |
| Latar belakang | Merah (KTP/paspor), biru (ijazah), putih (visa), abu-abu, hijau, krem, hitam, atau warna khusus dari color picker. Gaya polos atau gradasi studio. |
| Ukuran cetak | 2×3, 3×4, 4×6, 3,5×4,5 cm, 1×1 inci, 2×2 inci — otomatis keluar 300 DPI (opsi 600 DPI). |
| Paket cepat | Sekali klik untuk KTP/SIM, Ijazah, Lamaran Kerja, Paspor RI, Visa, Sekolah. |
| Komposisi otomatis | Deteksi wajah menentukan tinggi kepala (~62% foto) dan jarak ubun-ubun ke tepi atas (~7%) sesuai kaidah pas foto. |
| Revisi | Belum pas? Tulis instruksi kecil (*"rapikan rambut di telinga"*) dan model memperbaiki tanpa mengubah identitas. |
| Bandingkan sebelum/sesudah | Slider di halaman hasil untuk memastikan wajah tidak berubah. |
| Dua mode mesin | **Mode AI** (kualitas fotoreal) dan **Mode Lokal** (gratis, tanpa API key, foto tidak keluar dari perangkat). |

---

## 🚀 Menjalankan

```bash
git clone https://github.com/FostKarlLyle/FotoFormal.git
cd FotoFormal

# pasang dependensi server + frontend (sekali saja)
npm run setup

# jalankan server + frontend sekaligus
npm run dev
```

- Frontend (Vite, dengan hot reload): <http://localhost:5173>
- Server API kecil (status & proxy opsional): <http://localhost:8787>

Untuk mode produksi:

```bash
npm run build   # hasil build ada di client/dist
npm start       # satu server menyajikan frontend + API di port 8787
```

---

## 🧠 Dua mode mesin

### 1. Mode AI — hasil paling fotoreal

Memakai model gambar Google Gemini ("Nano Banana"). Tinggal tempel API key dari
[Google AI Studio](https://aistudio.google.com/apikey) di menu **Pengaturan → Mode AI**.

- API key hanya disimpan di `localStorage` browser pengguna dan dikirim **langsung ke Google** — tidak pernah minta ke server aplikasi ini.
- Pilih model sesuai kebutuhan:

  | Model | Cocok untuk |
  | --- | --- |
  | `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite) | Paling cepat & murah, volume besar |
  | `gemini-3.1-flash-image` (Nano Banana 2) | Kualitas tinggi, multi-referensi |
  | `gemini-3-pro-image` (Nano Banana Pro) | Kasus tersulit, detail paling presisi |
  | `gemini-2.5-flash-image` (klasik) | Paling luas dukungannya di berbagai akun |

- Tidak ingin pengguna menempel API key sendiri? Isi `.env` lalu aktifkan proxy:

  ```env
  GEMINI_API_KEY=AIza...
  GEMINI_MODEL=gemini-2.5-flash-image
  ENABLE_SERVER_AI=true
  ```

  Dengan begitu panggilan AI diteruskan oleh server (ada pembatas 30 permintaan / 10 menit per IP).

### 2. Mode Lokal — gratis, privat, tanpa API key

Semua diproses di dalam browser memakai **MediaPipe Tasks Vision** (WebAssembly):

- `selfie_multiclass_256x256` memisahkan orang dari latar **dan** mengenali area pakaian,
- `blaze_face_short_range` menentukan komposisi kepala,
- latar diganti warna pilihan (polos/gradasi), tepi rambut dihaluskan dengan penyaringan berbasis kemiripan warna,
- area pakaian diwarnai ulang mengikuti pilihan (atau kerah + dasi ditambahkan untuk setelan jas).

Model MediaPipe diunduh sekali dari Google saat pertama dipakai, lalu bisa dipakai offline.
Mode lokal **tidak** bisa benar-benar menjahit model pakaian baru — untuk itu gunakan Mode AI.

---

## 🗂️ Struktur proyek

```
FotoFormal/
├── server/index.js           # Express: serve client/dist, /api/health, /api/ai/status, proxy AI opsional
├── shared/gemini.js          # Inti pemanggilan Gemini (dipakai browser & server)
├── tests/                    # Uji unit (node:test) + smoke test UI (jsdom)
└── client/
    ├── src/App.jsx           # Alur 4 langkah: foto → pakaian → latar/ukuran → hasil
    ├── src/components/       # UI langkah, panel pengaturan, komponen dasar
    ├── src/lib/templates.js  # Preset latar, pakaian, ukuran, paket cepat
    ├── src/lib/aiEngine.js   # Penyusun prompt + pemanggilan AI
    ├── src/lib/localStudio.js# Mesin lokal MediaPipe (segmentasi, crop sadar-wajah, pewarnaan pakaian)
    ├── src/lib/render.js     # Penyiapan berkas siap cetak (crop + 300/600 DPI)
    └── public/samples/       # Foto contoh untuk mencoba tanpa mengunggah
```

---

## 📐 Ukuran & resolusi keluaran

| Pilihan | Ukuran fisik | Piksel @300 DPI | Umum dipakai untuk |
| --- | --- | --- | --- |
| 2 × 3 cm | 2×3 cm | 236 × 354 | KTP, SIM, pas foto umum |
| 3 × 4 cm | 3×4 cm | 354 × 472 | Ijazah, lamaran kerja, paspor RI |
| 4 × 6 cm | 4×6 cm | 472 × 709 | Cetak besar |
| 3,5 × 4,5 cm | 3,5×4,5 cm | 413 × 531 | Visa Schengen & Jepang |
| 1 × 1 inci | 2,54×2,54 cm | 300 × 300 | Visa Amerika Serikat |
| 2 × 2 inci | 5×5 cm | 600 × 600 | Visa AS, dokumen internasional |

---

## 🧪 Pengujian

```bash
npm test        # uji unit: prompt, bentuk body request, parsing respons, penanganan error
npm run build   # wajib sebelum uji UI
npm run test:ui # smoke test: aplikasi dimount di jsdom, ditelusuri langkah 1→3
```

---

## 🛠️ Pemecahan masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| `404 model not found` | Akunmu belum punya akses ke model tersebut. Pilih **Nano Banana (klasik)**. |
| `429 quota exceeded` | Limit permintaan tercapai. Tunggu sebentar atau ganti model / pakai mode lokal. |
| `Tidak bisa menghubungi server Google` | Jaringan kantor/sekolah memblokir `generativelanguage.googleapis.com`, atau VPN/adblock aktif. |
| Mode lokal gagal mengunduh model | `storage.googleapis.com` diblokir. Matikan adblock/VPN atau gunakan Mode AI. |
| Hasil wajah terasa berubah | Tambahkan catatan revisi: *"pertahankan wajah persis seperti foto asli, jangan dihaluskan"*, atau turunkan tingkat retouching dengan model lite. |
| Hasil mode lokal bergerigi di tepi rambut | Foto dengan latar kontras dan pencahayaan rata memberi hasil terbaik. |

---

## 🔒 Privasi & etika

- Aplikasi ini **tidak menyimpan foto**. Mode lokal 100% di perangkat; mode AI mengirim foto ke Google memakai API key pengguna.
- API key pengguna disimpan hanya di browser yang bersangkutan.
- Gunakan hanya foto milikmu sendiri atau yang kamu punya izinnya. Hasil AI sebaiknya tidak dipakai untuk memalsukan identitas atau menyesatkan orang lain.

---

## 📄 Lisensi

MIT © FostKarlLyle
