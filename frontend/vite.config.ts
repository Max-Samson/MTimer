import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  define: {
    // 解决Vue特性标志警告
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
  },
  // @ts-expect-error Vitest配置
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    deps: {
      inline: ['vue']
    },
    transformMode: {
      web: [/\.[jt]sx?$/]
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    }
  }
})
