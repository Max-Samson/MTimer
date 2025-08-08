package models

import (
	"database/sql"

	"MTimer/backend/database"
)

// DB 是从database包导入的数据库连接
var DB *sql.DB

// InitDatabase 初始化模型层的数据库连接
func InitDatabase() error {
	// 初始化数据库连接
	if err := database.InitDatabase(); err != nil {
		return err
	}

	// 获取数据库连接实例
	DB = database.DB
	return nil
}

// CloseDatabase 关闭数据库连接
func CloseDatabase() error {
	return database.CloseDatabase()
}
