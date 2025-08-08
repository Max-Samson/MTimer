package models

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// Todo 表示待办事项
type Todo struct {
	ID                 int64      `json:"id"`                  // 待办事项的唯一标识ID
	Name               string     `json:"name"`                // 待办事项名称
	Mode               int        `json:"mode"`                // 专注模式: 0=番茄工作法, 1=自定义专注模式
	Status             string     `json:"status"`              // 状态: pending=待处理, inProgress=进行中, completed=已完成
	CreatedAt          time.Time  `json:"created_at"`          // 创建时间
	UpdatedAt          time.Time  `json:"updated_at"`          // 最后更新时间
	EstimatedPomodoros int        `json:"estimated_pomodoros"` // 预计需要的番茄钟数量
	CustomSettings     string     `json:"custom_settings"`     // 自定义设置，JSON格式字符串
	CompletedAt        *time.Time `json:"completed_at"`        // 任务完成时间，未完成时为nil
}

// TodoRepository 提供对Todo表的操作
type TodoRepository struct{}

// NewTodoRepository 创建一个新的TodoRepository
func NewTodoRepository() *TodoRepository {
	return &TodoRepository{}
}

// GetAll 获取所有待办事项
func (r *TodoRepository) GetAll() ([]*Todo, error) {
	rows, err := DB.Query(`
		SELECT todo_id, name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings, completed_at
		FROM todos
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var todos []*Todo
	for rows.Next() {
		var todo Todo
		var createdAt, updatedAt string
		var completedAt sql.NullString
		var customSettings sql.NullString // 使用sql.NullString处理可能为NULL的字段

		err := rows.Scan(
			&todo.ID,
			&todo.Name,
			&todo.Mode,
			&todo.Status,
			&createdAt,
			&updatedAt,
			&todo.EstimatedPomodoros,
			&customSettings,
			&completedAt,
		)
		if err != nil {
			return nil, err
		}

		// 处理可能的日期解析错误
		todo.CreatedAt, err = time.Parse(time.RFC3339, createdAt)
		if err != nil {
			log.Printf("警告: 解析创建时间出错: %v, 原始值: %s", err, createdAt)
			todo.CreatedAt = time.Now() // 使用当前时间作为后备
		}

		todo.UpdatedAt, err = time.Parse(time.RFC3339, updatedAt)
		if err != nil {
			log.Printf("警告: 解析更新时间出错: %v, 原始值: %s", err, updatedAt)
			todo.UpdatedAt = time.Now() // 使用当前时间作为后备
		}

		// 处理完成时间
		if completedAt.Valid {
			parsedTime, err := time.Parse(time.RFC3339, completedAt.String)
			if err != nil {
				log.Printf("警告: 解析完成时间出错: %v, 原始值: %s", err, completedAt.String)
			} else {
				todo.CompletedAt = &parsedTime
			}
		}

		// 处理可能为NULL的customSettings
		if customSettings.Valid {
			todo.CustomSettings = customSettings.String
		} else {
			todo.CustomSettings = ""
		}

		todos = append(todos, &todo)
	}

	// 检查迭代过程中是否有错误
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return todos, nil
}

// Create 创建新的待办事项
func (r *TodoRepository) Create(todo *Todo) error {
	now := time.Now()
	todo.CreatedAt = now
	todo.UpdatedAt = now

	result, err := DB.Exec(`
		INSERT INTO todos (name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, todo.Name, todo.Mode, todo.Status, now.Format(time.RFC3339), now.Format(time.RFC3339),
		todo.EstimatedPomodoros, todo.CustomSettings)

	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	todo.ID = id
	return nil
}

// Update 更新已存在的待办事项
func (r *TodoRepository) Update(todo *Todo) error {
	// 更新更新时间
	todo.UpdatedAt = time.Now()

	_, err := DB.Exec(`
		UPDATE todos
		SET name = ?, mode = ?, status = ?, updated_at = ?, estimated_pomodoros = ?, custom_settings = ?
		WHERE todo_id = ?
	`, todo.Name, todo.Mode, todo.Status, todo.UpdatedAt.Format(time.RFC3339),
		todo.EstimatedPomodoros, todo.CustomSettings, todo.ID)

	if err != nil {
		return fmt.Errorf("更新待办事项失败: %w", err)
	}

	return nil
}

// UpdateStatus 更新待办事项状态
func (r *TodoRepository) UpdateStatus(id int64, status string) error {
	now := time.Now()

	// 如果任务标记为已完成，设置completed_at时间
	if status == "completed" {
		_, err := DB.Exec(`
			UPDATE todos
			SET status = ?, updated_at = ?, completed_at = ?
			WHERE todo_id = ?
		`, status, now.Format(time.RFC3339), now.Format(time.RFC3339), id)
		return err
	} else {
		// 如果任务状态不是已完成，则清除completed_at
		_, err := DB.Exec(`
			UPDATE todos
			SET status = ?, updated_at = ?, completed_at = NULL
			WHERE todo_id = ?
		`, status, now.Format(time.RFC3339), id)
		return err
	}
}

// Delete 删除待办事项
func (r *TodoRepository) Delete(id int64) error {
	_, err := DB.Exec(`DELETE FROM todos WHERE todo_id = ?`, id)
	return err
}

// GetByID 根据ID获取待办事项
func (r *TodoRepository) GetByID(id int64) (*Todo, error) {
	var todo Todo
	var createdAt, updatedAt string
	var completedAt sql.NullString
	var customSettings sql.NullString // 使用sql.NullString处理可能为NULL的字段

	err := DB.QueryRow(`
		SELECT todo_id, name, mode, status, created_at, updated_at, estimated_pomodoros, custom_settings, completed_at
		FROM todos
		WHERE todo_id = ?
	`, id).Scan(
		&todo.ID,
		&todo.Name,
		&todo.Mode,
		&todo.Status,
		&createdAt,
		&updatedAt,
		&todo.EstimatedPomodoros,
		&customSettings,
		&completedAt,
	)

	if err != nil {
		return nil, err
	}

	// 解析时间
	todo.CreatedAt, err = time.Parse(time.RFC3339, createdAt)
	if err != nil {
		log.Printf("警告: 解析创建时间出错: %v, 原始值: %s", err, createdAt)
		todo.CreatedAt = time.Now() // 使用当前时间作为后备
	}

	todo.UpdatedAt, err = time.Parse(time.RFC3339, updatedAt)
	if err != nil {
		log.Printf("警告: 解析更新时间出错: %v, 原始值: %s", err, updatedAt)
		todo.UpdatedAt = time.Now() // 使用当前时间作为后备
	}

	// 处理完成时间
	if completedAt.Valid {
		parsedTime, err := time.Parse(time.RFC3339, completedAt.String)
		if err != nil {
			log.Printf("警告: 解析完成时间出错: %v, 原始值: %s", err, completedAt.String)
		} else {
			todo.CompletedAt = &parsedTime
		}
	}

	// 处理可能为NULL的customSettings
	if customSettings.Valid {
		todo.CustomSettings = customSettings.String
	} else {
		todo.CustomSettings = ""
	}

	return &todo, nil
}
