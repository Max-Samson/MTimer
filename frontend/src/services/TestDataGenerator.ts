/**
 * 测试数据生成器
 * 用于在前端生成模拟数据，以便测试统计图表功能
 */

import dbService, {
  DailySummaryResponse,
  EventStatsResponse,
  PomodoroStatsResponse,
  StatResponse,
  DailyTrendData,
  TimeDistribution
} from './DatabaseService';

export class TestDataGenerator {
  /**
   * 生成模拟的昨日小结数据
   */
  static generateDailySummary(): DailySummaryResponse {
    // 生成昨日统计数据
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 昨日各种计数
    const pomodoroCount = Math.floor(Math.random() * 8) + 3; // 3-10个番茄钟
    const customCount = Math.floor(Math.random() * 5) + 1; // 1-5个自定义专注
    const totalSessions = pomodoroCount + customCount;

    // 时间计算（分钟）
    const pomodoroMinutes = pomodoroCount * 25;
    const customMinutes = customCount * 30;
    const totalFocusMinutes = pomodoroMinutes + customMinutes;
    const totalBreakMinutes = totalSessions * 5;
    const tomatoHarvests = Math.floor(pomodoroCount * 0.8); // 80%的番茄钟有收获

    // 生成时间范围数据
    const timeRanges: string[] = [];
    const workHours = [9, 10, 11, 14, 15, 16, 17];

    for (let i = 0; i < totalSessions; i++) {
      const hourIndex = i % workHours.length;
      const hour = workHours[hourIndex];
      const minute = Math.floor(Math.random() * 30);
      timeRanges.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}~${hour.toString().padStart(2, '0')}:${(minute + 25).toString().padStart(2, '0')}`);
    }

    // 生成一周趋势数据
    const weekTrend: DailyTrendData[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayFactor = Math.random() * 0.5 + 0.5; // 0.5-1.0的随机因子
      const dayPomodoroCount = Math.floor((pomodoroCount * dayFactor) + (Math.random() * 4) - 2);
      const dayCustomCount = Math.floor((customCount * dayFactor) + (Math.random() * 3) - 1);

      // 确保不会有负数
      const safePomodoroCount = Math.max(0, dayPomodoroCount);
      const safeCustomCount = Math.max(0, dayCustomCount);

      const dayPomodoroMinutes = safePomodoroCount * 25;
      const dayCustomMinutes = safeCustomCount * 30;
      const dayTotalFocusMinutes = dayPomodoroMinutes + dayCustomMinutes;

      weekTrend.push({
        date: dateStr,
        pomodoroCount: safePomodoroCount,
        totalFocusMinutes: dayTotalFocusMinutes,
        pomodoroMinutes: dayPomodoroMinutes,
        customMinutes: dayCustomMinutes,
        tomatoHarvests: Math.floor(safePomodoroCount * 0.8)
      });
    }

    // 构建完整响应
    const response: DailySummaryResponse = {
      yesterdayStat: {
        date: yesterdayStr,
        pomodoroCount: pomodoroCount,
        customCount: customCount,
        totalFocusSessions: totalSessions,
        pomodoroMinutes: pomodoroMinutes,
        customMinutes: customMinutes,
        totalFocusMinutes: totalFocusMinutes,
        totalBreakMinutes: totalBreakMinutes,
        tomatoHarvests: tomatoHarvests,
        timeRanges: timeRanges
      },
      weekTrend: weekTrend
    };

    return response;
  }

  /**
   * 生成模拟的事件统计数据
   */
  static generateEventStats(startDate: string, endDate: string): EventStatsResponse {
    // 计算日期范围内的天数
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 生成总事件统计
    const totalEvents = Math.floor(Math.random() * 10) + 10; // 10-19个事件
    const completedEvents = Math.floor(totalEvents * (Math.random() * 0.4 + 0.3)); // 30%-70%完成率
    const completionRate = ((completedEvents / totalEvents) * 100).toFixed(1) + '%';

    // 生成每日趋势数据
    const trendData: DailyTrendData[] = [];
    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // 根据日期生成该日的专注分钟数
      const baseFocusMinutes = Math.floor(Math.random() * 120) + 60; // 基础专注时间60-180分钟
      const dayOfWeek = date.getDay(); // 0-6，周日是0

      // 工作日专注时间更多
      const focusMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.2;
      const totalFocusMinutes = Math.floor(baseFocusMinutes * focusMultiplier);

      trendData.push({
        date: dateStr,
        totalFocusMinutes: totalFocusMinutes
      });
    }

    // 按日期排序
    trendData.sort((a, b) => a.date.localeCompare(b.date));

    // 构建完整响应
    const response: EventStatsResponse = {
      totalEvents: totalEvents,
      completedEvents: completedEvents,
      completionRate: completionRate,
      trendData: trendData
    };

    return response;
  }

  /**
   * 生成模拟的番茄统计数据
   */
  static generatePomodoroStats(startDate: string, endDate: string): PomodoroStatsResponse {
    // 计算日期范围内的天数
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 生成总番茄数
    const totalPomodoros = Math.floor(Math.random() * 30) + 20; // 20-49个番茄钟

    // 生成趋势数据
    const trendData: DailyTrendData[] = [];
    let bestDay: StatResponse = {
      date: '',
      pomodoroCount: 0,
      customCount: 0,
      totalFocusSessions: 0,
      pomodoroMinutes: 0,
      customMinutes: 0,
      totalFocusMinutes: 0,
      totalBreakMinutes: 0,
      tomatoHarvests: 0,
      timeRanges: []
    };

    let maxPomodoroCount = 0;

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // 根据日期生成该日的番茄数量
      const dayOfWeek = date.getDay(); // 0-6，周日是0
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      // 工作日番茄数量更多
      const baseCount = isWeekend ?
        Math.floor(Math.random() * 4) + 1 : // 周末1-4个
        Math.floor(Math.random() * 7) + 3;  // 工作日3-9个

      const pomodoroCount = baseCount;
      const pomodoroMinutes = pomodoroCount * 25;
      const tomatoHarvests = Math.floor(pomodoroCount * 0.8);

      trendData.push({
        date: dateStr,
        pomodoroCount: pomodoroCount,
        pomodoroMinutes: pomodoroMinutes,
        tomatoHarvests: tomatoHarvests
      });

      // 找出最佳日
      if (pomodoroCount > maxPomodoroCount) {
        maxPomodoroCount = pomodoroCount;

        // 生成该日的时间范围
        const timeRanges: string[] = [];
        const workHours = isWeekend ? [10, 14, 16] : [9, 10, 11, 14, 15, 16, 17];

        for (let j = 0; j < pomodoroCount; j++) {
          const hourIndex = j % workHours.length;
          const hour = workHours[hourIndex];
          const minute = Math.floor(Math.random() * 30);
          timeRanges.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}~${hour.toString().padStart(2, '0')}:${(minute + 25).toString().padStart(2, '0')}`);
        }

        bestDay = {
          date: dateStr,
          pomodoroCount: pomodoroCount,
          customCount: Math.floor(Math.random() * 3), // 0-2个自定义专注
          totalFocusSessions: pomodoroCount + Math.floor(Math.random() * 3),
          pomodoroMinutes: pomodoroMinutes,
          customMinutes: Math.floor(Math.random() * 3) * 30,
          totalFocusMinutes: pomodoroMinutes + (Math.floor(Math.random() * 3) * 30),
          totalBreakMinutes: pomodoroCount * 5,
          tomatoHarvests: tomatoHarvests,
          timeRanges: timeRanges
        };
      }
    }

    // 生成时间分布数据
    const timeDistribution: TimeDistribution[] = [];
    // 高峰时段：上午9-11点，下午14-17点
    const peakHours = [9, 10, 11, 14, 15, 16, 17];

    for (let hour = 0; hour < 24; hour++) {
      const isPeakHour = peakHours.includes(hour);
      let count;

      if (isPeakHour) {
        count = Math.floor(Math.random() * 15) + 5; // 高峰时段5-19次
      } else if (hour >= 6 && hour <= 22) {
        count = Math.floor(Math.random() * 5) + 1; // 白天1-5次
      } else {
        count = hour === 23 || hour <= 2 ? Math.floor(Math.random() * 3) : 0; // 晚上可能有少量
      }

      if (count > 0) {
        timeDistribution.push({
          hour: hour,
          count: count
        });
      }
    }

    // 按小时排序
    timeDistribution.sort((a, b) => a.hour - b.hour);

    // 构建完整响应
    const response: PomodoroStatsResponse = {
      totalPomodoros: totalPomodoros,
      bestDay: bestDay,
      trendData: trendData,
      timeDistribution: timeDistribution
    };

    return response;
  }

  /**
   * 模拟后端API请求，使用测试数据
   */
  static mockBackendAPI() {
    // 重载原始服务方法，使用测试数据
    const originalGetDailySummary = dbService.getDailySummary.bind(dbService);
    const originalGetEventStats = dbService.getEventStats.bind(dbService);
    const originalGetPomodoroStats = dbService.getPomodoroStats.bind(dbService);

    // 替换方法
    dbService.getDailySummary = async () => {
      try {
        // 首先尝试调用原始方法
        const result = await originalGetDailySummary();

        // 如果数据为空或无效，使用测试数据
        if (!result || !result.yesterdayStat || !result.yesterdayStat.date || result.weekTrend.length === 0) {
          console.log('使用生成的昨日小结测试数据');
          return this.generateDailySummary();
        }

        return result;
      } catch (error) {
        console.warn('获取真实数据失败，使用测试数据:', error);
        return this.generateDailySummary();
      }
    };

    dbService.getEventStats = async (startDate: string, endDate: string) => {
      try {
        // 首先尝试调用原始方法
        const result = await originalGetEventStats(startDate, endDate);

        // 如果数据为空或无效，使用测试数据
        if (!result || result.totalEvents === 0 || result.trendData.length === 0) {
          console.log('使用生成的事件统计测试数据');
          return this.generateEventStats(startDate, endDate);
        }

        return result;
      } catch (error) {
        console.warn('获取真实数据失败，使用测试数据:', error);
        return this.generateEventStats(startDate, endDate);
      }
    };

    dbService.getPomodoroStats = async (startDate: string, endDate: string) => {
      try {
        // 首先尝试调用原始方法
        const result = await originalGetPomodoroStats(startDate, endDate);

        // 如果数据为空或无效，使用测试数据
        if (!result || result.totalPomodoros === 0 || result.trendData.length === 0 || !result.bestDay.date) {
          console.log('使用生成的番茄统计测试数据');
          return this.generatePomodoroStats(startDate, endDate);
        }

        return result;
      } catch (error) {
        console.warn('获取真实数据失败，使用测试数据:', error);
        return this.generatePomodoroStats(startDate, endDate);
      }
    };

    console.log('已启用测试数据生成器，当后端数据不可用时将使用模拟数据');
  }
}

export default TestDataGenerator;
