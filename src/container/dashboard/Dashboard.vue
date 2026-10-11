<template>
    <div class="dashboard-root">
        <div class="dashboard-header">
            <div class="dashboard-title">
                <span class="dashboard-icon">📊</span>
                <div>
                    <h2>Ringkasan Komplain</h2>
                    <p>Tahun {{ selectedYear }}</p>
                </div>
            </div>
            <div class="dashboard-controls">
                <n-select
                    v-model:value="selectedYear"
                    :options="yearOptions"
                    style="width: 120px"
                />
                <n-button type="primary" :loading="loading" @click="loadData">
                    Muat Ulang
                </n-button>
            </div>
        </div>

        <n-spin :show="loading" description="Memuat data...">
            <template v-if="dashboard">
                <!-- ── Stat Cards ───────────────────────────────── -->
                <div class="stat-grid">
                    <div class="stat-card stat-card--blue">
                        <div class="stat-card__icon">📋</div>
                        <div class="stat-card__body">
                            <div class="stat-card__value">{{ dashboard.totalComplaints }}</div>
                            <div class="stat-card__label">Total Komplain</div>
                        </div>
                    </div>
                    <div class="stat-card stat-card--teal">
                        <div class="stat-card__icon">📅</div>
                        <div class="stat-card__body">
                            <div class="stat-card__value">{{ dashboard.thisYearComplaints }}</div>
                            <div class="stat-card__label">Komplain Tahun Ini</div>
                        </div>
                    </div>
                    <div class="stat-card stat-card--green">
                        <div class="stat-card__icon">✅</div>
                        <div class="stat-card__body">
                            <div class="stat-card__value">{{ dashboard.statusSummary.selesai }}</div>
                            <div class="stat-card__label">Selesai</div>
                        </div>
                    </div>
                    <div class="stat-card stat-card--orange">
                        <div class="stat-card__icon">⏳</div>
                        <div class="stat-card__body">
                            <div class="stat-card__value">{{ dashboard.statusSummary.diproses }}</div>
                            <div class="stat-card__label">Sedang Diproses</div>
                        </div>
                    </div>
                    <div class="stat-card stat-card--purple">
                        <div class="stat-card__icon">📝</div>
                        <div class="stat-card__body">
                            <div class="stat-card__value">{{ dashboard.statusSummary.baru }}</div>
                            <div class="stat-card__label">Komplain Baru</div>
                        </div>
                    </div>
                </div>

                <!-- ── Charts Row ──────────────────────────────── -->
                <div class="charts-row">
                    <!-- Monthly Complaints Chart -->
                    <n-card title="Komplain per Bulan" class="chart-card" size="small">
                        <div v-if="monthlyChartData.length === 0" class="chart-empty">
                            <n-empty description="Belum ada data" />
                        </div>
                        <div v-else class="bar-chart-wrapper">
                            <div v-for="(item, i) in monthlyChartData" :key="i" class="bar-row">
                                <div class="bar-label">{{ item.label }}</div>
                                <div class="bar-track">
                                    <div class="bar-fill" :style="{ width: item.pct + '%', background: '#3b82f6' }">
                                        <span v-if="item.pct >= 10" class="bar-pct-inside">{{ item.count }}</span>
                                    </div>
                                    <span v-if="item.pct < 10" class="bar-pct-outside">{{ item.count }}</span>
                                </div>
                            </div>
                        </div>
                    </n-card>

                    <!-- Resolution Chart -->
                    <n-card title="Tingkat Penyelesaian per PIC" class="chart-card" size="small">
                        <div v-if="resolutionData.length === 0" class="chart-empty">
                            <n-empty description="Belum ada data" />
                        </div>
                        <div v-else class="compliance-grid">
                            <div v-for="(item, i) in resolutionData" :key="i" class="compliance-item">
                                <div class="compliance-label">{{ item.label }}</div>
                                <n-progress
                                    type="line"
                                    :percentage="item.rate"
                                    :indicator-placement="'inside'"
                                    :height="20"
                                    :border-radius="4"
                                    :color="item.rate >= 80 ? '#22c55e' : item.rate >= 50 ? '#f59e0b' : '#ef4444'"
                                    :track-color="'#e5e7eb'"
                                >
                                    {{ item.resolved }}/{{ item.total }}
                                </n-progress>
                            </div>
                        </div>
                    </n-card>
                </div>

                <!-- ── Category Stats ───────────────────────────── -->
                <n-card title="Statistik per Kategori (Bulan Ini)" class="section-card" size="small">
                    <n-data-table
                        v-if="dashboard.kategoriStats && dashboard.kategoriStats.length > 0"
                        :columns="kategoriColumns"
                        :data="dashboard.kategoriStats"
                        :max-height="300"
                        size="small"
                        striped
                    />
                    <n-empty v-else description="Belum ada data kategori" />
                </n-card>
            </template>

            <n-empty v-else-if="!loading" description="Pilih tahun dan klik Muat Ulang" />
        </n-spin>
    </div>
</template>

<script src="./Dashboard.ts" />

<style scoped>
.dashboard-root {
    padding: 4px;
}

.dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
}

.dashboard-title {
    display: flex;
    align-items: center;
    gap: 10px;
}

.dashboard-icon {
    font-size: 28px;
}

.dashboard-title h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--n-text-color, #1e293b);
}

.dashboard-title p {
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--n-text-color-3, #94a3b8);
}

.dashboard-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* ── Stat Grid ─────────────────────────────────────────── */
.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 14px;
    margin-bottom: 20px;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    transition: box-shadow 0.2s;
}

.stat-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-card__icon {
    font-size: 28px;
    flex-shrink: 0;
}

.stat-card__body {
    min-width: 0;
}

.stat-card__value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.2;
}

.stat-card__label {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
}

.stat-card--blue .stat-card__value { color: #3b82f6; }
.stat-card--teal .stat-card__value { color: #14b8a6; }
.stat-card--green .stat-card__value { color: #22c55e; }
.stat-card--orange .stat-card__value { color: #f59e0b; }
.stat-card--purple .stat-card__value { color: #8b5cf6; }

/* ── Charts Row ─────────────────────────────────────────── */
.charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
}

@media (max-width: 900px) {
    .charts-row {
        grid-template-columns: 1fr;
    }
}

.chart-card {
    border-radius: 10px;
}

.chart-empty {
    padding: 30px 0;
}

/* ── Bar Chart ──────────────────────────────────────────── */
.bar-chart-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 0;
}

.bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.bar-label {
    width: 40px;
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    flex-shrink: 0;
    text-align: right;
}

.bar-track {
    flex: 1;
    height: 22px;
    background: #f1f5f9;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
}

.bar-fill {
    height: 100%;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: width 0.4s ease;
    min-width: 0;
}

.bar-pct-inside {
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
}

.bar-pct-outside {
    font-size: 11px;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
}

/* ── Resolution ─────────────────────────────────────────── */
.compliance-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px 0;
}

.compliance-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.compliance-label {
    font-size: 12px;
    font-weight: 600;
    color: #334155;
}

/* ── Section Card ───────────────────────────────────────── */
.section-card {
    border-radius: 10px;
    margin-bottom: 16px;
}
</style>
