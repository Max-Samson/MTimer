<template>
  <div class="ai-chat-container bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden rounded-lg shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700">
    <!-- API密钥未设置时的提示 -->
    <div v-if="!hasApiKey" class="flex flex-col items-center justify-center p-8 text-center flex-1 animate-fadeIn">
      <n-icon size="64" class="text-indigo-500 mb-6 animate-pulse">
        <Key />
      </n-icon>
      <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">需要DeepSeek API密钥</h3>
      <p class="text-gray-600 dark:text-gray-300 mb-6 max-w-md leading-relaxed">
        要使用AI助手功能，您需要设置DeepSeek API密钥。
        DeepSeek是一个强大的AI模型，可以帮助您规划任务和回答问题。
      </p>
      <div class="space-y-4 w-full max-w-xs">
        <n-button type="primary" size="large" class="w-full bg-indigo-500 hover:bg-indigo-600 transition-all duration-300 transform hover:-translate-y-1" @click="goToSettings">
          <template #icon>
            <n-icon><Settings /></n-icon>
          </template>
          去设置API密钥
        </n-button>
        <div class="text-sm text-gray-500 dark:text-gray-400 px-4">
          <p>您可以在<a href="https://platform.deepseek.com/" target="_blank" class="text-indigo-500 hover:underline">DeepSeek平台</a>上注册并获取API密钥</p>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- 消息列表 - 使用固定高度和滚动条 -->
      <div class="message-list flex-1 overflow-y-auto p-4 min-h-0" ref="chatHistoryRef">
        <!-- 加载状态 - 改进的思考动画 -->
        <div v-if="isLoading" class="thinking-container thinking-container-enhanced flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg my-4 animate-pulse">
          <n-spin size="small" />
          <div class="thinking-dots flex gap-1">
            <span class="dot animate-bounce">·</span>
            <span class="dot animate-bounce" style="animation-delay: 0.2s">·</span>
            <span class="dot animate-bounce" style="animation-delay: 0.4s">·</span>
          </div>
          <span class="text-indigo-600 dark:text-indigo-400 font-medium">AI正在思考中</span>
        </div>

        <!-- 聊天消息 -->
        <template v-if="chatHistory && chatHistory.length > 0">
          <div v-for="(message, index) in chatHistory" :key="index" class="mb-6">
            <div v-if="message" class="message-item">
              <MessageBubble
                :is-user="message.role === 'user'"
                :content="message.content || ''"
                :timestamp="message.timestamp || Date.now()"
                :image="message.image"
                @regenerate="$emit('regenerate', index)"
                @feedback="(type, value) => $emit('feedback', index, type, value)"
              />

              <TaskPreview
                v-if="message.taskData && message.taskData.length > 0 && message.role === 'assistant'"
                :tasks="message.taskData"
                @apply="$emit('apply-plan', message.taskData)"
                class="mt-4 transform transition-all duration-500 animate-fadeIn"
              />
            </div>
            <div v-else class="text-red-500 text-center py-2 rounded bg-red-50 dark:bg-red-900/20">
              <n-icon class="mr-1"><InformationFilled /></n-icon>
              消息无效，请刷新页面
            </div>
          </div>
        </template>

        <div v-if="chatHistory && chatHistory.length > 0" class="debug-info text-xs text-gray-400 p-2 mt-2 border-t border-gray-200 dark:border-gray-700">
          {{chatHistory.length}}条消息，最后更新: {{new Date().toLocaleTimeString()}}
        </div>

        <!-- 欢迎消息 - 更美观的引导提示 -->
        <div v-if="(!chatHistory || chatHistory.length === 0) && !isLoading" class="welcome-container flex flex-col items-center justify-center p-8 text-center">
          <div class="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6 animate-pulse">
            <n-icon size="48" class="text-indigo-500 dark:text-indigo-400">
              <Bot />
            </n-icon>
          </div>
          <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">欢迎使用AI助手</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            描述您的任务需求，AI将为您规划合理的专注时间。您还可以询问任何问题，获取AI的帮助。
          </p>

          <div class="example-prompts grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
            <div
              v-for="(prompt, i) in examplePrompts"
              :key="i"
              class="example-prompt p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
              @click="useExamplePrompt(prompt)"
            >
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ prompt }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 - 使用flex-shrink-0确保不被压缩 -->
      <div class="input-area p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
        <div class="input-container relative">
          <n-input
            v-model:value="inputText"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="描述你想要完成的任务，或者问任何问题..."
            @keydown.enter.exact.prevent="handleSend"
            :disabled="isLoading"
            class="chat-input bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:focus-within:ring-indigo-400/60"
          />

          <div class="input-actions flex justify-between items-center mt-3">
            <div class="input-tools flex items-center gap-2">
              <n-tooltip trigger="hover" placement="top">
                <template #trigger>
                  <n-button circle size="small" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 hover:-translate-y-1" @click="clearInput">
                    <n-icon><Close /></n-icon>
                  </n-button>
                </template>
                <span>清空输入</span>
              </n-tooltip>
            </div>

            <div class="action-buttons flex space-x-3">
              <n-button
                tertiary
                size="small"
                @click="$emit('clear-history')"
                :disabled="isLoading || chatHistory.length === 0"
                class="text-gray-600 dark:text-gray-300 transition-all duration-300 hover:-translate-y-1"
              >
                <template #icon>
                  <n-icon><Delete /></n-icon>
                </template>
                清空对话
              </n-button>
              <n-button
                type="primary"
                :disabled="!inputText.trim() || isLoading"
                @click="handleSend"
                :loading="isLoading"
                class="bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-lg dark:shadow-indigo-500/30"
              >
                <template #icon>
                  <n-icon><Send /></n-icon>
                </template>
                发送
              </n-button>
            </div>
          </div>
        </div>

        <div class="input-hint mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
          <n-icon size="14" class="mr-1"><InformationFilled /></n-icon>
          <span>提示: 输入你的问题或任务描述，按Enter发送。</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import { Delete, Send, InformationFilled, Bot, Close, Settings } from '@vicons/carbon';
import { Key } from '@vicons/ionicons5';
import { ChatMessage, TaskPlan } from '../services/AIAssistantService';
import MessageBubble from './chat/MessageBubble.vue';
import TaskPreview from './chat/TaskPreview.vue';
import { useMessage, NSpin } from 'naive-ui';
import { useSettingsStore } from '../stores';
import { useRouter } from 'vue-router';
import AIAssistantService from '../services/AIAssistantService';
import { PropType } from 'vue';

const props = defineProps({
  chatHistory: {
    type: Array as PropType<ChatMessage[]>,
    default: () => [],
    required: false
  },
  isLoading: {
    type: Boolean,
    default: false,
    required: false
  },
  chatMode: {
    type: String,
    default: 'task',
    required: false
  }
});

const emit = defineEmits<{
  (e: 'send-message', message: string): void;
  (e: 'apply-plan', taskPlan: TaskPlan[]): void;
  (e: 'clear-history'): void;
  (e: 'regenerate', messageIndex: number): void;
  (e: 'feedback', messageIndex: number, type: string, value: boolean): void;
}>();

const message = useMessage();
const router = useRouter();
const settingsStore = useSettingsStore();
const inputText = ref('');
const chatHistoryRef = ref<HTMLElement | null>(null);

// 检查是否有API密钥
const hasApiKey = computed(() => {
  return !!settingsStore.aiSettings.apiKey;
});

// 发送消息
const handleSend = () => {
  if (inputText.value.trim() && !props.isLoading) {
    emit('send-message', inputText.value);
    inputText.value = '';
  }
};

// 监听聊天历史变化，自动滚动到底部
watch(() => props.chatHistory, async (newValue) => {
  // 防御性检查，避免undefined引用错误
  if (!newValue) {
    console.warn('AIChat监测到chatHistory为undefined');
    return;
  }

  console.log('AIChat监测到聊天历史变化', {
    length: newValue?.length || 0,
    messages: newValue?.slice(-2).map(m => ({
      role: m?.role,
      content: m?.content?.substring(0, 30) + '...',
      hasTaskData: !!m?.taskData?.length,
      timestamp: new Date(m?.timestamp).toLocaleTimeString()
    })) || []
  });

  await nextTick();
  scrollToBottom();
}, { deep: true });

// 监听加载状态变化，也滚动到底部
watch(() => props.isLoading, async (newValue) => {
  if (newValue) {
    await nextTick();
    scrollToBottom();
  }
});

// 滚动到底部
const scrollToBottom = () => {
  const messageContainer = chatHistoryRef.value;
  if (messageContainer) {
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }
};

// 清空输入框
const clearInput = () => {
  inputText.value = '';
  // 清空后聚焦
  nextTick(() => {
    const chatInput = document.querySelector('.chat-input textarea');
    if (chatInput) {
      (chatInput as HTMLTextAreaElement).focus();
    }
  });
};

// 处理消息反馈
const handleFeedback = (messageIndex: number, event: { type: 'like' | 'dislike'; value: boolean }) => {
  const { type, value } = event;
  emit('feedback', messageIndex, type, value);

  // 可以在这里实现反馈提示
  if (value) {
    message.success(`已${type === 'like' ? '点赞' : '反馈'}`);
  }
};

// 重新生成回复
const regenerateResponse = (messageIndex: number) => {
  emit('regenerate', messageIndex);
};

// 添加调试函数，检查聊天历史数据
const validateChatHistory = () => {
  if (!props.chatHistory) {
    console.error('AIChat组件：chatHistory为空或未定义');
    return false;
  }

  if (!Array.isArray(props.chatHistory)) {
    console.error('AIChat组件：chatHistory不是数组', typeof props.chatHistory);
    return false;
  }

  if (props.chatHistory.length === 0) {
    console.warn('AIChat组件：chatHistory数组为空');
    return true;
  }

  const sample = props.chatHistory[props.chatHistory.length - 1];
  console.log('AIChat组件：最新消息样例', {
    role: sample?.role,
    content: sample?.content?.substring(0, 50),
    timestamp: sample?.timestamp ? new Date(sample.timestamp).toLocaleTimeString() : '无'
  });
  return true;
};

// 在组件挂载后验证数据
onMounted(() => {
  console.log('AIChat组件已挂载', {
    chatHistoryLength: props.chatHistory?.length || 0,
    isLoading: props.isLoading,
    chatMode: props.chatMode,
    API密钥: hasApiKey.value ? '已设置' : '未设置'
  });

  validateChatHistory();

  // 如果API密钥未设置，显示提示
  if (!hasApiKey.value) {
    message.info('需要设置DeepSeek API密钥才能使用AI助手功能');
  }

  // 为空时自动聚焦输入框
  const chatInput = document.querySelector('.chat-input textarea');
  if (chatInput) {
    (chatInput as HTMLTextAreaElement).focus();
  }

  // 初始滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
});

// 示例提示列表
const examplePrompts = [
  "我需要复习3小时英语，写2小时论文，如何安排时间？",
  "帮我制定一个一天的学习计划，包括Java编程和算法设计",
  "我想在一周内完成一个小型前端项目，如何规划时间？",
  "如何使用番茄工作法提高工作效率？"
];

// 使用示例提示
const useExamplePrompt = (prompt: string) => {
  inputText.value = prompt;
  // 自动滚动到输入框
  nextTick(() => {
    const chatInput = document.querySelector('.chat-input textarea');
    if (chatInput) {
      (chatInput as HTMLTextAreaElement).focus();
    }
  });
};

// 前往设置页面
const goToSettings = () => {
  router.push('/settings');
};
</script>

<style scoped>
.ai-chat-container {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 120px); /* 固定最大高度，减去标题栏和其他元素高度 */
}

.message-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  max-height: calc(100% - 120px); /* 确保消息列表有固定的高度，减去输入区域的高度 */
  overflow-y: auto;
}

.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 限制任务预览和消息内容的最大高度，必要时使用滚动 */
:deep(.task-preview) {
  max-height: 300px;
  overflow-y: auto;
}

:deep(.message-content) {
  max-height: 400px;
  overflow-y: auto;
}

.input-area {
  flex-shrink: 0;
  border-top: 1px solid rgba(156, 163, 175, 0.2);
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

.thinking-container {
  animation: thinkingPulse 2s infinite;
}

.thinking-dots .dot {
  font-size: 22px;
  font-weight: bold;
  line-height: 1;
  display: inline-block;
}

.example-prompt {
  transition: all 0.3s ease;
}

.example-prompt:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
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

@keyframes thinkingPulse {
  0% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.7;
  }
}

.debug-info {
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.debug-info:hover {
  opacity: 1;
}

:deep(.n-button) {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
