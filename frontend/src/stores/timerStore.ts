import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import { useTodoStore, Todo, TodoStatus } from './todoStore'

// 定义番茄钟模式类型
export type TimerMode = 'pomodoro' | 'custom'

export const useTimerStore = defineStore('timer', () => {
  // 状态
  // 番茄工作法模式的时间设置
  const workTime = ref(25)
  const shortBreakTime = ref(5)
  const longBreakTime = ref(15)

  // 自定义模式的时间设置
  const customWorkTime = ref(20)
  const customShortBreakTime = ref(5)
  const customLongBreakTime = ref(10)

  const time = ref(25 * 60) // 25分钟 = 1500秒
  const initialTime = ref(25 * 60)
  const isRunning = ref(false)
  const intervalId = ref<number | null>(null)
  const isBreak = ref(false)
  const completedPomodoros = ref(0)
  const todoStore = useTodoStore()
  const currentMode = ref<TimerMode>('pomodoro')
  const pomodoroHistory = ref<{date: string, count: number}[]>([])
  const focusTimeHistory = ref<{date: string, seconds: number}[]>([])
  const lastRecordedTime = ref<number>(25 * 60) // 上次记录专注时间的时间点

  // 控制自定义模式的设置弹窗
  const showCustomModeSettings = ref(false)

  // 计算属性
  const progress = computed(() => (initialTime.value - time.value) / initialTime.value * 100)

  // 格式化时间
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 加载设置
  const loadSettings = () => {
    // 从 localStorage 加载模式设置
    const savedMode = localStorage.getItem('timerMode')
    if (savedMode === 'pomodoro' || savedMode === 'custom') {
      currentMode.value = savedMode as TimerMode
    }

    // 加载番茄工作法模式的时间设置
    const pomodoroSettings = localStorage.getItem('pomodoroSettings')
    if (pomodoroSettings) {
      const settings = JSON.parse(pomodoroSettings)
      workTime.value = settings.workTime || 25
      shortBreakTime.value = settings.shortBreakTime || 5
      longBreakTime.value = settings.longBreakTime || 15
    }

    // 加载自定义模式的时间设置
    const customSettings = localStorage.getItem('customSettings')
    if (customSettings) {
      const settings = JSON.parse(customSettings)
      customWorkTime.value = settings.workTime || 20
      customShortBreakTime.value = settings.shortBreakTime || 5
      customLongBreakTime.value = settings.longBreakTime || 10
    }

    // 根据当前模式更新初始时间（只有在没有正在计时的任务时才更新）
    if (!todoStore.currentTodo && !isRunning.value) {
      updateInitialTimeBasedOnMode()

      // 如果计时器未运行，立即更新显示时间
      time.value = initialTime.value
    } else {
      console.log('加载设置时保持当前计时状态不变，因为有任务正在进行');
    }

    // 加载番茄钟历史记录
    loadPomodoroHistory()
  }

  // 根据当前模式更新初始时间
  const updateInitialTimeBasedOnMode = () => {
    // 只有在没有当前任务和计时器未运行时才更新初始时间
    // 这样可以避免影响正在进行中的任务计时
    if (!todoStore.currentTodo && !isRunning.value) {
      if (currentMode.value === 'pomodoro') {
        initialTime.value = workTime.value * 60
      } else {
        initialTime.value = customWorkTime.value * 60
      }
      console.log(`根据全局模式[${currentMode.value}]更新初始时间: ${formatTime(initialTime.value)}`);
    } else {
      console.log('有任务正在进行中，不根据全局模式更新初始时间');
    }
  }

  // 加载番茄钟历史记录
  const loadPomodoroHistory = () => {
    const history = localStorage.getItem('pomodoroHistory')
    if (history) {
      pomodoroHistory.value = JSON.parse(history)
    }

    const timeHistory = localStorage.getItem('focusTimeHistory')
    if (timeHistory) {
      focusTimeHistory.value = JSON.parse(timeHistory)
    }
  }

  // 保存番茄钟历史记录
  const savePomodoroHistory = () => {
    localStorage.setItem('pomodoroHistory', JSON.stringify(pomodoroHistory.value))
    localStorage.setItem('focusTimeHistory', JSON.stringify(focusTimeHistory.value))
  }

  // 记录完成的番茄钟
  const recordPomodoro = () => {
    const today = new Date().toISOString().split('T')[0]
    const existingRecord = pomodoroHistory.value.find(record => record.date === today)

    if (existingRecord) {
      existingRecord.count++
    } else {
      pomodoroHistory.value.push({ date: today, count: 1 })
    }

    savePomodoroHistory()
  }

  // 记录专注时长
  const recordFocusTime = (seconds: number) => {
    const today = new Date().toISOString().split('T')[0]
    const existingRecord = focusTimeHistory.value.find(record => record.date === today)

    if (existingRecord) {
      existingRecord.seconds += seconds
    } else {
      focusTimeHistory.value.push({ date: today, seconds })
    }

    savePomodoroHistory()

    // 如果有当前任务，更新任务的总专注时长
    if (todoStore.currentTodo) {
      // 保存原始的已完成专注次数，确保UI同步
      const originalCompletedPomodoros = todoStore.currentTodo.completedPomodoros || 0;

      // 更新专注时长
      todoStore.increaseTodoFocusTime(todoStore.currentTodo.id, seconds)

      // 确保UI上的已完成专注次数没有被重置
      const updatedTodo = todoStore.todos.find(t => t.id === todoStore.currentTodo?.id);
      if (updatedTodo && updatedTodo.completedPomodoros < originalCompletedPomodoros) {
        updatedTodo.completedPomodoros = originalCompletedPomodoros;
        console.log(`恢复已完成专注次数: ${originalCompletedPomodoros}`);
      }

      // 检查是否达到目标时长，自动完成任务
      const todo = todoStore.currentTodo
      if (todo.targetTime && todo.totalFocusTime >= todo.targetTime * 60) {
        todoStore.setTodoStatus(todo.id, 'completed')
      }
    }
  }

  // 保存番茄工作法模式设置
  const savePomodoroSettings = () => {
    localStorage.setItem('pomodoroSettings', JSON.stringify({
      workTime: workTime.value,
      shortBreakTime: shortBreakTime.value,
      longBreakTime: longBreakTime.value
    }))

    // 如果当前是番茄工作法模式，更新初始时间
    if (currentMode.value === 'pomodoro' && !isRunning.value) {
      initialTime.value = workTime.value * 60
      time.value = initialTime.value
    }
  }

  // 保存自定义模式设置
  const saveCustomSettings = () => {
    localStorage.setItem('customSettings', JSON.stringify({
      workTime: customWorkTime.value,
      shortBreakTime: customShortBreakTime.value,
      longBreakTime: customLongBreakTime.value
    }))

    // 如果当前是自定义模式，更新初始时间
    if (currentMode.value === 'custom' && !isRunning.value) {
      initialTime.value = customWorkTime.value * 60
      time.value = initialTime.value
    }

    // 隐藏设置弹窗
    showCustomModeSettings.value = false
  }

  // 切换计时器模式
  const switchTimerMode = (mode: TimerMode) => {
    if (currentMode.value !== mode) {
      // 记录旧模式，以便之后检查是否需要更新时间
      const previousMode = currentMode.value

      // 更新当前全局模式
      currentMode.value = mode
      localStorage.setItem('timerMode', mode)

      // 只有在没有正在计时的任务时，才更新初始时间
      // 这确保切换模式不会影响当前正在计时的任务
      if (!isRunning.value && !todoStore.currentTodo) {
        // 根据新模式设置初始时间
        if (mode === 'pomodoro') {
          initialTime.value = workTime.value * 60
        } else {
          initialTime.value = customWorkTime.value * 60
        }
        time.value = initialTime.value
        lastRecordedTime.value = initialTime.value

        console.log(`切换全局专注模式为: ${mode}，更新了初始时间为: ${formatTime(initialTime.value)}`);
      } else {
        console.log(`切换全局专注模式为: ${mode}，但保持当前计时器状态不变，因为有任务正在进行`);
      }
    }
  }

  // 设置当前待办事项的计时器
  const setTodoTimer = (todoId: number, mode: TimerMode = 'pomodoro', customSettings?: {
    workTime: number,
    shortBreakTime: number,
    longBreakTime: number
  }) => {
    const todo = todoStore.todos.find((t: Todo) => t.id === todoId)
    if (todo) {
      // 将所有处于"进行中"状态的待办事项设为"暂停"状态
      todoStore.todos.forEach((t: Todo) => {
        if (t.id !== todoId && t.status === 'inProgress') {
          todoStore.setTodoStatus(t.id, 'paused')
        }
      })

      todoStore.setCurrentTodo(todoId)
      todoStore.setTodoStatus(todoId, 'inProgress')

      // 记录当前切换的待办事项模式
      console.log(`设置待办事项计时器 - ID:${todoId}, 模式:${mode}, 自定义设置:`, customSettings);

      // 根据模式设置时间
      if (mode === 'pomodoro') {
        initialTime.value = workTime.value * 60
      } else {
        // 使用待办事项自己的自定义设置
        if (customSettings) {
          initialTime.value = customSettings.workTime * 60
          console.log(`使用待办事项的自定义设置 - 工作时间:${customSettings.workTime}分钟`);
        } else {
          // 如果没有自定义设置但模式是自定义，尝试从todo对象获取
          if (todo.customSettings) {
            initialTime.value = todo.customSettings.workTime * 60;
            console.log(`从todo对象获取自定义设置 - 工作时间:${todo.customSettings.workTime}分钟`);
          } else {
            // 使用全局自定义设置
            initialTime.value = customWorkTime.value * 60
            console.log(`使用全局自定义设置 - 工作时间:${customWorkTime.value}分钟`);
          }
        }
      }

      time.value = initialTime.value
      isBreak.value = false
      lastRecordedTime.value = initialTime.value

      // 强制更新UI
      nextTick(() => {
        // 触发UI更新
        time.value = initialTime.value
      })
    }
  }

  // 开始休息
  const startBreak = (isLongBreak: boolean = false) => {
    // 记录完成的番茄钟
    recordPomodoro()

    if (todoStore.currentTodo) {
      // 如果不处于休息状态，记录专注时长
      if (!isBreak.value) {
        recordFocusTime(lastRecordedTime.value - time.value)
      }

      // 增加待办事项的完成番茄数量
      // 注意：将会在后台保存状态
      todoStore.incrementCompletedPomodoros(todoStore.currentTodo.id)

      // 增加本地完成番茄数量计数器
      completedPomodoros.value++

      // 进入休息状态
      isBreak.value = true

      // 检查当前任务是否需要自动完成（在休息开始前）
      const currentTodoId = todoStore.currentTodo.id;
      const updatedTodo = todoStore.todos.find(t => t.id === currentTodoId);
      if (updatedTodo && updatedTodo.completedPomodoros >= updatedTodo.estimatedPomodoros) {
        console.log(`待办事项(ID:${currentTodoId})已完成所有预计专注次数，自动设置为完成状态`);
        todoStore.setTodoStatus(currentTodoId, 'completed');
      }

      // 记录当前进入休息的待办事项信息
      console.log(`开始休息 - 待办事项ID:${todoStore.currentTodo.id}, 模式:${todoStore.currentTodo.mode}, 是否长休息:${isLongBreak}`);

      // 根据待办事项的模式和自定义设置选择休息时间
      if (todoStore.currentTodo.mode === 'pomodoro') {
        initialTime.value = isLongBreak ? longBreakTime.value * 60 : shortBreakTime.value * 60
        console.log(`使用番茄模式休息时间: ${initialTime.value / 60}分钟`);
      } else {
        // 如果待办事项有自定义设置，使用它的设置
        if (todoStore.currentTodo.customSettings) {
          initialTime.value = isLongBreak
            ? todoStore.currentTodo.customSettings.longBreakTime * 60
            : todoStore.currentTodo.customSettings.shortBreakTime * 60
          console.log(`使用待办事项自定义休息时间: ${initialTime.value / 60}分钟, 设置:`, todoStore.currentTodo.customSettings);
        } else {
          // 否则使用全局设置
          initialTime.value = isLongBreak ? customLongBreakTime.value * 60 : customShortBreakTime.value * 60
          console.log(`使用全局自定义休息时间: ${initialTime.value / 60}分钟`);
        }
      }

      time.value = initialTime.value
      lastRecordedTime.value = initialTime.value

      // 如果当前有任务，将其状态设为暂停
      todoStore.setTodoStatus(todoStore.currentTodo.id, 'paused')
    } else {
      // 没有当前待办事项，使用全局模式
      completedPomodoros.value++
      isBreak.value = true

      console.log(`无待办事项，使用全局模式休息: ${currentMode.value}, 是否长休息:${isLongBreak}`);

      // 使用当前全局模式设置休息时间
      if (currentMode.value === 'pomodoro') {
        initialTime.value = isLongBreak ? longBreakTime.value * 60 : shortBreakTime.value * 60
        console.log(`使用全局番茄模式休息时间: ${initialTime.value / 60}分钟`);
      } else {
        initialTime.value = isLongBreak ? customLongBreakTime.value * 60 : customShortBreakTime.value * 60
        console.log(`使用全局自定义模式休息时间: ${initialTime.value / 60}分钟`);
      }

      time.value = initialTime.value
      lastRecordedTime.value = initialTime.value
    }
  }

  // 计时器控制
  const startTimer = () => {
    if (!isRunning.value) {
      isRunning.value = true
      // 导入音效服务 - 这里使用动态导入避免循环依赖
      import('../services/soundEffectService').then(module => {
        const { soundEffectService } = module
        // 播放开始按钮音效
        soundEffectService.playButtonClickSound()
      }).catch(err => console.error('加载音效服务失败:', err))

      // 如果有当前任务，更新状态为进行中
      if (todoStore.currentTodo) {
        // 将所有非当前任务且处于"进行中"状态的待办事项设为"暂停"状态
        todoStore.todos.forEach((t: Todo) => {
          if (t.id !== todoStore.currentTodo?.id && t.status === 'inProgress') {
            todoStore.setTodoStatus(t.id, 'paused')
          }
        })

        todoStore.setTodoStatus(todoStore.currentTodo.id, 'inProgress')
      }

      intervalId.value = setInterval(() => {
        if (time.value > 0) {
          time.value--
        } else {
          stopTimer()
          // 导入音效服务 - 这里使用动态导入避免循环依赖
          import('../services/soundEffectService').then(module => {
            const { soundEffectService } = module
            // 播放计时结束音效
            soundEffectService.playTimerEndSound()
          }).catch(err => console.error('加载音效服务失败:', err))

          if (!isBreak.value && todoStore.currentTodo) {
            // 工作结束，记录专注时长
            recordFocusTime(lastRecordedTime.value)

            // 开始休息
            startBreak(completedPomodoros.value % 4 === 0)
          } else {
            // 休息结束，回到工作
            isBreak.value = false
            if (todoStore.currentTodo) {
              // 确保其他任务不处于进行中状态
              todoStore.todos.forEach((t: Todo) => {
                if (t.id !== todoStore.currentTodo?.id && t.status === 'inProgress') {
                  todoStore.setTodoStatus(t.id, 'paused')
                }
              })

              // 使用待办事项自己的模式，而不是当前全局模式
              setTodoTimer(todoStore.currentTodo.id, todoStore.currentTodo.mode)
            } else {
              // 使用当前模式的时间设置
              if (currentMode.value === 'pomodoro') {
                initialTime.value = workTime.value * 60
              } else {
                initialTime.value = customWorkTime.value * 60
              }
              time.value = initialTime.value
              lastRecordedTime.value = initialTime.value
            }
          }
        }
      }, 1000) as unknown as number
    }
  }

  const stopTimer = () => {
    if (isRunning.value && intervalId.value !== null) {
      clearInterval(intervalId.value)
      isRunning.value = false

      // 如果不是休息时间，记录专注时长
      if (!isBreak.value && todoStore.currentTodo) {
        const focusedTime = lastRecordedTime.value - time.value
        if (focusedTime > 0) {
          recordFocusTime(focusedTime)
          lastRecordedTime.value = time.value
        }

        // 如果当前有任务，将其状态设为暂停
        todoStore.setTodoStatus(todoStore.currentTodo.id, 'paused')
      }
    }
  }

  const resetTimer = () => {
    stopTimer()
    time.value = initialTime.value
    lastRecordedTime.value = initialTime.value
  }

  // 恢复计时器状态（用于手动刷新时保持状态）
  const restoreTimerState = (state: {
    time: number,
    initialTime: number,
    isRunning: boolean,
    isBreak: boolean,
    currentMode: TimerMode
  }) => {
    // 更新状态参数
    time.value = state.time;
    initialTime.value = state.initialTime;
    isBreak.value = state.isBreak;
    currentMode.value = state.currentMode;

    // 如果计时器应该运行，且当前未运行，则重新启动
    if (state.isRunning && !isRunning.value) {
      startTimer();
    } else if (!state.isRunning && isRunning.value) {
      // 如果计时器不应该运行，但当前正在运行，则停止
      stopTimer();
    }

    console.log('计时器状态已恢复', {
      时间: formatTime(time.value),
      运行状态: isRunning.value,
      模式: currentMode.value,
      休息状态: isBreak.value
    });
  }

  // 直接更新计时模式，忽略任何限制条件
  // 用于专注设置中手动切换模式
  const forceUpdateTimerMode = (mode: TimerMode) => {
    if (currentMode.value !== mode) {
      currentMode.value = mode;
      console.log(`强制更新计时器模式为: ${mode}`);
    }
  }

  // 初始化 - 从localStorage加载设置
  loadSettings()

  return {
    // 状态
    workTime,
    shortBreakTime,
    longBreakTime,
    customWorkTime,
    customShortBreakTime,
    customLongBreakTime,
    time,
    initialTime,
    isRunning,
    progress,
    isBreak,
    completedPomodoros,
    currentMode,
    pomodoroHistory,
    focusTimeHistory,
    showCustomModeSettings,
    // 方法
    formatTime,
    loadSettings,
    savePomodoroSettings,
    saveCustomSettings,
    switchTimerMode,
    startTimer,
    stopTimer,
    resetTimer,
    setTodoTimer,
    startBreak,
    recordPomodoro,
    recordFocusTime,
    loadPomodoroHistory,
    restoreTimerState,
    forceUpdateTimerMode
  }
})
