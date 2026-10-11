# HAKU Workspace

Home workspace menyediakan dua aplikasi: HAKU untuk usaha minuman dan Studio Desk untuk manajemen pekerjaan freelance. Keduanya memakai proyek Supabase yang sama, tetapi menyimpan data di baris `app_state` yang berbeda agar data usaha tidak tercampur.

## Install DrinkStock

DrinkStock dapat dipasang sebagai aplikasi web di laptop dan HP. Situs harus dibuka melalui HTTPS, misalnya dari GitHub Pages; membuka `index.html` langsung sebagai file tidak mendukung pemasangan atau cache offline.

- Laptop: buka situs di Chrome atau Edge, lalu pilih ikon Install di bilah alamat atau menu browser.
- Android: buka situs di Chrome, buka menu, lalu pilih Install app atau Tambahkan ke layar utama.
- iPhone/iPad: buka situs di Safari, tekan Bagikan, lalu pilih Tambahkan ke Layar Utama.

Pada browser yang mendukung pemasangan langsung, tombol Install App akan muncul di bagian atas aplikasi. Setelah perubahan di-deploy, buka situs sekali dalam keadaan online agar app shell tersimpan untuk dibuka kembali saat offline. Sinkronisasi Supabase tetap memerlukan koneksi internet.

## Setup Supabase

1. Buka dashboard Supabase project.
2. Masuk ke SQL Editor.
3. Jalankan isi file `supabase-schema.sql`. Jika HAKU sudah pernah disiapkan, jalankan ulang file ini untuk memperbarui policy dan menambahkan baris Studio Desk; data HAKU yang sudah ada tidak ditimpa.
4. Buka aplikasi melalui hosting HTTPS atau jalankan server lokal, bukan dengan membuka file HTML langsung.

Aplikasi akan memakai Supabase sebagai database utama dan tetap menyimpan cadangan data di browser. Data projek beserta client, To-do, invoice, pelunasan, pengeluaran tim, dan pengaturan tersimpan pada `app_state.id = 'freelance_main'`; data HAKU tetap di `app_state.id = 'drinkstock_main'`. Data kedua sistem berada di database yang sama, tetapi tidak digabung menjadi transaksi stok HAKU.

## Studio Desk

Buat card projek dengan nama, kategori, dan deadline, lalu tambahkan beberapa client di dalamnya. Setiap client memiliki kategori, nilai kesepakatan, deadline, status, tim opsional, serta referensi atau catatan. Pengaturan menyediakan kategori projek dan client secara terpisah.

Halaman Pemasukan menggabungkan invoice per client atau seluruh projek, pelunasan sebagian/penuh, cetak invoice, riwayat pemasukan, dan pengeluaran tim. Total Pemasukan memakai filter minggu berjalan (Senin sampai hari ini) atau bulan berjalan. Prediksi Pemasukan menghitung seluruh sisa kesepakatan yang belum lunas, termasuk client yang belum selesai; client dibatalkan tidak dihitung. Invoice baru tidak dihitung sebagai uang diterima sampai pelunasannya dicatat.

Catatan keamanan: aplikasi ini belum memakai login. Policy anon membolehkan pengunjung yang memiliki URL dan publishable key membaca serta mengubah dua baris aplikasi tersebut. Jangan masukkan data klien sensitif atau publikasikan aplikasi sebelum menambahkan Supabase Auth dan policy berbasis akun.
