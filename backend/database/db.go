package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"

	_ "github.com/mattn/go-sqlite3"
)

// DB 是应用程序使用的数据库连接
var DB *sql.DB

// getExecutableDir 获取可执行文件所在目录
func getExecutableDir() string {
	// 获取可执行文件路径
	execPath, err := os.Executable()
	if err != nil {
		log.Printf("获取可执行文件路径失败: %v，将使用当前目录", err)
		return "."
	}

	// 返回可执行文件所在目录
	return filepath.Dir(execPath)
}

// getUserDataDir 返回适用于当前操作系统的用户数据目录
// 此方法保留但不再使用，仅作为备用方案
func getUserDataDir() string {
	var dataDir string

	// 根据不同操作系统获取用户数据目录
	switch runtime.GOOS {
	case "windows":
		// Windows: %APPDATA%\MTimer
		dataDir = filepath.Join(os.Getenv("APPDATA"), "MTimer")
	case "darwin":
		// macOS: ~/Library/Application Support/MTimer
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Printf("获取用户主目录失败，使用当前目录: %v", err)
			return "storage" // 降级为当前目录下的storage
		}
		dataDir = filepath.Join(homeDir, "Library", "Application Support", "MTimer")
	case "linux":
		// Linux: ~/.config/MTimer
		homeDir, err := os.UserHomeDir()
		if err != nil {
			log.Printf("获取用户主目录失败，使用当前目录: %v", err)
			return "storage" // 降级为当前目录下的storage
		}
		dataDir = filepath.Join(homeDir, ".config", "MTimer")
	default:
		// 其他系统使用当前目录下的storage文件夹
		dataDir = "storage"
	}

	return dataDir
}

// InitDatabase 初始化数据库连接和表结构
func InitDatabase() error {
	// 获取可执行文件所在目录
	execDir := getExecutableDir()

	// 数据库文件路径 - 直接存放在exe所在目录
	dbPath := filepath.Join(execDir, "mtimer.db")
	log.Printf("数据库路径: %s", dbPath)

	// 检查是否有权限写入该目录
	testFile := filepath.Join(execDir, "test_write_permission.tmp")
	err := os.WriteFile(testFile, []byte("test"), 0644)
	if err != nil {
		log.Printf("警告: 无法写入可执行文件目录: %v", err)
		log.Printf("将使用用户数据目录作为备选")

		// 使用备选方案 - 用户数据目录
		dataDir := getUserDataDir()

		// 确保用户数据目录存在
		if _, err := os.Stat(dataDir); os.IsNotExist(err) {
			err = os.MkdirAll(dataDir, 0755)
			if err != nil {
				log.Printf("创建用户数据目录失败: %v，将使用当前目录的storage文件夹", err)
				dataDir = "storage"
				if _, err := os.Stat(dataDir); os.IsNotExist(err) {
					err = os.MkdirAll(dataDir, 0755)
					if err != nil {
						return fmt.Errorf("创建数据目录失败: %w", err)
					}
				}
			}
		}

		// 更新数据库路径为用户数据目录
		dbPath = filepath.Join(dataDir, "mtimer.db")
		log.Printf("已更改数据库路径: %s", dbPath)
	} else {
		// 清理测试文件
		os.Remove(testFile)
	}

	// 连接数据库，启用外键支持
	DB, err = sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return fmt.Errorf("打开数据库失败: %w", err)
	}

	// 设置连接池参数
	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	// 测试连接
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("数据库连接测试失败: %w", err)
	}

	// 启用外键约束
	_, err = DB.Exec("PRAGMA foreign_keys = ON")
	if err != nil {
		return fmt.Errorf("启用外键约束失败: %w", err)
	}

	// 创建表
	if err := createTables(); err != nil {
		return fmt.Errorf("创建表失败: %w", err)
	}

	log.Println("数据库初始化成功")
	return nil
}

// CloseDatabase 关闭数据库连接
func CloseDatabase() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}

// createTables 创建所有需要的表
func createTables() error {
	// 创建todos表
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS todos (
			todo_id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			mode INTEGER NOT NULL,
			status TEXT NOT NULL,
			created_at DATETIME NOT NULL,
			updated_at DATETIME NOT NULL,
			estimated_pomodoros INTEGER DEFAULT 1,
			custom_settings TEXT DEFAULT NULL,
			completed_at DATETIME DEFAULT NULL
		);
	`)
	if err != nil {
		return err
	}

	// 创建focus_sessions表
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS focus_sessions (
			time_id INTEGER PRIMARY KEY AUTOINCREMENT,
			todo_id INTEGER NOT NULL,
			start_time DATETIME NOT NULL,
			end_time DATETIME,
			break_time INTEGER DEFAULT 0,
			duration INTEGER DEFAULT 0,
			mode INTEGER NOT NULL,
			date DATE GENERATED ALWAYS AS (date(start_time)) STORED,
			FOREIGN KEY (todo_id) REFERENCES todos (todo_id) ON DELETE CASCADE
		);
	`)
	if err != nil {
		return err
	}

	// 创建daily_stats表
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS daily_stats (
			stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
			date DATE NOT NULL UNIQUE,
			pomodoro_count INTEGER DEFAULT 0,
			custom_count INTEGER DEFAULT 0,
			total_focus_sessions INTEGER DEFAULT 0,
			pomodoro_minutes INTEGER DEFAULT 0,
			custom_minutes INTEGER DEFAULT 0,
			total_focus_minutes INTEGER DEFAULT 0,
			total_break_minutes INTEGER DEFAULT 0,
			tomato_harvests INTEGER DEFAULT 0,
			time_ranges TEXT DEFAULT '[]'
		);
	`)
	if err != nil {
		return err
	}

	// 创建event_stats表 - 用于事件统计
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS event_stats (
			stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_id INTEGER NOT NULL,
			date DATE NOT NULL,
			focus_count INTEGER DEFAULT 0,
			total_focus_time INTEGER DEFAULT 0,
			mode INTEGER NOT NULL,
			completed INTEGER DEFAULT 0,
			UNIQUE(event_id, date)
		);
	`)
	if err != nil {
		return err
	}

	// 初始化测试数据
	if err := initTestData(); err != nil {
		log.Printf("初始化测试数据失败: %v", err)
		// 测试数据初始化失败不应该影响应用启动
	}

	return nil
}

// initTestData 初始化测试数据
func initTestData() error {
	// 检查是否已经有待办事项数据
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM todos").Scan(&count)
	if err != nil {
		return fmt.Errorf("检查待办事项数据失败: %w", err)
	}

	// 如果已有待办事项，不再添加测试数据
	if count > 0 {
		log.Println("已存在待办事项数据，跳过测试数据初始化")
		return nil
	}

	log.Println("开始初始化测试数据...")

	// 开始事务
	tx, err := DB.Begin()
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback()

	// 1. 添加测试待办事项
	testTodos := []struct {
		name               string
		mode               int // 0: pomodoro, 1: custom
		status             string
		estimatedPomodoros int
		completedAt        string // 为空表示未完成
	}{
		{"完成开发文档报告", 0, "completed", 5, ""},
		{"学习Vue.js基础", 0, "completed", 3, "2025-04-22 16:45:00"},
		{"阅读技术文档", 1, "completed", 2, "2025-04-21 10:15:00"},
		{"准备演讲材料", 0, "pending", 4, ""},
		{"重构代码模块", 1, "pending", 6, ""},
		{"修复UI界面bug", 0, "completed", 2, "2025-04-23 14:20:00"},
		{"学习TypeScript", 1, "pending", 8, ""},
		{"编写单元测试", 0, "completed", 3, "2025-04-24 11:00:00"},
		{"开发新功能", 1, "completed", 7, "2025-04-24 17:30:00"},
		{"Code Review", 0, "pending", 2, ""},
	}

	for _, todo := range testTodos {
		// 添加待办事项
		var todoId int64
		var stmt *sql.Stmt

		if todo.completedAt == "" {
			// 未完成的待办事项
			stmt, err = tx.Prepare(`
				INSERT INTO todos (name, mode, status, created_at, updated_at, estimated_pomodoros)
				VALUES (?, ?, ?, datetime('now', '-7 days'), datetime('now'), ?)
			`)
			if err != nil {
				return fmt.Errorf("准备插入待办事项SQL失败: %w", err)
			}

			res, err := stmt.Exec(todo.name, todo.mode, todo.status, todo.estimatedPomodoros)
			if err != nil {
				stmt.Close()
				return fmt.Errorf("插入待办事项失败: %w", err)
			}

			todoId, err = res.LastInsertId()
			stmt.Close()
			if err != nil {
				return fmt.Errorf("获取待办事项ID失败: %w", err)
			}
		} else {
			// 已完成的待办事项
			stmt, err = tx.Prepare(`
				INSERT INTO todos (name, mode, status, created_at, updated_at, estimated_pomodoros, completed_at)
				VALUES (?, ?, ?, datetime('now', '-7 days'), datetime('now'), ?, ?)
			`)
			if err != nil {
				return fmt.Errorf("准备插入已完成待办事项SQL失败: %w", err)
			}

			res, err := stmt.Exec(todo.name, todo.mode, todo.status, todo.estimatedPomodoros, todo.completedAt)
			if err != nil {
				stmt.Close()
				return fmt.Errorf("插入已完成待办事项失败: %w", err)
			}

			todoId, err = res.LastInsertId()
			stmt.Close()
			if err != nil {
				return fmt.Errorf("获取已完成待办事项ID失败: %w", err)
			}
		}

		// 2. 为每个待办事项添加专注会话
		// 如果是已完成的待办事项，添加相应数量的已完成专注会话
		if todo.completedAt != "" {
			// 为已完成的待办事项添加专注会话
			for i := 0; i < todo.estimatedPomodoros; i++ {
				// 生成随机的日期时间，在过去7天内
				dayOffset := -i % 7 // 分散在过去7天
				hour := 9 + (i % 8) // 9点到16点之间

				// 生成丰富的专注时长，范围在20-30分钟之间
				focusDuration := 25
				if i%3 == 0 {
					focusDuration = 30
				} else if i%3 == 1 {
					focusDuration = 20
				}

				stmt, err = tx.Prepare(`
					INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode)
					VALUES (?, datetime('now', ? || ' days', ? || ' hours'), datetime('now', ? || ' days', ? || ' hours', '+' || ? || ' minutes'), 5, ?, ?)
				`)
				if err != nil {
					return fmt.Errorf("准备插入专注会话SQL失败: %w", err)
				}

				_, err = stmt.Exec(todoId, dayOffset, hour, dayOffset, hour, focusDuration, focusDuration, todo.mode)
				stmt.Close()
				if err != nil {
					return fmt.Errorf("插入专注会话失败: %w", err)
				}
			}
		} else {
			// 为未完成的待办事项添加一些进行中或已完成的专注会话
			completedPomodoros := todo.estimatedPomodoros / 2 // 完成一半

			for i := 0; i < completedPomodoros; i++ {
				dayOffset := -i % 7 // 分散在过去7天
				hour := 9 + (i % 8) // 9点到16点之间

				// 生成丰富的专注时长，范围在20-30分钟之间
				focusDuration := 25
				if i%3 == 0 {
					focusDuration = 28
				} else if i%3 == 1 {
					focusDuration = 22
				}

				stmt, err = tx.Prepare(`
					INSERT INTO focus_sessions (todo_id, start_time, end_time, break_time, duration, mode)
					VALUES (?, datetime('now', ? || ' days', ? || ' hours'), datetime('now', ? || ' days', ? || ' hours', '+' || ? || ' minutes'), 5, ?, ?)
				`)
				if err != nil {
					return fmt.Errorf("准备插入未完成待办事项的专注会话SQL失败: %w", err)
				}

				_, err = stmt.Exec(todoId, dayOffset, hour, dayOffset, hour, focusDuration, focusDuration, todo.mode)
				stmt.Close()
				if err != nil {
					return fmt.Errorf("插入未完成待办事项的专注会话失败: %w", err)
				}
			}
		}
	}

	// 3. 为过去7天生成每日统计数据
	for i := 0; i < 7; i++ {
		// 随机生成一些统计数据
		pomodoroCount := 5 + (i % 5) // 5-9个番茄钟
		customCount := 2 + (i % 3)   // 2-4个自定义专注
		totalSessions := pomodoroCount + customCount
		pomodoroMinutes := pomodoroCount * 25
		customMinutes := customCount * 30
		totalFocusMinutes := pomodoroMinutes + customMinutes
		breakMinutes := totalSessions * 5
		// 确保番茄收成数据足够丰富，且至少大于0
		tomatoHarvests := pomodoroCount - (i % 2) // 大部分番茄钟都有收成
		if tomatoHarvests <= 0 {
			tomatoHarvests = 3 // 至少有3个收成
		}

		// 生成时间范围JSON字符串
		timeRanges := make([]string, 0)
		morningHours := []int{9, 10, 11}
		afternoonHours := []int{14, 15, 16, 17}

		for _, hour := range morningHours {
			if i%2 == 0 || hour == 10 { // 确保至少有一个上午的时间段
				timeRanges = append(timeRanges, fmt.Sprintf("%02d:00~%02d:25", hour, hour))
			}
		}

		for _, hour := range afternoonHours {
			if i%2 == 1 || hour == 15 { // 确保至少有一个下午的时间段
				timeRanges = append(timeRanges, fmt.Sprintf("%02d:00~%02d:25", hour, hour))
			}
		}

		// 使用Go的字符串连接方式构建JSON数组
		timeRangesStr := "["
		for idx, tr := range timeRanges {
			if idx > 0 {
				timeRangesStr += ","
			}
			timeRangesStr += "\"" + tr + "\""
		}
		timeRangesStr += "]"

		stmt, err := tx.Prepare(`
			INSERT INTO daily_stats (date, pomodoro_count, custom_count, total_focus_sessions,
				pomodoro_minutes, custom_minutes, total_focus_minutes, total_break_minutes,
				tomato_harvests, time_ranges)
			VALUES (date('now', ? || ' days'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`)
		if err != nil {
			return fmt.Errorf("准备插入每日统计SQL失败: %w", err)
		}

		_, err = stmt.Exec(-i, pomodoroCount, customCount, totalSessions,
			pomodoroMinutes, customMinutes, totalFocusMinutes, breakMinutes,
			tomatoHarvests, timeRangesStr)
		stmt.Close()
		if err != nil {
			return fmt.Errorf("插入每日统计失败: %w", err)
		}
	}

	// 4. 生成事件统计数据
	for todoId := 1; todoId <= len(testTodos); todoId++ {
		// 为每个待办事项在过去几天中生成统计数据
		for i := 0; i < 7; i++ { // 增加到7天确保有足够的日期数据
			// 确保每个待办事项都有每天的数据
			mode := 0
			if todoId%2 == 0 {
				mode = 1 // 偶数ID使用自定义模式
			}

			// 生成随机的专注次数和时间数据
			focusCount := 1 + (todoId+i)%5                 // 1-5次专注
			focusTime := focusCount * (20 + (todoId % 10)) // 每次20-30分钟不等

			// 随机决定是否完成
			completed := 0
			if i < 3 || (todoId+i)%4 == 0 { // 增加更多已完成的数据
				completed = 1
			}

			stmt, err := tx.Prepare(`
				INSERT INTO event_stats (event_id, date, focus_count, total_focus_time, mode, completed)
				VALUES (?, date('now', ? || ' days'), ?, ?, ?, ?)
			`)
			if err != nil {
				return fmt.Errorf("准备插入事件统计SQL失败: %w", err)
			}

			_, err = stmt.Exec(todoId, -i, focusCount, focusTime, mode, completed)
			stmt.Close()
			if err != nil {
				return fmt.Errorf("插入事件统计失败: %w", err)
			}
		}
	}

	// 提交事务
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}

	log.Println("测试数据初始化完成")
	return nil
}
