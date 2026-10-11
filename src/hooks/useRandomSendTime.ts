import { computed, ref, type Ref } from "vue";

// ── Pengacak jam kirim: 10-15 pesan per jam ─────────────────────
// Dipakai oleh menu Reminder Kontrol Pasca Inap & Reminder Minum Obat.
// Setelah data Excel dibaca (masih di pratinjau), jam kirim tiap baris
// diacak supaya pengiriman tidak menumpuk pada satu jam — sekaligus
// membatasi maksimal 15 pesan per jam agar nomor WhatsApp tidak diblokir.
// Waktu hasil acak selalu setelah tombol ditekan, jadi tidak ada jadwal
// yang langsung terkirim karena jamnya sudah terlewat.

export const ACAK_PER_JAM_MIN = 10;
export const ACAK_PER_JAM_MAX = 15;

export const ACAK_JAM_MULAI_DEFAULT = 8;
export const ACAK_JAM_SELESAI_DEFAULT = 17;

/** Baris pratinjau yang punya jadwal kirim + penanda error. */
export interface JadwalKirimRow {
  tanggalKirim: string;
  waktuKirim: string;
  error?: string;
}

export interface AcakResult {
  total: number;
  jumlahJam: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  waktuMulai: string; // HH:mm pesan pertama
  waktuSelesai: string; // HH:mm pesan terakhir
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const randomInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

const dateStrOf = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// "yyyy-MM-dd HH:mm" — bisa dibandingkan langsung sebagai string.
const stampOf = (d: Date) =>
  `${dateStrOf(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// n menit acak dalam satu jam, tidak lebih awal dari `from`, terurut menaik.
const randomMinutes = (n: number, from = 0): number[] => {
  const start = Math.min(Math.max(from, 0), 59);
  const pool: number[] = [];
  for (let m = start; m <= 59; m++) pool.push(m);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const picked = pool.slice(0, n);
  // Menit yang tersisa lebih sedikit dari jumlah pesan → ulangi menit yang ada.
  while (picked.length < n) picked.push(pool[picked.length % pool.length]);
  return picked.sort((a, b) => a - b);
};

const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
};

const toHour = (v: unknown, fallback: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), 0), 23);
};

const formatTanggalSingkat = (d: string) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

// Sisa pesan masih bisa dibagi lagi menjadi beberapa jam berisi 10-15 pesan?
// (1-9 dan 16-19 tidak bisa dibagi lagi).
const isSplittable = (n: number) =>
  n === 0 ||
  (n >= ACAK_PER_JAM_MIN && n <= ACAK_PER_JAM_MAX) ||
  n >= 2 * ACAK_PER_JAM_MIN;

// Jumlah pesan untuk satu slot jam: acak dalam rentang 10-15, dengan
// mengutamakan sisa yang masih bisa dibagi ke jam-jam berikutnya.
const pickChunkSize = (remaining: number, slotsLeftToday: number): number => {
  // Sisa pesan pasti muat dalam satu jam → ambil semuanya.
  if (remaining <= ACAK_PER_JAM_MAX) return remaining;

  let lo = ACAK_PER_JAM_MIN;
  const hi = ACAK_PER_JAM_MAX;
  // Bila sisa pesan masih muat di jam-jam tersisa hari ini, sisakan ruang agar
  // jam berikutnya tetap kebagian 10-15 pesan (bukan menumpuk di jam terakhir).
  if (remaining <= ACAK_PER_JAM_MAX * slotsLeftToday) {
    lo = Math.max(lo, remaining - ACAK_PER_JAM_MAX * (slotsLeftToday - 1));
  }
  lo = Math.max(Math.min(lo, hi), 1);

  const candidates: number[] = [];
  for (let n = lo; n <= hi; n++) {
    if (isSplittable(remaining - n)) candidates.push(n);
  }
  const pool =
    candidates.length > 0
      ? candidates
      : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * Acak tanggal & jam kirim pada baris yang valid (mengubah baris secara
 * langsung) dengan ketentuan 10-15 pesan per jam dalam rentang jam yang
 * dipilih. Jadwal selalu dimulai setelah `sekarang` (waktu tombol ditekan):
 * tanggal yang sudah lewat dijadwalkan ulang dari sekarang, jam yang sudah
 * lewat hari ini dilewati, dan bila rentang jam hari ini sudah habis maka
 * mulai dari besok. Jika jumlah pesan melebihi kapasitas satu hari, sisanya
 * dilanjutkan ke hari berikutnya.
 */
export function acakJadwalKirim<T extends JadwalKirimRow>(
  rows: T[],
  jamMulai: number | null,
  jamSelesai: number | null,
  sekarang: Date = new Date(),
): AcakResult | null {
  const valid = rows.filter((r) => !r.error && r.tanggalKirim);
  if (valid.length === 0) return null;

  const mulai = toHour(jamMulai, ACAK_JAM_MULAI_DEFAULT);
  const selesai = Math.max(mulai, toHour(jamSelesai, ACAK_JAM_SELESAI_DEFAULT));

  // Batas bawah jadwal = waktu tombol ditekan.
  const hariIni = dateStrOf(sekarang);
  const jamSekarang = sekarang.getHours();
  const menitSekarang = sekarang.getMinutes();

  // Kelompokkan per tanggal kirim agar tanggal aslinya tidak berubah.
  const groups = new Map<string, T[]>();
  for (const r of valid) {
    const list = groups.get(r.tanggalKirim);
    if (list) list.push(r);
    else groups.set(r.tanggalKirim, [r]);
  }

  let slotDate = "";
  let slotHour = mulai;
  let jumlahJam = 0;
  let pertama = "";
  let terakhir = "";

  for (const date of [...groups.keys()].sort()) {
    // Tanggal yang sudah lewat dijadwalkan ulang dari hari ini.
    let titikDate = date < hariIni ? hariIni : date;
    let titikHour = mulai;
    if (titikDate === hariIni) {
      if (jamSekarang > selesai) {
        // Rentang jam kirim hari ini sudah lewat → mulai besok.
        titikDate = addDays(hariIni, 1);
      } else {
        // Jam hari ini yang sudah lewat tidak dipakai lagi.
        titikHour = Math.max(mulai, jamSekarang);
      }
    }
    // Jangan mundur dari posisi jadwal terakhir.
    if (!slotDate || titikDate > slotDate || (titikDate === slotDate && titikHour > slotHour)) {
      slotDate = titikDate;
      slotHour = titikHour;
    }

    const group = groups.get(date) as T[];
    let index = 0;
    while (index < group.length) {
      if (slotHour > selesai) {
        // Jam kirim hari ini habis → lanjut hari berikutnya.
        slotDate = addDays(slotDate, 1);
        slotHour = mulai;
      }

      const menitMulai =
        slotDate === hariIni && slotHour === jamSekarang ? menitSekarang + 1 : 0;
      const jumlah = pickChunkSize(group.length - index, selesai - slotHour + 1);
      // Sisa menit di jam berjalan tidak cukup untuk semua pesan → jam berikutnya.
      if (menitMulai > 0 && 60 - menitMulai < jumlah) {
        slotHour++;
        continue;
      }

      const minutes = randomMinutes(jumlah, menitMulai);
      for (let k = 0; k < jumlah; k++) {
        const waktu = `${pad2(slotHour)}:${pad2(minutes[k])}`;
        group[index + k].tanggalKirim = slotDate;
        group[index + k].waktuKirim = waktu;
        if (!pertama) pertama = `${slotDate} ${waktu}`;
        terakhir = `${slotDate} ${waktu}`;
      }
      index += jumlah;
      jumlahJam++;
      slotHour++;
    }
  }

  const [tanggalMulai = "", waktuMulai = ""] = pertama.split(" ");
  const [tanggalSelesai = "", waktuSelesai = ""] = terakhir.split(" ");
  return {
    total: valid.length,
    jumlahJam,
    tanggalMulai,
    tanggalSelesai,
    waktuMulai,
    waktuSelesai,
  };
}

export function useRandomSendTime<T extends JadwalKirimRow>(rows: Ref<T[]>) {
  const jamMulai = ref<number | null>(ACAK_JAM_MULAI_DEFAULT);
  const jamSelesai = ref<number | null>(ACAK_JAM_SELESAI_DEFAULT);
  const acakResult = ref<AcakResult | null>(null);

  const acakSummary = computed(() => {
    const r = acakResult.value;
    if (!r) return "";
    const periode =
      r.tanggalMulai === r.tanggalSelesai
        ? `${formatTanggalSingkat(r.tanggalMulai)} ${r.waktuMulai}–${r.waktuSelesai}`
        : `${formatTanggalSingkat(r.tanggalMulai)} ${r.waktuMulai} – ${formatTanggalSingkat(r.tanggalSelesai)} ${r.waktuSelesai}`;
    return `🎲 ${r.total} pesan dibagi ke ${r.jumlahJam} jam (${ACAK_PER_JAM_MIN}–${ACAK_PER_JAM_MAX} pesan/jam) · ${periode}`;
  });

  const resetAcak = () => {
    acakResult.value = null;
  };

  // Apakah jadwal hasil acak sudah terlewat (waktu kirim terawal <= sekarang)?
  // Bila ya, jadwal perlu diacak ulang tepat sebelum diimpor.
  const jadwalTerlewat = (sekarang: Date = new Date()): boolean => {
    const r = acakResult.value;
    if (!r) return false;
    return `${r.tanggalMulai} ${r.waktuMulai}` <= stampOf(sekarang);
  };

  // Jam kirim diacak mulai dari waktu tombol ditekan.
  const acakWaktuKirim = (sekarang: Date = new Date()): AcakResult | null => {
    const result = acakJadwalKirim(rows.value, jamMulai.value, jamSelesai.value, sekarang);
    acakResult.value = result;
    return result;
  };

  return {
    jamMulai,
    jamSelesai,
    acakResult,
    acakSummary,
    jadwalTerlewat,
    acakWaktuKirim,
    resetAcak,
  };
}
