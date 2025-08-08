package controllers

import (
	"encoding/json"
	"fmt"
	"time"

	"MTimer/backend/controllers/types"
	"MTimer/backend/models"
)

// TodoController 处理与待办事项和专注会话相关的请求
type TodoController struct {
	todoRepo         *models.TodoRepository
	focusSessionRepo *models.FocusSessionRepository
	dailyStatRepo    *models.DailyStatRepository
	eventStatRepo    *models.EventStatRepository
}

// NewTodoController 创建一个新的TodoController
func NewTodoController() *TodoController {
	return &TodoController{
		todoRepo:         models.NewTodoRepository(),
		focusSessionRepo: models.NewFocusSessionRepository(),
		dailyStatRepo:    models.NewDailyStatRepository(),
		eventStatRepo:    models.NewEventStatRepository(),
	}
}

// GetAllTodos 获取所有待办事项
func (c *TodoController) GetAllTodos() ([]types.TodoItem, error) {
	todos, err := c.todoRepo.GetAll()
	if err != nil {
		return nil, err
	}

	var todoItems []types.TodoItem
	for _, todo := range todos {
		item := types.TodoItem{
			ID:                 todo.ID,
			Name:               todo.Name,
			Mode:               todo.Mode,
			Status:             todo.Status,
			CreatedAt:          todo.CreatedAt.Format(time.RFC3339),
			UpdatedAt:          todo.UpdatedAt.Format(time.RFC3339),
			EstimatedPomodoros: todo.EstimatedPomodoros,
		}

		// 解析自定义设置
		if todo.CustomSettings != "" {
			var customSettings types.CustomSettings
			err := json.Unmarshal([]byte(todo.CustomSettings), &customSettings)
			if err == nil {
				item.CustomSettings = &customSettings
			} else {
				fmt.Printf("解析待办事项(%d)自定义设置失败: %v\n", todo.ID, err)
			}
		}

		todoItems = append(todoItems, item)
	}

	return todoItems, nil
}

// CreateTodo 创建一个新的待办事项
func (c *TodoController) CreateTodo(req types.CreateTodoRequest) (types.CreateTodoResponse, error) {
	if req.Name == "" {
		return types.CreateTodoResponse{
			Success: false,
			Message: "待办事项名称不能为空",
		}, fmt.Errorf("待办事项名称不能为空")
	}

	// 将字符串模式转换为整数
	var modeInt int
	switch req.Mode {
	case "pomodoro":
		modeInt = 1
	case "custom":
		modeInt = 2
	default:
		modeInt = 1 // 默认为番茄钟模式
	}

	todo := &models.Todo{
		Name:               req.Name,
		Mode:               modeInt,
		Status:             "pending", // 初始状态为待处理
		EstimatedPomodoros: req.EstimatedPomodoros,
		CustomSettings:     "", // 默认为空字符串
	}

	err := c.todoRepo.Create(todo)
	if err != nil {
		return types.CreateTodoResponse{
			Success: false,
			Message: "创建待办事项失败: " + err.Error(),
		}, err
	}

	return types.CreateTodoResponse{
		Success: true,
		Message: "创建待办事项成功",
		Todo: types.TodoItem{
			ID:                 todo.ID,
			Name:               todo.Name,
			Mode:               todo.Mode,
			Status:             todo.Status,
			CreatedAt:          todo.CreatedAt.Format(time.RFC3339),
			UpdatedAt:          todo.UpdatedAt.Format(time.RFC3339),
			EstimatedPomodoros: todo.EstimatedPomodoros,
		},
	}, nil
}

// UpdateTodoStatus 更新待办事项状态
func (c *TodoController) UpdateTodoStatus(req types.UpdateTodoStatusRequest) (types.BasicResponse, error) {
	err := c.todoRepo.UpdateStatus(req.TodoID, req.Status)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "更新待办事项状态失败: " + err.Error(),
		}, err
	}

	return types.BasicResponse{
		Success: true,
		Message: "更新待办事项状态成功",
	}, nil
}

// DeleteTodo 删除待办事项
func (c *TodoController) DeleteTodo(id int64) (types.BasicResponse, error) {
	err := c.todoRepo.Delete(id)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "删除待办事项失败: " + err.Error(),
		}, err
	}

	return types.BasicResponse{
		Success: true,
		Message: "删除待办事项成功",
	}, nil
}

// StartFocusSession 开始一个专注会话
func (c *TodoController) StartFocusSession(req types.StartFocusSessionRequest) (types.StartFocusSessionResponse, error) {
	// 首先获取待办事项
	todo, err := c.todoRepo.GetByID(req.TodoID)
	if err != nil {
		return types.StartFocusSessionResponse{
			Success: false,
			Message: "待办事项不存在: " + err.Error(),
		}, err
	}

	// 检查是否已有正在进行的会话
	existingSession, err := c.focusSessionRepo.GetUnfinishedSession(todo.ID)
	if err != nil {
		return types.StartFocusSessionResponse{
			Success: false,
			Message: "检查未完成会话失败: " + err.Error(),
		}, err
	}

	if existingSession != nil {
		return types.StartFocusSessionResponse{
			Success:   true,
			Message:   "已有正在进行的会话",
			SessionID: existingSession.ID,
		}, nil
	}

	// 更新待办事项状态为进行中
	err = c.todoRepo.UpdateStatus(todo.ID, "in_progress")
	if err != nil {
		return types.StartFocusSessionResponse{
			Success: false,
			Message: "更新待办事项状态失败: " + err.Error(),
		}, err
	}

	// 创建专注会话
	session, err := c.focusSessionRepo.StartSession(todo.ID, req.Mode)
	if err != nil {
		return types.StartFocusSessionResponse{
			Success: false,
			Message: "创建专注会话失败: " + err.Error(),
		}, err
	}

	return types.StartFocusSessionResponse{
		Success:   true,
		Message:   "创建专注会话成功",
		SessionID: session.ID,
	}, nil
}

// CompleteFocusSession 完成一个专注会话
func (c *TodoController) CompleteFocusSession(req types.CompleteFocusSessionRequest) (types.BasicResponse, error) {
	// 获取会话信息以获取todo_id
	var todoID int64
	err := models.DB.QueryRow(`
		SELECT todo_id FROM focus_sessions WHERE time_id = ?
	`, req.SessionID).Scan(&todoID)

	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "获取会话信息失败: " + err.Error(),
		}, err
	}

	// 完成专注会话
	err = c.focusSessionRepo.CompleteSession(req.SessionID, req.BreakTime)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "完成专注会话失败: " + err.Error(),
		}, err
	}

	// 更新待办事项状态为已完成
	if req.MarkAsCompleted {
		err = c.todoRepo.UpdateStatus(todoID, "completed")
		if err != nil {
			return types.BasicResponse{
				Success: false,
				Message: "更新待办事项状态失败: " + err.Error(),
			}, err
		}
	} else {
		// 检查是否还有其他未完成的会话
		existingSession, err := c.focusSessionRepo.GetUnfinishedSession(todoID)
		if err != nil {
			return types.BasicResponse{
				Success: false,
				Message: "检查未完成会话失败: " + err.Error(),
			}, err
		}

		// 如果没有其他未完成的会话，将待办事项状态更新为待处理
		if existingSession == nil {
			err = c.todoRepo.UpdateStatus(todoID, "pending")
			if err != nil {
				return types.BasicResponse{
					Success: false,
					Message: "更新待办事项状态失败: " + err.Error(),
				}, err
			}
		}
	}

	// 更新每日统计数据
	today := time.Now().Format("2006-01-02")
	err = c.dailyStatRepo.UpdateDailyStats(today)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "更新统计数据失败: " + err.Error(),
		}, err
	}

	// 更新任务历史统计数据
	err = c.eventStatRepo.UpdateEventStats(todoID, today)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "更新任务历史统计失败: " + err.Error(),
		}, err
	}

	return types.BasicResponse{
		Success: true,
		Message: "专注会话完成",
	}, nil
}

// GetStats方法已移至StatsController

// UpdateTodo 更新待办事项信息
func (c *TodoController) UpdateTodo(req types.UpdateTodoRequest) (types.BasicResponse, error) {
	if req.Name == "" {
		return types.BasicResponse{
			Success: false,
			Message: "待办事项名称不能为空",
		}, fmt.Errorf("待办事项名称不能为空")
	}

	// 先获取当前待办事项
	todo, err := c.todoRepo.GetByID(req.TodoID)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "获取待办事项失败: " + err.Error(),
		}, err
	}

	// 更新待办事项属性
	todo.Name = req.Name

	// 将字符串模式转换为整数
	var modeInt int
	switch req.Mode {
	case "pomodoro":
		modeInt = 1
	case "custom":
		modeInt = 2
	default:
		modeInt = 1 // 默认为番茄钟模式
	}
	todo.Mode = modeInt

	// 更新预计番茄数
	todo.EstimatedPomodoros = req.EstimatedPomodoros

	// 处理自定义设置
	if req.CustomSettings != nil {
		// 将自定义设置转换为JSON保存到数据库中
		customSettingsJSON, err := json.Marshal(req.CustomSettings)
		if err == nil {
			todo.CustomSettings = string(customSettingsJSON)
			// 记录日志
			fmt.Printf("已保存自定义设置: %s\n", string(customSettingsJSON))
		} else {
			fmt.Printf("序列化自定义设置失败: %v\n", err)
		}
	}

	// 更新待办事项
	err = c.todoRepo.Update(todo)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "更新待办事项失败: " + err.Error(),
		}, err
	}

	return types.BasicResponse{
		Success: true,
		Message: "更新待办事项成功",
	}, nil
}
