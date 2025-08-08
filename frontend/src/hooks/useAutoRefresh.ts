import { onMounted, onBeforeUnmount, ref } from 'vue';
import { logger } from '../utils/logger';

/**
 * 自动刷新Hook
 * @param refreshFn 刷新函数
 * @param options 配置选项
 * @returns 自动刷新相关状态和控制函数
 */
export function useAutoRefresh(
  refreshFn: () => Promise<void> | void,
  options: {
    componentName: string; // 用于日志记录的组件名
    interval?: number; // 刷新间隔，单位毫秒
    enableFocusRefresh?: boolean; // 是否在窗口聚焦时刷新
    initialRefresh?: boolean; // 是否在挂载时立即刷新
  }
) {
  const {
    componentName,
    interval = 5 * 60 * 1000, // 默认5分钟
    enableFocusRefresh = true,
    initialRefresh = true
  } = options;

  // 自动刷新状态
  const isAutoRefreshEnabled = ref(false);
  const isRefreshing = ref(false);
  // 用于触发刷新的计数器
  const refreshCounter = ref(0);

  // 存储定时器ID
  let refreshTimer: number | null = null;

  // 执行刷新的函数
  const doRefresh = async () => {
    if (isRefreshing.value) {
      logger.debug(componentName, '正在刷新中，跳过本次刷新');
      return;
    }

    try {
      isRefreshing.value = true;
      logger.info(componentName, '开始数据刷新');
      await refreshFn();
      refreshCounter.value++; // 增加计数器以便其他组件可以监听这个变化
      logger.info(componentName, '数据刷新完成');
    } catch (error) {
      logger.error(componentName, '数据刷新失败', error);
    } finally {
      isRefreshing.value = false;
    }
  };

  // 手动刷新数据
  const refresh = () => {
    logger.info(componentName, '手动触发刷新');
    doRefresh();
  };

  // 窗口获得焦点时的刷新处理
  const handleFocus = () => {
    if (enableFocusRefresh && isAutoRefreshEnabled.value) {
      logger.info(componentName, '窗口获得焦点，自动刷新数据');
      doRefresh();
    }
  };

  // 开启自动刷新
  const startAutoRefresh = () => {
    if (isAutoRefreshEnabled.value) return;

    isAutoRefreshEnabled.value = true;
    logger.info(componentName, `开启自动刷新，间隔: ${interval}ms`);

    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    refreshTimer = window.setInterval(() => {
      if (isAutoRefreshEnabled.value) {
        logger.info(componentName, '定时自动刷新');
        doRefresh();
      }
    }, interval);
  };

  // 停止自动刷新
  const stopAutoRefresh = () => {
    if (!isAutoRefreshEnabled.value) return;

    isAutoRefreshEnabled.value = false;
    logger.info(componentName, '停止自动刷新');

    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  };

  // 切换自动刷新状态
  const toggleAutoRefresh = () => {
    if (isAutoRefreshEnabled.value) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  };

  // 组件挂载时设置
  onMounted(() => {
    // 添加窗口焦点事件监听
    if (enableFocusRefresh) {
      window.addEventListener('focus', handleFocus);
    }

    // 初始刷新
    if (initialRefresh) {
      doRefresh();
    }

    // 默认不开启自动刷新，需要通过startAutoRefresh手动开启
  });

  // 组件卸载前清理
  onBeforeUnmount(() => {
    if (enableFocusRefresh) {
      window.removeEventListener('focus', handleFocus);
    }

    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  });

  return {
    isAutoRefreshEnabled,
    isRefreshing,
    refreshCounter,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    toggleAutoRefresh
  };
}
