// 音效服务 - 专门处理简短的提示音效
// 音频文件路径
const BUTTON_CLICK_SOUND = '/sounds/button-click.wav';
const TIMER_END_SOUND = '/sounds/timer-end.wav';

class SoundEffectService {
  private static instance: SoundEffectService | null = null;
  
  private constructor() {
    console.log('音效服务已初始化，音效资源路径：', {
      buttonClick: BUTTON_CLICK_SOUND,
      timerEnd: TIMER_END_SOUND
    });
  }
  
  public static getInstance(): SoundEffectService {
    if (!SoundEffectService.instance) {
      SoundEffectService.instance = new SoundEffectService();
    }
    return SoundEffectService.instance;
  }
  
  /**
   * 播放按钮点击音效
   */
  public playButtonClickSound(): void {
    try {
      // 每次播放时创建新的音频实例，避免浏览器缓存问题
      const audio = new Audio(BUTTON_CLICK_SOUND);
      
      // 添加音频加载成功事件
      audio.oncanplaythrough = () => {
        console.log('按钮音效加载完成，准备播放');
      };
      
      // 添加音频播放结束事件，释放资源
      audio.onended = () => {
        console.log('按钮音效播放完成');
      };
      
      // 添加错误处理
      audio.onerror = (err) => {
        console.error('按钮音效加载失败:', err);
        console.error('加载失败的音频路径:', BUTTON_CLICK_SOUND);
      };
      
      // 预加载音频
      audio.load();
      
      // 播放音频并处理可能的错误
      setTimeout(() => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('播放按钮点击音效失败:', err);
            // 尝试使用AudioContext API作为备选方案
            this.playFallbackSound(200, 50);
          });
        }
      }, 50); // 短暂延迟，确保加载
    } catch (e) {
      console.error('播放按钮点击音效出现异常:', e);
      // 出错时使用备选方案
      this.playFallbackSound(200, 50);
    }
  }
  
  /**
   * 播放计时结束音效
   */
  public playTimerEndSound(): void {
    try {
      // 每次播放时创建新的音频实例
      const audio = new Audio(TIMER_END_SOUND);
      
      // 添加音频加载成功事件
      audio.oncanplaythrough = () => {
        console.log('计时结束音效加载完成，准备播放');
      };
      
      // 添加音频播放结束事件，释放资源
      audio.onended = () => {
        console.log('计时结束音效播放完成');
      };
      
      // 添加错误处理
      audio.onerror = (err) => {
        console.error('计时结束音效加载失败:', err);
        console.error('加载失败的音频路径:', TIMER_END_SOUND);
      };
      
      // 预加载音频
      audio.load();
      
      // 播放音频并处理可能的错误
      setTimeout(() => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('播放计时结束音效失败:', err);
            // 使用备选音效方案
            this.playFallbackSound(440, 300);
          });
        }
      }, 50); // 短暂延迟，确保加载
    } catch (e) {
      console.error('播放计时结束音效出现异常:', e);
      // 出错时使用备选方案
      this.playFallbackSound(440, 300);
    }
  }
  
  /**
   * 使用Web Audio API播放简单音调作为备选方案
   * @param frequency 音调频率
   * @param duration 持续时间（毫秒）
   */
  private playFallbackSound(frequency: number = 440, duration: number = 200): void {
    try {
      // 创建音频上下文
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建振荡器
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // 连接节点
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 配置振荡器
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = 0.1;
      
      // 播放音调
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, duration);
      
      console.log(`使用备选方案播放音效，频率: ${frequency}Hz, 持续时间: ${duration}ms`);
    } catch (err) {
      console.error('备选音效播放失败:', err);
    }
  }
}

// 导出单例实例
export const soundEffectService = SoundEffectService.getInstance();