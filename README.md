# HAKU_ADMIN_MANAGER

## Setup Supabase

1. Buka dashboard Supabase project.
2. Masuk ke SQL Editor.
3. Jalankan isi file `supabase-schema.sql` satu kali.
4. Buka `index.html`.

Aplikasi akan memakai Supabase sebagai database utama dan tetap menyimpan cadangan data di browser.

Catatan: versi ini belum memakai login, jadi policy Supabase dibuat agar publishable key bisa membaca dan menyimpan satu baris data aplikasi. Untuk penggunaan multi-user yang lebih aman, tambahkan Supabase Auth dan policy per akun.
