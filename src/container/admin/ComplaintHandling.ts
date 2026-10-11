import { defineComponent, ref, computed, onMounted, onUnmounted, h } from "vue";
import { useMessage, useDialog, NButton } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";
import {
  toDateStr,
  useKategoriOptions,
  PRIORITAS_OPTIONS,
  STATUS_OPTIONS,
  prioritasTag,
  prioritasType,
  prioritasLabel,
  statusTag,
  statusType,
  statusLabel,
} from "@/hooks/useComplaint";

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();
    const auth = getAuthData();

    const username = computed(() => auth?.username || "system");

    // Deteksi layar mobile (kartu list vs tabel desktop)
    const isMobile = ref(window.innerWidth < 768);
    let resizeHandler: () => void;

    const { kategoriOptions, fetchKategoriOptions, kategoriLabel } =
      useKategoriOptions();

    const baseUrl = `${Config.UrlBackend}/api/crm/complaints`;

    // ── PIC options ──────────────────────────────────────────────────────
    const picOptions = ref<{ label: string; value: number }[]>([]);

    const searchEmployees = async (query: string) => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/option/employee?q=${encodeURIComponent(query)}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        picOptions.value = (result.data || []).map((x: any) => ({
          label: x.name,
          value: Number(x.id),
        }));
      } catch {
        /* silent */
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // LIST DATA & FILTER
    // ══════════════════════════════════════════════════════════════════
    const tableData = ref<any[]>([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(15);
    const total = ref(0);
    const searchQuery = ref("");
    const filterStatus = ref<string | null>(null);
    const filterKategori = ref<string | null>(null);
    const filterPrioritas = ref<string | null>(null);
    const filterTanggal = ref<string | null>(null);

    const fetchData = async (page = 1) => {
      loading.value = true;
      try {
        let url = `${baseUrl}?page=${page}&pageSize=${pageSize.value}`;
        if (searchQuery.value.trim())
          url += `&search=${encodeURIComponent(searchQuery.value.trim())}`;
        if (filterStatus.value)
          url += `&status=${encodeURIComponent(filterStatus.value)}`;
        if (filterKategori.value)
          url += `&kategori=${encodeURIComponent(filterKategori.value)}`;
        if (filterPrioritas.value)
          url += `&prioritas=${encodeURIComponent(filterPrioritas.value)}`;
        if (filterTanggal.value)
          url += `&tanggal=${toDateStr(filterTanggal.value)}`;

        const res = (await apiFetch(url, { method: "GET" })) as Response;
        if (!res || !res.ok) throw new Error("Gagal memuat data");
        const result = await res.json();
        tableData.value = result.data || [];
        currentPage.value = result.page || 1;
        total.value = result.total || 0;
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        loading.value = false;
      }
    };

    const handlePageChange = (page: number) => {
      currentPage.value = page;
      fetchData(page);
    };

    const handleFilter = () => {
      currentPage.value = 1;
      fetchData(1);
    };

    const resetFilter = () => {
      searchQuery.value = "";
      filterStatus.value = null;
      filterKategori.value = null;
      filterPrioritas.value = null;
      filterTanggal.value = null;
      handleFilter();
    };

    // ══════════════════════════════════════════════════════════════════
    // DETAIL MODAL (READ-ONLY)
    // ══════════════════════════════════════════════════════════════════
    const isDetailOpen = ref(false);
    const formLoading = ref(false);
    const detailData = ref<any>(null);

    const openDetailModal = async (row: any) => {
      isDetailOpen.value = true;
      formLoading.value = true;
      try {
        const res = (await apiFetch(
          `${baseUrl}/${row.id}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) throw new Error("Gagal mengambil detail data");
        const result = await res.json();
        detailData.value = result.data;

        picOptions.value = result.data?.picId
          ? [
              {
                label: row.picName || `ID: ${result.data.picId}`,
                value: Number(result.data.picId),
              },
            ]
          : [];
      } catch (err) {
        message.error((err as Error).message);
        isDetailOpen.value = false;
      } finally {
        formLoading.value = false;
      }
    };

    const isLocked = (row: any) =>
      row.status === "selesai" || row.status === "ditolak";

    const resolveForm = (id: number) => {
      dialog.info({
        title: "Selesaikan Komplain",
        content: "Tandai komplain ini sebagai selesai?",
        positiveText: "Selesaikan",
        negativeText: "Batal",
        onPositiveClick: async () => {
          try {
            const res = (await apiFetch(
              `${baseUrl}/${id}/selesai`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updatedBy: username.value }),
              },
            )) as Response;

            if (!res || !res.ok) {
              const err = res ? await res.json() : null;
              throw new Error(err?.message || "Gagal menyelesaikan komplain");
            }

            message.success("Komplain berhasil diselesaikan");
            isDetailOpen.value = false;
            isHandlingOpen.value = false;
            await fetchData(currentPage.value);
          } catch (err) {
            message.error((err as Error).message);
          }
        },
      });
    };

    // ══════════════════════════════════════════════════════════════════
    // MODAL PENANGANAN (PIC, SLA, status, solusi, catatan)
    // ══════════════════════════════════════════════════════════════════
    const isHandlingOpen = ref(false);
    const handlingForm = ref({
      id: null as number | null,
      noTiket: "",
      tanggal: "",
      namaPelanggan: "",
      perusahaan: "",
      telepon: "",
      email: "",
      kategori: "",
      prioritas: "",
      subjek: "",
      deskripsi: "",
      picId: null as number | null,
      targetSelesai: null as string | null,
      status: "baru",
      solusi: "",
      catatan: "",
    });

    const openHandlingModal = async (row: any) => {
      isHandlingOpen.value = true;
      formLoading.value = true;
      try {
        const res = (await apiFetch(
          `${baseUrl}/${row.id}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) throw new Error("Gagal mengambil detail data");
        const result = await res.json();
        const data = result.data;

        handlingForm.value = {
          id: data.id,
          noTiket: data.noTiket || "",
          tanggal: data.tanggal,
          namaPelanggan: data.namaPelanggan || "",
          perusahaan: data.perusahaan || "",
          telepon: data.telepon || "",
          email: data.email || "",
          kategori: data.kategori || "",
          prioritas: data.prioritas || "sedang",
          subjek: data.subjek || "",
          deskripsi: data.deskripsi || "",
          picId: data.picId ? Number(data.picId) : null,
          targetSelesai: data.targetSelesai || null,
          status: data.status || "baru",
          solusi: data.solusi || "",
          catatan: data.catatan || "",
        };

        picOptions.value = data.picId
          ? [
              {
                label: row.picName || `ID: ${data.picId}`,
                value: Number(data.picId),
              },
            ]
          : [];
      } catch (err) {
        message.error((err as Error).message);
        isHandlingOpen.value = false;
      } finally {
        formLoading.value = false;
      }
    };

    const submitHandling = async () => {
      formLoading.value = true;
      try {
        const body = {
          noTiket: handlingForm.value.noTiket,
          tanggal: toDateStr(handlingForm.value.tanggal),
          namaPelanggan: handlingForm.value.namaPelanggan,
          perusahaan: handlingForm.value.perusahaan,
          telepon: handlingForm.value.telepon,
          email: handlingForm.value.email,
          kategori: handlingForm.value.kategori,
          prioritas: handlingForm.value.prioritas,
          subjek: handlingForm.value.subjek,
          deskripsi: handlingForm.value.deskripsi,
          picId: handlingForm.value.picId,
          targetSelesai: toDateStr(handlingForm.value.targetSelesai),
          status: handlingForm.value.status,
          solusi: handlingForm.value.solusi,
          catatan: handlingForm.value.catatan,
          updatedBy: username.value,
        };

        const res = (await apiFetch(
          `${baseUrl}/${handlingForm.value.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan data");
        }

        message.success("Penanganan komplain berhasil disimpan");
        isHandlingOpen.value = false;
        await fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        formLoading.value = false;
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // DELETE
    // ══════════════════════════════════════════════════════════════════
    const deleteRow = (row: any) => {
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Hapus komplain "${row.noTiket || row.subjek}"?`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
          try {
            const res = (await apiFetch(`${baseUrl}/${row.id}`, {
              method: "DELETE",
            })) as Response;
            if (!res || !res.ok) {
              const err = res ? await res.json() : null;
              throw new Error(err?.message || "Gagal menghapus");
            }
            message.success("Komplain berhasil dihapus");
            await fetchData(currentPage.value);
          } catch (err) {
            message.error((err as Error).message);
          }
        },
      });
    };

    // ── SLA render (tabel desktop) ───────────────────────────────────────
    const renderSla = (row: any) => {
      const target = row.targetSelesai;
      if (!target) return "—";
      if (isLocked(row)) return h("span", {}, target);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const t = new Date(`${target}T00:00:00`);
      const diff = Math.ceil((t.getTime() - today.getTime()) / 86400000);

      if (diff < 0)
        return h(
          "span",
          { style: "color:#ef4444;font-weight:600;" },
          `${target} (Terlambat ${-diff} hari)`,
        );
      if (diff === 0)
        return h(
          "span",
          { style: "color:#f59e0b;font-weight:600;" },
          `${target} (Hari ini)`,
        );
      return h("span", {}, `${target} (${diff} hari)`);
    };

    // ── SLA teks + kelas warna (kartu mobile) ────────────────────────────
    const slaText = (row: any) => {
      const target = row.targetSelesai;
      if (!target) return "—";
      if (isLocked(row)) return target;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const t = new Date(`${target}T00:00:00`);
      const diff = Math.ceil((t.getTime() - today.getTime()) / 86400000);

      if (diff < 0) return `${target} (Terlambat ${-diff} hari)`;
      if (diff === 0) return `${target} (Hari ini)`;
      return `${target} (${diff} hari)`;
    };

    const slaClass = (row: any) => {
      const target = row.targetSelesai;
      if (!target || isLocked(row)) return "";

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const t = new Date(`${target}T00:00:00`);
      const diff = Math.ceil((t.getTime() - today.getTime()) / 86400000);

      if (diff < 0) return "sla-late";
      if (diff === 0) return "sla-today";
      return "";
    };

    const columns = [
      {
        title: "Aksi",
        key: "actions",
        width: 220,
        render(row: any) {
          const btns = [
            h(
              NButton,
              {
                size: "small",
                type: "info",
                onClick: () => openDetailModal(row),
              },
              { default: () => "Detail" },
            ),
          ];

          if (!isLocked(row)) {
            btns.push(
              h(
                NButton,
                {
                  size: "small",
                  type: "primary",
                  onClick: () => openHandlingModal(row),
                },
                { default: () => "Proses" },
              ),
              h(
                NButton,
                {
                  size: "small",
                  type: "error",
                  onClick: () => deleteRow(row),
                },
                { default: () => "Hapus" },
              ),
            );
          }

          return h("div", { style: { display: "flex", gap: "6px" } }, btns);
        },
      },
      {
        title: "No. Tiket",
        key: "noTiket",
        width: 130,
        render(row: any) {
          return h(
            "span",
            { style: "font-family:monospace;font-weight:600;" },
            row.noTiket || "-",
          );
        },
      },
      { title: "Tanggal", key: "tanggal", width: 110 },
      { title: "Pelanggan", key: "namaPelanggan" },
      {
        title: "Subjek",
        key: "subjek",
        width: 220,
        ellipsis: { tooltip: true },
      },
      {
        title: "Kategori",
        key: "kategori",
        width: 120,
        render(row: any) {
          return kategoriLabel(row.kategori);
        },
      },
      {
        title: "Prioritas",
        key: "prioritas",
        width: 100,
        render(row: any) {
          return prioritasTag(row.prioritas);
        },
      },
      {
        title: "Status",
        key: "status",
        width: 110,
        render(row: any) {
          return statusTag(row.status);
        },
      },
      { title: "PIC", key: "picName", width: 140 },
      {
        title: "Target Selesai",
        key: "targetSelesai",
        width: 190,
        render(row: any) {
          return renderSla(row);
        },
      },
    ];

    onMounted(() => {
      fetchKategoriOptions();
      fetchData(1);
      resizeHandler = () => {
        isMobile.value = window.innerWidth < 768;
      };
      window.addEventListener("resize", resizeHandler);
    });

    onUnmounted(() => {
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    });

    return {
      // options
      picOptions,
      searchEmployees,
      kategoriOptions,
      kategoriLabel,
      prioritasOptions: PRIORITAS_OPTIONS,
      prioritasType,
      prioritasLabel,
      statusOptions: STATUS_OPTIONS,
      statusType,
      statusLabel,
      isMobile,
      // list
      tableData,
      loading,
      columns,
      currentPage,
      pageSize,
      total,
      searchQuery,
      filterStatus,
      filterKategori,
      filterPrioritas,
      filterTanggal,
      handlePageChange,
      handleFilter,
      resetFilter,
      // detail
      isDetailOpen,
      detailData,
      openDetailModal,
      resolveForm,
      // handling
      isHandlingOpen,
      handlingForm,
      openHandlingModal,
      submitHandling,
      // shared
      formLoading,
      isLocked,
      slaText,
      slaClass,
    };
  },
});
