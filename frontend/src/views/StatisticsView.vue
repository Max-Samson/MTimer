<!-- 统计页面 -->
<template>
    <div class="statistics-view">
        <StatsView />
    </div>
</template>

<script setup lang="ts">
import StatsView from '../components/stats/StatsView.vue';
</script>

<style scoped>
.statistics-view {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    background-color: #f5f7fa;
}

:root[data-theme="dark"] .statistics-view {
    background-color: #1a1a1a;
}
</style>
