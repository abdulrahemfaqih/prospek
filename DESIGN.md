# design.md: Prospek (frontend pencari calon klien)

Alat kerja pribadi untuk menyaring dan menindaklanjuti calon klien jasa website. Dipakai satu orang, berjam-jam, di laptop. Prioritasnya: data terbaca cepat, filter cepat, tidak ada dekorasi yang mengganggu.

## 1. Prinsip

1. **Tabel adalah antarmuka utama.** Ini alat kerja, bukan halaman pemasaran. Tidak ada hero, tidak ada kartu-kartu identik.
2. **Struktur membawa informasi.** Garis, jarak, dan bobot huruf dipakai untuk membedakan level data, bukan untuk hiasan.
3. **Satu warna aksen, dipakai hemat.** Aksen hanya untuk aksi utama, fokus, dan baris terpilih.
4. **Tanpa gradien, tanpa bayangan dekoratif, tanpa animasi masuk.** Gerak hanya sebagai respons atas aksi pengguna.
5. **Bahasa Indonesia sehari-hari.** Kalimat huruf kecil (sentence case), kata kerja jelas.

## 2. Warna

Palet dingin netral dengan satu aksen biru-petrol. Sengaja tidak memakai krem/terakota, mode gelap dengan hijau neon, atau gradien ungu.

| Token | Hex | Pemakaian |
|---|---|---|
| `paper` | `#F4F5F7` | Latar aplikasi |
| `surface` | `#FFFFFF` | Tabel, drawer, input |
| `line` | `#DDE1E7` | Garis pemisah, border input |
| `line-strong` | `#C4CAD3` | Border saat hover |
| `ink` | `#1F2733` | Teks utama |
| `ink-muted` | `#5B6675` | Teks sekunder |
| `ink-faint` | `#8A94A3` | Placeholder, keterangan kecil |
| `accent` | `#1D5B79` | Tombol utama, fokus, tautan |
| `accent-hover` | `#164A63` | Hover tombol utama |
| `accent-soft` | `#E4EEF3` | Baris terpilih, chip aktif |

Warna status (teks di atas latar lembut, semuanya lolos kontras 4.5:1):

| Status | Teks | Latar |
|---|---|---|
| Baru | `#4A5565` | `#EBEDF1` |
| Sudah dihubungi | `#7A5B12` | `#F6EDD6` |
| Dibalas | `#1D5B79` | `#E4EEF3` |
| Deal | `#2F6B4F` | `#E1EFE7` |
| Ditolak | `#8C3B3B` | `#F3E3E3` |

Status selalu ditulis dengan teks, tidak hanya warna.

## 3. Tipografi

- Satu keluarga: **IBM Plex Sans** (400, 500, 600). Fallback: `system-ui, sans-serif`.
- Angka memakai `font-variant-numeric: tabular-nums` agar kolom rating dan skor rata.
- Skala: 12 / 13 / 14 (dasar) / 16 / 20 / 24 px. Tinggi baris 1.5 untuk teks, 1.3 untuk judul.
- Judul halaman 20px/600. Judul bagian 14px/600. Tidak ada huruf kapital semua, tidak ada label kecil di atas judul, tidak ada font monospace untuk label.
- Panjang baris teks bebas (catatan, alamat) maksimal 70 karakter.

## 4. Tata letak

Lebar maksimal 1280px, rata kiri, padding horizontal 24px (16px di mobile).

```
+--------------------------------------------------------------+
| Prospek        Daftar   Ringkasan                  [Keluar]  |  bar atas 48px
+--------------------------------------------------------------+
| [ Cari nama usaha...        ]                                |
| Provinsi v  Kota v  Kategori v  Rating v  Status v  Urutkan v|  filter, sticky
| ( ) Tanpa website   ( ) Ada nomor WhatsApp        Reset      |
+--------------------------------------------------------------+
| Nama usaha            Kota      Rating    Website  Skor Status|
|--------------------------------------------------------------|
| Kopi Senja            Malang    4.6 (128) Tidak ada  85 Baru  |
| Kafe · Malang                                                |
|--------------------------------------------------------------|
| Rental Motor Jaya     Batu      4.4 (61)  Tidak ada  80 Baru  |
| ...                                                          |
+--------------------------------------------------------------+
| 1-50 dari 1.284                          < Sebelumnya  Lanjut >|
+--------------------------------------------------------------+
```

Detail bisnis muncul sebagai **drawer kanan** (lebar 440px), tabel tetap terlihat di belakangnya. Di layar di bawah 1024px, drawer memenuhi layar.

```
+------------------------------+
| Kopi Senja              [x]  |
| Kafe, Malang                 |
|------------------------------|
| Status                       |
| [Baru][Dihubungi][Dibalas]   |
| [Deal][Ditolak]              |
|------------------------------|
| Alamat   Jl. ...             |
| Telepon  0812-...            |
| Website  Tidak ada           |
| Maps     Buka di Google Maps |
|------------------------------|
| Catatan              [Ubah]  |
| Hasil markdown yang sudah    |
| dirender: judul, daftar,     |
| tautan, centang.             |
| Diperbarui 20 Sep            |
|                              |
| Tindak lanjut  [ 25 Sep ]    |
|------------------------------|
| [ Buka WhatsApp ]            |
+------------------------------+
```

Halaman **Ringkasan**: satu kolom. Daftar jumlah per status (teks dan angka, bukan kartu), lalu tabel sederhana jumlah lead per kota dengan bar horizontal tipis dari CSS. Tidak perlu pustaka grafik.

## 5. Komponen

**Bentuk dan jarak**
- Radius: `6px` untuk input, tombol, badge, chip. Tabel dan drawer: `0`. Hanya satu nilai radius.
- Grid jarak 4px. Jarak umum: 8 / 12 / 16 / 24.
- Garis 1px `line`. Tidak ada border ganda.
- Bayangan hanya satu, untuk drawer: `-8px 0 24px rgba(31,39,51,.08)`.

**Tabel**
- Header: 13px/500, `ink-muted`, latar `paper`, garis bawah `line`. Bisa diklik untuk urut.
- Baris tinggi 52px, garis bawah `line`, tanpa zebra. Hover `#F8F9FA`, terpilih `accent-soft`.
- Kolom nama: nama 14px/500, di bawahnya kategori dan kota 13px `ink-muted`.
- Rating: `4.6 (128)`. Website: "Tidak ada" dalam `ink` tebal 500 (ini sinyal lead), atau nama domain dalam `ink-muted`.
- Skor: angka rata kanan, tanpa lingkaran atau progress ring.
- Usaha yang punya catatan diberi ikon catatan kecil (16px, `ink-faint`) di sebelah nama, dengan `aria-label` "Punya catatan".

**Tombol**
- Utama: latar `accent`, teks putih, tinggi 36px. Hanya satu tombol utama per layar.
- Sekunder: latar `surface`, border `line-strong`, teks `ink`.
- Teks tombol kata kerja: "Buka WhatsApp", "Simpan catatan", "Reset filter". Tanpa panah di ujung.

**Input dan filter**
- Tinggi 36px, border `line`, fokus: ring 2px `accent` dengan offset 2px.
- Chip filter (Tanpa website, Ada nomor WhatsApp): tinggi 32px, aktif memakai `accent-soft` + teks `accent`.
- Semua filter disimpan di URL agar hasil bisa dibuka ulang dan tombol kembali browser bekerja.

**Badge status**
- 12px/500, padding 2px 8px, radius 6px, warna dari tabel status.

**Kontrol status di drawer**
- Segmented control lima pilihan. Mengubah status langsung tersimpan (optimistic update), tanpa tombol simpan.

**Catatan (markdown)**

Satu catatan per usaha, ditulis dengan markdown. Ada dua mode yang bergantian, tidak pernah tampil bersamaan:

Mode tampil (bawaan, setelah catatan tersimpan)
- Menampilkan hasil render markdown. Editor tidak terlihat.
- Di kanan judul bagian ada tombol sekunder kecil "Ubah". Di bawah catatan: "Diperbarui 20 Sep" (13px, `ink-faint`).
- Kalau belum ada catatan: teks "Belum ada catatan." (`ink-muted`) dan tombol sekunder "Tambah catatan". Langsung masuk mode ubah saat diklik.
- Gaya hasil render (mengikuti token yang sama, tanpa gaya khusus):
  - Teks 14px `ink`. Judul `#` menjadi 16px/600, `##` 14px/600, `###` 14px/500 `ink-muted`. Tidak ada ukuran judul yang lebih besar dari 16px.
  - Daftar menjorok 20px, jarak antar butir 4px. Kotak centang (`- [ ]`, `- [x]`) hanya bisa dibaca, tidak bisa diklik di mode tampil.
  - Tautan berwarna `accent` bergaris bawah, dibuka di tab baru (`rel="noopener noreferrer"`).
  - Kutipan (`>`): garis kiri 2px `line-strong`, teks `ink-muted`, tanpa radius.
  - Kode inline dan blok kode: latar `paper`, radius 6px, font `ui-monospace` (satu-satunya tempat monospace dipakai), blok kode bisa digulir horizontal.
  - Tabel GFM: garis 1px `line`, header 500, bisa digulir horizontal di dalam drawer.
  - Gambar tidak dirender (tampil sebagai tautan dari teks alternatifnya). HTML mentah tidak dirender.

Mode ubah (setelah menekan "Ubah" atau "Tambah catatan")
- Menggantikan tampilan render dengan textarea: tinggi minimal 200px, bisa ditarik ke bawah, font sama dengan aplikasi (IBM Plex Sans 14px), fokus otomatis di ujung teks.
- Placeholder: "Tulis dengan markdown, misalnya - untuk daftar atau **tebal**."
- Di bawahnya: tombol utama "Simpan catatan" dan tombol sekunder "Batal". Pintasan: Ctrl/Cmd + Enter menyimpan, Esc membatalkan.
- Penghitung karakter muncul hanya saat mendekati batas (di atas 18.000 dari 20.000).
- Ada perubahan yang belum disimpan lalu pengguna menutup drawer, berpindah usaha, atau menekan "Batal": tampilkan konfirmasi kecil dalam drawer "Catatan belum disimpan." dengan tombol "Buang perubahan" dan "Lanjut mengedit".
- Setelah "Simpan catatan" berhasil: kembali ke mode tampil dan tampilkan "Catatan tersimpan" sebentar (2 detik). Jika gagal: tetap di mode ubah, isi tidak hilang, tampilkan "Catatan gagal disimpan. Periksa koneksi lalu coba lagi."

## 6. Teks antarmuka

- Judul halaman: "Daftar usaha", "Ringkasan".
- Kosong (belum ada data): "Belum ada data. Jalankan `python scrape.py` di terminal, lalu muat ulang halaman ini."- Kosong (filter terlalu ketat): "Tidak ada usaha yang cocok. Longgarkan filter atau reset."
- Galat: sebut apa yang gagal dan langkah berikutnya, contoh "Gagal memuat data. Periksa koneksi lalu coba lagi." Tanpa permintaan maaf.
- Konfirmasi memakai kata kerja yang sama dengan aksinya: tombol "Simpan catatan" menghasilkan "Catatan tersimpan".
- Template WhatsApp bawaan (bisa diedit di drawer):
  "Halo, saya Faqih, pembuat website. Saya lihat {nama_usaha} di Google Maps dan belum menemukan websitenya. Boleh saya kirim contoh tampilan website untuk usaha Anda?"

## 7. Gerak dan aksesibilitas

- Satu-satunya animasi: drawer geser masuk 160ms (`transform`, ease-out). Tidak ada animasi saat halaman dimuat.
- Hormati `prefers-reduced-motion` (drawer langsung muncul).
- Fokus keyboard selalu terlihat. Baris tabel bisa dipilih dengan Enter, drawer ditutup dengan Esc.
- Target sentuh minimal 36px. Kontras teks minimal 4.5:1.
- Responsif: di bawah 768px, kolom Kota, Website, dan Skor disembunyikan dari tabel (tampil di drawer).

## 8. Token untuk Tailwind v4

```css
@import "tailwindcss";

@theme {
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;

  --color-paper: #F4F5F7;
  --color-surface: #FFFFFF;
  --color-line: #DDE1E7;
  --color-line-strong: #C4CAD3;
  --color-ink: #1F2733;
  --color-ink-muted: #5B6675;
  --color-ink-faint: #8A94A3;
  --color-accent: #1D5B79;
  --color-accent-hover: #164A63;
  --color-accent-soft: #E4EEF3;

  --radius-control: 6px;
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
}
```

## 9. Yang dihindari

- Kartu identik dengan bayangan lembut untuk setiap data
- Gradien, glassmorphism, ikon dalam lingkaran berwarna
- Label kapital semua di atas judul, penomoran 01/02/03 tanpa urutan nyata
- Aksen pada satu kata di judul, tanda panah di ujung tombol
- Emoji sebagai ikon (pakai ikon garis sederhana, misalnya Lucide, ukuran 16px)
- Mode gelap tidak termasuk MVP
