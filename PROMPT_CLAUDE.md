# Prompt buat Claude Code — Token Radar Dashboard

Salin prompt di bawah ini apa adanya, tempel di Claude Code yang dibuka di folder `token-radar/`.

---

Bangun dashboard untuk bounty make.fun **"Build the best token launch radar"** (https://make.fun/bounty/token-radar-01). Hadiah $1.325, juara 1 $1.000. Deadline submit 14 Desember 2026.

## Langkah awal
Baca dulu `../token-radar-01-kit/RULES.txt`, `competition.yaml`, dan `input/README.md`, lalu inspeksi struktur `snapshot.json` dan starter `lib/model.ts`. Setelah itu bangun semuanya sampai selesai tanpa bertanya: model, `main.ts`, dashboard, `board.json`, lalu jalankan `main.ts` dan cek semua batas ukuran.

## Data
Snapshot DefiLlama per 14 Nov 2026 di `../token-radar-01-kit/input/snapshot.json` (read-only, jangan diubah): 758 protokol (TVL ≥ $5 jt), watchlist 40 protokol (TVL ≥ $50 jt, belum punya token, bukan wrapped/staked/bridge/versioned). Tiap protokol punya: slug, name, category, chains, tvl_usd, change_7d, mcap_usd, listed_at, gecko_id, symbol.

## Yang harus dibangun
1. **Model di `lib/model.ts`** — ganti model starter (itu baseline lemah). Implied value harus transparan, bukan angka tebakan:
   - Jangkar dari TVL, pakai rasio FDV/TVL median per kategori yang dihitung dari protokol di snapshot yang SUDAH punya token.
   - Rumus: `implied = TVL × rasio_kategori × f(growth7d) × f(chains) × f(umur)`, semua faktor di-clamp dan ditampilkan sebagai breakdown di halaman detail.
   - Tampilkan rentang rendah/tengah/tinggi, bukan satu angka. Tambah kolom keyakinan, supaya protokol yang datanya tipis tidak naik terlalu tinggi.
   - Ranking diurutkan berdasarkan implied value lalu TVL.
2. **`board.json` minimal 100 baris**, mencakup SELURUH 40 watchlist + protokol di bawah floor yang layak (pilih yang TVL-nya tinggi, tumbuh, belum punya token, dan lolos filter yang sama dengan watchlist). Tiap baris: rank, implied value (+ rentang), keyakinan, dan farm plan.
3. **Farm plan** tiap protokol: langkah nyata di produknya (deposit, vault, restake, dsb.) sesuai kategorinya, dengan label eksplisit "spekulatif, tidak ada bukti airdrop". Jangan pernah menyebut airdrop sebagai kepastian.
4. **Dashboard statis di `dashboard/`** (HTML + CSS + JS, satu file JS dan satu CSS, tanpa framework, tanpa network): papan peringkat, halaman detail tiap protokol (dengan breakdown implied value), dan filter (kategori / chain / TVL) yang benar-benar berfungsi.
5. **3 screenshot di `screenshots/`**: papan, detail protokol, tampilan terfilter. Kompres sampai 300–350 KB tiap gambar.
6. **`main.ts`** (Node 22, stdlib saja) harus jalan dan menulis `board.json`, `data.js`, `dashboard/`, `screenshots/`, `dossier.json` ke output. Jalankan lokal: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json`, buka dashboard di browser, screenshot ulang sampai bagus.

## Aturan keras (kalau dilanggar, entry tidak valid dan tidak dinilai)
- Dashboard TIDAK BOLEH memuat `http://` atau `https://` di mana pun: atribut HTML, `<style>`, `<script>`, CSS, import JS — termasuk `xmlns` di SVG. Teks biasa boleh.
- Total source dashboard ≤ 64 KB. Hitung ukurannya di `main.ts` dan gagalkan kalau mendekati batas.
- Screenshot: 3 buah, masing-masing ≤ 512 KiB (target 300–350 KB).
- `vendor/makefun-board.ts` jangan diubah.
- Jangan pakai aset atau branding yang menyesatkan; nama protokol dari snapshot apa adanya.

## Yang JANGAN dilakukan
- Jangan submit apa pun ke make.fun, jangan sentuh kredensial make.fun, jangan buat repo GitHub. Kerja lokal saja — Muse yang urus repo, screenshot akhir, bundle, dan submit.
- Jangan hapus atau ringkas pesan sesi selama bekerja (sesi ini harus terekam untuk transcript bundle).

## Cara menang
Juri AI membandingkan dua dashboard sekaligus dan memilih yang lebih baik. Yang dinilai: papan yang benar-benar bisa dipakai pembaca, ranking dan implied value yang masuk akal dan dijelaskan, farm plan yang konkret dan jujur, detail view tiap protokol, filter yang berfungsi, dan kerapian tampilan.
