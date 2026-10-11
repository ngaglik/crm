<template>
    <div class="cs-page">
        <!-- HERO -->
        <div class="hero">
            <div class="hero__badge">Layanan Pengaduan RS Paru dr Ario Wirawan</div>
            <h1 class="hero__title">Sampaikan Komplain Anda</h1>
            <p class="hero__desc">
                Anda dapat mengisi form pengaduan tanpa login. Tim kami akan menindaklanjuti
                secepat mungkin.
            </p>

            <n-button
                v-if="!isAuthed"
                class="hero__login"
                quaternary
                size="small"
                @click="goLogin"
            >
                🔐 Login
            </n-button>
        </div>

        <!-- TABS: Input Komplain / Cek Status -->
        <n-tabs v-model:value="activeTab" type="segment" animated size="large" class="cs-tabs">
            <!-- ── TAB 1: INPUT ── -->
            <n-tab-pane name="input" tab="Input Komplain">
                <!-- SUCCESS -->
                <div v-if="submitted" class="success-card">
                    <div class="success-card__icon">✓</div>
                    <h2 class="success-card__title">Terima kasih!</h2>
                    <p class="success-card__text">
                        Pengaduan Anda berhasil kami terima dengan nomor tiket:
                    </p>
                    <div class="success-card__ticket">{{ lastTicket }}</div>
                    <p class="success-card__note">
                        Simpan nomor tiket tersebut untuk melacak status penanganan komplain Anda.
                    </p>
                    <div class="success-card__actions">
                        <n-button type="primary" size="large" @click="resetForm">
                            Kirim Pengaduan Lain
                        </n-button>
                        <n-button quaternary type="primary" size="large" @click="goCheckStatus">
                            Cek Status Pengaduan Ini
                        </n-button>
                    </div>
                </div>

                <!-- FORM -->
                <div v-else class="form-card">
                    <div class="form-card__header">
                        <div class="form-card__icon">📝</div>
                        <div>
                            <h2 class="form-card__title">Formulir Pengaduan</h2>
                            <p class="form-card__sub">Lengkapi data di bawah ini</p>
                        </div>
                    </div>

                    <div class="form-section">Identitas Anda</div>

                    <div class="form-field">
                        <label class="form-label">Nama Lengkap <span class="req">*</span></label>
                        <n-input
                            v-model:value="formData.namaPelanggan"
                            placeholder="Nama Anda"
                            size="large"
                        />
                    </div>

                    <div class="form-field">
                        <label class="form-label">Perusahaan / Instansi</label>
                        <n-input
                            v-model:value="formData.perusahaan"
                            placeholder="Nama perusahaan (opsional)"
                            size="large"
                        />
                    </div>

                    <div class="form-row">
                        <div class="form-field">
                            <label class="form-label">Telepon / WhatsApp</label>
                            <n-input
                                v-model:value="formData.telepon"
                                placeholder="Nomor HP"
                                size="large"
                            />
                        </div>
                        <div class="form-field">
                            <label class="form-label">Email</label>
                            <n-input
                                v-model:value="formData.email"
                                placeholder="email@anda.com"
                                size="large"
                            />
                        </div>
                    </div>

                    <div class="form-section">Detail Pengaduan</div>

                    <div class="form-row">
                        <div class="form-field">
                            <label class="form-label">Tanggal <span class="req">*</span></label>
                            <n-date-picker
                                v-model:value="formData.tanggal"
                                value-format="yyyy-MM-dd"
                                type="date"
                                style="width: 100%"
                                size="large"
                            />
                        </div>
                        <div class="form-field">
                            <label class="form-label">Kategori <span class="req">*</span></label>
                            <n-select
                                v-model:value="formData.kategori"
                                :options="kategoriOptions"
                                placeholder="Pilih kategori"
                                size="large"
                            />
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-field">
                            <label class="form-label">Prioritas</label>
                            <n-select
                                v-model:value="formData.prioritas"
                                :options="prioritasOptions"
                                size="large"
                            />
                        </div>
                        <div class="form-field">
                            <label class="form-label">Subjek / Judul <span class="req">*</span></label>
                            <n-input
                                v-model:value="formData.subjek"
                                placeholder="Ringkasan singkat pengaduan"
                                size="large"
                            />
                        </div>
                    </div>

                    <div class="form-field">
                        <label class="form-label">Deskripsi</label>
                        <n-input
                            v-model:value="formData.deskripsi"
                            type="textarea"
                            :rows="5"
                            placeholder="Jelaskan kronologi keluhan Anda secara detail..."
                        />
                    </div>

                    <n-button
                        class="submit-btn"
                        type="primary"
                        size="large"
                        block
                        :loading="formLoading"
                        @click="submitForm"
                    >
                        Kirim Pengaduan
                    </n-button>
                </div>
            </n-tab-pane>

            <!-- ── TAB 2: CEK STATUS ── -->
            <n-tab-pane name="cek" tab="Cek Status Komplain">
                <div class="status-card">
                    <div class="form-card__header">
                        <div class="form-card__icon form-card__icon--teal">🔎</div>
                        <div>
                            <h2 class="form-card__title">Cek Status Komplain</h2>
                            <p class="form-card__sub">
                                Masukkan nomor tiket untuk melihat status pengaduan Anda
                            </p>
                        </div>
                    </div>

                    <div class="status-check">
                        <n-input
                            v-model:value="statusNoTiket"
                            placeholder="Contoh: CMP-2026-0001"
                            size="large"
                            @keyup.enter="checkStatus"
                        />
                        <n-button
                            type="primary"
                            size="large"
                            :loading="statusLoading"
                            @click="checkStatus"
                        >
                            Cek Status
                        </n-button>
                    </div>

                    <!-- Hasil -->
                    <div v-if="statusResult" class="status-result">
                        <div class="status-result__head">
                            <div>
                                <div class="status-result__ticket">{{ statusResult.noTiket }}</div>
                                <div class="status-result__name">{{ statusResult.namaPelanggan }}</div>
                            </div>
                            <n-tag :type="statusType(statusResult.status)" size="large" round>
                                {{ statusLabel(statusResult.status) }}
                            </n-tag>
                        </div>

                        <div class="status-result__info">
                            <div class="mc-meta">
                                <span class="mc-meta__k">Tanggal</span>
                                <span>{{ statusResult.tanggal }}</span>
                            </div>
                            <div class="mc-meta">
                                <span class="mc-meta__k">Kategori</span>
                                <span>{{ statusResult.kategori }}</span>
                            </div>
                            <div class="mc-meta">
                                <span class="mc-meta__k">Prioritas</span>
                                <span>{{ statusResult.prioritas }}</span>
                            </div>
                            <div class="mc-meta">
                                <span class="mc-meta__k">Target Selesai</span>
                                <span>{{ statusResult.targetSelesai || "-" }}</span>
                            </div>
                        </div>

                        <div class="status-result__subjek">{{ statusResult.subjek }}</div>

                        <div class="timeline">
                            <div
                                v-for="act in statusResult.activities"
                                :key="act.id"
                                class="timeline-item"
                            >
                                <div class="timeline-dot" :class="statusDotClass(act.status)"></div>
                                <div class="timeline-body">
                                    <div class="timeline-title">{{ statusLabel(act.status) }}</div>
                                    <div class="timeline-note">{{ act.note }}</div>
                                    <div class="timeline-time">{{ formatDateTime(act.createdAt) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tidak ditemukan -->
                    <n-alert
                        v-else-if="statusChecked"
                        type="error"
                        class="mt-3"
                        :show-icon="false"
                    >
                        Nomor tiket tidak ditemukan. Periksa kembali nomor tiket Anda.
                    </n-alert>
                </div>
            </n-tab-pane>
        </n-tabs>

        <!-- Riwayat (hanya untuk user yang login) -->
        <div v-if="isAuthed" class="history-section">
            <n-card title="Riwayat Input Terakhir" size="small">
                <n-data-table
                    :columns="recentColumns"
                    :data="recentData"
                    :loading="recentLoading"
                    :max-height="320"
                    size="small"
                />
            </n-card>
        </div>
    </div>
</template>

<script src="./ComplaintInput.ts" />

<style scoped>
.cs-page {
    max-width: 720px;
    margin: 0 auto;
}

/* ── Hero ─────────────────────────────────────────────────── */
.hero {
    background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
    border-radius: 18px;
    padding: 40px 28px;
    color: #fff;
    text-align: center;
    margin-bottom: 20px;
    box-shadow: 0 10px 30px rgba(5, 150, 105, 0.25);
}

.hero__badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    padding: 4px 14px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 14px;
}

.hero__title {
    margin: 0 0 10px;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 0.3px;
}

.hero__desc {
    margin: 0 auto;
    max-width: 460px;
    font-size: 14px;
    line-height: 1.6;
    opacity: 0.92;
}

.hero__login {
    margin-top: 16px;
    color: #fff !important;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 999px;
    padding: 4px 16px;
    font-weight: 600;
}

.hero__login:hover {
    background: rgba(255, 255, 255, 0.25);
}

/* ── Form Card ────────────────────────────────────────────── */
.form-card {
    background: #fff;
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 2px 14px rgba(0, 0, 0, 0.07);
}

.form-card__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
}

.form-card__icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: #ecfdf5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
}

.form-card__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
}

.form-card__sub {
    margin: 2px 0 0;
    font-size: 13px;
    color: #64748b;
}

/* ── Sections & Fields ────────────────────────────────────── */
.form-section {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #059669;
    margin: 22px 0 14px;
    padding-bottom: 6px;
    border-bottom: 1px dashed #e2e8f0;
}

.form-section:first-of-type {
    margin-top: 0;
}

.form-field {
    margin-bottom: 16px;
}

.form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
}

.req {
    color: #ef4444;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 16px;
}

/* ── Submit ───────────────────────────────────────────────── */
.submit-btn {
    margin-top: 8px;
    height: 48px;
    font-size: 15px;
    font-weight: 700;
    border-radius: 10px;
}

/* ── Success ──────────────────────────────────────────────── */
.success-card {
    background: #fff;
    border-radius: 18px;
    padding: 40px 28px;
    text-align: center;
    box-shadow: 0 2px 14px rgba(0, 0, 0, 0.07);
}

.success-card__icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #dcfce7;
    color: #16a34a;
    font-size: 30px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}

.success-card__title {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 800;
}

.success-card__text {
    margin: 0 0 12px;
    color: #475569;
    font-size: 14px;
}

.success-card__ticket {
    display: inline-block;
    font-family: monospace;
    font-size: 20px;
    font-weight: 700;
    color: #0f766e;
    background: #f0fdfa;
    border: 2px dashed #5eead4;
    border-radius: 10px;
    padding: 10px 22px;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
}

.success-card__note {
    margin: 0 0 18px;
    color: #94a3b8;
    font-size: 13px;
}

/* ── Tabs ──────────────────────────────────────────────────── */
.cs-tabs {
    background: #fff;
    border-radius: 18px;
    padding: 24px;
    box-shadow: 0 2px 14px rgba(0, 0, 0, 0.07);
}

.cs-tabs :deep(.n-tabs-nav) {
    justify-content: center;
}

/* ── Status Card & Check ──────────────────────────────────── */
.form-card__icon--teal {
    background: #ecfeff;
}

.status-check {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
}

.status-check .n-input {
    flex: 1;
}

.status-result {
    border-top: 1px dashed #e2e8f0;
    padding-top: 18px;
}

.status-result__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.status-result__ticket {
    font-family: monospace;
    font-size: 18px;
    font-weight: 800;
    color: #0f766e;
}

.status-result__name {
    font-size: 13px;
    color: #64748b;
    margin-top: 2px;
}

.status-result__info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    margin-bottom: 12px;
}

.mc-meta {
    display: flex;
    flex-direction: column;
}

.mc-meta__k {
    font-size: 11px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.mc-meta span:last-child {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    overflow-wrap: break-word;
}

.status-result__subjek {
    font-size: 13px;
    color: #475569;
    background: #f8fafc;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 16px;
}

/* ── Timeline ──────────────────────────────────────────────── */
.timeline {
    position: relative;
    padding-left: 22px;
}

.timeline::before {
    content: "";
    position: absolute;
    left: 6px;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: #e2e8f0;
}

.timeline-item {
    position: relative;
    padding-bottom: 16px;
}

.timeline-item:last-child {
    padding-bottom: 0;
}

.timeline-dot {
    position: absolute;
    left: -22px;
    top: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #94a3b8;
    border: 3px solid #fff;
    box-shadow: 0 0 0 2px #cbd5e1;
}

.timeline-dot.dot-baru { background: #3b82f6; }
.timeline-dot.dot-diproses { background: #f59e0b; }
.timeline-dot.dot-selesai { background: #22c55e; }
.timeline-dot.dot-ditolak { background: #ef4444; }

.timeline-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
}

.timeline-note {
    font-size: 12px;
    color: #64748b;
    margin-top: 1px;
}

.timeline-time {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 3px;
}

/* ── Success actions ───────────────────────────────────────── */
.success-card__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
}

/* ── Riwayat ──────────────────────────────────────────────── */
.history-section {
    margin-top: 20px;
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 600px) {
    .hero {
        padding: 28px 18px;
        border-radius: 14px;
    }

    .hero__title {
        font-size: 21px;
    }

    .form-card {
        padding: 20px 16px;
        border-radius: 14px;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .cs-tabs {
        padding: 16px 12px;
        border-radius: 14px;
    }

    .status-check {
        flex-direction: column;
    }

    .status-result__info {
        grid-template-columns: 1fr;
    }

    .status-result__head {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
