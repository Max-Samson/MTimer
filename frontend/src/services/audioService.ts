import { ref } from 'vue'
import { useSettingsStore } from '../stores'

// 单例模式实现音频服务
class AudioService {
  private static instance: AudioService | null = null
  private audioPlayer: HTMLAudioElement | null = null
  private _settingsStore: ReturnType<typeof useSettingsStore> | null = null
  private _isInitialized: boolean = false
  private _storeInitialized: boolean = false
  private _pendingOperations: Array<() => void> = []
  // 音频缓存，用于存储预加载的音频元素
  private _audioCache: Map<string, HTMLAudioElement> = new Map()
  // 当前正在加载的音频路径
  private _currentLoadingPath: string | null = null
  // 避免同时触发过多音频加载请求
  private _isLoadingAudio: boolean = false
  // 加载锁定超时ID
  private _loadLockTimeoutId: number | null = null
  
  // 获取settingsStore，确保在使用时才初始化
  private get settingsStore() {
    if (!this._storeInitialized) {
      return null
    }
    
    if (!this._settingsStore) {
      try {
        this._settingsStore = useSettingsStore()
      } catch (error) {
        console.warn('无法获取settingsStore，可能是Pinia尚未初始化:', error)
        return null
      }
    }
    return this._settingsStore
  }
  
  // 当前播放状态 - 使用ref创建响应式变量
  public currentTime = ref<number>(0)
  public duration = ref<number>(0)
  public progress = ref<number>(0)
  
  private constructor() {
    // 私有构造函数，防止外部直接实例化
    // 只初始化音频播放器，不访问store
    this.initAudioPlayer()
  }
  
  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService()
    }
    return AudioService.instance
  }
  
  // 在应用程序初始化后调用此方法，确保Pinia store已经准备好
  public initializeStore(): void {
    // 标记store已初始化
    this._storeInitialized = true
    
    if (!this._isInitialized) {
      this.initAudioPlayer()
      return
    }
    
    // 尝试初始化store相关操作
    this.initStoreRelatedOperations()
    
    // 执行所有挂起的操作
    this.executePendingOperations()
  }
  
  // 添加挂起操作，在store初始化后执行
  private addPendingOperation(operation: () => void): void {
    if (this._storeInitialized) {
      // 如果store已初始化，立即执行
      operation()
    } else {
      // 否则添加到挂起操作列表
      this._pendingOperations.push(operation)
    }
  }
  
  // 执行所有挂起的操作
  private executePendingOperations(): void {
    while (this._pendingOperations.length > 0) {
      const operation = this._pendingOperations.shift()
      if (operation) {
        operation()
      }
    }
  }
  
  // 通用的音频错误处理方法
  private handleAudioError(error: Event | Error, source: string = 'unknown'): void {
    // 如果是suspend事件，这通常是正常的加载行为，不作为错误处理
    if (source === 'suspend-event') {
      // 只记录日志，不作为错误处理
      console.info('音频加载被挂起(正常行为)，不作为错误处理')
      return
    }
    
    // 获取当前音频路径
    const currentSrc = this.audioPlayer?.src || '未知'
    console.error(`音频错误(来源:${source}):`, error)
    console.error('错误的音频文件路径:', currentSrc)
    
    // 提取文件类型信息
    const fileExtension = currentSrc.split('.').pop()?.toLowerCase() || '未知'
    console.error('文件类型:', fileExtension)
    
    // 检查是否为特殊音频文件
    const audioTypeInfo = this.getAudioTypeInfo(currentSrc)
    if (audioTypeInfo.isSpecialType) {
      console.error(`特殊音频文件 ${audioTypeInfo.typeName} 出现问题`)
    }
    
    // 检查是否是Wails开发模式下的路径问题
    const isPathProblem = !currentSrc.includes('http://localhost') && 
                          (error instanceof Event && this.audioPlayer?.error?.code === 4) || 
                          (error instanceof Error && (error.name === 'NotFoundError' || error.message.includes('not found')))
    
    if (isPathProblem) {
      console.warn('可能是Wails开发模式下的路径问题，尝试使用替代URL...')
      try {
        if (this.audioPlayer) {
          // 构建替代URL
          const originalPath = currentSrc.split('/').pop() // 提取文件名
          const alternativePath = `http://localhost:5173/sounds/${originalPath}`
          console.log('尝试使用替代URL:', alternativePath)
          
          // 更新音频源并尝试重新播放
          this.audioPlayer.src = alternativePath
          setTimeout(() => this.play(), 500)
          return // 已经处理，不需要继续
        }
      } catch (pathError) {
        console.error('处理路径问题时出错:', pathError)
      }
    }
    
    // 详细记录错误信息
    let errorCode = 0
    let errorMessage = ''
    let shouldTryNext = false
    
    if (error instanceof Event && this.audioPlayer?.error) {
      // 处理媒体错误事件
      errorCode = this.audioPlayer.error.code
      errorMessage = this.audioPlayer.error.message || '无错误信息'
      
      console.error('音频错误代码:', errorCode)
      console.error('音频错误信息:', errorMessage)
      
      // 根据错误代码提供更具体的错误信息
      switch(errorCode) {
        case 1: // MEDIA_ERR_ABORTED
          console.error('用户中止了获取媒体过程')
          shouldTryNext = false // 用户主动中止，不需要自动切换
          break
        case 2: // MEDIA_ERR_NETWORK
          console.error('在下载过程中出现了网络错误')
          shouldTryNext = true // 网络错误，尝试下一首
          break
        case 3: // MEDIA_ERR_DECODE
          console.error('解码失败，可能是音频格式不受支持')
          shouldTryNext = true // 解码错误，尝试下一首
          break
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          console.error('音频文件未找到或格式不受支持')
          shouldTryNext = true // 文件未找到，尝试下一首
          break
        default:
          console.error('未知错误')
          shouldTryNext = true // 未知错误，尝试下一首
      }
    } else if (error instanceof Error) {
      // 处理JavaScript错误对象
      errorMessage = error.message
      console.error('JavaScript错误:', errorMessage)
      console.error('错误堆栈:', error.stack)
      
      // 根据错误类型决定是否尝试下一首
      if (error.name === 'NotSupportedError' || 
          error.name === 'NotAllowedError' || 
          (error.name === 'AbortError' && !errorMessage.includes('interrupted')) || 
          errorMessage.includes('format') || 
          errorMessage.includes('codec')) {
        shouldTryNext = true
      } else if (error.name === 'AbortError' && errorMessage.includes('interrupted')) {
        // 这是因为加载新音频导致的中断，不应该尝试下一首
        console.info('播放请求被新的加载请求中断，这是正常行为，不尝试切换下一首')
        shouldTryNext = false
      }
    }
    
    // 如果需要尝试播放下一首
    if (shouldTryNext) {
      console.warn('尝试自动切换到下一首曲目')
      // 使用延迟确保不会过于频繁地切换曲目
      setTimeout(() => {
        if (this.audioPlayer) {
          this.addPendingOperation(() => this.playNext())
        }
      }, 1000)
    }
    
    // 记录到控制台，方便调试
    console.info('音频错误处理完成，是否尝试下一首:', shouldTryNext)
  }
  
  // 获取音频类型信息
  private getAudioTypeInfo(src: string): {isSpecialType: boolean, typeName: string} {
    const typePatterns = [
      { pattern: /(piano-loops|钢琴循环)/i, name: '钢琴循环' },
      { pattern: /(birds|鸟鸣)/i, name: '鸟鸣环境' },
      { pattern: /(river|河流)/i, name: '河流环境' },
      { pattern: /(ocean|海洋)/i, name: '海洋环境' },
      { pattern: /(chill|轻松)/i, name: '轻松背景' }
    ]
    
    for (const type of typePatterns) {
      if (type.pattern.test(src)) {
        return { isSpecialType: true, typeName: type.name }
      }
    }
    
    return { isSpecialType: false, typeName: '普通音频' }
  }
  
  // 检查音频格式兼容性
  private checkAudioCompatibility(src: string): boolean {
    if (!this.audioPlayer) return false
    
    // 提取文件扩展名
    const fileExtension = src.split('.').pop()?.toLowerCase() || ''
    
    // 检查浏览器是否支持该格式
    const audioElement = document.createElement('audio')
    let canPlay = false
    
    switch(fileExtension) {
      case 'mp3':
        canPlay = audioElement.canPlayType('audio/mpeg') !== ''
        break
      case 'wav':
        canPlay = audioElement.canPlayType('audio/wav') !== ''
        break
      case 'ogg':
        canPlay = audioElement.canPlayType('audio/ogg') !== ''
        break
      case 'aac':
        canPlay = audioElement.canPlayType('audio/aac') !== ''
        break
      case 'm4a':
        canPlay = audioElement.canPlayType('audio/mp4') !== ''
        break
      default:
        // 尝试通用检测
        canPlay = audioElement.canPlayType(`audio/${fileExtension}`) !== ''
    }
    
    if (!canPlay) {
      console.warn(`浏览器可能不支持 ${fileExtension} 格式的音频文件`)
    }
    
    return canPlay
  }
  
  private initAudioPlayer(): void {
    // 创建音频播放器
    this.audioPlayer = new Audio()
    
    // 初始化响应式变量
    this.currentTime.value = 0
    this.duration.value = 0
    this.progress.value = 0
    
    // 添加事件监听
    if (this.audioPlayer) {
      this.audioPlayer.addEventListener('timeupdate', this.updateProgress.bind(this))
      this.audioPlayer.addEventListener('ended', this.playNext.bind(this))
      this.audioPlayer.addEventListener('loadedmetadata', () => {
        if (this.audioPlayer) {
          this.duration.value = this.audioPlayer.duration
        }
      })
      
      // 添加错误处理
      this.audioPlayer.addEventListener('error', (e) => {
        this.handleAudioError(e, 'error-event')
      })
      
      // 添加音频加载失败处理
      this.audioPlayer.addEventListener('stalled', (e) => {
        console.warn('音频加载停滞:', e)
        this.handleAudioError(e, 'stalled-event')
      })
      
      // 添加音频中断处理
      this.audioPlayer.addEventListener('suspend', (e) => {
        // suspend事件通常是正常的加载行为，只在特定条件下才视为错误
        // 只记录日志，不作为错误处理
        console.info('音频加载被挂起(正常行为):', e)
        
        // 检查是否真的出现了问题（例如长时间没有进展）
        // 这里不再直接调用handleAudioError
      })
    }
    
    // 标记为已初始化
    this._isInitialized = true
    
    // 如果store已初始化，尝试初始化store相关操作
    if (this._storeInitialized) {
      this.initStoreRelatedOperations()
    }
  }
  
  // 初始化与store相关的操作，确保只在store可用时执行
  private initStoreRelatedOperations(): void {
    const store = this.settingsStore
    if (!store) {
      // 如果store不可用，将此操作添加到挂起列表
      this.addPendingOperation(() => this.initStoreRelatedOperations())
      return
    }
    
    // 设置音量
    if (this.audioPlayer) {
      this.audioPlayer.volume = store.soundSettings.bgMusic.volume
    }
    
    // 确保音乐播放列表已加载
    store.loadBgMusicPlaylist()
    
    // 加载当前曲目
    this.loadCurrentTrack()
  }
  
  // 更新播放进度
  private updateProgress(): void {
    if (!this.audioPlayer) return
    
    this.currentTime.value = this.audioPlayer.currentTime
    this.duration.value = this.audioPlayer.duration || 0
    this.progress.value = (this.currentTime.value / this.duration.value) * 100 || 0
    
    const store = this.settingsStore
    if (!store) return
    
    // 每5秒保存一次播放进度
    if (Math.floor(this.currentTime.value) % 5 === 0 && this.currentTime.value > 0) {
      try {
        store.updateSoundSettings({
          bgMusic: {
            ...store.soundSettings.bgMusic,
            currentTime: this.currentTime.value
          }
        })
      } catch (error) {
        console.warn('保存播放进度失败:', error)
      }
    }
  }
  
  // 添加音频到缓存
  private addToCache(path: string, audio: HTMLAudioElement): void {
    // 限制缓存大小，避免内存泄漏
    if (this._audioCache.size > 10) {
      // 如果缓存过大，移除最早添加的项
      const firstKey = this._audioCache.keys().next().value
      if (firstKey) {
        this._audioCache.delete(firstKey)
      }
    }
    this._audioCache.set(path, audio)
  }

  // 从缓存获取音频
  private getFromCache(path: string): HTMLAudioElement | null {
    return this._audioCache.get(path) || null
  }

  // 获取标准化路径
  private getStandardPath(path: string): string {
    // 确保路径正确（处理开发模式和生产模式的路径差异）
    if (!path.startsWith('http') && !path.startsWith('/')) {
      path = '/' + path
    }
    return path
  }

  // 获取开发服务器路径
  private getDevServerPath(path: string): string {
    if (!path) {
      return 'http://localhost:5173/sounds/default.wav'; // 返回默认值，避免空路径
    }
    
    // 如果不是http开头的完整URL，构建开发服务器URL
    if (!path.includes('http://localhost')) {
      // 移除前导/
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `http://localhost:5173/${cleanPath}`;
    }
    return path;
  }

  // 预加载音频，返回Promise
  private preloadAudio(path: string): Promise<HTMLAudioElement> {
    if (!path) {
      console.error('预加载音频传入了空路径')
      return Promise.reject(new Error('预加载音频传入了空路径'))
    }
    
    // 标准化路径
    const standardPath = this.getStandardPath(path)
    
    // 检查缓存
    const cachedAudio = this.getFromCache(standardPath)
    if (cachedAudio) {
      console.log(`使用缓存的音频: ${standardPath}`)
      return Promise.resolve(cachedAudio)
    }
    
    return new Promise((resolve, reject) => {
      // 创建新的音频元素
      const audio = new Audio()
      audio.preload = 'auto'
      
      // 设置加载成功回调
      audio.onloadeddata = () => {
        console.log(`音频预加载成功: ${standardPath}`)
        // 添加到缓存
        this.addToCache(standardPath, audio)
        resolve(audio)
      }
      
      // 设置错误回调
      audio.onerror = (error) => {
        console.warn(`音频预加载失败: ${standardPath}，尝试开发服务器路径`)
        
        // 尝试开发服务器路径
        const devServerPath = this.getDevServerPath(standardPath)
        
        // 重置错误处理，避免重复触发
        audio.onerror = null
        
        // 尝试使用开发服务器路径
        audio.src = devServerPath
        
        // 添加一次性加载成功事件
        const successHandler = () => {
          console.log(`使用开发服务器路径加载成功: ${devServerPath}`)
          this.addToCache(standardPath, audio) // 使用原始路径作为键
          resolve(audio)
          audio.removeEventListener('loadeddata', successHandler)
        }
        
        // 添加一次性错误事件
        const errorHandler = () => {
          console.error(`开发服务器路径也加载失败: ${devServerPath}`)
          reject(new Error(`无法加载音频: ${path}`))
          audio.removeEventListener('error', errorHandler)
        }
        
        audio.addEventListener('loadeddata', successHandler)
        audio.addEventListener('error', errorHandler)
      }
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        if (!audio.readyState) {
          console.warn(`音频加载超时: ${standardPath}`)
          reject(new Error(`加载超时: ${path}`))
        }
      }, 15000) // 15秒超时
      
      // 成功或失败时清除超时
      const originalOnloadeddata = audio.onloadeddata
      audio.onloadeddata = (event) => {
        clearTimeout(timeoutId)
        console.log(`音频预加载成功: ${standardPath}`)
        this.addToCache(standardPath, audio)
        if (originalOnloadeddata) originalOnloadeddata.call(audio, event)
        resolve(audio)
      }
      
      // 捕获可能的异常
      try {
        // 开始加载
        audio.src = standardPath
        audio.load()
      } catch (error) {
        console.error(`加载音频时发生异常: ${standardPath}`, error)
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }
  
  // 加载当前曲目
  public loadCurrentTrack(): void {
    const store = this.settingsStore
    if (!store || !this.audioPlayer) {
      // 如果store不可用，将此操作添加到挂起列表
      this.addPendingOperation(() => this.loadCurrentTrack())
      return
    }
    
    const { soundSettings } = store
    
    // 每次加载当前曲目时都重新加载播放列表，确保新增的音乐文件能被加载
    store.loadBgMusicPlaylist()
    
    if (soundSettings.bgMusic.currentTrack) {
      try {
        // 防止重复加载或频繁切换导致的问题
        if (this._isLoadingAudio) {
          console.log('已有音频正在加载，延迟处理')
          
          // 清除之前的锁定超时
          if (this._loadLockTimeoutId !== null) {
            clearTimeout(this._loadLockTimeoutId)
          }
          
          // 设置新的超时，确保加载锁定不会永久卡住
          this._loadLockTimeoutId = setTimeout(() => {
            console.log('加载锁定超时，重置状态')
            this._isLoadingAudio = false
            this._currentLoadingPath = null
            this._loadLockTimeoutId = null
          }, 5000) as unknown as number
          
          return
        }
        
        // 获取当前要播放的音频路径
        let trackPath = soundSettings.bgMusic.currentTrack
        
        // 标准化路径
        trackPath = this.getStandardPath(trackPath)
        
        // 检查是否正在加载相同的音频文件，避免重复加载
        if (this._currentLoadingPath === trackPath) {
          console.log('已经在加载相同的音频文件，跳过重复请求')
          return
        }
        
        // 检查是否已经加载了相同的音频文件
        if (this.audioPlayer.src && (this.audioPlayer.src === trackPath || this.audioPlayer.src.endsWith(trackPath))) {
          console.log('已经加载了相同的音频文件，跳过重复加载')
          return
        }
        
        // 记录当前尝试加载的音频文件
        console.log('尝试加载音频文件:', trackPath)
        
        // 获取音频类型信息
        const audioTypeInfo = this.getAudioTypeInfo(trackPath)
        if (audioTypeInfo.isSpecialType) {
          console.log(`正在加载特殊音频: ${audioTypeInfo.typeName}`)
        }
        
        // 更新加载状态
        this._isLoadingAudio = true
        this._currentLoadingPath = trackPath
        
        // 在加载新音频前，先暂停当前播放并清除事件
        if (this.audioPlayer.src) {
          // 暂停当前播放，避免播放请求被中断错误
          this.audioPlayer.pause()
        }
        
        // 使用Promise进行预加载
        this.preloadAudio(trackPath)
          .then(preloadedAudio => {
            // 等待小段时间再应用，避免频繁切换
            setTimeout(() => {
              if (this.audioPlayer) {
                // 将预加载音频的属性复制到主播放器
                this.audioPlayer.src = preloadedAudio.src
                
                // 设置预加载模式
                this.audioPlayer.preload = 'auto'
                
                // 恢复播放进度
                if (soundSettings.bgMusic.currentTime > 0) {
                  this.audioPlayer.currentTime = soundSettings.bgMusic.currentTime
                }
                
                // 如果设置为播放状态，尝试播放
                if (soundSettings.bgMusic.isPlaying) {
                  setTimeout(() => this.play(), 300)
                }
                
                // 更新加载状态
                this._isLoadingAudio = false
                this._currentLoadingPath = null
                
                // 清除锁定超时
                if (this._loadLockTimeoutId !== null) {
                  clearTimeout(this._loadLockTimeoutId)
                  this._loadLockTimeoutId = null
                }
              }
            }, 200)
          })
          .catch(error => {
            console.error('预加载音频失败:', error)
            
            // 更新加载状态
            this._isLoadingAudio = false
            this._currentLoadingPath = null
            
            // 清除锁定超时
            if (this._loadLockTimeoutId !== null) {
              clearTimeout(this._loadLockTimeoutId)
              this._loadLockTimeoutId = null
            }
            
            // 使用错误处理
            this.handleAudioError(error, 'preload-error')
          })
      } catch (error) {
        // 捕获任何可能的JavaScript错误
        console.error('加载音频时发生异常:', error)
        
        // 更新加载状态
        this._isLoadingAudio = false
        this._currentLoadingPath = null
        
        // 清除锁定超时
        if (this._loadLockTimeoutId !== null) {
          clearTimeout(this._loadLockTimeoutId)
          this._loadLockTimeoutId = null
        }
        
        this.handleAudioError(error instanceof Error ? error : new Error(String(error)), 'load-exception')
      }
    } else if (soundSettings.bgMusic.playlist.length > 0 && !soundSettings.bgMusic.currentTrack) {
      // 如果播放列表不为空但当前曲目为空，设置第一首为当前曲目
      store.setCurrentBgMusic(soundSettings.bgMusic.playlist[0].value)
    }
  }
  
  // 播放/暂停
  public togglePlay(): void {
    const store = this.settingsStore
    if (!store) {
      // 如果store不可用，将此操作添加到挂起列表
      this.addPendingOperation(() => this.togglePlay())
      return
    }
    
    store.toggleBgMusic()
    
    if (store.soundSettings.bgMusic.isPlaying) {
      this.play()
    } else {
      this.pause()
    }
  }
  
  // 播放
  public play(): void {
    if (!this.audioPlayer) return
    
    // 如果当前没有加载曲目，先加载当前曲目
    if (!this.audioPlayer.src || this.audioPlayer.src === '') {
      this.loadCurrentTrack()
      return // 让loadCurrentTrack处理播放
    }
    
    try {
      // 获取当前音频路径
      const currentSrc = this.audioPlayer.src
      console.log('尝试播放音频:', currentSrc)
      
      // 获取音频类型信息
      const audioTypeInfo = this.getAudioTypeInfo(currentSrc)
      if (audioTypeInfo.isSpecialType) {
        console.log(`正在播放特殊音频: ${audioTypeInfo.typeName}`)
      }
      
      // 检查音频是否已经处于错误状态
      if (this.audioPlayer.error) {
        console.warn('音频播放器处于错误状态，尝试重新加载曲目')
        this.loadCurrentTrack()
        return
      }
      
      // 检查音频是否已准备好播放
      if (this.audioPlayer.readyState < 2) { // HAVE_CURRENT_DATA = 2
        console.info('音频尚未准备好，等待加载...')
        
        // 保存当前src，用于后续比较
        const srcWhenAdded = this.audioPlayer.src
        
        // 添加一次性事件监听器，在音频可以播放时开始播放
        const playWhenReady = () => {
          // 检查音频元素是否仍然存在且src未改变
          if (this.audioPlayer && !this.audioPlayer.error && this.audioPlayer.src === srcWhenAdded) {
            this.audioPlayer.play().catch(error => {
              // 检查是否是因为src改变导致的中断错误
              if (error.name === 'AbortError' && 
                  error.message.includes('interrupted')) {
                // 这是因为src改变导致的中断，不视为错误，只记录日志
                console.info('播放请求被新的加载请求中断，这是正常行为')
              } else {
                // 其他错误正常处理
                this.handleAudioError(error, 'play-when-ready-catch')
              }
            })
          } else if (this.audioPlayer && this.audioPlayer.src !== srcWhenAdded) {
            // src已改变，不需要播放旧的音频
            console.info('音频源已改变，不播放旧的音频')
          }
          
          // 无论如何都移除事件监听器，防止重复触发
          this.audioPlayer?.removeEventListener('canplay', playWhenReady)
        }
        
        this.audioPlayer?.addEventListener('canplay', playWhenReady)
        
        // 添加超时处理，如果长时间无法加载，尝试下一首
        const timeoutId = setTimeout(() => {
          if (this.audioPlayer && this.audioPlayer.readyState < 2 && this.audioPlayer.src === srcWhenAdded) {
            console.warn('音频加载超时，尝试下一首')
            this.audioPlayer?.removeEventListener('canplay', playWhenReady)
            if (this.audioPlayer) {
              this.handleAudioError(new Error('音频加载超时'), 'play-timeout')
            }
          }
        }, 8000) // 8秒超时
        
        // 如果src改变，清除超时
        const clearTimeoutOnSrcChange = () => {
          if (this.audioPlayer && this.audioPlayer.src !== srcWhenAdded) {
            clearTimeout(timeoutId)
            this.audioPlayer.removeEventListener('loadstart', clearTimeoutOnSrcChange)
          }
        }
        
        this.audioPlayer?.addEventListener('loadstart', clearTimeoutOnSrcChange)
        
        return
      }
      
      // 尝试播放
      this.audioPlayer?.play().catch(error => {
        // 检查是否是因为src改变导致的中断错误
        if (error.name === 'AbortError' && error.message.includes('interrupted')) {
          console.info('播放请求被新的加载请求中断，这是正常行为')
        } else {
          this.handleAudioError(error, 'play-method-catch')
        }
      })
    } catch (error) {
      // 捕获任何可能的JavaScript错误
      console.error('播放音频时发生异常:', error)
      this.handleAudioError(error instanceof Error ? error : new Error(String(error)), 'play-exception')
    }
  }
  
  // 暂停
  public pause(): void {
    if (this.audioPlayer) {
      this.audioPlayer.pause()
    }
  }
  
  // 播放下一首
  public playNext(): void {
    const store = this.settingsStore
    if (!store) {
      // 如果store不可用，将此操作添加到挂起列表
      this.addPendingOperation(() => this.playNext())
      return
    }
    
    const { soundSettings } = store
    const playlist = soundSettings.bgMusic.playlist
    
    if (playlist.length <= 1) return
    
    // 如果正在加载音频，延迟处理
    if (this._isLoadingAudio) {
      console.log('正在加载音频，延迟处理播放下一首的请求')
      setTimeout(() => this.playNext(), 1000)
      return
    }
    
    // 先暂停当前播放，避免播放请求被中断错误
    if (this.audioPlayer) {
      this.audioPlayer.pause()
    }
    
    const currentIndex = playlist.findIndex(item => item.value === soundSettings.bgMusic.currentTrack)
    const nextIndex = (currentIndex + 1) % playlist.length
    
    // 记录当前和下一首曲目，用于日志
    const currentTrack = soundSettings.bgMusic.currentTrack
    const nextTrack = playlist[nextIndex].value
    console.log(`切换曲目: 从 ${currentTrack} 到 ${nextTrack}`)
    
    // 保存当前播放状态，切换曲目后保持该状态
    const wasPlaying = soundSettings.bgMusic.isPlaying
    
    // 尝试预加载下一首
    try {
      this.preloadAudio(this.getStandardPath(nextTrack))
        .then(() => {
          console.log('下一首曲目预加载成功，现在切换')
          
          // 设置新的当前曲目
          store.setCurrentBgMusic(playlist[nextIndex].value)
          
          // 等待短暂延迟后加载
          setTimeout(() => {
            // 加载新曲目
            this.loadCurrentTrack()
            
            // 如果之前是暂停状态，确保切换后也是暂停状态
            if (!wasPlaying && this.audioPlayer) {
              setTimeout(() => {
                this.audioPlayer?.pause()
                store.pauseBgMusic()
              }, 300)
            }
          }, 200)
        })
        .catch(error => {
          console.error('预加载下一首失败，直接切换:', error)
          
          // 设置新的当前曲目
          store.setCurrentBgMusic(playlist[nextIndex].value)
          
          // 加载新曲目
          this.loadCurrentTrack()
          
          // 如果之前是暂停状态，确保切换后也是暂停状态
          if (!wasPlaying && this.audioPlayer) {
            setTimeout(() => {
              this.audioPlayer?.pause()
              store.pauseBgMusic()
            }, 300)
          }
        })
    } catch (error) {
      console.error('尝试预加载时发生错误，直接切换:', error)
      
      // 设置新的当前曲目
      store.setCurrentBgMusic(playlist[nextIndex].value)
      
      // 加载新曲目
      this.loadCurrentTrack()
      
      // 如果之前是暂停状态，确保切换后也是暂停状态
      if (!wasPlaying && this.audioPlayer) {
        setTimeout(() => {
          this.audioPlayer?.pause()
          store.pauseBgMusic()
        }, 300)
      }
    }
  }
  
  // 播放上一首
  public playPrevious(): void {
    const store = this.settingsStore
    if (!store) {
      // 如果store不可用，将此操作添加到挂起列表
      this.addPendingOperation(() => this.playPrevious())
      return
    }
    
    const { soundSettings } = store
    const playlist = soundSettings.bgMusic.playlist
    
    if (playlist.length <= 1) return
    
    // 如果正在加载音频，延迟处理
    if (this._isLoadingAudio) {
      console.log('正在加载音频，延迟处理播放上一首的请求')
      setTimeout(() => this.playPrevious(), 1000)
      return
    }
    
    // 先暂停当前播放，避免播放请求被中断错误
    if (this.audioPlayer) {
      this.audioPlayer.pause()
    }
    
    const currentIndex = playlist.findIndex(item => item.value === soundSettings.bgMusic.currentTrack)
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length
    
    // 记录当前和上一首曲目，用于日志
    const currentTrack = soundSettings.bgMusic.currentTrack
    const prevTrack = playlist[prevIndex].value
    console.log(`切换曲目: 从 ${currentTrack} 到 ${prevTrack}`)
    
    // 保存当前播放状态，切换曲目后保持该状态
    const wasPlaying = soundSettings.bgMusic.isPlaying
    
    // 尝试预加载上一首
    try {
      this.preloadAudio(this.getStandardPath(prevTrack))
        .then(() => {
          console.log('上一首曲目预加载成功，现在切换')
          
          // 设置新的当前曲目
          store.setCurrentBgMusic(playlist[prevIndex].value)
          
          // 等待短暂延迟后加载
          setTimeout(() => {
            // 加载新曲目
            this.loadCurrentTrack()
            
            // 如果之前是暂停状态，确保切换后也是暂停状态
            if (!wasPlaying && this.audioPlayer) {
              setTimeout(() => {
                this.audioPlayer?.pause()
                store.pauseBgMusic()
              }, 300)
            }
          }, 200)
        })
        .catch(error => {
          console.error('预加载上一首失败，直接切换:', error)
          
          // 设置新的当前曲目
          store.setCurrentBgMusic(playlist[prevIndex].value)
          
          // 加载新曲目
          this.loadCurrentTrack()
          
          // 如果之前是暂停状态，确保切换后也是暂停状态
          if (!wasPlaying && this.audioPlayer) {
            setTimeout(() => {
              this.audioPlayer?.pause()
              store.pauseBgMusic()
            }, 300)
          }
        })
    } catch (error) {
      console.error('尝试预加载时发生错误，直接切换:', error)
      
      // 设置新的当前曲目
      store.setCurrentBgMusic(playlist[prevIndex].value)
      
      // 加载新曲目
      this.loadCurrentTrack()
      
      // 如果之前是暂停状态，确保切换后也是暂停状态
      if (!wasPlaying && this.audioPlayer) {
        setTimeout(() => {
          this.audioPlayer?.pause()
          store.pauseBgMusic()
        }, 300)
      }
    }
  }
  
  // 设置进度
  public setProgress(value: number): void {
    if (this.audioPlayer) {
      const newTime = (value / 100) * this.duration.value
      this.audioPlayer.currentTime = newTime
      this.currentTime.value = newTime
    }
  }
  
  // 设置音量
  public setVolume(volume: number): void {
    if (this.audioPlayer) {
      this.audioPlayer.volume = volume
    }
  }
  
  // 获取当前播放曲目名称
  public getCurrentTrackName(): string {
    try {
      const store = this.settingsStore
      if (!store) return '加载中...'
      
      const { soundSettings } = store
      // 检查播放列表和当前曲目是否存在
      if (!soundSettings.bgMusic.playlist || soundSettings.bgMusic.playlist.length === 0) {
        return '播放列表为空'
      }
      
      const currentTrack = soundSettings.bgMusic.currentTrack
      if (!currentTrack) {
        return '未选择曲目'
      }
      
      const track = soundSettings.bgMusic.playlist.find(item => {
        // 处理路径可能的差异（带/不带/）
        const itemValue = item.value.startsWith('/') ? item.value : '/' + item.value
        const trackValue = currentTrack.startsWith('/') ? currentTrack : '/' + currentTrack
        return itemValue === trackValue
      })
      
      return track ? track.label : '无曲目'
    } catch (error) {
      console.error('获取曲目名称失败:', error)
      return '加载中...'
    }
  }
  
  // 格式化时间
  public formatTime(time: number): string {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }
}

// 导出单例实例
export const audioService = AudioService.getInstance()