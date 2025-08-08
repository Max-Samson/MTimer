import { computed, onMounted, onBeforeUnmount, ref } from 'vue';

/**
 * 图表主题Hook，提供统一的主题颜色和配置
 * @returns 图表主题相关的状态和方法
 */
export function useChartsTheme() {
  // 主题类型
  const isDarkTheme = ref(document.documentElement.getAttribute('data-theme') === 'dark');

  // 监听主题变化
  const themeObserver = new MutationObserver(() => {
    isDarkTheme.value = document.documentElement.getAttribute('data-theme') === 'dark';
  });

  // 组件挂载时开始监听主题变化
  onMounted(() => {
    // 监听data-theme属性变化
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
  });

  // 组件卸载前停止监听
  onBeforeUnmount(() => {
    themeObserver.disconnect();
  });

  // 字体颜色
  const textColor = computed(() =>
    isDarkTheme.value ? '#E5EAF3' : '#606266'
  );

  // 轴线颜色
  const axisLineColor = computed(() =>
    isDarkTheme.value ? '#4C5D7A' : '#ddd'
  );

  // 轴标签颜色
  const axisFontColor = computed(() =>
    isDarkTheme.value ? '#909399' : '#666'
  );

  // 分割线颜色
  const splitLineColor = computed(() =>
    isDarkTheme.value ? 'rgba(76, 93, 122, 0.2)' : 'rgba(220, 220, 220, 0.5)'
  );

  // 背景色
  const backgroundColor = computed(() =>
    isDarkTheme.value ? '#252D3C' : 'transparent'
  );

  // 主题颜色
  const colors = {
    primary: '#3A82F6',
    success: '#20bf6b',
    warning: '#f39c12',
    danger: '#e74c3c',
    tomato: '#ff6b6b',
    info: '#4b7bec',
  };

  // 获取面积图渐变色
  const getAreaGradient = (color: string) => {
    return {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: `${color}bb` }, // 顶部颜色，较高不透明度
        { offset: 1, color: isDarkTheme.value ? `${color}22` : `${color}11` } // 底部颜色，低不透明度
      ]
    };
  };

  // 获取折线图配置
  const getLineChartOption = ({
    dates,
    data,
    name = '数值',
    color = colors.primary,
    yAxisFormatter = (value: number) => `${value}`
  }: {
    dates: string[],
    data: number[],
    name?: string,
    color?: string,
    yAxisFormatter?: (value: number) => string
  }) => {
    return {
      backgroundColor: backgroundColor.value,
      tooltip: {
        trigger: 'axis',
        textStyle: {
          color: textColor.value
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '5%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          formatter: '{value}',
          color: axisFontColor.value
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor.value
          }
        },
        axisTick: {
          alignWithLabel: true,
          lineStyle: {
            color: axisLineColor.value
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: yAxisFormatter,
          color: axisFontColor.value
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor.value
          }
        },
        splitLine: {
          lineStyle: {
            color: splitLineColor.value,
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: name,
          type: 'line',
          data: data,
          areaStyle: {
            color: getAreaGradient(color)
          },
          itemStyle: {
            color: color,
            borderWidth: 2
          },
          lineStyle: {
            width: 3
          },
          smooth: true,
          symbolSize: 7,
          emphasis: {
            scale: true,
            itemStyle: {
              borderColor: isDarkTheme.value ? '#fff' : color,
              borderWidth: 2
            }
          }
        }
      ],
      animationDuration: 1000
    };
  };

  // 获取柱状图配置
  const getBarChartOption = ({
    dates,
    data,
    name = '数值',
    color = colors.primary,
    yAxisFormatter = (value: number) => `${value}`
  }: {
    dates: string[],
    data: number[],
    name?: string,
    color?: string,
    yAxisFormatter?: (value: number) => string
  }) => {
    return {
      backgroundColor: backgroundColor.value,
      tooltip: {
        trigger: 'axis',
        textStyle: {
          color: textColor.value
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '5%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          formatter: '{value}',
          color: axisFontColor.value
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor.value
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: yAxisFormatter,
          color: axisFontColor.value
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor.value
          }
        },
        splitLine: {
          lineStyle: {
            color: splitLineColor.value,
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: name,
          type: 'bar',
          data: data,
          barWidth: '40%',
          itemStyle: {
            color: color,
            borderRadius: [3, 3, 0, 0]
          }
        }
      ],
      animationDuration: 1000
    };
  };

  // 获取饼图配置
  const getPieChartOption = ({
    data,
    colorList = [colors.primary, colors.success, colors.warning, colors.danger]
  }: {
    data: Array<{name: string, value: number}>,
    colorList?: string[]
  }) => {
    return {
      backgroundColor: backgroundColor.value,
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        textStyle: {
          color: textColor.value
        }
      },
      series: [
        {
          type: 'pie',
          radius: '65%',
          center: ['50%', '50%'],
          data: data,
          itemStyle: {
            borderRadius: 6,
            borderColor: isDarkTheme.value ? '#252D3C' : '#fff',
            borderWidth: 2
          },
          label: {
            color: textColor.value
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          }
        }
      ],
      color: colorList,
      animationDuration: 1000
    };
  };

  return {
    isDarkTheme,
    colors,
    textColor,
    axisLineColor,
    axisFontColor,
    splitLineColor,
    backgroundColor,
    getAreaGradient,
    getLineChartOption,
    getBarChartOption,
    getPieChartOption
  };
}
