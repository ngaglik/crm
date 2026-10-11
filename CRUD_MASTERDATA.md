# 📋 CRUD CRM - Pengelolaan Komplain

## Overview

Modul **Pengelolaan Komplain** menangani tiket komplain pelanggan secara lengkap: pencatatan, penanganan (PIC + SLA), penyelesaian, hingga penolakan.

## Alur Status Komplain

```
baru ──► diproses ──► selesai
  │         │
  │         └──► ditolak
  └──► selesai (langsung via tombol "✓ Selesaikan Komplain")
```

- **baru**: Komplain baru dicatat oleh admin/CS (default)
- **diproses**: PIC ditugaskan, penanganan berjalan
- **selesai**: Komplain selesai (locked, tidak bisa diedit/dihapus)
- **ditolak**: Komplain ditolak (locked, tidak bisa diedit/dihapus)

## Prioritas

- `rendah` (default) / `sedang` (info) / `tinggi` (warning) / `kritis` (error)

## Kategori

`layanan` · `produk` · `pengiriman` · `pembayaran` · `lainnya`

## File Structure

```
src/
├── services/
│   └── apiClient.ts               # API wrapper (auth header + refresh token)
│
├── container/admin/
│   ├── ComplaintManager.vue       # Pengelolaan Komplain (list + form + detail)
│   └── ComplaintManager.ts        # Logic Pengelolaan Komplain
│
├── container/dashboard/
│   ├── Dashboard.vue              # Ringkasan komplain
│   └── Dashboard.ts               # Logic Dashboard
│
├── router/
│   └── router.ts                  # Routes: /dashboard, /complaints
│
└── constant/
    └── constant.ts                # Menu: Dashboard, Pengelolaan Komplain
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/crm/complaints` | List komplain (paginasi + filter status/kategori/prioritas/tanggal + search) |
| GET | `/api/crm/complaints/:id` | Detail komplain |
| POST | `/api/crm/complaints` | Catat komplain baru |
| PUT | `/api/crm/complaints/:id` | Update komplain |
| DELETE | `/api/crm/complaints/:id` | Hapus komplain |
| POST | `/api/crm/complaints/:id/selesai` | Tandai komplain selesai (`{ updatedBy }`) |
| GET | `/api/crm/dashboard-summary?year=YYYY` | Ringkasan dashboard komplain |
| GET | `/api/option/employee?q=` | Pencarian pegawai (PIC) |

## Form Fields (ComplaintManager)

### Tab 1: Informasi Umum
- `noTiket` (auto dari backend, read-only)
- `tanggal` (date, default hari ini)
- `kategori` (select)
- `prioritas` (select)
- `status` (tag)

### Tab 2: Detail Komplain
- `namaPelanggan` (text, required)
- `perusahaan` (text)
- `telepon` (text)
- `email` (text)
- `subjek` (text, required)
- `deskripsi` (textarea)

### Tab 3: Penanganan
- `picId` (select pegawai - pencarian)
- `targetSelesai` (date, SLA)
- `status` (select: baru/diproses/selesai/ditolak)

### Tab 4: Solusi & Catatan
- `solusi` (textarea)
- `catatan` (textarea)

Payload juga mengirim `createdBy` dan `updatedBy` dari user yang login.

## Fitur Tambahan

- **SLA tracking** di kolom "Target Selesai": sisa hari, "Hari ini", atau **"Terlambat N hari"** (merah)
- **Detail modal read-only** dengan tombol "✓ Selesaikan Komplain" (hanya untuk status baru/diproses)
- Edit/Hapus terkunci saat status `selesai` atau `ditolak`
- Pencarian teks (no. tiket / pelanggan / subjek) + filter status, kategori, prioritas, tanggal
- Pagination (15 items per page)

## Backend Requirements

Response list:

```json
{
  "data": [
    {
      "id": 1,
      "noTiket": "CMP-2026-0001",
      "tanggal": "2026-08-03",
      "namaPelanggan": "PT Maju Bersama",
      "kategori": "layanan",
      "prioritas": "tinggi",
      "subjek": "Layanan lambat",
      "picId": 5,
      "picName": "Budi",
      "targetSelesai": "2026-08-05",
      "status": "diproses",
      "solusi": "",
      "catatan": ""
    }
  ],
  "page": 1,
  "total": 10
}
```

Response dashboard:

```json
{
  "data": {
    "totalComplaints": 120,
    "thisMonthComplaints": 10,
    "thisYearComplaints": 45,
    "statusSummary": { "baru": 30, "diproses": 8, "selesai": 5, "ditolak": 2 },
    "monthlyComplaints": [ { "month": 1, "count": 12 } ],
    "resolutionRates": [ { "label": "Budi", "resolved": 4, "total": 10, "rate": 40 } ],
    "kategoriStats": [ { "kategori": "layanan", "count": 10, "totalSelesai": 4, "terlambat": 2 } ]
  }
}
```

## Next Steps

1. **Backend Implementation:**
   - Implement REST API endpoints `/api/crm/complaints`
   - Database migrations (tabel complaints, generator no. tiket)
   - Validation & error handling

2. **Frontend Enhancements:**
   - Notifikasi/reminder SLA otomatis
   - Export laporan (CSV/Excel)
   - Timeline aktivitas per komplain
   - Lampiran (foto/bukti) pada komplain

## File References

- `src/container/admin/ComplaintManager.vue` - UI Pengelolaan Komplain
- `src/container/admin/ComplaintManager.ts` - Logic Pengelolaan Komplain
- `src/container/dashboard/Dashboard.vue` - Dashboard UI
- `src/container/dashboard/Dashboard.ts` - Dashboard logic
- `src/services/apiClient.ts` - API wrapper
- `src/router/router.ts` - Routes
- `src/constant/constant.ts` - Menu items

---

**Status: ✅ READY TO USE**

Modul pengelolaan komplain sudah siap digunakan. Tinggal implementasi backend endpoints `/api/crm/complaints`.
