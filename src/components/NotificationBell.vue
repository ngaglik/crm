<template>
    <n-popover
        trigger="click"
        placement="bottom-end"
        @update:show="onShowChange"
    >
        <template #trigger>
            <n-badge
                :value="unreadCount"
                :max="99"
                :show="unreadCount > 0"
                :offset="[-4, 4]"
            >
                <n-button text aria-label="Notifikasi">
                    <template #icon>
                        <n-icon size="20">
                            <NotificationsOutline />
                        </n-icon>
                    </template>
                </n-button>
            </n-badge>
        </template>

        <div class="notif-panel">
            <div class="notif-header">
                <strong>Notifikasi Komplain</strong>
                <n-button
                    text
                    size="tiny"
                    type="primary"
                    :disabled="unreadCount === 0"
                    @click="markAllRead"
                >
                    Tandai semua dibaca
                </n-button>
            </div>

            <div class="notif-body" :class="{ 'notif-body--loading': loading }">
                <n-empty
                    v-if="!loading && items.length === 0"
                    description="Tidak ada notifikasi"
                    size="small"
                />
                <div
                    v-for="item in items"
                    :key="item.id"
                    class="notif-item"
                    :class="{ 'notif-item--unread': !item.isRead }"
                    @click="markRead(item)"
                >
                    <div class="notif-item__title">
                        <span v-if="!item.isRead" class="notif-dot"></span>
                        <strong>{{ item.title }}</strong>
                    </div>
                    <div class="notif-item__msg">{{ item.message }}</div>
                    <div class="notif-item__time">{{ formatTime(item.createdAt) }}</div>
                </div>
            </div>
        </div>
    </n-popover>
</template>

<script src="./NotificationBell.ts" />

<style scoped>
.notif-panel {
    width: 320px;
}

.notif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 4px 10px;
    border-bottom: 1px solid var(--n-border-color, #eee);
    font-size: 13px;
}

.notif-body {
    max-height: 360px;
    overflow-y: auto;
    padding-top: 2px;
}

.notif-body--loading {
    opacity: 0.6;
    pointer-events: none;
}

.notif-item {
    padding: 10px 8px;
    border-radius: 6px;
    cursor: pointer;
    border-bottom: 1px solid var(--n-border-color, #f0f0f0);
}

.notif-item:hover {
    background: var(--n-hover-color, rgba(0, 0, 0, 0.04));
}

.notif-item--unread {
    background: rgba(24, 160, 88, 0.06);
}

.notif-item__title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
}

.notif-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #18a058;
    flex-shrink: 0;
}

.notif-item__msg {
    font-size: 12px;
    color: #666;
    margin-top: 2px;
}

.notif-item__time {
    font-size: 11px;
    color: #999;
    margin-top: 4px;
}
</style>
