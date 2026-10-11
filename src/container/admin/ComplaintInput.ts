import { defineComponent, ref, computed, onMounted, h } from "vue";
import { useMessage } from "naive-ui";
import { useRouter } from "vue-router";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";
import {
  toDateStr,
  useKategoriOptions,
  PRIORITAS_OPTIONS,
  prioritasTag,
  statusTag,
  statusType,
  statusLabel,
} from "@/hooks/useComplaint";

export default defineComponent({
  setup() {
    const message = useMessage();
    const router = useRouter();
    const auth = getAuthData();
    const username = ref(auth?.username || "public");
    const isAuthed = computed(() => !!auth?.token);

    const goLogin = () => router.push("/login");

    // Tab aktif halaman depan (input / cek status)
    const activeTab = ref("input");

    // Endpoint publik — berlaku untuk halaman tanpa login maupun yang sudah login
    const publicBase = `${Config.UrlBackend}/api/public`;
    const { kategoriOptions, fetchKategoriOptions, kategoriLabel } =
      useKategoriOptions(`${publicBase}/complaint-categories`);

    // ══════════════════════════════════════════════════════════════════
    // FORM INPUT KOMPLAIN
    // ══════════════════════════════════════════════════════════════════
    const formLoading = ref(false);

    const initForm = () => ({
      tanggal: new Date().toISOString().split("T")[0],
      namaPelanggan: "",
      perusahaan: "",
      telepon: "",
      email: "",
      kategori: "",
      prioritas: "sedang",
      subjek: "",
      deskripsi: "",
    });

    const formData = ref(initForm());

    // State sukses setelah submit (menampilkan nomor tiket)
    const submitted = ref(false);
    const lastTicket = ref("");

    const resetForm = () => {
      submitted.value = false;
      lastTicket.value = "";
      formData.value = initForm();
    };

    const submitForm = async () => {
      if (!formData.value.tanggal) {
        message.warning("Tanggal wajib diisi");
        return;
      }
      if (!formData.value.namaPelanggan) {
        message.warning("Nama pelanggan wajib diisi");
        return;
      }
      if (!formData.value.kategori) {
        message.warning("Kategori komplain wajib dipilih");
        return;
      }
      if (!formData.value.subjek) {
        message.warning("Subjek komplain wajib diisi");
        return;
      }

      formLoading.value = true;
      try {
        const body = {
          noTiket: "",
          tanggal: toDateStr(formData.value.tanggal),
          namaPelanggan: formData.value.namaPelanggan,
          perusahaan: formData.value.perusahaan,
          telepon: formData.value.telepon,
          email: formData.value.email,
          kategori: formData.value.kategori,
          prioritas: formData.value.prioritas,
          subjek: formData.value.subjek,
          deskripsi: formData.value.deskripsi,
          picId: null,
          targetSelesai: null,
          status: "baru",
          solusi: "",
          catatan: "",
          createdBy: username.value,
          updatedBy: username.value,
        };

        const res = (await apiFetch(`${publicBase}/complaints`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan data");
        }

        const result = await res.json();
        lastTicket.value = result?.data?.noTiket || "";
        submitted.value = true;
        formData.value = initForm();
        if (isAuthed.value) await fetchRecent();
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        formLoading.value = false;
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // CEK STATUS KOMPLAIN (via nomor tiket)
    // ══════════════════════════════════════════════════════════════════
    const statusNoTiket = ref("");
    const statusLoading = ref(false);
    const statusChecked = ref(false);
    const statusResult = ref<any>(null);

    const checkStatus = async () => {
      const noTiket = statusNoTiket.value.trim();
      if (!noTiket) {
        message.warning("Masukkan nomor tiket terlebih dahulu");
        return;
      }
      statusLoading.value = true;
      statusChecked.value = false;
      statusResult.value = null;
      try {
        const res = (await apiFetch(
          `${publicBase}/complaints/status?noTiket=${encodeURIComponent(noTiket)}`,
          { method: "GET" },
        )) as Response;
        if (res.status === 404) {
          statusChecked.value = true;
          statusResult.value = null;
          return;
        }
        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal memuat status");
        }
        const result = await res.json();
        statusResult.value = result.data;
        statusChecked.value = true;
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        statusLoading.value = false;
      }
    };

    const formatDateTime = (iso: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const statusDotClass = (status: string) => `dot-${status}`;

    // Setelah submit, langsung cek status tiket yang baru dibuat
    const goCheckStatus = () => {
      statusNoTiket.value = lastTicket.value;
      activeTab.value = "cek";
      checkStatus();
    };

    // ══════════════════════════════════════════════════════════════════
    // RIWAYAT INPUT TERAKHIR
    // ══════════════════════════════════════════════════════════════════
    const recentData = ref<any[]>([]);
    const recentLoading = ref(false);

    const fetchRecent = async () => {
      if (!isAuthed.value) return; // riwayat hanya untuk user yang login
      recentLoading.value = true;
      try {
        const res = (await apiFetch(
          `${Config.UrlBackend}/api/crm/complaints?page=1&pageSize=10`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        recentData.value = result.data || [];
      } catch {
        /* silent */
      } finally {
        recentLoading.value = false;
      }
    };

    const recentColumns = [
      {
        title: "No. Tiket",
        key: "noTiket",
        width: 140,
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
        title: "Kategori",
        key: "kategori",
        width: 130,
        render: (row: any) => kategoriLabel(row.kategori),
      },
      {
        title: "Prioritas",
        key: "prioritas",
        width: 110,
        render: (row: any) => prioritasTag(row.prioritas),
      },
      {
        title: "Status",
        key: "status",
        width: 110,
        render: (row: any) => statusTag(row.status),
      },
    ];

    onMounted(() => {
      fetchKategoriOptions();
      fetchRecent();
    });

    return {
      // form
      formData,
      formLoading,
      submitForm,
      kategoriOptions,
      prioritasOptions: PRIORITAS_OPTIONS,
      isAuthed,
      activeTab,
      statusType,
      statusLabel,
      // success state
      submitted,
      lastTicket,
      resetForm,
      goLogin,
      // cek status
      statusNoTiket,
      statusLoading,
      statusChecked,
      statusResult,
      checkStatus,
      formatDateTime,
      statusDotClass,
      goCheckStatus,
      // recent
      recentData,
      recentLoading,
      recentColumns,
    };
  },
});
