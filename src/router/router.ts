import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "@/container/dashboard/Dashboard.vue";
import ComplaintInput from "@/container/admin/ComplaintInput.vue";
import ComplaintHandling from "@/container/admin/ComplaintHandling.vue";
import ComplaintCategoryManager from "@/container/admin/ComplaintCategoryManager.vue";
import CustomerSatisfaction from "@/container/admin/CustomerSatisfaction.vue";
import WhatsAppManager from "@/container/admin/WhatsAppManager.vue";
import MedicineReminder from "@/container/admin/MedicineReminder.vue";
import EncounterReminder from "@/container/admin/EncounterReminder.vue";
import MessageTemplate from "@/container/admin/MessageTemplate.vue";
import Login from "@/components/Login.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: ComplaintInput,
      meta: { public: true },
    },
    {
      path: "/login",
      component: Login,
      meta: { public: true },
    },
    {
      path: "/dashboard",
      component: Dashboard,
    },
    {
      path: "/complaint-input",
      component: ComplaintInput,
    },
    {
      path: "/complaint-handling",
      component: ComplaintHandling,
    },
    {
      path: "/complaint-categories",
      component: ComplaintCategoryManager,
    },
    {
      path: "/customer-satisfaction",
      component: CustomerSatisfaction,
    },
    {
      path: "/whatsapp",
      component: WhatsAppManager,
    },
    {
      path: "/medicine-reminder",
      component: MedicineReminder,
    },
    {
      path: "/encounter-reminder",
      component: EncounterReminder,
    },
    {
      path: "/message-templates",
      component: MessageTemplate,
    },
  ],
});

export default router;
