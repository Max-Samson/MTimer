<script setup lang="ts">
import { onMounted } from 'vue'
import { audioService } from '../services/audioService'

// 在组件挂载后初始化audioService
onMounted(() => {
    // 确保在应用程序完全初始化后再初始化audioService
    setTimeout(() => {
        audioService.initializeStore()
    }, 200) // 延迟200ms确保Pinia已完全初始化
})
</script>

<template>
    <!-- 这是一个功能性组件，不需要渲染任何内容 -->
</template>