import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import dbService, { Todo } from '../services/DatabaseService'
import { TimerMode } from './timerStore'

export interface TimerSettings {
  workTime: number
  shortBreakTime: number
  longBreakTime: number
  isCustom: boolean
  customTime?: number
}

export type TodoStatus = 'pending' | 'completed' | 'inProgress' | 'paused'

export const useTodoStore = defineStore('todo', () => {
  // 状态
  const todos = ref<Todo[]>([])
  const currentTodo = ref<Todo | null>(null)
  const dailyCompletedTodos = ref<Todo[]>([])
  const monthlyCompletedTodos = ref<Todo[]>([])
  let currentSessionId = ref<number | null>(null)

  // 加载待办事项
  const loadTodos = async () => {
    try {
      todos.value = await dbService.getAllTodos()

      // 确保每个待办事项都有正确的mode属性
      todos.value.forEach(todo => {
        if (!todo.mode || (todo.mode !== 'pomodoro' && todo.mode !== 'custom')) {
          console.warn(`修正待办事项(ID: ${todo.id})的模式值:`, todo.mode);
          todo.mode = 'pomodoro'; // 默认设为番茄模式
        }

        // 确保创建时间存在，如果不存在则使用当前时间
        if (!todo.createdAt) {
          todo.createdAt = Date.now();
        }
      });

      // 按创建时间倒序排列，最新创建的显示在前面
      todos.value.sort((a, b) => b.createdAt - a.createdAt);

      updateCompletedStats()
      console.log('待办事项加载完成，已按时间排序，总数:', todos.value.length);

      // 返回已排序的数据
      return [...todos.value];
    } catch (error) {
      console.error('加载待办事项失败:', error)
      return [];
    }
  }

  // 加载待办事项，但不立即应用到状态（用于智能刷新）
  const loadTodosWithoutApplying = async (): Promise<Todo[]> => {
    try {
      const loadedTodos = await dbService.getAllTodos();

      // 处理数据，但不更新状态
      loadedTodos.forEach(todo => {
        if (!todo.mode || (todo.mode !== 'pomodoro' && todo.mode !== 'custom')) {
          todo.mode = 'pomodoro'; // 默认设为番茄模式
        }

        // 确保创建时间存在
        if (!todo.createdAt) {
          todo.createdAt = Date.now();
        }
      });

      // 返回处理后的数据
      return loadedTodos;
    } catch (error) {
      console.error('加载待办事项失败:', error);
      return [];
    }
  }

  // 更新待办事项列表，但保留当前进行中的任务状态
  const updateTodosKeepingCurrentTask = async (newTodos: Todo[], currentTaskId: number) => {
    // 保存当前进行中的任务
    const currentTask = todos.value.find(todo => todo.id === currentTaskId);

    // 更新待办事项列表
    todos.value = newTodos;

    // 按创建时间倒序排列，最新创建的显示在前面
    todos.value.sort((a, b) => b.createdAt - a.createdAt);

    // 如果有当前任务，确保其状态保持为"进行中"
    if (currentTask) {
      const updatedTask = todos.value.find(todo => todo.id === currentTaskId);
      if (updatedTask) {
        updatedTask.status = 'inProgress';

        // 更新当前任务引用
        currentTodo.value = updatedTask;

        // 重要：将进行中状态持久化到数据库中
        try {
          // 在数据库中同步更新任务状态为进行中
          await dbService.updateTodoStatus(currentTaskId, 'inProgress');
          console.log('当前进行中任务状态已持久化到数据库');
        } catch (error) {
          console.error('无法持久化任务状态:', error);
        }
      }
    }

    // 更新统计数据
    updateCompletedStats()

    console.log('待办事项已更新，保留了进行中任务的状态');
    return true; // 返回成功标志
  }

  // 更新每日/每月完成的任务数
  const updateCompletedStats = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    const dailyCompleted = todos.value.filter(todo =>
      todo.completed && todo.completedAt && todo.completedAt >= today
    )

    const monthlyCompleted = todos.value.filter(todo =>
      todo.completed && todo.completedAt && todo.completedAt >= thisMonth
    )

    dailyCompletedTodos.value = dailyCompleted
    monthlyCompletedTodos.value = monthlyCompleted

    console.log(`今日已完成: ${dailyCompleted.length}, 本月已完成: ${monthlyCompleted.length}`)
  }

  // 添加待办事项
  const addTodo = async (todoData: { name: string, mode?: TimerMode, estimatedPomodoros?: number }) => {
    try {
      // 创建待办事项请求对象
      const todoRequest = {
        name: todoData.name,
        mode: todoData.mode || 'pomodoro',
        estimatedPomodoros: todoData.estimatedPomodoros || 1
      };

      console.log('创建待办事项请求数据:', todoRequest);

      // 调用后端API创建待办事项
      const response = await window.go!.main!.App.CreateTodo(todoRequest);

      if (response && response.success) {
        // 将新创建的待办事项添加到本地状态
        if (response.todo) {
          const currentTime = Date.now();

          const newTodo = {
            ...response.todo,
            completedPomodoros: 0,
            totalFocusTime: 0,
            estimatedPomodoros: todoData.estimatedPomodoros || 1,
            completed: false,
            mode: todoData.mode || 'pomodoro',
            createdAt: currentTime, // 确保设置创建时间
            completedAt: null,
            lastFocusTimestamp: null
          };

          todos.value.push(newTodo);

          // 重新排序，确保最新的在最前面
          todos.value.sort((a, b) => b.createdAt - a.createdAt);

          console.log('新待办事项已添加并排序:', newTodo);
        }

        return true;
      } else {
        console.error('创建待办事项失败:', response?.message || '未知错误');
        return false;
      }
    } catch (error) {
      console.error('添加待办事项失败:', error);
      return false;
    }
  }

  // 删除待办事项
  const removeTodo = async (id: number): Promise<boolean> => {
    try {
      const success = await dbService.deleteTodo(id)
      if (success) {
        // 重新加载待办事项列表
        await loadTodos()
        return true
      }
      return false
    } catch (error) {
      console.error('删除待办事项失败:', error)
      return false
    }
  }

  // 切换待办事项完成状态
  const toggleTodo = async (id: number): Promise<boolean> => {
    const todo = todos.value.find(todo => todo.id === id)
    if (todo) {
      const newStatus = todo.completed ? 'pending' : 'completed'
      try {
        const success = await dbService.updateTodoStatus(id, newStatus)
        if (success) {
          // 立即更新本地状态
          todo.completed = !todo.completed;
          if (todo.completed) {
            todo.completedAt = Date.now();
            todo.status = 'completed';

            // 更新已完成任务缓存
            if (dailyCompletedTodos.value) {
              dailyCompletedTodos.value.push(todo);
            }
            if (monthlyCompletedTodos.value) {
              monthlyCompletedTodos.value.push(todo);
            }
          } else {
            todo.completedAt = null;
            todo.status = 'pending';

            // 从已完成任务缓存中移除
            if (dailyCompletedTodos.value) {
              dailyCompletedTodos.value = dailyCompletedTodos.value.filter(t => t.id !== todo.id);
            }
            if (monthlyCompletedTodos.value) {
              monthlyCompletedTodos.value = monthlyCompletedTodos.value.filter(t => t.id !== todo.id);
            }
          }

          // 更新统计数据
          updateCompletedStats();

          return true;
        }
        return false;
      } catch (error) {
        console.error('切换待办事项状态失败:', error)
        return false;
      }
    }
    return false;
  }

  // 清除所有已完成的待办事项
  const clearCompleted = async () => {
    try {
      // 找出所有已完成的待办事项
      const completedTodos = todos.value.filter(todo => todo.completed)

      // 逐个删除已完成的待办事项
      for (const todo of completedTodos) {
        await window.go!.main!.App.DeleteTodo(todo.id)
      }

      // 从本地状态中移除已完成的待办事项
      todos.value = todos.value.filter(todo => !todo.completed)

      console.log(`已清除${completedTodos.length}个已完成的待办事项`)
      return true
    } catch (error) {
      console.error('清除已完成待办事项失败:', error)
      return false
    }
  }

  // 设置当前正在进行的待办事项
  const setCurrentTodo = (id: number) => {
    const todo = todos.value.find(todo => todo.id === id)
    if (todo) {
      // 保存之前的currentTodo状态，以便在设置新的currentTodo时保留一些关键信息
      const prevCurrentTodo = currentTodo.value;
      const wasInProgress = prevCurrentTodo?.status === 'inProgress';

      // 设置新的当前任务
      currentTodo.value = todo;

      // 如果之前的任务是进行中状态，确保新设置的任务也保持进行中状态
      if (wasInProgress && todo.id === prevCurrentTodo?.id) {
        console.log(`恢复任务(ID:${id})的进行中状态`);
        todo.status = 'inProgress';

        // 如果有上次专注时间戳，保留它
        if (prevCurrentTodo?.lastFocusTimestamp) {
          todo.lastFocusTimestamp = prevCurrentTodo.lastFocusTimestamp;
        } else {
          todo.lastFocusTimestamp = Date.now();
        }
      }

      console.log(`当前任务已设置为ID:${id}, 名称:${todo.name || todo.text}, 状态:${todo.status}`);
    } else {
      console.warn(`未找到ID为${id}的待办事项，无法设置为当前任务`);
    }
  }

  // 增加完成的番茄钟数量
  const incrementCompletedPomodoros = async (id: number) => {
    try {
      // 找到当前待办事项
      const todo = todos.value.find(t => t.id === id);
      if (!todo) {
        console.error(`找不到ID为${id}的待办事项`);
        return;
      }

      // 保存当前预计专注次数
      const estimatedPomodoros = todo.estimatedPomodoros || 1;
      console.log(`增加番茄钟数量前保存预计专注次数: ${estimatedPomodoros}`);

      // 在本地立即更新已完成的番茄钟数量，使UI能立即反映变化
      todo.completedPomodoros = (todo.completedPomodoros || 0) + 1;
      console.log(`本地更新了待办事项(ID:${id})的已完成番茄钟数量: ${todo.completedPomodoros}`);

      // 这里我们标记完成一个番茄周期，实际通过专注会话完成
      if (currentSessionId.value !== null) {
        await completeFocusSession(25, 0); // 25分钟，无休息
      }

      // 恢复预估专注次数，防止被重新加载的数据覆盖
      const updatedTodo = todos.value.find(t => t.id === id);
      if (updatedTodo) {
        updatedTodo.estimatedPomodoros = estimatedPomodoros;
        console.log(`恢复待办事项(ID:${id})的预计专注次数: ${estimatedPomodoros}`);

        // 检查是否已完成所有预计的专注次数，如果完成则将待办事项设为完成状态
        if (updatedTodo.completedPomodoros >= updatedTodo.estimatedPomodoros) {
          console.log(`待办事项(ID:${id})已完成所有预计专注次数，自动设置为完成状态`);
          setTodoStatus(id, 'completed');
        }
      }

      // 由于completeFocusSession中已处理了预计专注次数的恢复，这里不需要额外处理
    } catch (error) {
      console.error('增加完成番茄钟数量失败:', error);
    }
  }

  // 更新待办事项文本
  const updateTodoText = async (id: number, text: string) => {
    // 由于我们的API设计中没有直接更新文本的方法
    // 这里我们可以先获取当前状态，然后用相同状态更新
    const todo = todos.value.find(todo => todo.id === id)
    if (todo) {
      try {
        // 保持原始状态
        const success = await dbService.updateTodoStatus(id, todo.status)
        if (success) {
          await loadTodos()
        }
      } catch (error) {
        console.error('更新待办事项文本失败:', error)
      }
    }
  }

  // 设置待办事项状态
  const setTodoStatus = async (id: number, status: TodoStatus) => {
    try {
      // 如果要设置为进行中状态，先检查是否有其他事件正在进行
      if (status === 'inProgress') {
        // 查找是否已有其他任务处于进行中状态
        const existingInProgressTodo = todos.value.find(t => t.status === 'inProgress' && t.id !== id);

        if (existingInProgressTodo) {
          // 存在其他正在进行中的任务，先将其重置为待处理状态
          console.log(`发现其他进行中的任务(ID:${existingInProgressTodo.id})，将其重置为待处理状态`);
          // 更新数据库中的状态
          await dbService.updateTodoStatus(existingInProgressTodo.id, 'pending');
          // 更新本地数据
          existingInProgressTodo.status = 'pending';
          // 如果当前任务就是该任务，重置当前任务
          if (currentTodo.value && currentTodo.value.id === existingInProgressTodo.id) {
            currentTodo.value = null;
          }
        }
      }

      const success = await dbService.updateTodoStatus(id, status)
      if (success) {
        // 直接更新本地数据，而不是重新加载全部数据
        const todo = todos.value.find(t => t.id === id)
        if (todo) {
          todo.status = status
          // 如果状态是已完成，同时更新完成标志
          if (status === 'completed') {
            todo.completed = true
            todo.completedAt = Date.now()

            // 添加完成的动画效果（为了更好的UI体验）
            setTimeout(() => {
              // 这个空延时函数帮助浏览器有机会应用过渡效果
              console.log(`待办事项(ID:${id})已标记为完成，添加过渡效果`);
            }, 10);

            // 将当前任务设为null，如果当前完成的正是当前任务
            if (currentTodo.value && currentTodo.value.id === id) {
              // 保存currentTodo的引用，以便日志和其他操作
              const completedTodo = currentTodo.value;
              console.log(`当前任务已完成，重置当前任务: ${completedTodo.name || completedTodo.text}`);
              currentTodo.value = null;
            }
          } else if (status === 'pending' && todo.completed) {
            // 如果从完成状态变为待办，取消完成标志
            todo.completed = false
            todo.completedAt = null
          }

          // 如果是设置为进行中状态，更新时间戳并设置为当前任务
          if (status === 'inProgress') {
            todo.lastFocusTimestamp = Date.now()
            // 设置为当前任务
            currentTodo.value = todo;
            console.log(`待办事项(ID:${id})设置为当前进行中任务`);
          }

          // 更新完成任务统计
          updateCompletedStats()
        }
      }
    } catch (error) {
      console.error('设置待办事项状态失败:', error)
    }
  }

  // 开始专注会话
  const startFocusSession = async (id: number, mode: 'pomodoro' | 'custom') => {
    try {
      // 先检查是否有其他任务在进行中
      const existingInProgressTodo = todos.value.find(t => t.status === 'inProgress' && t.id !== id);
      if (existingInProgressTodo) {
        console.log(`开始新的专注会话前，将其他进行中的任务(ID:${existingInProgressTodo.id})重置为待处理状态`);
        // 更新该任务状态为待处理
        await dbService.updateTodoStatus(existingInProgressTodo.id, 'pending');
        // 更新本地状态
        existingInProgressTodo.status = 'pending';
      }

      const sessionId = await dbService.startFocusSession(id, mode)
      currentSessionId.value = sessionId

      // 更新待办事项状态
      await setTodoStatus(id, 'inProgress')

      return sessionId
    } catch (error) {
      console.error('开始专注会话失败:', error)
      return -1
    }
  }

  // 完成专注会话
  const completeFocusSession = async (duration: number, breakTime: number) => {
    if (currentSessionId.value === null) {
      console.error('没有正在进行的专注会话')
      return false
    }

    try {
      // 保存当前任务的ID和预计专注次数，以免被加载后的数据覆盖
      const currentTodoId = currentTodo.value?.id;
      const currentEstimatedPomodoros = currentTodo.value?.estimatedPomodoros || 1;
      console.log(`保存当前任务的预计专注次数: ${currentEstimatedPomodoros}`);

      const success = await dbService.completeFocusSession(
        currentSessionId.value,
        breakTime,
        duration
      )

      if (success) {
        currentSessionId.value = null;

        // 重新加载待办事项
        await loadTodos();

        // 恢复当前任务的预计专注次数，以免被后端数据覆盖
        if (currentTodoId) {
          const updatedTodo = todos.value.find(t => t.id === currentTodoId);
          if (updatedTodo) {
            // 恢复预计专注次数
            updatedTodo.estimatedPomodoros = currentEstimatedPomodoros;
            console.log(`恢复任务(ID:${currentTodoId})的预计专注次数: ${currentEstimatedPomodoros}`);
          }
        }
      }

      return success
    } catch (error) {
      console.error('完成专注会话失败:', error)
      return false
    }
  }

  // 增加待办事项的总专注时长
  const increaseTodoFocusTime = async (id: number, seconds: number) => {
    // 这个函数在数据库模式下通过专注会话自动累计
    try {
      // 由于completeFocusSession中已经处理了保留预计专注次数的逻辑
      // 所以这里只需要调用completeFocusSession即可
      if (currentSessionId.value !== null) {
        const minutes = Math.floor(seconds / 60);
        if (minutes > 0) {
          await completeFocusSession(minutes, 0);
        }
      }
    } catch (error) {
      console.error('增加待办事项专注时长失败:', error);
    }
  }

  // 更新待办事项设置（专注模式和番茄数）
  const updateTodoSettings = async (todo: {
    todo_id: number,
    name: string,
    mode: string,
    estimatedPomodoros: number,
    customSettings?: {
      workTime: number,
      shortBreakTime: number,
      longBreakTime: number
    }
  }): Promise<boolean> => {
    try {
      // 构造更新请求
      const updateRequest: any = {
        todo_id: todo.todo_id,
        name: todo.name,
        mode: todo.mode,
        estimatedPomodoros: todo.estimatedPomodoros
      };

      // 如果有自定义设置，添加到请求中
      if (todo.customSettings) {
        updateRequest.customSettings = todo.customSettings;
        console.log(`更新待办事项的自定义设置 - ID: ${todo.todo_id}, 模式: ${todo.mode}, 设置:`, todo.customSettings);
      } else {
        console.log(`更新待办事项无自定义设置 - ID: ${todo.todo_id}, 模式: ${todo.mode}`);
      }

      // 调用后端API更新待办事项
      if (typeof window.go !== 'undefined' && window.go?.main?.App) {
        const response = await window.go.main.App.UpdateTodo(updateRequest);
        if (response && response.success) {
          console.log('待办事项设置更新成功');

          // 更新本地状态
          const todoIndex = todos.value.findIndex(t => t.id === todo.todo_id);
          if (todoIndex !== -1) {
            todos.value[todoIndex].mode = todo.mode as 'pomodoro' | 'custom';
            todos.value[todoIndex].estimatedPomodoros = todo.estimatedPomodoros;

            // 如果有自定义设置，更新它
            if (todo.customSettings) {
              // 确保customSettings对象存在
              if (!todos.value[todoIndex].customSettings) {
                todos.value[todoIndex].customSettings = { ...todo.customSettings };
              } else {
                // 更新现有对象的属性
                todos.value[todoIndex].customSettings.workTime = todo.customSettings.workTime;
                todos.value[todoIndex].customSettings.shortBreakTime = todo.customSettings.shortBreakTime;
                todos.value[todoIndex].customSettings.longBreakTime = todo.customSettings.longBreakTime;
              }
              console.log(`本地待办事项自定义设置已更新 - ID: ${todo.todo_id}, 设置:`, todos.value[todoIndex].customSettings);
            } else if (todo.mode === 'pomodoro' && todos.value[todoIndex].customSettings) {
              // 如果切换到番茄模式，但保留自定义设置对象，以便未来切换回来
              console.log(`待办事项切换到番茄模式，但保留自定义设置 - ID: ${todo.todo_id}`);
            }
          }

          return true;
        } else {
          console.error('更新待办事项设置失败:', response?.message);
          return false;
        }
      }

      // 开发模式或本地环境
      console.log('开发模式模拟更新待办事项设置:', updateRequest);
      // 直接更新本地数据
      const todoIndex = todos.value.findIndex(t => t.id === todo.todo_id);
      if (todoIndex !== -1) {
        todos.value[todoIndex].mode = todo.mode as 'pomodoro' | 'custom';
        todos.value[todoIndex].estimatedPomodoros = todo.estimatedPomodoros;

        // 如果有自定义设置，更新它
        if (todo.customSettings) {
          if (!todos.value[todoIndex].customSettings) {
            todos.value[todoIndex].customSettings = { ...todo.customSettings };
          } else {
            todos.value[todoIndex].customSettings.workTime = todo.customSettings.workTime;
            todos.value[todoIndex].customSettings.shortBreakTime = todo.customSettings.shortBreakTime;
            todos.value[todoIndex].customSettings.longBreakTime = todo.customSettings.longBreakTime;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('更新待办事项设置错误:', error);
      return false;
    }
  }

  // 初始化 - 从数据库加载待办事项
  loadTodos()

  return {
    todos,
    currentTodo,
    dailyCompletedTodos,
    monthlyCompletedTodos,
    addTodo,
    removeTodo,
    toggleTodo,
    clearCompleted,
    loadTodos,
    loadTodosWithoutApplying,
    updateTodosKeepingCurrentTask,
    setCurrentTodo,
    incrementCompletedPomodoros,
    updateTodoText,
    setTodoStatus,
    increaseTodoFocusTime,
    updateCompletedStats,
    startFocusSession,
    completeFocusSession,
    updateTodoSettings
  }
})

export type { Todo } from '../services/DatabaseService'

// 在导出之前，扩展Todo类型以包含customSettings
declare module '../services/DatabaseService' {
  interface Todo {
    customSettings?: {
      workTime: number
      shortBreakTime: number
      longBreakTime: number
    }
  }
}
