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
    estimated_total_pages: Math.max(5, Math.min(12, previewCards.length + 2)),
    render_mode: project.render_mode || 'image',
    scheme_id: project.scheme_id || 'edu_dark',
  };
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
