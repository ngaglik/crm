import { defineComponent, ref, onMounted, h } from "vue";
import { useMessage, NTag, NButton, NPopconfirm } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";
import {
  ACAK_PER_JAM_MAX,
  ACAK_PER_JAM_MIN,
  useRandomSendTime,
} from "@/hooks/useRandomSendTime";
import * as XLSX from "xlsx";

const STATUS_FILTER_OPTIONS = [
  { label: "Menunggu", value: "pending" },
  { label: "Terkirim", value: "terkirim" },
  { label: "Tercatat", value: "tercatat" },
  { label: "Gagal", value: "gagal" },
];

interface ImportRow {
  row: number; // nomor baris di Excel (1 = header)
  nama: string;
  noWa: string;
  tanggalKirim: string;
  waktuKirim: string;
  tanggalKontrol: string;
  error?: string;
}

export default defineComponent({
  setup() {
    const message = useMessage();
    const auth = getAuthData();
    const username = ref(auth?.username || "system");

    const baseUrl = `${Config.UrlBackend}/api/crm/encounter-reminder`;

    // ── Helper tanggal ───────────────────────────────────────────────────
    // Naive UI date-picker dapat mengeluarkan timestamp (number);
    // normalisasi ke format yyyy-MM-dd sebelum dikirim.
    const toDateStr = (v: any): string | null => {
      if (!v) return null;
      if (typeof v === "number") {
        const d = new Date(v);
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${d.getFullYear()}-${m}-${day}`;
      }
      return String(v);
    };

    const formatDate = (d: string | null) => {
      if (!d) return "-";
      return new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const formatDateTime = (iso: string | null) => {
      if (!iso) return "-";
      return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    // ── Upload / parsing Excel ───────────────────────────────────────────
    const fileInput = ref<HTMLInputElement | null>(null);
    const dragging = ref(false);
    const previewRows = ref<ImportRow[]>([]);
    const importing = ref(false);

    // Acak jam kirim 10-15 pesan/jam (lihat hooks/useRandomSendTime.ts)
    const {
      jamMulai: acakJamMulai,
      jamSelesai: acakJamSelesai,
      acakResult,
      acakSummary,
      jadwalTerlewat,
      acakWaktuKirim,
      resetAcak,
    } = useRandomSendTime(previewRows);

    const pickFile = () => fileInput.value?.click();

    const onDrop = (e: DragEvent) => {
      dragging.value = false;
      const file = e.dataTransfer?.files?.[0];
      if (file) parseFile(file);
    };

    const onFileChange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) parseFile(file);
    };

    const normalizeHeader = (h: string) =>
      String(h).toLowerCase().replace(/[^a-z0-9]/g, "");

    const normalizeWa = (raw: string): string => {
      let s = String(raw).replace(/[^0-9]/g, "");
      if (s.startsWith("62")) return s;
      if (s.startsWith("0")) return "62" + s.slice(1);
      return s;
    };

    // Ubah serial tanggal Excel (angka) menjadi yyyy-MM-dd
    const excelSerialToDate = (serial: number): string | null => {
      if (serial < 20000 || serial > 80000) return null;
      const ms = Math.round((serial - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (isNaN(d.getTime())) return null;
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    // Ubah serial waktu Excel (pecahan hari, 0..1) menjadi HH:mm
    const excelTimeToHhmm = (serial: number): string | null => {
      if (serial < 0 || serial >= 1) return null;
      const totalMinutes = Math.round(serial * 24 * 60);
      const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
      const mm = String(totalMinutes % 60).padStart(2, "0");
      return `${hh}:${mm}`;
    };

    const todayStr = (): string => {
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${m}-${day}`;
    };

    // Terima berbagai format kolom "Waktu Kirim":
    //  - "2026-08-20"       → kirim pada tanggal tsb
    //  - "2026-08-20 08:00" → kirim tanggal tsb pukul 08:00
    //  - "08:00" (jam saja) → kirim hari ini pukul 08:00
    //  - angka (serial Excel) → tanggal atau jam sesuai nilainya
    const parseWaktuKirim = (cell: any): { tanggalKirim?: string; waktuKirim?: string; reason?: string } => {
      if (cell === null || cell === undefined || cell === "") {
        return { reason: "waktu kirim kosong" };
      }
      if (typeof cell === "number") {
        if (cell >= 0 && cell < 1) {
          const waktuKirim = excelTimeToHhmm(cell);
          if (!waktuKirim) return { reason: "waktu kirim tidak valid" };
          return { tanggalKirim: todayStr(), waktuKirim };
        }
        const tanggalKirim = excelSerialToDate(Math.floor(cell));
        const frac = cell - Math.floor(cell);
        if (frac > 0.0001) {
          const waktuKirim = excelTimeToHhmm(frac);
          if (tanggalKirim && waktuKirim) return { tanggalKirim, waktuKirim };
        }
        return tanggalKirim ? { tanggalKirim } : { reason: "waktu kirim tidak valid" };
      }
      const s = String(cell).trim();

      // jam saja: "08:00" atau "08:00:00" → kirim hari ini pada jam tsb
      let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (m) {
        const hh = Number(m[1]);
        const mm = Number(m[2]);
        if (hh > 23 || mm > 59) return { reason: "jam tidak valid" };
        return {
          tanggalKirim: todayStr(),
          waktuKirim: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
        };
      }

      // "2026-08-20" atau "2026-08-20 08:00"
      m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/);
      if (m) {
        const waktuKirim =
          m[4] !== undefined && m[5] !== undefined
            ? `${m[4].padStart(2, "0")}:${m[5]}`
            : undefined;
        return { tanggalKirim: `${m[1]}-${m[2]}-${m[3]}`, waktuKirim };
      }

      // "20/08/2026" atau "20/08/2026 08:00"
      m = s.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})(?:[T\s](\d{1,2}):(\d{2}))?/);
      if (m) {
        const waktuKirim =
          m[4] !== undefined && m[5] !== undefined
            ? `${m[4].padStart(2, "0")}:${m[5]}`
            : undefined;
        return { tanggalKirim: `${m[3]}-${m[2]}-${m[1]}`, waktuKirim };
      }

      return { reason: "waktu kirim tidak valid" };
    };

    // Kolom "Tanggal Kontrol": terima "2026-09-01", "01/09/2026", "01-09-2026", atau serial Excel
    const parseTanggalKontrol = (cell: any): { tanggal?: string; reason?: string } => {
      if (cell === null || cell === undefined || cell === "") {
        return { reason: "tanggal kontrol kosong" };
      }
      if (typeof cell === "number") {
        const tanggal = excelSerialToDate(Math.floor(cell));
        return tanggal ? { tanggal } : { reason: "tanggal kontrol tidak valid" };
      }
      const s = String(cell).trim();
      let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return { tanggal: `${m[1]}-${m[2]}-${m[3]}` };
      m = s.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})/);
      if (m) return { tanggal: `${m[3]}-${m[2]}-${m[1]}` };
      return { reason: "tanggal kontrol tidak valid" };
    };

    const parseFile = async (file: File) => {
      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        message.error("File harus berformat .xlsx atau .xls");
        return;
      }
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, {
          header: 1,
          defval: "",
        }) as any[][];

        if (rows.length < 2) {
          message.error("File tidak berisi data (minimal 1 baris data)");
          return;
        }

        // Deteksi posisi kolom dari header
        const headers = (rows[0] || []).map((h) => normalizeHeader(h ?? ""));
        const colNama = headers.findIndex((h) => h === "nama");
        const colNoWa = headers.findIndex(
          (h) => h === "nowa" || h === "nowhatsapp" || h === "nohp" || h === "nomorwa" || h === "notelepon",
        );
        const colWaktu = headers.findIndex(
          (h) => h === "waktukirim" || h === "tanggalkirim" || h === "waktu" || h === "tanggal",
        );
        const colKontrol = headers.findIndex(
          (h) => h === "tanggalkontrol" || h === "kontrol" || h === "jadwalkontrol" || h === "tanggalkunjungan",
        );

        if (colNama < 0 || colNoWa < 0 || colWaktu < 0 || colKontrol < 0) {
          message.error(
            "Kolom template tidak ditemukan. Harus berisi: Nama, NoWa, Waktu Kirim, Tanggal Kontrol",
          );
          return;
        }

        const items: ImportRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.every((c: any) => String(c ?? "").trim() === "")) continue;

          const row = i + 1;
          const nama = String(r[colNama] ?? "").trim();
          const noWaRaw = String(r[colNoWa] ?? "").trim();
          const noWa = normalizeWa(noWaRaw);
          const waktu = parseWaktuKirim(r[colWaktu]);
          const kontrol = parseTanggalKontrol(r[colKontrol]);

          let error: string | undefined;
          if (!nama) error = "nama kosong";
          else if (!noWaRaw) error = "NoWa kosong";
          else if (noWa.length < 10 || noWa.length > 15) error = "NoWa tidak valid";
          else if (!waktu.tanggalKirim) error = waktu.reason || "waktu kirim tidak valid";
          else if (!kontrol.tanggal) error = kontrol.reason || "tanggal kontrol tidak valid";

          items.push({
            row,
            nama,
            noWa,
            tanggalKirim: waktu.tanggalKirim || "",
            waktuKirim: waktu.waktuKirim || "",
            tanggalKontrol: kontrol.tanggal || "",
            error,
          });
        }

        if (items.length === 0) {
          message.error("Tidak ada baris data yang dapat diproses");
          return;
        }

        previewRows.value = items;
        resetAcak();
        message.success(`Berhasil membaca ${items.length} baris data dari "${file.name}"`);
      } catch (err) {
        console.error(err);
        message.error("Gagal membaca file Excel");
      }
    };

    const validCount = () =>
      previewRows.value.filter((r) => !r.error).length;

    // Tombol "Acak Waktu Kirim": bagi jam kirim data pratinjau secara acak,
    // dihitung mulai dari waktu tombol ditekan.
    const doAcakWaktu = () => {
      if (!acakWaktuKirim()) {
        message.warning("Tidak ada baris valid untuk diacak");
        return;
      }
      message.success(acakSummary.value);
    };

    const doImport = async () => {
      // Proteksi: data wajib diacak dulu supaya jam kirim tidak menumpuk.
      if (!acakResult.value) {
        message.warning("Klik \"Acak Waktu Kirim\" dulu sebelum import ke sistem");
        return;
      }
      // Jadwal hasil acak bisa terlewat bila lama menunggu sebelum import →
      // acak ulang dari waktu sekarang agar tidak terkirim sekaligus.
      if (jadwalTerlewat()) {
        acakWaktuKirim();
        message.warning(
          "Sebagian waktu kirim sudah terlewat — jadwal diacak ulang mulai dari sekarang",
        );
      }

      const items = previewRows.value
        .filter((r) => !r.error)
        .map((r) => ({
          nama: r.nama,
          noWa: r.noWa,
          tanggalKirim: r.tanggalKirim,
          waktuKirim: r.waktuKirim || null,
          tanggalKontrol: r.tanggalKontrol,
        }));
      if (items.length === 0) return;

      importing.value = true;
      try {
        const res = (await apiFetch(`${baseUrl}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, createdBy: username.value }),
        })) as Response;
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengimpor data");
        }
        const result = await res.json();
        message.success(`Berhasil mengimpor ${result.imported} data`);
        if (result.errors?.length) {
          const first = result.errors.slice(0, 5).join("; ");
          message.warning(`Sebagian data dilewati: ${first}`);
        }
        previewRows.value = [];
        resetAcak();
        if (fileInput.value) fileInput.value.value = "";
        fetchData(1);
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        importing.value = false;
      }
    };

    const downloadTemplate = () => {
      const data = [
        ["Nama", "NoWa", "Waktu Kirim", "Tanggal Kontrol"],
        ["Budi Santoso", "081234567890", "2026-08-25 08:00", "2026-09-01"],
        ["Siti Aminah", "081298765432", "08:00", "01/09/2026"],
        ["Dewi Lestari", "081345678901", "2026-08-26", "2026-09-05"],
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reminder");
      XLSX.writeFile(wb, "template-reminder-kontrol.xlsx");
    };

    // ── Tabel pratinjau ──────────────────────────────────────────────────
    const previewColumns = [
      { title: "Baris", key: "row", width: 60 },
      { title: "Nama", key: "nama", width: 140, ellipsis: { tooltip: true } },
      { title: "NoWa", key: "noWa", width: 130 },
      {
        title: "Waktu Kirim",
        key: "tanggalKirim",
        width: 150,
        render: (r: ImportRow) =>
          r.tanggalKirim
            ? `${formatDate(r.tanggalKirim)}${r.waktuKirim ? " " + r.waktuKirim : ""}`
            : "-",
      },
      {
        title: "Tanggal Kontrol",
        key: "tanggalKontrol",
        width: 130,
        render: (r: ImportRow) => (r.tanggalKontrol ? formatDate(r.tanggalKontrol) : "-"),
      },
      {
        title: "Status",
        key: "error",
        width: 90,
        render: (r: ImportRow) =>
          r.error
            ? h(NTag, { type: "error", size: "small" }, { default: () => "Bermasalah" })
            : h(NTag, { type: "success", size: "small" }, { default: () => "OK" }),
      },
      {
        title: "Keterangan",
        key: "error",
        ellipsis: { tooltip: true },
        render: (r: ImportRow) => r.error || "-",
      },
    ];

    // ── Daftar reminder ──────────────────────────────────────────────────
    const tableData = ref<any[]>([]);
    const tableLoading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const filterStatus = ref<string | null>(null);
    const filterTanggal = ref<number | null>(null);
    const searchQuery = ref("");
    const sendingDue = ref(false);

    // ── Dialog rincian pesan reminder ──────────────────────────────────
    const viewDialogVisible = ref(false);
    const viewRow = ref<any>(null);
    const openView = (row: any) => {
      viewRow.value = row;
      viewDialogVisible.value = true;
    };

    const fetchData = async (page = 1) => {
      tableLoading.value = true;
      try {
        let url = `${baseUrl}?page=${page}&pageSize=${pageSize.value}`;
        if (filterStatus.value) url += `&status=${encodeURIComponent(filterStatus.value)}`;
        const tgl = toDateStr(filterTanggal.value);
        if (tgl) url += `&tanggal=${tgl}`;
        if (searchQuery.value.trim())
          url += `&search=${encodeURIComponent(searchQuery.value.trim())}`;

        const res = (await apiFetch(url, { method: "GET" })) as Response;
        if (!res || !res.ok) throw new Error("Gagal memuat data");
        const result = await res.json();
        tableData.value = result.data || [];
        currentPage.value = result.page || 1;
        total.value = result.total || 0;
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        tableLoading.value = false;
      }
    };

    const handlePageChange = (page: number) => fetchData(page);

    const sendDue = async () => {
      sendingDue.value = true;
      try {
        const res = (await apiFetch(`${baseUrl}/send-due`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ createdBy: username.value }),
        })) as Response;
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengirim reminder");
        }
        const result = await res.json();
        if (result.total === 0) {
          message.info(result.message || "Tidak ada reminder yang jatuh tempo");
        } else {
          message.success(
            `Terkirim: ${result.sent} · Tercatat: ${result.recorded} · Gagal: ${result.failed}`,
          );
        }
        fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        sendingDue.value = false;
      }
    };

    const sendNow = async (row: any) => {
      try {
        const res = (await apiFetch(`${baseUrl}/${row.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ createdBy: username.value }),
        })) as Response;
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengirim reminder");
        }
        const result = await res.json();
        const status = result?.data?.status;
        if (status === "terkirim") message.success(`Reminder untuk ${row.nama} terkirim`);
        else if (status === "tercatat") message.warning("Pesan tercatat (gateway WhatsApp belum dikonfigurasi)");
        else message.error("Pesan gagal terkirim. Periksa gateway WhatsApp.");
        fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      }
    };

    const deleteRow = async (row: any) => {
      try {
        const res = (await apiFetch(`${baseUrl}/${row.id}`, {
          method: "DELETE",
        })) as Response;
        if (!res || !res.ok) throw new Error("Gagal menghapus data");
        message.success("Data berhasil dihapus");
        fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      }
    };

    const statusTag = (status: string) => {
      let type: "info" | "success" | "warning" | "error" = "info";
      let label = status;
      if (status === "pending") {
        type = "warning";
        label = "Menunggu";
      } else if (status === "terkirim") {
        type = "success";
        label = "Terkirim";
      } else if (status === "tercatat") {
        type = "info";
        label = "Tercatat";
      } else if (status === "gagal") {
        type = "error";
        label = "Gagal";
      }
      return h(NTag, { type, size: "small" }, { default: () => label });
    };

    const tableColumns = [
      { title: "Nama", key: "nama", width: 160, ellipsis: { tooltip: true } },
      { title: "NoWa", key: "noWa", width: 140 },
      {
        title: "Tanggal Kirim",
        key: "tanggalKirim",
        width: 130,
        render: (row: any) => formatDate(row.tanggalKirim),
      },
      {
        title: "Waktu Kirim",
        key: "waktuKirim",
        width: 110,
        render: (row: any) => row.waktuKirim || "-",
      },
      {
        title: "Tanggal Kontrol",
        key: "tanggalKontrol",
        width: 140,
        render: (row: any) => formatDate(row.tanggalKontrol),
      },
      {
        title: "Status",
        key: "status",
        width: 110,
        render: (row: any) => statusTag(row.status),
      },
      {
        title: "Terkirim Pada",
        key: "sentAt",
        width: 160,
        render: (row: any) => formatDateTime(row.sentAt),
      },
      {
        title: "Aksi",
        key: "actions",
        width: 200,
        render: (row: any) =>
          h("div", { style: "display:flex; gap:6px" }, [
            h(
              NButton,
              {
                size: "small",
                type: "info",
                quaternary: true,
                onClick: () => openView(row),
              },
              { default: () => "Lihat" },
            ),
            h(
              NButton,
              {
                size: "small",
                type: row.status === "terkirim" ? "default" : "primary",
                disabled: row.status === "terkirim",
                onClick: () => sendNow(row),
              },
              { default: () => "Kirim" },
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => deleteRow(row),
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    { size: "small", type: "error", quaternary: true },
                    { default: () => "Hapus" },
                  ),
                default: () => `Hapus reminder ${row.nama}?`,
              },
            ),
          ]),
      },
    ];

    onMounted(() => fetchData(1));

    return {
      // upload
      fileInput,
      dragging,
      previewRows,
      previewColumns,
      importing,
      validCount,
      pickFile,
      onDrop,
      onFileChange,
      doImport,
      downloadTemplate,
      // acak waktu kirim
      acakJamMulai,
      acakJamSelesai,
      acakResult,
      acakSummary,
      doAcakWaktu,
      ACAK_PER_JAM_MIN,
      ACAK_PER_JAM_MAX,
      // tabel
      tableData,
      tableLoading,
      tableColumns,
      currentPage,
      pageSize,
      total,
      handlePageChange,
      filterStatus,
      filterTanggal,
      searchQuery,
      statusFilterOptions: STATUS_FILTER_OPTIONS,
      sendDue,
      sendingDue,
      // dialog rincian pesan
      viewDialogVisible,
      viewRow,
      openView,
      formatDate,
      formatDateTime,
    };
  },
});
