<template>
  <div class="loading-state">
    <div class="loading-spinner"></div>
    <p class="loading-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps({
  text: {
    type: String,
    default: '加载中...'
  }
});
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  width: 100%;
  padding: 20px 0;
}

.loading-spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border-left-color: #3A82F6;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.loading-text {
  font-size: 14px;
  color: #909399;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

:root[data-theme="dark"] .loading-spinner {
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: #3A82F6;
}
</style>
