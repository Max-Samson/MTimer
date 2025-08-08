<template>
  <div class="empty-state">
    <div class="empty-icon">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M52 16H48V12C48 10.9 47.1 10 46 10H18C16.9 10 16 10.9 16 12V16H12C10.9 16 10 16.9 10 18V52C10 53.1 10.9 54 12 54H52C53.1 54 54 53.1 54 52V18C54 16.9 53.1 16 52 16ZM18 12H46V16H18V12ZM52 52H12V18H16H48H52V52ZM40 24H24C22.9 24 22 24.9 22 26V42C22 43.1 22.9 44 24 44H40C41.1 44 42 43.1 42 42V26C42 24.9 41.1 24 40 24ZM40 42H24V26H40V42Z" fill="#909399"/>
      </svg>
    </div>
    <p class="empty-text">{{ text }}</p>
    <slot name="extra"></slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  text: {
    type: String,
    default: '暂无数据'
  }
});
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  width: 100%;
  padding: 32px 0;
}

.empty-icon {
  margin-bottom: 16px;
  color: #909399;
}

.empty-text {
  font-size: 14px;
  color: #909399;
  margin-bottom: 16px;
}
</style>
