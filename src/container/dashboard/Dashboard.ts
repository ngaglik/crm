import { defineComponent, ref, computed, onMounted, h } from "vue";
import { useMessage } from "naive-ui";
import { apiFetch } from "@/services/apiClient";
import { Config } from "@/constant/config";

type DashboardData = {
  totalComplaints: number;
  thisMonthComplaints: number;
  thisYearComplaints: number;
  statusSummary: {
    baru: number;
    diproses: number;
    selesai: number;
    ditolak: number;
  };
  resolutionRates: {
    label: string;
    resolved: number;
    total: number;
    rate: number;
  }[];
  monthlyComplaints: {
    month: number;
    count: number;
  }[];
  kategoriStats: {
    kategori: string;
    count: number;
    totalSelesai: number;
    terlambat: number;
  }[];
};

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default defineComponent({
  setup() {
    const message = useMessage();
    const loading = ref(false);
    const selectedYear = ref(new Date().getFullYear());
    const dashboard = ref<DashboardData | null>(null);

    const yearOptions = computed(() => {
      const y = new Date().getFullYear();
      return [
        { label: String(y - 1), value: y - 1 },
        { label: String(y), value: y },
        { label: String(y + 1), value: y + 1 },
      ];
    });

    const monthlyChartData = computed(() => {
      if (!dashboard.value) return [];
      const maxCount = Math.max(
        ...dashboard.value.monthlyComplaints.map((m) => m.count),
        1,
      );
      return dashboard.value.monthlyComplaints.map((m) => ({
        label: MONTHS_SHORT[m.month - 1],
        count: m.count,
        pct: (m.count / maxCount) * 100,
      }));
    });

    const resolutionData = computed(() => {
      if (!dashboard.value) return [];
      return dashboard.value.resolutionRates;
    });

    const kategoriColumns = [
      {
        title: "Kategori",
        key: "kategori",
        width: 180,
        render: (row: any) => row.kategori,
      },
      {
        title: "Jumlah Komplain",
        key: "count",
        width: 140,
        render: (row: any) => String(row.count),
      },
      {
        title: "Selesai",
        key: "totalSelesai",
        width: 100,
        render: (row: any) =>
          row.totalSelesai > 0
            ? h("span", { style: "color:#22c55e;font-weight:600;" }, String(row.totalSelesai))
            : "0",
      },
      {
        title: "Terlambat SLA",
        key: "terlambat",
        width: 130,
        render: (row: any) =>
          row.terlambat > 0
            ? h("span", { style: "color:#ef4444;font-weight:600;" }, String(row.terlambat))
            : "0",
      },
    ];

    const loadData = async () => {
      loading.value = true;
      try {
        const params = new URLSearchParams();
        params.set("year", String(selectedYear.value));

        const res = (await apiFetch(
          `${Config.UrlBackend}/api/crm/dashboard-summary?${params.toString()}`,
          { method: "GET" },
        )) as Response | void;

        if (!res) throw new Error("Unauthorized");
        if (!res.ok) throw new Error(`Server error (${res.status})`);

        const json: any = await res.json();
        dashboard.value = json.data ?? json.Data ?? null;
      } catch (e: any) {
        message.error(e?.message || "Gagal memuat data dashboard");
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadData();
    });

    return {
      loading,
      selectedYear,
      yearOptions,
      dashboard,
      monthlyChartData,
      resolutionData,
      kategoriColumns,
      loadData,
    };
  },
});
