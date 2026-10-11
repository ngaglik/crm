import { defineComponent, ref, onMounted, h } from "vue";
import { useMessage, useDialog, NButton, NTag } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();
    const auth = getAuthData();

    const username = ref(auth?.username || "system");

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

    const formatDate = (v: any) => (v ? String(v) : "-");

    // ══════════════════════════════════════════════════════════════════
    // LIST DATA & FILTER
    // ══════════════════════════════════════════════════════════════════
    const tableData = ref<any[]>([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const searchQuery = ref("");

    const baseUrl = `${Config.UrlBackend}/api/crm/customer-satisfaction`;

    const fetchData = async (page = 1) => {
      loading.value = true;
      try {
        let url = `${baseUrl}?page=${page}&pageSize=${pageSize.value}`;
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
        loading.value = false;
      }
    };

    const handlePageChange = (page: number) => {
      currentPage.value = page;
      fetchData(page);
    };

    const handleSearch = () => {
      currentPage.value = 1;
      fetchData(1);
    };

    // ══════════════════════════════════════════════════════════════════
    // FORM ADD/EDIT MODAL
    // ══════════════════════════════════════════════════════════════════
    const isModalOpen = ref(false);
    const isEditMode = ref(false);
    const formLoading = ref(false);

    const initForm = () => ({
      id: null as number | null,
      name: "",
      dateStart: null as string | null,
      dateEnd: null as string | null,
      fileName: "",
      file: null as File | null,
    });

    const formData = ref(initForm());

    const openAddModal = () => {
      isEditMode.value = false;
      formData.value = initForm();
      isModalOpen.value = true;
    };

    const openEditModal = (row: any) => {
      isEditMode.value = true;
      formData.value = {
        id: row.id,
        name: row.name,
        dateStart: row.dateStart || null,
        dateEnd: row.dateEnd || null,
        fileName: row.fileName || "",
        file: null,
      };
      isModalOpen.value = true;
    };

    const handleFileChange = (options: any) => {
      const file = options?.file?.file;
      formData.value.file = file || null;
      if (file && !/\.pdf$/i.test(file.name)) {
        message.warning("File harus berformat PDF");
        formData.value.file = null;
      }
    };

    const submitForm = async () => {
      if (!formData.value.name.trim()) {
        message.warning("Nama wajib diisi");
        return;
      }
      if (!formData.value.dateStart) {
        message.warning("Tanggal mulai wajib diisi");
        return;
      }
      if (!formData.value.dateEnd) {
        message.warning("Tanggal selesai wajib diisi");
        return;
      }
      if (!isEditMode.value && !formData.value.file) {
        message.warning("Dokumen PDF wajib dipilih");
        return;
      }

      formLoading.value = true;
      try {
        const fd = new FormData();
        fd.append("name", formData.value.name.trim());
        fd.append("dateStart", toDateStr(formData.value.dateStart) || "");
        fd.append("dateEnd", toDateStr(formData.value.dateEnd) || "");
        fd.append("createdBy", username.value);
        fd.append("updatedBy", username.value);
        if (formData.value.file) fd.append("file", formData.value.file);

        const url = isEditMode.value
          ? `${baseUrl}/${formData.value.id}`
          : baseUrl;
        const method = isEditMode.value ? "PUT" : "POST";

        // Body FormData: jangan set Content-Type (browser otomatis menambahkan boundary)
        const res = (await apiFetch(url, { method, body: fd })) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan data");
        }

        message.success(
          isEditMode.value
            ? "Data berhasil diperbarui"
            : "Data berhasil disimpan",
        );
        isModalOpen.value = false;
        await fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        formLoading.value = false;
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // PREVIEW & DOWNLOAD PDF
    // ══════════════════════════════════════════════════════════════════
    const isPreviewOpen = ref(false);
    const previewName = ref("");
    const previewUrl = ref("");

    const getFileBlob = async (row: any) => {
      const res = (await apiFetch(`${baseUrl}/${row.id}/file`, {
        method: "GET",
      })) as Response;
      if (!res || !res.ok) throw new Error("Gagal memuat dokumen");
      return await res.blob();
    };

    const previewFile = async (row: any) => {
      try {
        const blob = await getFileBlob(row);
        if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = URL.createObjectURL(blob);
        previewName.value = row.fileName || row.name;
        isPreviewOpen.value = true;
      } catch (err) {
        message.error((err as Error).message);
      }
    };

    const downloadFile = async (row: any) => {
      try {
        const blob = await getFileBlob(row);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = row.fileName || `kepuasan-pelanggan-${row.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (err) {
        message.error((err as Error).message);
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // DELETE
    // ══════════════════════════════════════════════════════════════════
    const deleteRow = (row: any) => {
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Hapus data kepuasan pelanggan "${row.name}"?`,
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
            message.success("Data berhasil dihapus");
            await fetchData(currentPage.value);
          } catch (err) {
            message.error((err as Error).message);
          }
        },
      });
    };

    const columns = [
      {
        title: "Aksi",
        key: "actions",
        width: 150,
        render(row: any) {
          return h("div", { style: { display: "flex", gap: "6px" } }, [
            h(
              NButton,
              {
                size: "small",
                type: "primary",
                onClick: () => openEditModal(row),
              },
              { default: () => "Edit" },
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
          ]);
        },
      },
      {
        title: "Nama",
        key: "name",
        render(row: any) {
          return h("span", { style: "font-weight:600;" }, row.name);
        },
      },
      {
        title: "Tanggal Mulai",
        key: "dateStart",
        width: 130,
        render: (row: any) => formatDate(row.dateStart),
      },
      {
        title: "Tanggal Selesai",
        key: "dateEnd",
        width: 130,
        render: (row: any) => formatDate(row.dateEnd),
      },
      {
        title: "Dokumen",
        key: "file",
        width: 220,
        render(row: any) {
          if (!row.fileName)
            return h(
              NTag,
              { type: "default", size: "small" },
              { default: () => "Tidak ada" },
            );
          return h("div", { style: { display: "flex", gap: "6px" } }, [
            h(
              NButton,
              {
                size: "small",
                type: "info",
                onClick: () => previewFile(row),
              },
              { default: () => "Preview" },
            ),
            h(
              NButton,
              {
                size: "small",
                onClick: () => downloadFile(row),
              },
              { default: () => "Download" },
            ),
          ]);
        },
      },
    ];

    onMounted(() => {
      fetchData(1);
    });

    return {
      // list
      tableData,
      loading,
      columns,
      currentPage,
      pageSize,
      total,
      searchQuery,
      handlePageChange,
      handleSearch,
      // form
      isModalOpen,
      isEditMode,
      formLoading,
      formData,
      openAddModal,
      handleFileChange,
      submitForm,
      // preview
      isPreviewOpen,
      previewName,
      previewUrl,
    };
  },
});
