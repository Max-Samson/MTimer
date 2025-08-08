<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { NCard, NSpace, NButton, NSlider, NIcon, NList, NListItem, NText, NProgress, NPopconfirm } from 'naive-ui'
import { Play, Pause, SkipForward, SkipBack, VolumeUp, VolumeDown, VolumeMute, TrashCan, Music } from '@vicons/carbon'
import { useSettingsStore } from '../stores'
import { storeToRefs } from 'pinia'
import { audioService } from '../services/audioService'

// 使用Pinia store
const settingsStore = useSettingsStore()

// 使用storeToRefs保持响应性
const { soundSettings } = storeToRefs(settingsStore)

// 使用ref创建本地响应式变量
const currentTime = ref(0)
const duration = ref(0)
const progress = ref(0)

// 在组件挂载后初始化
onMounted(() => {
    // 确保audioService已初始化并与Pinia store连接
    // 在组件挂载后初始化，确保Pinia已经准备好
    setTimeout(() => {
        audioService.initializeStore()

        // 设置初始值
        currentTime.value = audioService.currentTime.value
        duration.value = audioService.duration.value
        progress.value = audioService.progress.value

        // 监听audioService的响应式变量变化
        watch(audioService.currentTime, (newVal) => {
            currentTime.value = newVal
        })

        watch(audioService.duration, (newVal) => {
            duration.value = newVal
        })

        watch(audioService.progress, (newVal) => {
            progress.value = newVal
        })

        // 预加载所有背景音乐，提高切换流畅度
        preloadAllAudio()
    }, 100) // 短暂延迟确保Pinia已初始化
})

// 预加载所有背景音乐
const preloadAllAudio = () => {
    console.log('开始预加载所有背景音乐...')
    if (!soundSettings.value || !soundSettings.value.bgMusic || !soundSettings.value.bgMusic.playlist) {
        console.log('播放列表不存在，无法预加载')
        return
    }

    // 使用Promise.all并行预加载，但限制并发数
    const preloadBatchSize = 2 // 一次最多同时加载2个音频，避免过多资源争抢
    const playlist = [...soundSettings.value.bgMusic.playlist]
    let index = 0

    // 递归函数，分批预加载
    const preloadBatch = () => {
        if (index >= playlist.length) return

        // 创建当前批次的预加载任务
        const batch = playlist.slice(index, index + preloadBatchSize)
        index += preloadBatchSize

        // 创建预加载Promise
        const preloadPromises = batch.map(track => {
            return new Promise((resolve) => {
                try {
                    // 确保路径正确
                    let trackPath = track.value
                    if (!trackPath.startsWith('http') && !trackPath.startsWith('/')) {
                        trackPath = '/' + trackPath
                    }

                    console.log(`预加载音频: ${track.label} - ${trackPath}`)

                    // 创建新的音频元素用于预加载
                    const audio = new Audio()
                    audio.preload = 'auto'

                    // 添加加载事件
                    audio.onloadeddata = () => {
                        console.log(`音频预加载成功: ${track.label}`)
                        resolve(track.label)
                    }

                    // 添加错误处理
                    audio.onerror = (e) => {
                        console.warn(`音频预加载失败: ${track.label}`, e)

                        // 尝试使用替代URL加载（处理开发模式下资源路径问题）
                        if (!trackPath.includes('http://localhost')) {
                            const altPath = `http://localhost:5173${trackPath.startsWith('/') ? trackPath : '/' + trackPath}`
                            console.log(`尝试使用替代URL预加载: ${altPath}`)
                            audio.src = altPath

                            // 为替代URL添加加载成功事件
                            audio.onloadeddata = () => {
                                console.log(`替代URL音频预加载成功: ${track.label}`)
                                resolve(track.label)
                            }

                            // 为替代URL添加错误处理
                            audio.onerror = () => {
                                console.error(`替代URL音频预加载失败: ${track.label}`)
                                resolve(`${track.label} (加载失败)`) // 仍然解析Promise，不阻塞其他音频
                            }
                        } else {
                            // 无法加载，但仍然解析Promise，不阻塞其他音频
                            resolve(`${track.label} (加载失败)`)
                        }
                    }

                    // 设置加载超时以防止永久挂起
                    const timeout = setTimeout(() => {
                        console.warn(`音频预加载超时: ${track.label}`)
                        resolve(`${track.label} (超时)`)
                    }, 8000) // 8秒超时

                    // 成功加载时清除超时
                    const originalOnloadeddata = audio.onloadeddata
                    audio.onloadeddata = (event) => {
                        clearTimeout(timeout)
                        if (originalOnloadeddata) originalOnloadeddata.call(audio, event)
                    }

                    // 设置源并开始加载
                    audio.src = trackPath
                    audio.load()
                } catch (error) {
                    console.error(`预加载音频时出错: ${track.label}`, error)
                    resolve(`${track.label} (出错)`)
                }
            })
        })

        // 等待当前批次完成后加载下一批
        Promise.all(preloadPromises)
            .then((results) => {
                console.log(`批次预加载完成: ${results.join(', ')}`)
                // 加载下一批
                setTimeout(preloadBatch, 500) // 添加短暂延迟，避免连续大量请求
            })
            .catch(error => {
                console.error('批次预加载出错:', error)
                // 尽管出错，仍继续加载下一批
                setTimeout(preloadBatch, 500)
            })
    }

    // 开始第一批预加载
    preloadBatch()
}

// 播放/暂停
const togglePlay = () => {
    audioService.togglePlay()
}

// 播放下一首
const playNext = () => {
    audioService.playNext()
}

// 播放上一首
const playPrevious = () => {
    audioService.playPrevious()
}

// 设置进度
const setProgress = (value: number) => {
    audioService.setProgress(value)
}

// 格式化时间
const formatTime = (time: number) => {
    return audioService.formatTime(time)
}

// 获取当前播放曲目名称
const getCurrentTrackName = () => {
    return audioService.getCurrentTrackName()
}

// 不再需要从播放列表中移除曲目的功能
</script>

<template>
    <div class="music-player">
        <n-card class="player-card" :bordered="false">
            <!-- 播放器主界面 -->
            <div class="player-main">
                <!-- 专辑封面 -->
                <div class="album-cover-container">
                    <div class="album-cover" :class="{ 'rotating': soundSettings.bgMusic.isPlaying }">
                        <div class="cover-inner">
                            <n-icon size="48" color="#ffffff">
                                <Music />
                            </n-icon>
                        </div>
                    </div>
                    <div class="album-reflection"></div>
                    <div class="play-indicator" v-if="soundSettings.bgMusic.isPlaying"></div>
                </div>

                <!-- 播放控制区 -->
                <div class="player-controls">
                    <!-- 曲目信息 -->
                    <div class="track-info">
                        <n-text class="track-name">{{ getCurrentTrackName() }}</n-text>
                    </div>

                    <!-- 进度条 -->
                    <div class="progress-container">
                        <n-slider v-model:value="progress" :step="0.1" @update:value="setProgress" />
                        <div class="time-display">
                            <span>{{ formatTime(currentTime) }}</span>
                            <span>{{ formatTime(duration) }}</span>
                        </div>
                    </div>

                    <!-- 控制按钮 -->
                    <div class="control-buttons">
                        <n-space justify="center">
                            <n-button circle secondary @click="playPrevious">
                                <template #icon>
                                    <n-icon>
                                        <SkipBack />
                                    </n-icon>
                                </template>
                            </n-button>

                            <n-button circle type="primary" @click="togglePlay">
                                <template #icon>
                                    <n-icon>
                                        <Play v-if="!soundSettings.bgMusic.isPlaying" />
                                        <Pause v-else />
                                    </n-icon>
                                </template>
                            </n-button>

                            <n-button circle secondary @click="playNext">
                                <template #icon>
                                    <n-icon>
                                        <SkipForward />
                                    </n-icon>
                                </template>
                            </n-button>

                            <div class="volume-control">
                                <n-button circle secondary class="volume-btn">
                                    <template #icon>
                                        <n-icon>
                                            <VolumeMute v-if="soundSettings.bgMusic.volume === 0" />
                                            <VolumeDown v-else-if="soundSettings.bgMusic.volume < 0.5" />
                                            <VolumeUp v-else />
                                        </n-icon>
                                    </template>
                                </n-button>

                                <div class="volume-slider-container">
                                    <n-slider v-model:value="soundSettings.bgMusic.volume" :step="0.01" :min="0"
                                        :max="1" style="width: 80px"
                                        @update:value="(val) => settingsStore.setBgMusicVolume(val)" />
                                    <div class="volume-value">{{ Math.round(soundSettings.bgMusic.volume * 100) }}%
                                    </div>
                                </div>
                            </div>
                        </n-space>
                    </div>
                </div>
            </div>

            <!-- 播放列表 -->
            <div class="playlist-container">
                <n-text class="playlist-title">播放列表</n-text>
                <n-list hoverable clickable>
                    <n-list-item v-for="track in soundSettings.bgMusic.playlist" :key="track.value"
                        :class="{ 'active-track': track.value === soundSettings.bgMusic.currentTrack }" @click="() => {
                            // 保存当前播放状态
                            const wasPlaying = soundSettings.bgMusic.isPlaying;
                            // 设置当前曲目
                            settingsStore.setCurrentBgMusic(track.value);
                            // 重置播放进度
                            audioService.setProgress(0);

                            // 创建临时音频元素预加载
                            let trackPath = track.value;
                            if (!trackPath.startsWith('http') && !trackPath.startsWith('/')) {
                                trackPath = '/' + trackPath;
                            }

                            const tempAudio = new Audio();
                            tempAudio.preload = 'auto';

                            // 监听预加载完成事件
                            tempAudio.onloadeddata = () => {
                                console.log(`点击音频预加载成功: ${track.label}`);
                                // 预加载成功后再加载到主播放器
                                audioService.loadCurrentTrack();
                                // 根据之前的播放状态决定是否继续播放
                                if (wasPlaying) {
                                    setTimeout(() => {
                                        audioService.play();
                                        settingsStore.playBgMusic();
                                    }, 300);
                                } else {
                                    audioService.pause();
                                    settingsStore.pauseBgMusic();
                                }
                            };

                            // 处理加载错误
                            tempAudio.onerror = () => {
                                console.warn(`点击音频预加载失败: ${track.label}`);
                                // 预加载失败，尝试直接加载到主播放器
                                audioService.loadCurrentTrack();
                                // 根据之前的播放状态决定是否继续播放
                                if (wasPlaying) {
                                    setTimeout(() => {
                                        audioService.play();
                                        settingsStore.playBgMusic();
                                    }, 300);
                                } else {
                                    audioService.pause();
                                    settingsStore.pauseBgMusic();
                                }
                            };

                            // 尝试使用开发服务器URL
                            if (!trackPath.includes('http://localhost')) {
                                const altPath = `http://localhost:5173${trackPath.startsWith('/') ? trackPath : '/' + trackPath}`;
                                console.log(`尝试使用替代URL加载点击音频: ${altPath}`);
                                tempAudio.src = altPath;
                            } else {
                                tempAudio.src = trackPath;
                            }

                            // 启动加载
                            tempAudio.load();
                        }">
                        <n-space justify="space-between" align="center" style="width: 100%">
                            <n-text>{{ track.label }}</n-text>
                            <n-icon size="16" color="rgba(255, 255, 255, 0.5)"
                                v-if="track.value === soundSettings.bgMusic.currentTrack">
                                <Music />
                            </n-icon>
                        </n-space>
                    </n-list-item>
                </n-list>
            </div>
        </n-card>
    </div>
</template>

<style scoped>
.music-player {
    width: 100%;
    margin-top: 20px;
    transition: all 0.3s ease;
}

.player-card {
    border-radius: 16px;
    overflow: hidden;
    background-color: rgba(255, 255, 255, 0.07);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
}

.player-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.25);
}

.player-main {
    display: flex;
    align-items: center;
    padding: 20px;
    gap: 24px;
    background: linear-gradient(to right, rgba(142, 45, 226, 0.1), rgba(74, 0, 224, 0.05));
}

.album-cover-container {
    position: relative;
    width: 100px;
    height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
}

.album-cover {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: linear-gradient(135deg, #8e2de2, #4a00e0);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
    transition: all 0.5s ease;
    z-index: 2;
}

.album-cover:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
}

.album-reflection {
    position: absolute;
    bottom: 0;
    width: 80px;
    height: 20px;
    background: linear-gradient(to bottom, rgba(142, 45, 226, 0.5), transparent);
    border-radius: 50%;
    filter: blur(5px);
    transform: scaleY(0.3);
    opacity: 0.6;
    z-index: 1;
}

.play-indicator {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #4ade80;
    box-shadow: 0 0 10px #4ade80;
    animation: pulse 1.5s infinite;
    z-index: 3;
}

@keyframes pulse {
    0% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.6;
        transform: scale(1.2);
    }

    100% {
        opacity: 1;
        transform: scale(1);
    }
}

.cover-inner {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.rotating {
    animation: rotate 8s linear infinite;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.player-controls {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.track-info {
    margin-bottom: 8px;
    animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.track-name {
    font-size: 18px;
    font-weight: bold;
    background: linear-gradient(to right, #8e2de2, #4a00e0);
    background-clip: text;
    /* 标准属性 */
    -webkit-background-clip: text;
    /* Webkit 内核浏览器前缀 */
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.progress-container {
    width: 100%;
    transition: all 0.3s ease;
}

.progress-container:hover {
    transform: scale(1.02);
}

.time-display {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 6px;
    font-weight: 500;
}

.control-buttons {
    margin-top: 12px;
}

.control-buttons :deep(.n-button) {
    transition: all 0.2s ease;
}

.control-buttons :deep(.n-button:hover) {
    transform: scale(1.1);
}

.control-buttons :deep(.n-button:active) {
    transform: scale(0.95);
}

.playlist-container {
    margin-top: 15px;
    padding: 0 20px 20px;
    animation: slideUp 0.5s ease;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.playlist-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
    display: block;
    color: #8e2de2;
    border-bottom: 2px solid rgba(142, 45, 226, 0.3);
    padding-bottom: 8px;
}

.active-track {
    background: linear-gradient(to right, rgba(142, 45, 226, 0.2), rgba(74, 0, 224, 0.1));
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateX(5px);
    transition: all 0.3s ease;
}

:deep(.n-list-item) {
    transition: all 0.2s ease;
    border-radius: 8px;
    margin-bottom: 4px;
    padding: 8px 12px;
}

:deep(.n-list-item:hover) {
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateX(5px);
}

:deep(.n-slider-rail) {
    background-color: rgba(255, 255, 255, 0.2);
}

:deep(.n-slider-fill) {
    background: linear-gradient(to right, #8e2de2, #4a00e0);
}

:deep(.n-slider-handle) {
    height: 14px;
    width: 14px;
    background-color: #ffffff;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
}

:deep(.n-slider-handle:hover) {
    transform: scale(1.2);
}

.volume-control {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 20px;
    padding: 4px 10px;
    transition: all 0.3s ease;
}

.volume-control:hover {
    background-color: rgba(0, 0, 0, 0.3);
    transform: scale(1.05);
}

.volume-btn {
    margin-right: 4px;
}

.volume-slider-container {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.volume-value {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 2px;
}
</style>