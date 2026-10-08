# HAKU_ADMIN_MANAGER

## Install DrinkStock

DrinkStock dapat dipasang sebagai aplikasi web di laptop dan HP. Situs harus dibuka melalui HTTPS, misalnya dari GitHub Pages; membuka `index.html` langsung sebagai file tidak mendukung pemasangan atau cache offline.

- Laptop: buka situs di Chrome atau Edge, lalu pilih ikon Install di bilah alamat atau menu browser.
- Android: buka situs di Chrome, buka menu, lalu pilih Install app atau Tambahkan ke layar utama.
- iPhone/iPad: buka situs di Safari, tekan Bagikan, lalu pilih Tambahkan ke Layar Utama.

Pada browser yang mendukung pemasangan langsung, tombol Install App akan muncul di bagian atas aplikasi. Setelah perubahan di-deploy, buka situs sekali dalam keadaan online agar app shell tersimpan untuk dibuka kembali saat offline. Sinkronisasi Supabase tetap memerlukan koneksi internet.

## Setup Supabase

1. Buka dashboard Supabase project.
2. Masuk ke SQL Editor.
3. Jalankan isi file `supabase-schema.sql` satu kali.
4. Buka aplikasi melalui hosting HTTPS atau jalankan server lokal, bukan dengan membuka file HTML langsung.

Aplikasi akan memakai Supabase sebagai database utama dan tetap menyimpan cadangan data di browser.

Catatan: versi ini belum memakai login, jadi policy Supabase dibuat agar publishable key bisa membaca dan menyimpan satu baris data aplikasi. Untuk penggunaan multi-user yang lebih aman, tambahkan Supabase Auth dan policy per akun.
