# Prompt buat Claude Web — Dashboard Token Radar

Salin prompt di bawah ini apa adanya, tempel di chat Claude web.

---

Buatkan kode dashboard untuk bounty make.fun **"Build the best token launch radar"** (https://make.fun/bounty/token-radar-01). Hadiah $1.325, juara 1 $1.000. Kamu hanya menulis kodenya — Muse yang akan menjalankan, menguji, screenshot, dan submit. Jangan tanya apa pun, langsung tulis semua file sampai selesai.

## Tugas
Dari data DefiLlama, cari protokol yang belum punya token tapi besar dan layak meluncurkan token, ranking berdasarkan perkiraan nilai tokennya, dan tampilkan dalam dashboard web yang bisa dipakai pembaca sungguhan.

## Data (snapshot DefiLlama per 14 Nov 2026)
Ada 758 protokol, tiap protokol punya 10 field ini saja:
- `slug` (unik), `name`, `category` (mis. Dexs, Lending, Risk Curators, CDP), `chains` (mis. Ethereum, Solana, Base), `tvl_usd` (angka, USD), `change_7d` (persen, bisa null), `mcap_usd` (null kalau belum punya token), `listed_at` (tanggal, bisa null), `gecko_id` (null kalau belum punya token), `symbol` (null kalau belum punya token).

Watchlist = 40 protokol yang TVL ≥ $50 jt, belum punya token (`gecko_id` dan `symbol` null), bukan versi (nama tidak berakhiran V2/v2/2.0), bukan wrapped/staked/bridge (bukan kategori Bridge, Liquid Staking, Liquid Restaking, CEX, dan nama tidak mengandung "wrapped"/"staked"/"staking"). Yang terbesar:
Steakhouse Financial $2,75 M (Risk Curators), Gauntlet $1,58 M (Risk Curators), Veda $1,56 M (Onchain Capital Allocator), USDD $1,06 M (CDP), Nonce Capital $514 jt, Upshift $499 jt, Bittensor dTAO $376 jt, OnRe $309 jt, RockawayX $293 jt, Symbiotic $254 jt.

## Yang harus kamu tulis (tulis isi lengkap tiap file, satu per satu)
1. **`lib/model.ts`** — model penilaian (TypeScript, Node 22, stdlib saja). Ganti model starter yang lemah ini dengan model yang transparan:
   - Implied value: jangkar dari TVL, pakai rasio FDV/TVL median per kategori yang dihitung dari protokol di snapshot yang SUDAH punya token (pakai `mcap_usd / tvl_usd` dari protokol bertoken sebagai acuannya).
   - Rumus: `implied = TVL × rasio_kategori × f(growth7d) × f(chains) × f(umur)`, semua faktor di-clamp (batasi naik-turunnya) dan harus bisa ditampilkan sebagai breakdown di halaman detail.
   - Tampilkan rentang rendah/tengah/tinggi, bukan satu angka. Tambah kolom keyakinan (tinggi/sedang/rendah) supaya protokol yang datanya tipis tidak naik terlalu tinggi.
   - Ranking diurutkan berdasarkan implied value lalu TVL.
   - Fungsi-fungsi yang wajib ada: baca snapshot (array `protocols`, array `watchlist`, `floor_usd`), bangun board minimal 100 baris yang mencakup SELURUH 40 watchlist + protokol di bawah floor yang layak (pilih yang TVL-nya tinggi, tumbuh, belum punya token, dan lolos filter yang sama dengan watchlist), dan tiap baris punya rank, implied value (+ rentang), keyakinan, dan farm plan.
2. **Farm plan** tiap protokol: langkah nyata di produknya (deposit, vault, restake, dsb.) sesuai kategorinya, dengan label eksplisit "spekulatif, tidak ada bukti airdrop". Jangan pernah menyebut airdrop sebagai kepastian.
3. **`dashboard/index.html`, `dashboard/app.css`, `dashboard/app.js`** — dashboard statis (tanpa framework, tanpa network): papan peringkat, halaman detail tiap protokol (dengan breakdown implied value), dan filter (kategori / chain / TVL) yang benar-benar berfungsi. Desain rapi, modern, mudah dibaca; tampilkan rumus/model secara singkat di halaman supaya pembaca paham kenapa ranking-nya begitu.

## Aturan keras (kalau dilanggar, entry tidak valid dan tidak dinilai)
- Dashboard TIDAK BOLEH memuat `http://` atau `https://` di mana pun: atribut HTML, `<style>`, `<script>`, CSS, import JS — termasuk `xmlns` di SVG. Teks biasa boleh.
- Total source dashboard ≤ 64 KB (HTML + CSS + JS digabung).
- Jangan ubah `vendor/makefun-board.ts` (file itu dari kit, bukan bagianmu).
- Jangan pakai aset atau branding yang menyesatkan; nama protokol dari snapshot apa adanya.

## Cara menang
Juri AI membandingkan dua dashboard sekaligus dan memilih yang lebih baik. Yang dinilai: papan yang benar-benar bisa dipakai pembaca, ranking dan implied value yang masuk akal dan dijelaskan, farm plan yang konkret dan jujur, detail view tiap protokol, filter yang berfungsi, dan kerapian tampilan. Teks yang ditujukan ke juri di dalam source diperbolehkan dan ikut dibaca — pakai seperlunya, jangan berlebihan.

## Format jawabanmu
Tulis isi lengkap tiap file dalam blok kode terpisah, dengan nama file sebagai judulnya, urutannya: `lib/model.ts` dulu, lalu `dashboard/index.html`, `dashboard/app.css`, `dashboard/app.js`. Jangan cuma memberi kerangka atau potongan — tulis semuanya sampai bisa langsung dipakai.
