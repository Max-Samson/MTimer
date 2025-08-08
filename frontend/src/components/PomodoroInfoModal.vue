<script setup lang="ts">
import { ref, computed } from 'vue'
import { NModal, NCard, NButton, NIcon, NTimeline, NTimelineItem, NDrawer, NDrawerContent, NDivider, NTag, NSpace } from 'naive-ui'
import { Information, ChevronRight, Time } from '@vicons/carbon'

// 定义 props 和 emit
const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

// 计算属性用于绑定到抽屉的show属性
const drawerShow = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})
</script>

<template>
  <n-drawer v-model:show="drawerShow" :width="380" placement="right">
    <n-drawer-content title="番茄工作法介绍" closable>
      <div class="pomodoro-info">
        <div class="pomodoro-header">
          <div class="tomato-icon"></div>
          <h2>番茄工作法</h2>
        </div>

        <n-card class="intro-card" size="small">
          <p>番茄工作法是一种简单易行的时间管理方法，由弗朗西斯科·西里洛提出。它通过将工作时间分割成固定的时间段（番茄时间）来提高工作效率和专注度。</p>
        </n-card>

        <n-divider title-placement="left">
          <n-space align="center">
            <n-icon><Information /></n-icon>
            <span>基本原则</span>
          </n-space>
        </n-divider>

        <ul class="principle-list">
          <li>一个番茄时间（25分钟）不可分割，不存在半个或一个半番茄时间</li>
          <li>一个番茄时间内如果做与任务无关的事情，则该番茄时间作废</li>
          <li>永远不要在非工作时间内使用"番茄工作法"</li>
          <li>不要拿自己的番茄数据与他人的番茄数据比较</li>
          <li>番茄的数量不可能决定任务最终的成败</li>
          <li>必须有一份适合自己的作息时间表</li>
        </ul>

        <n-divider title-placement="left">
          <n-space align="center">
            <n-icon><ChevronRight /></n-icon>
            <span>工作步骤</span>
          </n-space>
        </n-divider>

        <n-timeline>
          <n-timeline-item type="success" content="规划今日任务，将任务写在列表里" />
          <n-timeline-item type="info" content="设定番茄钟（25分钟）" />
          <n-timeline-item type="warning" content="开始完成第一项任务，直到番茄钟响铃" />
          <n-timeline-item type="error" content="停止工作，在列表里标记完成记录" />
          <n-timeline-item type="success" content="休息3~5分钟，活动、喝水、方便等" />
          <n-timeline-item type="info" content="开始下一个番茄钟，继续任务" />
          <n-timeline-item type="warning" content="重复上述过程，直到完成任务" />
          <n-timeline-item type="error" content="每完成四个番茄钟后，休息25分钟" />
        </n-timeline>

        <div class="note">
          <n-divider title-placement="left">
            <n-space align="center">
              <n-icon><Time /></n-icon>
              <span>中断处理</span>
            </n-space>
          </n-divider>
          <p>在番茄钟过程中，如果突然想起要做其他事情：</p>
          <ul>
            <li><n-tag type="error" size="small">必须立即处理的事</n-tag>：停止这个番茄钟并宣告它作废，去完成这件事，之后再重新开始同一个番茄钟</li>
            <li><n-tag type="success" size="small">可以稍后处理的事</n-tag>：在列表里该项任务后面标记一个逗号（表示打扰），将这件事记在"计划外事件"列表里，继续完成当前番茄钟</li>
          </ul>
        </div>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.pomodoro-info {
  padding: 0 10px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.pomodoro-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--primary-color, #ff6347);
  animation: fadeIn 0.8s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.tomato-icon {
  width: 32px;
  height: 32px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="70" r="40" fill="%23ff6347"/><path d="M50,30 C50,30 40,10 50,0 C60,10 50,30 50,30" fill="%23228B22" /><path d="M50,30 C50,30 20,20 10,5 C30,15 50,30 50,30" fill="%2332CD32" /><path d="M50,30 C50,30 80,20 90,5 C70,15 50,30 50,30" fill="%2332CD32" /></svg>');
  background-repeat: no-repeat;
  background-size: contain;
  animation: bounceIn 1s ease-in-out;
}

@keyframes bounceIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}

.pomodoro-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--primary-color, #ff6347);
  animation: slideIn 0.6s ease-in-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.intro-card {
  margin-bottom: 16px;
  background-color: rgba(255, 99, 71, 0.05);
  border-radius: 8px;
  animation: fadeInUp 0.8s ease-in-out;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.intro-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(255, 99, 71, 0.2);
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.principle-list {
  padding-left: 20px;
  margin-bottom: 24px;
}

.principle-list li {
  margin-bottom: 8px;
  position: relative;
  list-style-type: none;
  padding-left: 20px;
  transition: all 0.3s ease;
  animation: fadeInRight 0.5s ease-in-out;
  animation-fill-mode: both;
}

.principle-list li:nth-child(1) { animation-delay: 0.1s; }
.principle-list li:nth-child(2) { animation-delay: 0.2s; }
.principle-list li:nth-child(3) { animation-delay: 0.3s; }
.principle-list li:nth-child(4) { animation-delay: 0.4s; }
.principle-list li:nth-child(5) { animation-delay: 0.5s; }
.principle-list li:nth-child(6) { animation-delay: 0.6s; }

@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.principle-list li::before {
  content: "•";
  color: var(--primary-color, #ff6347);
  font-weight: bold;
  font-size: 1.2rem;
  position: absolute;
  left: 0;
  transition: all 0.3s ease;
}

.principle-list li:hover {
  color: var(--primary-color, #ff6347);
  transform: translateX(5px);
  background-color: rgba(255, 99, 71, 0.05);
  border-radius: 4px;
  padding: 5px 10px 5px 25px;
  margin-left: -15px;
}

.principle-list li:hover::before {
  left: 5px;
  transform: scale(1.2);
}

.n-timeline {
  padding: 10px;
  animation: fadeIn 1s ease-in-out;
  animation-delay: 0.4s;
  animation-fill-mode: both;
}

.n-timeline-item {
  transition: all 0.3s ease;
  padding: 5px;
  border-radius: 4px;
}

.n-timeline-item:hover {
  transform: translateX(5px);
  background-color: rgba(255, 99, 71, 0.05);
}

.note {
  margin-top: 24px;
  padding: 15px;
  background-color: rgba(255, 99, 71, 0.05);
  border-radius: 8px;
  border-left: 3px solid var(--primary-color, #ff6347);
  animation: slideInUp 0.8s ease-in-out;
  animation-delay: 0.6s;
  animation-fill-mode: both;
  transition: all 0.3s ease;
}

.note:hover {
  background-color: rgba(255, 99, 71, 0.1);
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

.note p {
  margin-top: 0;
}

.note ul li {
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.note ul li:hover {
  transform: scale(1.02);
}

:root[data-theme="dark"] .intro-card,
:root[data-theme="dark"] .note {
  background-color: rgba(255, 99, 71, 0.1);
}

:root[data-theme="dark"] .principle-list li:hover,
:root[data-theme="dark"] .n-timeline-item:hover {
  background-color: rgba(255, 99, 71, 0.15);
}

/* 滚动条样式 */
.pomodoro-info::-webkit-scrollbar {
  width: 8px;
}

.pomodoro-info::-webkit-scrollbar-track {
  background: transparent;
}

.pomodoro-info::-webkit-scrollbar-thumb {
  background-color: rgba(255, 99, 71, 0.5);
  border-radius: 10px;
}

.pomodoro-info::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 99, 71, 0.8);
}

/* 抽屉打开/关闭动画 */
.n-drawer-content {
  animation: slideInFromRight 0.3s ease-in-out;
}

@keyframes slideInFromRight {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
