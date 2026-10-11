<template>
    <div>
        <h3>Reminder Minum Obat</h3>
        <p class="subtitle">
            Kelola pengingat minum obat yang dikirim otomatis melalui WhatsApp berdasarkan data Excel.
        </p>

        <n-alert type="success" :bordered="false" class="mb-3">
            ✅ <b>Kirim otomatis aktif</b> — reminder dengan tanggal kirim ≤ hari ini akan dikirim otomatis
            sesuai jam terjadwal (dicek setiap menit), tanpa perlu tombol manual.
        </n-alert>

        <div class="mr-grid">
            <!-- ── Upload Excel ── -->
            <n-card title="📥 Upload Data Excel" size="small">
                <n-alert type="info" :bordered="false" class="mb-2">
                    Template kolom: <b>Nama</b>, <b>NoWa</b>, <b>Waktu Kirim</b>, <b>Nama Obat</b>.<br />
                    Kolom "Waktu Kirim" bisa diisi: tanggal (<code>2026-08-20</code>), tanggal+jam
                    (<code>2026-08-20 08:00</code>), atau jam saja (<code>08:00</code> = dikirim hari ini pukul 08:00).<br />
                    Tombol <b>Acak Waktu Kirim</b> mengacak jam kirim otomatis mulai dari
                    waktu tombol diklik ({{ ACAK_PER_JAM_MIN }}–{{ ACAK_PER_JAM_MAX }} pesan per jam).
                    <n-button text type="primary" size="small" @click="downloadTemplate">
                        Unduh template contoh
                    </n-button>
                </n-alert>

                <div
                    class="dropzone"
                    :class="{ 'is-dragging': dragging }"
                    @dragover.prevent="dragging = true"
                    @dragleave="dragging = false"
                    @drop.prevent="onDrop"
                >
                    <input ref="fileInput" type="file" accept=".xlsx,.xls" hidden @change="onFileChange" />
                    <div class="dz-icon">📄</div>
                    <div>
                        Seret file Excel ke sini atau
                        <a class="dz-link" @click="pickFile">pilih file</a>
                    </div>
                    <div class="dz-hint">Format .xlsx / .xls</div>
                </div>

                <template v-if="previewRows.length">
                    <div class="preview-head">
                        <b>Pratinjau Data</b>
                        <span>Valid: {{ validCount() }} · Bermasalah: {{ previewRows.length - validCount() }}</span>
                    </div>
                    <n-data-table
                        :columns="previewColumns"
                        :data="previewRows"
                        size="small"
                        :max-height="260"
                        :scroll-x="640"
                    />

                    <div class="acak-row">
                        <div class="acak-row__label">
                            🎲 <b>Acak Waktu Kirim</b>
                            <span class="acak-hint">{{ ACAK_PER_JAM_MIN }}–{{ ACAK_PER_JAM_MAX }} pesan/jam</span>
                        </div>
                        <n-input-number
                            v-model:value="acakJamMulai"
                            :min="0"
                            :max="23"
                            size="small"
                            style="width: 108px"
                        />
                        <span class="acak-sep">s/d</span>
                        <n-input-number
                            v-model:value="acakJamSelesai"
                            :min="0"
                            :max="23"
                            size="small"
                            style="width: 108px"
                        />
                        <n-button
                            type="info"
                            secondary
                            size="small"
                            :disabled="validCount() === 0"
                            @click="doAcakWaktu"
                        >
                            Acak
                        </n-button>
                    </div>
                    <p v-if="acakSummary" class="acak-summary">{{ acakSummary }}</p>
                    <p v-else class="import-guard">
                        ⚠️ Klik <b>Acak</b> dulu sebelum import ke sistem.
                    </p>

                    <n-button
                        type="primary"
                        block
                        class="mt-3"
                        :loading="importing"
                        :disabled="validCount() === 0 || !acakResult"
                        @click="doImport"
                    >
                        Import {{ validCount() }} Data ke Sistem
                    </n-button>
                </template>
            </n-card>

            <!-- ── Daftar Reminder ── -->
            <n-card title="💊 Daftar Reminder" size="small">
                <div class="filter-row">
                    <n-select
                        v-model:value="filterStatus"
                        :options="statusFilterOptions"
                        clearable
                        placeholder="Status"
                        style="width: 150px"
                        @update:value="fetchData(1)"
                    />
                    <n-date-picker
                        v-model:value="filterTanggal"
                        type="date"
                        clearable
                        placeholder="Tanggal kirim"
                        style="width: 160px"
                        @update:value="fetchData(1)"
                    />
                    <n-input
                        v-model:value="searchQuery"
                        placeholder="Cari nama / nomor / obat..."
                        clearable
                        style="flex: 1; min-width: 170px"
                        @keyup.enter="fetchData(1)"
                    />
                    <n-button type="primary" quaternary @click="fetchData(1)">Cari</n-button>
                    <n-button type="warning" :loading="sendingDue" @click="sendDue">
                        🕒 Kirim Jatuh Tempo
                    </n-button>
                </div>

                <n-data-table
                    class="mt-3"
                    :columns="tableColumns"
                    :data="tableData"
                    :loading="tableLoading"
                    :max-height="460"
                    :scroll-x="960"
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

<script src="./MedicineReminder.ts" />

<style scoped>
.subtitle {
    color: #64748b;
    margin-top: 4px;
    margin-bottom: 14px;
}

.mr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: start;
}

.mb-2 {
    margin-bottom: 8px;
}

.mb-3 {
    margin-bottom: 12px;
}

.mt-3 {
    margin-top: 12px;
}

/* ── Dropzone ─────────────────────────────────────── */
.dropzone {
    border: 2px dashed #cbd5e1;
    border-radius: 10px;
    padding: 28px 16px;
    text-align: center;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f8fafc;
}

.dropzone:hover,
.dropzone.is-dragging {
    border-color: #2080f0;
    background: #f0f7ff;
    color: #2080f0;
}

.dz-icon {
    font-size: 32px;
    margin-bottom: 6px;
}

.dz-link {
    color: #2080f0;
    font-weight: 600;
}

.dz-hint {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
}

/* ── Pratinjau ────────────────────────────────────── */
.preview-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 14px 0 8px;
    color: #334155;
}

.preview-head span {
    font-size: 12px;
    color: #64748b;
}

/* ── Acak waktu kirim ─────────────────────────────── */
.acak-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
}

.acak-row__label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: auto;
    font-size: 13px;
    color: #334155;
}

.acak-hint,
.acak-sep {
    font-size: 12px;
    color: #64748b;
}

.acak-summary {
    margin: 8px 0 0;
    padding: 6px 10px;
    border: 1px solid #99f6e4;
    border-radius: 8px;
    background: #f0fdfa;
    color: #0f766e;
    font-size: 12px;
}

.import-guard {
    margin: 8px 0 0;
    padding: 6px 10px;
    border: 1px solid #fde68a;
    border-radius: 8px;
    background: #fffbeb;
    color: #92400e;
    font-size: 12px;
}

/* ── Filter ───────────────────────────────────────── */
.filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

/* ── Responsive ───────────────────────────────────── */
@media (max-width: 900px) {
    .mr-grid {
        grid-template-columns: 1fr;
    }
}
</style>
