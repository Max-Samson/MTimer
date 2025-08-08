package main

import (
	"context"
	"log"

	"MTimer/backend/controllers"
	"MTimer/backend/controllers/types"
	"MTimer/backend/models"
	"MTimer/backend/utils"
)

// App struct
type App struct {
	ctx            context.Context
	todoController *controllers.TodoController
	statController *controllers.StatsController
	aiController   *controllers.AIController
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	log.Println("开始初始化应用...")

	// 加载.env文件
	if err := utils.LoadEnvFromFile(".env"); err != nil {
		log.Printf("加载.env文件失败: %v", err)
	}

	// 初始化数据库
	err := models.InitDatabase()
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	// 初始化控制器
	a.todoController = controllers.NewTodoController()
	a.statController = controllers.NewStatsController()
	a.aiController = controllers.NewAIController()

	log.Println("应用启动成功")
}

// OnShutdown is called when the app is closing
func (a *App) OnShutdown(ctx context.Context) {
	log.Println("应用正在关闭...")
	// 使用保存的上下文检查是否有取消信号
	select {
	case <-ctx.Done():
		log.Println("关闭过程被取消")
	default:
		// 继续关闭流程
	}

	// 关闭数据库连接
	if err := models.CloseDatabase(); err != nil {
		log.Printf("关闭数据库连接出错: %v", err)
	}
	log.Println("数据库连接已关闭")
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return "Hello " + name + "! Welcome to MTimer!"
}

// 待办事项相关API
func (a *App) GetAllTodos() ([]types.TodoItem, error) {
	log.Println("获取所有待办事项")
	return a.todoController.GetAllTodos()
}

func (a *App) CreateTodo(req types.CreateTodoRequest) (types.CreateTodoResponse, error) {
	log.Printf("创建待办事项: %s, 模式: %s", req.Name, req.Mode)
	return a.todoController.CreateTodo(req)
}

// UpdateTodo 更新待办事项
func (a *App) UpdateTodo(req types.UpdateTodoRequest) (types.BasicResponse, error) {
	log.Printf("更新待办事项, ID: %d, 名称: %s, 模式: %s", req.TodoID, req.Name, req.Mode)

	// 检查是否有自定义设置
	if req.CustomSettings != nil {
		log.Printf("待办事项自定义设置: 工作时间=%d分钟, 短休息=%d分钟, 长休息=%d分钟",
			req.CustomSettings.WorkTime,
			req.CustomSettings.ShortBreakTime,
			req.CustomSettings.LongBreakTime)
	}

	return a.todoController.UpdateTodo(req)
}

// UpdateTodoStatus 更新待办事项状态
func (a *App) UpdateTodoStatus(req types.UpdateTodoStatusRequest) (types.BasicResponse, error) {
	log.Printf("更新待办事项状态, ID: %d, 状态: %s", req.TodoID, req.Status)
	return a.todoController.UpdateTodoStatus(req)
}

func (a *App) DeleteTodo(id int64) (types.BasicResponse, error) {
	log.Printf("删除待办事项, ID: %d", id)
	return a.todoController.DeleteTodo(id)
}

// 专注会话相关API
func (a *App) StartFocusSession(req types.StartFocusSessionRequest) (types.StartFocusSessionResponse, error) {
	log.Printf("开始专注会话, 待办事项ID: %d, 模式: %d", req.TodoID, req.Mode)
	return a.todoController.StartFocusSession(req)
}

func (a *App) CompleteFocusSession(req types.CompleteFocusSessionRequest) (types.BasicResponse, error) {
	log.Printf("完成专注会话, 会话ID: %d, 休息时间: %d分钟, 标记完成: %v", req.SessionID, req.BreakTime, req.MarkAsCompleted)
	return a.todoController.CompleteFocusSession(req)
}

// 统计数据相关API
func (a *App) GetStats(req types.GetStatsRequest) ([]*types.StatResponse, error) {
	log.Printf("获取统计数据, 开始日期: %s, 结束日期: %s", req.StartDate, req.EndDate)
	return a.statController.GetStats(req)
}

func (a *App) UpdateStats(date string) (types.BasicResponse, error) {
	log.Printf("手动更新统计数据, 日期: %s", date)
	return a.statController.UpdateStats(date)
}

func (a *App) GetStatsSummary() (*types.StatSummary, error) {
	log.Println("获取统计摘要")
	return a.statController.GetSummary()
}

// GetDailySummary 获取昨日小结数据
func (a *App) GetDailySummary() (*types.DailySummaryResponse, error) {
	log.Println("获取昨日小结数据")
	return a.statController.GetDailySummary()
}

// GetEventStats 获取事件统计数据
func (a *App) GetEventStats(req types.GetStatsRequest) (*types.EventStatsResponse, error) {
	log.Println("获取事件统计数据:", req)
	// 调用统计控制器获取事件统计数据
	return a.statController.GetEventStats(req)
}

// GetPomodoroStats 获取番茄统计数据
func (a *App) GetPomodoroStats(req types.GetStatsRequest) (*types.PomodoroStatsResponse, error) {
	log.Printf("获取番茄统计数据, 开始日期: %s, 结束日期: %s", req.StartDate, req.EndDate)
	return a.statController.GetPomodoroStats(req)
}

// CallDeepSeekAPI 调用DeepSeek API
func (a *App) CallDeepSeekAPI(req types.DeepSeekAPIRequest) (*types.DeepSeekAPIResponse, error) {
	log.Printf("调用DeepSeek API, 消息数量: %d", len(req.Messages))
	return a.aiController.CallDeepSeekAPI(req)
}
