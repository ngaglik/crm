# CRM (Customer Relationship Management) README

## Project Setup

Ini adalah aplikasi **CRM (Customer Relationship Management)** yang dibangun dengan Vue 3, TypeScript, dan Naive UI. Sistem ini mengikuti pola arsitektur yang sama dengan project HRIS yang ada.

### Fitur Utama

- **Authentication**: Login dengan username dan password yang terintegrasi dengan backend
- **Responsive Design**: UI yang responsif untuk desktop dan mobile
- **Theme Support**: Light dan dark theme
- **Modular Architecture**: Struktur folder yang terorganisir dengan baik

### Modul CRM

- **Dashboard**: Ringkasan performa penanganan komplain (total komplain, komplain tahun ini, status selesai/diproses/baru, komplain per bulan, tingkat penyelesaian per PIC, dan statistik per kategori)
- **Input Komplain**: Pencatatan komplain baru (nama pelanggan, kategori, prioritas, subjek, deskripsi) + riwayat input terakhir. **Halaman ini juga tampil di index (`/`) tanpa login** sebagai form pengaduan publik (endpoint `/api/public/*`)
- **Penanganan Komplain**: Pengelolaan komplain — penugasan PIC, SLA target selesai, perubahan status (baru → diproses → selesai / ditolak), solusi/catatan, dan penyelesaian
- **Kirim WhatsApp**: Pengiriman pesan WhatsApp ke pelanggan (dipilih dari data komplain yang punya nomor HP), template pesan cepat, riwayat pengiriman, dan status pengiriman (terkirim/tercatat/gagal) via gateway yang dapat dikonfigurasi
- **Notifikasi PIC**: Lonceng notifikasi di header — PIC menerima notifikasi otomatis saat komplain ditugaskan, status berubah, atau komplain diselesaikan (polling 60 detik)
- **Kepuasan Pelanggan**: Dokumentasi survei kepuasan pelanggan (nama, tanggal mulai, tanggal selesai) dengan upload dokumen PDF beserta preview/download
- **Pengaturan › Master Data — Kategori Komplain**: CRUD kategori komplain (aktif/nonaktif, urutan tampil) yang digunakan sebagai pilihan kategori di form komplain
- **Pengaturan › Template Pesan**: Isi template pesan WhatsApp per kode template (default: **Pengingat Kontrol**) dengan penanda `[Nama Pasien]` dan `[Hari, Tanggal]`, pratinjau isi pesan, dan tombol reset ke isi default. Template **Pengingat Kontrol** dipakai oleh menu **Reminder Kontrol** saat kirim manual maupun otomatis

### Struktur Folder

```
src/
├── components/      # Vue components (Login, ProfileBar, dll)
├── constant/        # Konfigurasi dan konstanta
├── container/       # Page components (Dashboard, ComplaintInput, ComplaintHandling)
├── hooks/           # Custom Vue hooks
├── locales/         # Localization files
├── router/          # Vue Router configuration
├── services/        # API services dan auth service
├── assets/          # Static assets
├── App.vue          # Root component
├── App.ts           # Root component logic
└── main.ts          # Entry point
```

### Setup Awal

1. **Copy environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Update `.env.local` dengan configuration yang sesuai**:
   ```
   VITE_APP_ID=crm
   VITE_BACKEND_URL=http://localhost:3000
   VITE_TOKEN_NAME=crm_token
   VITE_SESSION_NAME=crm_session
   ```

3. **Install dependencies**:
   ```bash
   npm install
   # atau
   pnpm install
   ```

4. **Run development server**:
   ```bash
   npm run dev
   # atau
   pnpm dev
   ```

### Build Production

```bash
npm run build
# atau
pnpm build
```

### Features

- **Login Page**: Form login dengan validasi
- **Dashboard**: Halaman utama yang menampilkan ringkasan komplain
- **Sidebar Navigation**: Menu navigasi dengan submenu
- **Profile Bar**: Bar untuk logout dan profil user
- **Theme Switcher**: Toggle antara light dan dark theme

### Alur Status Komplain

1. **Baru**: Komplain dicatat di menu Input Komplain (`/complaint-input`)
2. **Diproses**: PIC ditugaskan dan penanganan berjalan (target SLA ditetapkan) di menu Penanganan Komplain (`/complaint-handling`)
3. **Selesai**: Komplain ditandai selesai (tombol "✓ Selesaikan Komplain" atau via form)
4. **Ditolak**: Komplain tidak dapat diproses (dengan catatan internal)

### Authentication Flow

1. User login melalui form dengan username dan password
2. Credentials dikirim ke backend API `/api/auth/login`
3. Backend merespons dengan token dan user data
4. Token disimpan di localStorage
5. App state berubah ke authenticated
6. User dapat mengakses dashboard

### API Endpoints CRM

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/crm/dashboard-summary` | Ringkasan dashboard komplain (param `year`) |
| GET | `/api/crm/complaints` | List komplain (paginasi + filter status/kategori/prioritas/tanggal/search) |
| GET | `/api/crm/complaints/:id` | Detail komplain |
| POST | `/api/crm/complaints` | Catat komplain baru |
| PUT | `/api/crm/complaints/:id` | Update komplain |
| DELETE | `/api/crm/complaints/:id` | Hapus komplain |
| POST | `/api/crm/complaints/:id/selesai` | Tandai komplain selesai |
| GET | `/api/crm/complaint-categories` | List kategori (param `activeOnly=true` untuk dropdown) |
| GET | `/api/crm/complaint-categories/:id` | Detail kategori |
| POST | `/api/crm/complaint-categories` | Tambah kategori |
| PUT | `/api/crm/complaint-categories/:id` | Update kategori |
| DELETE | `/api/crm/complaint-categories/:id` | Hapus kategori (ditolak jika sedang dipakai komplain) |
| GET | `/api/crm/customer-satisfaction` | List kepuasan pelanggan (paginasi + search) |
| GET | `/api/crm/customer-satisfaction/:id` | Detail |
| POST | `/api/crm/customer-satisfaction` | Tambah + upload PDF (multipart: `name`, `dateStart`, `dateEnd`, `file`) |
| PUT | `/api/crm/customer-satisfaction/:id` | Update (file opsional untuk mengganti dokumen) |
| DELETE | `/api/crm/customer-satisfaction/:id` | Hapus (termasuk file) |
| GET | `/api/crm/customer-satisfaction/:id/file` | Ambil file PDF (preview/download) |
| GET | `/api/crm/whatsapp/recipients` | Daftar pelanggan ber-nomor HP (penerima WA) |
| POST | `/api/crm/whatsapp/send` | Kirim pesan WhatsApp (`{ complaintId?, name, phone, message, createdBy? }`) |
| GET | `/api/crm/whatsapp/messages` | Riwayat pesan WhatsApp (paginasi) |
| GET | `/api/crm/message-templates` | List template pesan (kode, nama, isi, default) |
| GET | `/api/crm/message-templates/:code` | Detail template pesan |
| PUT | `/api/crm/message-templates/:code` | Update isi template (`{ content, updatedBy }`) |
| POST | `/api/crm/message-templates/:code/reset` | Kembalikan isi template ke default (`{ updatedBy }`) |
| GET | `/api/option/organization` | Opsi cabang |
| GET | `/api/option/employee` | Opsi pegawai (PIC komplain) |

### Endpoint Publik (tanpa login)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/public/complaint-categories` | Kategori aktif untuk dropdown form publik |
| POST | `/api/public/complaints` | Catat komplain dari form publik (status `baru`, `createdBy: public`) |

Form input komplain tampil di index `/` tanpa login; riwayat input terakhir hanya tampil untuk user yang sudah login.

### Logout

User dapat logout melalui ProfileBar di header. Session akan dihapus dan user akan diarahkan kembali ke login page.

### Environment Variables

- `VITE_APP_ID`: Identifier untuk aplikasi
- `VITE_BACKEND_URL`: URL backend API
- `VITE_TOKEN_NAME`: Nama key untuk menyimpan token di localStorage
- `VITE_SESSION_NAME`: Nama key untuk menyimpan session data
# crm
