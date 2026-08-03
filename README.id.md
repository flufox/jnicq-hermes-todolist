<div align="center">

<p><strong>Bahasa dokumentasi:</strong> <a href="README.ru.md">Русский</a> · <a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.kk.md">Қазақша</a> · <a href="README.th.md">ไทย</a> · <a href="README.id.md">Bahasa Indonesia</a></p>

<h1>Hermes Todo</h1>
<p><strong>Ubah setiap percakapan dengan Hermes menjadi rencana bersama.</strong></p>
<p>Kirim pesan teks atau suara kepada Hermes. Tugas, penanggung jawab, dan tanggal akan muncul dalam satu kalender sederhana yang dapat dilihat dan diperbarui bersama.</p>
<p><a href="#dari-percakapan-menjadi-tindakan">Lihat cara kerjanya</a> · <a href="#coba-secara-lokal">Coba demo</a> · <a href="#instalasi-untuk-penggunaan-nyata">Instal dengan Docker</a></p>
<p>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/ci.yml/badge.svg" alt="Status CI" /></a>
  <a href="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml"><img src="https://github.com/flufox/jnicq-hermes-todolist/actions/workflows/security.yml/badge.svg" alt="Status pemeriksaan keamanan" /></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/status-v0.1.0-c65b4b" alt="Rilis v0.1.0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-252826" alt="Lisensi MIT" /></a>
</p>

</div>

<a href="docs/assets/desktop-overview.png">
  <img src="docs/assets/desktop-overview.png" alt="Rencana bersama dua minggu di Hermes Todo dengan tugas terjadwal, penanggung jawab, dan backlog" />
</a>

Rencana sering dibuat dalam percakapan, lalu hilang di dalam percakapan yang sama. Seseorang harus mengingat tanggalnya, menyalin tugas ke aplikasi lain, dan memberi tahu semua orang saat ada perubahan.

Hermes Todo menutup celah itu. Cukup beri tahu [Hermes Agent](https://github.com/NousResearch/hermes-agent) sekali tentang hal yang perlu dikerjakan. Permintaan tersebut menjadi tugas di kalender bersama, tempat keluarga, teman serumah, atau tim kecil dapat menetapkan penanggung jawab, menjadwalkan ulang, dan menyelesaikannya bersama.

> Hermes Todo adalah proyek komunitas. Proyek ini tidak berafiliasi dengan atau didukung oleh Nous Research maupun Telegram.

## Dari percakapan menjadi tindakan

> 🎙️ **“Hermes, tambahkan belanja bahan makanan untuk Kamis pukul 18.00 dan tugaskan kepada Alex dan Maya.”**

<table>
  <tr>
    <td width="33%"><strong>1. Sampaikan secara alami</strong><br /><br />Gunakan teks atau audio pada kanal yang didukung Hermes Agent. Tidak ada formulir tugas yang perlu diisi.</td>
    <td width="33%"><strong>2. Hermes menyusunnya</strong><br /><br />Plugin Hermes Todo mengubah permintaan menjadi tugas dengan tanggal, waktu, tag, dan penanggung jawab.</td>
    <td width="33%"><strong>3. Semua orang melihatnya</strong><br /><br />Telegram Mini App bersama diperbarui dan menampilkan rencana terbaru kepada setiap peserta.</td>
  </tr>
</table>

Hermes Agent menangani percakapan dan audio. Hermes Todo adalah ruang kerja visual bersama yang menerima hasil terstruktur melalui plugin.

## Semua tugas bersama dalam satu tempat

- **Lihat rencana dengan cepat.** Beralih antara tampilan 1–7 hari, dua minggu, atau empat minggu.
- **Ketahui siapa mengerjakan apa.** Tugaskan satu pekerjaan kepada satu atau beberapa peserta.
- **Buka daftar lengkap satu hari.** Ketuk dua kali suatu tanggal atau tekan **Buka hari** untuk melihat semua tugas pada tanggal tersebut.
- **Ubah rencana dengan mudah.** Tahan tugas lalu seret dengan jari atau mouse ke hari lain.
- **Simpan detail yang berguna.** Tambahkan catatan, tag, tanggal sepanjang hari, atau waktu mulai dan selesai yang tepat.
- **Tetap sinkron.** Perubahan dari sesi Hermes dan klien Mini App lain muncul di tampilan bersama.
- **Tetap mengendalikan data.** Aplikasi di-host sendiri, memiliki arsip yang dapat dipulihkan, dan menyimpan tugas di server Anda.

## Tampilan aplikasi

<table>
  <tr><th width="50%">Satu minggu dalam sekali lihat</th><th width="50%">Rencana lengkap satu hari</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-calendar.png"><img src="docs/assets/mobile-calendar.png" alt="Kalender seluler tujuh hari Hermes Todo dengan tugas bersama dan beberapa penanggung jawab" /></a></td>
    <td><a href="docs/assets/mobile-day-plan.png"><img src="docs/assets/mobile-day-plan.png" alt="Panel rencana harian Hermes Todo yang menampilkan semua tugas hari Kamis" /></a></td>
  </tr>
  <tr><td><strong>Satu ketukan memilih tanggal; dua ketukan membuka daftar lengkapnya.</strong></td><td><strong>Lihat tugas sepanjang hari dan tugas berwaktu dalam satu urutan.</strong></td></tr>
</table>

<table>
  <tr><th width="50%">Pindahkan tanpa membuka ulang</th><th width="50%">Buat setiap tugas lebih presisi</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-drag-task.png"><img src="docs/assets/mobile-drag-task.png" alt="Tugas Hermes Todo diseret ke atas menuju hari lain di kalender" /></a></td>
    <td><a href="docs/assets/mobile-task-editor.png"><img src="docs/assets/mobile-task-editor.png" alt="Editor tugas Hermes Todo dengan waktu 24 jam, tag, catatan, dan beberapa penanggung jawab" /></a></td>
  </tr>
  <tr><td><strong>Tahan, seret, lepaskan. Detail tugas tetap tersimpan pada tanggal baru.</strong></td><td><strong>Gunakan format 24 jam secara default atau pilih AM/PM di Pengaturan.</strong></td></tr>
</table>

<table>
  <tr><th width="50%">Satu rencana untuk beberapa orang</th><th width="50%">Selesai bukan berarti hilang</th></tr>
  <tr>
    <td><a href="docs/assets/mobile-team-settings.png"><img src="docs/assets/mobile-team-settings.png" alt="Pengaturan Hermes Todo dengan tiga anggota, undangan, format waktu, dan Google Calendar" /></a></td>
    <td><a href="docs/assets/mobile-completed.png"><img src="docs/assets/mobile-completed.png" alt="Daftar tugas selesai Hermes Todo dengan item yang dapat dipulihkan" /></a></td>
  </tr>
  <tr><td><strong>Undang peserta dan berikan satu sumber informasi terbaru untuk semua.</strong></td><td><strong>Pekerjaan yang selesai dan diarsipkan tetap terlihat dan dapat dipulihkan.</strong></td></tr>
</table>

## Coba secara lokal

Ini adalah cara tercepat untuk memahami produk. Anda memerlukan Node.js 22+, tetapi tidak memerlukan bot Telegram, domain, Docker, atau secret production.

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
npm ci
npm run dev:demo
```

Buka [http://127.0.0.1:5173](http://127.0.0.1:5173). Anda akan melihat ruang kerja lokal dengan data tugas contoh. Demo sengaja dibatasi pada loopback dan tidak boleh dibuka ke jaringan.

### Menggunakan coding agent?

Tempel prompt ini ke alat pemrograman Anda:

> Clone `flufox/jnicq-hermes-todolist`, jalankan demo yang hanya terikat ke loopback, dan jelaskan struktur proyek sebelum mengedit. Jangan membaca atau menaruh secret dalam prompt maupun commit. Buat satu perubahan yang terarah, lalu jalankan pengujian, production build, dan release scan.

Setelah perubahan, minta alat tersebut menjalankan:

```bash
npm test
npm run test:python
npm run build
npm run release:scan
```

## Instalasi untuk penggunaan nyata

Untuk instalasi pertama, jalur yang disarankan adalah penyiapan terpandu.

### Yang diperlukan

- server Linux dengan Git, Docker Engine, dan Docker Compose v2;
- domain dengan DNS yang mengarah ke server tersebut;
- port 80 dan 443 terbuka saat menggunakan mode Caddy yang disarankan;
- akun Telegram dan token bot baru dari [BotFather](https://t.me/BotFather);
- Hermes Agent 0.16.x hanya jika tugas perlu berasal dari percakapan Hermes.

### 1. Buat bot Telegram

Buka [BotFather](https://t.me/BotFather), kirim `/newbot`, lalu ikuti petunjuknya. Simpan token yang diberikan dengan aman. Jangan commit token atau menempelkannya ke GitHub Issue.

### 2. Jalankan penyiapan terpandu

```bash
git clone https://github.com/flufox/jnicq-hermes-todolist.git
cd jnicq-hermes-todolist
chmod +x hermes-todo
./hermes-todo setup
```

Untuk pemasangan termudah, pilih `caddy` saat ditanya tentang proxy mode. Penyiapan akan meminta domain, email ACME, zona waktu, bahasa, nama ruang kerja, dan token bot Telegram. Selanjutnya, penyiapan akan:

- memvalidasi Docker Compose dan token bot;
- membuat file secret privat dan basis data lokal;
- memulai container dan menunggu health check;
- menghubungkan tombol menu bot ke Mini App;
- menampilkan undangan admin sekali pakai yang kedaluwarsa dalam 30 menit.

### 3. Buka ruang kerja

Buka bot di Telegram, ketuk tombol menu, lalu masukkan undangan admin yang ditampilkan. Kalender bersama akan muncul. Undang peserta lain dari **Pengaturan → Anggota**.

Jika aplikasi tidak menjadi healthy, jalankan:

```bash
./hermes-todo doctor
```

### 4. Hubungkan Hermes Agent (opsional)

Langkah ini mengaktifkan alur `pesan/audio → tugas bersama`. Jika penyiapan menemukan Hermes 0.16.x lokal dan Anda menyetujui pemasangan plugin, lewati langkah ini.

Jika tidak, salin nilai dari `secrets/hermes_agent_token` secara aman ke mesin yang menjalankan Hermes, lalu jalankan:

```bash
hermes plugins install https://github.com/flufox/jnicq-hermes-todolist.git --enable
hermes gateway restart
```

Pemasang meminta dua nilai dan menyimpannya dalam file environment privat milik Hermes:

- `HERMES_TODO_API_URL`: origin publik, misalnya `https://todo.example.com`; jangan tambahkan `/api/agent/v1`;
- `HERMES_TODO_API_TOKEN`: scoped token yang disalin; input akan disembunyikan.

Jangan hanya melakukan `export` sementara dalam satu sesi shell: nilai harus tetap tersedia setelah gateway dimulai ulang. Di luar kolom tersembunyi pemasang, jangan menaruh token di riwayat shell, percakapan AI, Issue, atau repository.

Uji koneksi dengan permintaan yang aman, misalnya:

> “Hermes, tambahkan ‘Periksa Hermes Todo’ untuk besok pukul 10.00.”

Tugas akan muncul di Mini App. Skrip penyiapan tidak memasang Hermes itu sendiri; pemasangan plugin mengikuti [alur plugin resmi Hermes](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/plugins.md).

## Yang tersedia dalam v0.1.0

`v0.1.0` adalah rilis publik pertama. Alur inti tugas bersama, pemeriksaan otomatis, dan Docker runtime lokal telah diverifikasi. Setiap instalasi publik tetap perlu menguji domain/TLS-nya sendiri serta alur Telegram-ke-Hermes secara langsung. Masukan, laporan bug, dan kontribusi pertama sangat diterima.

- satu ruang kerja bersama dengan peran admin dan anggota;
- pembuatan, penyuntingan, penyelesaian, pemulihan, dan pengarsipan tugas;
- beberapa penanggung jawab, tag, catatan, jadwal sepanjang hari dan berwaktu;
- rentang kalender 1–7 hari, dua minggu, dan empat minggu;
- tampilan hari lengkap dengan ketuk dua kali serta seret untuk menjadwalkan ulang melalui sentuhan/mouse;
- pembaruan langsung antara sesi Hermes dan Mini App;
- format 24 jam secara default dengan pilihan AM/PM;
- undangan sekali pakai dan token agent terbatas yang dapat dicabut;
- sinkronisasi dua arah opsional dengan Google Calendar khusus;
- backup portabel terenkripsi dan pemulihan dengan pemeriksaan integritas;
- antarmuka berbahasa Inggris dan Rusia.

Rilis pertama sengaja difokuskan: satu instance melayani satu kelompok kecil dan satu replica aplikasi. Login production menggunakan Telegram. Tidak ada mikrofon bawaan, SaaS, multitenancy, atau pemenang konflik Google Calendar otomatis. Lihat [roadmap](ROADMAP.md) untuk arah berikutnya.

## Privasi dan pemulihan

Isi tugas disimpan sebagai plaintext di dalam basis data SQLite yang dilindungi. Gunakan enkripsi penuh disk, backup terenkripsi di lokasi lain, pembaruan OS, dan TLS proxy tepercaya. Aplikasi dan worker berjalan sebagai pengguna non-root dengan read-only root filesystem, seluruh capabilities dihapus, dan `no-new-privileges`; Caddy hanya mempertahankan `NET_BIND_SERVICE` untuk port listener.

Hermes menerima catatan tugas hanya ketika tool call memintanya secara eksplisit. Agent API tidak dapat menghapus tugas secara permanen atau mengubah pengaturan workspace, OAuth, dan sinkronisasi. Baca [kebijakan keamanan](SECURITY.md), [model ancaman](docs/THREAT_MODEL.md), dan [tinjauan keamanan terbaru](docs/SECURITY_REVIEW.md) sebelum menerbitkan instance.

<details>
<summary><strong>Penyiapan dan operasi lanjutan</strong></summary>

### Mode proxy

Profil `caddy` yang disarankan membuka port 80/443 dan memperoleh sertifikat HTTPS secara otomatis. Pilih `external` jika reverse proxy lain sudah menangani TLS; Hermes Todo kemudian hanya mendengarkan pada `127.0.0.1:3000`. Instalasi Hermes jarak jauh harus menggunakan Agent API melalui HTTPS publik. HTTP biasa hanya sesuai untuk pengembangan loopback.

### Google Calendar

1. Di [Google Cloud](https://support.google.com/cloud/answer/15549257), aktifkan Google Calendar API, atur OAuth consent screen, dan buat OAuth client berjenis **Web application**.
2. Tambahkan authorized redirect URI ini dengan mengganti domain:

   ```text
   https://todo.example.com/api/v1/admin/integrations/google/callback
   ```

3. Edit `.env` menjadi `COMPOSE_PROFILES=caddy,calendar` atau `COMPOSE_PROFILES=external-proxy,calendar` agar profil kalender tetap aktif setelah pembaruan.
4. Mulai worker, buka **Pengaturan → Google Calendar**, masukkan client ID dan secret, lalu hubungkan akun:

```bash
docker compose up -d --wait
```

Hermes Todo membuat dan hanya menggunakan kalender khusus. OAuth refresh credentials dienkripsi dengan AES-256-GCM. Perubahan bersamaan ditandai `needs_attention`; tidak ada pihak yang menimpa pihak lain secara diam-diam.

### Perintah sehari-hari

```bash
./hermes-todo doctor
./hermes-todo invite-member
./hermes-todo rotate-token
./hermes-todo backup
./hermes-todo backup --portable
./hermes-todo restore --archive backups/example.htbackup
./hermes-todo update
```

Layanan backup menyimpan tujuh snapshot SQLite harian dan empat mingguan. Backup portabel mencakup basis data dan master key yang diperlukan dalam container AES-256-GCM yang dilindungi passphrase.

### Konfigurasi utama

Nilai non-secret berada di `.env`. Token Telegram, master key basis data, dan token Hermes Agent hanya berada dalam file milik pemilik di bawah `secrets/`.

| Variabel | Kegunaan | Default |
| --- | --- | --- |
| `HERMES_TODO_DOMAIN` | Hostname publik | wajib |
| `HERMES_TODO_TIMEZONE` | Zona waktu IANA untuk workspace | `UTC` |
| `HERMES_TODO_LOCALE` | Locale workspace saat penyiapan; setiap client dapat memilih bahasa UI | `en` |
| `COMPOSE_PROFILES` | `caddy` atau `external-proxy`; dapat ditambah `calendar` | `caddy` |
| `HERMES_TODO_CALENDAR_POLL_MS` | Interval polling kalender | `30000` |

</details>

## Build dan kontribusi

Stack sengaja dibuat kecil: React/Vite, Express 5, SQLite, plugin Hermes berbasis Python, Docker Compose, dan worker Google Calendar opsional. Mulai dari [CONTRIBUTING.md](CONTRIBUTING.md), lalu gunakan:

```bash
npm ci
npm test
npm run test:python
npm run build
npm run dev:demo
```

Detail arsitektur dan API tersedia di [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) dan [kontrak OpenAPI 3.1](docs/openapi-agent.yaml). Riwayat rilis tersedia di [CHANGELOG.md](CHANGELOG.md), sedangkan aturan komunitas berada di [Code of Conduct](CODE_OF_CONDUCT.md).

## Lisensi

[MIT](LICENSE)
