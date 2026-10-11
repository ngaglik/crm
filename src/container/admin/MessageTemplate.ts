import { defineComponent, ref, computed, onMounted } from "vue";
import { useMessage, useDialog } from "naive-ui";
import { Config } from "@/constant/config";
import { apiFetch } from "@/services/apiClient";
import { getAuthData } from "@/services/authService";

// Penanda yang bisa dipakai di dalam template pesan.
const TOKENS = [
  { label: "[Nama Pasien]", value: "[Nama Pasien]" },
  { label: "[Hari, Tanggal]", value: "[Hari, Tanggal]" },
];

// Nilai contoh untuk pratinjau isi pesan.
const PREVIEW_VALUES: Record<string, string> = {
  "[Nama Pasien]": "Budi Santoso",
  "[Hari, Tanggal]": "Senin, 01 September 2026",
};

// Batas panjang pesan WhatsApp.
const MAX_CHARS = 4096;

interface MessageTemplate {
  id: number;
  code: string;
  name: string;
  description: string | null;
  content: string;
  defaultContent: string;
  updatedAt: string;
  updatedBy: string | null;
}

export default defineComponent({
  setup() {
    const message = useMessage();
    const dialog = useDialog();
    const auth = getAuthData();

    const username = computed(() => auth?.username || "system");
    const baseUrl = `${Config.UrlBackend}/api/crm/message-templates`;

    const templates = ref<MessageTemplate[]>([]);
    const drafts = ref<Record<string, string>>({});
    const loading = ref(false);
    const savingCode = ref<string | null>(null);

    // ── Ref textarea per template (untuk sisip penanda di posisi kursor) ──
    const textareaRefs: Record<string, any> = {};

    const setTextareaRef = (code: string) => (el: any) => {
      textareaRefs[code] = el;
    };

    const isDirty = (code: string) => {
      const tpl = templates.value.find((t) => t.code === code);
      if (!tpl) return false;
      return (drafts.value[code] ?? "") !== tpl.content;
    };

    // ══════════════════════════════════════════════════════════════════
    // LOAD
    // ══════════════════════════════════════════════════════════════════
    const fetchData = async () => {
      loading.value = true;
      try {
        const res = (await apiFetch(baseUrl, { method: "GET" })) as Response;
        if (!res || !res.ok) throw new Error("Gagal memuat template pesan");
        const result = await res.json();
        templates.value = result.data || [];
        drafts.value = Object.fromEntries(
          templates.value.map((t) => [t.code, t.content]),
        );
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        loading.value = false;
      }
    };

    // ══════════════════════════════════════════════════════════════════
    // PENANDA (PLACEHOLDER)
    // ══════════════════════════════════════════════════════════════════
    const insertToken = (code: string, token: string) => {
      const current = drafts.value[code] ?? "";
      const el = textareaRefs[code]?.textareaElRef as
        | HTMLTextAreaElement
        | null
        | undefined;

      if (!el) {
        drafts.value[code] = current + token;
        return;
      }

      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? start;
      drafts.value[code] = current.slice(0, start) + token + current.slice(end);

      // Kembalikan fokus & letakkan kursor setelah penanda yang disisipkan.
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    };

    const preview = (code: string) => {
      let text = drafts.value[code] ?? "";
      for (const [key, value] of Object.entries(PREVIEW_VALUES)) {
        text = text.split(key).join(value);
      }
      return text;
    };

    // ══════════════════════════════════════════════════════════════════
    // SIMPAN / RESET
    // ══════════════════════════════════════════════════════════════════
    const applySaved = (code: string, data: MessageTemplate) => {
      const index = templates.value.findIndex((t) => t.code === code);
      if (index >= 0) templates.value[index] = data;
      drafts.value[code] = data.content;
    };

    const save = async (tpl: MessageTemplate) => {
      const content = drafts.value[tpl.code] ?? "";
      if (!content.trim()) {
        message.warning("Isi template wajib diisi");
        return;
      }

      savingCode.value = tpl.code;
      try {
        const res = (await apiFetch(`${baseUrl}/${tpl.code}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, updatedBy: username.value }),
        })) as Response;

        if (!res || !res.ok) {
          const err = res ? await res.json() : null;
          throw new Error(err?.message || "Gagal menyimpan template");
        }

        const result = await res.json();
        applySaved(tpl.code, result.data);
        message.success(`Template "${tpl.name}" berhasil disimpan`);
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        savingCode.value = null;
      }
    };

    const resetToDefault = (tpl: MessageTemplate) => {
      dialog.warning({
        title: "Konfirmasi Reset",
        content: `Kembalikan template "${tpl.name}" ke isi default?`,
        positiveText: "Reset",
        negativeText: "Batal",
        onPositiveClick: async () => {
          savingCode.value = tpl.code;
          try {
            const res = (await apiFetch(`${baseUrl}/${tpl.code}/reset`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updatedBy: username.value }),
            })) as Response;

            if (!res || !res.ok) {
              const err = res ? await res.json() : null;
              throw new Error(err?.message || "Gagal mereset template");
            }

            const result = await res.json();
            applySaved(tpl.code, result.data);
            message.success(`Template "${tpl.name}" dikembalikan ke default`);
          } catch (err) {
            message.error((err as Error).message);
          } finally {
            savingCode.value = null;
          }
        },
      });
    };

    // ══════════════════════════════════════════════════════════════════
    // UTIL
    // ══════════════════════════════════════════════════════════════════
    const formatDateTime = (iso: string) => {
      if (!iso) return "-";
      return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    onMounted(fetchData);

    return {
      tokens: TOKENS,
      maxChars: MAX_CHARS,

      templates,
      drafts,
      loading,
      savingCode,

      setTextareaRef,
      isDirty,
      insertToken,
      preview,
      save,
      resetToDefault,
      formatDateTime,
    };
  },
});
