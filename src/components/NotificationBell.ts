import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";
import { NotificationsOutline } from "@vicons/ionicons5";

export default defineComponent({
  setup() {
    const auth = getAuthData();
    const employeeId = auth?.employee?.id ?? null;

    const baseUrl = `${Config.UrlBackend}/api/crm/complaint-notifications`;

    const unreadCount = ref(0);
    const items = ref<any[]>([]);
    const loading = ref(false);
    let timer: any = null;

    const fetchUnread = async () => {
      if (employeeId == null) return;
      try {
        const res = (await apiFetch(
          `${baseUrl}/unread-count?employeeId=${employeeId}`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        unreadCount.value = result.count ?? 0;
      } catch {
        /* silent */
      }
    };

    const fetchItems = async () => {
      if (employeeId == null) return;
      loading.value = true;
      try {
        const res = (await apiFetch(
          `${baseUrl}?employeeId=${employeeId}&page=1&pageSize=20`,
          { method: "GET" },
        )) as Response;
        if (!res || !res.ok) return;
        const result = await res.json();
        items.value = result.data || [];
        unreadCount.value = result.unreadCount ?? 0;
      } catch {
        /* silent */
      } finally {
        loading.value = false;
      }
    };

    const onShowChange = (visible: boolean) => {
      if (visible) fetchItems();
    };

    const markRead = async (item: any) => {
      if (item.isRead) return;
      try {
        const res = (await apiFetch(`${baseUrl}/${item.id}/read`, {
          method: "PUT",
        })) as Response;
        if (!res || !res.ok) return;
        item.isRead = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      } catch {
        /* silent */
      }
    };

    const markAllRead = async () => {
      try {
        const res = (await apiFetch(
          `${baseUrl}/read-all?employeeId=${employeeId}`,
          { method: "PUT" },
        )) as Response;
        if (!res || !res.ok) return;
        items.value.forEach((i) => (i.isRead = true));
        unreadCount.value = 0;
      } catch {
        /* silent */
      }
    };

    const formatTime = (iso: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Baru saja";
      if (mins < 60) return `${mins} menit lalu`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} jam lalu`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days} hari lalu`;
      return d.toLocaleDateString("id-ID");
    };

    onMounted(() => {
      fetchUnread();
      timer = setInterval(fetchUnread, 60000); // polling setiap 60 detik
    });

    onUnmounted(() => {
      if (timer) clearInterval(timer);
    });

    return {
      employeeId,
      unreadCount,
      items,
      loading,
      onShowChange,
      markRead,
      markAllRead,
      formatTime,
      NotificationsOutline,
    };
  },
});
