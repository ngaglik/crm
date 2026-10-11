<template>
    <div>
        <h3>Master Data Kategori Komplain</h3>

        <!-- Filter & Tambah -->
        <n-space class="mb-3" align="center" justify="space-between" wrap>
            <n-space align="center" wrap>
                <n-button type="primary" @click="openAddModal">
                    + Tambah Kategori
                </n-button>
                <n-input
                    v-model:value="searchQuery"
                    placeholder="Cari nama kategori"
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

    <!-- ══ Modal Form Add/Edit Kategori ════════════════════════════════ -->
    <n-modal
        v-model:show="isModalOpen"
        preset="card"
        :title="isEditMode ? 'Edit Kategori Komplain' : 'Tambah Kategori Komplain'"
        :style="{ width: '480px' }"
    >
        <n-form :model="formData" label-placement="top">
            <n-form-item label="Nama Kategori" path="name">
                <n-input
                    v-model:value="formData.name"
                    placeholder="Contoh: Layanan, Produk, Ganti Rugi..."
                />
            </n-form-item>

            <n-form-item label="Urutan Tampil">
                <n-input-number
                    v-model:value="formData.sortOrder"
                    :min="0"
                    style="width: 100%"
                />
            </n-form-item>

            <n-form-item label="Aktif">
                <n-switch v-model:value="formData.isActive" />
            </n-form-item>
        </n-form>

        <template #footer>
            <n-space justify="end">
                <n-button @click="isModalOpen = false">Batal</n-button>
                <n-button type="primary" :loading="formLoading" @click="submitForm">
                    {{ isEditMode ? 'Simpan Perubahan' : 'Simpan Kategori' }}
                </n-button>
            </n-space>
        </template>
    </n-modal>
</template>

<script src="./ComplaintCategoryManager.ts" />

<style scoped>
.mb-3 { margin-bottom: 12px; }
.mt-3 { margin-top: 12px; }
</style>
