-- 添加 render_mode 字段到 projects 表
-- 请使用 MySQL 客户端执行此脚本

USE banana_slides;

-- 添加列（允许 NULL 以避免行大小限制）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS render_mode VARCHAR(20) DEFAULT NULL;

-- 更新现有记录的默认值
UPDATE projects SET render_mode = 'image' WHERE render_mode IS NULL;

-- 验证
SELECT COUNT(*) as total_projects, 
       SUM(CASE WHEN render_mode = 'image' THEN 1 ELSE 0 END) as image_mode,
       SUM(CASE WHEN render_mode = 'html' THEN 1 ELSE 0 END) as html_mode
FROM projects;
