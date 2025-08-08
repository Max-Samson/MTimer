<script setup lang="ts">
import { computed } from 'vue'
import { useTimerStore } from '../stores'

const timerStore = useTimerStore()
const props = defineProps<{
    time: number
    isRunning: boolean
}>()

const formatTime = (seconds: number): string => {
    return timerStore.formatTime(seconds)
}
</script>

<template>
    <div class="tomato-svg-container">
        <svg viewBox="0 0 220 220" class="tomato-svg">
            <!-- 番茄茎 -->
            <path d="M110,40 C110,40 100,20 110,10 C120,20 110,40 110,40" class="stem" fill="#228B22" />

            <!-- 番茄叶子 -->
            <path d="M110,40 C110,40 80,30 70,15 C90,25 110,40 110,40" class="left-leaf" fill="#32CD32" />
            <path d="M110,40 C110,40 140,30 150,15 C130,25 110,40 110,40" class="right-leaf" fill="#32CD32" />

            <!-- 额外的小叶子装饰 -->
            <path d="M110,40 C110,40 95,25 90,10 C105,20 110,40 110,40" class="small-leaf-1" fill="#32CD32" />
            <path d="M110,40 C110,40 125,25 130,10 C115,20 110,40 110,40" class="small-leaf-2" fill="#32CD32" />

            <!-- 番茄身体 -->
            <g class="tomato-body" :class="{ 'active': isRunning }">
                <!-- 番茄纹理 -->
                <circle cx="110" cy="120" r="72" class="body-shadow" />
                <circle cx="110" cy="120" r="70" class="body" />

                <!-- 高光效果 -->
                <ellipse cx="80" cy="90" rx="20" ry="15" class="highlight" transform="rotate(-30 80 90)" />
                <ellipse cx="130" cy="100" rx="15" ry="10" class="highlight-small" transform="rotate(20 130 100)" />

                <!-- 番茄表情 -->
                <g class="face" :class="{ 'happy': isRunning }">
                    <circle cx="90" cy="110" r="5" class="eye" />
                    <circle cx="130" cy="110" r="5" class="eye" />
                    <circle cx="90" cy="110" r="2" class="eye-highlight" />
                    <circle cx="130" cy="110" r="2" class="eye-highlight" />
                    <path d="M95,130 Q110,140 125,130" class="smile" fill="none" stroke="#000" stroke-width="2" />
                </g>

                <!-- 计时器文本 -->
                <text x="110" y="120" text-anchor="middle" alignment-baseline="middle" class="time">
                    {{ formatTime(time) }}
                </text>
            </g>

            <!-- 装饰元素：小星星效果 (当番茄运行时显示) -->
            <g class="stars" v-if="isRunning">
                <circle cx="60" cy="60" r="2" class="star star-1" />
                <circle cx="160" cy="60" r="2" class="star star-2" />
                <circle cx="50" cy="160" r="2" class="star star-3" />
                <circle cx="170" cy="160" r="2" class="star star-4" />
            </g>
        </svg>
    </div>
</template>

<style scoped>
.tomato-svg-container {
    width: 220px;
    height: 220px;
    margin: 0 auto;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
}

.tomato-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 5px 15px rgba(255, 107, 107, 0.4));
}

/* 叶子动画 */
.left-leaf {
    transform-origin: 110px 40px;
    animation: swayLeft 3s ease-in-out infinite;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

.right-leaf {
    transform-origin: 110px 40px;
    animation: swayRight 3s ease-in-out infinite;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

.small-leaf-1 {
    transform-origin: 110px 40px;
    animation: swayLeft 4s ease-in-out infinite;
    animation-delay: 0.5s;
    opacity: 0.9;
}

.small-leaf-2 {
    transform-origin: 110px 40px;
    animation: swayRight 4s ease-in-out infinite;
    animation-delay: 0.5s;
    opacity: 0.9;
}

.stem {
    transform-origin: top;
    animation: stemSway 3s ease-in-out infinite;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

/* 番茄身体样式 */
.body-shadow {
    fill: rgba(0, 0, 0, 0.15);
    filter: blur(5px);
}

.body {
    fill: #ff6b6b;
    transition: all 0.3s ease;
    filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.2));
}

.highlight {
    fill: #fff;
    opacity: 0.3;
}

.highlight-small {
    fill: #fff;
    opacity: 0.2;
}

.tomato-body.active {
    animation: bounce 2s ease-in-out infinite;
}

.tomato-body.active .body {
    fill: #ff4757;
    filter: drop-shadow(0 0 10px rgba(255, 71, 87, 0.3));
}

/* 表情样式增强 */
.face {
    transition: all 0.3s ease;
}

.face.happy .smile {
    animation: smile 0.3s ease-out forwards;
    stroke-width: 2.5;
}

.face.happy .eye {
    animation: blink 2s ease-in-out infinite, eyeMove 3s ease-in-out infinite;
    transform-origin: center;
}

@keyframes eyeMove {

    0%,
    100% {
        transform: translate(0, 0);
    }

    25% {
        transform: translate(2px, 1px);
    }

    50% {
        transform: translate(0, 2px);
    }

    75% {
        transform: translate(-2px, 1px);
    }
}

.eye-highlight {
    fill: #fff;
    opacity: 0.8;
}

.face.happy .eye-highlight {
    animation: eyeMove 3s ease-in-out infinite;
}

/* 星星装饰效果 */
.star {
    fill: #ffeb3b;
    opacity: 0;
}

.star-1 {
    animation: twinkle 2s ease-in-out infinite;
}

.star-2 {
    animation: twinkle 2s ease-in-out infinite 0.4s;
}

.star-3 {
    animation: twinkle 2s ease-in-out infinite 0.8s;
}

.star-4 {
    animation: twinkle 2s ease-in-out infinite 1.2s;
}

/* 计时器文本样式增强 */
.time {
    fill: white;
    font-size: 22px;
    font-weight: 800;
    font-family: monospace;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    transition: all 0.3s ease;
    letter-spacing: 1px;
}

.tomato-body.active .time {
    animation: pulseText 2s ease-in-out infinite;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.5);
}

@keyframes pulseText {

    0%,
    100% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.05);
    }
}

@keyframes twinkle {

    0%,
    100% {
        opacity: 0;
        transform: scale(0.8);
    }

    50% {
        opacity: 0.8;
        transform: scale(1.2);
    }
}

.time-jumping {
    animation: timeJump 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) infinite;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
}

@keyframes swayLeft {

    0%,
    100% {
        transform: rotate(0deg);
    }

    50% {
        transform: rotate(-10deg);
    }
}

@keyframes swayRight {

    0%,
    100% {
        transform: rotate(0deg);
    }

    50% {
        transform: rotate(10deg);
    }
}

@keyframes stemSway {

    0%,
    100% {
        transform: scaleY(1);
    }

    50% {
        transform: scaleY(1.1);
    }
}

@keyframes bounce {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-5px);
    }
}

@keyframes smile {
    from {
        transform: scaleY(1);
    }

    to {
        transform: scaleY(1.2);
    }
}

@keyframes blink {

    0%,
    90%,
    100% {
        transform: scaleY(1);
    }

    95% {
        transform: scaleY(0.1);
    }
}

@keyframes timeJump {
    0% {
        transform: scale(1) translateY(0) rotate(0deg);
        fill: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    20% {
        transform: scale(1.2) translateY(-5px) rotate(-2deg);
        fill: #ff9800;
        text-shadow: 0 0 8px rgba(255, 152, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    50% {
        transform: scale(1.3) translateY(-7px) rotate(0deg);
        fill: #ffeb3b;
        text-shadow: 0 0 10px rgba(255, 235, 59, 1), 0 0 15px rgba(255, 235, 59, 0.6), 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    80% {
        transform: scale(1.2) translateY(-5px) rotate(2deg);
        fill: #ff9800;
        text-shadow: 0 0 8px rgba(255, 152, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 0.5);
    }

    100% {
        transform: scale(1) translateY(0) rotate(0deg);
        fill: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
}
</style>