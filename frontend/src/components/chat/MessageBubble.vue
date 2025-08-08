<template>
  <div
    :class="[
      'flex w-full px-4 py-3 items-start gap-4 border-b transition-all duration-300',
      isUser
        ? 'flex-row-reverse bg-indigo-50/70 dark:bg-indigo-900/40 border-gray-100 dark:border-gray-700/40 message-enter-right'
        : 'border-gray-100 dark:border-gray-700/40 message-enter-left'
    ]"
  >
    <!-- 角色标识和头像 -->
    <div class="flex flex-col items-center w-12">
      <div class="avatar transform transition-all duration-300 hover:scale-110">
        <n-avatar
          v-if="!isUser"
          round
          :size="36"
          :style="{ backgroundColor: '#6366f1' }"
          class="shadow-md dark:shadow-indigo-500/20"
        >
          <template #icon>
            <n-icon><Bot /></n-icon>
          </template>
        </n-avatar>
        <n-avatar
          v-else
          round
          :size="36"
          :style="{ backgroundColor: '#10b981' }"
          class="shadow-md dark:shadow-green-500/20"
        >
          <template #icon>
            <n-icon><UserAvatar /></n-icon>
          </template>
        </n-avatar>
      </div>
      <div class="text-xs mt-1 text-gray-500 dark:text-gray-400">{{ isUser ? '用户' : 'AI助手' }}</div>
    </div>

    <!-- 消息内容 -->
    <div class="flex-1 max-w-[calc(100%-70px)]">
      <!-- 消息主体 -->
      <div
        :class="[
          'rounded-lg p-4 shadow-sm transition-all duration-300 hover:shadow-md',
          isUser
            ? 'bg-green-100 dark:bg-green-900/50 text-gray-800 dark:text-gray-100 rounded-tr-none dark:shadow-green-900/20'
            : 'bg-gray-100 dark:bg-gray-800/90 text-gray-800 dark:text-gray-100 rounded-tl-none dark:shadow-indigo-900/10'
        ]"
      >
        <!-- 如果有图片，显示图片 -->
        <div v-if="image" class="mb-3 rounded-lg overflow-hidden shadow transition-all duration-300 hover:shadow-md dark:shadow-gray-900/30">
          <img
            :src="image"
            :alt="`${isUser ? '用户' : 'AI助手'}上传的图片`"
            class="max-w-full max-h-[300px] object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
            @click="previewImage"
          />
        </div>

        <n-scrollbar class="max-h-[300px]" trigger="hover">
          <div class="message-content">
            <div v-html="formatContentToHTML(content || '')" class="prose dark:prose-invert max-w-none prose-sm sm:prose-base"></div>
          </div>
        </n-scrollbar>
      </div>

      <!-- 消息时间和操作按钮 -->
      <div class="flex items-center justify-between mt-2 px-1 message-actions opacity-60 hover:opacity-100 transition-opacity duration-200">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatTime(timestamp) }}
        </div>

        <!-- 消息操作按钮 (仅AI消息显示) -->
        <div v-if="!isUser" class="flex gap-1 message-actions-buttons">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button circle size="tiny" class="text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transform transition-all duration-300 hover:-translate-y-0.5 dark:hover:shadow dark:hover:shadow-indigo-500/30" @click="copyMessage">
                <n-icon><Copy /></n-icon>
              </n-button>
            </template>
            <span>复制</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                circle
                size="tiny"
                :class="[
                  'transform transition-all duration-300 hover:-translate-y-0.5',
                  liked ? 'text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-900/40 dark:shadow dark:shadow-green-500/20' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 dark:hover:shadow dark:hover:shadow-indigo-500/30'
                ]"
                @click="toggleLike"
              >
                <n-icon><ThumbsUp /></n-icon>
              </n-button>
            </template>
            <span>有帮助</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button
                circle
                size="tiny"
                :class="[
                  'transform transition-all duration-300 hover:-translate-y-0.5',
                  disliked ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/40 dark:shadow dark:shadow-red-500/20' : 'text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 dark:hover:shadow dark:hover:shadow-indigo-500/30'
                ]"
                @click="toggleDislike"
              >
                <n-icon><ThumbsDown /></n-icon>
              </n-button>
            </template>
            <span>无帮助</span>
          </n-tooltip>

          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button circle size="tiny" class="text-gray-500 hover:text-indigo-500 dark:text-gray-400 dark:hover:text-indigo-400 transform transition-all duration-300 hover:-translate-y-0.5 dark:hover:shadow dark:hover:shadow-indigo-500/30" @click="regenerateResponse">
                <n-icon><Reset /></n-icon>
              </n-button>
            </template>
            <span>重新生成</span>
          </n-tooltip>
        </div>
      </div>
    </div>
  </div>

  <!-- 图片预览模态框 -->
  <n-modal
    v-model:show="showImagePreview"
    preset="card"
    style="width: auto; max-width: 90vw;"
    :title="isUser ? '用户上传的图片' : 'AI助手分享的图片'"
    :bordered="false"
    :segmented="true"
    transform-origin="center"
    class="image-preview-modal dark:bg-gray-800 dark:text-gray-100"
  >
    <template #header-extra>
      <n-button text @click="downloadImage" class="transition-transform duration-200 hover:-translate-y-0.5 dark:text-indigo-400">
        <template #icon>
          <n-icon><Download /></n-icon>
        </template>
        下载
      </n-button>
    </template>
    <div class="flex justify-center">
      <img :src="image" class="max-w-full max-h-[80vh] object-contain transition-all duration-300 hover:scale-[1.05]" />
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Bot, UserAvatar, Copy, ThumbsUp, ThumbsDown, Reset, Download } from '@vicons/carbon';
import { useMessage, NScrollbar } from 'naive-ui';

const props = defineProps<{
  content: string;
  isUser: boolean;
  timestamp: number;
  image?: string | null;
}>();

const emit = defineEmits<{
  (e: 'regenerate'): void;
  (e: 'feedback', type: 'like' | 'dislike', value: boolean): void;
}>();

const message = useMessage();
const liked = ref(false);
const disliked = ref(false);
const showImagePreview = ref(false);

// 格式化时间
function formatTime(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: zhCN
  });
}

// 复制消息内容
function copyMessage() {
  navigator.clipboard.writeText(props.content)
    .then(() => {
      message.success('已复制到剪贴板');
    })
    .catch(() => {
      message.error('复制失败，请手动复制');
    });
}

// 点赞/取消点赞
function toggleLike() {
  if (disliked.value) {
    disliked.value = false;
  }
  liked.value = !liked.value;
  emit('feedback', 'like', liked.value);
}

// 不喜欢/取消不喜欢
function toggleDislike() {
  if (liked.value) {
    liked.value = false;
  }
  disliked.value = !disliked.value;
  emit('feedback', 'dislike', disliked.value);
}

// 重新生成回复
function regenerateResponse() {
  emit('regenerate');
}

// 预览图片
function previewImage() {
  if (props.image) {
    showImagePreview.value = true;
  }
}

// 下载图片
function downloadImage() {
  if (!props.image) return;

  const link = document.createElement('a');
  link.href = props.image;
  link.download = `image_${new Date().getTime()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 格式化内容为HTML
function formatContentToHTML(content: string): string {
  if (!content) return '';

  // 移除可能包含的JSON代码块（适用于任务数据）
  content = content.replace(/```json\s*([\s\S]*?)```/g, '');

  // 处理代码块（保留非JSON的代码块）
  content = content.replace(/```([a-z]*)\s*([\s\S]*?)```/g, function(match, lang, code) {
    if (lang.toLowerCase() === 'json') {
      return ''; // 移除JSON代码块
    }
    return '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto my-2"><code class="language-' + lang + '">' + code + '</code></pre>';
  });

  // 处理标题 (h1-h3)
  content = content.replace(/^### (.*?)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
  content = content.replace(/^## (.*?)$/gm, '<h2 class="text-xl font-bold my-3">$1</h2>');
  content = content.replace(/^# (.*?)$/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>');

  // 增强数字序号显示效果（仅处理没有空格缩进的一级序号）
  content = content.replace(/^(\d+)\.\s+(.+)$/gm, function(match, num, text) {
    // 防止误处理代码示例中的数字点号
    if (match.trim().startsWith('```') || match.includes('<pre') || match.includes('<code')) {
      return match;
    }
    return `<div class="numbered-item"><span class="number-badge">${num}</span><span class="number-content">${text}</span></div>`;
  });

  // 处理嵌套的数字序号（有空格缩进的序号）
  content = content.replace(/^(\s+)(\d+)\.\s+(.+)$/gm, function(match, indent, num, text) {
    // 防止误处理代码示例中的数字点号
    if (match.trim().startsWith('```') || match.includes('<pre') || match.includes('<code')) {
      return match;
    }
    return `${indent}<div class="nested-numbered-item"><span class="nested-number-badge">${num}</span><span class="number-content">${text}</span></div>`;
  });

  // 无序列表处理
  content = content.replace(/^- (.+)$/gm, '<li class="ml-5 list-disc">$1</li>');

  // 将连续的无序列表项包装在ul标签中
  content = content.replace(/(<li class="ml-5 list-disc">.*?<\/li>)+/gs, function(match) {
    return `<ul class="list-disc pl-4 my-2">${match}</ul>`;
  });

  // 处理引用块
  content = content.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-2 text-gray-700 dark:text-gray-300 italic">$1</blockquote>');

  // 转换超链接
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">$1</a>');

  // 转换粗体
  content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 转换斜体
  content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 转换行内代码段
  content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

  // 转换双换行为段落
  content = content.split(/\n\s*\n/).map(p => {
    // 跳过已经是HTML标签的内容
    if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<ul') ||
        p.startsWith('<blockquote') || p.startsWith('<div class="numbered-item')) {
      return p;
    }
    return `<p>${p}</p>`;
  }).join('\n\n');

  // 处理段落内的单换行
  content = content.replace(/([^>])\n([^<])/g, '$1<br>$2');

  return content;
}
</script>

<style scoped>
/* 消息进入动画 */
.message-enter-left {
  animation: slideInLeft 0.3s ease-out forwards;
}

.message-enter-right {
  animation: slideInRight 0.3s ease-out forwards;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 数字编号样式 */
:deep(.numbered-item) {
  display: flex;
  align-items: flex-start;
  margin: 10px 0;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  background-color: rgba(99, 102, 241, 0.03);
}

:deep(.numbered-item:hover) {
  background-color: rgba(99, 102, 241, 0.08);
  transform: translateX(2px);
}

:deep(.number-badge) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  background-color: #6366f1;
  color: white;
  font-weight: bold;
  border-radius: 50%;
  margin-right: 12px;
  font-size: 15px;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
  flex-shrink: 0;
  transform: translateY(-1px);
}

:deep(.nested-numbered-item) {
  display: flex;
  align-items: flex-start;
  margin: 8px 0 8px 24px;
  padding: 3px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
  background-color: rgba(129, 140, 248, 0.03);
}

:deep(.nested-numbered-item:hover) {
  background-color: rgba(129, 140, 248, 0.08);
  transform: translateX(2px);
}

:deep(.nested-number-badge) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  background-color: #818cf8;
  color: white;
  font-weight: bold;
  border-radius: 50%;
  margin-right: 10px;
  font-size: 13px;
  box-shadow: 0 1px 3px rgba(129, 140, 248, 0.3);
  flex-shrink: 0;
}

:deep(.number-content) {
  flex: 1;
  padding-top: 3px;
  line-height: 1.5;
}

/* 暗黑模式适配 */
:deep(.dark .numbered-item) {
  background-color: rgba(99, 102, 241, 0.05);
}

:deep(.dark .numbered-item:hover) {
  background-color: rgba(99, 102, 241, 0.12);
}

:deep(.dark .number-badge) {
  background-color: #818cf8;
  box-shadow: 0 2px 4px rgba(129, 140, 248, 0.5);
}

:deep(.dark .nested-numbered-item) {
  background-color: rgba(129, 140, 248, 0.05);
}

:deep(.dark .nested-numbered-item:hover) {
  background-color: rgba(129, 140, 248, 0.12);
}

:deep(.dark .nested-number-badge) {
  background-color: #a5b4fc;
  box-shadow: 0 1px 3px rgba(165, 180, 252, 0.5);
}

/* 图片预览模态框动画 */
.image-preview-modal {
  animation: zoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 自定义滚动条 */
:deep(.n-scrollbar-rail) {
  width: 6px !important;
}

:deep(.n-scrollbar-rail--horizontal) {
  height: 6px !important;
}

:deep(.n-scrollbar-bar) {
  background-color: rgba(0, 0, 0, 0.1) !important;
}

:deep(.dark .n-scrollbar-bar) {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

/* 代码显示样式 */
:deep(pre) {
  position: relative;
  max-height: 300px;
  overflow: auto;
  border-radius: 6px;
}

:deep(code) {
  font-family: 'Fira Code', monospace, 'Courier New', Courier;
  font-size: 0.9em;
}

/* JSON格式优化 */
:deep(pre code.language-json) {
  color: #0e7490;
}

.message-content {
  overflow-wrap: break-word;
  word-break: break-word;
  max-height: 350px;
  overflow-y: auto;
}

/* 增强滚动条样式 */
.message-content::-webkit-scrollbar {
  width: 4px;
}

.message-content::-webkit-scrollbar-track {
  background: transparent;
}

.message-content::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
}

.message-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 消息操作按钮 */
.message-actions {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.message-actions:hover {
  opacity: 1;
}

.message-actions-buttons {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.message-item:hover .message-actions-buttons {
  opacity: 1;
}
</style>
