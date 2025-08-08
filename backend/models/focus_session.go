package models

import (
	"database/sql"
	"time"
)

// FocusSession 代表专注时间记录
type FocusSession struct {
	ID        int64     `json:"time_id"`    // 专注会话的唯一标识ID
	TodoID    int64     `json:"todo_id"`    // 关联的待办事项ID
	StartTime time.Time `json:"start_time"` // 专注开始时间
	EndTime   time.Time `json:"end_time"`   // 专注结束时间，未结束时为零值
	BreakTime int       `json:"break_time"` // 休息时间，单位：分钟
	Duration  int       `json:"duration"`   // 实际专注时长，单位：分钟，不包括休息时间
	Mode      int       `json:"mode"`       // 专注模式: 0=番茄工作法(25分钟), 1=自定义专注模式
}

// FocusSessionRepository 提供对FocusSession表的操作
type FocusSessionRepository struct{}

// NewFocusSessionRepository 创建一个新的FocusSessionRepository
func NewFocusSessionRepository() *FocusSessionRepository {
	return &FocusSessionRepository{}
}

// Create 创建新的专注会话
func (r *FocusSessionRepository) Create(session *FocusSession) error {
	var endTimeStr interface{} = nil
	if !session.EndTime.IsZero() {
		endTimeStr = session.EndTime.Format(time.RFC3339)
	}

	result, err := DB.Exec(`
		INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		session.TodoID,
		session.StartTime.Format(time.RFC3339),
		endTimeStr,
		session.BreakTime,
		session.Duration,
		session.Mode,
	)

	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	session.ID = id
	return nil
}

// GetByTodoID 获取指定待办事项的所有专注会话
func (r *FocusSessionRepository) GetByTodoID(todoID int64) ([]FocusSession, error) {
	rows, err := DB.Query(`
		SELECT time_id, todo_id, start_time, end_time, break_time, duration, mode
		FROM focus_sessions
		WHERE todo_id = ?
		ORDER BY start_time DESC
	`, todoID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []FocusSession
	for rows.Next() {
		var session FocusSession
		var startTime, endTime string

		err := rows.Scan(
			&session.ID,
			&session.TodoID,
			&startTime,
			&endTime,
			&session.BreakTime,
			&session.Duration,
			&session.Mode,
		)

		if err != nil {
			return nil, err
		}

		session.StartTime, _ = time.Parse(time.RFC3339, startTime)
		session.EndTime, _ = time.Parse(time.RFC3339, endTime)
		sessions = append(sessions, session)
	}

	return sessions, nil
}

// StartSession 开始一个专注会话
func (r *FocusSessionRepository) StartSession(todoID int64, mode int) (*FocusSession, error) {
	now := time.Now()

	session := &FocusSession{
		TodoID:    todoID,
		StartTime: now,
		EndTime:   time.Time{}, // 空时间，表示尚未结束
		BreakTime: 0,
		Duration:  0,
		Mode:      mode,
	}

	result, err := DB.Exec(`
		INSERT INTO focus_sessions (todo_id, start_time, mode)
		VALUES (?, ?, ?)
	`,
		session.TodoID,
		session.StartTime.Format(time.RFC3339),
		session.Mode,
	)

	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	session.ID = id
	return session, nil
}

// CompleteSession 完成一个专注会话
func (r *FocusSessionRepository) CompleteSession(sessionID int64, breakTime int) error {
	now := time.Now()

	// 先获取开始时间
	var startTimeStr string
	err := DB.QueryRow(`
		SELECT start_time FROM focus_sessions WHERE time_id = ?
	`, sessionID).Scan(&startTimeStr)

	if err != nil {
		return err
	}

	startTime, err := time.Parse(time.RFC3339, startTimeStr)
	if err != nil {
		return err
	}

	// 计算持续时间（分钟）
	duration := int(now.Sub(startTime).Minutes()) - breakTime
	if duration < 0 {
		duration = 0
	}

	// 更新会话
	_, err = DB.Exec(`
		UPDATE focus_sessions
		SET end_time = ?, break_time = ?, duration = ?
		WHERE time_id = ?
	`,
		now.Format(time.RFC3339),
		breakTime,
		duration,
		sessionID,
	)

	return err
}

// GetUnfinishedSession 获取待办事项的未完成会话
func (r *FocusSessionRepository) GetUnfinishedSession(todoID int64) (*FocusSession, error) {
	var session FocusSession
	var startTime string

	err := DB.QueryRow(`
		SELECT time_id, todo_id, start_time, mode
		FROM focus_sessions
		WHERE todo_id = ? AND end_time IS NULL
		LIMIT 1
	`, todoID).Scan(&session.ID, &session.TodoID, &startTime, &session.Mode)

	if err != nil {
		if err == sql.ErrNoRows {
			// 没有找到未完成的会话，这不是错误
			return nil, nil
		}
		return nil, err
	}

	session.StartTime, _ = time.Parse(time.RFC3339, startTime)
	return &session, nil
}
