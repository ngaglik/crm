import { defineComponent, ref, computed, onMounted, h } from "vue";
import { useMessage, useDialog, NButton, NSwitch, NTag } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();
    const auth = getAuthData();

    const username = computed(() => auth?.username || "system");

    // ══════════════════════════════════════════════════════════════════
    // LIST DATA & FILTER
    // ══════════════════════════════════════════════════════════════════
    const tableData = ref<any[]>([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const searchQuery = ref("");

    const fetchData = async (page = 1) => {
      loading.value = true;
      try {
        let url = `${Config.UrlBackend}/api/crm/complaint-categories?page=${page}&pageSize=${pageSize.value}`;
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
      isActive: true,
      sortOrder: 0,
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
        isActive: row.isActive,
        sortOrder: row.sortOrder,
      };
      isModalOpen.value = true;
    };

    const submitForm = async () => {
      if (!formData.value.name.trim()) {
        message.warning("Nama kategori wajib diisi");
        return;
      }
      formLoading.value = true;
      try {
        const body = {
          name: formData.value.name.trim(),
          isActive: formData.value.isActive,
          sortOrder: formData.value.sortOrder,
          createdBy: username.value,
          updatedBy: username.value,
        };

        const url = isEditMode.value
          ? `${Config.UrlBackend}/api/crm/complaint-categories/${formData.value.id}`
          : `${Config.UrlBackend}/api/crm/complaint-categories`;
        const method = isEditMode.value ? "PUT" : "POST";

        const res = (await apiFetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan data");
        }

        message.success(
          isEditMode.value
            ? "Kategori berhasil diperbarui"
            : "Kategori berhasil ditambahkan",
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
    // QUICK ACTIONS (Toggle aktif / Delete)
    // ══════════════════════════════════════════════════════════════════
    const toggleActive = async (row: any) => {
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/crm/complaint-categories/${row.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: row.name,
              isActive: !row.isActive,
              sortOrder: row.sortOrder,
              updatedBy: username.value,
            }),
          },
        )) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengubah status");
        }

        message.success(row.isActive ? "Kategori dinonaktifkan" : "Kategori diaktifkan");
        await fetchData(currentPage.value);
      } catch (err) {
        message.error((err as Error).message);
      }
    };

    const deleteRow = (row: any) => {
      dialog.warning({
        title: "Konfirmasi Hapus",
        content: `Hapus kategori "${row.name}"?`,
        positiveText: "Hapus",
        negativeText: "Batal",
        onPositiveClick: async () => {
          try {
            const res = (await apiFetch(
              `${Config.UrlBackend}/api/crm/complaint-categories/${row.id}`,
              { method: "DELETE" },
            )) as Response;
            if (!res || !res.ok) {
              const err = res ? await res.json() : null;
              throw new Error(err?.message || "Gagal menghapus");
            }
            message.success("Kategori berhasil dihapus");
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
        width: 140,
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
        title: "Nama Kategori",
        key: "name",
        render(row: any) {
          return h(
            "span",
            { style: "font-weight:600;" },
            row.name,
          );
        },
      },
      {
        title: "Urutan",
        key: "sortOrder",
        width: 90,
        render: (row: any) => String(row.sortOrder),
      },
      {
        title: "Status",
        key: "isActive",
        width: 110,
        render(row: any) {
          return row.isActive
            ? h(NTag, { type: "success", size: "small" }, { default: () => "Aktif" })
            : h(NTag, { type: "default", size: "small" }, { default: () => "Nonaktif" });
        },
      },
      {
        title: "Aktif",
        key: "isActiveToggle",
        width: 90,
        render(row: any) {
          return h(NSwitch, {
            value: row.isActive,
            size: "small",
            "onUpdate:value": () => toggleActive(row),
          });
        },
      },
    ];

    onMounted(() => {
      fetchData(1);
    });

    return {
      tableData,
      loading,
      columns,
      currentPage,
      pageSize,
      total,
      searchQuery,
      handlePageChange,
      handleSearch,
      isModalOpen,
      isEditMode,
      formLoading,
      formData,
      openAddModal,
      submitForm,
    };
  },
});
