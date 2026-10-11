<template>
    <div>
        <h3>Kirim Pesan WhatsApp</h3>

        <div class="wa-grid">
            <!-- ── Kirim Pesan ── -->
            <n-card title="Kirim Pesan" size="small">
                <n-form label-placement="top">
                    <n-form-item label="Penerima (Pelanggan)">
                        <n-select
                            v-model:value="selectedRecipient"
                            :options="recipientOptions"
                            filterable
                            clearable
                            placeholder="Cari nama / nomor pelanggan..."
                            :loading="recipientLoading"
                        />
                    </n-form-item>

                    <n-form-item label="Pesan Cepat (Template)">
                        <div class="tpl-list">
                            <n-button
                                v-for="(tpl, i) in templates"
                                :key="i"
                                size="small"
                                quaternary
                                type="primary"
                                @click="applyTemplate(tpl)"
                            >
                                Template {{ i + 1 }}
                            </n-button>
                        </div>
                    </n-form-item>

                    <n-form-item label="Isi Pesan">
                        <n-input
                            v-model:value="messageText"
                            type="textarea"
                            :rows="6"
                            :maxlength="maxChars"
                            placeholder="Tulis pesan WhatsApp yang akan dikirim..."
                        />
                        <div class="char-count">
                            {{ messageText.length }} / {{ maxChars }}
                        </div>
                    </n-form-item>

                    <n-button
                        type="primary"
                        size="large"
                        block
                        :loading="sending"
                        @click="sendMessage"
                    >
                        📲 Kirim Pesan
                    </n-button>
                </n-form>
            </n-card>

            <!-- ── Riwayat ── -->
            <n-card title="Riwayat Pesan" size="small">
                <n-data-table
                    :columns="historyColumns"
                    :data="historyData"
                    :loading="historyLoading"
                    :max-height="480"
                    :scroll-x="700"
                    size="small"
                />
                <n-pagination
                    class="mt-3"
                    v-model:page="currentPage"
                    :page-count="Math.ceil(total / pageSize)"
                    @update:page="handlePageChange"
                />
            </n-card>
        </div>
    </div>
</template>

<script src="./WhatsAppManager.ts" />

<style scoped>
.wa-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: start;
}

.tpl-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.char-count {
    width: 100%;
    text-align: right;
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
}

.mt-3 {
    margin-top: 12px;
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 900px) {
    .wa-grid {
        grid-template-columns: 1fr;
    }
}
</style>
