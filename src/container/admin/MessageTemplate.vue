<template>
    <div class="tpl-page">
        <h3>Template Pesan</h3>
        <p class="subtitle">
            Atur isi pesan WhatsApp yang dikirim sistem. Gunakan penanda
            <code>[Nama Pasien]</code> dan <code>[Hari, Tanggal]</code> agar
            terisi otomatis sesuai data pengiriman.
        </p>

        <n-spin :show="loading">
            <n-empty
                v-if="!loading && templates.length === 0"
                description="Belum ada template pesan"
            />

            <div class="tpl-grid">
                <n-card
                    v-for="tpl in templates"
                    :key="tpl.code"
                    size="small"
                    :title="tpl.name"
                >
                    <template #header-extra>
                        <n-tag
                            v-if="isDirty(tpl.code)"
                            type="warning"
                            size="small"
                        >
                            Belum disimpan
                        </n-tag>
                    </template>

                    <p v-if="tpl.description" class="tpl-desc">
                        {{ tpl.description }}
                    </p>

                    <n-form label-placement="top">
                        <n-form-item label="Isi Template">
                            <n-input
                                :ref="setTextareaRef(tpl.code)"
                                v-model:value="drafts[tpl.code]"
                                type="textarea"
                                :rows="8"
                                :maxlength="maxChars"
                                show-count
                                placeholder="Tulis isi template pesan..."
                            />
                        </n-form-item>
                    </n-form>

                    <n-space align="center" size="small" class="token-row">
                        <span class="token-label">Sisipkan penanda:</span>
                        <n-button
                            v-for="token in tokens"
                            :key="token.value"
                            size="tiny"
                            quaternary
                            type="primary"
                            @click="insertToken(tpl.code, token.value)"
                        >
                            {{ token.label }}
                        </n-button>
                    </n-space>

                    <div class="preview">
                        <div class="preview-label">Pratinjau</div>
                        <pre class="preview-body">{{ preview(tpl.code) }}</pre>
                    </div>

                    <div class="tpl-footer">
                        <n-space>
                            <n-button
                                type="primary"
                                :loading="savingCode === tpl.code"
                                :disabled="!isDirty(tpl.code)"
                                @click="save(tpl)"
                            >
                                Simpan
                            </n-button>
                            <n-button
                                :disabled="savingCode === tpl.code"
                                @click="resetToDefault(tpl)"
                            >
                                Reset ke Default
                            </n-button>
                        </n-space>
                        <span class="tpl-meta">
                            Terakhir diubah {{ formatDateTime(tpl.updatedAt) }}
                            <template v-if="tpl.updatedBy">
                                oleh {{ tpl.updatedBy }}
                            </template>
                        </span>
                    </div>
                </n-card>
            </div>
        </n-spin>
    </div>
</template>

<script src="./MessageTemplate.ts" />

<style scoped>
.subtitle {
    margin: 4px 0 16px;
    font-size: 13px;
    color: var(--n-text-color-3, #94a3b8);
}

.subtitle code {
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--n-code-color, rgba(128, 128, 128, 0.16));
    font-size: 12px;
}

.tpl-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.tpl-desc {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--n-text-color-3, #94a3b8);
}

.token-row {
    margin-bottom: 12px;
}

.token-label {
    font-size: 12px;
    color: var(--n-text-color-3, #94a3b8);
}

.preview {
    padding: 10px 12px;
    border: 1px dashed var(--n-border-color, #e8e8e8);
    border-radius: 6px;
    background: var(--n-code-color, rgba(128, 128, 128, 0.08));
}

.preview-label {
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--n-text-color-3, #94a3b8);
}

.preview-body {
    margin: 0;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--n-text-color, #333);
}

.tpl-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 16px;
}

.tpl-meta {
    font-size: 12px;
    color: var(--n-text-color-3, #94a3b8);
}
</style>
