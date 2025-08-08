<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NButton, NIcon, NTooltip, NSpace } from 'naive-ui'
import { Play, Pause, Music } from '@vicons/carbon'
import { useSettingsStore } from '../stores'
import { storeToRefs } from 'pinia'
import { audioService } from '../services/audioService'

// 使用Pinia store
const settingsStore = useSettingsStore()

// 使用storeToRefs保持响应性
const { soundSettings } = storeToRefs(settingsStore)

// 创建本地响应式变量
const currentTrackName = ref('')

// 在组件挂载后初始化
onMounted(() => {
    // 确保audioService已初始化并与Pinia store连接
    // 在组件挂载后初始化，确保Pinia已经准备好
    setTimeout(() => {
        audioService.initializeStore()

        // 获取当前曲目名称
        currentTrackName.value = audioService.getCurrentTrackName()

        // 监听曲目变化
        setInterval(() => {
            currentTrackName.value = audioService.getCurrentTrackName()
        }, 1000)
    }, 100) // 短暂延迟确保Pinia已初始化
})

// 播放/暂停
const togglePlay = () => {
    audioService.togglePlay()
}
</script>

<template>
    <div class="mini-music-controller" v-if="soundSettings.bgMusic.currentTrack">
        <n-space>
            <n-tooltip trigger="hover" placement="bottom">
                <template #trigger>
                    <n-button circle size="small" @click="togglePlay" class="play-btn">
                        <template #icon>
                            <n-icon>
                                <Play v-if="!soundSettings.bgMusic.isPlaying" />
                                <Pause v-else />
                            </n-icon>
                        </template>
                    </n-button>
                </template>
                {{ soundSettings.bgMusic.isPlaying ? '暂停' : '播放' }}: {{ currentTrackName }}
            </n-tooltip>
        </n-space>
    </div>
</template>

<style scoped>
.mini-music-controller {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    padding: 5px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
}

.mini-music-controller:hover {
    transform: scale(1.1);
    background-color: rgba(0, 0, 0, 0.8);
}

.play-btn {
    background: linear-gradient(135deg, #8e2de2, #4a00e0);
    border: none;
    transition: all 0.3s ease;
}

.play-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 0 15px rgba(142, 45, 226, 0.6);
}
</style>