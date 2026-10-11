import { ref, h } from "vue";
import { NTag } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";

// ── Konstanta bersama ────────────────────────────────────────
export const STATUS_OPTIONS = [
  { label: "Baru", value: "baru" },
  { label: "Diproses", value: "diproses" },
  { label: "Selesai", value: "selesai" },
  { label: "Ditolak", value: "ditolak" },
];

export const PRIORITAS_OPTIONS = [
  { label: "Rendah", value: "rendah" },
  { label: "Sedang", value: "sedang" },
  { label: "Tinggi", value: "tinggi" },
  { label: "Kritis", value: "kritis" },
];

// Naive UI date-picker dapat mengeluarkan timestamp (number) saat user
// memilih tanggal. Helper ini menormalkan nilai tanggal ke yyyy-MM-dd.
export const toDateStr = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === "number") {
    const d = new Date(v);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }
  return String(v);
};

// ── Kategori komplain (dimuat dari masterdata) ──────────────
export function useKategoriOptions(url?: string) {
  const kategoriOptions = ref<{ label: string; value: string }[]>([]);
  const kategoriUrl =
    url ?? `${Config.UrlBackend}/api/crm/complaint-categories?activeOnly=true`;

  const fetchKategoriOptions = async () => {
    try {
      const res = (await apiFetch(kategoriUrl, { method: "GET" })) as Response;
      if (!res || !res.ok) return;
      const result = await res.json();
      kategoriOptions.value = (result.data || []).map((x: any) => ({
        label: x.name,
        value: x.name,
      }));
    } catch {
      /* silent */
    }
  };

  const kategoriLabel = (value: string) =>
    kategoriOptions.value.find((o) => o.value === value)?.label || value;

  return { kategoriOptions, fetchKategoriOptions, kategoriLabel };
}

// ── Prioritas: helper label/type + render tag ────────────────
export function prioritasType(value: string): "default" | "info" | "warning" | "error" {
  if (value === "sedang") return "info";
  if (value === "tinggi") return "warning";
  if (value === "kritis") return "error";
  return "default";
}

export function prioritasLabel(value: string) {
  const map: Record<string, string> = {
    rendah: "Rendah",
    sedang: "Sedang",
    tinggi: "Tinggi",
    kritis: "Kritis",
  };
  return map[value] || "Rendah";
}

export function prioritasTag(value: string) {
  return h(
    NTag,
    { type: prioritasType(value), size: "small" },
    { default: () => prioritasLabel(value) },
  );
}

// ── Status: helper label/type + render tag ───────────────────
export function statusType(value: string): "default" | "info" | "warning" | "success" | "error" {
  if (value === "baru") return "info";
  if (value === "diproses") return "warning";
  if (value === "selesai") return "success";
  if (value === "ditolak") return "error";
  return "default";
}

export function statusLabel(value: string) {
  const map: Record<string, string> = {
    baru: "Baru",
    diproses: "Diproses",
    selesai: "Selesai",
    ditolak: "Ditolak",
  };
  return map[value] || "Baru";
}

export function statusTag(value: string) {
  return h(
    NTag,
    { type: statusType(value), size: "small" },
    { default: () => statusLabel(value) },
  );
}
