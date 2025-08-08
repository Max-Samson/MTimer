<script setup lang="ts">
import { onUnmounted, onMounted, watch, nextTick, ref, computed, inject } from 'vue'
import { NButton, NSpace, NIcon, NProgress, NCard, NTag, NTooltip, NPopover, NSpin, NRadioGroup, NRadioButton } from 'naive-ui'
import { Play, Pause, Reset, Information, Settings, Help } from '@vicons/carbon'
import TomatoSvg from './TomatoSvg.vue'
import { useTimerStore, useSettingsStore, useTodoStore } from '../stores'
import { storeToRefs } from 'pinia'
import { soundEffectService } from '../services/soundEffectService'
import CustomTimerSettings from './CustomTimerSettings.vue'
import { TimerMode } from '../stores/timerStore'
import type { Emitter } from 'mitt'

// 定义事件总线类型
type Events = {
  'show-pomodoro-info': void;
  [key: string]: any;
}

// 注入全局事件并正确类型化
const emitter = inject('emitter') as Emitter<Events> | undefined

// 添加显示番茄工作法介绍的方法
const showPomodoroInfo = () => {
  // 使用事件总线发送事件，通知MainLayout组件打开番茄工作法介绍弹窗
  if (emitter) {
    emitter.emit('show-pomodoro-info')
    soundEffectService.playButtonClickSound() // 播放按钮音效
  }
}

// 音频文件路径常量
const TIMER_END_SOUND = '/sounds/timer-end.wav';

// 使用Pinia store
const timerStore = useTimerStore()
const settingsStore = useSettingsStore()
const todoStore = useTodoStore()

// 使用storeToRefs保持响应性
const {
    time,
    initialTime,
    isRunning,
    progress,
    isBreak,
    currentMode,
    workTime,
    shortBreakTime,
    longBreakTime,
    customWorkTime,
    customShortBreakTime,
    customLongBreakTime,
    showCustomModeSettings
} = storeToRefs(timerStore)
const { soundSettings } = storeToRefs(settingsStore)
const { currentTodo } = storeToRefs(todoStore)

// 计算属性 - 显示当前模式
const modeText = computed(() => {
    if (isBreak.value) {
        return '休息时间'
    }
    return currentMode.value === 'pomodoro' ? '番茄工作法' : '自定义专注'
})

// 计算属性 - 显示状态
const statusText = computed(() => {
    if (!isRunning.value) {
        return '已暂停'
    }
    return isBreak.value ? '休息中' : '专注中'
})

// 计算属性 - 当前任务信息
const todoInfo = computed(() => {
    if (!currentTodo.value) {
        return null
    }

    return {
        text: currentTodo.value.text,
        completedPomodoros: currentTodo.value.completedPomodoros,
        estimatedPomodoros: currentTodo.value.estimatedPomodoros,
        totalFocusTime: formatMinutes(currentTodo.value.totalFocusTime),
        targetTime: currentTodo.value.targetTime ? `${currentTodo.value.targetTime}分钟` : '未设置'
    }
})

// 格式化分钟显示
const formatMinutes = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}分钟`
}

// 从timerStore中引入方法，但不直接使用
// 扩展startTimer方法，添加音效
const startTimer = () => {
    // 播放开始按钮音效
    soundEffectService.playButtonClickSound()
    // 调用store中的startTimer方法
    timerStore.startTimer()
}

// 扩展resetTimer方法，添加音效
const resetTimer = () => {
    // 播放按钮点击音效
    soundEffectService.playButtonClickSound()
    // 调用store中的resetTimer方法
    timerStore.resetTimer()
}

// 模式切换处理函数
const handleModeChange = (mode: string) => {
    soundEffectService.playButtonClickSound()
    timerStore.switchTimerMode(mode as TimerMode)
}

// 打开自定义设置
const openCustomSettings = () => {
    soundEffectService.playButtonClickSound()
    showCustomModeSettings.value = true
}

// 音频播放函数，每次创建新的音频实例
const playAlarmSound = () => {
    if (soundSettings.value.autoPlay) {
        try {
            // 创建新的音频实例
            const audio = new Audio(TIMER_END_SOUND);
            console.log('创建计时结束提示音:', TIMER_END_SOUND);

            // 添加音频加载成功事件
            audio.oncanplaythrough = () => {
                console.log('计时结束提示音加载完成，准备播放');
            };

            // 添加错误处理
            audio.onerror = (err) => {
                console.error('计时结束提示音加载失败:', err);
                console.error('加载失败的音频路径:', TIMER_END_SOUND);
                // 错误时使用备选音效
                playFallbackSound(440, 500);
            };

            // 预加载音频
            audio.load();

            // 播放提示音
            setTimeout(() => {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.error('播放计时结束提示音失败:', err);
                        // 错误时使用备选音效
                        playFallbackSound(440, 500);
                    });
                }
            }, 50); // 短暂延迟，确保加载
        } catch (err) {
            console.error('播放提示音出现异常:', err);
            // 错误时使用备选音效
            playFallbackSound(440, 500);
        }
    }
}

// 使用Web Audio API播放简单音调作为备选方案
const playFallbackSound = (frequency: number = 440, duration: number = 500): void => {
    try {
        // 创建音频上下文
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // 创建振荡器
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // 连接节点
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 配置振荡器
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0.2;

        // 播放音调
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, duration);

        console.log(`使用备选方案播放计时结束提示音，频率: ${frequency}Hz, 持续时间: ${duration}ms`);
    } catch (err) {
        console.error('备选音效播放失败:', err);
    }
}

// 扩展stopTimer方法，添加动画效果
const stopTimerWithEffects = () => {
    timerStore.stopTimer()

    // 播放暂停按钮音效
    soundEffectService.playButtonClickSound()

    // 如果是因为计时结束而停止，播放提示音
    if (time.value === 0) {
        playAlarmSound()
        // 播放计时结束音效
        soundEffectService.playTimerEndSound()
        // 添加番茄完成动画效果
        document.querySelector('.tomato-svg-container .tomato-body')?.classList.add('completed')
        setTimeout(() => {
            document.querySelector('.tomato-svg-container .tomato-body')?.classList.remove('completed')
        }, 3000)
    }
}

// 格式化时间函数
const formatTime = (seconds: number): string => {
    return timerStore.formatTime(seconds)
}

onMounted(() => {
    // 加载设置
    timerStore.loadSettings()
    settingsStore.loadSoundSettings()

    console.log('使用导入的音频文件初始化计时器组件')

    // 强制更新组件
    nextTick(() => {
        // 确保TomatoSvg组件接收到最新的time值
        console.log('计时器已更新为:', formatTime(time.value))
    })
})

onUnmounted(() => {
    // 确保计时器停止
    timerStore.stopTimer()
})

// 监听initialTime变化，确保UI更新
watch(() => initialTime.value, () => {
    nextTick(() => {
        // 强制更新time值
        time.value = initialTime.value
        console.log('计时器设置已更新:', formatTime(time.value))
    })
}, { immediate: true })

// 监听currentMode变化，确保UI更新
watch(() => currentMode.value, () => {
    nextTick(() => {
        // 更新计时器设置
        timerStore.loadSettings()
        console.log('计时器模式已更新:', currentMode.value)
    })
}, { immediate: true })

// 监听音频设置变化
watch(() => soundSettings.value.currentSound, (newSound) => {
    // 由于我们现在使用导入的音频文件，此监听暂时不需要做任何操作
    console.log('音频设置已更改，但使用内置音频文件')
})
</script>

<template>
    <div class="tomato-timer">
        <!-- 番茄藤蔓装饰 -->
        <div class="tomato-vine left-vine"></div>
        <div class="tomato-vine right-vine"></div>

        <!-- 番茄状态显示 -->
        <div class="tomato-status" :class="{ 'status-active': isRunning }">
            <div class="status-left">
                <div class="status-icon"></div>
                <span class="status-text">{{ currentMode === 'pomodoro' ? '番茄工作法' : '自定义专注' }}</span>
                <!-- 添加一个问号图标，点击显示番茄工作法介绍 -->
                <n-tooltip trigger="hover" placement="bottom">
                    <template #trigger>
                        <n-button text size="small" class="info-btn" @click="showPomodoroInfo">
                            <n-icon>
                                <Help />
                            </n-icon>
                        </n-button>
                    </template>
                    <span>番茄工作法介绍</span>
                </n-tooltip>
            </div>
            <n-tag :type="isRunning ? 'success' : 'warning'" size="small" class="status-tag">
                {{ statusText }}
            </n-tag>
        </div>

        <!-- 当前任务信息 -->
        <div v-if="currentTodo" class="current-todo-info">
            <div class="todo-title">
                <span>当前任务:</span>
                <n-tooltip placement="top">
                    <template #trigger>
                        <n-tag type="info">{{ currentTodo.text || currentTodo.name }}</n-tag>
                    </template>
                    <span class="todo-tooltip">
                        <p><strong>任务进度:</strong> 🍅 {{ currentTodo.completedPomodoros }}/{{
                            currentTodo.estimatedPomodoros }}</p>
                        <p><strong>累计专注:</strong> {{ formatMinutes(currentTodo.totalFocusTime) }}</p>
                        <p v-if="currentTodo.targetTime"><strong>目标时长:</strong> {{ currentTodo.targetTime }}分钟</p>
                    </span>
                </n-tooltip>
            </div>
        </div>

        <!-- 时间显示 - 使用番茄SVG组件 -->
        <div class="timer-display" :class="{ 'timer-active': isRunning }">
            <div class="timer-background"></div>
            <tomato-svg :time="time" :is-running="isRunning" />
        </div>

        <!-- 进度条 - 确保在按钮上方 -->
        <div class="progress-bar-container">
            <div class="progress-label">{{ isBreak ? '休息时间' : '专注时间' }}</div>
            <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
                <div class="progress-tomato-icon" :style="{ left: `${progress}%` }"></div>
            </div>
            <div class="progress-label">{{ isBreak ? '放松一下!' : 'Time to focus!' }}</div>
        </div>

        <!-- 控制按钮 -->
        <div class="controls">
            <n-space justify="center">
                <n-button :type="isRunning ? 'error' : 'success'"
                    @click="isRunning ? stopTimerWithEffects() : startTimer()" class="control-btn toggle-btn">
                    <span>{{ isRunning ? '暂停专注' : '开始专注' }}</span>
                </n-button>
                <n-button type="info" @click="resetTimer" class="control-btn toggle-btn reset-btn">
                    <span>重置时间</span>
                </n-button>
            </n-space>
        </div>

        <!-- 模式切换 -->
        <div class="mode-switch">
            <n-radio-group v-model:value="currentMode" @update:value="handleModeChange" size="small">
                <n-radio-button value="pomodoro">番茄工作法</n-radio-button>
                <n-radio-button value="custom">自定义专注</n-radio-button>
            </n-radio-group>

            <n-button text type="primary" @click="openCustomSettings" class="settings-btn"
                v-if="currentMode === 'custom'">
                <n-icon>
                    <Settings />
                </n-icon>
                <span>设置</span>
            </n-button>
        </div>

        <!-- 番茄钟模式信息 -->
        <div class="timer-info">
            <n-space justify="center">
                <n-tag type="success" v-if="!isBreak">
                    <span>{{ currentMode === 'pomodoro' ? '番茄工作法' : '自定义专注' }}</span>
                </n-tag>
                <n-tag type="info" v-else>
                    <span>休息时间</span>
                </n-tag>
            </n-space>
        </div>
    </div>

    <!-- 自定义专注模式设置组件 -->
    <CustomTimerSettings />
</template>

<style scoped>
.tomato-timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    position: relative;
    padding: 20px 20px 15px 20px;
    overflow: hidden;
    background-color: rgba(255, 245, 240, 0.5);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 8px 32px rgba(255, 107, 107, 0.1);
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    transition: all var(--transition-time) ease;
}

:root[data-theme="dark"] .tomato-timer {
    background-color: rgba(30, 38, 52, 0.8);
    box-shadow: 0 8px 32px rgba(255, 107, 107, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.progress-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.timer-progress {
    width: 100%;
    height: 100%;
}

/* 番茄藤蔓装饰 */
.tomato-vine {
    position: absolute;
    width: 30px;
    height: 180px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 200"><path d="M25,0 C25,40 10,80 25,120 C40,160 25,200 25,200" stroke="%2332CD32" stroke-width="3" fill="none" /><path d="M25,50 C15,60 5,55 5,45" stroke="%2332CD32" stroke-width="2" fill="none" /><path d="M25,90 C15,100 5,95 0,85" stroke="%2332CD32" stroke-width="2" fill="none" /><path d="M25,130 C15,140 5,135 0,125" stroke="%2332CD32" stroke-width="2" fill="none" /><path d="M25,170 C15,180 5,175 0,165" stroke="%2332CD32" stroke-width="2" fill="none" /></svg>');
    background-repeat: no-repeat;
    z-index: 0;
    opacity: 0.6;
    animation: vineGrow 3s ease-out forwards;
    pointer-events: none;
}

.left-vine {
    left: 15px;
    top: 10px;
    transform: scaleX(-1);
}

.right-vine {
    right: 15px;
    top: 10px;
}

/* 番茄状态显示 */
.tomato-status {
    background-color: rgba(255, 235, 230, 0.8);
    padding: 10px 25px;
    border-radius: 30px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
    transition: all 0.3s ease;
    border: 2px solid rgba(255, 99, 71, 0.3);
    z-index: 1;
    width: 90%;
    max-width: 420px;
    margin: 0 auto;
    gap: 15px;
}

:root[data-theme="dark"] .tomato-status {
    background-color: rgba(40, 44, 52, 0.9);
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
    border: 2px solid rgba(255, 99, 71, 0.4);
}

.status-active {
    background-color: rgba(255, 99, 71, 0.2);
    box-shadow: 0 4px 15px rgba(255, 99, 71, 0.4);
    transform: scale(1.05);
}

:root[data-theme="dark"] .status-active {
    background-color: rgba(255, 99, 71, 0.25);
    box-shadow: 0 4px 20px rgba(255, 99, 71, 0.5), 0 0 10px rgba(255, 99, 71, 0.3);
    animation: glow-pulse 3s infinite;
}

@keyframes glow-pulse {
    0% {
        box-shadow: 0 4px 15px rgba(255, 99, 71, 0.3);
    }
    50% {
        box-shadow: 0 4px 25px rgba(255, 99, 71, 0.6), 0 0 15px rgba(255, 99, 71, 0.4);
    }
    100% {
        box-shadow: 0 4px 15px rgba(255, 99, 71, 0.3);
    }
}

.status-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-icon {
    width: 20px;
    height: 20px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="70" r="40" fill="%23ff6347"/><path d="M50,30 C50,30 40,10 50,0 C60,10 50,30 50,30" fill="%23228B22" /><path d="M50,30 C50,30 20,20 10,5 C30,15 50,30 50,30" fill="%2332CD32" /><path d="M50,30 C50,30 80,20 90,5 C70,15 50,30 50,30" fill="%2332CD32" /></svg>');
    background-repeat: no-repeat;
    flex-shrink: 0;
}

.status-text {
    font-size: 16px;
    color: #ff6347;
    font-weight: 600;
    white-space: nowrap;
    text-align: center;
    flex-grow: 0;
    letter-spacing: 0.5px;
    transition: color var(--transition-time) ease;
}

:root[data-theme="dark"] .status-text {
    color: var(--primary-dark);
    text-shadow: 0 0 5px rgba(255, 99, 71, 0.5);
}

.status-tag {
    margin-left: auto;
    flex-shrink: 0;
}

/* 当前任务信息 */
.current-todo-info {
    background-color: rgba(255, 255, 255, 0.8);
    padding: 10px 15px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    width: 90%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transition: all var(--transition-time) ease;
}

:root[data-theme="dark"] .current-todo-info {
    background-color: rgba(35, 42, 55, 0.9);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.todo-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #555;
    transition: color var(--transition-time) ease;
}

:root[data-theme="dark"] .todo-title {
    color: #aaa;
}

.todo-tooltip {
    font-size: 12px;
    line-height: 1.6;
}

/* 计时器显示区域 */
.timer-display {
    position: relative;
    margin: 20px 0;
    transition: all 0.5s ease;
    z-index: 1;
}

.timer-active {
    transform: scale(1.05);
}

.timer-background {
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    background: radial-gradient(circle, rgba(255, 235, 230, 0.8) 0%, rgba(255, 245, 240, 0) 70%);
    border-radius: 50%;
    z-index: -1;
    animation: pulse 4s ease-in-out infinite;
}

:root[data-theme="dark"] .timer-background {
    background: radial-gradient(circle, rgba(255, 99, 71, 0.2) 0%, rgba(30, 38, 52, 0) 70%);
    animation: pulse 4s ease-in-out infinite, glow 3s infinite alternate;
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 0.8;
    }

    50% {
        transform: scale(1.05);
        opacity: 0.9;
    }

    100% {
        transform: scale(1);
        opacity: 0.8;
    }
}

@keyframes glow {
    0% {
        box-shadow: 0 0 5px rgba(255, 99, 71, 0.3);
    }
    100% {
        box-shadow: 0 0 25px rgba(255, 99, 71, 0.6);
    }
}

/* 进度条样式 */
.progress-bar-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 15px;
}

.progress-label {
    font-size: 12px;
    color: #666;
    margin: 5px 0;
    text-align: center;
    transition: color var(--transition-time) ease;
}

:root[data-theme="dark"] .progress-label {
    color: #aaa;
}

.progress-bar {
    height: 8px;
    background-color: rgba(255, 99, 71, 0.1);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
    transition: background-color var(--transition-time) ease;
}

:root[data-theme="dark"] .progress-bar {
    background-color: rgba(255, 99, 71, 0.15);
    box-shadow: 0 0 10px rgba(255, 99, 71, 0.2) inset;
}

.progress-fill {
    height: 100%;
    background-color: #ff6347;
    border-radius: 4px;
    transition: width 0.3s linear, background-color var(--transition-time) ease;
}

:root[data-theme="dark"] .progress-fill {
    background-color: var(--primary-dark);
    box-shadow: 0 0 10px rgba(255, 99, 71, 0.7);
}

.progress-tomato-icon {
    position: absolute;
    top: -6px;
    width: 20px;
    height: 20px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23ff6347"/><path d="M50,10 C50,10 40,-10 50,-20 C60,-10 50,10 50,10" fill="%23228B22" /></svg>');
    background-repeat: no-repeat;
    transform: translateX(-50%);
    transition: left 0.3s linear;
}

/* 控制按钮样式 */
.controls {
    margin: 20px 0 10px;
    width: 100%;
}

.control-btn {
    padding: 8px 20px;
    font-size: 15px;
    font-weight: 500;
    border-radius: 20px;
    transition: all 0.3s ease;
}

.toggle-btn {
    min-width: 120px;
}

.control-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.reset-btn {
    opacity: 0.8;
}

.reset-btn:hover {
    opacity: 1;
}

/* 模式切换样式 */
.mode-switch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 15px;
    margin-bottom: 5px;
    width: 100%;
    max-width: 400px;
}

.mode-switch :deep(.n-radio-group) {
    background-color: rgba(255, 255, 255, 0.7);
    padding: 2px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all var(--transition-time) ease;
}

:root[data-theme="dark"] .mode-switch :deep(.n-radio-group) {
    background-color: rgba(40, 44, 52, 0.9);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.mode-switch :deep(.n-radio-button) {
    min-width: 100px;
    text-align: center;
    transition: all var(--transition-time) ease;
}

:root[data-theme="dark"] .mode-switch :deep(.n-radio-button) {
    color: #ddd;
}

.mode-switch :deep(.n-radio-button--checked:not(.n-radio-button--disabled)) {
    color: #fff;
    background-color: #ff6347;
    border-color: #ff6347;
    box-shadow: 0 2px 5px rgba(255, 99, 71, 0.3);
    z-index: 1;
    transition: all var(--transition-time) ease;
}

:root[data-theme="dark"] .mode-switch :deep(.n-radio-button--checked:not(.n-radio-button--disabled)) {
    background-color: var(--primary-dark);
    border-color: var(--primary-dark);
    box-shadow: 0 2px 8px rgba(255, 99, 71, 0.5), 0 0 15px rgba(255, 99, 71, 0.3);
}

.settings-btn {
    font-size: 14px;
    margin-left: 5px;
}

/* 动画效果 */
@keyframes vineGrow {
    from {
        opacity: 0;
        transform: translateY(20px) scaleY(0.7);
    }

    to {
        opacity: 0.6;
        transform: translateY(0) scaleY(1);
    }
}

.timer-info {
    margin-top: 5px;
}

/* 添加问号图标按钮样式 */
.info-btn {
    margin-left: 5px;
    color: #ff6347;
    opacity: 0.7;
    transition: all 0.3s ease;
}

.info-btn:hover {
    opacity: 1;
    transform: rotate(15deg) scale(1.2);
}
</style>
