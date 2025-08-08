package models

import (
	"encoding/json"
	"fmt"
	"time"
)

// DailyStat 代表每日统计数据
type DailyStat struct {
	ID                 int64  `json:"stat_id"`              // 统计记录的唯一标识ID
	Date               string `json:"date"`                 // 日期，格式: YYYY-MM-DD
	PomodoroCount      int    `json:"pomodoro_count"`       // 番茄工作法模式的完成次数
	CustomCount        int    `json:"custom_count"`         // 自定义专注模式的完成次数
	TotalFocusSessions int    `json:"total_focus_sessions"` // 当日专注会话总数（番茄+自定义）
	PomodoroMinutes    int    `json:"pomodoro_minutes"`     // 番茄工作法专注总分钟数
	CustomMinutes      int    `json:"custom_minutes"`       // 自定义专注总分钟数
	TotalFocusMinutes  int    `json:"total_focus_minutes"`  // 当日专注总时长（分钟）
	TotalBreakMinutes  int    `json:"total_break_minutes"`  // 当日休息总时长（分钟）
	TomatoHarvests     int    `json:"tomato_harvests"`      // 番茄收获数（完成的番茄钟次数）
	TimeRanges         string `json:"time_ranges"`          // 当日专注时段分布，JSON格式字符串数组，例如：["09:00~09:25", "11:00~11:25"]
}

// DailyStatRepository 提供对DailyStat表的操作
type DailyStatRepository struct{}

// NewDailyStatRepository 创建一个新的DailyStatRepository
func NewDailyStatRepository() *DailyStatRepository {
	return &DailyStatRepository{}
}

// GetByDateRange 获取指定日期范围内的统计数据
func (r *DailyStatRepository) GetByDateRange(startDate, endDate string) ([]DailyStat, error) {
	rows, err := DB.Query(`
		SELECT
			stat_id, date, pomodoro_count, custom_count,
			total_focus_sessions, total_focus_minutes, total_break_minutes,
			tomato_harvests, time_ranges
		FROM daily_stats
		WHERE date BETWEEN ? AND ?
		ORDER BY date ASC
	`, startDate, endDate)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []DailyStat
	for rows.Next() {
		var stat DailyStat
		err := rows.Scan(
			&stat.ID,
			&stat.Date,
			&stat.PomodoroCount,
			&stat.CustomCount,
			&stat.TotalFocusSessions,
			&stat.TotalFocusMinutes,
			&stat.TotalBreakMinutes,
			&stat.TomatoHarvests,
			&stat.TimeRanges,
		)

		if err != nil {
			return nil, err
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// UpdateDailyStats 根据今天的专注会话更新每日统计数据
// 应该在每次专注会话结束时调用
func (r *DailyStatRepository) UpdateDailyStats(date string) error {
	// 获取指定日期的所有专注会话
	rows, err := DB.Query(`
		SELECT
			start_time, end_time, break_time, duration, mode
		FROM focus_sessions
		WHERE DATE(start_time) = ? AND end_time IS NOT NULL
	`, date)

	if err != nil {
		return err
	}
	defer rows.Close()

	var pomodoroCount, customCount, totalSessions int
	var pomodoroMinutes, customMinutes, totalFocusMinutes, totalBreakMinutes, tomatoHarvests int
	var timeRanges []string

	for rows.Next() {
		var startTime, endTime string
		var breakTime, duration, mode int

		err := rows.Scan(&startTime, &endTime, &breakTime, &duration, &mode)
		if err != nil {
			return err
		}

		// 解析时间
		start, _ := time.Parse(time.RFC3339, startTime)
		end, _ := time.Parse(time.RFC3339, endTime)

		// 根据模式计数和累计分钟数
		if mode == 0 {
			pomodoroCount++
			pomodoroMinutes += duration
			// 假设每个番茄时间为25分钟
			tomatoHarvests += duration / 25
		} else {
			customCount++
			customMinutes += duration
		}

		totalSessions++
		totalFocusMinutes += duration
		totalBreakMinutes += breakTime

		// 添加时间段
		startHour, startMin := start.Hour(), start.Minute()
		endHour, endMin := end.Hour(), end.Minute()
		timeRange := formatTimeRange(startHour, startMin, endHour, endMin)
		timeRanges = append(timeRanges, timeRange)
	}

	// 转换时间段为JSON
	timeRangesJSON, err := json.Marshal(timeRanges)
	if err != nil {
		return err
	}

	// 检查该日期是否已有记录
	var count int
	err = DB.QueryRow(`SELECT COUNT(*) FROM daily_stats WHERE date = ?`, date).Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		// 更新现有记录
		_, err = DB.Exec(`
			UPDATE daily_stats
			SET
				pomodoro_count = ?,
				custom_count = ?,
				total_focus_sessions = ?,
				pomodoro_minutes = ?,
				custom_minutes = ?,
				total_focus_minutes = ?,
				total_break_minutes = ?,
				tomato_harvests = ?,
				time_ranges = ?
			WHERE date = ?
		`,
			pomodoroCount,
			customCount,
			totalSessions,
			pomodoroMinutes,
			customMinutes,
			totalFocusMinutes,
			totalBreakMinutes,
			tomatoHarvests,
			string(timeRangesJSON),
			date,
		)
	} else {
		// 插入新记录
		_, err = DB.Exec(`
			INSERT INTO daily_stats (
				date, pomodoro_count, custom_count,
				total_focus_sessions, pomodoro_minutes, custom_minutes,
				total_focus_minutes, total_break_minutes,
				tomato_harvests, time_ranges
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			date,
			pomodoroCount,
			customCount,
			totalSessions,
			pomodoroMinutes,
			customMinutes,
			totalFocusMinutes,
			totalBreakMinutes,
			tomatoHarvests,
			string(timeRangesJSON),
		)
	}

	return err
}

// formatTimeRange 格式化时间范围为 "HH:MM~HH:MM" 格式
func formatTimeRange(startHour, startMin, endHour, endMin int) string {
	return fmt.Sprintf("%02d:%02d~%02d:%02d", startHour, startMin, endHour, endMin)
}
