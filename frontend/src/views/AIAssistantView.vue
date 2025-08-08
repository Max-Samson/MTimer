<template>
  <div class="ai-assistant-view flex flex-col h-full w-full bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-900 dark:to-indigo-950/30 overflow-hidden transition-colors duration-300">
    <!-- 顶部标题栏 -->
    <div class="header-bar bg-white dark:bg-gray-800/95 shadow-sm border-b border-gray-200 dark:border-gray-700/80 px-4 py-2 transition-colors duration-300 flex-shrink-0 backdrop-blur-sm">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/70 shadow-sm dark:shadow-indigo-500/20">
            <n-icon size="20" class="text-indigo-500 dark:text-indigo-400">
              <Bot />
            </n-icon>
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-900 dark:text-gray-100 m-0 flex items-center gap-2">
              AI 时间专注助手
              <n-badge dot processing type="success" class="ml-1" v-if="hasValidAPI" />
            </h1>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <div>
                <n-dropdown
                  :options="modeOptions"
                  @select="changeMode"
                  trigger="click"
                >
                  <n-button
                    size="small"
                    class="mode-button bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-900/60 dark:to-indigo-800/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/70 border-none shadow-sm hover:shadow transition-all hover:-translate-y-0.5 dark:shadow-indigo-600/10"
                  >
                    <template #icon>
                      <n-icon size="18" class="animate-pulse-slow">
                        <Chat v-if="currentMode === 'chat'" />
                        <Time v-else-if="currentMode === 'task'" />
                        <Education v-else-if="currentMode === 'study'" />
                      </n-icon>
                    </template>
                    {{ getModeText() }}
                  </n-button>
                </n-dropdown>
              </div>
            </template>
            <span>切换对话模式</span>
          </n-tooltip>

          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <n-button
                @click="refreshAIChat"
                size="small"
                class="refresh-button bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/30 text-blue-600 dark:text-blue-300 hover:shadow hover:-translate-y-0.5 transition-all duration-300 dark:shadow-blue-600/10"
              >
                <template #icon>
                  <n-icon size="18" :class="{'animate-spin-slow': isRefreshing}"><Renew /></n-icon>
                </template>
                <span class="text-xs ml-1">刷新</span>
              </n-button>
            </template>
            <span>重置AI对话</span>
          </n-tooltip>

          <n-tooltip trigger="hover" placement="bottom">
            <template #trigger>
              <n-button
                @click="showDebugPanel = !showDebugPanel"
                size="small"
                class="settings-button bg-gradient-to-r from-teal-50 to-green-50 dark:from-teal-900/40 dark:to-green-900/30 text-teal-600 dark:text-teal-300 hover:shadow hover:-translate-y-0.5 transition-all duration-300 dark:shadow-teal-600/10"
              >
                <template #icon>
                  <n-icon size="18"><Tools /></n-icon>
                </template>
                <span class="text-xs ml-1">设置</span>
              </n-button>
            </template>
            <span>AI聊天测试设置</span>
          </n-tooltip>
        </div>
      </div>
    </div>

    <!-- 聊天区域容器 - 固定高度并使用overflow属性 -->
    <div class="chat-container flex-1 px-4 py-2 md:px-6 lg:px-8 overflow-hidden flex flex-col">
      <!-- 调试信息 -->
      <div v-if="showDebugPanel" class="debug-panel p-3 bg-gray-100 dark:bg-gray-800/90 mb-4 rounded text-xs border border-gray-300 dark:border-gray-600/80 flex-shrink-0 dark:shadow-md dark:shadow-gray-900/30">
        <div class="flex justify-between items-center mb-2">
          <div class="font-bold">AI聊天组件调试面板</div>
          <n-button size="tiny" @click="showDebugPanel = false">关闭</n-button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><span class="font-semibold">历史消息数:</span> {{chatHistory?.value?.length || 0}}</div>
          <div><span class="font-semibold">加载状态:</span> {{isLoading?.value ? '加载中' : '空闲'}}</div>
          <div><span class="font-semibold">当前模式:</span> {{currentMode}}</div>
          <div><span class="font-semibold">API密钥:</span> {{hasValidAPI ? '已设置' : '未设置'}}</div>
        </div>
        <div class="mt-2 border-t border-gray-300 dark:border-gray-600/80 pt-2" v-if="chatHistory?.value?.length">
          <div class="font-semibold mb-1">最近消息:</div>
          <div class="max-h-20 overflow-y-auto bg-white dark:bg-gray-700/90 p-2 rounded">
            <div v-for="(msg, i) in chatHistory.value.slice(-2)" :key="i" class="mb-1 pb-1 border-b border-dashed border-gray-200 dark:border-gray-600/80">
              <div><span class="font-semibold">角色:</span> {{msg.role}}</div>
              <div><span class="font-semibold">内容:</span> {{msg.content.substring(0, 50)}}{{msg.content.length > 50 ? '...' : ''}}</div>
              <div><span class="font-semibold">时间:</span> {{new Date(msg.timestamp).toLocaleTimeString()}}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天组件区域 - 使用固定布局确保不会导致页面滚动 -->
      <div class="chat-component-wrapper flex-1 overflow-hidden flex flex-col min-h-0">
        <AIChat
          :chat-history="ensuredChatHistory"
          :is-loading="ensuredIsLoading"
          :chat-mode="currentMode"
          @send-message="sendMessage"
          @apply-plan="applyPlan"
          @clear-history="clearHistory"
          @regenerate="regenerateResponse"
          @feedback="handleFeedback"
          class="animate-fadeIn h-full"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, Ref, nextTick } from 'vue';
import { useMessage, NTooltip, NButton, NIcon } from 'naive-ui';
import { useRouter } from 'vue-router';
import { Bot, Reset, Chat, Time, Education, Tools, Renew } from '@vicons/carbon';
import AIAssistantService, { TaskPlan, ChatMode } from '../services/AIAssistantService';
import AIChat from '../components/AIChat.vue';
import { useSettingsStore } from '../stores';

const message = useMessage();
const router = useRouter();
const settingsStore = useSettingsStore();

// 使用try-catch确保即使服务初始化失败也不会导致整个视图崩溃
let chatHistory: Ref<any[]>;
let isLoading: Ref<boolean>;
let currentMode: Ref<ChatMode>;
const isRefreshing = ref(false);

try {
  chatHistory = AIAssistantService.getChatHistory();
  isLoading = AIAssistantService.getLoadingState();
  currentMode = ref<ChatMode>(AIAssistantService.getCurrentChatMode().value || 'task');
} catch (error) {
  console.error('获取AI服务数据失败:', error);
  // 创建默认数据
  chatHistory = ref([{
    role: 'assistant',
    content: '初始化失败，请刷新页面重试。',
    timestamp: Date.now()
  }]);
  isLoading = ref(false);
  currentMode = ref<ChatMode>('task');

  // 显示错误消息
  setTimeout(() => {
    message.error('AI助手初始化失败，请刷新页面重试');
  }, 500);
}

const showDebugPanel = ref(false); // 默认不显示调试面板

// 检查是否有有效的API密钥
const hasValidAPI = computed(() => {
  return !!settingsStore.aiSettings.apiKey;
});

// 模式选项
const modeOptions = [
  {
    label: '任务规划模式',
    key: 'task',
    icon: Time
  },
  {
    label: '日常聊天模式',
    key: 'chat',
    icon: Chat
  },
  {
    label: '学习助手模式',
    key: 'study',
    icon: Education
  }
];

// 获取当前模式文本
const getModeText = () => {
  switch (currentMode.value) {
    case 'task':
      return '任务规划';
    case 'chat':
      return '日常聊天';
    case 'study':
      return '学习助手';
    default:
      return '任务规划';
  }
};

// 切换模式
const changeMode = (key: string | number) => {
  const mode = key as ChatMode;
  if (mode !== currentMode.value) {
    currentMode.value = mode;
    AIAssistantService.setChatMode(mode);
    message.success(`已切换到${getModeText()}模式`);
  }
};

// 发送消息
const sendMessage = async (input: string) => {
  if (input.trim() === '' || isLoading.value) return;

  // 发送消息到AI服务
  await AIAssistantService.sendMessage(input);
};

// 应用计划
const applyPlan = async (taskPlan: TaskPlan[]) => {
  message.info('正在应用计划，请稍候...');
  const success = await AIAssistantService.applyTaskPlan(taskPlan);

  if (success) {
    message.success('计划已应用，已为你创建任务');
    // 导航到待办事项页面
    setTimeout(() => {
      router.push('/todo');
    }, 1500);
  } else {
    message.error('应用计划失败，请稍后再试');
  }
};

// 清空聊天记录
const clearHistory = () => {
  AIAssistantService.clearChatHistory();
};

// 重新生成回复
const regenerateResponse = async (messageIndex: number) => {
  if (isLoading.value) return;

  message.info('正在重新生成回复...');

  try {
    // 如果需要实现，可以调用AIAssistantService的相应方法
    // 这里简单实现为直接发送最近一条用户消息
    const userMessages = chatHistory.value.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      await AIAssistantService.sendMessage(lastUserMessage.content);
    }
  } catch (error) {
    message.error('重新生成失败，请稍后再试');
    console.error('重新生成失败:', error);
  }
};

// 处理消息反馈
const handleFeedback = (messageIndex: number, type: string, value: boolean) => {
  // 实际项目中可以发送到后端记录
  console.log(`消息反馈: 索引=${messageIndex}, 类型=${type}, 值=${value}`);

  if (value) {
    message.success(`感谢您的${type === 'like' ? '点赞' : '反馈'}！`);
  }
};

// 刷新AI对话
const refreshAIChat = async () => {
  if (isLoading.value || isRefreshing.value) return;

  isRefreshing.value = true;
  message.info('正在刷新AI对话...');

  try {
    // 清空聊天历史
    AIAssistantService.clearChatHistory();

    // 更新视图
    await nextTick();

    // 提示用户刷新成功
    message.success('AI对话已重置');
  } catch (error) {
    console.error('刷新AI对话失败:', error);
    message.error('刷新失败，请稍后再试');
  } finally {
    // 延迟关闭刷新状态，以便动画效果更明显
    setTimeout(() => {
      isRefreshing.value = false;
    }, 800);
  }
};

// 刷新视图 (保留但不使用)
const refreshView = () => {
  window.location.reload();
};

// 在script setup部分添加防御性检查
const ensuredChatHistory = computed(() => {
  return chatHistory?.value || [];
});

const ensuredIsLoading = computed(() => {
  return isLoading?.value || false;
});

onMounted(() => {
  // 确保AI服务已初始化
  console.log("正在初始化AI组件...");

  // 初始化聊天历史，如果为空或不存在则创建新的
  if (!chatHistory?.value || chatHistory.value.length <= 0) {
    console.log("聊天历史为空，正在初始化...");
    AIAssistantService.clearChatHistory();
  }

  // 确保isLoading已初始化
  if (isLoading?.value === undefined) {
    console.log("加载状态未定义，设置为false");
    // 如果isLoading未定义，则尝试重新获取
    const loadingState = AIAssistantService.getLoadingState();
    if (loadingState?.value !== undefined) {
      isLoading = loadingState;
    }
  }

  // 如果没有API密钥，提示用户设置
  if (!hasValidAPI.value) {
    setTimeout(() => {
      message.warning('请设置DeepSeek API密钥以使用AI助手功能');
    }, 1000);
  }

  // 日志输出当前聊天历史状态
  console.log("AI组件挂载时聊天历史:", {
    length: ensuredChatHistory.value.length,
    消息内容示例: ensuredChatHistory.value.slice(-2).map(msg => ({
      role: msg.role,
      content: msg.content.substring(0, 30) + '...',
      时间戳: new Date(msg.timestamp).toLocaleTimeString()
    }))
  });

  // 监听聊天历史变化（在组件内部进行调试）
  watch(() => ensuredChatHistory.value, (newHistory, oldHistory) => {
    console.log("聊天历史变化:", {
      oldLength: oldHistory?.length || 0,
      newLength: newHistory.length,
      最新消息: newHistory.slice(-1).map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 30) + '...',
        时间戳: new Date(msg.timestamp).toLocaleTimeString()
      }))
    });
  }, { deep: true });
});
</script>

<style scoped>
/* 渐入动画 */
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 确保整个视图使用固定高度并防止滚动 */
.ai-assistant-view {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* 标题栏样式 */
.header-bar {
  height: 50px;
  z-index: 10;
}

/* 聊天容器样式 */
.chat-container {
  height: calc(100% - 50px); /* 减去标题栏高度 */
  overflow: hidden;
  max-height: calc(100vh - 50px);
}

/* 聊天组件包装器样式 */
.chat-component-wrapper {
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* 模式按钮样式 */
.mode-button {
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  padding: 0 12px;
}

/* 刷新按钮 */
.refresh-button {
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-radius: 20px;
}

/* 设置按钮 */
.settings-button {
  transform: translateY(0);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-radius: 20px;
}

/* 标题栏渐变阴影 */
:deep(.n-badge--dot.n-badge--processing::after) {
  animation-duration: 2s;
}

/* 调试面板样式 */
.debug-panel {
  z-index: 5;
  max-height: 200px;
  overflow-y: auto;
}

/* 调整消息列表样式，使其在更紧凑的视口中也能正常显示 */
:deep(.message-list) {
  max-height: calc(100vh - 160px);
  min-height: 150px;
}

/* 输入区域样式调整 */
:deep(.input-area) {
  padding: 8px;
  margin-top: 8px;
}

/* 按钮动画 */
@keyframes pulse-slow {
  0% {
    opacity: 0.8;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.8;
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s infinite ease-in-out;
}

.animate-spin-slow {
  animation: spin-slow 1.5s infinite linear;
}

/* 按钮悬浮效果 */
.refresh-button:hover, .mode-button:hover, .settings-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* 优化媒体查询，针对不同屏幕高度调整样式 */
@media (max-height: 800px) {
  .chat-container {
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }

  :deep(.message-list) {
    max-height: calc(100vh - 140px);
  }

  :deep(.input-area) {
    padding: 6px;
    margin-top: 4px;
  }
}

@media (max-height: 600px) {
  .header-bar {
    height: 40px;
  }

  .chat-container {
    height: calc(100% - 40px);
    max-height: calc(100vh - 40px);
  }

  :deep(.message-list) {
    max-height: calc(100vh - 120px);
  }
}
</style>
