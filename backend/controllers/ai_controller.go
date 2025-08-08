package controllers

import (
	"MTimer/backend/controllers/types"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
)

// AIController 处理AI相关的请求
type AIController struct {
	apiKey     string
	apiBaseURL string
}

// NewAIController 创建一个新的AI控制器实例
func NewAIController() *AIController {
	// 从环境变量获取API密钥
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	if apiKey == "" {
		log.Println("警告: DEEPSEEK_API_KEY环境变量未设置，使用测试模式")
	}

	return &AIController{
		apiKey:     apiKey,
		apiBaseURL: "https://api.deepseek.com/v1/chat/completions",
	}
}

// CallDeepSeekAPI 调用DeepSeek API并处理响应
func (c *AIController) CallDeepSeekAPI(req types.DeepSeekAPIRequest) (*types.DeepSeekAPIResponse, error) {
	// 如果未提供模型，使用默认模型
	if req.Model == "" {
		req.Model = "deepseek-chat"
	}

	// 使用API密钥，优先使用请求中的API密钥
	apiKey := c.apiKey
	if req.ApiKey != "" {
		apiKey = req.ApiKey
		log.Println("使用请求中提供的API密钥")
	}

	// 检查API密钥是否为空
	if apiKey == "" {
		log.Println("API密钥未设置，使用模拟响应")
		return c.getMockResponse(req)
	}

	// 准备请求数据
	// 创建新的请求对象，不包含ApiKey字段
	apiReq := types.DeepSeekAPIRequest{
		Model:    req.Model,
		Messages: req.Messages,
		Stream:   req.Stream,
	}
	jsonData, err := json.Marshal(apiReq)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %v", err)
	}

	// 创建HTTP请求
	httpReq, err := http.NewRequest("POST", c.apiBaseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("创建HTTP请求失败: %v", err)
	}

	// 设置请求头
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	// 发送请求
	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("发送请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API请求失败，状态码: %d, 错误: %s", resp.StatusCode, string(body))
	}

	// 解析响应
	var apiResp types.DeepSeekAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %v", err)
	}

	// 提取和处理任务数据
	c.processTaskData(&apiResp)

	return &apiResp, nil
}

// processTaskData 从响应中提取任务数据
func (c *AIController) processTaskData(resp *types.DeepSeekAPIResponse) {
	// 确保存在有效的选择
	if len(resp.Choices) == 0 || resp.Choices[0].Message.Content == "" {
		return
	}

	// 尝试从消息内容中提取JSON任务数据
	content := resp.Choices[0].Message.Content
	taskData := c.extractTaskDataFromContent(content)

	// 如果成功提取了任务数据，可以在这里进行额外处理
	if len(taskData) > 0 {
		log.Printf("成功提取任务数据，任务数量: %d", len(taskData))
	}
}

// extractTaskDataFromContent 从消息内容中提取任务数据
func (c *AIController) extractTaskDataFromContent(content string) []types.TaskPlan {
	// 使用正则表达式查找JSON代码块
	re := regexp.MustCompile("```json\\s*([\\s\\S]*?)\\s*```")
	matches := re.FindStringSubmatch(content)

	var jsonStr string
	if len(matches) < 2 {
		// 如果没有找到JSON代码块，尝试直接查找任务数据
		re = regexp.MustCompile("{\\s*\"tasks\"\\s*:\\s*\\[(.*?)\\]\\s*}")
		matches = re.FindStringSubmatch(content)
		if len(matches) < 1 {
			return nil
		}
		jsonStr = "{\"tasks\":[" + matches[1] + "]}"
	} else {
		// 提取JSON字符串
		jsonStr = matches[1]
		if !strings.Contains(jsonStr, "tasks") {
			jsonStr = fmt.Sprintf(`{"tasks": [%s]}`, jsonStr)
		}
	}

	// 解析JSON
	var taskData struct {
		Tasks []types.TaskPlan `json:"tasks"`
	}
	if err := json.Unmarshal([]byte(jsonStr), &taskData); err != nil {
		log.Printf("解析任务数据JSON失败: %v", err)
		return nil
	}

	return taskData.Tasks
}

// getMockResponse 生成模拟响应用于测试
func (c *AIController) getMockResponse(req types.DeepSeekAPIRequest) (*types.DeepSeekAPIResponse, error) {
	// 分析用户最后一条消息，用于日志记录
	if len(req.Messages) > 0 {
		log.Printf("生成模拟响应，用户消息: %s", req.Messages[len(req.Messages)-1].Content)
	}

	// 生成模拟内容
	mockContent := "根据你的需求，我为你制定了一个专注时间计划：\n\n"
	mockContent += "1. **英语学习**：采用标准番茄工作法，25分钟专注学习，然后休息5分钟。这种方式适合语言学习这类需要持续但不过度疲劳的任务。\n\n"
	mockContent += "2. **论文写作**：使用深度工作模式，连续专注45分钟，然后休息10分钟。写论文需要深度思考，这种模式可以让你进入更好的专注状态。\n\n"
	mockContent += "这个计划平衡了专注和休息，避免过度疲劳。你可以根据需要重复这些循环。需要我调整这个计划吗？\n\n"
	mockContent += "```json\n"
	mockContent += "{\n"
	mockContent += "  \"tasks\": [\n"
	mockContent += "    {\n"
	mockContent += "      \"name\": \"英语学习\",\n"
	mockContent += "      \"mode\": \"pomodoro\",\n"
	mockContent += "      \"focusDuration\": 25,\n"
	mockContent += "      \"breakDuration\": 5\n"
	mockContent += "    },\n"
	mockContent += "    {\n"
	mockContent += "      \"name\": \"论文写作\",\n"
	mockContent += "      \"mode\": \"deep_work\",\n"
	mockContent += "      \"focusDuration\": 45,\n"
	mockContent += "      \"breakDuration\": 10\n"
	mockContent += "    }\n"
	mockContent += "  ]\n"
	mockContent += "}\n"
	mockContent += "```"

	// 创建模拟响应
	mockResp := &types.DeepSeekAPIResponse{
		ID:      "mock-response-id",
		Object:  "chat.completion",
		Created: 1715000000,
		Model:   req.Model,
		Choices: []types.DeepSeekChoice{
			{
				Index: 0,
				Message: types.DeepSeekMessage{
					Role:    "assistant",
					Content: mockContent,
				},
			},
		},
		Usage: struct {
			PromptTokens     int `json:"prompt_tokens"`
			CompletionTokens int `json:"completion_tokens"`
			TotalTokens      int `json:"total_tokens"`
		}{
			PromptTokens:     100,
			CompletionTokens: 300,
			TotalTokens:      400,
		},
	}

	// 处理任务数据
	c.processTaskData(mockResp)

	return mockResp, nil
}
