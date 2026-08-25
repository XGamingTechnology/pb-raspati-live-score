# PB Raspati Plus — Live Score & Klasemen

Sistem sederhana untuk Turnamen Internal PB Raspati Plus 2026.

## Fungsi utama

- Input skor sisa pertandingan secara fleksibel, tidak perlu mengikuti slot jadwal tetap.
- Klasemen Grup A dan Grup B langsung dihitung ulang setelah skor disimpan.
- Menang = 3 poin, kalah = 0 poin.
- PF, PA, selisih poin, jumlah main, menang, kalah tercatat otomatis.
- Peringkat diberi tanda `*` bila tie-break head-to-head belum lengkap karena masih ada pertandingan yang belum dimainkan.
- Daftar pertandingan yang belum selesai selalu terlihat.
- Hasil yang salah bisa dikoreksi/reset oleh panitia.
- Halaman publik auto-refresh setiap 5 detik sehingga bisa dipakai sebagai layar klasemen live.
- Penulisan skor mengikuti format turnamen 42 poin dengan deuce hingga maksimum 45.

## Data awal dari lembar pertandingan

### Grup A

- Fikri / Bara 15–42 Daffa / Rafli
- Rhoma / Wawan 33–42 Daffa / Rafli
- Rhoma / Wawan 42–32 Tomy / Pak Udin
- Daffa / Rafli 42–31 Tomy / Pak Udin

### Grup B

- Pak Abbas / Rusda 38–42 JSR Hanai / Rizal
- Pak Abbas / Rusda 42–38 Pak Idwan / Kiki
- Rahes / Jimi Tendean 40–42 Pak Idwan / Kiki
- Rahes / Jimi Tendean 15–42 Pandu / Rendi
- JSR Hanai / Rizal 42–27 Pandu / Rendi

Data di atas otomatis di-seed saat database masih kosong. Bila ada satu angka yang perlu dikoreksi dari lembar manual, cukup masuk Mode Panitia dan reset/edit pertandingan tersebut.

## Jalankan dengan Docker

```bash
cp .env.example .env
# ganti ADMIN_PIN bila perlu
docker compose up --build -d
```

Buka:

- Frontend: http://localhost:8080
- API: http://localhost:3000/api/tournament/overview

Default PIN panitia: `2026`.

## Alur penggunaan panitia

1. Buka dashboard.
2. Klik **Mode Panitia** dan masukkan PIN.
3. Pilih pertandingan dari daftar **Sisa Pertandingan**.
4. Masukkan skor akhir, lalu **Simpan**.
5. Klasemen, PF/PA, selisih, poin, dan jumlah laga langsung berubah.
6. Jika salah input, pada bagian **Hasil Tercatat** klik **koreksi**, lalu input ulang.

## Catatan klasemen sementara

Karena beberapa pasangan belum memainkan jumlah laga yang sama, klasemen yang tampil sebelum seluruh round robin selesai disebut **klasemen sementara**. Peringkat final menggunakan:

1. Poin klasemen.
2. Head-to-head pada tim dengan poin sama.
3. Selisih poin (PF - PA).
4. PF (total poin yang diperoleh).
5. Keputusan panitia bila tetap sama.

Untuk tie lebih dari dua tim, sistem menghitung mini head-to-head jika seluruh pertemuan di antara tim yang seri sudah selesai. Jika belum, sistem menandai peringkat dengan `*` agar tidak dianggap final.
