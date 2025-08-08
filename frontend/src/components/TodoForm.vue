<script setup lang="ts">
import { ref } from 'vue'
import { NForm, NFormItem, NInput, NRadio, NRadioGroup, NInputNumber, NButton, NSpace } from 'naive-ui'
import { useTodoStore } from '../stores'
import { TimerSettings } from '../stores/todoStore'

const todoStore = useTodoStore()
const todoText = ref('')
const timerMode = ref<'standard' | 'custom'>('standard')
const estimatedPomodoros = ref(1)

// 标准番茄钟设置
const standardSettings = ref({
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15
})

// 自定义时间设置
const customTime = ref(25)

const handleSubmit = () => {
    if (todoText.value.trim()) {
        const timerSettings: TimerSettings = {
            workTime: standardSettings.value.workTime,
            shortBreakTime: standardSettings.value.shortBreakTime,
            longBreakTime: standardSettings.value.longBreakTime,
            isCustom: timerMode.value === 'custom',
            customTime: timerMode.value === 'custom' ? customTime.value : undefined
        }

        todoStore.addTodo({
            name: todoText.value.trim(),
            mode: timerMode.value === 'standard' ? 'pomodoro' : 'custom',
            estimatedPomodoros: estimatedPomodoros.value
        })
        todoText.value = ''
        timerMode.value = 'standard'
        estimatedPomodoros.value = 1
    }
}
</script>

<template>
    <n-form class="todo-form">
        <n-form-item label="待办事项">
            <n-input v-model:value="todoText" placeholder="输入待办事项内容" />
        </n-form-item>

        <n-form-item label="计时模式">
            <n-radio-group v-model:value="timerMode">
                <n-space>
                    <n-radio value="standard">标准番茄钟</n-radio>
                    <n-radio value="custom">自定义时间</n-radio>
                </n-space>
            </n-radio-group>
        </n-form-item>

        <template v-if="timerMode === 'standard'">
            <n-form-item label="工作时间">
                <n-input-number v-model:value="standardSettings.workTime" :min="1" :max="60" />
            </n-form-item>
            <n-form-item label="短休息时间">
                <n-input-number v-model:value="standardSettings.shortBreakTime" :min="1" :max="30" />
            </n-form-item>
            <n-form-item label="长休息时间">
                <n-input-number v-model:value="standardSettings.longBreakTime" :min="1" :max="45" />
            </n-form-item>
        </template>

        <template v-else>
            <n-form-item label="专注时间">
                <n-input-number v-model:value="customTime" :min="1" :max="120" />
            </n-form-item>
        </template>

        <n-form-item label="预计番茄钟数量">
            <n-input-number v-model:value="estimatedPomodoros" :min="1" :max="10" />
        </n-form-item>

        <n-form-item>
            <n-button type="primary" @click="handleSubmit">添加待办事项</n-button>
        </n-form-item>
    </n-form>
</template>

<style scoped>
.todo-form {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
}
</style>
