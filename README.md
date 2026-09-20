# Prospek

**Prospek** adalah alat kerja pribadi untuk freelancer web developer di Indonesia untuk menemukan calon klien jasa pembuatan website: usaha lokal yang terdaftar di Google Maps namun belum memiliki website sendiri.

Prospek memadukan:
1. **Scraper Python CLI** lokal yang mengambil data tempat via SerpApi (Google Maps engine), menormalkan data, menghitung skor lead, dan menyimpannya langsung ke Supabase.
2. **Dashboard Web Next.js (App Router)** yang dideploy di Vercel dengan proteksi login Supabase Auth, filter server-side cepat, segmented control status dengan optimistic update, catatan berformat Markdown, dan integrasi tombol WhatsApp instan.
3. **Cron Keepalive** harian via Vercel Cron untuk mencegah project Supabase free tier di-pause otomatis karena inaktivitas 7 hari.

---

## Arsitektur & Gambaran Sistem

```
[ Google Maps ]
       │
       ▼ (via SerpApi engine=google_maps)
[ Scraper CLI (Python) ] ──(Service Role Key)──► [ Supabase (Postgres + RLS) ]
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                       [ Dashboard Web Next.js ]               [ Vercel Cron Keepalive ]
                       (Anon Key + User Session)               (Daily write to heartbeat)
```

- **Database:** Supabase PostgreSQL dengan Row Level Security (RLS) aktif pada semua tabel.
- **Pemisahan Data:**
  - `businesses`: data hasil scraping (bersifat idempoten, update hanya memperbarui data publik).
  - `leads`: data kerja CRM (status, catatan markdown, tanggal tindak lanjut). Scraper **tidak pernah** mengubah atau menimpa tabel `leads`.
- **Autentikasi:** Supabase Auth (Email + Password) untuk satu akun pengguna (tanpa registrasi publik).

---

## Panduan Setup Lengkap dari Nol

### 1. Setup Proyek Supabase

1. Buka [database.new](https://database.new) dan login ke akun Supabase Anda.
2. Buat proyek baru (pilih region terdekat, misalnya **Singapore**). Catat database password Anda.
3. Setelah proyek siap, buka menu **SQL Editor** di sidebar kiri dashboard Supabase.
4. Salin seluruh isi file [`supabase/schema.sql`](supabase/schema.sql), tempel ke SQL Editor, lalu klik **Run**.
   - Ini akan mengaktifkan extension `pg_trgm`, membuat tabel `businesses`, `leads`, `scrape_jobs`, `heartbeat`, indeks performa, serta aturan RLS.
5. Buat akun login untuk Anda sendiri:
   - Buka menu **Authentication** > **Users** > klik **Add user** > **Create user**.
   - Masukkan email dan password Anda, lalu pastikan opsi *Auto Confirm User* dicentang.
6. Ambil API Keys proyek:
   - Buka menu **Project Settings** > **API**.
   - Catat:
     - **Project URL** (contoh: `https://xyz.supabase.co`)
     - **anon / public key**
     - **service_role secret key** (simpan baik-baik, jangan bagikan).

---

### 2. Setup SerpApi & Batasan Paket Gratis

1. Daftar akun di [serpapi.com](https://serpapi.com). Lakukan verifikasi email dan nomor handphone jika diminta.
2. Buka dashboard SerpApi di [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key) dan salin **API Key** Anda.
3. **Memahami Batas Paket Gratis SerpApi:**
   - **250 pencarian per bulan** (reset setiap bulan, tidak diakumulasi).
   - **Maksimal 50 pencarian per jam**.
   - 1 pencarian Google Maps mengembalikan sekitar 20 usaha.
   - Dengan default 2 halaman per kombinasi kata kunci x kota, 1 kombinasi menghabiskan 2 request (~40 usaha).
   - Jatah 250 pencarian per bulan setara dengan ~100-120 kombinasi pencarian.
   - *Tips:* Prioritaskan kategori dan kota yang paling potensial (misal: kategori persewaan dan akomodasi di Jawa Timur) alih-alih menyapu semua kota sekaligus.

---

### 3. Setup Lingkungan Web Dashboard

1. Buat file `.env.local` di root proyek dengan menyalin template:
   ```bash
   cp .env.example .env.local
   ```
2. Isi variabel lingkungan di `.env.local`:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-anda>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key-anda>
   CRON_SECRET=<buat-string-rahasia-acak>
   ```
3. Install dependensi dan jalankan server development:
   ```bash
   npm install
   npm run dev
   ```
4. Buka [http://localhost:3000](http://localhost:3000) di browser dan login dengan akun Supabase yang telah dibuat di langkah 1.

---

### 4. Setup dan Menjalankan Scraper Python

1. Masuk ke folder `scraper/` dan siapkan virtual environment Python (disarankan Python 3.10+):
   ```bash
   cd scraper
   python -m venv .venv
   
   # Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # Linux / macOS:
   source .venv/bin/activate
   ```
2. Install dependensi:
   ```bash
   pip install -r requirements.txt
   ```
3. Buat file `scraper/.env`:
   ```bash
   cp .env.example .env
   ```
   Isi dengan kredensial Anda:
   ```ini
   SERPAPI_API_KEY=<serpapi-api-key>
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```
4. Menjalankan Scraper:
   - **Mode Interaktif:**
     ```bash
     python scrape.py
     ```
     Menu interaktif berbasis terminal akan memandu pemilihan provinsi, kota, kategori, menampilkan estimasi request, sisa kuota bulanan, dan meminta konfirmasi.
   - **Mode Cepat (Argumen CLI):**
     ```bash
     # Contoh pencarian kafe & persewaan di Malang & Batu (dry-run untuk cek estimasi)
     python scrape.py --province jatim --city Malang --city Batu --group makanan --group persewaan --dry-run

     # Eksekusi riil dengan batas 30 request
     python scrape.py --province jatim --city Malang --city Batu --group persewaan --max-requests 30
     ```

5. **Cara Kerja Paginasi, Kuota & Mengambil Data Tambahan:**
   - **Paginasi Bawaan (*Default*):** Secara default, scraper mengambil **2 halaman** teratas per kata kunci (`--pages 2`), yaitu maksimal 40 tempat usaha (1 halaman = 20 hasil = 1 request SerpApi).
   - **Hemat Kuota Otomatis:** Jika halaman 1 hanya mengembalikan < 20 usaha (misal hanya 8 tempat), scraper otomatis berhenti dan tidak memanggil halaman 2 untuk menghemat kuota.
   - **Mencari Data Lanjutan (Lebih Dalam):** Jika Anda sudah pernah scraping suatu kombinasi dan ingin mengambil tempat usaha di luar 40 data teratas yang sudah Anda dapatkan sebelumnya:
     1. Tambahkan parameter **`--pages`** dengan jumlah halaman yang lebih banyak (misal `--pages 4` untuk mengambil hingga 80 usaha).
     2. Tambahkan flag **`--refresh`** agar tidak dilewati oleh sistem deduplikasi 30 hari.
     ```bash
     # Contoh: Mengambil hingga halaman 4 (tempat usaha urutan 41-80 akan ditambahkan sebagai usaha baru)
     python scrape.py --province jatim --city Bangkalan --group persewaan --pages 4 --refresh
     ```
   - **Keamanan Data CRM yang Diedit:** Scraping ulang **TIDAK AKAN PERNAH menimpa atau menghapus catatan dan status prospek Anda**. Data publik Google Maps di tabel `businesses` akan diperbarui ke yang terbaru, namun status (*Baru*, *Dihubungi*, *Dibalas*, *Deal*, *Ditolak*) dan seluruh catatan negosiasi di tabel `leads` tetap 100% aman (`ON CONFLICT DO NOTHING`).

---

### 5. Deploy ke Vercel & Pengaturan Cron Keepalive

1. Push kode ke repository GitHub privat.
2. Buka [Vercel](https://vercel.com), import repository `umkm-data`.
3. Tambahkan Environment Variables di dashboard Vercel (**Settings** > **Environment Variables**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
4. Deploy proyek.
5. Konfigurasi cron telah didefinisikan di [`vercel.json`](vercel.json):
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/keepalive",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```
   Setiap pukul 02:00 UTC, Vercel Cron akan mengirim request ke `/api/cron/keepalive` dengan header `Authorization: Bearer <CRON_SECRET>` untuk melakukan ping tulis ke tabel `heartbeat`.

#### Verifikasi Cron Keepalive
- Uji endpoint cron manual menggunakan curl:
  ```bash
  # Harus mengembalikan 401 Unauthorized
  curl -I https://<domain-vercel-anda>/api/cron/keepalive

  # Harus mengembalikan 200 OK dengan { "ok": true, "pingedAt": "..." }
  curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain-vercel-anda>/api/cron/keepalive
  ```
- Periksa tabel `heartbeat` di dashboard Supabase SQL Editor:
  ```sql
  select * from heartbeat;
  ```
  Kolom `pinged_at` akan menampilkan timestamp terbaru dari panggilan cron.
- *Catatan cadangan:* Jika Vercel Hobby membatasi cron atau mengalami keterlambatan, Anda juga dapat menyiapkan GitHub Actions berjadwal harian yang melakukan curl serupa.
