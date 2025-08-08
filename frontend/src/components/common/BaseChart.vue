<template>
  <div class="base-chart">
    <!-- 加载状态 -->
    <div v-if="loading" class="chart-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">{{ loadingText }}</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="isEmpty" class="chart-empty">
      <p>{{ emptyText }}</p>
    </div>

    <!-- 图表容器 -->
    <div v-else ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, watchEffect, computed, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useChartsTheme } from '../../hooks/useChartsTheme';
import { logger } from '../../utils/logger';

// 注册ECharts组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  PieChart,
  CanvasRenderer
]);

const props = defineProps<{
  // 图表配置选项
  option: any;
  // 加载状态
  loading?: boolean;
  // 加载文本
  loadingText?: string;
  // 空状态文本
  emptyText?: string;
  // 图表类型
  type?: 'line' | 'bar' | 'pie';
  // 自动调整大小
  autoResize?: boolean;
  // 组件名称，用于日志记录
  componentName?: string;
  // 数据是否为空的判断条件，默认根据option中的data判断
  isEmpty?: boolean;
}>();

// 设置默认值
const loading = props.loading ?? false;
const loadingText = props.loadingText ?? '加载中...';
const emptyText = props.emptyText ?? '暂无数据';
const type = props.type ?? 'line';
const autoResize = props.autoResize ?? true;
const componentName = props.componentName ?? 'BaseChart';

// 判断数据是否为空
const isEmpty = computed(() => {
  if (props.isEmpty !== undefined) {
    return props.isEmpty;
  }

  if (!props.option || !props.option.series) {
    return true;
  }

  // 检查series中的数据是否为空
  const series = Array.isArray(props.option.series) ? props.option.series : [props.option.series];
  return series.every((item: any) => {
    if (!item.data) return true;
    if (Array.isArray(item.data) && item.data.length === 0) return true;
    return false;
  });
});

// 图表容器引用
const chartContainer = ref<HTMLElement | null>(null);
// 图表实例
let chartInstance: echarts.ECharts | null = null;
// 获取图表主题
const { isDarkTheme } = useChartsTheme();

// 初始化图表
const initChart = () => {
  if (chartInstance) {
    chartInstance.dispose();
  }

  if (!chartContainer.value) return;

  try {
    logger.chart(componentName, `初始化${type}图表`);
    chartInstance = echarts.init(chartContainer.value);
    updateChartOption();
  } catch (error) {
    logger.error(componentName, `初始化图表失败`, error);
  }
};

// 更新图表选项
const updateChartOption = () => {
  if (!chartInstance || !props.option) return;

  try {
    logger.chart(componentName, `更新图表选项`, props.option);
    chartInstance.setOption(props.option);
  } catch (error) {
    logger.error(componentName, `更新图表选项失败`, error);
  }
};

// 调整图表大小
const resizeChart = () => {
  if (chartInstance) {
    chartInstance.resize();
  }
};

// 监听窗口大小变化
const handleResize = () => {
  resizeChart();
};

// 监听选项变化
watch(() => props.option, () => {
  updateChartOption();
}, { deep: true });

// 监听主题变化
watch(() => isDarkTheme.value, () => {
  // 当主题变化时，重新初始化图表以应用新主题
  nextTick(() => {
    if (chartInstance && chartContainer.value) {
      initChart();
    }
  });
});

// 组件挂载后初始化图表
onMounted(() => {
  if (!isEmpty.value) {
    initChart();
  }

  if (autoResize) {
    window.addEventListener('resize', handleResize);
  }
});

// 组件卸载前清理资源
onBeforeUnmount(() => {
  if (autoResize) {
    window.removeEventListener('resize', handleResize);
  }

  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

// 暴露方法给父组件
defineExpose({
  resize: resizeChart,
  getInstance: () => chartInstance
});
</script>

<style scoped>
.base-chart {
  width: 100%;
  height: 100%;
  min-height: 200px;
  position: relative;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.chart-loading,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: #909399;
}

.loading-spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border-left-color: #3A82F6;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.loading-text {
  font-size: 14px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

:root[data-theme="dark"] .chart-loading,
:root[data-theme="dark"] .chart-empty {
  color: #909399;
}

:root[data-theme="dark"] .loading-spinner {
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: #3A82F6;
}
</style>
