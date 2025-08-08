<script setup lang="ts">
import { ref, provide, onMounted, watch } from 'vue'
import { NConfigProvider, darkTheme, useOsTheme, NMessageProvider } from 'naive-ui'
import { RouterView } from 'vue-router'
import AudioInitializer from './components/AudioInitializer.vue'

// 主题设置
const theme = ref<typeof darkTheme | null>(null)
const osThemeRef = useOsTheme()

// 全局数据状态
const globalDataState = ref({
  isLoading: false,
  lastRefreshTime: 0,
  hasError: false,
  errorMessage: ''
})

// 提供全局数据状态管理方法
provide('setGlobalLoading', (loading: boolean) => {
  globalDataState.value.isLoading = loading
})

provide('setGlobalError', (message: string) => {
  globalDataState.value.hasError = !!message
  globalDataState.value.errorMessage = message
})

provide('updateLastRefreshTime', () => {
  globalDataState.value.lastRefreshTime = Date.now()
})

provide('getDataState', () => globalDataState.value)

// 提供主题状态给子组件
provide('theme', theme)

// 切换主题的方法
const toggleTheme = () => {
  theme.value = theme.value ? null : darkTheme
  // 保存主题设置到localStorage
  localStorage.setItem('themeMode', theme.value ? 'dark' : 'light')

  // 设置data-theme属性以应用CSS变量
  if (theme.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
    // 使用Wails运行时API设置窗口为暗色主题（仅Windows平台）
    try {
      window.runtime?.WindowSetDarkTheme?.()
    } catch (e) {
      console.error('设置系统暗色主题失败', e)
    }
  } else {
    document.documentElement.setAttribute('data-theme', 'light')
    // 恢复为系统默认主题
    try {
      window.runtime?.WindowSetSystemDefaultTheme?.()
    } catch (e) {
      console.error('恢复系统默认主题失败', e)
    }
  }
}

// 提供切换主题的方法给子组件
provide('toggleTheme', toggleTheme)

// 在组件挂载时从localStorage加载主题设置
onMounted(() => {
  const savedTheme = localStorage.getItem('themeMode')
  if (savedTheme === 'dark') {
    theme.value = darkTheme
    document.documentElement.setAttribute('data-theme', 'dark')
    // 使用Wails运行时API设置窗口为暗色主题（仅Windows平台）
    try {
      window.runtime?.WindowSetDarkTheme?.()
    } catch (e) {
      console.error('设置系统暗色主题失败', e)
    }
  } else if (savedTheme === 'light') {
    theme.value = null
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    // 如果没有保存的主题设置，则使用系统主题
    const isDark = osThemeRef.value === 'dark'
    theme.value = isDark ? darkTheme : null
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')

    // 如果是暗色主题，使用Wails运行时API设置窗口（仅Windows平台）
    if (isDark) {
      try {
        window.runtime?.WindowSetDarkTheme?.()
      } catch (e) {
        console.error('设置系统暗色主题失败', e)
      }
    }
  }
})

// 监听系统主题变化，仅在用户未手动设置主题时应用
watch(osThemeRef, (newValue) => {
  // 只有当用户未手动设置主题时，才跟随系统主题
  if (!localStorage.getItem('themeMode')) {
    const isDark = newValue === 'dark'
    theme.value = isDark ? darkTheme : null
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')

    // 如果是暗色主题，使用Wails运行时API设置窗口（仅Windows平台）
    if (isDark) {
      try {
        window.runtime?.WindowSetDarkTheme?.()
      } catch (e) {
        console.error('设置系统暗色主题失败', e)
      }
    } else {
      try {
        window.runtime?.WindowSetSystemDefaultTheme?.()
      } catch (e) {
        console.error('恢复系统默认主题失败', e)
      }
    }
  }
})
</script>

<template>
  <n-config-provider :theme="theme">
    <n-message-provider>
      <!-- 路由视图 - 所有页面内容将通过路由系统渲染 -->
      <router-view></router-view>

      <!-- 音频服务初始化组件 - 不渲染任何内容，只负责初始化音频服务 -->
      <audio-initializer />
    </n-message-provider>
  </n-config-provider>
</template>
