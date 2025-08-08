import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import router from './router'
import {
  create,
  NButton,
  NIcon,
  NInput,
  NInputNumber,
  NProgress,
  NSwitch,
  NSpin,
  NEmpty,
  NModal,
  NRadioGroup,
  NRadio,
  NPopover,
  NTooltip,
  NSlider,
  NSelect,
  NConfigProvider,
  NMessageProvider,
  NTag,
  NText,
  NPopconfirm,
  NCard,
  NTabPane,
  NTabs,
  NMenu,
  NCollapse,
  NCollapseItem,
  NSpace,
  NTimePicker,
  NDatePicker,
  NList,
  NListItem,
  NThing,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NCheckbox,
  NCheckboxGroup,
  NColorPicker,
  NResult,
  NDivider,
  NScrollbar,
  NInputGroup,
  NAvatar,
  NSkeleton,
  NDropdown,
  NBadge,
  NDialogProvider,
  NLayout,
  NLayoutSider,
  NRadioButton,
  NAlert,
  NBackTop,
  NDataTable
} from 'naive-ui'
import { pinia } from './stores'
import { useTimerStore, useTodoStore } from './stores'
import { nextTick } from 'vue'
import type { Todo } from './services/DatabaseService'
import TestDataGenerator from './services/TestDataGenerator'
import mitt, { Emitter } from 'mitt'

// 定义事件类型
type Events = {
  'show-pomodoro-info': void;
  [key: string]: any;
}

// 导入全局样式
import './assets/styles/variables.css'
import './assets/styles/components.css'

const naive = create({
  components: [
    NButton,
    NIcon,
    NInput,
    NInputNumber,
    NProgress,
    NSwitch,
    NSpin,
    NEmpty,
    NModal,
    NRadioGroup,
    NRadio,
    NPopover,
    NTooltip,
    NSlider,
    NSelect,
    NConfigProvider,
    NMessageProvider,
    NTag,
    NText,
    NPopconfirm,
    NCard,
    NTabPane,
    NTabs,
    NMenu,
    NCollapse,
    NCollapseItem,
    NSpace,
    NTimePicker,
    NDatePicker,
    NList,
    NListItem,
    NThing,
    NDrawer,
    NDrawerContent,
    NForm,
    NFormItem,
    NCheckbox,
    NCheckboxGroup,
    NColorPicker,
    NResult,
    NDivider,
    NScrollbar,
    NInputGroup,
    NAvatar,
    NSkeleton,
    NDropdown,
    NBadge,
    NDialogProvider,
    NLayout,
    NLayoutSider,
    NRadioButton,
    NAlert,
    NBackTop,
    NDataTable
  ]
})
const app = createApp(App)

app.use(router)
app.use(naive)
app.use(pinia)

// 创建类型化的全局事件总线
const emitter: Emitter<Events> = mitt()
// 将事件总线添加到全局属性
app.config.globalProperties.emitter = emitter

// 应用程序挂载
app.mount('#app')

// 启用测试数据生成器，确保统计图表有数据展示
// 如果后端数据正常则使用真实数据，否则使用模拟数据
TestDataGenerator.mockBackendAPI()

// 应用程序初始化存储，在mounted后执行
const initStores = () => {
  const todoStore = useTodoStore()
  const timerStore = useTimerStore()

  console.log('初始化应用数据...')

  // 确保数据加载和UI同步
  Promise.all([
    todoStore.loadTodos(),
    timerStore.loadSettings()
  ]).then(() => {
    // 再次强制刷新UI
    nextTick(() => {
      // 对于Electron/Wails等桌面应用，可能需要延迟刷新
      console.log('应用程序初始化完成，数据已加载')

      // 为桌面应用设置智能刷新机制（避免干扰专注状态）
      if (typeof window.go !== 'undefined') {
        console.log('检测到桌面应用环境，启用智能刷新机制')

        // 替代定时刷新的监听机制
        window.addEventListener('visibilitychange', () => {
          // 仅在页面重新变为可见时刷新（用户切换回应用时）
          if (document.visibilityState === 'visible') {
            // 智能刷新，保留当前进行中的任务状态
            smartRefresh(todoStore, timerStore);
          }
        });

        // 首次加载后等待短暂时间再次刷新确保数据一致性
        setTimeout(() => {
          smartRefresh(todoStore, timerStore);
        }, 1000);
      }
    })
  }).catch(err => {
    console.error('数据初始化失败:', err)
  })
}

// 智能刷新数据，保留当前进行中的任务状态
const smartRefresh = async (
  todoStore: ReturnType<typeof useTodoStore>,
  timerStore: ReturnType<typeof useTimerStore>
) => {
  try {
    // 保存当前进行中任务的ID
    const currentTodoId = todoStore.currentTodo?.id;
    const isRunning = timerStore.isRunning;

    // 保存更多当前状态
    const currentTime = timerStore.time;
    const initialTime = timerStore.initialTime;
    const isBreak = timerStore.isBreak;
    const currentMode = timerStore.currentMode;

    // 打印更详细的状态信息
    console.log('智能刷新数据，当前状态:', {
      currentTodoId,
      isRunning,
      '当前任务': todoStore.currentTodo?.name || '无',
      '计时器状态': {
        currentTime,
        initialTime,
        isBreak,
        isRunning,
        currentMode
      }
    });

    // 如果没有正在进行的任务，或计时器未运行，则可以安全刷新
    if (!isRunning || !currentTodoId) {
      await todoStore.loadTodos();
      console.log('安全刷新完成 - 无进行中任务');
      return;
    }

    // 有进行中的任务，执行有选择性的刷新
    const allTodos = await todoStore.loadTodosWithoutApplying();

    // 将后端数据与前端合并，但保留当前进行中任务的状态
    if (allTodos && allTodos.length > 0) {
      // 对于进行中的任务，我们保留其所有状态
      const processedTodos = allTodos.map((todo: Todo) => {
        if (todo.id === currentTodoId) {
          // 保持当前任务的进行中状态以及所有相关属性
          const currentTodo = todoStore.currentTodo;
          return {
            ...todo,
            status: 'inProgress',
            completedPomodoros: currentTodo?.completedPomodoros || todo.completedPomodoros,
            totalFocusTime: currentTodo?.totalFocusTime || todo.totalFocusTime,
            mode: currentTodo?.mode || todo.mode,
            lastFocusTimestamp: Date.now()
          };
        }
        return todo;
      });

      // 更新状态但保留当前任务
      todoStore.updateTodosKeepingCurrentTask(processedTodos, currentTodoId)
        .then(() => {
          // 更新成功后，恢复计时器状态
          nextTick(() => {
            // 如果计时器正在运行，确保保持其状态
            if (isRunning) {
              // 恢复计时器状态
              timerStore.restoreTimerState({
                time: currentTime,
                initialTime: initialTime,
                isRunning: isRunning,
                isBreak: isBreak,
                currentMode: currentMode
              });

              console.log('已恢复计时器状态:', {
                time: currentTime,
                isRunning: isRunning,
                currentMode: currentMode
              });
            }

            console.log('智能刷新完成 - 保留了进行中任务的状态和计时器状态');
          });
        })
        .catch(error => {
          console.error('智能刷新时更新待办事项失败:', error);
        });
    }
  } catch (error) {
    console.error('智能刷新失败:', error);
  }
}

// 延迟执行初始化，确保应用程序已挂载
setTimeout(initStores, 300)

// 为桌面应用添加刷新快捷键
if (typeof window.go !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    // 按下F5或Ctrl+R时刷新数据
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault() // 阻止浏览器刷新
      const todoStore = useTodoStore()
      const timerStore = useTimerStore()

      console.log('手动刷新数据...')
      smartRefresh(todoStore, timerStore);
    }
  })
}
