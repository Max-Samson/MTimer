<!-- 事件统计组件 -->
<template>
  <div class="event-stats">
    <div class="stats-header">
      <h3 class="section-title">事件统计</h3>

      <!-- 修改刷新按钮样式，使用静态图标 -->
      <button class="refresh-btn" @click="refreshData" :disabled="loading">
        <i class="refresh-icon" v-if="!loading">🔄</i>
        <span v-if="loading" class="loading-spinner-small"></span>
        <span v-else>刷新</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载统计数据中...</p>
      <button @click="forceStopLoading" class="skip-loading-btn">跳过加载</button>
    </div>

    <div v-else-if="!hasData" class="empty-data">
      <div class="empty-icon">📋</div>
      <p>暂无事件统计数据</p>
      <p class="empty-tip">完成一些任务后再来查看吧</p>
    </div>

    <div v-else>
      <!-- 修改时间筛选布局 -->
      <div class="time-filter">
        <div class="filter-container">
          <div class="filter-buttons">
            <button
              v-for="filter in timeFilters"
              :key="filter.value"
              :class="['filter-btn', { active: currentFilter === filter.value }]"
              @click="changeTimeFilter(filter.value)"
            >
              {{ filter.label }}
            </button>
          </div>
          <div class="custom-date-range" v-if="currentFilter === 'custom'">
            <input type="date" v-model="startDate" @change="loadData" />
            <span>至</span>
            <input type="date" v-model="endDate" @change="loadData" />
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-label">事件总数</div>
          <div class="stat-value">{{ stats.totalEvents }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-label">已完成事件</div>
          <div class="stat-value">{{ stats.completedEvents }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-label">完成率</div>
          <div class="stat-value">{{ stats.completionRate }}</div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-container">
        <!-- 任务完成率图 -->
        <div class="chart-wrapper">
          <h4 class="chart-title">任务完成率</h4>
          <div v-if="!hasData" class="empty-chart">
            <p>暂无完成率数据</p>
          </div>
          <div v-else ref="completionRateChart" class="chart"></div>
        </div>

        <!-- 工作量趋势图 - 使用BaseChart组件 -->
        <div class="chart-wrapper">
          <h4 class="chart-title">工作量趋势</h4>
          <BaseChart
            v-if="stats.trendData && stats.trendData.length > 0"
            :option="getTrendChartOption()"
            :loading="loading"
            :isEmpty="!stats.trendData || stats.trendData.length === 0"
            type="line"
            componentName="EventStatsTrendChart"
          />
          <div v-else class="empty-chart">
            <p>暂无趋势数据</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick, onBeforeUnmount, inject, watch } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import dbService, { EventStatsResponse } from '../../services/DatabaseService';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { formatMinutes, formatDateShort } from '../../utils/formatters';
import { logger } from '../../utils/logger';
import BaseChart from '../common/BaseChart.vue';
import { useChartsTheme } from '../../hooks/useChartsTheme';

// 扩展Window接口，添加loadingTimeoutId属性
declare global {
  interface Window {
    loadingTimeoutId: number | null;
    refreshDataTimeout: ReturnType<typeof setTimeout> | null;
  }
}

// 初始化全局变量
window.loadingTimeoutId = null;
window.refreshDataTimeout = null;

// 注册必要的组件
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

// 图表引用
const completionRateChart = ref<HTMLElement | null>(null);
const workloadTrendChart = ref<HTMLElement | null>(null);

// 图表实例
let completionRateChartInstance: echarts.ECharts | null = null;
let workloadTrendChartInstance: echarts.ECharts | null = null;

// 获取全局数据状态方法
const setGlobalLoading = inject('setGlobalLoading') as ((loading: boolean) => void) | undefined;
const setGlobalError = inject('setGlobalError') as ((message: string) => void) | undefined;
const updateLastRefreshTime = inject('updateLastRefreshTime') as (() => void) | undefined;

// 加载状态
const loading = ref(true);
const autoRefresh = ref(false);
let refreshTimer: number | null = null;

// 添加错误状态
const error = ref<string | null>(null);

// 自动刷新标记
const dataRefreshKey = ref(0);

// 声明chart可见性变量
const chartVisible = ref(true);

// 声明访问值变量 - 这些是直接绑定到模板中使用的
const totalEvents = ref(0);
const completedEvents = ref(0);
const completionRate = ref("0.00");
const trendData = ref<any[]>([]);

// 数据过滤条件
const dateRange = ref({
  startDate: '',
  endDate: ''
});

// 时间过滤器选项
const timeFilters = [
  { label: '近7天', value: '7days' },
  { label: '近30天', value: '30days' },
  { label: '本月', value: 'thisMonth' },
  { label: '自定义', value: 'custom' }
];

// 当前选中的过滤器
const currentFilter = ref('7days');

// 自定义日期范围
const today = new Date();
const startDate = ref(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
const endDate = ref(today.toISOString().split('T')[0]);

// 初始化数据
const stats = reactive<EventStatsResponse>({
  totalEvents: 0,
  completedEvents: 0,
  completionRate: "0.00",
  trendData: []
});

// 使用图表主题
const {
  getLineChartOption
} = useChartsTheme();

// 获取趋势图表选项
const getTrendChartOption = () => {
  // 准备数据
  if (!stats.trendData || !Array.isArray(stats.trendData) || stats.trendData.length === 0) {
    return {
      tooltip: {},
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [{ data: [], type: 'line' }]
    };
  }

  const dates = stats.trendData.map(item => formatDateShort(item.date || ''));
  const focusData = stats.trendData.map(item => item.totalFocusMinutes || 0);

  // 使用useChartsTheme返回的工具函数生成图表选项
  return getLineChartOption({
    dates,
    data: focusData,
    name: '专注时长',
    yAxisFormatter: (value) => `${Math.floor(value / 60)}h`
  });
};

// 检查是否有数据
const hasData = computed(() => {
  // 添加调试日志
  console.log('检查数据状态:', {
    totalEvents: stats.totalEvents,
    completedEvents: stats.completedEvents,
    completionRate: stats.completionRate,
    trendDataLength: stats.trendData?.length || 0,
    hasTrendData: Array.isArray(stats.trendData) && stats.trendData.length > 0
  });

  // 直接简化判断逻辑，只要有任何一种统计数据，就认为有数据
  const hasTotalEvents = stats.totalEvents > 0;
  const hasTrendData = Array.isArray(stats.trendData) && stats.trendData.length > 0;

  // 放宽条件，在有趋势数据的情况下，不再检查数据是否都为0
  return hasTotalEvents || hasTrendData;
});

// 检查当前主题
const isDarkTheme = computed(() => {
  return document.documentElement.getAttribute('data-theme') === 'dark';
});

// 监听主题变化
const updateChartsTheme = () => {
  if (completionRateChartInstance) {
    completionRateChartInstance.dispose();
    completionRateChartInstance = null;
    if (completionRateChart.value && parseFloat(stats.completionRate) > 0) {
      initCompletionRateChart();
    }
  }

  if (workloadTrendChartInstance) {
    workloadTrendChartInstance.dispose();
    workloadTrendChartInstance = null;
    if (workloadTrendChart.value && stats.trendData && stats.trendData.length > 0) {
      initWorkloadTrendChart();
    }
  }
};

// 加载数据
const loadData = async () => {
  // 如果已经在加载中，则跳过
  if (loading.value) {
    console.log('数据正在加载中，跳过此次刷新');
    return;
  }

  console.log(`开始加载事件统计数据，时间范围: ${startDate.value} - ${endDate.value}`);
  loading.value = true;
  error.value = null;

  // 同步更新全局加载状态
  setGlobalLoading?.(true);
  setGlobalError?.('');

  try {
    // 设置加载超时处理，5秒后强制结束加载状态
    const timeoutId = setTimeout(() => {
      if (loading.value) {
        console.warn('数据加载超时，自动停止加载');
        completeLoading();
      }
    }, 5000); // 将超时时间从15秒减少到5秒

    // 直接获取数据
    console.time('获取事件统计数据');
    const response = await Promise.race([
      dbService.getEventStats(startDate.value, endDate.value),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), 4000)
      )
    ]) as EventStatsResponse;

    console.timeEnd('获取事件统计数据');
    console.log('获取到的事件统计数据:', response);

    // 清除超时计时器
    clearTimeout(timeoutId);

    // 检查数据是否有效
    if (!response) {
      console.warn('API返回无效数据');
      throw new Error('获取事件统计数据失败');
    }

    // 数据预处理 - 确保数据结构和值的有效性
    const processedData: EventStatsResponse = {
      totalEvents: typeof response.totalEvents === 'number' ? response.totalEvents : 0,
      completedEvents: typeof response.completedEvents === 'number' ? response.completedEvents : 0,
      completionRate: typeof response.completionRate === 'string' ? response.completionRate : '0.00',
      trendData: Array.isArray(response.trendData) ? [...response.trendData] : []
    };

    // 确保完成率格式正确（百分比字符串）
    if (!processedData.completionRate.endsWith('%')) {
      const rate = parseFloat(processedData.completionRate);
      processedData.completionRate = isNaN(rate) ? '0.00%' : rate.toFixed(2) + '%';
    }

    // 处理趋势数据
    if (processedData.trendData && processedData.trendData.length > 0) {
      processedData.trendData = processedData.trendData.map(item => ({
        date: item.date || new Date().toISOString().split('T')[0],
        totalFocusMinutes: typeof item.totalFocusMinutes === 'number' ? item.totalFocusMinutes : 0
      })).filter(item => !!item.date); // 过滤掉没有日期的项

      // 确保趋势数据是按日期排序的
      processedData.trendData.sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        return dateA.getTime() - dateB.getTime();
      });
    } else {
      processedData.trendData = [];
    }

    console.log('处理后的数据:', JSON.stringify(processedData));

    // 更新响应式数据对象
    Object.assign(stats, processedData);

    // 同时更新顶层访问变量
    totalEvents.value = stats.totalEvents;
    completedEvents.value = stats.completedEvents;
    completionRate.value = stats.completionRate;

    // 更新最后刷新时间
    updateLastRefreshTime?.();

    // 数据加载成功后绘制图表 - 使用requestAnimationFrame提高渲染性能
    window.requestAnimationFrame(() => {
      chartVisible.value = true;
      if (hasData.value) {
        refreshCharts();
      }
      // 确保加载状态结束
      loading.value = false;
      setGlobalLoading?.(false);
    });
  } catch (error) {
    console.error('加载事件统计数据失败:', error);

    // 设置错误状态
    setGlobalError?.('加载事件统计数据失败，请稍后重试');

    // 即使出错也显示空数据状态，而不是一直显示加载中
    Object.assign(stats, {
      totalEvents: 0,
      completedEvents: 0,
      completionRate: '0%',
      trendData: []
    });

    // 结束加载状态
    loading.value = false;
    setGlobalLoading?.(false);
  }
};

// 完成加载的通用方法
const completeLoading = () => {
  // 延迟一点初始化图表，确保DOM已更新
  setTimeout(() => {
    // 结束加载状态
    loading.value = false;
    setGlobalLoading?.(false);

    // 手动触发界面更新
    nextTick(() => {
      // 设置图表为可见
      chartVisible.value = true;

      // 刷新图表（如果有数据）
      if (stats.totalEvents > 0 || (stats.trendData && stats.trendData.length > 0)) {
        try {
          refreshCharts();
        } catch (error) {
          console.error('刷新图表失败:', error);
        }
      }

      // 确保界面刷新
      window.dispatchEvent(new Event('resize'));
    });
  }, 300);
};

// 强制停止加载
const forceStopLoading = () => {
  console.log('用户强制停止加载');

  if (window.loadingTimeoutId) {
    clearTimeout(window.loadingTimeoutId);
    window.loadingTimeoutId = null;
  }

  // 清空数据但保持状态为可显示
  Object.assign(stats, {
    totalEvents: 0,
    completedEvents: 0,
    completionRate: '0%',
    trendData: []
  });

  // 立即结束所有加载状态
  loading.value = false;
  setGlobalLoading?.(false);

  // 清除可能的错误消息
  error.value = null;
  setGlobalError?.('');

  // 更新图表状态
  chartVisible.value = true;

  // 生成一些最小的演示数据，让用户知道跳过加载成功了
  setTimeout(() => {
    // 显示提示
    setGlobalError?.('已跳过加载，显示空数据状态');

    // 通知其他组件刷新
    window.dispatchEvent(new Event('stats-updated'));
  }, 100);
};

// 使用自动刷新Hook
const {
  isRefreshing,
  refresh: refreshData,
  isAutoRefreshEnabled,
  toggleAutoRefresh
} = useAutoRefresh(loadData, {
  componentName: 'EventStats',
  interval: 5 * 60 * 1000, // 5分钟刷新一次
  enableFocusRefresh: true,
  initialRefresh: true
});

// 切换时间过滤器
const changeTimeFilter = (filterValue: string) => {
  currentFilter.value = filterValue;

  // 设置日期范围
  const today = new Date();
  switch (filterValue) {
    case '7days':
      startDate.value = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      endDate.value = today.toISOString().split('T')[0];
      break;
    case '30days':
      startDate.value = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      endDate.value = today.toISOString().split('T')[0];
      break;
    case 'thisMonth':
      startDate.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      endDate.value = today.toISOString().split('T')[0];
      break;
    // 自定义日期不需要在这里设置
  }

  // 加载数据
  loadData();
};

// 窗口大小改变时重绘图表
const handleResize = () => {
  completionRateChartInstance?.resize();
  workloadTrendChartInstance?.resize();
};

window.addEventListener('resize', handleResize);

// 定义可见性变化事件处理函数
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('页面变为可见，刷新数据');
    refreshData();
  }
};

// 定义数据更新事件处理函数
const handleStatsUpdated = () => {
  console.log('检测到统计数据更新事件，刷新数据');
  // 使用防抖函数，避免短时间内多次刷新
  if (window.refreshDataTimeout) {
    clearTimeout(window.refreshDataTimeout);
  }
  window.refreshDataTimeout = setTimeout(() => {
    refreshData();
  }, 500);
};

// 组件挂载时加载数据并添加事件监听
onMounted(() => {
  // 初始加载数据
  loadData();

  // 监听统计数据更新事件
  window.addEventListener('stats-updated', handleStatsUpdated);

  // 添加可见性变化监听，当页面可见时刷新数据
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

// 组件卸载时清理事件监听
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  document.documentElement.removeEventListener('data-theme-changed', updateChartsTheme);
  window.removeEventListener('stats-updated', handleStatsUpdated);
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  // 清除自动刷新定时器
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (window.refreshDataTimeout) {
    clearTimeout(window.refreshDataTimeout);
    window.refreshDataTimeout = null;
  }

  // 销毁图表实例
  completionRateChartInstance?.dispose();
  workloadTrendChartInstance?.dispose();

  // 清除加载状态
  setGlobalLoading?.(false);
  setGlobalError?.('');
});

// 初始化和刷新图表
const refreshCharts = () => {
  console.log('强制刷新图表');

  // 强制设置图表可见
  chartVisible.value = true;

  // 销毁现有图表实例
  if (completionRateChartInstance) {
    completionRateChartInstance.dispose();
    completionRateChartInstance = null;
  }

  if (workloadTrendChartInstance) {
    workloadTrendChartInstance.dispose();
    workloadTrendChartInstance = null;
  }

  // 确保有数据可以显示
  const hasDataToShow = stats.totalEvents > 0 || (stats.trendData && stats.trendData.length > 0);
  if (!hasDataToShow) {
    console.log('无数据可以显示，生成演示数据');
    // 生成一些演示数据用于显示
    forceStopLoading();
    return;
  }

  // 立即初始化图表，不依赖于nextTick
  setTimeout(() => {
    console.log('开始初始化图表...');

    // 强制初始化完成率图表
    if (completionRateChart.value && parseFloat(stats.completionRate.replace('%', '')) > 0) {
      try {
        console.log('初始化完成率图表');
        initCompletionRateChart();
      } catch (e) {
        console.error('初始化完成率图表失败:', e);
      }
    }

    // 强制初始化趋势图表
    if (workloadTrendChart.value && stats.trendData && stats.trendData.length > 0) {
      try {
        console.log('初始化趋势图表');
        initWorkloadTrendChart();
      } catch (e) {
        console.error('初始化趋势图表失败:', e);
      }
    }

    // 触发窗口resize事件以确保图表正确渲染
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, 200);
};

// 更新图表函数
const updateChart = () => {
  if (completionRateChartInstance) {
    initCompletionRateChart();
  }
  if (workloadTrendChartInstance) {
    initWorkloadTrendChart();
  }
};

// 初始化完成率环形图
const initCompletionRateChart = () => {
  if (!completionRateChart.value) {
    console.warn('找不到完成率图表DOM元素');
    return;
  }

  try {
    // 解析完成率，去掉可能的百分号
    const completionRateStr = stats.completionRate || '0%';
    console.log('完成率字符串:', completionRateStr);
    const completionRate = parseFloat(completionRateStr.replace('%', ''));
    console.log('解析后的完成率数值:', completionRate);

    // 检查完成率是否有效
    if (isNaN(completionRate)) {
      console.warn('完成率数据无效:', completionRateStr);
      return;
    }

    // 如果完成率为0且没有事件总数，显示暂无数据
    if (completionRate === 0 && stats.totalEvents === 0) {
      console.warn('完成率为0且没有事件总数，不初始化图表');
      return;
    }

    // 初始化图表
    if (completionRateChartInstance) {
      completionRateChartInstance.dispose();
    }

    console.log('开始初始化完成率环形图');
    completionRateChartInstance = echarts.init(completionRateChart.value);

    // 计算未完成率
    const pendingRate = 100 - completionRate;

    // 主题适配的颜色
    const textColor = isDarkTheme.value ? '#E5EAF3' : '#606266';
    const completedColor = '#67C23A'; // 绿色
    const pendingColor = '#E6A23C';   // 橙色
    const backgroundColor = isDarkTheme.value ? '#252D3C' : 'transparent';

    // 配置选项
    const option = {
      backgroundColor: backgroundColor,
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c}%',
        textStyle: {
          color: textColor
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        data: ['已完成', '未完成'],
        textStyle: {
          color: textColor
        }
      },
      series: [
        {
          name: '事件状态',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center',
            color: textColor
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: textColor
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            {
              value: completionRate,
              name: '已完成',
              itemStyle: { color: completedColor }
            },
            {
              value: pendingRate,
              name: '未完成',
              itemStyle: { color: pendingColor }
            }
          ],
          animationType: 'scale'
        }
      ],
      color: [completedColor, pendingColor]
    };

    // 设置选项并渲染
    completionRateChartInstance.setOption(option);
    console.log('完成率环形图初始化完成');
  } catch (e) {
    console.error('初始化完成率图表时出错:', e);
  }
};

// 初始化工作量趋势图
const initWorkloadTrendChart = () => {
  if (!workloadTrendChart.value) {
    console.warn('找不到工作量趋势图表DOM元素');
    return;
  }

  try {
    // 检查是否有趋势数据
    if (!stats.trendData || !Array.isArray(stats.trendData) || stats.trendData.length === 0) {
      console.warn('无趋势数据，跳过图表初始化');
      return;
    }

    console.log('趋势数据:', JSON.stringify(stats.trendData));

    // 初始化图表
    if (workloadTrendChartInstance) {
      workloadTrendChartInstance.dispose();
    }

    console.log('开始初始化工作量趋势图');
    workloadTrendChartInstance = echarts.init(workloadTrendChart.value);

    // 设置选项并渲染
    workloadTrendChartInstance.setOption(getTrendChartOption());
    console.log('工作量趋势图初始化完成');
  } catch (e) {
    console.error('初始化工作量趋势图时出错:', e);
  }
};
</script>

<style scoped>
.event-stats {
  padding: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #333;
}

.time-filter {
  margin: 15px 0;
  display: flex;
  align-items: center;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background-color: #e8e8e8;
}

.filter-btn.active {
  background-color: #1867c0;
  color: white;
  border-color: #1867c0;
}

.refresh-controls {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background-color: #f0f0f0;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  font-size: 14px;
  /* 移除旋转动画 */
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.auto-refresh-btn {
  padding: 6px 12px;
  border: 1px solid #DCDFE6;
  border-radius: 4px;
  background-color: white;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
}

.auto-refresh-btn:hover {
  border-color: #C0C4CC;
}

.auto-refresh-btn.active {
  background-color: #3A82F6;
  color: white;
  border-color: #3A82F6;
}

.custom-date-range {
  margin-left: 10px;
  display: flex;
  align-items: center;
}

.custom-date-range input {
  padding: 6px;
  border: 1px solid #DCDFE6;
  border-radius: 4px;
}

.custom-date-range span {
  margin: 0 5px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-3px);
}

.stat-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #3A82F6;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-wrapper {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 350px; /* 确保有足够的高度容纳图表 */
  display: flex;
  flex-direction: column;
}

.chart-title {
  font-size: 16px;
  margin-bottom: 16px;
  text-align: center;
  color: #333;
  flex: 0 0 auto;
}

.chart {
  height: 300px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #3A82F6;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.empty-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  color: #909399;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 16px;
}

.empty-tip {
  font-size: 14px;
  color: #C0C4CC;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }

  .time-filter {
    flex-direction: column;
    align-items: flex-start;
  }

  .filter-buttons {
    width: 100%;
  }

  .refresh-controls {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }
}

:root[data-theme="dark"] .section-title,
:root[data-theme="dark"] .chart-title {
  color: #E5EAF3;
}

:root[data-theme="dark"] .stat-card,
:root[data-theme="dark"] .chart-wrapper {
  background-color: #252D3C;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

:root[data-theme="dark"] .filter-btn {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

:root[data-theme="dark"] .custom-date-range input {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

:root[data-theme="dark"] .empty-chart,
:root[data-theme="dark"] .empty-data {
  color: #909399;
}

:root[data-theme="dark"] .refresh-btn,
:root[data-theme="dark"] .auto-refresh-btn {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

:root[data-theme="dark"] .refresh-btn:hover,
:root[data-theme="dark"] .auto-refresh-btn:hover {
  background-color: #33415a;
}

.force-stop-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #f56c6c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.force-stop-btn:hover {
  background-color: #e74c3c;
}

:root[data-theme="dark"] .force-stop-btn {
  background-color: #d63031;
}

:root[data-theme="dark"] .force-stop-btn:hover {
  background-color: #c0392b;
}

.skip-loading-btn {
  margin-top: 16px;
  padding: 6px 12px;
  border: 1px solid #DCDFE6;
  border-radius: 4px;
  background-color: white;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
}

.skip-loading-btn:hover {
  background-color: #f5f7fa;
  border-color: #C0C4CC;
}

:root[data-theme="dark"] .skip-loading-btn {
  background-color: #252D3C;
  border-color: #4C5D7A;
  color: #E5EAF3;
}

.loading-spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #333;
  animation: spin 1s linear infinite;
}

:root[data-theme="dark"] .loading-spinner-small {
  border-color: rgba(255, 255, 255, 0.1);
  border-top-color: #E5EAF3;
}
</style>
