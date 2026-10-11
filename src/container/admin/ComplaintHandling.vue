<template>
    <div>
        <h3>Penanganan Komplain</h3>

        <!-- Filter -->
        <div class="filter-bar">
            <n-input
                v-model:value="searchQuery"
                class="f-item f-item--search"
                placeholder="Cari no. tiket / pelanggan / subjek"
                clearable
                @keyup.enter="handleFilter"
                @clear="handleFilter"
            />
            <n-select
                v-model:value="filterStatus"
                class="f-item"
                :options="statusOptions"
                placeholder="Semua Status"
                clearable
                @update:value="handleFilter"
            />
            <n-select
                v-model:value="filterKategori"
                class="f-item"
                :options="kategoriOptions"
                placeholder="Semua Kategori"
                clearable
                @update:value="handleFilter"
            />
            <n-select
                v-model:value="filterPrioritas"
                class="f-item"
                :options="prioritasOptions"
                placeholder="Semua Prioritas"
                clearable
                @update:value="handleFilter"
            />
            <n-date-picker
                v-model:value="filterTanggal"
                class="f-item"
                value-format="yyyy-MM-dd"
                type="date"
                placeholder="Pilih Tanggal"
                clearable
                @update:value="handleFilter"
            />
            <div class="f-item f-item--actions">
                <n-button @click="resetFilter">Reset Filter</n-button>
                <n-tag type="info">Total: {{ total }}</n-tag>
            </div>
        </div>

        <!-- Tabel desktop -->
        <n-data-table
            v-if="!isMobile"
            :columns="columns"
            :data="tableData"
            :loading="loading"
            :max-height="460"
            :scroll-x="1100"
            size="small"
        />

        <!-- Kartu mobile -->
        <n-spin v-else :show="loading" description="Memuat...">
            <div v-if="tableData.length > 0" class="mc-list">
                <div v-for="row in tableData" :key="row.id" class="mc-card">
                    <div class="mc-card__top">
                        <span class="mc-card__ticket">{{ row.noTiket || "-" }}</span>
                        <n-tag :type="statusType(row.status)" size="small">
                            {{ statusLabel(row.status) }}
                        </n-tag>
                    </div>
                    <div class="mc-card__name">{{ row.namaPelanggan }}</div>
                    <div class="mc-card__subjek">{{ row.subjek }}</div>

                    <div class="mc-card__meta">
                        <div class="mc-meta">
                            <span class="mc-meta__k">Tanggal</span>
                            <span>{{ row.tanggal }}</span>
                        </div>
                        <div class="mc-meta">
                            <span class="mc-meta__k">Kategori</span>
                            <span>{{ kategoriLabel(row.kategori) }}</span>
                        </div>
                        <div class="mc-meta">
                            <span class="mc-meta__k">Prioritas</span>
                            <span>
                                <n-tag :type="prioritasType(row.prioritas)" size="small">
                                    {{ prioritasLabel(row.prioritas) }}
                                </n-tag>
                            </span>
                        </div>
                        <div class="mc-meta">
                            <span class="mc-meta__k">PIC</span>
                            <span>{{ row.picName || "-" }}</span>
                        </div>
                        <div class="mc-meta">
                            <span class="mc-meta__k">Target SLA</span>
                            <span :class="slaClass(row)">{{ slaText(row) }}</span>
                        </div>
                    </div>

                    <div class="mc-card__actions">
                        <n-button size="small" type="info" @click="openDetailModal(row)">
                            Detail
                        </n-button>
                        <template v-if="!isLocked(row)">
                            <n-button size="small" type="primary" @click="openHandlingModal(row)">
                                Proses
                            </n-button>
                            <n-button size="small" type="error" @click="deleteRow(row)">
                                Hapus
                            </n-button>
                        </template>
                    </div>
                </div>
            </div>
            <n-empty v-else-if="!loading" description="Tidak ada data komplain" />
        </n-spin>

        <!-- Paginasi -->
        <n-pagination
            class="mt-3"
            v-model:page="currentPage"
            :page-count="Math.ceil(total / pageSize)"
            :page-slot="isMobile ? 5 : 7"
            @update:page="handlePageChange"
        />
    </div>

    <!-- ══ Modal Detail (Read-Only) ═════════════════════════════════════ -->
    <n-modal
        v-model:show="isDetailOpen"
        preset="card"
        title="Detail Komplain"
        :style="isMobile ? { width: '95vw' } : { width: '720px' }"
    >
        <n-spin :show="formLoading" description="Memuat...">
            <n-descriptions
                v-if="detailData"
                :column="isMobile ? 1 : 2"
                label-placement="top"
                bordered
                size="small"
            >
                <n-descriptions-item label="No. Tiket">
                    <span class="mono">{{ detailData.noTiket }}</span>
                </n-descriptions-item>
                <n-descriptions-item label="Tanggal">{{ detailData.tanggal }}</n-descriptions-item>
                <n-descriptions-item label="Nama Pelanggan">{{ detailData.namaPelanggan }}</n-descriptions-item>
                <n-descriptions-item label="Perusahaan">{{ detailData.perusahaan || "-" }}</n-descriptions-item>
                <n-descriptions-item label="Telepon">{{ detailData.telepon || "-" }}</n-descriptions-item>
                <n-descriptions-item label="Email">{{ detailData.email || "-" }}</n-descriptions-item>
                <n-descriptions-item label="Kategori">{{ detailData.kategori }}</n-descriptions-item>
                <n-descriptions-item label="Prioritas">{{ detailData.prioritas }}</n-descriptions-item>
                <n-descriptions-item label="Subjek" :span="isMobile ? 1 : 2">{{ detailData.subjek }}</n-descriptions-item>
                <n-descriptions-item label="Deskripsi" :span="isMobile ? 1 : 2">{{ detailData.deskripsi || "-" }}</n-descriptions-item>
                <n-descriptions-item label="PIC / Penanggungjawab">{{ detailData.picName || "-" }}</n-descriptions-item>
                <n-descriptions-item label="Target Selesai (SLA)">{{ detailData.targetSelesai || "-" }}</n-descriptions-item>
                <n-descriptions-item label="Status">{{ detailData.status }}</n-descriptions-item>
                <n-descriptions-item label="Solusi">{{ detailData.solusi || "-" }}</n-descriptions-item>
                <n-descriptions-item label="Catatan" :span="isMobile ? 1 : 2">{{ detailData.catatan || "-" }}</n-descriptions-item>
            </n-descriptions>
        </n-spin>

        <template #footer>
            <n-space justify="end">
                <n-button @click="isDetailOpen = false">Tutup</n-button>
                <n-button
                    v-if="detailData && (detailData.status === 'baru' || detailData.status === 'diproses')"
                    type="success"
                    @click="resolveForm(detailData.id)"
                >
                    ✓ Selesaikan Komplain
                </n-button>
            </n-space>
        </template>
    </n-modal>

    <!-- ══ Modal Penanganan ═════════════════════════════════════════════ -->
    <n-modal
        v-model:show="isHandlingOpen"
        preset="card"
        :title="`Penanganan Komplain - ${handlingForm.noTiket}`"
        :style="isMobile ? { width: '95vw' } : { width: '640px' }"
    >
        <n-spin :show="formLoading" description="Memuat...">
            <n-form :model="handlingForm" label-placement="top">
                <n-alert type="info" :show-icon="false" class="mb-3">
                    <strong>{{ handlingForm.namaPelanggan }}</strong>
                    — {{ handlingForm.kategori }} · {{ handlingForm.prioritas }} · {{ handlingForm.subjek }}
                </n-alert>

                <n-grid :cols="isMobile ? 1 : 2" :x-gap="12">
                    <n-form-item-grid-item label="PIC / Penanggungjawab" path="picId">
                        <n-select
                            v-model:value="handlingForm.picId"
                            :options="picOptions"
                            filterable
                            placeholder="Ketik nama untuk mencari..."
                            clearable
                            @search="(q) => searchEmployees(q)"
                        />
                    </n-form-item-grid-item>

                    <n-form-item-grid-item label="Target Selesai (SLA)" path="targetSelesai">
                        <n-date-picker
                            v-model:value="handlingForm.targetSelesai"
                            value-format="yyyy-MM-dd"
                            type="date"
                            style="width: 100%"
                        />
                    </n-form-item-grid-item>

                    <n-form-item-grid-item label="Status Penanganan" path="status">
                        <n-select
                            v-model:value="handlingForm.status"
                            :options="statusOptions"
                        />
                    </n-form-item-grid-item>
                </n-grid>

                <n-form-item label="Solusi / Tindakan">
                    <n-input
                        v-model:value="handlingForm.solusi"
                        type="textarea"
                        :rows="4"
                        placeholder="Jelaskan solusi atau tindakan yang telah dilakukan..."
                    />
                </n-form-item>

                <n-form-item label="Catatan Internal">
                    <n-input
                        v-model:value="handlingForm.catatan"
                        type="textarea"
                        :rows="3"
                        placeholder="Catatan tambahan untuk tim internal..."
                    />
                </n-form-item>
            </n-form>
        </n-spin>

        <template #footer>
            <n-space justify="end">
                <n-button @click="isHandlingOpen = false">Batal</n-button>
                <n-button type="primary" :loading="formLoading" @click="submitHandling">
                    Simpan Penanganan
                </n-button>
            </n-space>
        </template>
    </n-modal>
</template>

<script src="./ComplaintHandling.ts" />

<style scoped>
.mb-3 { margin-bottom: 12px; }
.mt-3 { margin-top: 12px; }

.mono {
    font-family: monospace;
    font-weight: 600;
}

/* ── Filter Bar ────────────────────────────────────────────── */
.filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.f-item {
    width: 180px;
}

.f-item--search {
    width: 240px;
}

.f-item--actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
}

/* ── Kartu Mobile ─────────────────────────────────────────── */
.mc-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mc-card {
    background: var(--n-color, #fff);
    border: 1px solid var(--n-border-color, #e8e8e8);
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.mc-card__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
}

.mc-card__ticket {
    font-family: monospace;
    font-weight: 700;
    font-size: 13px;
    color: var(--n-text-color, #333);
}

.mc-card__name {
    font-size: 15px;
    font-weight: 700;
    color: var(--n-text-color, #1e293b);
}

.mc-card__subjek {
    font-size: 13px;
    color: var(--n-text-color-2, #475569);
    margin: 2px 0 10px;
}

.mc-card__meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    padding: 10px 0;
    border-top: 1px dashed var(--n-border-color, #e8e8e8);
}

.mc-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.mc-meta__k {
    font-size: 11px;
    color: var(--n-text-color-3, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.mc-meta span:last-child {
    font-size: 13px;
    font-weight: 600;
    color: var(--n-text-color, #334155);
    overflow-wrap: break-word;
}

.mc-meta .sla-late {
    color: #ef4444;
    font-weight: 700;
}

.mc-meta .sla-today {
    color: #f59e0b;
    font-weight: 700;
}

.mc-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid var(--n-border-color, #eee);
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 768px) {
    .f-item,
    .f-item--search {
        width: 100%;
    }

    .f-item--actions {
        width: 100%;
        justify-content: space-between;
        margin-left: 0;
    }
}
</style>
