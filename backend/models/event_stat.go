package models

import (
	"database/sql"
	"fmt"
)

// EventStat 表示任务历史统计数据
type EventStat struct {
	StatID         int64  `json:"stat_id"`          // 事件统计记录的唯一标识ID
	EventID        int64  `json:"event_id"`         // 对应的待办事项ID（todos表中的todo_id）
	Date           string `json:"date"`             // 统计日期，格式：YYYY-MM-DD
	FocusCount     int    `json:"focus_count"`      // 该待办事项在当天的专注次数
	TotalFocusTime int    `json:"total_focus_time"` // 该待办事项在当天的累计专注时长（分钟）
	Mode           int    `json:"mode"`             // 专注模式: 0=番茄工作法, 1=自定义专注模式
	Completed      bool   `json:"completed"`        // 该待办事项在当天是否已完成
}

// EventStatRepository 提供对EventStat表的操作
type EventStatRepository struct{}

// NewEventStatRepository 创建一个新的EventStatRepository
func NewEventStatRepository() *EventStatRepository {
	return &EventStatRepository{}
}

// UpdateEventStats 更新指定日期和任务的统计数据
func (r *EventStatRepository) UpdateEventStats(todoID int64, date string) error {
	// 获取任务信息
	var mode int
	var status string
	var isCompleted bool

	err := DB.QueryRow(`
		SELECT mode, status FROM todos WHERE todo_id = ?
	`, todoID).Scan(&mode, &status)

	if err != nil {
		return err
	}

	isCompleted = (status == "completed")

	// 获取该任务在指定日期的专注会话数据
	rows, err := DB.Query(`
		SELECT COUNT(*), SUM(duration)
		FROM focus_sessions
		WHERE todo_id = ? AND DATE(start_time) = ? AND end_time IS NOT NULL
	`, todoID, date)

	if err != nil {
		return err
	}
	defer rows.Close()

	var focusCount, totalFocusTime int
	if rows.Next() {
		var sumDuration *int // 使用指针以处理NULL值
		if err := rows.Scan(&focusCount, &sumDuration); err != nil {
			return err
		}

		if sumDuration != nil {
			totalFocusTime = *sumDuration
		}
	}

	// 检查是否已有记录
	var count int
	err = DB.QueryRow(`
		SELECT COUNT(*) FROM event_stats
		WHERE event_id = ? AND date = ?
	`, todoID, date).Scan(&count)

	if err != nil {
		return err
	}

	// 插入或更新记录
	if count > 0 {
		_, err = DB.Exec(`
			UPDATE event_stats
			SET focus_count = ?, total_focus_time = ?, mode = ?, completed = ?
			WHERE event_id = ? AND date = ?
		`, focusCount, totalFocusTime, mode, isCompleted, todoID, date)
	} else if focusCount > 0 {
		// 只有在有专注记录时才创建统计记录
		_, err = DB.Exec(`
			INSERT INTO event_stats (event_id, date, focus_count, total_focus_time, mode, completed)
			VALUES (?, ?, ?, ?, ?, ?)
		`, todoID, date, focusCount, totalFocusTime, mode, isCompleted)
	}

	return err
}

// GetEventStatsByDateRange 获取指定日期范围内的任务统计数据
func (r *EventStatRepository) GetEventStatsByDateRange(startDate, endDate string) ([]EventStat, error) {
	// 调试函数，打印当前数据库中的所有事件统计记录
	r.debugPrintAllEventStats()

	// 查询实际的待办事项总数
	var totalTodos int
	err := DB.QueryRow(`SELECT COUNT(*) FROM todos`).Scan(&totalTodos)
	if err != nil {
		fmt.Printf("获取待办事项总数失败: %v\n", err)
	} else {
		fmt.Printf("数据库中实际的待办事项总数: %d\n", totalTodos)
	}

	rows, err := DB.Query(`
		SELECT event_id, date, focus_count, total_focus_time, mode, completed
		FROM event_stats
		WHERE date BETWEEN ? AND ?
		ORDER BY date ASC, event_id ASC
	`, startDate, endDate)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []EventStat
	for rows.Next() {
		var stat EventStat
		err := rows.Scan(
			&stat.EventID,
			&stat.Date,
			&stat.FocusCount,
			&stat.TotalFocusTime,
			&stat.Mode,
			&stat.Completed,
		)

		if err != nil {
			return nil, err
		}

		stats = append(stats, stat)
	}

	// 记录返回的结果条数
	fmt.Printf("查询到 %d 条事件统计记录，日期范围: %s - %s\n", len(stats), startDate, endDate)
	return stats, nil
}

// debugPrintAllEventStats 打印所有事件统计记录的调试函数
func (r *EventStatRepository) debugPrintAllEventStats() {
	fmt.Println("===== 调试: 打印所有事件统计记录 =====")

	// 获取表中记录总数
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM event_stats").Scan(&count)
	if err != nil {
		fmt.Printf("获取记录总数失败: %v\n", err)
		return
	}

	fmt.Printf("事件统计表中共有 %d 条记录\n", count)

	if count == 0 {
		fmt.Println("事件统计表为空，请先完成一些任务记录")
		return
	}

	// 限制只打印最多10条记录，避免日志过多
	rows, err := DB.Query(`
		SELECT event_id, date, focus_count, total_focus_time, mode, completed
		FROM event_stats
		ORDER BY date DESC, event_id ASC
		LIMIT 10
	`)

	if err != nil {
		fmt.Printf("查询记录失败: %v\n", err)
		return
	}
	defer rows.Close()

	fmt.Println("最近10条事件统计记录:")
	fmt.Println("ID\t日期\t\t专注次数\t总时长(分钟)\t模式\t是否完成")
	fmt.Println("--------------------------------------------------------------------")

	for rows.Next() {
		var stat EventStat
		err := rows.Scan(
			&stat.EventID,
			&stat.Date,
			&stat.FocusCount,
			&stat.TotalFocusTime,
			&stat.Mode,
			&stat.Completed,
		)

		if err != nil {
			fmt.Printf("扫描记录失败: %v\n", err)
			continue
		}

		// 输出记录信息
		modeStr := "自定义"
		if stat.Mode == 1 {
			modeStr = "番茄"
		}

		completedStr := "否"
		if stat.Completed {
			completedStr = "是"
		}

		fmt.Printf("%d\t%s\t%d\t\t%d\t\t%s\t%s\n",
			stat.EventID, stat.Date, stat.FocusCount, stat.TotalFocusTime, modeStr, completedStr)
	}

	fmt.Println("===== 调试结束 =====")
}

// GetEventStatsForTodo 获取指定任务的统计数据
func (r *EventStatRepository) GetEventStatsForTodo(todoID int64, startDate, endDate string) ([]EventStat, error) {
	rows, err := DB.Query(`
		SELECT event_id, date, focus_count, total_focus_time, mode, completed
		FROM event_stats
		WHERE event_id = ? AND date BETWEEN ? AND ?
		ORDER BY date ASC
	`, todoID, startDate, endDate)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []EventStat
	for rows.Next() {
		var stat EventStat
		err := rows.Scan(
			&stat.EventID,
			&stat.Date,
			&stat.FocusCount,
			&stat.TotalFocusTime,
			&stat.Mode,
			&stat.Completed,
		)

		if err != nil {
			return nil, err
		}

		stats = append(stats, stat)
	}

	return stats, nil
}

// GetCompletionStats 获取指定日期范围内的完成率统计
func (r *EventStatRepository) GetCompletionStats(startDate, endDate string) (map[string]interface{}, error) {
	// 获取所有活跃的待办事项（在指定日期范围内有统计记录的事项）
	var activeEventIds []int64
	rows, err := DB.Query(`
		SELECT DISTINCT event_id
		FROM event_stats
		WHERE date BETWEEN ? AND ?
	`, startDate, endDate)

	if err != nil {
		return nil, fmt.Errorf("获取活跃事项ID失败: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var eventId int64
		if err := rows.Scan(&eventId); err != nil {
			return nil, err
		}
		activeEventIds = append(activeEventIds, eventId)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	// 获取活跃事项的总数量
	totalEvents := len(activeEventIds)
	if totalEvents == 0 {
		return map[string]interface{}{
			"total_events":     0,
			"completed_events": 0,
			"completion_rate":  "0.00%",
		}, nil
	}

	// 计算已完成的事项数量（查询todos表获取真实状态）
	completedEvents := 0

	for _, eventId := range activeEventIds {
		var status string
		err := DB.QueryRow(`
			SELECT status
			FROM todos
			WHERE todo_id = ?
		`, eventId).Scan(&status)

		if err != nil {
			if err == sql.ErrNoRows {
				// 如果待办事项不存在，则跳过
				continue
			}
			return nil, fmt.Errorf("查询待办事项状态失败: %w", err)
		}

		if status == "completed" {
			completedEvents++
		}
	}

	// 计算完成率
	completionRate := 0.0
	if totalEvents > 0 {
		completionRate = float64(completedEvents) / float64(totalEvents) * 100
	}

	return map[string]interface{}{
		"total_events":     totalEvents,
		"completed_events": completedEvents,
		"completion_rate":  fmt.Sprintf("%.2f%%", completionRate),
	}, nil
}
