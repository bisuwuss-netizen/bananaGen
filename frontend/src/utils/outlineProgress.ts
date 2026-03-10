import type {
  OutlinePreviewCard,
  Project,
  TaskProgress,
} from '@/types';

const DEFAULT_PREVIEW_TITLES = [
  '封面',
  '目录',
  '问题背景',
  '核心分析',
  '行动建议',
  '总结',
];

const DEFAULT_STAGE_TEXT = '正在分析你的主题和上下文，准备输出可编辑的大纲结构。';
const DEFAULT_PROGRESS_MESSAGES = ['已收到生成请求，正在准备大纲生成链路。'];
const CONFIRMED_PAGE_COUNT_STEPS = new Set(['准备逐页写入', '正在完成收尾', '大纲已生成']);

const sanitizePreviewTitle = (raw: string): string => {
  let text = (raw || '')
    .replace(/^[\s>*-]+/, '')
    .replace(/^\d+[.）、:\s-]+/, '')
    .replace(/^[一二三四五六七八九十]+[.）、:\s-]+/, '')
    .replace(/^第[一二三四五六七八九十0-9]+[章节部分篇]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[:：-]+|[:：-]+$/g, '');

  if (text.length > 28) {
    text = `${text.slice(0, 28).trim()}…`;
  }

  return text;
};

export const extractOutlinePreviewTitles = (project: Project, maxTitles = 6): string[] => {
  const titles: string[] = [];

  const sourceBuckets = [
    project.outline_text ? [project.outline_text] : [],
    [project.idea_prompt, project.description_text, project.extra_requirements].filter(Boolean) as string[],
  ];

  for (const bucket of sourceBuckets) {
    if (bucket.length === 0) continue;

    const sourceText = bucket.join('\n');
    for (const line of sourceText.split(/[\n\r]+/)) {
      const title = sanitizePreviewTitle(line);
      if (title.length < 3) continue;
      if (titles.includes(title)) continue;
      if (title.includes('http://') || title.includes('https://') || title.includes('```')) continue;
      titles.push(title);
      if (titles.length >= maxTitles) {
        return titles;
      }
    }

    if (titles.length > 0) {
      return titles;
    }

    for (const sentence of sourceText.split(/[。！？!?；;]/)) {
      const title = sanitizePreviewTitle(sentence);
      if (title.length < 4) continue;
      if (titles.includes(title)) continue;
      titles.push(title);
      if (titles.length >= maxTitles) {
        return titles;
      }
    }

    if (titles.length > 0) {
      return titles;
    }
  }

  return titles;
};

export const buildPreviewCardsFromProject = (project: Project, maxCards = 6): OutlinePreviewCard[] => {
  const titles = extractOutlinePreviewTitles(project, maxCards);
  const resolvedTitles = titles.length > 0 ? titles : DEFAULT_PREVIEW_TITLES.slice(0, maxCards);

  return resolvedTitles.map((title, index) => ({
    id: `preview-${index + 1}`,
    title,
    points: [],
    status: 'planning',
  }));
};

export const buildInitialOutlineTaskProgress = (project: Project): TaskProgress => {
  const previewCards = buildPreviewCardsFromProject(project);
  return {
    total: 5,
    completed: 0,
    failed: 0,
    percent: 4,
    current_step: '准备生成大纲',
    messages: [
      '已开始创建大纲任务。',
      '正在读取主题和输入内容。',
    ],
    preview_cards: previewCards,
    generated_cards: [],
    queued_cards: previewCards,
    page_count_confirmed: false,
    render_mode: project.render_mode || 'image',
    scheme_id: project.scheme_id || 'edu_dark',
  };
};

export const hasConfirmedOutlinePageCount = (progress?: TaskProgress | null): boolean => {
  if (!progress) {
    return false;
  }

  if (progress.page_count_confirmed === true) {
    return true;
  }

  if (typeof progress.actual_total_pages === 'number' && progress.actual_total_pages > 0) {
    return true;
  }

  if ((progress.generated_cards?.length || 0) > 0) {
    return true;
  }

  const raw = String(progress.current_step || '').trim();
  return CONFIRMED_PAGE_COUNT_STEPS.has(raw) || /^正在生成第\s*\d+\s*页$/.test(raw);
};

export const getOutlineProgressStageText = (progress?: TaskProgress | null): string => {
  const raw = String(progress?.current_step || '').trim();
  const isHtmlMode = (progress?.render_mode || '').trim() === 'html';
  if (!raw) {
    return DEFAULT_STAGE_TEXT;
  }

  if (raw === '等待开始' || raw === '准备生成大纲') {
    return '正在准备大纲生成链路';
  }
  if (raw === '分析主题与约束') {
    return '正在理解主题、目标和输入约束';
  }
  if (raw === '整理资料与章节线索') {
    return '正在梳理参考资料，提炼可用章节线索';
  }
  if (raw === '整理章节线索') {
    return '正在基于主题梳理章节线索';
  }
  if (raw === '生成页面结构') {
    return isHtmlMode
      ? '正在一次性生成 HTML 结构化大纲，完成后会统一展示结果'
      : '正在规划整份 PPT 的页面结构和叙事顺序';
  }
  if (raw === '准备逐页写入') {
    return isHtmlMode
      ? '结构已确定，正在整理 HTML 结构化结果'
      : '结构已确定，开始逐页生成大纲卡片';
  }
  if (raw === '正在完成收尾') {
    return '正在整理最终结果，马上进入可编辑状态';
  }
  if (raw === '大纲已生成') {
    return '大纲已生成，即将进入编辑状态';
  }

  const generatingMatch = raw.match(/^正在生成第\s*(\d+)\s*页$/);
  if (generatingMatch) {
    return `正在生成第 ${generatingMatch[1]} 页大纲卡片，请稍候`;
  }

  return raw;
};

const humanizeOutlineProgressMessage = (message: string): string => {
  const raw = String(message || '').trim();
  if (!raw) {
    return '';
  }

  if (raw === '已创建大纲生成任务。') {
    return '已创建大纲生成任务，正在排队启动。';
  }
  if (raw === '已开始创建大纲任务。') {
    return '已开始创建大纲任务。';
  }
  if (raw === '正在读取主题和输入内容。') {
    return '正在读取主题、资料和输入内容。';
  }
  if (raw === '已接收大纲生成请求，正在分析输入内容。') {
    return '已收到生成请求，正在理解你的主题、受众和表达目标。';
  }

  const referenceMatch = raw.match(/^已读取\s+(\d+)\s+份已上传资料，正在组织章节结构。$/);
  if (referenceMatch) {
    return `已读取 ${referenceMatch[1]} 份参考资料，正在提炼章节线索。`;
  }

  if (raw === '未检测到已上传资料，正在基于主题组织章节结构。') {
    return '未检测到参考资料，正在基于主题构思章节结构。';
  }
  if (raw === '正在调用 AI 规划页面结构与叙事顺序。') {
    return 'AI 正在规划整份 PPT 的页面顺序与叙事节奏。';
  }

  const plannedMatch = raw.match(/^已规划\s+(\d+)\s+页，开始逐页生成大纲卡片。$/);
  if (plannedMatch) {
    return `已确定约 ${plannedMatch[1]} 页结构，开始逐页生成可编辑大纲卡片。`;
  }

  const completedMatch = raw.match(/^第\s+(\d+)\/(\d+)\s+页已完成：(.+)$/);
  if (completedMatch) {
    return `第 ${completedMatch[1]}/${completedMatch[2]} 页大纲已生成：${completedMatch[3].trim()}`;
  }

  const doneMatch = raw.match(/^大纲生成完成，已创建\s+(\d+)\s+页。$/);
  if (doneMatch) {
    return `大纲生成完成，共生成 ${doneMatch[1]} 页。`;
  }

  return raw;
};

export const getOutlineProgressMessages = (progress?: TaskProgress | null): string[] => {
  const source = progress?.messages?.length ? progress.messages : DEFAULT_PROGRESS_MESSAGES;
  return source
    .map(humanizeOutlineProgressMessage)
    .filter(Boolean);
};

export const resolveGeneratedOutlineCards = (
  project: Project,
  progress?: TaskProgress | null
): OutlinePreviewCard[] => {
  if (progress?.generated_cards?.length) {
    return progress.generated_cards;
  }
  if (progress?.preview_cards?.length && !progress?.queued_cards?.length) {
    return progress.preview_cards;
  }
  return [];
};

export const resolveQueuedOutlineCards = (
  project: Project,
  progress?: TaskProgress | null
): OutlinePreviewCard[] => {
  if (progress?.queued_cards?.length) {
    return progress.queued_cards;
  }
  if (progress?.preview_cards?.length && !progress?.generated_cards?.length) {
    return progress.preview_cards;
  }
  return buildPreviewCardsFromProject(project);
};
