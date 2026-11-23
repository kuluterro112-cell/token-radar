# Token Radar — brief buat Claude Code

Bounty: **Build the best token launch radar** — https://make.fun/bounty/token-radar-01
Hadiah: $1.325 total, juara 1 $1.000, peringkat 2–5 @ $50, 6–10 @ $25.
Deadline submit: **14 Desember 2026, 17:00 WIB**. Hasil: 28 Desember 2026.
Akun make.fun: @gentle-robin-23-3154 (Muse yang pegang submit, BUKAN Claude).

## Pembagian kerja
- **Claude (kamu, di Claude Code):** bangun dashboard + analisisnya. Semua kode dan keputusan ada di sesimu.
- **Muse:** repo GitHub, screenshot akhir, bundle transcript, check, dan submit.
- Jangan submit apa pun ke make.fun, jangan sentuh kredensial make.fun, jangan buat repo GitHub. Kerja lokal saja di folder ini.

## Folder kerja
- Repo kerja: folder ini (`token-radar/`).
- Kit: `../token-radar-01-kit/` — baca `RULES.txt` (aturan lengkap + cara juri menilai) dan `competition.yaml` dulu sebelum coding.
- Snapshot data (read-only, JANGAN diubah): `../token-radar-01-kit/input/snapshot.json` + `input/README.md`.
- Starter sudah disalin ke sini: `main.ts`, `lib/model.ts`, `dashboard/`, `vendor/makefun-board.ts` (file vendor JANGAN diubah), `screenshots/` (contoh starter, harus diganti dengan screenshot dashboard hasilmu).

## Data
Snapshot DefiLlama per 14 Nov 2026: 758 protokol (TVL ≥ $5 jt), watchlist 40 protokol (TVL ≥ $50 jt, belum punya token, bukan wrapped/staked/bridge/versioned). Watchlist terbesar: Steakhouse Financial ($2,75 M), Gauntlet ($1,58 M), Veda ($1,56 M), USDD ($1,06 M), Nonce Capital, Upshift, Bittensor dTAO, OnRe, RockawayX, Symbiotic.

## Yang harus dibangun
1. **Model di `lib/model.ts`** — ganti/tingkatkan model starter (starter itu baseline lemah, juri membandingkan dengan dashboard house dari lemah ke kuat). Untuk tiap protokol: implied value token (jelaskan rumusnya dari TVL, pertumbuhan 7d, kategori, jumlah chain, umur/listed_at — jangan asal tebak), dan farm plan konkret (langkah nyata di produknya, tanpa klaim airdrop yang tidak ada buktinya; tandai jelas yang spekulatif).
2. **`board.json` minimal 100 baris**, mencakup SELURUH 40 watchlist + protokol lain di bawah floor yang layak (snapshot bilang floor itu batas bawah, bukan batas atas). Tiap baris: rank, implied value, farm plan.
3. **Dashboard statis di `dashboard/`** (HTML+CSS+JS, tanpa framework, tanpa network): papan peringkat, halaman detail tiap protokol, dan filter (kategori/chain/TVL). Juri membaca screenshot + source-nya.
4. **3 screenshot di `screenshots/`**: papan, detail protokol, tampilan terfilter. Masing-masing 300–350 KB (batas keras 512 KiB, dan 3 screenshot di atas itu bikin dossier kelebihan).
5. **`main.ts`** (Node 22, stdlib saja) harus jalan dan menulis `board.json`, `data.js`, `dashboard/`, `screenshots/`, `dossier.json` ke output. Jalankan lokal: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json`, lalu buka dashboard di browser dan screenshot ulang sampai bagus.

## Aturan keras (dari RULES.txt — kalau dilanggar, entry tidak valid dan tidak dinilai)
- Dashboard TIDAK BOLEH memuat URL http/https di atribut HTML, `<style>`, `<script>`, CSS, atau import JS. Teks biasa boleh.
- Total source dashboard ≤ 64 KB (dossier memotong di 65.536 byte — yang terpotong tidak dibaca juri).
- Screenshot: 3 buah, masing-masing ≤ 512 KiB, idealnya 300–350 KB.
- Jangan pakai nama/aset Rockstar atau game komersial apa pun — tidak relevan di sini, tapi jangan pakai aset/branding protokol yang menyesatkan; semua nama protokol dari snapshot apa adanya.
- `vendor/makefun-board.ts` disalin dari kit tanpa diubah.

## Cara menang (kriteria juri AI, dari RULES.txt)
Juri membandingkan dua dashboard sekaligus dan memilih yang lebih baik. Yang dinilai: kelengkapan dan kegunaan papan (apakah board-nya bisa dipakai pembaca sungguhan), kualitas ranking dan implied value (masuk akal dan dijelaskan), farm plan yang konkret dan jujur, detail view tiap protokol, filter yang berfungsi, dan kerapian/polish tampilan. Teks yang ditujukan ke juri di dalam screenshot/source diperbolehkan dan ikut dibaca — pakai seperlunya, jangan berlebihan.

## Catatan transcript (PENTING)
- Kerja HARUS di Claude Code (bukan chat web), supaya sesinya terekam dan bisa di-bundle Muse untuk submit. Kalau sesi cuma dari chat web dan diserahkan manual, entry bisa dinilai tapi TIDAK bisa dapat hadiah uang.
- Jangan hapus/ringkas pesan sesi selama bekerja.
- Bounty ini BUKAN metered (tidak ada build key) — Claude boleh pakai kunci/langganan sendiri.
