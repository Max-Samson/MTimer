<template>
  <div class="stats-view">
    <n-card class="stats-card">
      <n-tabs type="line" animated>
        <n-tab-pane name="daily" tab="每日小结">
          <DailySummary />
        </n-tab-pane>
        <n-tab-pane name="pomodoro" tab="番茄统计">
          <PomodoroStats />
        </n-tab-pane>
        <n-tab-pane name="event" tab="任务统计">
          <EventStats />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard, NTabs, NTabPane } from 'naive-ui';
import DailySummary from './DailySummary.vue';
import PomodoroStats from './PomodoroStats.vue';
import EventStats from './EventStats.vue';
import { provide, ref, onMounted, nextTick } from 'vue';
// 导入必要的API函数
import { UpdateStats } from '../../../wailsjs/go/main/App';

// 提供全局加载状态
const isLoading = ref(false);
const errorMessage = ref('');
const lastRefreshTime = ref(Date.now());

// 提供给子组件
provide('isLoading', isLoading);
provide('errorMessage', errorMessage);
provide('lastRefreshTime', lastRefreshTime);

// 设置全局加载状态
const setGlobalLoading = (loading: boolean) => {
  isLoading.value = loading;
};

// 设置错误消息
const setGlobalError = (message: string) => {
  errorMessage.value = message;
};

// 更新最后刷新时间
const updateLastRefreshTime = () => {
  lastRefreshTime.value = Date.now();
};

// 提供给子组件的方法
provide('setGlobalLoading', setGlobalLoading);
provide('setGlobalError', setGlobalError);
provide('updateLastRefreshTime', updateLastRefreshTime);

// 组件挂载时尝试更新统计数据，添加重试机制
onMounted(async () => {
  isLoading.value = true;

  try {
    // 创建一个超时Promise，5秒后自动结束加载状态
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('初始化统计数据超时')), 5000);
    });

    // 最多尝试2次，减少等待时间
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // 使用Promise.race确保不会永久等待
        await Promise.race([
          // 使用导入的API函数
          UpdateStats(''),
          timeoutPromise
        ]);

        console.log('统计数据已初始更新');

        // 成功后延迟一小段时间再关闭加载状态，给数据库时间处理
        setTimeout(() => {
          isLoading.value = false;
        }, 200);

        return; // 成功就退出循环
      } catch (error) {
        console.warn(`第 ${attempt} 次更新统计数据失败:`, error);

        if (attempt < 2) {
          // 重试前等待一段时间，时间逐渐增加
          const waitTime = 300; // 减少等待时间
          console.log(`将在 ${waitTime}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // 如果所有尝试都失败了
    console.error('更新统计数据失败，已达到最大重试次数');
    errorMessage.value = '无法更新统计数据，请刷新页面重试';
  } catch (e) {
    console.error('统计数据初始化出错:', e);
  } finally {
    // 无论如何都结束加载状态
    isLoading.value = false;

    // 确保组件可见性更新
    nextTick(() => {
      // 触发一个DOM事件，通知各子组件进行数据刷新
      window.dispatchEvent(new Event('stats-updated'));
    });
  }
});
</script>

<style scoped>
.stats-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-card {
  border-radius: 8px;
  overflow: hidden; /* 防止内容溢出 */
}

:deep(.n-tabs-nav) {
  padding: 0 10px;
}

:deep(.n-tab-pane) {
  padding: 10px 0;
}

@media (max-width: 768px) {
  .stats-view {
    padding: 10px;
  }
}

:root[data-theme="dark"] .stats-view {
  background-color: transparent;
}
</style>
