package main

import (
	"context"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"

	"MTimer/backend/controllers"
	"MTimer/backend/models"
)

// 注意：在独立的backend/main.go中，我们不需要embed前端资源
// 主程序的main.go会处理这部分

func main() {
	log.Println("开始初始化后端应用...")

	// 初始化数据库连接
	err := models.InitDatabase()
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	defer models.CloseDatabase()

	// 初始化应用控制器
	app := NewApp()

	// 创建应用程序
	err = wails.Run(&options.App{
		Title:            "MTimer",
		Width:            800,
		Height:           600,
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.OnShutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Fatalf("运行应用程序失败: %v", err)
	}
}

// App struct
type App struct {
	todoController *controllers.TodoController
	statController *controllers.StatsController
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		todoController: controllers.NewTodoController(),
		statController: controllers.NewStatsController(),
	}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	log.Println("应用启动成功")
}

// OnShutdown is called when the app is closing
func (a *App) OnShutdown(ctx context.Context) {
	log.Println("应用正在关闭...")

	// 使用上下文检查是否有取消信号
	select {
	case <-ctx.Done():
		log.Println("关闭过程被取消")
	default:
		// 继续关闭流程
	}

	log.Println("应用关闭完成")
}
