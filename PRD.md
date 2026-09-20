# PRD: Prospek

**Versi** 1.1 · **Tanggal** 20 September 2026 · **Pemilik** Faqih · **Status** Siap dibangun

Perubahan dari v1.0: sumber data diganti dari Google Places API ke **SerpApi (engine Google Maps)** karena Google Cloud meminta setoran awal untuk metode pembayaran yang dipakai.

---

## 1. Latar belakang

Faqih menawarkan jasa pembuatan website ke usaha lokal. Kendala terbesarnya bukan mengerjakan website, melainkan **menemukan siapa yang harus dihubungi**. Mencari satu per satu di Google Maps lambat, hasilnya tidak tercatat, dan mudah menghubungi orang yang sama dua kali.

Prospek adalah alat kerja pribadi yang mengumpulkan data usaha dari Google Maps lewat SerpApi, menyaring yang paling layak dihubungi (terutama yang belum punya website), lalu mencatat proses penawarannya di satu tempat.

## 2. Tujuan

| Tujuan | Ukuran keberhasilan |
|---|---|
| Mempercepat pencarian calon klien | Ratusan calon klien tersaring dari satu bulan jatah gratis; satu sesi scraping < 10 menit |
| Tidak ada calon klien yang terlewat atau dihubungi dua kali | Setiap usaha punya satu status dan satu catatan |
| Menghubungi yang paling potensial dulu | Daftar terurut skor; lead tanpa website muncul di atas |
| Biaya nol | Paket gratis SerpApi, Supabase free tier, Vercel Hobby |

**Bukan tujuan:** mengirim pesan otomatis/massal, CRM untuk tim, proposal atau invoice, analitik pemasaran, aplikasi mobile.

## 3. Pengguna

Satu orang: Faqih. Bekerja dari laptop, nyaman dengan terminal. Tidak ada registrasi publik, tidak ada peran pengguna, tidak ada berbagi akses.

## 4. Gambaran solusi

Tiga bagian:

1. **Scraper** — script Python CLI yang dijalankan manual di laptop. Memanggil SerpApi (engine Google Maps), menormalkan, memberi skor, lalu menyimpan ke Supabase.
2. **Dashboard** — aplikasi Next.js di Vercel. Melihat, memfilter, dan menindaklanjuti calon klien.
3. **Cron keepalive** — Vercel Cron harian yang menyentuh database agar proyek Supabase free tier tidak dipause karena tujuh hari tanpa aktivitas.

Tidak ada server terpisah. Scraper hanya jalan lokal, dan hasilnya langsung masuk database online. Lapisan sumber data dibuat modular supaya sumber lain (misalnya Overture Maps) bisa ditambah nanti tanpa mengubah sisanya.

## 5. Keputusan teknis

| Bagian | Pilihan | Alasan |
|---|---|---|
| Sumber data | SerpApi, engine Google Maps | Tanpa akun Google Cloud dan tanpa setoran; menyediakan rating, review, telepon, website; ada paket gratis |
| Database | Supabase (Postgres) | Punya Auth dan RLS, jadi browser bisa akses langsung dengan aman |
| Auth | Supabase Auth (email + kata sandi) | Satu akun dibuat manual, tanpa registrasi publik |
| Dashboard | Next.js App Router + TypeScript, Vercel | Stack utama Faqih; sudah ada proyek kosong yang siap dipakai |
| Data fetching | TanStack Query | Cache, optimistic update, paginasi |
| Styling | Tailwind CSS v4 | Token didefinisikan di `design.md` |
| Scraper | Python + `requests` + `rich`/`questionary` | Dijalankan manual, tidak perlu di-deploy |
| Keepalive | Vercel Cron harian | Mencegah database dipause, tanpa infrastruktur tambahan |

## 6. Kebutuhan fungsional

### 6.1 Scraper

| ID | Kebutuhan | Prioritas |
|---|---|---|
| S-1 | `python scrape.py` tanpa argumen membuka menu interaktif: pilih provinsi, kota, kelompok kategori | Wajib |
| S-2 | Sebelum jalan, tampilkan jumlah kombinasi, estimasi jumlah pencarian, sisa jatah bulan ini, dan minta konfirmasi | Wajib |
| S-3 | Mode argumen untuk pengulangan cepat (`--province`, `--city`, `--group`, `--max-requests`, `--pages`, `--dry-run`, `--refresh`) | Wajib |
| S-4 | `--max-requests` (default 40 per run) menghentikan proses dengan rapi saat batas tercapai | Wajib |
| S-5 | Melewati kombinasi yang sudah dijalankan dalam 30 hari terakhir, kecuali `--refresh` | Wajib |
| S-6 | Ctrl+C menyimpan progres; menjalankan ulang melanjutkan sisanya | Wajib |
| S-7 | Idempoten: scrape ulang tidak membuat duplikat dan **tidak mengubah status maupun catatan** | Wajib |
| S-8 | Menyaring bisnis yang sudah tutup dan chain besar (Indomaret, KFC, dll) | Wajib |
| S-9 | Normalisasi nomor WhatsApp: `08xx` menjadi `628xx`; nomor non-seluler diisi null | Wajib |
| S-10 | Klasifikasi website: tidak ada / hanya media sosial / website sendiri | Wajib |
| S-11 | Menghitung skor lead 0 sampai 100 | Wajib |
| S-12 | Ringkasan akhir: total ditemukan, baru, diperbarui, dilewati, dan lead baru tanpa website | Wajib |
| S-13 | **Anggaran bulanan:** menampilkan "terpakai X dari 250 bulan ini" dan berhenti sebelum jatah habis | Wajib |
| S-14 | **Pacing:** tidak melebihi 50 pencarian per jam (batas paket gratis) | Wajib |

### 6.2 Dashboard

| ID | Kebutuhan | Prioritas |
|---|---|---|
| D-1 | Login dengan email dan kata sandi; semua halaman lain dilindungi | Wajib |
| D-2 | Tabel usaha dengan kolom: nama (+kategori, kota), kota, rating, website, telepon, skor, status | Wajib |
| D-3 | Filter: pencarian nama, provinsi, kota, kelompok kategori, rating minimum, status, "tanpa website", "ada nomor WhatsApp" | Wajib |
| D-4 | Pengurutan: skor, rating, jumlah review, terbaru | Wajib |
| D-5 | Filter dan paginasi dijalankan di server, 50 baris per halaman | Wajib |
| D-6 | Seluruh state filter tersimpan di URL sehingga bisa dibuka ulang dan tombol kembali browser bekerja | Wajib |
| D-7 | Drawer detail: info lengkap, tautan Google Maps | Wajib |
| D-8 | Ubah status (baru, dihubungi, dibalas, deal, ditolak) dengan optimistic update | Wajib |
| D-9 | Catatan markdown: tampil sebagai hasil render; editor hanya muncul saat "Ubah"; simpan eksplisit | Wajib |
| D-10 | Tanggal tindak lanjut per usaha | Wajib |
| D-11 | Tombol "Buka WhatsApp" dengan template pesan berisi nama usaha; nonaktif jika nomor bukan seluler | Wajib |
| D-12 | Halaman ringkasan: jumlah lead per status, kota, dan kelompok kategori | Wajib |
| D-13 | Ekspor CSV hasil filter | Nanti |
| D-14 | Daftar tindak lanjut yang jatuh tempo hari ini | Nanti |

### 6.3 Keepalive

| ID | Kebutuhan | Prioritas |
|---|---|---|
| K-1 | Vercel Cron memanggil `/api/cron/keepalive` sekali sehari | Wajib |
| K-2 | Endpoint melakukan satu tulis ringan ke tabel `heartbeat` (bukan sekadar baca) | Wajib |
| K-3 | Endpoint hanya bisa dipanggil dengan header `Authorization: Bearer <CRON_SECRET>` | Wajib |
| K-4 | Kegagalan cron tercatat di log Vercel dan endpoint mengembalikan status yang jelas | Wajib |

## 7. Model data

Data hasil scraping dan data CRM **dipisah dalam dua tabel**. Ini keputusan inti: scraper hanya menulis ke `businesses`, sehingga status dan catatan di `leads` tidak mungkin tertimpa saat scrape ulang.

- **`businesses`** — hasil scraping: `place_id` (primary key), `source`, nama, kategori, kelompok kategori, provinsi, kota, alamat, telepon, nomor WA, website, `has_website`, `website_kind`, rating, jumlah review, URL Maps, koordinat, `lead_score`, `first_seen_at`, `scraped_at`.
- **`leads`** — data kerja: `business_id`, status, catatan markdown, `notes_updated_at`, `contacted_at`, `follow_up_at`, `updated_at`.
- **`scrape_jobs`** — riwayat run: dipakai untuk melewati kombinasi yang baru dikerjakan, melanjutkan proses yang terputus, dan menghitung pemakaian jatah bulanan.
- **`heartbeat`** — satu baris berisi waktu terakhir cron berjalan.

Skema SQL lengkap ada di prompt agent.

### Skor lead

| Faktor | Poin |
|---|---|
| Tidak punya website | +40 |
| Hanya media sosial (IG/FB/Linktree) | +30 |
| Rating >= 4.0 | +15 |
| Rating 3.5 sampai 3.9 | +7 |
| Jumlah review >= 50 | +15 |
| Jumlah review 20 sampai 49 | +8 |
| Punya nomor WhatsApp | +15 |
| Kategori persewaan atau akomodasi | +10 |

Batas atas 100. Logikanya: usaha yang sudah ramai (rating dan review bagus) tetapi belum punya website adalah calon klien terbaik, karena mereka punya pelanggan tetapi belum hadir online.

## 8. Cakupan

**Wilayah:** Jawa Timur, Jawa Barat, Jawa Tengah, DKI Jakarta, Banten.

**Kategori prioritas:**
- Makanan: kafe, kedai kopi, restoran, warung makan, catering, toko kue
- Persewaan: mobil, motor, alat camping/outdoor, kamera, tenda, sound system, gedung, dekorasi
- Akomodasi: homestay, penginapan, villa, guest house
- Jasa: wedding organizer, fotografer, salon, barbershop, laundry, bengkel, bimbel, travel agent, percetakan

Kategori persewaan dan akomodasi diprioritaskan karena paling butuh katalog, ketersediaan, dan pemesanan online.

## 8b. Setup dan batas SerpApi

1. Daftar di serpapi.com dan selesaikan verifikasi yang diminta (email, biasanya juga nomor HP).
2. Ambil API key dari dashboard SerpApi, simpan di `scraper/.env` sebagai `SERPAPI_API_KEY`. Jangan commit file itu.
3. Tes satu pencarian dari terminal atau lewat playground SerpApi sebelum membangun apa pun.

### Batas paket gratis

- **250 pencarian per bulan**, maksimal **50 per jam**. Hanya pencarian yang berhasil yang dihitung; hasil cache (parameter yang persis sama dalam 1 jam) tidak dihitung.
- Satu pencarian Maps mengembalikan sekitar 20 usaha, sehingga satu kombinasi kota x kata kunci dengan 2 halaman memakai 2 pencarian dan menghasilkan sampai sekitar 40 usaha.
- Kira-kira **100 sampai 120 kombinasi per bulan**, atau beberapa ribu usaha sebelum dihitung duplikat.
- Jatah dihitung per bulan dan tidak terbawa ke bulan berikutnya. Paket berbayar termulai $25 per bulan untuk 1.000 pencarian, tidak dibutuhkan untuk MVP.

### Tiga lapis pengaman

| Lapis | Mekanisme | Sifat |
|---|---|---|
| 1 | Batas paket gratis SerpApi | Batas keras dari penyedia; setelah habis, pencarian ditolak |
| 2 | Anggaran bulanan di scraper (default 240, dibaca dari Account API SerpApi bila tersedia, cadangan dari `scrape_jobs`) | Berhenti sebelum jatah habis |
| 3 | `--max-requests` per run (default 40) dan pacing 50 per jam | Mencegah run kebablasan dan melewati batas per jam |

### Hemat jatah

- `--dry-run` untuk melihat rencana tanpa memakai jatah.
- Melewati kombinasi yang sudah dijalankan dalam 30 hari terakhir.
- Tidak memanggil detail tempat satu per satu secara bawaan (itu menggandakan pemakaian). Hanya bila hasil daftar terbukti tidak memuat field penting.
- Mulai dari kota dan kategori paling potensial, jangan langsung menyapu semua provinsi.

## 9. Kebutuhan non-fungsional

- **Keamanan:** `SERPAPI_API_KEY` dan service role key hanya ada di `.env` lokal scraper dan variabel lingkungan Vercel, tidak pernah di kode klien. RLS aktif di semua tabel. Catatan markdown disanitasi sebelum dirender.
- **Kinerja:** dengan 5.000 baris, daftar terasa responsif; browser tidak pernah memuat seluruh tabel.
- **Biaya:** nol selama di dalam jatah gratis. Estimasi ditampilkan sebagai sisa jatah, bukan uang.
- **Kepatuhan:** data berasal dari Google Maps melalui pihak ketiga. Pakai hanya untuk menghubungi calon klien secara langsung; jangan dijual atau disebarkan. Tanggung jawab penggunaan data ada pada pemakai.
- **Aksesibilitas:** kontras teks minimal 4.5:1, fokus keyboard terlihat, status tidak hanya dibedakan lewat warna.

## 10. Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Jatah 250 habis cepat | Data baru berhenti di tengah bulan | Anggaran bulanan, `--dry-run`, lewati kombinasi lama, prioritaskan kota dan kategori terbaik |
| SerpApi mengubah paket atau struktur respons | Scraper rusak atau jatah berubah | Sumber data modular; verifikasi struktur respons dengan satu pencarian sebelum menulis normalisasi |
| Hasil daftar tidak memuat website atau telepon | Skor kurang akurat | Uji satu pencarian dulu; bila field kosong, sediakan `--enrich-details` opsional yang memakai jatah tambahan |
| Supabase dipause setelah 7 hari | Dashboard mati | Cron keepalive harian; opsional cron GitHub Actions sebagai cadangan |
| Nomor dari Maps ternyata telepon kantor | Tombol WhatsApp gagal | Deteksi nomor seluler saat normalisasi; tombol dinonaktifkan dengan keterangan |
| Pesan terasa spam, ditolak | Reputasi buruk | Template menyebut nama usaha dan menawarkan hal spesifik; pesan dikirim manual satu per satu |
| Hasil pencarian melebar ke kota lain | Data kotor | Cocokkan alamat dengan kota/provinsi yang dicari, buang yang tidak cocok |

## 11. Tahapan

| Tahap | Isi | Selesai bila |
|---|---|---|
| 1. Fondasi | Skema + RLS di Supabase, struktur repo, `.env.example`, README awal | Tabel terbentuk, akun login dibuat |
| 2. Scraper inti | **Uji satu pencarian SerpApi dan periksa struktur respons dulu**, lalu klien SerpApi, normalisasi, skor, penulisan database, unit test | Satu kombinasi kota x kategori masuk database dengan benar |
| 3. CLI | Menu interaktif, argumen, dry-run, anggaran bulanan, pacing, resume, ringkasan | Bisa dipakai tanpa membaca kode |
| 4. Dashboard daftar | Login, tabel, filter server-side, urut, paginasi, URL state | Bisa menyaring 1.000+ baris dengan cepat |
| 5. Dashboard CRM | Drawer, status, catatan markdown, tindak lanjut, tombol WhatsApp | Satu lead bisa dijalani dari "baru" sampai "deal" |
| 6. Keepalive + poles | Cron, ringkasan, state kosong/galat, responsif, deploy | Terpasang di Vercel dan cron berjalan |

## 12. Kriteria penerimaan

1. Scrape satu kota, ubah status satu usaha menjadi "dihubungi" dan tulis catatan, lalu scrape ulang kota yang sama: **status dan catatan tidak berubah**, tidak ada duplikat.
2. `--dry-run` menampilkan rencana tanpa memakai jatah; `--max-requests` berhenti tepat di batas; anggaran bulanan menghentikan proses sebelum jatah habis.
3. Nomor `0812...` menjadi `62812...`; nomor telepon rumah menghasilkan nomor WA kosong dan tombol WhatsApp nonaktif.
4. Filter tersimpan di URL; membuka ulang URL memberi hasil yang sama.
5. Catatan berisi `<script>alert(1)</script>` tidak dieksekusi maupun dirender sebagai HTML.
6. Catatan tampil sebagai hasil render markdown setelah disimpan; editor hanya muncul saat menekan "Ubah".
7. Tanpa login, semua halaman dialihkan ke `/login` dan data tidak bisa diambil.
8. Cron keepalive memperbarui baris `heartbeat`, dan menolak permintaan tanpa `CRON_SECRET`.
9. Tampilan sesuai `design.md`.

## 13. Pertanyaan terbuka

- Apakah perlu riwayat perubahan status bertanggal, atau cukup satu catatan markdown? *Untuk v1: cukup satu catatan.*
- Perlu sumber tambahan gratis (Overture Maps) untuk menyapu kandidat lebih luas di luar jatah 250? *Ditunda; lapisan sumber sudah modular.*
