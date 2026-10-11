<template>
    <div>
        <h3>Kepuasan Pelanggan</h3>

        <!-- Filter & Tambah -->
        <n-space class="mb-3" align="center" justify="space-between" wrap>
            <n-space align="center" wrap>
                <n-button type="primary" @click="openAddModal">
                    + Tambah Data
                </n-button>
                <n-input
                    v-model:value="searchQuery"
                    placeholder="Cari nama"
                    clearable
                    style="width: 220px"
                    @keyup.enter="handleSearch"
                    @clear="handleSearch"
                />
                <n-button @click="handleSearch">Cari</n-button>
            </n-space>
            <n-tag type="info">Total: {{ total }}</n-tag>
        </n-space>

        <!-- Tabel utama -->
        <n-data-table
            :columns="columns"
            :data="tableData"
            :loading="loading"
            :max-height="460"
            size="small"
        />

        <!-- Paginasi -->
        <n-pagination
            class="mt-3"
            v-model:page="currentPage"
            :page-count="Math.ceil(total / pageSize)"
            @update:page="handlePageChange"
        />
    </div>

    <!-- ══ Modal Form Add/Edit ═════════════════════════════════════════ -->
    <n-modal
        v-model:show="isModalOpen"
        preset="card"
        :title="isEditMode ? 'Edit Kepuasan Pelanggan' : 'Tambah Kepuasan Pelanggan'"
        :style="{ width: '560px' }"
    >
        <n-spin :show="formLoading" description="Memuat...">
            <n-form :model="formData" label-placement="top">
                <n-form-item label="Nama" path="name">
                    <n-input
                        v-model:value="formData.name"
                        placeholder="Nama survei / periode kepuasan pelanggan"
                    />
                </n-form-item>

                <n-grid :cols="2" :x-gap="12">
                    <n-form-item-grid-item label="Tanggal Mulai" path="dateStart">
                        <n-date-picker
                            v-model:value="formData.dateStart"
                            value-format="yyyy-MM-dd"
                            type="date"
                            style="width: 100%"
                        />
                    </n-form-item-grid-item>

                    <n-form-item-grid-item label="Tanggal Selesai" path="dateEnd">
                        <n-date-picker
                            v-model:value="formData.dateEnd"
                            value-format="yyyy-MM-dd"
                            type="date"
                            style="width: 100%"
                        />
                    </n-form-item-grid-item>
                </n-grid>

                <n-form-item label="Dokumen PDF">
                    <n-upload
                        :max="1"
                        accept=".pdf,application/pdf"
                        :default-upload="false"
                        @change="handleFileChange"
                    >
                        <n-button>Pilih File PDF</n-button>
                    </n-upload>
                    <div v-if="isEditMode && !formData.file && formData.fileName" class="file-info">
                        <n-text depth="3">
                            Dokumen saat ini: {{ formData.fileName }} (pilih file baru untuk mengganti)
                        </n-text>
                    </div>
                    <div v-else-if="formData.file" class="file-info">
                        <n-text depth="3">File dipilih: {{ formData.file.name }}</n-text>
                    </div>
                </n-form-item>
            </n-form>
        </n-spin>

        <template #footer>
            <n-space justify="end">
                <n-button @click="isModalOpen = false">Batal</n-button>
                <n-button type="primary" :loading="formLoading" @click="submitForm">
                    {{ isEditMode ? 'Simpan Perubahan' : 'Simpan Data' }}
                </n-button>
            </n-space>
        </template>
    </n-modal>

    <!-- ══ Modal Preview PDF ═══════════════════════════════════════════ -->
    <n-modal
        v-model:show="isPreviewOpen"
        preset="card"
        :title="previewName"
        :style="{ width: '900px' }"
    >
        <div class="preview-wrapper">
            <iframe
                v-if="previewUrl"
                :src="previewUrl"
                title="Preview PDF"
            />
            <n-empty v-else description="Dokumen tidak dapat ditampilkan" />
        </div>
        <template #footer>
            <n-space justify="end">
                <n-button @click="isPreviewOpen = false">Tutup</n-button>
            </n-space>
        </template>
    </n-modal>
</template>

<script src="./CustomerSatisfaction.ts" />

<style scoped>
.mb-3 { margin-bottom: 12px; }
.mt-3 { margin-top: 12px; }

.file-info {
    margin-top: 8px;
    width: 100%;
}

.preview-wrapper {
    height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-wrapper iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 6px;
    background: #f5f6f8;
}
</style>
