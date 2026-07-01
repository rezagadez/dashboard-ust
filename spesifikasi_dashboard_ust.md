# Spesifikasi Teknis — Dashboard UST Auction, Yield, DXY & Makro (Android Web)

Versi: 1.1 · Untuk dieksekusi via Claude Code

---

## 1. Ringkasan Proyek

Website mobile-responsive (dibuka via browser Android, tanpa install app) yang menampilkan 4 blok informasi:

| # | Konten | Format tampilan | Sumber data |
|---|---|---|---|
| A | US Treasury auction results (historical, YTD) | Matrix table (rows = per auction) + form range tanggal | Treasury Fiscal Data API |
| B | Daily secondary market yield untuk seri yang sama dengan A | Line chart historis | FRED |
| C | Daily DXY (proxy: Fed Broad Dollar Index) | Line chart historis | FRED |
| D | 10 indikator makro ekonomi utama US | Matrix table (rows = per rilis data) + form range tanggal | FRED |
| E | Kalender rilis data (hari ini, minggu ini, minggu depan) untuk item A & D | List/tabel kalender | FRED + Treasury |

**Urutan halaman (asumsi, silakan koreksi):** Tabel Auction (A) → Chart Yield terkait (B) → Chart DXY (C) → Tabel Makro (D) → Kalender Rilis (E), dalam satu halaman scroll (bukan multi-page), karena permintaan awal adalah "chart di bawah tabel-tabel".

### Keputusan: Push Notification — DITUNDA (tidak masuk v1)

Kamu memberi opsi: kalau menambah kerumitan/waktu, boleh di-skip. Assessment saya: **push notification menambah kerumitan yang cukup signifikan**, karena butuh 3 komponen infra baru yang tidak dibutuhkan dashboard biasa:
1. **Service worker + subscription capture** di browser Android (minta izin notifikasi user)
2. **Database persisten** untuk menyimpan push subscription (Vercel/Next.js API routes itu serverless & stateless, jadi butuh Vercel KV/Upstash Redis atau semacamnya — bukan cuma file biasa)
3. **Scheduled job (cron)** yang rutin cek "ada data baru atau belum" lalu trigger kirim notifikasi

Ini adalah fitur terpisah dengan infra sendiri, bukan sekadar tambahan komponen UI. Karena itu, **push notification TIDAK dibuat di v1** — sebagai gantinya, Bagian E (Kalender Rilis) di bawah ini memberikan hampir semua manfaat yang sama (kamu tahu kapan data baru akan rilis) tanpa infra tambahan, karena cukup dibaca saat buka web-nya. Push notification bisa jadi fitur v2 kalau nanti dashboard-nya sudah stabil dan kamu masih mau.

---

## 2. Tech Stack

- **Frontend + Backend:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS (mobile-first, responsive)
- **Chart:** Recharts (ringan, cocok untuk mobile)
- **Deploy:** Vercel (auto-deploy dari GitHub, serverless API routes built-in)
- **Data fetching:** Next.js API routes sebagai backend proxy + cache — browser Android tidak pernah memanggil FRED/Treasury langsung

## 3. Environment Variables

Hanya satu key yang dibutuhkan:

```
FRED_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Disimpan di `.env.local` (lokal) dan di Vercel → Settings → Environment Variables (production). Treasury Fiscal Data API tidak butuh key sama sekali.

---

## 4. BAGIAN A — Auction Results (Tabel)

**Endpoint sumber:** `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query`
(tanpa API key, format: `?fields=...&filter=auction_date:gte:2026-01-01&sort=-auction_date`)

### Kolom tabel (rencana)

| Kolom tampilan | Field API (perkiraan — akan diverifikasi saat coding) | Catatan |
|---|---|---|
| Tanggal Lelang | `auction_date` | |
| Jenis & Tenor | `security_type`, `security_term` | mis. "Note 10-Year" |
| CUSIP | `cusip` | identifier unik seri |
| Nominal Ditawarkan | `offering_amt` | |
| Nominal Bid (Tendered) | `total_tendered` | total semua bid masuk |
| Nominal Bid Awarded | `total_accepted` | total yang dimenangkan |
| Bid-to-Cover Ratio | `bid_to_cover_ratio` | |
| High Yield Awarded | `high_yield` | |
| WAY (Weighted Avg Yield) Awarded | `avg_med_yield` (perlu verifikasi nama field persis) | ini yang **tersedia publik** |
| Tail (bps) | dihitung: `high_yield − avg_med_yield` | Treasury umumnya tidak publish tail langsung |

### Dikeluarkan dari scope

**"WAY incoming bid"** dan **"range yield lowest–highest (incoming bid)"** dikeluarkan dari spesifikasi ini karena Treasury tidak mempublikasikan statistik dari sisi bid yang MASUK (incoming/submitted) — yang dirilis publik hanya statistik dari bid yang DIMENANGKAN (awarded), sudah tercakup di tabel kolom di atas (High Yield Awarded, WAY Awarded, Tail). Tabel final hanya berisi 10 kolom di atas.

### Form filter
- Date range picker (start date, end date) — default: Year-to-date (1 Jan tahun berjalan → hari ini)
- Dropdown opsional: filter by security type (Bill/Note/Bond/TIPS/FRN) — semua by default

---

## 5. BAGIAN B — Secondary Market Yield (Chart)

**Sumber:** FRED, series Constant Maturity Treasury (DGS*)

### Mapping tenor auction → seri FRED

| Tenor yang di-auction | FRED series ID | Catatan |
|---|---|---|
| 4-week Bill | `DGS1MO` | proxy terdekat |
| 8-week Bill | `DGS1MO` / `DGS3MO` | proxy terdekat |
| 13-week (3-month) Bill | `DGS3MO` | |
| 17-week (4-month) Bill | `DGS4MO` | perlu verifikasi ketersediaan series ini |
| 26-week (6-month) Bill | `DGS6MO` | |
| 52-week (1-year) Bill | `DGS1` | |
| 2-Year Note | `DGS2` | |
| 3-Year Note | `DGS3` | |
| 5-Year Note | `DGS5` | |
| 7-Year Note | `DGS7` | |
| 10-Year Note | `DGS10` | |
| 20-Year Bond | `DGS20` | |
| 30-Year Bond | `DGS30` | |

**Catatan penting:** Ini adalah yield par constant-maturity resmi The Fed, **bukan** yield sekunder CUSIP-spesifik dari seri yang persis di-auction (data CUSIP-level itu ada di vendor obligasi berbayar). Untuk kebutuhan dashboard historikal ini, DGS* cukup representatif dan gratis.

### UI
- Line chart, sumbu X = tanggal, sumbu Y = yield (%)
- Dropdown multi-select tenor (default: tenor yang paling baru di-auction di tabel A)
- Rentang tanggal mengikuti form yang sama dengan tabel A (atau form terpisah — TBD saat build)

---

## 6. BAGIAN C — DXY Proxy (Chart)

**Sumber:** FRED, series `DTWEXBGS` — Nominal Broad U.S. Dollar Index

- Line chart historis, sama seperti B
- Label jelas di UI: **"Fed Broad Dollar Index (proxy DXY)"** — supaya user tahu ini bukan ticker ICE DXY asli
- Data harian (business days)

---

## 7. BAGIAN D — 10 Indikator Makro Utama (Tabel)

| # | Indikator | FRED Series ID | Frekuensi | Catatan |
|---|---|---|---|---|
| 1 | CPI (headline inflation) | `CPIAUCSL` | Bulanan | |
| 2 | Core CPI (ex food & energy) | `CPILFESL` | Bulanan | |
| 3 | PCE Price Index | `PCEPI` | Bulanan | |
| 4 | Core PCE (ukuran favorit The Fed) | `PCEPILFE` | Bulanan | |
| 5 | Fed Funds Rate (effective) | `FEDFUNDS` | Bulanan | |
| 6 | Nonfarm Payrolls (NFP) | `PAYEMS` | Bulanan | |
| 7 | Unemployment Rate | `UNRATE` | Bulanan | |
| 8 | Real GDP | `GDPC1` | Kuartalan | |
| 9 | ISM Manufacturing PMI | *perlu verifikasi* | Bulanan | ⚠️ ISM data sempat ditarik dari FRED karena lisensi — kalau tidak tersedia, akan diganti `INDPRO` (Industrial Production Index) |
| 10 | Retail Sales | `RSAFS` | Bulanan | |

Kalau ada indikator yang menurutmu lebih penting untuk ditukar (misal Housing Starts, ISM Services, atau Consumer Confidence), tinggal bilang — daftar ini masih bisa disesuaikan sebelum coding dimulai.

**Catatan soal Fed Funds Rate:** ini sudah masuk sebagai indikator #5 sejak spesifikasi awal, jadi tidak ada tambahan indikator baru — total tetap 10. Yang membedakan Fed Funds Rate dari 9 indikator lain: nilainya berubah lewat **keputusan FOMC** (8x/tahun, tanggal fixed), bukan rilis data bulanan biasa. Di Bagian E (Kalender) di bawah, event "FOMC Meeting / Rate Decision" akan ditampilkan sebagai entry terpisah dari data macro-nya sendiri.

### UI
- Tabel: rows = tanggal rilis data, columns = 10 indikator (atau 1 tabel per indikator — TBD, akan didiskusikan dengan Claude Code saat build karena beda indikator beda frekuensi rilis)
- Form date range sama seperti bagian A

---

## 8. BAGIAN E — Kalender Rilis Data (Hari Ini, Minggu Ini, Minggu Depan)

Menjawab kebutuhan "list news today dan minggu yang bersangkutan dan 1 minggu ke depan" untuk item A (auction) dan D (macro low-frequency).

### Sumber data

| Konten kalender | Sumber | Endpoint |
|---|---|---|
| Jadwal lelang UST minggu ini/depan | Treasury Fiscal Data — dataset "Treasury Securities Upcoming Auctions" | `.../v1/accounting/od/upcoming_auctions` |
| Jadwal rilis 9 indikator makro (CPI, Core CPI, PCE, Core PCE, NFP, Unemployment, GDP, ISM/INDPRO, Retail Sales) | FRED Release Calendar | `fred/releases/dates?release_id=...` per indikator |
| Jadwal FOMC Meeting / Rate Decision | FRED Release Calendar (release "FOMC Meeting") atau federalreserve.gov | perlu verifikasi release_id yang tepat di FRED |

### UI
- List sederhana (bukan tabel matrix), dikelompokkan 3 bagian: **Hari Ini** / **Minggu Ini** / **Minggu Depan**
- Tiap entry: tanggal, nama indikator/event, jenis (Auction / Data Release / FOMC)
- Auto-refresh mengikuti cache biasa (tidak perlu real-time)

### Yang TIDAK termasuk di bagian ini
Tidak ada push notification — ini murni tampilan pasif yang dibaca saat user membuka web-nya (lihat "Keputusan: Push Notification" di atas).

---

## 9. Desain API Routes (Backend Proxy di Next.js)

| Endpoint internal | Fungsi | Cache |
|---|---|---|
| `GET /api/auctions?start=&end=&type=` | Proxy → Treasury `auctions_query` | 10 menit |
| `GET /api/yields?series=DGS10,DGS2&start=&end=` | Proxy → FRED `series/observations` | 10 menit |
| `GET /api/dxy?start=&end=` | Proxy → FRED `DTWEXBGS` | 10 menit |
| `GET /api/macro?start=&end=` | Proxy → FRED, 10 series sekaligus | 30 menit (data makro jarang berubah intraday) |
| `GET /api/calendar` | Proxy → Treasury `upcoming_auctions` + FRED `releases/dates` | 1 jam |

Caching pakai fitur bawaan Next.js (`fetch(url, { next: { revalidate: 600 } })`) — tidak perlu database atau Redis terpisah.

---

## 10. Struktur Folder Project (rencana)

```
/app
  page.tsx                 → halaman utama (semua 5 bagian, single scroll)
  /api
    /auctions/route.ts
    /yields/route.ts
    /dxy/route.ts
    /macro/route.ts
    /calendar/route.ts
/components
  AuctionTable.tsx
  DateRangeForm.tsx
  YieldChart.tsx
  DxyChart.tsx
  MacroTable.tsx
  CalendarList.tsx
/lib
  fred.ts                  → helper fetch ke FRED
  treasury.ts               → helper fetch ke Treasury Fiscal Data
.env.local
```

---

## 11. Hal yang Akan Diverifikasi di Awal Coding

1. Nama field persis di `auctions_query` (khususnya WAY awarded dan apakah ada field tail resmi)
2. Ketersediaan `DGS4MO` di FRED
3. Ketersediaan ISM Manufacturing PMI di FRED (kalau tidak ada → ganti `INDPRO`)
4. Struktur tabel makro final (1 tabel gabungan vs per-indikator) — tergantung enak tidaknya dibaca di layar HP
5. `release_id` yang tepat di FRED untuk masing-masing 9 indikator (dibutuhkan untuk Bagian E)
6. Ketersediaan & format `release_id` FOMC Meeting di FRED — kalau tidak ada, cari alternatif (misal scrape jadwal dari federalreserve.gov, atau hardcode tanggal FOMC tahunan karena jadwalnya sudah diumumkan di awal tahun)

## 12. Langkah Selanjutnya

Spesifikasi ini siap dijadikan prompt awal untuk Claude Code. Alur kerjanya:
1. Scaffold project Next.js + Tailwind
2. Setup `.env.local` + `.gitignore`
3. Build `/lib/fred.ts` dan `/lib/treasury.ts` (fetch helper)
4. Build API routes satu per satu, test dengan data asli
5. Build komponen UI (tabel & chart)
6. Push ke GitHub → deploy ke Vercel

---

*Dokumen ini adalah living spec — update kalau ada perubahan keputusan selama proses build.*
