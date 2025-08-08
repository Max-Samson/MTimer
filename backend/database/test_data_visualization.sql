-- ==============================================
-- MTimer 统计可视化测试数据脚本
-- ==============================================
-- 使用说明：
-- 1. 此脚本用于生成测试数据，以测试MTimer的统计图表和可视化功能
-- 2. 可以使用SQLite客户端工具(如DB Browser for SQLite)导入此脚本
-- 3. 导入前请注意此脚本会清除现有的待办事项、专注会话和统计数据
-- 4. 导入后重启应用程序，检查统计图表显示是否正常
-- ==============================================

-- 警告：以下操作会清理现有数据！
-- 如果你想保留现有数据，请先备份数据库
DELETE FROM focus_sessions;
DELETE FROM todos;
DELETE FROM daily_stats;
DELETE FROM event_stats;

-- 重置自增ID
DELETE FROM sqlite_sequence WHERE name='todos';
DELETE FROM sqlite_sequence WHERE name='focus_sessions';
DELETE FROM sqlite_sequence WHERE name='daily_stats';

-- ==============================================
-- 一、创建测试待办事项
-- ==============================================

-- 1. 已完成的待办事项 - 不同模式、不同完成时间分布
INSERT INTO todos (name, mode, status, created_at, updated_at, estimated_pomodoros, completed_at)
VALUES
-- 今天完成的任务
('学习React基础', 0, 'completed', datetime('now', '-3 days'), datetime('now'), 4, datetime('now', '-2 hours')),
('编写项目文档', 0, 'completed', datetime('now', '-4 days'), datetime('now'), 6, datetime('now', '-5 hours')),
-- 昨天完成的任务
('重构数据模型', 1, 'completed', datetime('now', '-5 days'), datetime('now', '-1 days'), 3, datetime('now', '-1 days', '-3 hours')),
('设计登录页面', 0, 'completed', datetime('now', '-3 days'), datetime('now', '-1 days'), 4, datetime('now', '-1 days', '-5 hours')),
('完成API文档', 0, 'completed', datetime('now', '-4 days'), datetime('now', '-1 days'), 5, datetime('now', '-1 days', '-8 hours')),
-- 前天完成的任务
('实现用户登录功能', 0, 'completed', datetime('now', '-6 days'), datetime('now', '-2 days'), 8, datetime('now', '-2 days', '-4 hours')),
-- 3天前完成的任务
('优化首页性能', 1, 'completed', datetime('now', '-10 days'), datetime('now', '-3 days'), 7, datetime('now', '-3 days', '-6 hours')),
('修复安全漏洞', 0, 'completed', datetime('now', '-8 days'), datetime('now', '-3 days'), 5, datetime('now', '-3 days', '-2 hours')),
-- 4天前完成的任务
('设计数据库结构', 1, 'completed', datetime('now', '-12 days'), datetime('now', '-4 days'), 6, datetime('now', '-4 days', '-7 hours')),
-- 5天前完成的任务
('编写单元测试', 0, 'completed', datetime('now', '-11 days'), datetime('now', '-5 days'), 4, datetime('now', '-5 days', '-5 hours')),
-- 6天前完成的任务
('实现注册功能', 0, 'completed', datetime('now', '-14 days'), datetime('now', '-6 days'), 7, datetime('now', '-6 days', '-3 hours')),
-- 一周前完成的任务
('项目需求分析', 1, 'completed', datetime('now', '-15 days'), datetime('now', '-7 days'), 8, datetime('now', '-7 days', '-4 hours'));

-- 2. 待处理的待办事项
INSERT INTO todos (name, mode, status, created_at, updated_at, estimated_pomodoros)
VALUES
('开发用户中心界面', 0, 'pending', datetime('now', '-2 days'), datetime('now'), 5),
('实现消息推送功能', 1, 'pending', datetime('now', '-3 days'), datetime('now'), 6),
('编写系统文档', 0, 'pending', datetime('now', '-1 days'), datetime('now'), 3),
('代码审查和优化', 0, 'pending', datetime('now', '-4 days'), datetime('now'), 4),
('优化移动端适配', 1, 'pending', datetime('now', '-2 days'), datetime('now'), 4),
('研究新技术方案', 1, 'pending', datetime('now', '-2 days'), datetime('now'), 7);

-- 3. 进行中的待办事项
INSERT INTO todos (name, mode, status, created_at, updated_at, estimated_pomodoros)
VALUES
('实现数据可视化功能', 0, 'inProgress', datetime('now', '-1 days'), datetime('now'), 8);


-- ==============================================
-- 二、创建专注会话记录
-- ==============================================

-- 为每个已完成的待办事项添加相应数量的专注会话
INSERT INTO focus_sessions (todo_id, mode, start_time, end_time, duration, break_time)
SELECT
    t.todo_id,
    t.mode,
    -- 生成从早上8点到晚上10点之间不同时间的专注会话
    datetime(
        date(completed_at),
        (8 + (ABS(RANDOM()) % 14)) || ':' || (ABS(RANDOM()) % 60) || ':00'
    ) AS start_time,
    -- 结束时间为开始时间加上25分钟（番茄钟模式）或自定义的时间（30-45分钟）
    CASE
        WHEN t.mode = 0 THEN datetime(start_time, '+25 minutes')
        ELSE datetime(start_time, '+' || (30 + (ABS(RANDOM()) % 16)) || ' minutes')
    END AS end_time,
    -- 专注时长
    CASE
        WHEN t.mode = 0 THEN 25
        ELSE 30 + (ABS(RANDOM()) % 16)
    END AS duration,
    -- 休息时间5-10分钟
    5 + (ABS(RANDOM()) % 6) AS break_time
FROM
    todos t
JOIN
    (
        -- 为每个待办事项生成多行，数量等于其estimated_pomodoros
        WITH RECURSIVE counter(i) AS (
            SELECT 1
            UNION ALL
            SELECT i+1 FROM counter
            WHERE i < (SELECT MAX(estimated_pomodoros) FROM todos WHERE status = 'completed')
        )
        SELECT
            t.todo_id,
            t.estimated_pomodoros,
            t.completed_at,
            c.i
        FROM
            todos t,
            counter c
        WHERE
            t.status = 'completed'
            AND c.i <= t.estimated_pomodoros
    ) AS expanded_todos
ON t.todo_id = expanded_todos.todo_id;

-- 为进行中的待办事项添加部分完成的专注会话
WITH in_progress_todos AS (
    SELECT todo_id, name, estimated_pomodoros, mode
    FROM todos
    WHERE status = 'inProgress'
)

INSERT INTO focus_sessions (todo_id, mode, start_time, end_time, duration, break_time)
SELECT
    t.todo_id,
    t.mode,
    datetime('now', '-' || (i % 3) || ' days', '-' || (3 + (i % 5)) || ' hours') AS start_time,
    datetime('now', '-' || (i % 3) || ' days', '-' || (3 + (i % 5) - 1) || ' hours', '-' || (35 - i) || ' minutes') AS end_time,
    CASE WHEN t.mode = 0 THEN 25 ELSE 30 + (i % 15) END AS duration,
    5 AS break_time
FROM
    in_progress_todos t,
    (
        WITH RECURSIVE counter(i) AS (
            SELECT 1
            UNION ALL
            SELECT i+1 FROM counter
            WHERE i < 3  -- 每个进行中的待办事项最多添加3个专注会话
        )
        SELECT i FROM counter
    ) AS counter
WHERE
    i <= CAST(t.estimated_pomodoros / 2 AS INTEGER);  -- 只完成一半左右的专注会话

-- ==============================================
-- 三、生成每日统计数据
-- ==============================================

-- 插入过去14天的每日统计数据
INSERT INTO daily_stats (date, pomodoro_count, custom_count, total_focus_sessions,
    pomodoro_minutes, custom_minutes, total_focus_minutes, total_break_minutes,
    tomato_harvests, time_ranges)
SELECT
    date('now', '-' || days || ' days') as date,
    -- 番茄钟数量（周末较少，工作日较多）
    CASE
        WHEN days % 7 IN (0, 6) THEN 3 + (ABS(RANDOM()) % 3)  -- 周末
        ELSE 6 + (ABS(RANDOM()) % 5)  -- 工作日
    END as pomodoro_count,
    -- 自定义专注次数
    CASE
        WHEN days % 7 IN (0, 6) THEN 1 + (ABS(RANDOM()) % 2)  -- 周末
        ELSE 2 + (ABS(RANDOM()) % 3)  -- 工作日
    END as custom_count,
    -- 总专注会话数（番茄钟+自定义）计算
    0, -- 这将在后面计算
    -- 番茄钟分钟数（每个25分钟）
    0, -- 这将在后面计算
    -- 自定义专注分钟数（每个30-45分钟）
    0, -- 这将在后面计算
    -- 总专注分钟数
    0, -- 这将在后面计算
    -- 总休息分钟数（每个专注会话后5-10分钟）
    0, -- 这将在后面计算
    -- 番茄收获数（不是每个专注都有收获）
    CASE
        WHEN days % 7 IN (0, 6) THEN 2 + (ABS(RANDOM()) % 2)  -- 周末
        ELSE 4 + (ABS(RANDOM()) % 4)  -- 工作日
    END as tomato_harvests,
    -- 专注时间段分布
    CASE
        WHEN days % 7 IN (0, 6) THEN  -- 周末
            JSON('["10:00~10:25","11:30~11:55","15:00~15:25","16:30~16:55"]')
        ELSE  -- 工作日，按不同的日期模式生成不同的时间分布
            CASE days % 5
                WHEN 0 THEN JSON('["09:00~09:25","10:30~10:55","11:30~11:55","14:00~14:25","15:30~15:55","16:30~16:55"]')
                WHEN 1 THEN JSON('["08:30~08:55","09:30~09:55","11:00~11:25","14:30~14:55","16:00~16:25","17:30~17:55"]')
                WHEN 2 THEN JSON('["09:00~09:25","10:00~10:25","11:30~11:55","14:00~14:25","15:00~15:25","16:30~16:55","18:00~18:25"]')
                WHEN 3 THEN JSON('["08:00~08:25","09:30~09:55","11:00~11:25","13:30~13:55","15:00~15:25","17:00~17:25"]')
                ELSE JSON('["09:30~09:55","10:30~10:55","12:00~12:25","14:30~14:55","16:00~16:25","17:30~17:55"]')
            END
    END as time_ranges
FROM
    (WITH RECURSIVE days(days) AS (
        SELECT 0
        UNION ALL
        SELECT days+1 FROM days
        WHERE days < 14  -- 生成过去14天的数据
    )
    SELECT days FROM days) as days;

-- 更新每日统计中的计算字段
UPDATE daily_stats
SET
    total_focus_sessions = pomodoro_count + custom_count,
    pomodoro_minutes = pomodoro_count * 25,
    custom_minutes = custom_count * (30 + (ABS(RANDOM()) % 16)),
    total_focus_minutes = pomodoro_minutes + custom_minutes,
    total_break_minutes = total_focus_sessions * (5 + (ABS(RANDOM()) % 6))
WHERE
    date >= date('now', '-14 days');

-- ==============================================
-- 四、生成事件统计数据
-- ==============================================

-- 为每个待办事项创建事件统计记录
INSERT INTO event_stats (event_id, date, focus_count, total_focus_time, mode, completed)
SELECT
    t.todo_id AS event_id,
    date('now', '-' || (ABS(RANDOM()) % 14) || ' days') AS date,
    (ABS(RANDOM()) % 5) + 1 AS focus_count, -- 随机1-5次专注
    ((ABS(RANDOM()) % 5) + 1) * 25 AS total_focus_time, -- 每次专注25分钟
    t.mode,
    CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END AS completed
FROM
    todos t
WHERE
    t.todo_id <= 12; -- A只为前12个待办事项创建统计记录

-- 为部分待办事项创建多天的统计记录（形成连续的趋势）
INSERT INTO event_stats (event_id, date, focus_count, total_focus_time, mode, completed)
SELECT
    t.todo_id AS event_id,
    date('now', '-' || (7 - i) || ' days') AS date, -- 最近7天的记录
    CASE
        WHEN t.status = 'completed' THEN (ABS(RANDOM()) % 3) + 2 -- 已完成任务有更多专注次数
        ELSE (ABS(RANDOM()) % 2) + 1 -- 未完成任务专注次数较少
    END AS focus_count,
    CASE
        WHEN t.status = 'completed' THEN ((ABS(RANDOM()) % 3) + 2) * 25 -- 已完成任务有更多专注时间
        ELSE ((ABS(RANDOM()) % 2) + 1) * 25 -- 未完成任务专注时间较少
    END AS total_focus_time,
    t.mode,
    CASE
        WHEN i >= 5 AND t.status = 'completed' THEN 1 -- 部分任务在后期完成
        ELSE 0
    END AS completed
FROM
    todos t,
    (WITH RECURSIVE counter(i) AS (
        SELECT 0
        UNION ALL
        SELECT i+1 FROM counter
        WHERE i < 6
    )
    SELECT i FROM counter) AS days
WHERE
    t.todo_id <= 6; -- 只为前6个待办事项创建多天记录

-- ==============================================
-- 测试数据创建完成
-- ==============================================
SELECT 'MTimer测试数据创建成功! 现在可以启动应用程序检查可视化功能。' as message;
