# MTimer - 专业的计时器应用

## 简介

MTimer是一款基于番茄工作法的个性化时间专注工具，支持跨平台使用。核心功能包括：可调专注时长与休息周期、任务清单管理、内置白噪音播放及专注数据可视化统计。创新融入AI助手模块，可根据用户习惯提供个性化建议，通过智能交互提升学习/工作效率。区别于传统番茄钟应用，其特色在于灵活的自定义设置、多维数据追踪及AI驱动的适应性优化，帮助用户建立科学的时间管理体系。MTimer是一款专业的计时器应用，基于Wails框架开发，结合Go后端和Vue 3前端，提供高效、精准的计时功能。



## 技术创新

这是一款颠覆传统的番茄时钟工具，以科学高效的“番茄工作法”为开发思想，深度融合个性化设计，首创“双专注模式”（番茄/自定义模式自由切换），集成DeepSeek大模型接口打造AI时间规划助手，支持跨平台运行。通过智能分析用户习惯，AI自动生成个性化任务流并动态调整番茄周期，结合白噪音场景化适配与多维数据可视化看板，实现科学专注与高效休息的精准平衡，重塑时间管理体验。

## 技术栈

- 前端：Vue 3 + TypeScript + Tailwind CSS
- 后端：Go + Wails

## 安装步骤

### 环境要求

- Go 1.18+
- Node.js 14+
- npm 或 yarn
- Wails CLI

### 安装Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 克隆项目

```bash
git clone https://gitee.com/Max-Samson/MTimer.git
cd MTimer
```

### 安装依赖

```bash
# 安装Go依赖
go mod tidy

# 安装前端依赖
cd frontend
npm install
# 或
yarn
```

## 运行与开发

### 开发模式

```bash
wails dev
```

这将启动开发服务器，并在浏览器中打开应用。

### 构建应用

```bash
wails build
```

构建完成后，可执行文件将位于`build/bin`目录。

## 项目结构

```
.
├── app.go              # Wails应用主入口
├── main.go             # 应用程序主入口
├── build/              # 构建相关文件
│   ├── bin/           # 编译后的二进制文件
│   ├── darwin/        # macOS相关配置
│   └── windows/       # Windows相关配置
├── frontend/          # 前端代码
│   ├── src/           # 源代码
│   │   ├── assets/    # 静态资源
│   │   ├── components/# Vue组件
│   │   └── App.vue    # 主应用组件
│   └── wailsjs/       # Wails生成的JS绑定
├── internal/          # 内部包
│   ├── controllers/   # 控制器
│   ├── models/        # 数据模型
│   ├── routes/        # 路由定义
│   └── services/      # 业务逻辑
└── go.mod             # Go模块定义
```
