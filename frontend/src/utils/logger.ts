/**
 * 日志工具 - 在开发环境中显示日志，在生产环境中禁用
 */

// 判断当前是否为生产环境
const isProduction = import.meta.env.PROD;

// 日志级别定义
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 为不同级别设置不同的样式
const logStyles: Record<LogLevel, string> = {
  debug: 'color: #7f8c8d;',
  info: 'color: #2980b9;',
  warn: 'color: #f39c12; font-weight: bold;',
  error: 'color: #c0392b; font-weight: bold;'
};

/**
 * 创建日志前缀，包含时间和组件名
 * @param component 组件名称
 * @returns 格式化的日志前缀
 */
const createPrefix = (component: string): string => {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  return `[${time}] [${component}]`;
};

/**
 * 日志函数构造器
 * @param level 日志级别
 * @returns 日志函数
 */
const createLogger = (level: LogLevel) =>
  (component: string, message: string, ...args: any[]): void => {
    // 在生产环境中禁用除错误以外的日志
    if (isProduction && level !== 'error') return;

    const prefix = createPrefix(component);
    const style = logStyles[level];

    if (args.length > 0) {
      console[level](`%c${prefix} ${message}`, style, ...args);
    } else {
      console[level](`%c${prefix} ${message}`, style);
    }
  };

// 导出不同级别的日志函数
export const logger = {
  debug: createLogger('debug'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),

  // 用于记录数据加载
  data: (component: string, message: string, data?: any): void => {
    if (isProduction) return;
    const prefix = createPrefix(component);
    if (data) {
      console.log(`%c${prefix} ${message}`, 'color: #27ae60;', data);
    } else {
      console.log(`%c${prefix} ${message}`, 'color: #27ae60;');
    }
  },

  // 用于记录图表初始化和更新
  chart: (component: string, message: string, ...args: any[]): void => {
    if (isProduction) return;
    const prefix = createPrefix(component);
    if (args.length > 0) {
      console.log(`%c${prefix} [图表] ${message}`, 'color: #8e44ad;', ...args);
    } else {
      console.log(`%c${prefix} [图表] ${message}`, 'color: #8e44ad;');
    }
  }
};
