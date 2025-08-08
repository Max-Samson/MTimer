package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"MTimer/backend/controllers/types"
	"MTimer/backend/models"
)

// StatsController 处理统计数据相关的请求
type StatsController struct {
	dailyStatRepo    *models.DailyStatRepository
	focusSessionRepo *models.FocusSessionRepository
	eventStatRepo    *models.EventStatRepository
}

// NewStatsController 创建一个新的StatsController
func NewStatsController() *StatsController {
	return &StatsController{
		dailyStatRepo:    models.NewDailyStatRepository(),
		focusSessionRepo: models.NewFocusSessionRepository(),
		eventStatRepo:    models.NewEventStatRepository(),
	}
}

// GetStats 获取统计数据
func (c *StatsController) GetStats(req types.GetStatsRequest) ([]*types.StatResponse, error) {
	// 验证日期格式
	if req.StartDate == "" {
		// 默认为过去7天
		req.StartDate = time.Now().AddDate(0, 0, -7).Format("2006-01-02")
	}

	if req.EndDate == "" {
		// 默认为今天
		req.EndDate = time.Now().Format("2006-01-02")
	}

	// 获取统计数据
	stats, err := c.dailyStatRepo.GetByDateRange(req.StartDate, req.EndDate)
	if err != nil {
		return nil, err
	}

	var response []*types.StatResponse
	for _, stat := range stats {
		var timeRanges []string
		// 解析JSON字符串为字符串数组
		if err := json.Unmarshal([]byte(stat.TimeRanges), &timeRanges); err != nil {
			// 如果解析失败，使用空数组
			timeRanges = []string{}
		}

		response = append(response, &types.StatResponse{
			Date:               stat.Date,
			PomodoroCount:      stat.PomodoroCount,
			CustomCount:        stat.CustomCount,
			TotalFocusSessions: stat.TotalFocusSessions,
			PomodoroMinutes:    stat.PomodoroMinutes,
			CustomMinutes:      stat.CustomMinutes,
			TotalFocusMinutes:  stat.TotalFocusMinutes,
			TotalBreakMinutes:  stat.TotalBreakMinutes,
			TomatoHarvests:     stat.TomatoHarvests,
			TimeRanges:         timeRanges,
		})
	}

	return response, nil
}

// UpdateStats 手动更新指定日期的统计数据
func (c *StatsController) UpdateStats(date string) (types.BasicResponse, error) {
	// 如果未提供日期，使用今天的日期
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	err := c.dailyStatRepo.UpdateDailyStats(date)
	if err != nil {
		return types.BasicResponse{
			Success: false,
			Message: "更新统计数据失败: " + err.Error(),
		}, err
	}

	return types.BasicResponse{
		Success: true,
		Message: "统计数据更新成功",
	}, nil
}

// GetSummary 获取概要统计信息
func (c *StatsController) GetSummary() (*types.StatSummary, error) {
	// 获取总数据
	totalPomodoros, err := models.DB.Query(`
		SELECT COUNT(*) FROM focus_sessions WHERE mode = 0 AND end_time IS NOT NULL
	`)
	if err != nil {
		return nil, err
	}
	defer totalPomodoros.Close()

	var pomodoroCount int
	if totalPomodoros.Next() {
		err = totalPomodoros.Scan(&pomodoroCount)
		if err != nil {
			return nil, err
		}
	}

	// 获取总专注时间
	totalMinutes, err := models.DB.Query(`
		SELECT SUM(duration) FROM focus_sessions WHERE end_time IS NOT NULL
	`)
	if err != nil {
		return nil, err
	}
	defer totalMinutes.Close()

	var focusMinutes int
	if totalMinutes.Next() {
		err = totalMinutes.Scan(&focusMinutes)
		if err != nil {
			return nil, err
		}
	}

	// 获取连续专注天数
	today := time.Now().Format("2006-01-02")
	streakDays, err := c.calculateStreakDays(today)
	if err != nil {
		return nil, err
	}

	return &types.StatSummary{
		TotalPomodoroCount: pomodoroCount,
		TotalFocusMinutes:  focusMinutes,
		TotalFocusHours:    float64(focusMinutes) / 60.0,
		StreakDays:         streakDays,
	}, nil
}

// calculateStreakDays 计算连续专注天数
func (c *StatsController) calculateStreakDays(today string) (int, error) {
	// 从today开始向前查找连续的专注记录
	todayDate, err := time.Parse("2006-01-02", today)
	if err != nil {
		return 0, err
	}

	streak := 0
	for i := 0; i < 366; i++ { // 最多查找一年
		checkDate := todayDate.AddDate(0, 0, -i).Format("2006-01-02")

		// 检查该天是否有专注记录
		var count int
		err := models.DB.QueryRow(`
			SELECT COUNT(*) FROM focus_sessions
			WHERE DATE(start_time) = ? AND end_time IS NOT NULL
		`, checkDate).Scan(&count)

		if err != nil {
			return streak, err
		}

		if count > 0 {
			streak++
		} else {
			// 连续中断，结束计算
			break
		}
	}

	return streak, nil
}

// GetDailySummary 获取昨日小结数据
func (c *StatsController) GetDailySummary() (*types.DailySummaryResponse, error) {
	// 获取昨天的日期
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	// 获取昨天的统计数据
	stats, err := c.dailyStatRepo.GetByDateRange(yesterday, yesterday)
	if err != nil {
		return nil, err
	}

	// 如果昨天没有数据，返回空结果
	var yesterdayStat types.StatResponse
	if len(stats) > 0 {
		var timeRanges []string
		if err := json.Unmarshal([]byte(stats[0].TimeRanges), &timeRanges); err == nil {
			yesterdayStat = types.StatResponse{
				Date:               stats[0].Date,
				PomodoroCount:      stats[0].PomodoroCount,
				CustomCount:        stats[0].CustomCount,
				TotalFocusSessions: stats[0].TotalFocusSessions,
				PomodoroMinutes:    stats[0].PomodoroMinutes,
				CustomMinutes:      stats[0].CustomMinutes,
				TotalFocusMinutes:  stats[0].TotalFocusMinutes,
				TotalBreakMinutes:  stats[0].TotalBreakMinutes,
				TomatoHarvests:     stats[0].TomatoHarvests,
				TimeRanges:         timeRanges,
			}
		}
	}

	// 获取过去7天的日期范围
	oneWeekAgo := time.Now().AddDate(0, 0, -7).Format("2006-01-02")
	today := time.Now().Format("2006-01-02")

	// 获取7天内的每日统计
	weekStats, err := c.dailyStatRepo.GetByDateRange(oneWeekAgo, today)
	if err != nil {
		return nil, err
	}

	// 构建每日趋势数据
	var trendData []types.DailyTrendData
	for _, stat := range weekStats {
		// 获取该日期完成的任务数
		completedTasks := 0
		err := models.DB.QueryRow(`
			SELECT COUNT(DISTINCT event_id)
			FROM event_stats
			WHERE date = ? AND completed = 1
		`, stat.Date).Scan(&completedTasks)

		if err != nil {
			log.Printf("获取 %s 完成任务数失败: %v", stat.Date, err)
		}

		trendData = append(trendData, types.DailyTrendData{
			Date:              stat.Date,
			TotalFocusMinutes: stat.TotalFocusMinutes,
			PomodoroMinutes:   stat.PomodoroMinutes,
			CustomMinutes:     stat.CustomMinutes,
			PomodoroCount:     stat.PomodoroCount,
			TomatoHarvests:    stat.TomatoHarvests,
			CompletedTasks:    completedTasks,
		})
	}

	return &types.DailySummaryResponse{
		YesterdayStat: yesterdayStat,
		WeekTrend:     trendData,
	}, nil
}

// GetEventStats 获取事件统计数据
func (c *StatsController) GetEventStats(req types.GetStatsRequest) (*types.EventStatsResponse, error) {
	log.Printf("GetEventStats被调用，时间范围: %s 至 %s", req.StartDate, req.EndDate)

	// 验证日期格式
	if req.StartDate == "" {
		// 默认为过去7天
		req.StartDate = time.Now().AddDate(0, 0, -7).Format("2006-01-02")
		log.Printf("未提供起始日期，使用默认值: %s", req.StartDate)
	}

	if req.EndDate == "" {
		// 默认为今天
		req.EndDate = time.Now().Format("2006-01-02")
		log.Printf("未提供结束日期，使用默认值: %s", req.EndDate)
	}

	log.Printf("开始从数据库获取事件统计数据，日期范围: %s 至 %s", req.StartDate, req.EndDate)

	// 获取时间段内的事件统计
	eventStats, err := c.eventStatRepo.GetEventStatsByDateRange(req.StartDate, req.EndDate)
	if err != nil {
		log.Printf("获取事件统计出错: %v", err)
		// 返回空数据而不是错误
		return &types.EventStatsResponse{
			TotalEvents:     0,
			CompletedEvents: 0,
			CompletionRate:  "0%",
			TrendData:       []types.DailyTrendData{},
		}, nil
	}

	log.Printf("从数据库获取到 %d 条事件统计记录", len(eventStats))

	// 获取完成率统计
	completionStats, err := c.eventStatRepo.GetCompletionStats(req.StartDate, req.EndDate)
	if err != nil {
		log.Printf("获取完成率统计出错: %v", err)
		// 返回空数据而不是错误
		return &types.EventStatsResponse{
			TotalEvents:     0,
			CompletedEvents: 0,
			CompletionRate:  "0%",
			TrendData:       []types.DailyTrendData{},
		}, nil
	}

	// 按日期聚合工作量趋势
	trendMap := make(map[string]int)
	for _, stat := range eventStats {
		trendMap[stat.Date] += stat.TotalFocusTime
	}

	var trendData []types.DailyTrendData
	for date, minutes := range trendMap {
		trendData = append(trendData, types.DailyTrendData{
			Date:              date,
			TotalFocusMinutes: minutes,
		})
	}

	log.Printf("生成了 %d 个日期的趋势数据", len(trendData))

	// 如果completionStats为空，设置默认值
	totalEvents := 0
	completedEvents := 0
	completionRate := "0%"

	if val, ok := completionStats["total_events"]; ok && val != nil {
		totalEvents = val.(int)
	}

	if val, ok := completionStats["completed_events"]; ok && val != nil {
		completedEvents = val.(int)
	}

	if val, ok := completionStats["completion_rate"]; ok && val != nil {
		completionRate = val.(string)
	}

	// 如果没有数据，日志记录这个情况
	if totalEvents == 0 && len(trendData) == 0 {
		log.Printf("没有找到任何事件统计数据，返回空响应")
	} else {
		log.Printf("事件统计: 总事件=%d, 已完成=%d, 完成率=%s, 趋势数据条数=%d",
			totalEvents, completedEvents, completionRate, len(trendData))
	}

	response := &types.EventStatsResponse{
		TotalEvents:     totalEvents,
		CompletedEvents: completedEvents,
		CompletionRate:  completionRate,
		TrendData:       trendData,
	}

	// 将响应对象记录到日志，方便调试
	responseJSON, _ := json.Marshal(response)
	log.Printf("EventStats响应: %s", string(responseJSON))

	return response, nil
}

// GetPomodoroStats 获取番茄统计数据
func (c *StatsController) GetPomodoroStats(req types.GetStatsRequest) (*types.PomodoroStatsResponse, error) {
	// 验证日期格式
	if req.StartDate == "" {
		// 默认为过去30天
		req.StartDate = time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	}

	if req.EndDate == "" {
		// 默认为今天
		req.EndDate = time.Now().Format("2006-01-02")
	}

	// 获取时间段内的每日统计
	stats, err := c.dailyStatRepo.GetByDateRange(req.StartDate, req.EndDate)
	if err != nil {
		return nil, err
	}

	// 计算番茄总数和查找最佳专注日
	var totalPomodoros int
	var bestDay types.StatResponse

	for _, stat := range stats {
		totalPomodoros += stat.TomatoHarvests

		// 找出番茄数最多的一天
		if stat.TomatoHarvests > bestDay.TomatoHarvests {
			var timeRanges []string
			if err := json.Unmarshal([]byte(stat.TimeRanges), &timeRanges); err == nil {
				bestDay = types.StatResponse{
					Date:               stat.Date,
					PomodoroCount:      stat.PomodoroCount,
					CustomCount:        stat.CustomCount,
					TotalFocusSessions: stat.TotalFocusSessions,
					PomodoroMinutes:    stat.PomodoroMinutes,
					CustomMinutes:      stat.CustomMinutes,
					TotalFocusMinutes:  stat.TotalFocusMinutes,
					TotalBreakMinutes:  stat.TotalBreakMinutes,
					TomatoHarvests:     stat.TomatoHarvests,
					TimeRanges:         timeRanges,
				}
			}
		}
	}

	// 构建番茄趋势数据
	var trendData []types.DailyTrendData
	var timeDistribution []types.TimeDistribution

	// 时间分布统计
	hourDistribution := make(map[int]int)

	for _, stat := range stats {
		// 添加趋势数据
		trendData = append(trendData, types.DailyTrendData{
			Date:            stat.Date,
			PomodoroCount:   stat.PomodoroCount,
			TomatoHarvests:  stat.TomatoHarvests,
			PomodoroMinutes: stat.PomodoroMinutes,
		})

		// 解析时间段，统计各时间段的分布
		var timeRanges []string
		if err := json.Unmarshal([]byte(stat.TimeRanges), &timeRanges); err == nil {
			for _, timeRange := range timeRanges {
				// 假设时间格式为 "HH:MM~HH:MM"
				var startHour, startMin, endHour, endMin int
				_, err := fmt.Sscanf(timeRange, "%d:%d~%d:%d", &startHour, &startMin, &endHour, &endMin)
				if err == nil {
					// 按小时统计
					hourDistribution[startHour]++
				}
			}
		}
	}

	// 构建时间分布数据
	for hour, count := range hourDistribution {
		timeDistribution = append(timeDistribution, types.TimeDistribution{
			Hour:  hour,
			Count: count,
		})
	}

	return &types.PomodoroStatsResponse{
		TotalPomodoros:   totalPomodoros,
		BestDay:          bestDay,
		TrendData:        trendData,
		TimeDistribution: timeDistribution,
	}, nil
}
