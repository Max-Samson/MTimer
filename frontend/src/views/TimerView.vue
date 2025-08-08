<script setup lang="ts">
import { NCard, NForm, NFormItem, NInputNumber, NSpace, NButton } from 'naive-ui'
import { useTimerStore } from '../stores'
import { storeToRefs } from 'pinia'

// 使用Pinia store
const timerStore = useTimerStore()

// 使用storeToRefs保持响应性
const { workTime, shortBreakTime, longBreakTime } = storeToRefs(timerStore)

const saveSettings = () => {
    // 使用store的方法保存番茄工作法模式设置
    timerStore.savePomodoroSettings()
}
</script>

<template>
    <div class="timer-view">
        <n-card class="timer-settings">
            <h3>番茄工作法模式设置</h3>
            <n-form inline>
                <n-form-item label="工作时长">
                    <n-input-number v-model:value="workTime" :min="1" :max="60" size="small" />
                </n-form-item>
                <n-form-item label="短休息">
                    <n-input-number v-model:value="shortBreakTime" :min="1" :max="30" size="small" />
                </n-form-item>
                <n-form-item label="长休息">
                    <n-input-number v-model:value="longBreakTime" :min="1" :max="45" size="small" />
                </n-form-item>
                <n-form-item>
                    <n-button type="primary" size="small" @click="saveSettings">应用</n-button>
                </n-form-item>
            </n-form>
        </n-card>
    </div>
</template>

<style scoped>
.timer-view {
    text-align: center;
    padding: 20px;
}

.timer-settings {
    max-width: 800px;
    margin: 0 auto;
    margin-bottom: 20px;
}

:deep(.n-form) {
    justify-content: center;
}

:deep(.n-form-item) {
    margin-right: 16px;
}
</style>