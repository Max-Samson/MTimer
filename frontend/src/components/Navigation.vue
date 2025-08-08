<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NSpace, NButton, NIcon, NTooltip, NBadge } from 'naive-ui'
import {
    Time,
    ChartColumn,
    List,
    ArrowLeft,
    ArrowRight,
    User
} from '@vicons/carbon'

const router = useRouter()
const route = useRoute()
const history = ref<string[]>([])
const currentIndex = ref(-1)

// 导航到指定路由
const navigateTo = (path: string) => {
    // 如果不是通过前进后退按钮导航，则添加到历史记录
    if (route.path !== path) {
        // 清除当前位置之后的历史记录
        if (currentIndex.value < history.value.length - 1) {
            history.value = history.value.slice(0, currentIndex.value + 1)
        }

        // 导航到新路径
        router.push(path)

        // 导航后记录新路径到历史记录中
        history.value.push(path)
        currentIndex.value = history.value.length - 1
    }
}

// 后退
const goBack = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--
        router.push(history.value[currentIndex.value])
    }
}

// 前进
const goForward = () => {
    if (currentIndex.value < history.value.length - 1) {
        currentIndex.value++
        router.push(history.value[currentIndex.value])
    }
}

// 初始化历史记录
if (history.value.length === 0 && route.path) {
    history.value.push(route.path)
    currentIndex.value = 0
}
</script>

<template>
    <div class="navigation">
        <n-space justify="center" align="center" class="nav-container">
            <!-- 后退按钮 -->
            <n-tooltip trigger="hover" placement="bottom">
                <template #trigger>
                    <n-button circle secondary :disabled="currentIndex <= 0" @click="goBack" class="nav-btn">
                        <template #icon>
                            <n-icon>
                                <ArrowLeft />
                            </n-icon>
                        </template>
                    </n-button>
                </template>
                返回
            </n-tooltip>

            <!-- 计时器按钮 -->
            <n-tooltip trigger="hover" placement="bottom">
                <template #trigger>
                    <n-button circle secondary :type="route.path === '/' ? 'primary' : 'default'"
                        @click="navigateTo('/')" class="nav-btn">
                        <template #icon>
                            <n-icon>
                                <Time />
                            </n-icon>
                        </template>
                    </n-button>
                </template>
                专注计时器
            </n-tooltip>

            <!-- 待办事项按钮 -->
            <n-tooltip trigger="hover" placement="bottom">
                <template #trigger>
                    <n-badge :value="0" :show="false" processing>
                        <n-button circle secondary :type="route.path === '/todo' ? 'primary' : 'default'"
                            @click="navigateTo('/todo')" class="nav-btn">
                            <template #icon>
                                <n-icon>
                                    <List />
                                </n-icon>
                            </template>
                        </n-button>
                    </n-badge>
                </template>
                待办事项
            </n-tooltip>

            <!-- 统计按钮 -->
            <n-tooltip trigger="hover" placement="bottom">
                <template #trigger>
                    <n-button circle secondary :type="route.path === '/statistics' ? 'primary' : 'default'"
                        @click="navigateTo('/statistics')" class="nav-btn">
                        <template #icon>
                            <n-icon>
                                <ChartColumn />
                            </n-icon>
                        </template>
                    </n-button>
                </template>
                统计
            </n-tooltip>

            <!-- AI助手按钮 -->
            <n-tooltip trigger="hover" placement="bottom">
                <template #trigger>
                    <n-button circle secondary :type="route.path === '/ai-assistant' ? 'primary' : 'default'"
                        @click="navigateTo('/ai-assistant')" class="nav-btn">
                        <template #icon>
                            <n-icon>
                                <User />
                            </n-icon>
                        </template>
                    </n-button>
                </template>
                AI专注助手
            </n-tooltip>

            <!-- 前进按钮 -->
            <n-tooltip trigger="hover" placement="bottom">
                <template #trigger>
                    <n-button circle secondary :disabled="currentIndex >= history.value.length - 1" @click="goForward"
                        class="nav-btn">
                        <template #icon>
                            <n-icon>
                                <ArrowRight />
                            </n-icon>
                        </template>
                    </n-button>
                </template>
                前进
            </n-tooltip>
        </n-space>
    </div>
</template>

<style scoped>
.navigation {
    width: 100%;
    max-width: 500px;
    padding: 5px 0;
    margin: 0 auto;
}

.nav-container {
    padding: 8px;
    border-radius: 12px;
    background-color: transparent;
    /* 移除背景色，让MainLayout控制背景 */
    display: flex;
    justify-content: space-around;
    width: 100%;
}

.nav-btn {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    background-color: transparent;
    border: none;
    /* 移除边框 */
}

.nav-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    /* 增强阴影效果 */
}

.nav-btn:active {
    transform: translateY(0);
}

.nav-btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.5);
    opacity: 0;
    border-radius: 100%;
    transform: scale(1, 1) translate(-50%);
    transform-origin: 50% 50%;
}

.nav-btn:hover::after {
    animation: ripple 1s ease-out;
}

@keyframes ripple {
    0% {
        transform: scale(0, 0);
        opacity: 0.5;
    }

    100% {
        transform: scale(20, 20);
        opacity: 0;
    }
}
</style>
