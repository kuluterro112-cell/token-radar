// Token Radar — model penilaian implied value (TypeScript, Node 22, stdlib saja)
// Rumus:
//   implied = TVL x rasio_kategori x f(growth7d) x f(chains) x f(umur) x f(keyakinan)
// Semua faktor di-clamp dan dikembalikan sebagai breakdown per protokol.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface Protocol {
  slug: string;
  name: string;
  category: string;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}
export interface Snapshot {
  protocols: Protocol[];
  watchlist: Protocol[];
  floor_usd: number;
}
export type Confidence = "tinggi" | "sedang" | "rendah";
export interface Range { low: number; mid: number; high: number }
export interface Factor { input: string; value: number; note: string }
export interface Breakdown {
  tvl_usd: number;
  category_ratio: number;
  category_samples: number;
  factors: { growth: Factor; chains: Factor; age: Factor; confidence: Factor };
  range_mult: { low: number; high: number };
  formula: string;
}
export interface FarmPlan { label: string; steps: string[] }
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  tier: "watchlist" | "di bawah floor";
  implied: Range;
  implied_usd: number;
  confidence: Confidence;
  confidence_reasons: string[];
  breakdown: Breakdown;
  farm_plan: FarmPlan;
}
export interface Board {
  snapshot_date: string;
  floor_usd: number;
  global_ratio: number;
  category_ratios: { category: string; samples: number; ratio: number }[];
  method: string;
  rows: BoardRow[];
}

const SNAPSHOT_DATE = Date.UTC(2026, 10, 14);
const DEFAULT_FLOOR = 50_000_000;
const FARM_LABEL = "Spekulatif, tidak ada bukti airdrop";
const SHRINK_K = 4; // bobot prior global untuk kategori dengan sampel sedikit

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  let d: Date;
  if (typeof v === "number") d = new Date(v < 1e11 ? v * 1000 : v);
  else d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function toChains(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function normalize(raw: any): Protocol {
  return {
    slug: String(raw.slug ?? raw.name ?? "").trim(),
    name: String(raw.name ?? raw.slug ?? "").trim(),
    category: toStr(raw.category) ?? "Lainnya",
    chains: toChains(raw.chains),
    tvl_usd: toNum(raw.tvl_usd) ?? 0,
    change_7d: toNum(raw.change_7d),
    mcap_usd: toNum(raw.mcap_usd),
    listed_at: toDate(raw.listed_at),
    gecko_id: toStr(raw.gecko_id),
    symbol: toStr(raw.symbol),
  };
}

/** Baca snapshot dari path file, string JSON, atau objek. */
export function readSnapshot(input: string | object): Snapshot {
  let obj: any;
  if (typeof input === "string") {
    const t = input.trim();
    obj = t.startsWith("{") || t.startsWith("[") ? JSON.parse(t) : JSON.parse(readFileSync(input, "utf8"));
  } else obj = input;
  const rawList: any[] = Array.isArray(obj) ? obj : obj.protocols ?? [];
  const protocols = rawList.map(normalize);
  const bySlug = new Map(protocols.map((p) => [p.slug, p]));
  const floor = toNum(obj.floor_usd) ?? DEFAULT_FLOOR;
  let watchlist: Protocol[];
  if (Array.isArray(obj.watchlist)) {
    watchlist = obj.watchlist
      .map((w: any) => {
        const slug = typeof w === "string" ? w : String(w.slug ?? "");
        return bySlug.get(slug) ?? (typeof w === "object" ? normalize(w) : null);
      })
      .filter((p: Protocol | null): p is Protocol => p !== null);
  } else {
    watchlist = protocols.filter((p) => passesFilter(p) && p.tvl_usd >= floor);
  }
  return { protocols, watchlist, floor_usd: floor };
}

export function hasToken(p: Protocol): boolean {
  return p.gecko_id !== null || p.symbol !== null;
}
function isVersion(name: string): boolean {
  // Pola yang sama dengan definisi watchlist: spasi + V2/v2/2.0/dst. di akhir nama.
  return /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/.test(name.trim());
}
/** Kategori yang dikeluarkan dari watchlist (bridge / staking / CEX dan turunannya). */
function isExcludedCategory(category: string): boolean {
  const c = category.trim().toLowerCase();
  return (
    c.includes("bridge") ||
    c.includes("liquid staking") ||
    c.includes("liquid restaking") ||
    c.includes("restaked") ||
    c === "cex"
  );
}
const EXCHANGE_PREFIX = /^(binance|coinbase|bybit|kraken|bitget|okx|bitfinex|gemini)\b/i;
/** Filter yang sama dengan watchlist (tanpa batas TVL). */
export function passesFilter(p: Protocol): boolean {
  if (hasToken(p)) return false;
  if (isVersion(p.name)) return false;
  if (isExcludedCategory(p.category)) return false;
  if (/wrapped|staked|staking/i.test(p.name)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

function median(sorted: number[]): number {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

interface CatStat { samples: number; ratio: number; lowM: number; highM: number }
interface Stats { global: number; byCat: Map<string, CatStat> }

function buildStats(protocols: Protocol[]): Stats {
  const groups = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of protocols) {
    if (!hasToken(p) || !p.mcap_usd || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const r = p.mcap_usd / p.tvl_usd;
    all.push(r);
    const k = p.category.trim().toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  all.sort((a, b) => a - b);
  const global = clamp(all.length ? median(all) : 0.5, 0.05, 4);
  const byCat = new Map<string, CatStat>();
  for (const [k, arr] of groups) {
    arr.sort((a, b) => a - b);
    const n = arr.length, med = median(arr);
    const ratio = clamp((n * med + SHRINK_K * global) / (n + SHRINK_K), 0.05, 4);
    const lowM = n >= 4 && med > 0 ? clamp(quantile(arr, 0.25) / med, 0.4, 0.85) : 0.5;
    const highM = n >= 4 && med > 0 ? clamp(quantile(arr, 0.75) / med, 1.25, 2.6) : 2.0;
    byCat.set(k, { samples: n, ratio, lowM, highM });
  }
  return { global, byCat };
}

function catStat(stats: Stats, category: string): CatStat {
  return (
    stats.byCat.get(category.trim().toLowerCase()) ?? { samples: 0, ratio: stats.global, lowM: 0.5, highM: 2.0 }
  );
}

function assess(p: Protocol, cs: CatStat): { level: Confidence; reasons: string[] } {
  let pts = 0;
  const reasons: string[] = [];
  if (cs.samples >= 8) { pts += 2; reasons.push(`Acuan kategori kuat (${cs.samples} protokol bertoken)`); }
  else if (cs.samples >= 3) { pts += 1; reasons.push(`Acuan kategori terbatas (${cs.samples} protokol bertoken)`); }
  else reasons.push("Acuan kategori hampir tidak ada, memakai rasio global");
  if (p.change_7d !== null) { pts += 1; reasons.push("Data pertumbuhan 7 hari tersedia"); }
  else reasons.push("Data pertumbuhan 7 hari kosong");
  if (p.listed_at) { pts += 1; reasons.push("Tanggal listing tersedia"); }
  else reasons.push("Tanggal listing kosong");
  if (p.tvl_usd >= 100_000_000) { pts += 1; reasons.push("TVL di atas $100 jt"); }
  const level: Confidence = pts >= 4 ? "tinggi" : pts >= 2 ? "sedang" : "rendah";
  return { level, reasons };
}

function farmPlan(p: Protocol): FarmPlan {
  const chain = p.chains[0] ?? "chain utama";
  const c = p.category.toLowerCase();
  const n = p.name;
  let steps: string[];
  if (/risk|curator/.test(c)) {
    steps = [
      `Buka aplikasi ${n} dan lihat vault yang dikurasi di ${chain}.`,
      "Deposit stablecoin dalam jumlah kecil ke satu vault konservatif, simpan beberapa minggu.",
      "Tambah satu vault dengan strategi atau kurator berbeda agar aktivitasnya beragam.",
      "Catat tanggal dan jumlah setiap deposit.",
    ];
  } else if (/allocator|yield|vault|farm|aggregat|strategy/.test(c)) {
    steps = [
      `Hubungkan dompet ke ${n} di ${chain} dan baca risiko tiap vault.`,
      "Deposit aset yang didukung ke satu vault utama dan biarkan aktif, bukan masuk lalu keluar cepat.",
      "Coba satu kali penarikan kecil untuk memastikan alurnya berjalan.",
      "Catat tanggal dan jumlah setiap deposit.",
    ];
  } else if (/dex|amm|swap/.test(c)) {
    steps = [
      `Lakukan beberapa swap bernilai kecil di ${n} (${chain}) pada hari yang berbeda.`,
      "Sediakan likuiditas kecil di satu pool yang volumenya jelas, lalu tarik kembali setelah beberapa minggu.",
      "Perhatikan impermanent loss dan biaya gas sebelum menambah ukuran.",
    ];
  } else if (/lend|borrow|money market/.test(c)) {
    steps = [
      `Supply aset ke pasar ${n} di ${chain}.`,
      "Pinjam sebagian kecil dengan LTV rendah, lalu lunasi. Jangan mendekati batas likuidasi.",
      "Pertahankan posisi beberapa minggu agar aktivitasnya terlihat konsisten.",
    ];
  } else if (/cdp|stable|algo/.test(c)) {
    steps = [
      `Setor agunan yang didukung ${n} dan cetak stablecoin dalam jumlah kecil, jauh dari batas likuidasi.`,
      "Simpan stablecoin hasil cetakan di modul tabungan atau pool resmi jika ada.",
      "Cek risiko depeg dan rasio agunan secara berkala.",
    ];
  } else if (/restak/.test(c)) {
    steps = [
      `Deposit aset yang didukung ke ${n} di ${chain} dengan nominal kecil.`,
      "Delegasikan atau restake ke satu operator, lalu baca masa tunggu penarikan.",
      "Catat tanggal dan jumlah setiap deposit.",
    ];
  } else if (/deriv|perp|option|futures|prediction/.test(c)) {
    steps = [
      `Setor margin kecil ke ${n} di ${chain}.`,
      "Buka dan tutup beberapa posisi berukuran kecil dengan leverage rendah di hari berbeda.",
      "Hindari volume semu: biaya dan risiko likuidasi nyata.",
    ];
  } else if (/rwa|treasury|real|tokeni[sz]ed|credit/.test(c)) {
    steps = [
      `Cek persyaratan akses (KYC, wilayah, minimum) di ${n} sebelum menyetor.`,
      "Jika memenuhi syarat, deposit nominal kecil ke satu produk dan baca dokumen risikonya.",
      "Catat tanggal dan jumlah setiap deposit.",
    ];
  } else {
    steps = [
      `Pelajari produk ${n} dan pakai fitur intinya di ${chain} dengan nominal kecil.`,
      "Pakai produk itu beberapa kali di hari berbeda, bukan satu kali lalu berhenti.",
      "Catat tanggal dan jumlah setiap aktivitas.",
    ];
  }
  steps.push(
    "Pakai dana yang siap hilang. Poin atau aktivitas bukan janji token, dan tidak ada bukti airdrop untuk protokol ini."
  );
  return { label: FARM_LABEL, steps };
}

function ageYears(p: Protocol): number | null {
  if (!p.listed_at) return null;
  const t = Date.parse(p.listed_at);
  if (isNaN(t)) return null;
  return Math.max(0, (SNAPSHOT_DATE - t) / (365.25 * 86_400_000));
}

function scoreOne(p: Protocol, stats: Stats, inWatchlist: boolean): Omit<BoardRow, "rank"> {
  const cs = catStat(stats, p.category);
  const g = p.change_7d;
  const growth: Factor = {
    input: g === null ? "n/a" : `${g >= 0 ? "+" : ""}${g.toFixed(1)}% (7 hari)`,
    value: g === null ? 1 : clamp(1 + g / 200, 0.85, 1.25),
    note: "1 + g/200, dibatasi 0,85 sampai 1,25",
  };
  const nCh = Math.max(1, p.chains.length);
  const chains: Factor = {
    input: `${p.chains.length} chain`,
    value: clamp(1 + 0.05 * Math.log2(nCh), 1, 1.2),
    note: "1 + 0,05 x log2(jumlah chain), dibatasi 1,0 sampai 1,2",
  };
  const yrs = ageYears(p);
  const age: Factor = {
    input: yrs === null ? "listing n/a" : `${yrs.toFixed(1)} tahun`,
    value: yrs === null ? 0.95 : clamp(0.9 + 0.125 * Math.min(yrs, 2), 0.9, 1.15),
    note: yrs === null ? "tanpa tanggal listing dipakai 0,95" : "0,9 + 0,125 x umur (maks 2 tahun), batas 0,9 sampai 1,15",
  };
  const conf = assess(p, cs);
  const confF: Factor = {
    input: conf.level,
    value: conf.level === "tinggi" ? 1 : conf.level === "sedang" ? 0.92 : 0.8,
    note: "potongan untuk data tipis: tinggi 1,00, sedang 0,92, rendah 0,80",
  };
  const mid = p.tvl_usd * cs.ratio * growth.value * chains.value * age.value * confF.value;
  const wide = conf.level === "tinggi" ? 1 : conf.level === "sedang" ? 1.15 : 1.35;
  const lowMult = cs.lowM / wide;
  const highMult = cs.highM * wide;
  const implied: Range = {
    low: Math.round(mid * lowMult),
    mid: Math.round(mid),
    high: Math.round(mid * highMult),
  };
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    chains: p.chains,
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    listed_at: p.listed_at,
    tier: inWatchlist ? "watchlist" : "di bawah floor",
    implied,
    implied_usd: implied.mid,
    confidence: conf.level,
    confidence_reasons: conf.reasons,
    breakdown: {
      tvl_usd: p.tvl_usd,
      category_ratio: cs.ratio,
      category_samples: cs.samples,
      factors: { growth, chains, age, confidence: confF },
      range_mult: { low: lowMult, high: highMult },
      formula: "implied = TVL x rasio_kategori x f(growth) x f(chains) x f(umur) x f(keyakinan)",
    },
    farm_plan: farmPlan(p),
  };
}

export function buildBoard(snapshot: Snapshot, opts: { minRows?: number } = {}): Board {
  const minRows = opts.minRows ?? 100;
  const stats = buildStats(snapshot.protocols);
  const wlSlugs = new Set(snapshot.watchlist.map((p) => p.slug));
  const chosen: { p: Protocol; wl: boolean }[] = snapshot.watchlist.map((p) => ({ p, wl: true }));

  const need = Math.max(0, minRows - chosen.length);
  const extras = snapshot.protocols
    .filter((p) => !wlSlugs.has(p.slug) && passesFilter(p) && p.tvl_usd > 0)
    .map((p) => ({
      p,
      s: Math.log10(p.tvl_usd) + clamp(p.change_7d ?? 0, -20, 60) / 30,
    }))
    .sort((a, b) => b.s - a.s || b.p.tvl_usd - a.p.tvl_usd)
    .slice(0, need);
  for (const e of extras) chosen.push({ p: e.p, wl: e.p.tvl_usd >= snapshot.floor_usd });

  // Tier "watchlist" hanya untuk slug yang memang ada di snapshot watchlist;
  // protokol tambahan di bawah floor tetap "di bawah floor" walau TVL-nya ≥ floor.
  const scored = chosen.map((c) => scoreOne(c.p, stats, wlSlugs.has(c.p.slug)));
  scored.sort((a, b) => b.implied.mid - a.implied.mid || b.tvl_usd - a.tvl_usd);
  const rows: BoardRow[] = scored.map((r, i) => ({ rank: i + 1, ...r }));

  return {
    snapshot_date: "2026-11-14",
    floor_usd: snapshot.floor_usd,
    global_ratio: stats.global,
    category_ratios: [...stats.byCat.entries()]
      .map(([category, s]) => ({ category, samples: s.samples, ratio: s.ratio }))
      .sort((a, b) => b.samples - a.samples),
    method:
      "Rasio acuan = median mcap/TVL per kategori dari protokol bertoken, digeser ke median global bila sampel sedikit. Faktor growth, chain, umur, dan keyakinan di-clamp. Ranking menurut implied value tengah, lalu TVL.",
    rows,
  };
}

// CLI: node lib/model.ts snapshot.json > board.json
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const file = process.argv[2];
  if (!file) {
    console.error("pemakaian: node lib/model.ts <snapshot.json>");
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(buildBoard(readSnapshot(file))));
}
