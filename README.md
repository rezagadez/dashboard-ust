# Dashboard UST Auction, Yield, DXY & Makro

Dashboard mobile-responsive (Next.js 14 App Router + TypeScript + Tailwind) yang menampilkan:

- **A. Hasil Lelang UST** — tabel historis auction Treasury (Treasury Fiscal Data API)
- **B. Yield Pasar Sekunder** — chart yield harian per tenor (FRED, seri `DGS*`)
- **C. Fed Broad Dollar Index** — chart proxy DXY (FRED, `DTWEXBGS`)
- **D. 10 Indikator Makro Utama** — CPI, Core CPI, PCE, Core PCE, Fed Funds Rate, NFP, Unemployment, Real GDP, Industrial Production (proxy ISM PMI), Retail Sales
- **E. Kalender Rilis Data** — jadwal auction, rilis data makro, dan FOMC untuk Hari Ini/Minggu Ini/Minggu Depan

Spesifikasi lengkap ada di [`spesifikasi_dashboard_ust.md`](./spesifikasi_dashboard_ust.md).

**Live:** https://dashboard-ust.vercel.app

## Arsitektur

Browser tidak pernah memanggil FRED/Treasury langsung — semua lewat API routes Next.js (`/app/api/*`) sebagai proxy + cache (`fetch` dengan `next.revalidate`, tanpa database/Redis terpisah):

| Route | Sumber | Cache |
|---|---|---|
| `/api/auctions` | Treasury `auctions_query` | 10 menit |
| `/api/yields` | FRED `series/observations` | 10 menit |
| `/api/dxy` | FRED `DTWEXBGS` | 10 menit |
| `/api/macro` | FRED, 10 series sekaligus | 30 menit |
| `/api/calendar` | Treasury `upcoming_auctions` + FRED `release/dates` + jadwal FOMC (hardcoded) | 1 jam |

Helper fetch ke masing-masing sumber ada di `lib/fred.ts` dan `lib/treasury.ts`.

## Menjalankan Lokal

```bash
npm install
cp .env.local.example .env.local   # isi FRED_API_KEY (daftar gratis di fred.stlouisfed.org)
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Deploy

Repo ini sudah terhubung ke Vercel — setiap push ke `master` otomatis ter-deploy. `FRED_API_KEY` sudah diset di Vercel Project Settings → Environment Variables (Production, Preview, Development). Treasury Fiscal Data API tidak butuh API key.
