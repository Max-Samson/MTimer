package types

// DailyTrendData 表示每日趋势数据
type DailyTrendData struct {
	Date              string `json:"date"`
	TotalFocusMinutes int    `json:"total_focus_minutes,omitempty"`
	PomodoroMinutes   int    `json:"pomodoro_minutes,omitempty"`
	CustomMinutes     int    `json:"custom_minutes,omitempty"`
	PomodoroCount     int    `json:"pomodoro_count,omitempty"`
	TomatoHarvests    int    `json:"tomato_harvests,omitempty"`
	CompletedTasks    int    `json:"completed_tasks,omitempty"`
}

// TimeDistribution 表示时间分布数据
type TimeDistribution struct {
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

// DailySummaryResponse 表示昨日小结数据的响应
type DailySummaryResponse struct {
	YesterdayStat StatResponse     `json:"yesterday_stat"`
	WeekTrend     []DailyTrendData `json:"week_trend"`
}

// EventStatsResponse 表示事件统计数据的响应
type EventStatsResponse struct {
	TotalEvents     int              `json:"total_events"`
	CompletedEvents int              `json:"completed_events"`
	CompletionRate  string           `json:"completion_rate"` // 百分比格式的字符串
	TrendData       []DailyTrendData `json:"trend_data"`
}

// PomodoroStatsResponse 表示番茄统计数据的响应
type PomodoroStatsResponse struct {
	TotalPomodoros   int                `json:"total_pomodoros"`
	BestDay          StatResponse       `json:"best_day"`
	TrendData        []DailyTrendData   `json:"trend_data"`
	TimeDistribution []TimeDistribution `json:"time_distribution"`
}
