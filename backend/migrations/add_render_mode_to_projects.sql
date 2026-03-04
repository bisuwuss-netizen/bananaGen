-- Migration: Add render_mode column to projects table
-- Date: 2026-02-02
-- Strategy: Add as NULL first (no default to avoid row size), then update existing rows

-- Step 1: Add column as NULL
ALTER TABLE projects 
ADD COLUMN render_mode VARCHAR(20) NULL
COMMENT '渲染模式: image(传统图片生成), html(HTML渲染模式)';

-- Step 2: Update existing rows to 'image' (default)
UPDATE projects SET render_mode = 'image' WHERE render_mode IS NULL;
