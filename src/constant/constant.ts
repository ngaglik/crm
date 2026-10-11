export const LAYOUT_ITEMS = [
  {
    label: "Dashboard",
    key: "/dashboard",
  },
  {
    label: "Input Komplain",
    key: "/complaint-input",
  },
  {
    label: "Penanganan Komplain",
    key: "/complaint-handling",
  },
  {
    label: "Kirim WhatsApp",
    key: "/whatsapp",
  },
  {
    label: "Reminder Obat",
    key: "/medicine-reminder",
  },
  {
    label: "Reminder Kontrol",
    key: "/encounter-reminder",
  },
  {
    label: "Pengaturan",
    key: "pengaturan",
    children: [
      {
        label: "Master Data",
        key: "master-data",
        children: [
          {
            label: "Kategori Komplain",
            key: "/complaint-categories",
          },
        ],
      },
      {
        label: "Template Pesan",
        key: "/message-templates",
      },
    ],
  },
];
