package types

// BasicResponse 表示基本的操作响应
type BasicResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// CustomSettings 表示自定义专注模式的设置
type CustomSettings struct {
	WorkTime       int `json:"workTime"`
	ShortBreakTime int `json:"shortBreakTime"`
	LongBreakTime  int `json:"longBreakTime"`
}

// TodoItem 表示返回给前端的待办事项数据
type TodoItem struct {
	ID                 int64           `json:"todo_id"`
	Name               string          `json:"name"`
	Mode               int             `json:"mode"`
	Status             string          `json:"status"`
	CreatedAt          string          `json:"created_at"` // ISO 8601格式的时间字符串
	UpdatedAt          string          `json:"updated_at"` // ISO 8601格式的时间字符串
	EstimatedPomodoros int             `json:"estimatedPomodoros"`
	CustomSettings     *CustomSettings `json:"customSettings,omitempty"`
}

// CreateTodoRequest 表示创建待办事项的请求
type CreateTodoRequest struct {
	Name               string `json:"name"`
	Mode               string `json:"mode"`                         // 将模式改为字符串类型: "pomodoro" 或 "custom"
	EstimatedPomodoros int    `json:"estimatedPomodoros,omitempty"` // 预计番茄钟数量，仅对pomodoro模式有效
}

// CreateTodoResponse 表示创建待办事项的响应
type CreateTodoResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Todo    TodoItem `json:"todo"`
}

// UpdateTodoStatusRequest 表示更新待办事项状态的请求
type UpdateTodoStatusRequest struct {
	TodoID int64  `json:"todo_id"`
	Status string `json:"status"`
}

// UpdateTodoRequest 表示更新待办事项的请求
type UpdateTodoRequest struct {
	TodoID             int64           `json:"todo_id"`
	Name               string          `json:"name"`
	Mode               string          `json:"mode"`
	EstimatedPomodoros int             `json:"estimatedPomodoros,omitempty"`
	CustomSettings     *CustomSettings `json:"customSettings,omitempty"`
}

// StartFocusSessionRequest 表示开始专注会话的请求
type StartFocusSessionRequest struct {
	TodoID int64 `json:"todo_id"`
	Mode   int   `json:"mode"`
}

// StartFocusSessionResponse 表示开始专注会话的响应
type StartFocusSessionResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	SessionID int64  `json:"session_id"`
}

// CompleteFocusSessionRequest 表示完成专注会话的请求
type CompleteFocusSessionRequest struct {
	SessionID       int64 `json:"session_id"`
	BreakTime       int   `json:"break_time"`
	MarkAsCompleted bool  `json:"mark_as_completed"`
}

// GetStatsRequest 表示获取统计数据的请求
type GetStatsRequest struct {
	StartDate string `json:"start_date"` // 格式: YYYY-MM-DD
	EndDate   string `json:"end_date"`   // 格式: YYYY-MM-DD
}

// StatResponse 表示统计数据的响应
type StatResponse struct {
	Date               string   `json:"date"`
	PomodoroCount      int      `json:"pomodoro_count"`
	CustomCount        int      `json:"custom_count"`
	TotalFocusSessions int      `json:"total_focus_sessions"`
	PomodoroMinutes    int      `json:"pomodoro_minutes"`
	CustomMinutes      int      `json:"custom_minutes"`
	TotalFocusMinutes  int      `json:"total_focus_minutes"`
	TotalBreakMinutes  int      `json:"total_break_minutes"`
	TomatoHarvests     int      `json:"tomato_harvests"`
	TimeRanges         []string `json:"time_ranges"`
}

// StatSummary 表示统计摘要
type StatSummary struct {
	TotalPomodoroCount int     `json:"total_pomodoro_count"`
	TotalFocusMinutes  int     `json:"total_focus_minutes"`
	TotalFocusHours    float64 `json:"total_focus_hours"`
	StreakDays         int     `json:"streak_days"`
}
