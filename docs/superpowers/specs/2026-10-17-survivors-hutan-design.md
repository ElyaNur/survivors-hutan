# Survivors Hutan: Dokumen Desain Versi 1 (Mage)

*Nama sementara. Tanggal: 2026-10-17.*

## 1. Intinya

Game survival pixel art di browser, gaya Vampire Survivors. Bedanya ada dua:

1. **Tiap class punya pohon skill sendiri.** Swordman, Mage, dan Archer dapat skill yang beda total dari level up, jadi main ulang pakai class lain kerasa kayak game baru, bukan cuma ganti senjata awal. Inspirasinya Magic Survival.
2. **Ultimate adalah hadiah dari perencanaan build.** Tiap ultimate punya resep berupa dua skill tertentu. Kalau dua-duanya udah level max, ultimate kebuka. Dari level-level awal pemain udah mikir "akhirnya gua mau jadi apa", dan build-nya meledak di menit-menit akhir.

Pemiliknya bikin game ini buat dimainin sendiri, tapi juga dirilis gratis ke publik (itch.io / GitHub Pages).

## 2. Target versi 1

Satu run lengkap yang seru dan rapi dengan **satu class (Mage)** di **satu peta (Hutan Cerah)**.

### Yang termasuk
- Peta Hutan Cerah dengan gubuk spawn, sungai, dan jembatan.
- Class Mage: 6 skill dan 3 ultimate (bagian 5).
- Serangan otomatis, pemain cuma gerak.
- Level up dengan pilihan 1 dari 3 kartu.
- Run 20 menit, kesulitan naik bertahap, mini-boss, boss di menit 20.
- Layar menang dan kalah, plus rekor tersimpan di browser.
- Efek suara sederhana.
- Bisa dirilis sebagai file statis.

### Yang belum (nanti, urut prioritas)
1. **Buku Resep:** ultimate yang pernah dibuka tercatat permanen, ditambah ultimate rahasia yang harus ditemuin sendiri. Ini fitur pertama setelah versi 1.
2. Class Swordman dan Archer (desainnya ada di bagian 12, supaya kode versi 1 nggak menghalangi).
3. Kontrol sentuh untuk HP.
4. Musik.
5. Upgrade permanen, buka konten, dan peta lain.

### Yang bikin gagal walaupun "jalan" (anti-goal dari pemilik)
- **Visualnya ampas:** karakter, peta, musuh, atau efek skill kelihatan murahan. Standarnya ada di bagian 9.
- **Banyak bug yang ganggu permainan:** game macet, skill nggak keluar, ultimate nggak kebuka padahal syaratnya terpenuhi, musuh nyangkut, FPS anjlok. Cara jaganya ada di bagian 11.

## 3. Platform dan teknologi

- **Browser saja, tanpa server.** Hasil akhirnya folder statis (HTML + JS + PNG/JSON + audio) yang bisa di-zip untuk itch.io.
- **HTML + JavaScript biasa (ES modules) dengan Canvas 2D.** Tanpa framework, tanpa bundler, tanpa dependency runtime. *(Keputusan Claude, pemilik belum minta yang lain.)*
- Saat develop, game dibuka lewat static server lokal apa pun (ES modules nggak jalan dari `file://`).
- Game digambar di resolusi internal kecil, kira-kira 480×270, lalu diperbesar dengan kelipatan bulat dan `image-rendering: pixelated` supaya pikselnya tajam. Sisa layar diberi bingkai.
- Node 24 sudah terpasang di mesin pemilik, dipakai untuk pxl dan tes.

## 4. Cara main

- **Kontrol:** WASD atau panah untuk gerak, Esc untuk pause. Selain itu otomatis semua: serangan, skill, dan ultimate keluar sesuai cooldown masing-masing.
- **Alur layar:** Menu utama → Pilih class (Mage bisa dipilih, Swordman dan Archer tampil terkunci dengan label "Segera") → Run → Layar hasil (menang/kalah, statistik, rekor) → kembali ke menu.
- **Run:** pemain muncul di depan gubuk. Musuh berdatangan dari semua arah dan makin lama makin berat. Musuh yang mati menjatuhkan permata XP. XP penuh berarti naik level, game berhenti sebentar, dan muncul 3 kartu.
- **Menang:** kalahkan boss di menit 20, lalu muncul layar menang.
- **Kalah:** HP habis, lalu muncul layar kalah.
- **Pemain:** punya HP. Tersentuh musuh atau peluru berarti kena damage, lalu kebal sebentar dan berkedip. Permata XP tersedot kalau masuk radius magnet.
- **Drop:** permata XP (beberapa warna sesuai nilainya), sesekali daging/hati untuk isi HP, sesekali magnet yang menyedot semua XP di layar. Mini-boss dan boss menjatuhkan peti yang memberi 1–3 level up gratis.

## 5. Mage: skill dan ultimate

### Aturan slot (keputusan Claude, tolong dicek)
Waktu brainstorming disebut "sekitar 6 skill per run". Tapi Mage punya tepat 6 skill, jadi batas 6 nggak ada artinya. Diganti begini:

- **Skill awal:** sebelum run mulai, pemain memilih 1 dari 6 skill Mage. Pilihan ini makan 1 slot, jadi keputusan build mulai dari detik pertama. *(Disetujui pemilik.)*
- **Maksimal 4 skill aktif per run.** Tiap skill naik sampai **level 5**.
- 4 skill berarti paling banyak bisa menyelesaikan **2 dari 3 resep ultimate**. Dari awal pemain harus milih mana yang dikejar dan mana yang dikorbankan.
- **Pasif** mengisi level up yang lain, maksimal 4 slot, masing-masing sampai level 5: +HP maks, +kecepatan gerak, −cooldown, +radius magnet, +XP, +area efek. Pasif berlaku untuk semua class.
- **Kartu level up:** 3 kartu acak dari skill yang belum maks, skill baru (kalau slot masih ada), dan pasif. Kalau semuanya udah maks, yang muncul satu kartu "isi HP". *(Keputusan Claude saat bikin rencana: "+skor" dihapus karena game ini nggak punya skor.)*
- **Tanda resep di kartu:** tiap kartu skill menampilkan ultimate yang memakainya, misalnya "🔥 Armageddon". Ada juga panel HUD yang menunjukkan progres tiap resep (dua ikon bahan dengan titik level).

### 6 skill Mage
Arah perkembangan per level ditulis di sini. Angkanya (damage, cooldown, dan lain-lain) disetel lewat playtest (bagian 10).

| Skill | Perilaku | Naik level memberi |
|---|---|---|
| **Fireball** | Menembak bola api ke musuh terdekat. Meledak kecil saat kena. | +damage, +1 bola di lv 3 dan lv 5, ledakan lebih lebar |
| **Meteor** | Bayangan peringatan muncul di titik musuh paling padat, lalu meteor jatuh: damage area besar dan tanah terbakar sebentar. | +jumlah meteor, +radius, api lebih lama |
| **Ice Shard** | Menembakkan kepingan es ke musuh terdekat. Menembus musuh dan memperlambat. | +tembus, menyebar jadi kipas 2→3 keping, perlambatan lebih kuat |
| **Frost Nova** | Gelombang es melingkar dari pemain secara berkala. Damage plus membekukan musuh sekitar ±1 detik. | +radius, beku lebih lama, cooldown lebih cepat |
| **Petir Berantai** | Petir menyambar musuh acak di layar lalu melompat ke musuh terdekat. | +jumlah lompatan, +damage, +sambaran per tembakan |
| **Orb Arcane** | Bola sihir mengorbit pemain dan memberi damage saat menyentuh musuh. | +jumlah orb, orbit lebih cepat dan lebar |

### 3 ultimate Mage
- Resep: dua skill bahan sama-sama **level 5**. Ultimate langsung aktif tanpa harus memilih kartu, ditandai pengumuman besar di layar.
- **Skill bahan tetap jalan.** Ultimate adalah serangan tambahan dengan cooldown panjang (±20–30 detik) dan efek besar.

| Ultimate | Resep | Efek |
|---|---|---|
| **Armageddon** | Fireball + Meteor | Hujan meteor menutupi seluruh layar selama beberapa detik. Layar goyang, langit memerah. |
| **Absolute Zero** | Ice Shard + Frost Nova | Semua musuh di layar membeku beberapa detik. Musuh beku menerima damage berlipat dan pecah berkeping saat mati. |
| **Badai Petir** | Petir Berantai + Orb Arcane | Awan badai mengikuti pemain beberapa detik dan menyambar banyak musuh tiap detik. Orb ikut beraliran listrik. |

Target pacing: ultimate pertama terbuka sekitar menit 10–14, ultimate kedua sebelum boss. Ini disetel lewat laju XP.

## 6. Peta: Hutan Cerah

Suasananya dipilih pemilik dari mockup: **hijau segar, ceria, lucu** (versi B). Mockup ada di `.superpowers/brainstorm/*/content/peta-hutan.html`.

- **Gubuk** di tengah peta jadi tempat spawn. Jalan setapak menuju **jembatan** yang melintasi **sungai berkelok** di sisi timur.
- **Ukuran:** peta terbatas, kira-kira 4×4 layar. Pinggirnya hutan lebat yang jadi tembok. *(Keputusan Claude.)*
- **Tabrakan** dibuat sederhana supaya musuh nggak perlu pathfinding:
  - Pohon, semak, batu, dan gubuk hanya dekorasi. Pemain dan musuh bisa lewat (seperti Vampire Survivors).
  - **Sungai bisa diseberangi, tapi semua yang di air melambat banyak.** Jembatan normal. Jadi jembatan tetap jadi titik sempit tempat musuh numpuk, tanpa pathfinding.
- **Detail hidup:** air sungai beranimasi, bunga dan rumput bergoyang, asap dari cerobong gubuk.

## 7. Musuh dan pacing (20 menit)

| Menit | Musuh baru | Sifat |
|---|---|---|
| 0 | **Slime hijau** | Lambat, langsung mendekat |
| 1 | **Kelelawar** | Cepat, lemah, terbang meliuk |
| 4 | **Slime merah** (recolor) | Lebih tebal dan cepat |
| 5 | **Goblin** | Sedang, datang berkelompok |
| 7 | **Serigala** | Cepat, datang berkawanan dari satu arah |
| 10 | **Mini-boss: Raja Slime** | Besar, pecah jadi slime kecil saat mati, menjatuhkan peti |
| 10 | **Orc** | Lambat, HP tebal |
| 12 | **Penyihir Hutan** | Jaga jarak, menembak peluru lambat yang bisa dihindari |
| 15 | **Mini-boss: Kepala Orc** | Menyeruduk lurus setelah ancang-ancang, menjatuhkan peti |
| 15–20 | Gelombang campuran | Semua jenis, lebih rapat |
| 20 | **Boss: Pohon Tua (Treant)** | Lambat. Akar keluar dari tanah setelah lingkaran peringatan. Memanggil anak buah. Menang kalau mati. |

- Musuh muncul tepat di luar pandangan kamera dari segala arah yang masih di dalam batas peta.
- **Event gelombang** sesekali: lingkaran kelelawar mengepung pemain, atau kawanan serigala lewat menyapu.
- Musuh lama tetap muncul sepanjang run, tapi porsinya mengecil dan statnya naik pelan. Jadwal ini berupa **data**, bukan kode, supaya gampang disetel.
- Target performa: lancar 60 FPS dengan ±400 musuh plus proyektil di laptop biasa.

## 8. Antarmuka

- **HUD:** bar XP penuh di atas, timer di tengah atas, level, jumlah kill, HP di bawah karakter, ikon skill dan pasif dengan titik level di pojok, serta panel progres resep ultimate.
- **Layar level up:** 3 kartu dengan ikon, nama, level berikutnya, deskripsi singkat, dan tanda resep. Bisa dipilih dengan mouse dan keyboard (1/2/3 atau panah + Enter).
- **Pengumuman ultimate:** banner besar plus efek saat resep selesai.
- **Layar hasil:** menang/kalah, waktu bertahan, kill, level, ultimate yang dibuka, dan penanda "Rekor baru!".
- **Menu utama:** Main, Rekor, dan nyalakan/matikan suara.
- **Teks dalam bahasa Indonesia.**

## 9. Art (claude-pxl) dan standar visual

### Alat
Semua art dibuat dengan **claude-pxl** (https://github.com/crsolver/claude-pxl): file `.px.js` di-render jadi PNG, spritesheet + JSON (format TexturePacker, frame animasi bertag ala Aseprite), dan GIF. Butuh Node ≥ 22.18, tanpa install. Disarankan memasang repo itu sebagai skill Claude Code (`.claude/skills/pxl-pixel-art`) supaya alur kerjanya (tulis → build → lihat preview → perbaiki) terpakai. Sumber art (`.px.js`) disimpan di repo dan hasil build-nya dipakai game.

### Gaya
- Palet terbatas, cerah dan ceria, konsisten satu palet untuk semua aset.
- Sprite kecil: karakter dan musuh biasa sekitar 16×16, mini-boss sekitar 32×32, boss sekitar 48–64. Ukuran pastinya diserahkan ke builder.
- Outline gelap supaya sprite tetap terbaca di tengah kerumunan.

### Daftar aset versi 1
- **Mage:** diam, jalan, kena pukul, mati (dibalik untuk arah kiri/kanan).
- **Tiap musuh:** jalan/terbang (2–4 frame), kena pukul (kedip putih bisa dari kode), mati (kepulan). Boss punya animasi serang.
- **Proyektil dan efek tiap skill dan ultimate**, beranimasi dan pakai glow: bola api, ledakan, meteor + bayangan, keping es, gelombang es, petir, orb, awan badai, api di tanah, efek beku/pecah.
- **Tile dan dekorasi:** variasi rumput, bunga, jalan setapak, sungai beranimasi, tepi sungai, jembatan, 3+ varian pohon, semak, batu, gubuk (cerobong berasap).
- **Pickup:** permata XP per warna, daging/hati, magnet, peti.
- **UI:** ikon 6 skill, 3 ultimate, dan 6 pasif; bingkai kartu; bar; font piksel (pakai font bawaan pxl atau font piksel dengan lisensi bebas).

### Standar "nggak ampas" (wajib)
- Semua yang bergerak punya animasi. Nggak ada sprite diam yang meluncur.
- **Rasa pukulan:** musuh berkedip putih dan terdorong sedikit saat kena, angka damage melayang, partikel saat mati, layar goyang di ledakan besar dan ultimate, berhenti sejenak (hit-stop) pada pukulan besar.
- Tiap spell punya warna dan cahaya khas yang langsung dikenali di tengah kekacauan.
- Tiap aset dicek di preview pxl sebelum dipakai. Yang kelihatan murahan digambar ulang, bukan ditoleransi.
- Pemilik melihat dan menyetujui sprite Mage, satu musuh, dan satu efek spell dulu sebelum aset lain dibuat massal, untuk mengunci gaya. Ini titik berhenti sungguhan: tanyakan ke pemilik, tunggu jawabannya. Sementara itu, gameplay boleh dibangun pakai placeholder (kotak berwarna atau sampel art yang ada). *(Keputusan Claude.)*

### Kalau claude-pxl bermasalah
Repo-nya sudah dicek bisa diakses (Oktober 2026), berlisensi MIT (aman untuk rilis publik), tanpa dependency runtime, dan Node 24 cukup. Kalau tetap gagal dipakai, **berhenti dan tanya pemilik**. Jangan diam-diam pindah ke cara menggambar lain, karena pemilik memang secara khusus minta claude-pxl. *(Keputusan Claude.)*

## 10. Angka dan penyetelan
- Semua angka gameplay (HP, damage, cooldown, kecepatan, kurva XP, jadwal spawn) ada di satu tempat yang mudah diedit, terpisah dari logika.
- **Target kesulitan (disetujui pemilik):** boss di menit 20 bisa dikalahkan dengan 1 ultimate, tapi sangat susah tanpa ultimate. Ngerencanain build itu wajib, bukan bonus. Angka awal (HP musuh, HP boss, kurva XP) disetel ke arah ini.
- Angka awal ditebak, lalu disetel lewat main langsung. Pemilik ikut mencoba dan memberi masukan "terlalu gampang/susah/lemah".
- Mode debug saat develop (tidak aktif di rilis): lompat waktu, tambah level, buka ultimate, tampilkan FPS. Ini supaya ultimate dan boss bisa dites tanpa main 20 menit.

## 11. Kualitas dan anti-bug
- **Tes otomatis kecil** (`node:test`, tanpa framework) untuk logika inti yang tidak butuh canvas: kurva XP dan level up, pengundian kartu (slot, batas level, fallback), syarat resep ultimate, jadwal spawn, tabrakan, dan damage.
- Logika game dipisah dari kode gambar supaya bisa dites.
- Tiap tahap dimainkan langsung di browser sebelum dinyatakan selesai, dengan cek konsol tanpa error dan FPS stabil di kerumunan besar.
- Tab browser yang tersembunyi atau kehilangan fokus otomatis pause, dan waktu tidak "melompat" saat kembali.

## 12. Ruang untuk class lain (bukan versi 1)
Kode versi 1 sebaiknya menganggap class sebagai data (daftar skill, resep, stat dasar) supaya Swordman dan Archer nanti bisa ditambah tanpa bongkar ulang. Ini bukan berarti membangun sistem plugin, cukup jangan mengunci "mage" di logika inti. Rencananya:

- **Swordman** (tank jarak dekat): Tebasan Melingkar, Dash Tebas, Perisai, Pedang Terbang, Hantaman Tanah, Haus Darah. Ultimate: Badai Pedang (Tebasan + Pedang Terbang), Benteng Baja (Perisai + Hantaman), Seribu Tebasan (Dash + Haus Darah).
- **Archer** (lincah, harus terus lari): Panah Beruntun, Panah Tembus, Hujan Panah, Jebakan, Panah Racun, Langkah Angin. Ultimate: Hujan Seribu Panah (Hujan + Beruntun), Panah Dewa (Tembus + Langkah Angin), Ladang Maut (Jebakan + Racun).

## 13. Suara
- **Versi 1:** efek suara pendek (tembakan tiap spell, kena, mati, level up, pickup, ultimate, boss). Dibuat secara prosedural dengan Web Audio atau file kecil berlisensi bebas, keputusan builder. Ada tombol mute yang diingat. *(Keputusan Claude.)*
- Musik: nanti.

## 14. Rekor
Disimpan di `localStorage`: bertahan terlama, kill terbanyak, level tertinggi, dan jumlah menang. Semua per class. Kalau `localStorage` tidak tersedia, game tetap jalan tanpa rekor.

## 15. Rilis
- Folder statis siap zip untuk **itch.io** (HTML5 game). GitHub Pages bisa menyusul.
- Halaman rilis dan aset promosi (screenshot, GIF dari pxl/gameplay) di luar lingkup kode.

## 16. Diserahkan ke builder
Struktur file dan modul, cara deteksi tabrakan untuk ratusan musuh, angka awal semua stat, ukuran sprite yang pasti, pilihan font, cara membuat SFX, dan urutan pengerjaan. Satu syarat untuk urutan: gaya art dikunci lebih dulu (bagian 9), dan harus ada versi yang bisa dimainkan sedini mungkin untuk dirasakan.
