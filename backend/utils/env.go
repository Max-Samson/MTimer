package utils

import (
	"bufio"
	"log"
	"os"
	"strings"
)

// LoadEnvFromFile 从指定文件中加载环境变量
func LoadEnvFromFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		// 如果文件不存在，不视为错误，仅记录日志
		if os.IsNotExist(err) {
			log.Printf("环境变量文件 %s 不存在，将使用系统环境变量", filename)
			return nil
		}
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		// 跳过空行和注释行
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// 分割键值对
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// 去除值两侧的引号
		value = strings.Trim(value, `"'`)

		// 如果环境变量未设置，则设置它
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	return nil
}
