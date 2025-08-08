import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 音频文件路径 - 不使用/前缀，由audioService动态决定路径前缀
const AUDIO_PATHS = {
  timerEnd: 'sounds/timer-end.wav',
  river: 'sounds/river-maas-summer.wav',
  ocean: 'sounds/hildegard_beats__oceano1.wav',
  piano: 'sounds/josefpres__piano-loops-186-octave-down-long-loop-120-bpm.wav',
  birds: 'sounds/tobbler__amb_birds_neckar.wav',
  chill: 'sounds/zhr__chill-background-music-3.wav'
};

interface AISettings {
  enabled: boolean
  apiKey: string
  model: string
}

interface SoundSettings {
  currentSound: string
  autoPlay: boolean
  localMusicList: Array<{label: string, value: string}>
  // 背景音乐设置
  bgMusic: {
    isPlaying: boolean
    currentTrack: string
    volume: number
    currentTime: number
    playlist: Array<{label: string, value: string}>
  }
}

export const useSettingsStore = defineStore('settings', () => {
  // AI设置
  const aiSettings = ref<AISettings>({
    enabled: false,
    apiKey: '',
    model: 'deepseek' // 默认使用deepseek模型
  })

  // 音乐设置
  const soundSettings = ref<SoundSettings>({
    currentSound: AUDIO_PATHS.timerEnd, // 使用音频路径常量
    autoPlay: true, // 默认自动播放
    localMusicList: [], // 本地音乐列表，初始为空
    // 背景音乐设置
    bgMusic: {
      isPlaying: false,
      currentTrack: '',
      volume: 0.5,
      currentTime: 0,
      playlist: []
    }
  })

  // 可用的音乐列表 - 这个列表用于播放完成音效选择
  const availableSounds = ref([
    { label: '计时结束音效', value: AUDIO_PATHS.timerEnd },
  ])

  // 加载AI设置
  const loadAISettings = () => {
    const settings = localStorage.getItem('aiSettings')
    if (settings) {
      aiSettings.value = JSON.parse(settings)
      // 确保model字段存在且为deepseek
      if (!aiSettings.value.model) {
        aiSettings.value.model = 'deepseek'
      }
    }
  }

  // 保存AI设置
  const saveAISettings = () => {
    localStorage.setItem('aiSettings', JSON.stringify(aiSettings.value))
  }

  // 更新AI设置
  const updateAISettings = (settings: Partial<AISettings>) => {
    aiSettings.value = { ...aiSettings.value, ...settings }
    saveAISettings()
  }

  // 加载音乐设置
  const loadSoundSettings = () => {
    const settings = localStorage.getItem('soundSettings')
    if (settings) {
      soundSettings.value = JSON.parse(settings)
    }
  }

  // 保存音乐设置
  const saveSoundSettings = () => {
    localStorage.setItem('soundSettings', JSON.stringify(soundSettings.value))
  }

  // 更新音乐设置
  const updateSoundSettings = (settings: Partial<SoundSettings>) => {
    soundSettings.value = { ...soundSettings.value, ...settings }
    saveSoundSettings()
  }

  // 添加本地音乐到列表
  const addLocalMusic = (label: string, filePath: string) => {
    // 检查是否已存在相同路径的音乐
    const exists = soundSettings.value.localMusicList.some(item => item.value === filePath)
    if (!exists) {
      soundSettings.value.localMusicList.push({ label, value: filePath })
      saveSoundSettings()
    }
  }

  // 从列表中删除本地音乐
  const removeLocalMusic = (filePath: string) => {
    soundSettings.value.localMusicList = soundSettings.value.localMusicList.filter(item => item.value !== filePath)
    saveSoundSettings()
  }

  // 初始化 - 从localStorage加载设置
  loadAISettings()
  loadSoundSettings()

  // 背景音乐控制方法
  // 播放背景音乐
  const playBgMusic = () => {
    soundSettings.value.bgMusic.isPlaying = true
    saveSoundSettings()
  }

  // 暂停背景音乐
  const pauseBgMusic = () => {
    soundSettings.value.bgMusic.isPlaying = false
    saveSoundSettings()
  }

  // 切换播放/暂停状态
  const toggleBgMusic = () => {
    soundSettings.value.bgMusic.isPlaying = !soundSettings.value.bgMusic.isPlaying
    saveSoundSettings()
  }

  // 设置背景音乐音量
  const setBgMusicVolume = (volume: number) => {
    soundSettings.value.bgMusic.volume = volume
    saveSoundSettings()
  }

  // 设置当前播放的背景音乐
  const setCurrentBgMusic = (trackPath: string) => {
    soundSettings.value.bgMusic.currentTrack = trackPath
    saveSoundSettings()
  }

  // 加载背景音乐播放列表
  const loadBgMusicPlaylist = () => {
    // 默认可用的背景音乐
    const availableBgMusic = [
      { label: '河流夏日', value: AUDIO_PATHS.river },
      { label: '海洋节拍', value: AUDIO_PATHS.ocean },
      { label: '钢琴循环', value: AUDIO_PATHS.piano },
      { label: '鸟鸣环境', value: AUDIO_PATHS.birds },
      { label: '轻松背景音乐', value: AUDIO_PATHS.chill },
    ];

    // 清空当前播放列表，重新添加，避免重复
    soundSettings.value.bgMusic.playlist = [...availableBgMusic];

    // 如果播放列表不为空但当前曲目为空，设置第一首为当前曲目
    if (soundSettings.value.bgMusic.playlist.length > 0 && !soundSettings.value.bgMusic.currentTrack) {
      soundSettings.value.bgMusic.currentTrack = soundSettings.value.bgMusic.playlist[0].value;
    }

    console.log('背景音乐播放列表已加载:', soundSettings.value.bgMusic.playlist);
    saveSoundSettings();
  }

  // 添加音乐到背景音乐播放列表
  const addToBgMusicPlaylist = (label: string, filePath: string) => {
    // 检查是否已存在相同路径的音乐
    const exists = soundSettings.value.bgMusic.playlist.some(item => item.value === filePath)
    if (!exists) {
      soundSettings.value.bgMusic.playlist.push({ label, value: filePath })
      saveSoundSettings()
    }
  }

  // 从背景音乐播放列表中移除音乐
  const removeFromBgMusicPlaylist = (filePath: string) => {
    soundSettings.value.bgMusic.playlist = soundSettings.value.bgMusic.playlist.filter(item => item.value !== filePath)
    saveSoundSettings()
  }

  // 初始化 - 加载背景音乐播放列表
  loadBgMusicPlaylist()

  return {
    aiSettings,
    soundSettings,
    loadAISettings,
    saveAISettings,
    updateAISettings,
    loadSoundSettings,
    saveSoundSettings,
    updateSoundSettings,
    addLocalMusic,
    removeLocalMusic,
    // 背景音乐相关方法
    playBgMusic,
    pauseBgMusic,
    toggleBgMusic,
    setBgMusicVolume,
    setCurrentBgMusic,
    loadBgMusicPlaylist,
    addToBgMusicPlaylist,
    removeFromBgMusicPlaylist
  }
})
