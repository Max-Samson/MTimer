<script setup lang="ts">
import { NCard, NForm, NFormItem, NInput, NButton, NSpace, useMessage, NText, NSpin, NDivider, NAlert, NIcon, NTabs, NTabPane, NCollapse, NCollapseItem, NTag } from 'naive-ui'
import { useSettingsStore } from '../stores'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AIAssistantService from '../services/AIAssistantService'
import { Key, Cloud, CheckmarkCircle, CloseCircle, SettingsOutline, ColorPaletteOutline, NotificationsOutline } from '@vicons/ionicons5'

// 使用Pinia store
const settingsStore = useSettingsStore()
const message = useMessage()

// 使用storeToRefs保持响应性
const { aiSettings } = storeToRefs(settingsStore)

// 当前活动标签页
const activeTab = ref('ai')

// 表单状态
const apiKeyFormState = ref({
  isTestingKey: false,
  testSuccess: false,
  testError: ''
})

// 从aiSettings中获取API密钥，保持响应性
const apiKey = computed({
  get: () => aiSettings.value.apiKey,
  set: (value) => {
    settingsStore.updateAISettings({
      apiKey: value,
      model: 'deepseek' // 始终使用deepseek模型
    })
    // 重置测试状态
    apiKeyFormState.value.testSuccess = false
    apiKeyFormState.value.testError = ''
  }
})

// 保存设置
const saveSettings = () => {
  // 如果API密钥为空，提示用户
  if (!apiKey.value) {
    message.warning('API密钥不能为空');
    return;
  }

  // 使用store提供的方法保存设置
  settingsStore.updateAISettings({
    model: 'deepseek', // 始终使用deepseek模型
    apiKey: apiKey.value
  })

  // 同时更新AIAssistantService中的apiKey
  AIAssistantService.setApiKey(apiKey.value)

  // 确保数据已保存到localStorage
  localStorage.setItem('aiSettings', JSON.stringify({
    model: 'deepseek',
    apiKey: apiKey.value,
    enabled: true
  }));

  message.success('设置已保存')
  console.log('API密钥已保存:', apiKey.value.slice(0, 5) + '******');
}

// 测试API密钥
const testApiKey = async () => {
  if (!apiKey.value) {
    message.error('请先输入API密钥')
    return
  }

  // 先清除先前的测试状态
  apiKeyFormState.value.testSuccess = false
  apiKeyFormState.value.testError = ''
  apiKeyFormState.value.isTestingKey = true

  try {
    console.log('开始测试API密钥:', apiKey.value.substring(0, 5) + '...');

    // 保存API密钥到多个位置
    // 1. 设置到AIAssistantService
    AIAssistantService.setApiKey(apiKey.value)

    // 2. 保存到settingsStore
    settingsStore.updateAISettings({
      model: 'deepseek',
      apiKey: apiKey.value,
      enabled: true
    })

    // 3. 直接保存到localStorage (确保冗余保存)
    localStorage.setItem('aiSettings', JSON.stringify({
      model: 'deepseek',
      apiKey: apiKey.value,
      enabled: true
    }));

    console.log('API密钥已保存，正在测试连接...');

    // 发送一个简单的测试消息
    await AIAssistantService.sendMessage('这是一条测试消息，请简短回复。')

    // 如果没有报错，测试成功
    apiKeyFormState.value.testSuccess = true
    message.success('API密钥测试成功！连接正常')
    console.log('API密钥测试成功!');

    // 测试成功后立即保存设置
    saveSettings();
  } catch (error) {
    console.error('API密钥测试失败:', error)
    apiKeyFormState.value.testError = error instanceof Error ? error.message : '未知错误'
    message.error('API密钥测试失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    apiKeyFormState.value.isTestingKey = false
  }
}

// 有API密钥且测试成功
const isAPIKeyValid = computed(() => {
  return !!apiKey.value && apiKeyFormState.value.testSuccess
})
</script>

<template>
  <div class="settings-view">
    <n-card title="设置" class="settings-card" size="large">
      <!-- 设置分类标签页 -->
      <n-tabs v-model:value="activeTab" type="line" animated class="settings-tabs">
        <n-tab-pane name="ai" tab="AI助手">
          <template #tab>
            <div class="tab-item">
              <n-icon><Cloud /></n-icon>
              <span>AI助手</span>
            </div>
          </template>

          <!-- AI助手设置内容 -->
          <div class="settings-content">
            <div class="ai-settings-header flex items-center gap-3 mb-6">
              <div class="ai-settings-icon p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                <n-icon size="24" class="text-indigo-500 dark:text-indigo-400">
                  <Cloud />
                </n-icon>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-indigo-700 dark:text-indigo-400 m-0">AI助手设置</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 m-0">配置AI助手功能所需的API密钥</p>
              </div>
            </div>

            <n-divider />

            <!-- DeepSeek API密钥设置部分 - 简化结构，不使用折叠面板 -->
            <div class="api-key-section mb-6">
              <div class="section-header flex items-center gap-2 mb-4">
                <n-icon size="18" class="text-indigo-500">
                  <Key />
                </n-icon>
                <span class="text-base font-medium">DeepSeek API密钥配置</span>
                <n-tag v-if="isAPIKeyValid" type="success" size="small" class="ml-2">已连接</n-tag>
              </div>

              <div class="p-2">
                <div class="api-key-container">
                  <div class="api-guide mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div class="flex items-start gap-3">
                      <n-icon size="20" class="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0">
                        <Key />
                      </n-icon>
                      <div>
                        <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          DeepSeek AI是一个强大的大语言模型，可以帮助您规划任务和时间安排。请按照以下步骤获取API密钥：
                        </p>
                        <ol class="text-sm text-gray-600 dark:text-gray-400 pl-5 space-y-2 list-decimal">
                          <li>访问 <a href="https://platform.deepseek.com" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline">DeepSeek平台</a> 并创建账号</li>
                          <li>登录后前往API设置页面</li>
                          <li>创建新的API密钥并复制</li>
                          <li>粘贴到下方输入框中</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div class="api-key-form-container">
                    <n-alert v-if="isAPIKeyValid" type="success" class="mb-4">
                      <template #icon>
                        <n-icon><CheckmarkCircle /></n-icon>
                      </template>
                      <div class="text-sm">
                        <div class="font-medium">API密钥有效</div>
                        <div class="text-gray-600 dark:text-gray-400">AI助手功能已准备就绪，您可以开始使用了！</div>
                      </div>
                    </n-alert>

                    <div class="api-key-input-group relative mb-4">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        API密钥
                      </label>
                      <n-input
                        v-model:value="apiKey"
                        type="password"
                        show-password-on="click"
                        placeholder="请输入DeepSeek API密钥"
                        :disabled="apiKeyFormState.isTestingKey"
                        class="api-key-input transition-all duration-300 focus-within:shadow-md"
                      />
                    </div>

                    <div class="api-key-actions flex items-center gap-3">
                      <n-button
                        type="primary"
                        ghost
                        @click="testApiKey"
                        :loading="apiKeyFormState.isTestingKey"
                        :disabled="!apiKey"
                        class="transition-all duration-300 hover:-translate-y-0.5"
                        size="medium"
                      >
                        <template #icon>
                          <n-icon>
                            <n-spin v-if="apiKeyFormState.isTestingKey" />
                            <Key v-else />
                          </n-icon>
                        </template>
                        测试连接
                      </n-button>

                      <n-button
                        type="primary"
                        @click="saveSettings"
                        :disabled="!apiKey"
                        class="transition-all duration-300 hover:-translate-y-0.5"
                        size="medium"
                      >
                        <template #icon>
                          <n-icon><CheckmarkCircle /></n-icon>
                        </template>
                        保存设置
                      </n-button>
                    </div>

                    <div v-if="apiKeyFormState.testSuccess" class="key-test-result success mt-4 animate-fadeIn">
                      <div class="flex items-center gap-2">
                        <n-icon size="20" class="text-green-600 dark:text-green-500">
                          <CheckmarkCircle />
                        </n-icon>
                        <p class="font-medium">API密钥验证成功！您现在可以使用AI助手功能了。</p>
                      </div>
                    </div>

                    <div v-if="apiKeyFormState.testError" class="key-test-result error mt-4 animate-fadeIn">
                      <div class="flex items-center gap-2">
                        <n-icon size="20" class="text-red-600 dark:text-red-500">
                          <CloseCircle />
                        </n-icon>
                        <div>
                          <p class="font-medium">API密钥验证失败</p>
                          <p class="text-sm">{{ apiKeyFormState.testError }}</p>
                          <p class="text-sm mt-1">请检查您的API密钥是否正确，或尝试重新生成一个新的密钥。</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 模型设置 - 简化结构，不使用折叠面板 -->
                <div class="model-settings-section">
                  <div class="section-header flex items-center gap-2 mb-4">
                    <n-icon size="18" class="text-indigo-500">
                      <SettingsOutline />
                    </n-icon>
                    <span class="text-base font-medium">AI模型设置</span>
                  </div>

                  <div class="p-2">
                    <div class="mb-3 text-sm text-gray-600 dark:text-gray-400">
                      目前AI助手功能使用DeepSeek大语言模型。未来将支持更多模型选择。
                    </div>

                    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <div class="flex items-center">
                        <div class="text-sm font-medium text-gray-700 dark:text-gray-300">当前使用模型</div>
                        <n-tag class="ml-auto" type="info" size="small">DeepSeek</n-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <n-tab-pane name="appearance" tab="外观">
          <template #tab>
            <div class="tab-item">
              <n-icon><ColorPaletteOutline /></n-icon>
              <span>外观</span>
            </div>
          </template>
          <div class="settings-content p-4 text-center text-gray-500">
            <p>主题和外观设置功能即将推出</p>
          </div>
        </n-tab-pane>

        <n-tab-pane name="notifications" tab="通知">
          <template #tab>
            <div class="tab-item">
              <n-icon><NotificationsOutline /></n-icon>
              <span>通知</span>
            </div>
          </template>
          <div class="settings-content p-4 text-center text-gray-500">
            <p>通知设置功能即将推出</p>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<style scoped>
/* 抽屉样式强制覆盖 - 直接针对naive-ui组件 */
:deep(.n-drawer--right-placement) {
  max-width: 100vw !important;
  width: 100vw !important;
}

:deep(.n-drawer-content) {
  width: 100% !important;
  max-width: 100% !important;
}

:deep(.n-drawer[role="dialog"]) {
  width: 100% !important;
}

:deep(.n-drawer--right-placement[role="dialog"]),
:deep(.n-drawer--right-placement[role="dialog"] .n-drawer-content-wrapper),
:deep(.n-drawer--right-placement[role="dialog"] .n-drawer-content) {
  width: 100% !important;
  max-width: 100% !important;
}

/* 基本容器样式 */
.settings-view {
  padding: 0;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 20px);
  display: flex;
  flex-direction: column;
  background-color: rgba(255, 255, 255, 0.5);
  transition: background-color var(--transition-time) ease;
}

:root[data-theme="dark"] .settings-view {
  background-color: rgba(18, 24, 36, 0.7);
  backdrop-filter: blur(10px);
}

.settings-card {
  margin: 0;
  width: 100%;
  flex: 1;
  box-shadow: none;
  border-radius: 0;
  transition: all var(--transition-time) ease;
}

:root[data-theme="dark"] .settings-card {
  background-color: rgba(30, 38, 52, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* 内容区域样式 */
.settings-content {
  padding: 24px;
  width: 100%;
}

/* API密钥设置区域横向布局 */
.api-key-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

@media (min-width: 768px) {
  .api-key-container {
    flex-direction: row;
    align-items: flex-start;
  }

  .api-guide {
    flex: 0 0 45%;
    margin-bottom: 0;
  }

  .api-key-form-container {
    flex: 1;
    margin-left: 20px;
  }
}

/* 标签页导航样式 */
.settings-tabs :deep(.n-tabs-nav) {
  padding: 0 20px;
  background-color: #fff;
  border-bottom: 1px solid #eaeaea;
}

.settings-tabs :deep(.n-tabs-tab) {
  padding: 16px 24px;
  font-size: 15px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 章节样式 */
.section-header {
  padding: 12px 0;
  border-bottom: 1px solid #eaeaea;
  margin-bottom: 20px;
}

.api-key-section, .model-settings-section {
  background-color: #fff;
  border-radius: 8px;
  transition: all 0.3s ease;
  margin-bottom: 24px;
  width: 100%;
}

.api-key-input-group {
  width: 100%;
  margin-bottom: 20px;
}

.api-key-input :deep(.n-input) {
  border-radius: 8px;
  font-size: 14px;
  width: 100%;
}

.api-key-input :deep(.n-input-wrapper) {
  padding: 10px 16px;
}

.api-key-actions {
  display: flex;
  gap: 16px;
  margin-top: 20px;
}

.api-key-actions :deep(.n-button) {
  padding: 0 24px;
  height: 40px;
}

.key-test-result {
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 20px;
  width: 100%;
}

.key-test-result.success {
  background-color: rgba(0, 128, 0, 0.1);
  color: #006400;
}

.key-test-result.error {
  background-color: rgba(255, 0, 0, 0.1);
  color: #b30000;
}

/* API指南样式优化 */
.api-guide {
  padding: 20px;
  margin-bottom: 24px;
  width: 100%;
}

.api-guide ol {
  margin-top: 16px;
}

.api-guide li {
  margin-bottom: 12px;
}

.api-guide a {
  font-weight: 500;
}

/* 动画 */
.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 适配抽屉样式 */
:deep(.n-drawer-mask) {
  background-color: rgba(0, 0, 0, 0.4);
}

:deep(.n-drawer-header) {
  padding: 20px 24px;
  border-bottom: 1px solid #eaeaea;
}

:deep(.n-drawer-header__title) {
  font-size: 20px;
  font-weight: 600;
}

:deep(.n-drawer-body) {
  padding: 0;
}

:deep(.n-drawer-body-content-wrapper) {
  padding: 0;
}

/* 针对抽屉中的内容特殊处理 */
:deep(.n-drawer) .ai-settings-header {
  padding: 20px 24px 0;
}

:deep(.n-divider) {
  margin: 20px 0;
}

/* 模型设置区域优化 */
.model-settings-section {
  margin-top: 30px;
}

/* 处理在暗色模式下的颜色 */
:deep(.dark) .api-key-section,
:deep(.dark) .model-settings-section {
  background-color: #1f1f1f;
}

:deep(.dark) .section-header {
  border-color: #333;
}

:deep(.dark) .settings-tabs :deep(.n-tabs-nav) {
  background-color: #1f1f1f;
  border-color: #333;
}

:deep(.dark) .n-drawer-header {
  border-color: #333;
}

/* 移动设备适配 */
@media (max-width: 768px) {
  .settings-tabs :deep(.n-tabs-tab) {
    padding: 12px 16px;
    font-size: 14px;
  }

  .settings-content {
    padding: 16px;
  }

  .api-key-actions {
    flex-direction: column;
    width: 100%;
  }

  .api-key-actions :deep(.n-button) {
    width: 100%;
  }
}

/* AI助手设置区域样式 */
.ai-settings-header {
  transition: all var(--transition-time) ease;
}

:root[data-theme="dark"] .ai-settings-header {
  background-color: rgba(35, 42, 55, 0.7);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

:root[data-theme="dark"] .ai-settings-icon {
  background-color: rgba(79, 70, 229, 0.2);
  box-shadow: 0 0 15px rgba(79, 70, 229, 0.3);
}

:root[data-theme="dark"] .section-header {
  border-color: rgba(255, 255, 255, 0.1);
}

/* API密钥设置区域样式 */
.api-key-section, .model-settings-section {
  transition: all var(--transition-time) ease;
  border-radius: 12px;
  padding: 20px;
}

:root[data-theme="dark"] .api-key-section,
:root[data-theme="dark"] .model-settings-section {
  background-color: rgba(35, 42, 55, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 输入框样式优化 */
:root[data-theme="dark"] .api-key-input :deep(.n-input) {
  background-color: rgba(45, 55, 72, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
}

:root[data-theme="dark"] .api-key-input :deep(.n-input:hover),
:root[data-theme="dark"] .api-key-input :deep(.n-input:focus) {
  border-color: rgba(79, 70, 229, 0.5);
  box-shadow: 0 0 10px rgba(79, 70, 229, 0.2);
}

/* 按钮样式优化 */
:root[data-theme="dark"] .api-key-actions :deep(.n-button) {
  background-color: rgba(79, 70, 229, 0.2);
  border-color: rgba(79, 70, 229, 0.3);
  color: #fff;
}

:root[data-theme="dark"] .api-key-actions :deep(.n-button:hover) {
  background-color: rgba(79, 70, 229, 0.3);
  border-color: rgba(79, 70, 229, 0.4);
  box-shadow: 0 0 15px rgba(79, 70, 229, 0.3);
  transform: translateY(-1px);
}

/* 测试结果样式优化 */
:root[data-theme="dark"] .key-test-result {
  background-color: rgba(35, 42, 55, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

:root[data-theme="dark"] .key-test-result.success {
  background-color: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

:root[data-theme="dark"] .key-test-result.error {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

/* 标签页样式优化 */
:root[data-theme="dark"] .settings-tabs :deep(.n-tabs-nav) {
  background-color: rgba(30, 38, 52, 0.8);
  border-color: rgba(255, 255, 255, 0.05);
}

:root[data-theme="dark"] .settings-tabs :deep(.n-tabs-tab) {
  color: rgba(255, 255, 255, 0.7);
}

:root[data-theme="dark"] .settings-tabs :deep(.n-tabs-tab:hover) {
  color: rgba(255, 255, 255, 0.9);
}

:root[data-theme="dark"] .settings-tabs :deep(.n-tabs-tab--active) {
  color: #fff;
}

:root[data-theme="dark"] .settings-tabs :deep(.n-tabs-nav__bar) {
  background-color: rgb(var(--color-primary));
  box-shadow: 0 0 10px rgba(var(--color-primary), 0.3);
}

/* 动画效果 */
@keyframes glow {
  0% {
    box-shadow: 0 0 5px rgba(79, 70, 229, 0.2);
  }
  50% {
    box-shadow: 0 0 15px rgba(79, 70, 229, 0.4);
  }
  100% {
    box-shadow: 0 0 5px rgba(79, 70, 229, 0.2);
  }
}

:root[data-theme="dark"] .ai-settings-icon {
  animation: glow 3s infinite;
}

/* 响应式布局优化 */
@media (max-width: 768px) {
  .settings-content {
    padding: 16px;
  }

  .api-key-section,
  .model-settings-section {
    padding: 15px;
  }

  :root[data-theme="dark"] .ai-settings-header {
    padding: 15px;
  }
}
</style>
