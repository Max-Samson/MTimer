<template>
  <div class="task-preview rounded-xl bg-gray-50 dark:bg-gray-800 p-3 shadow-sm transition-all duration-300 hover:shadow-md border border-indigo-100 dark:border-indigo-900/30">
    <!-- 标题栏和折叠按钮 -->
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-base font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
        <n-icon size="18" class="text-indigo-500 dark:text-indigo-400">
          <TimeOutline />
        </n-icon>
        <span>AI推荐的番茄工作计划 <span class="text-sm font-normal text-gray-500">({{tasks.length}}个任务)</span></span>
      </h3>

      <div class="flex items-center gap-2">
        <n-button
          circle
          size="small"
          class="text-gray-500 hover:text-indigo-500 dark:text-gray-400 transition-all duration-300"
          @click="isExpanded = !isExpanded"
          type="tertiary"
        >
          <template #icon>
            <n-icon><ExpandAll v-if="!isExpanded" /><CollapseAll v-else /></n-icon>
          </template>
        </n-button>

        <n-button
          type="primary"
          size="small"
          class="bg-indigo-500 hover:bg-indigo-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md"
          @click="handleApply"
        >
          <template #icon>
            <n-icon><CheckmarkFilled /></n-icon>
          </template>
          应用计划
        </n-button>
      </div>
    </div>

    <!-- 任务总结信息 -->
    <div class="flex flex-wrap gap-2 mb-2 px-2 py-1.5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg text-sm">
      <div class="flex items-center gap-1">
        <n-icon size="16" class="text-indigo-500 dark:text-indigo-400"><Time /></n-icon>
        <span class="font-medium text-gray-600 dark:text-gray-300">总时间:</span>
        <span class="font-semibold text-indigo-600 dark:text-indigo-400">{{calculateTotalFocusTime()}}分钟</span>
      </div>
      <div class="flex items-center gap-1">
        <n-icon size="16" class="text-indigo-500 dark:text-indigo-400"><Time /></n-icon>
        <span class="font-medium text-gray-600 dark:text-gray-300">预计完成:</span>
        <span class="font-semibold text-indigo-600 dark:text-indigo-400">{{formatCompletionTime()}}</span>
      </div>
    </div>

    <!-- 可折叠的详细内容 -->
    <div v-if="isExpanded" class="flex flex-col gap-2 transition-all duration-300">
      <div class="table-container max-h-[150px] overflow-auto">
        <n-card size="small" class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-all duration-300">
          <n-table :bordered="false" :single-line="false" size="small">
            <thead>
              <tr>
                <th class="text-left text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-100 dark:bg-gray-700/50 sticky top-0 z-10">任务名称</th>
                <th class="text-center text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-100 dark:bg-gray-700/50 sticky top-0 z-10 w-24">专注模式</th>
                <th class="text-center text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-100 dark:bg-gray-700/50 sticky top-0 z-10 w-20">专注时长</th>
                <th class="text-center text-gray-700 dark:text-gray-300 px-3 py-2 bg-gray-100 dark:bg-gray-700/50 sticky top-0 z-10 w-20">休息时长</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(task, index) in tasks"
                :key="index"
                class="border-t border-gray-200 dark:border-gray-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors duration-200"
                :class="{ 'animate-slideIn': true }"
                :style="{ animationDelay: `${index * 0.1}s` }"
              >
                <td class="py-1.5 px-3 text-gray-800 dark:text-gray-200">
                  <div class="flex items-center">
                    <span class="task-number flex-shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-medium text-xs mr-2">{{index + 1}}</span>
                    <n-icon size="16" class="text-indigo-500 dark:text-indigo-400 mr-1.5 flex-shrink-0">
                      <Calendar v-if="task.mode === 'pomodoro'" />
                      <Task v-else-if="task.mode === 'deep_work'" />
                      <Pause v-else-if="task.mode === 'short_break'" />
                      <Time v-else-if="task.mode === 'long_break'" />
                      <Document v-else />
                    </n-icon>
                    <span class="truncate max-w-[120px]" :title="task.name">{{ task.name }}</span>
                  </div>
                </td>
                <td class="py-1.5 px-3 text-center text-gray-800 dark:text-gray-200">
                  <n-tag
                    :bordered="false"
                    :color="getModeColor(task.mode)"
                    size="small"
                    class="transition-all duration-300 transform hover:scale-105"
                  >
                    {{ formatMode(task.mode) }}
                  </n-tag>
                </td>
                <td class="py-1.5 px-3 text-center text-indigo-600 dark:text-indigo-400 font-medium">
                  {{ task.focusDuration }}<span class="text-xs ml-0.5 text-gray-500 dark:text-gray-400">分钟</span>
                </td>
                <td class="py-1.5 px-3 text-center text-green-600 dark:text-green-400 font-medium">
                  {{ task.breakDuration }}<span class="text-xs ml-0.5 text-gray-500 dark:text-gray-400">分钟</span>
                </td>
              </tr>
            </tbody>
          </n-table>
        </n-card>
      </div>
    </div>

    <!-- 简洁视图（未展开时显示） -->
    <div v-else class="flex flex-wrap gap-2 transition-all duration-300">
      <n-tag
        v-for="(task, index) in tasks"
        :key="index"
        :bordered="false"
        :color="getModeColor(task.mode)"
        size="small"
        class="transition-all duration-300 transform hover:scale-105"
      >
        <span class="inline-flex items-center">
          <span class="tag-number inline-flex items-center justify-center w-5 h-5 bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-medium mr-1.5 shadow-sm">{{index + 1}}</span>
          {{ task.name }} ({{ task.focusDuration }}分钟)
        </span>
      </n-tag>
      <div class="text-xs text-gray-500 dark:text-gray-400 w-full mt-1 text-center cursor-pointer hover:text-indigo-500" @click="isExpanded = true">
        点击展开查看详情...
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue';
import { format, addMinutes } from 'date-fns';
import { CheckmarkFilled, Calendar, Document, Time, ExpandAll, CollapseAll, Pause, PlayFilled, Task } from '@vicons/carbon';
import { TimeOutline } from '@vicons/ionicons5';
import { TaskPlan } from '../../services/AIAssistantService';
import { NTable, NCard, NIcon, NButton, NTag } from 'naive-ui';

const props = defineProps<{
  tasks: TaskPlan[];
}>();

const emit = defineEmits<{
  (e: 'apply'): void;
}>();

// 展开/折叠状态
const isExpanded = ref(false);

// 格式化专注模式
function formatMode(mode: string): string {
  const modeMap: Record<string, string> = {
    'pomodoro': '番茄工作法',
    'deep_work': '深度工作',
    'short_break': '短休息',
    'long_break': '长休息'
  };
  return modeMap[mode] || mode;
}

// 获取模式对应的颜色
function getModeColor(mode: string): { color: string, textColor: string } {
  const colorMap: Record<string, { color: string, textColor: string }> = {
    'pomodoro': { color: '#e5f6ff', textColor: '#0e7490' },      // 淡蓝色
    'deep_work': { color: '#f0f9ff', textColor: '#0369a1' },     // 深蓝色
    'short_break': { color: '#ecfdf5', textColor: '#059669' },   // 绿色
    'long_break': { color: '#fffbeb', textColor: '#b45309' },    // 橙色
  };
  return colorMap[mode] || { color: '#f3f4f6', textColor: '#4b5563' }; // 默认灰色
}

// 计算总专注时间
function calculateTotalFocusTime(): number {
  return props.tasks.reduce((total, task) => total + task.focusDuration, 0);
}

// 格式化预计完成时间
function formatCompletionTime(): string {
  const now = new Date();
  const totalMinutes = props.tasks.reduce((total, task) => {
    return total + task.focusDuration + task.breakDuration;
  }, 0);

  const completionTime = addMinutes(now, totalMinutes);
  return format(completionTime, 'HH:mm');
}

// 处理应用按钮点击
function handleApply(): void {
  emit('apply');
}
</script>

<style scoped>
.animate-slideIn {
  animation: slideIn 0.5s ease-out forwards;
  opacity: 0;
  transform: translateY(10px);
}

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-preview {
  max-height: 350px;
  overflow-y: auto;
  border-radius: 10px;
  position: relative;
}

.table-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  max-height: 200px; /* 设置表格容器的最大高度 */
  overflow-y: auto;
  border-radius: 8px;
}

.table-container::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.table-container::-webkit-scrollbar-track {
  background: transparent;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 简洁视图标签样式 */
:deep(.n-tag) {
  transition: all 0.3s ease;
}

:deep(.n-tag):hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 任务编号样式 */
.task-number {
  transition: all 0.3s ease;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

tr:hover .task-number {
  transform: scale(1.1);
  background-color: rgba(99, 102, 241, 0.3);
  color: white;
}

.tag-number {
  transition: all 0.3s ease;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

:deep(.n-tag:hover) .tag-number {
  transform: scale(1.1);
  background-color: rgba(99, 102, 241, 0.2);
}
</style>

