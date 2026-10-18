# Survivors Hutan: Fusion dan Buku Resep

*Tanggal: 2026-10-18. Melanjutkan dokumen desain versi 1 (`2026-10-17-survivors-hutan-design.md`). Dokumen ini menggantikan bagian 5 "3 ultimate Mage" di dokumen itu, dan mengisi butir "Buku Resep" di daftar "Yang belum".*

## 1. Kenapa

Pemilik sudah memainkan versi 1 dan berubah pikiran soal ultimate. Tiga resep tetap (Armageddon, Absolute Zero, Badai Petir) diganti **fusion ala Magic Survival**: setiap pasangan skill bisa digabung jadi skill baru. Referensinya https://magic-survival-rpg.fandom.com/wiki/Magic_Combination.

Kata pemilik, alasan dia ingin main lagi ada dua:
- **Rasa penasaran:** "kalau skill ini digabung skill ini, jadinya gimana ya?"
- **Taruhan:** "gua bisa menang nggak ya kalau ngegabungin skill A + B?"

Supaya taruhannya terasa, mage harus **gampang mati**. Pass tuning `c1b3196` sudah dibuat untuk itu (spawn lebih rapat, musuh lebih sakit, darah mage 100, heal jarang, level awal lebih cepat).

**Sukses** artinya pemilik selesai satu run lalu langsung ingin mencoba pasangan lain, dan Buku Resep membuatnya ingin mengisi slot yang masih "???".

## 2. Goal, non-goal, anti-goal

**Goal**
- 15 fusion Mage, satu untuk tiap pasangan dari 6 skill.
- Fusion yang belum pernah ditemukan disembunyikan, lalu tercatat permanen setelah ditemukan.
- Halaman Buku Resep di menu.

**Non-goal**
- Fusion tiga skill, atau fusion dari skill hasil fusion. Pemilik bilang cukup 2 skill per fusion.
- Fusion untuk Swordman dan Archer. Class-nya sendiri belum dibuat, tapi aturan di sini harus berlaku juga untuk mereka nanti (lihat bagian 9).
- Upgrade permanen atau buka-konten di luar catatan penemuan.

**Anti-goal** (pemilik, tetap berlaku dari versi 1)
- Efek visual ampas.
- Bug yang mengganggu permainan.

Khusus fusion, ada dua anti-goal tambahan:
- **Fusion yang cuma skill lama dengan angka lebih besar.** Pemilik menolak "Api Biru" karena alasan ini. Aturannya: **tiap fusion harus memunculkan sesuatu yang baru di medan perang dengan kelakuan sendiri**. Contoh favorit pemilik: Lubang Hitam (menyedot lalu meledak) dan Cincin Matahari (matahari mengorbit sambil menembak).
- **Pasangan yang jelas jelek.** Kalau ada pasangan seperti itu, pemain berhenti mencoba-coba, padahal mencoba-coba itulah intinya.

## 3. Aturan fusion

- **Syarat:** pemain memegang dua skill yang sama-sama **level 5** dan belum di-fusion.
- **Kartu fusion pasti muncul.** Selama ada pasangan yang memenuhi syarat, minimal satu dari 3 kartu level-up adalah kartu fusion. Kalau ada beberapa pasangan yang memenuhi syarat, semuanya ikut diundi ke slot kartu sisanya bersama kartu biasa. Pemain boleh tidak memilihnya; kartu itu terus muncul di level-up berikutnya. *(Keputusan Claude.)*
- **Saat dipilih:** dua skill bahan hilang, diganti satu skill fusion di slot yang sama. Satu slot skill kosong lagi, jadi pemain bisa mengambil skill baru, menaikkannya ke level 5, lalu fusion lagi.
- **Skill fusion sudah bentuk akhir.** Tidak punya level dan tidak bisa digabung lagi. Pasif (cooldown, area, dan lain-lain) tetap berpengaruh. *(Keputusan Claude.)*
- **Urutan bahan tidak berpengaruh:** Fireball + Meteor sama dengan Meteor + Fireball.
- **Batas alami:** maksimal 4 skill aktif dan Mage punya 6 skill, jadi satu run paling banyak 3 fusion, dan itu pun hanya kalau keenam skill terpakai. Tidak perlu aturan batas tambahan.
- **Ultimate lama dihapus.** Mekanik "resep dua skill level 5 membuka ultimate otomatis" hilang. Tiga ultimate lama hidup lagi sebagai fusion (nomor 1, 10, dan 15 di bawah); kode dan art-nya boleh dipakai ulang semaksimal mungkin.
- Peti boss tetap memberi level gratis, dan kartu yang muncul dari peti mengikuti aturan yang sama.

## 4. Kartu dan penemuan

- **Fusion yang belum pernah ditemukan** (seumur hidup di browser itu, bukan per run): kartunya hanya menampilkan bahan, misalnya **"Fireball + Meteor = ???"**. Nama dan efeknya tersembunyi. Pemilik sendiri yang minta begini, setelah sempat memilih sebaliknya.
- **Fusion yang sudah ditemukan:** kartunya menampilkan bahan, nama, dan efek.
- **Ditemukan** artinya kartu fusion itu dipilih satu kali. Saat itu juga fusion tercatat permanen, tanpa menunggu run selesai.
- **Pengumuman:**
  - Penemuan pertama memakai banner besar "Fusion baru ditemukan!" dengan nama fusion, ditambah goyangan dan kilat seperti pengumuman ultimate versi 1.
  - Fusion yang sudah pernah ditemukan cukup memakai banner biasa.

## 5. 15 fusion Mage

Skill: Fireball, Meteor, Ice Shard, Frost Nova, Petir Berantai, Orb Arcane. Daftar ini sudah disetujui pemilik. Angka dan detail perilakunya diserahkan ke builder, selama sesuai gambaran di sini dan lolos aturan "ada benda baru".

| # | Bahan | Nama | Yang muncul di medan perang |
|---|---|---|---|
| 1 | Fireball + Meteor | **Hujan Neraka** | Tiap beberapa detik, belasan meteor jatuh acak di seluruh layar. Layar goyang dan langit memerah (Armageddon lama). |
| 2 | Fireball + Ice Shard | **Phoenix Api-Es** | Burung api-es terbang memutari mage. Satu sayap meninggalkan jejak api dan sayap lainnya jejak es. Sesekali ia menukik ke kerumunan lalu meledak. |
| 3 | Fireball + Frost Nova | **Supernova** | Cincin api menyebar dari mage dan meninggalkan jejak terbakar. |
| 4 | Fireball + Petir | **Bola Plasma** | Bola besar terbang pelan dan menyetrum semua musuh di sekitarnya sepanjang jalan. |
| 5 | Fireball + Orb | **Cincin Matahari** | Orb menjadi matahari kecil yang mengorbit dan menembakkan bola api ke luar. *(Favorit pemilik.)* |
| 6 | Meteor + Ice Shard | **Komet Es** | Komet es jatuh, membekukan area, lalu pecah menjadi serpihan ke segala arah. |
| 7 | Meteor + Frost Nova | **Gletser** | Bongkahan es raksasa jatuh, lalu meluncur lurus menabrak dan melindas semua musuh yang dilewati. |
| 8 | Meteor + Petir | **Penghakiman Langit** | Pilar petir menghantam dari langit di banyak titik, lalu berantai. |
| 9 | Meteor + Orb | **Lubang Hitam** | Lubang hitam muncul di kerumunan terpadat, menyedot musuh, lalu meledak. *(Favorit pemilik.)* |
| 10 | Ice Shard + Frost Nova | **Absolute Zero** | Tiap beberapa detik seluruh layar membeku, dan musuh beku menerima damage berlipat (Absolute Zero lama). |
| 11 | Ice Shard + Petir | **Pagar Kristal** | Pecahan es menancap di tanah jadi kristal. Kristal yang berdekatan tersambung petir dan menjadi pagar listrik yang menyetrum musuh yang lewat. |
| 12 | Ice Shard + Orb | **Pusaran Kristal** | Orb menjadi bilah es yang berputar sambil terus menyemburkan pecahan es ke luar. |
| 13 | Frost Nova + Petir | **Medan Statis** | Aura listrik berdenyut di sekitar mage. Musuh yang beku menjadi penghantar petir. |
| 14 | Frost Nova + Orb | **Benteng Es** | Cincin es berputar rapat. Musuh yang menyentuhnya langsung beku, dan sesekali cincin meledak ke luar. |
| 15 | Petir + Orb | **Badai Petir** | Orb menjadi inti badai yang terus menyambar musuh terdekat (Badai Petir lama). |

## 6. Kekuatan dan kesulitan

- **Fusion selalu lebih kuat dari gabungan kedua bahannya.** Fusion memakan dua skill level 5, jadi kalau ia lebih lemah dari dua skill itu, memilih fusion malah merugikan.
- **Target:** kira-kira setara untuk semua fusion. Tidak ada pasangan yang jelas jelek, dan tidak ada yang wajib. *(Keputusan Claude.)*
  - **Cara mengukur:** `scripts/sim.js` diubah supaya bisa menjalankan build berisi 3 fusion. Ada 15 cara membagi 6 skill menjadi 3 pasangan, dan tiap fusion muncul di 3 build. Nilai satu fusion adalah rata-rata peluang menang bot dari build yang memuatnya.
  - **Patokan setara:** fusion terlemah tidak kurang dari kira-kira separuh fusion terkuat. Plan 1 fusion tidak dipakai untuk membandingkan, karena hampir semuanya kalah.
  - **Patokan bot:** 1 fusion mendekati 0% menang, 2 fusion sekitar 20–40%, 3 fusion sekitar 50% ke atas.
- **Pacing (keputusan Claude):** fusion pertama sekitar menit 7–10, kedua sekitar menit 12–15, ketiga sebelum boss. Ini masih sejalan dengan keinginan awal pemilik agar build yang direncanakan "meledak" di menit-menit akhir. Kalau fusion keluar terlalu cepat, setel kurva XP atau kekuatan fusion, jangan tambah gerbang level seperti di Magic Survival.
- **Kekuatan fusion tetap terasa sampai menit 20.** Darah musuh naik terus per menit, jadi fusion yang didapat di menit 7 jangan sampai jadi lemah di menit 18. Caranya diserahkan ke builder.
- **Target kesulitan baru:** mage gampang mati. Satu fusion saja jarang cukup untuk menang; dua atau tiga fusion yang direncanakan dengan baik bisa menang. Bagian 10 dokumen versi 1 ("menang dengan 1 ultimate") diganti target ini. Bot lebih buruk dari pemilik, jadi playtest pemilik yang menentukan akhirnya.
- **Angka musuh dari `c1b3196` boleh disetel ulang** (spawn, damage, darah musuh, heal), asal rasa yang diminta pemilik tetap terjaga: kerumunan rapat sejak awal, mage gampang mati, heal jarang. *(Keputusan Claude.)*

## 7. Buku Resep

- **Menu utama** mendapat tombol **Buku Resep**, di antara Main dan Rekor.
- **Isinya 15 slot fusion Mage.** Bahan selalu terlihat, karena pasangannya bukan rahasia; yang rahasia adalah hasilnya.
  - Belum ditemukan: ikon kedua bahan dan "???".
  - Sudah ditemukan: ikon fusion, nama, efek, berapa kali dibuat, dan berapa kali menang di run yang memakainya.
- Penghitung **"Ditemukan: N/15"**.
- **Layar hasil:** daftar ultimate diganti fusion yang dibuat di run itu, dan fusion yang baru ditemukan diberi tanda "Baru!".
- **Penyimpanan:** di `localStorage`, per class, bersama atau di sebelah rekor. Mengikuti aturan rekor: kalau storage tidak ada atau error, game tetap jalan tanpa catatan.
  - Rekor versi 1 yang sudah tersimpan tidak boleh hilang.
  - Bentuk datanya diserahkan ke builder.

## 8. Antarmuka lain

- **Panel resep di HUD menjadi panel fusion.** Isinya pasangan yang bisa dibentuk dari skill yang sedang dipegang, dengan progres level kedua bahan, plus nama fusion kalau sudah ditemukan atau "???" kalau belum. Tujuannya supaya pemain bisa merencanakan. Tata letak diserahkan ke builder; panelnya tidak boleh menutupi area main lebih dari panel sekarang.
- **Tanda di kartu skill** (dulu "★ Armageddon") diganti tanda fusion. Kartu skill menampilkan dengan skill mana saja yang sedang dipegang ia bisa digabung, dan hasilnya kalau sudah ditemukan.
- **Slot skill di HUD** menampilkan ikon fusion tanpa titik level, dengan tanda yang membedakannya dari skill biasa.
- **Deskripsi Mage di layar pilih class:** "6 skill, 15 fusion."
- **Mode debug:**
  - F3 (semua skill jadi level 5) tetap ada.
  - Tambah satu tombol untuk langsung memberi fusion tertentu.
  - Tambah satu tombol untuk menghapus catatan penemuan, supaya "???" bisa dites ulang.

## 9. Art

- **Tiap fusion butuh:** efek visual sendiri (pakai claude-pxl), ikon 14×14, dan SFX prosedural.
- **Hujan Neraka, Absolute Zero, dan Badai Petir** boleh memakai ulang art ultimate lama.
- **Standar "nggak ampas"** dari bagian 9 dokumen versi 1 tetap wajib. Tiap fusion harus punya warna atau bentuk khas yang langsung dikenali di tengah kerumunan.
- **Titik berhenti untuk pemilik:** efek visual fusion ditunjukkan ke pemilik sebelum dikunci, bertahap per kelompok.
  - Kelompok pertama berisi **Lubang Hitam dan Cincin Matahari** (favorit pemilik), untuk mengunci standar.
  - Sementara menunggu, gameplay fusion boleh dibangun dengan placeholder.
- **Ikon "???"** untuk kartu dan Buku Resep.

## 10. Class lain nanti

Aturan fusion berlaku untuk semua class: tiap pasangan dari 6 skill class itu menjadi satu fusion, jadi 15 per class. Rencana ultimate Swordman dan Archer di bagian 12 dokumen versi 1 berubah menjadi bahan awal daftar fusion mereka. Kode jangan mengunci "mage": daftar fusion adalah data class, sama seperti daftar skill.

## 11. Kualitas

**Tes otomatis** untuk:
- syarat fusion dan kartu fusion yang pasti muncul
- pergantian dua bahan menjadi satu fusion, termasuk slot yang kembali kosong
- tidak bisa fusion dua kali dari bahan yang sama atau dari skill fusion
- urutan bahan yang tidak berpengaruh
- penyimpanan penemuan, termasuk saat storage mati dan migrasi dari rekor lama
- kartu "???" lawan kartu yang sudah terbuka

**Dicek di browser:** konsol bersih, dan FPS tetap aman di kerumunan terpadat (menit 19) dengan 3 fusion aktif sekaligus.

## 12. Diserahkan ke builder

- Angka semua fusion.
- Cara fusion tetap kuat sampai menit 20.
- Bentuk data penyimpanan.
- Tata letak panel fusion dan Buku Resep.
- Bentuk SFX.
- Urutan pengerjaan, dengan satu syarat: Lubang Hitam dan Cincin Matahari dikerjakan lebih dulu supaya pemilik bisa melihatnya lebih awal.
