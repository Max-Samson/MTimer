<template>
  <div class="week-trend-chart">
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { DailyTrendData } from '../../services/DatabaseService';

// 注册ECharts组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  CanvasRenderer
]);

const props = defineProps<{
  weekData: DailyTrendData[]
}>();

const chartContainer = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

// 格式化分钟数
const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return '0分钟';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return hours > 0
    ? `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
    : `${mins}分钟`;
};

// 初始化图表
const initChart = () => {
  if (chartInstance) {
    chartInstance.dispose();
  }

  if (!chartContainer.value) {
    console.warn('图表容器DOM元素不存在，等待下一次更新');
    // 使用setTimeout等待DOM更新完成
    setTimeout(() => {
      if (chartContainer.value) {
        console.log('DOM更新完成，重新初始化图表');
        initChart();
      }
    }, 300);
    return;
  }

  try {
    console.log('初始化图表实例...');
    chartInstance = echarts.init(chartContainer.value);

    // 确保数据存在后再更新图表
    if (props.weekData && props.weekData.length > 0) {
      console.log('数据已准备好，立即更新图表');
      updateChart();
    } else {
      console.warn('没有数据可以显示，设置空图表');
      // 设置空图表
      chartInstance.setOption({
        title: {
          text: '暂无趋势数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 14
          }
        }
      });
    }

    // 添加数据加载完成后的回调
    window.addEventListener('focus', handleDataRefresh);
  } catch (error) {
    console.error('初始化图表失败:', error);
  }
};

// 更新图表数据
const updateChart = () => {
  if (!chartInstance) {
    console.warn('图表实例不存在，无法更新图表');
    return;
  }

  if (!props.weekData || props.weekData.length === 0) {
    console.warn('没有数据可以显示，设置空图表');
    // 设置空图表
    chartInstance.setOption({
      title: {
        text: '暂无趋势数据',
        left: 'center',
        top: 'center',
        textStyle: {
          color: '#999',
          fontSize: 14
        }
      }
    });
    return;
  }

  try {
    // 添加调试信息以确认数据
    console.log('WeekTrendChart 收到的原始数据:', JSON.stringify(props.weekData));

    // 格式化日期
    const dates = props.weekData.map(item => {
      const dateParts = item.date.split('-');
      if (dateParts.length >= 3) {
        return `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;
      }
      return item.date;
    });

    // 提取专注时长数据，确保数值有效
    const focusTimeData = props.weekData.map(item => {
      // 确保totalFocusMinutes是有效的数字
      let minutes = 0;
      if (typeof item.totalFocusMinutes === 'number' && !isNaN(item.totalFocusMinutes)) {
        minutes = item.totalFocusMinutes;
      }

      // 确保数据不为负数
      minutes = Math.max(0, minutes);

      console.log(`日期 ${item.date} 的专注时长: ${minutes}分钟`);

      // 将分钟转换为小时，保留一位小数以提高可读性
      return parseFloat((minutes / 60).toFixed(1));
    });

    // 提取番茄数据，确保数值有效
    const pomodorosData = props.weekData.map(item => {
      let count = 0;
      if (typeof item.pomodoroCount === 'number' && !isNaN(item.pomodoroCount)) {
        count = Math.max(0, item.pomodoroCount); // 确保不为负数
      } else if (typeof item.tomatoHarvests === 'number' && !isNaN(item.tomatoHarvests)) {
        // 备选字段
        count = Math.max(0, item.tomatoHarvests);
      }
      return count;
    });

    // 提取完成任务数据，确保数值有效
    const tasksData = props.weekData.map(item => {
      let count = 0;
      if (typeof item.completedTasks === 'number' && !isNaN(item.completedTasks)) {
        count = Math.max(0, item.completedTasks); // 确保不为负数
      }
      console.log(`日期 ${item.date} 的完成任务数: ${count}`);
      return count;
    });

    console.log('处理后的图表数据:', {
      dates,
      focusTimeData,
      pomodorosData,
      tasksData
    });

    // 检查是否所有数据都为0，如果是则显示提示信息
    const allZero = focusTimeData.every(v => v === 0) &&
                  pomodorosData.every(v => v === 0) &&
                  tasksData.every(v => v === 0);

    if (allZero) {
      console.warn('所有数据都为0，图表可能显示为空');
      // 显示空数据提示
      chartInstance.setOption({
        title: {
          text: '暂无趋势数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 14
          }
        }
      });
      return;
    }

    // 计算合适的最大值，确保数据在图表上显示得更清晰
    const maxFocusTime = Math.max(...focusTimeData, 1); // 至少为1
    const maxYAxis1 = Math.ceil(maxFocusTime * 1.2); // 留出20%的空间

    const maxCount = Math.max(...pomodorosData, ...tasksData, 1); // 至少为1
    const maxYAxis2 = Math.max(Math.ceil(maxCount * 1.2), 10); // 确保至少有10的刻度

    // 设置合适的柱宽，确保对齐
    const barWidth = dates.length <= 7 ? '30%' : dates.length <= 14 ? '25%' : '20%';

    // 图表配置
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: function(params: Array<any>) {
          let result = params[0].name + '<br/>';
          params.forEach((item) => {
            let markerSpan = `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${item.color};"></span>`;
            if (item.seriesName === '专注时长') {
              result += `${markerSpan}${item.seriesName}: ${formatMinutes(item.value * 60)}<br/>`;
            } else {
              result += `${markerSpan}${item.seriesName}: ${item.value}<br/>`;
            }
          });
          return result;
        }
      },
      legend: {
        data: ['专注时长', '完成番茄', '完成任务'],
        bottom: 0,
        textStyle: {
          color: '#333'
        },
        selectedMode: true
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: true,
        // 确保轴线对齐数据
        axisTick: {
          alignWithLabel: true
        },
        axisLabel: {
          formatter: '{value}',
          color: '#666',
          interval: 0
        },
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '小时',
          min: 0,
          max: maxYAxis1,
          interval: maxYAxis1 > 10 ? Math.ceil(maxYAxis1 / 5) : 2,
          axisLabel: {
            formatter: '{value}h',
            color: '#666'
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#ddd'
            }
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(220,220,220,0.5)'
            }
          }
        },
        {
          type: 'value',
          name: '数量',
          min: 0,
          max: maxYAxis2,
          interval: Math.ceil(maxYAxis2 / 5),
          position: 'right',
          axisLine: {
            show: true,
            lineStyle: {
              color: '#ddd'
            }
          },
          axisLabel: {
            formatter: '{value}',
            color: '#666'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '专注时长',
          type: 'line',
          data: focusTimeData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          yAxisIndex: 0,
          z: 3, // 让线图显示在最前面
          lineStyle: {
            width: 3
          },
          itemStyle: {
            color: '#4b7bec'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                {offset: 0, color: 'rgba(75, 123, 236, 0.7)'},
                {offset: 1, color: 'rgba(75, 123, 236, 0.1)'}
              ]
            }
          }
        },
        {
          name: '完成番茄',
          type: 'bar',
          yAxisIndex: 1,
          data: pomodorosData,
          barWidth: barWidth,
          // 设置柱体之间的间距
          barGap: '50%',
          // 保证数据对齐坐标
          barCategoryGap: '30%',
          z: 2,
          itemStyle: {
            color: '#ff6b6b',
            borderRadius: [3, 3, 0, 0]
          }
        },
        {
          name: '完成任务',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: barWidth,
          // 设置柱体之间的间距
          barGap: '50%',
          // 保证数据对齐坐标
          barCategoryGap: '30%',
          z: 1,
          data: tasksData,
          itemStyle: {
            color: '#20bf6b',
            borderRadius: [3, 3, 0, 0]
          }
        }
      ]
    };

    chartInstance.setOption(option);
    console.log('图表更新完成');
  } catch (error) {
    console.error('更新图表失败:', error);
  }
};

// 处理数据刷新
const handleDataRefresh = () => {
  console.log('触发数据刷新检查');
  // 如果有新数据，刷新图表
  if (props.weekData && props.weekData.length > 0) {
    updateChart();
  }
};

// 监听数据变化，更新图表
watch(() => props.weekData, () => {
  updateChart();
}, { deep: true });

// 监听窗口大小变化，调整图表大小
const handleResize = () => {
  chartInstance?.resize();
};

// 组件挂载时初始化图表
onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

// 组件卸载前清理资源
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('focus', handleDataRefresh);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped>
.week-trend-chart {
  width: 100%;
}

.chart-container {
  width: 100%;
  height: 300px;
}
</style>
