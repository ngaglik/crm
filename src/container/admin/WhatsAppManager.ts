import { defineComponent, ref, computed, onMounted, onUnmounted, h } from "vue";
import { useMessage, NTag, NButton } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

const TEMPLATES = [
  "Yth. {nama},\n\nTerima kasih atas pengaduan Anda. Kami informasikan bahwa pengaduan Anda sedang dalam proses penanganan tim kami.\n\nTerima kasih.",
  "Yth. {nama},\n\nPengaduan Anda telah selesai kami tangani. Terima kasih atas kesabaran dan kepercayaan Anda.\n\nSalam hormat.",
  "Yth. {nama},\n\nMohon informasikan keluhan Anda secara lebih detail agar dapat kami bantu proses lebih lanjut.\n\nTerima kasih.",
];

const MAX_CHARS = 1000;

export default defineComponent({
  setup() {
    const message = useMessage();
    const auth = getAuthData();
    const username = ref(auth?.username || "system");

    const baseUrl = `${Config.UrlBackend}/api/crm/whatsapp`;

    // ── Penerima ─────────────────────────────────────────────────────────
    const recipientOptions = ref<any[]>([]);
    const recipientLoading = ref(false);

    const fetchRecipients = async () => {
      recipientLoading.value = true;
      try {
        const res = (await apiFetch(
          `${baseUrl}/recipients`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        recipientOptions.value = (result.data || []).map((x: any) => ({
          label: `${x.name} (${x.phone})`,
          value: x.phone,
          name: x.name,
          phone: x.phone,
          complaintId: x.complaintId,
        }));
      } catch {
        /* silent */
      } finally {
        recipientLoading.value = false;
      }
    };

    // ── Form kirim ────────────────────────────────────────────────────────
    const selectedRecipient = ref<string | null>(null);
    const messageText = ref("");
    const sending = ref(false);

    const selectedName = computed(() => {
      const found = recipientOptions.value.find(
        (o) => o.value === selectedRecipient.value,
      );
      return found?.name || "";
    });

    const applyTemplate = (tpl: string) => {
      messageText.value = tpl.replace("{nama}", selectedName.value || "Bapak/Ibu");
    };

    const sendMessage = async () => {
      const rec = recipientOptions.value.find(
        (o) => o.value === selectedRecipient.value,
      );
      if (!rec) {
        message.warning("Pilih penerima terlebih dahulu");
        return;
      }
      if (!messageText.value.trim()) {
        message.warning("Isi pesan terlebih dahulu");
        return;
      }

      sending.value = true;
      try {
        const res = (await apiFetch(`${baseUrl}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            complaintId: rec.complaintId,
            name: rec.name,
            phone: rec.phone,
            message: messageText.value,
            createdBy: username.value,
          }),
        })) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal mengirim pesan");
        }

        const result = await res.json();
        const status = result?.data?.status;
        if (status === "terkirim") {
          message.success("Pesan berhasil terkirim");
        } else if (status === "tercatat") {
          message.warning("Pesan tercatat (gateway WhatsApp belum dikonfigurasi)");
        } else {
          message.error("Pesan gagal terkirim. Periksa gateway WhatsApp.");
        }

        messageText.value = "";
        await fetchHistory();
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        sending.value = false;
      }
    };

    // ── Riwayat ──────────────────────────────────────────────────────────
    const historyData = ref<any[]>([]);
    const historyLoading = ref(false);
    const currentPage = ref(1);
    const pageSize = ref(10);
    const total = ref(0);

    const fetchHistory = async (page = 1) => {
      historyLoading.value = true;
      try {
        const res = (await apiFetch(
          `${baseUrl}/messages?page=${page}&pageSize=${pageSize.value}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        historyData.value = result.data || [];
        currentPage.value = result.page || 1;
        total.value = result.total || 0;
      } catch {
        /* silent */
      } finally {
        historyLoading.value = false;
      }
    };

    const handlePageChange = (page: number) => {
      currentPage.value = page;
      fetchHistory(page);
    };

    const statusTag = (status: string) => {
      let type: "info" | "success" | "error" = "info";
      let label = "Tercatat";
      if (status === "terkirim") {
        type = "success";
        label = "Terkirim";
      } else if (status === "gagal") {
        type = "error";
        label = "Gagal";
      }
      return h(NTag, { type, size: "small" }, { default: () => label });
    };

    const formatDateTime = (iso: string) => {
      if (!iso) return "";
      return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const historyColumns = [
      {
        title: "Waktu",
        key: "createdAt",
        width: 150,
        render: (row: any) => formatDateTime(row.createdAt),
      },
      { title: "Penerima", key: "recipientName", width: 160 },
      { title: "Nomor", key: "recipientPhone", width: 140 },
      {
        title: "Pesan",
        key: "message",
        ellipsis: { tooltip: true },
      },
      {
        title: "Status",
        key: "status",
        width: 100,
        render: (row: any) => statusTag(row.status),
      },
    ];

    onMounted(() => {
      fetchRecipients();
      fetchHistory(1);
    });

    onUnmounted(() => {
      /* cleanup */
    });

    return {
      // recipients
      recipientOptions,
      recipientLoading,
      // form
      selectedRecipient,
      selectedName,
      messageText,
      sending,
      templates: TEMPLATES,
      maxChars: MAX_CHARS,
      applyTemplate,
      sendMessage,
      // history
      historyData,
      historyLoading,
      historyColumns,
      currentPage,
      pageSize,
      total,
      handlePageChange,
    };
  },
});
