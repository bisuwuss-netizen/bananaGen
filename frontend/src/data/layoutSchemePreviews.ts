import type {
  LayoutId,
  LayoutModel,
  PagePayload,
} from '@/experimental/html-renderer/types/schema';

export interface LayoutSchemePreviewPage {
  id: string;
  label: string;
  summary: string;
  page: PagePayload;
}

export interface LayoutSchemePreview {
  label: string;
  description: string;
  pages: LayoutSchemePreviewPage[];
}

interface PreviewSeed {
  label: string;
  summary: string;
  layoutId: LayoutId;
  model: LayoutModel;
}

const buildPages = (schemeId: string, seeds: PreviewSeed[]): LayoutSchemePreviewPage[] =>
  seeds.map((seed, index) => ({
    id: `${schemeId}-${index + 1}`,
    label: seed.label,
    summary: seed.summary,
    page: {
      page_id: `scheme-preview-${schemeId}-${index + 1}`,
      order_index: index,
      layout_id: seed.layoutId,
      model: seed.model,
    },
  }));

const createPreviewArtwork = (
  title: string,
  subtitle: string,
  palette: [string, string, string],
  accent: string
) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="1600" height="900" viewBox="0 0 1600 900" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1600" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${palette[0]}" />
          <stop offset="52%" stop-color="${palette[1]}" />
          <stop offset="100%" stop-color="${palette[2]}" />
        </linearGradient>
        <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1180 220) rotate(140) scale(520 340)">
          <stop stop-color="${accent}" stop-opacity="0.58" />
          <stop offset="1" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" rx="42" fill="url(#bg)" />
      <rect x="88" y="86" width="504" height="728" rx="28" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.16)" />
      <rect x="638" y="148" width="816" height="248" rx="30" fill="rgba(7,10,24,0.24)" stroke="rgba(255,255,255,0.14)" />
      <rect x="638" y="438" width="392" height="234" rx="26" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <rect x="1062" y="438" width="392" height="234" rx="26" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
      <circle cx="1240" cy="238" r="250" fill="url(#glow)" />
      <path d="M110 702C314 640 410 540 540 334" stroke="rgba(255,255,255,0.24)" stroke-width="3" stroke-dasharray="12 16" />
      <text x="128" y="208" fill="white" fill-opacity="0.96" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="94" font-weight="700">${title}</text>
      <text x="128" y="286" fill="white" fill-opacity="0.68" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="34">${subtitle}</text>
      <text x="128" y="708" fill="${accent}" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="28" font-weight="700">Preview Storyboard</text>
      <text x="128" y="756" fill="white" fill-opacity="0.58" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="24">Hover preview generated from live layout renderer</text>
    </svg>
  `)}`;

const artwork = {
  eduStage: createPreviewArtwork('课程舞台', '深色知识演进 / Stage Narrative', ['#071120', '#0d2243', '#0b1630'], '#22d3ee'),
  techGrid: createPreviewArtwork('技术蓝图', 'Architecture / Protocol / Dashboard', ['#09111f', '#0f4c81', '#0d1b3d'], '#38bdf8'),
  academicPaper: createPreviewArtwork('学术样章', 'Theory / Evidence / Annotation', ['#f8fafc', '#d8dee8', '#c9d5e6'], '#8b5e3c'),
  interactiveClass: createPreviewArtwork('互动课堂', 'Question / Debate / Collaboration', ['#effaf7', '#ddf6ef', '#d2eef8'], '#22c55e'),
  visualArchive: createPreviewArtwork('现场档案', 'Timeline / Survey / Portfolio', ['#efe3d5', '#cfb79f', '#8c5b42'], '#ef4444'),
  practicalLab: createPreviewArtwork('实训工位', 'Checklist / Safety / SOP', ['#0f172a', '#134e4a', '#0b312f'], '#facc15'),
  modernPulse: createPreviewArtwork('先锋提案', 'Asymmetry / Motion / Brand Signal', ['#0f0f14', '#1d1742', '#3d1f14'], '#fb923c'),
};

export const layoutSchemePreviews: Record<string, LayoutSchemePreview> = {
  edu_dark: {
    label: '完整故事板预览',
    description: '按课程发布到复盘收束的顺序展开，展示深色教育系列的全部核心布局。',
    pages: buildPages('edu-dark', [
      {
        label: '深色封面',
        summary: '先用舞台感封面建立课程主题和深色沉浸氛围。',
        layoutId: 'edu_cover',
        model: {
          title: '3D 建模入门教程',
          subtitle: '从观察到塑形的完整教学路径',
          author: '数字媒体基础课',
          department: '视觉设计实验室',
          date: '2026 春季学期',
          hero_image: artwork.eduStage,
        },
      },
      {
        label: '深色目录',
        summary: '目录页用高对比卡片把整套教学节奏先交代清楚。',
        layoutId: 'edu_toc',
        model: {
          title: '学习路径总览',
          subtitle: '从建模认知到作品复盘',
          items: [
            { index: 1, text: '观察对象与比例' },
            { index: 2, text: '结构拆分与逻辑' },
            { index: 3, text: '塑形细节与材质' },
            { index: 4, text: '案例复盘与答疑' },
          ],
        },
      },
      {
        label: '三栏对比',
        summary: '用三栏对比快速说明初学者常见误区、行动方法和目标结果。',
        layoutId: 'edu_tri_compare',
        model: {
          title: '建模训练的三段式方法',
          badge: '先理解再上手',
          columns: [
            { title: '常见痛点', points: ['比例感不稳定', '细节过早堆叠', '忽视体块关系'] },
            { title: '课堂行动', points: ['先画轮廓线', '拆成基础几何体', '逐层检查转折'] },
            { title: '训练目标', points: ['结构更准确', '流程更可复用', '成果更易讲解'] },
          ],
        },
      },
      {
        label: '中心模型',
        summary: '中心模型页负责把课程核心方法论一眼讲清楚。',
        layoutId: 'edu_core_hub',
        model: {
          title: '建模思维核心框架',
          subtitle: '用一个中心概念串联四个关键动作',
          center_label: '结构意识',
          nodes: [
            { title: '观察比例' },
            { title: '拆分模块' },
            { title: '控制节奏' },
            { title: '验证结果' },
          ],
        },
      },
      {
        label: '推进时间轴',
        summary: '时间轴页把课前、课中、课后的推进方式全部串起来。',
        layoutId: 'edu_timeline_steps',
        model: {
          title: '一节完整课程如何推进',
          subtitle: '从引导到实践再到反馈',
          steps: [
            {
              title: '课前导入',
              description: '先用案例图片帮助学生建立对形体的整体感受。',
              highlights: ['观察重点', '建立目标'],
            },
            {
              title: '课中拆解',
              description: '按比例、体块、转折三个层次拆开分析。',
              highlights: ['分层讲解', '即时示范'],
            },
            {
              title: '课后练习',
              description: '围绕同一对象完成一次独立建模与复盘。',
              highlights: ['独立输出', '同伴互评'],
            },
          ],
        },
      },
      {
        label: '逻辑演进',
        summary: '逻辑演进页负责把抽象步骤变成一条能跟随的知识链路。',
        layoutId: 'edu_logic_flow',
        model: {
          title: '3D 建模学习路径',
          stages: [
            { title: '观察对象', description: '先建立比例、体块与空间关系。' },
            { title: '拆分结构', description: '将复杂模型还原成基础几何模块。' },
            { title: '细化塑形', description: '补足边缘转折、材质与视觉重心。' },
          ],
        },
      },
      {
        label: '数据看板',
        summary: '看板页展示训练前后差异，强化教学成果的说服力。',
        layoutId: 'edu_data_board',
        model: {
          title: '阶段训练结果面板',
          subtitle: '3 周训练后的课堂数据',
          metrics: [
            { value: '+38%', label: '结构正确率', note: '体块判断更稳定' },
            { value: '12min', label: '平均起稿时长', note: '比首周缩短 6 分钟' },
            { value: '91%', label: '作业完成率', note: '小组互评后明显提升' },
          ],
          bars: [
            { label: '观察比例', baseline: 44, current: 82 },
            { label: '结构拆分', baseline: 38, current: 78 },
            { label: '细节塑形', baseline: 26, current: 69 },
          ],
          bullets: [
            { text: '先抓大形后进细节', description: '减少返工是最大收益。' },
            { text: '同伴讲解带来迁移', description: '能讲清楚才算真正理解。' },
          ],
          insight: '深色系列更适合讲“阶段推进”和“结果差异”，因为层级对比足够明显。',
        },
      },
      {
        label: '问答与案例',
        summary: '案例答疑页用真实提问承接课堂里最容易卡住的地方。',
        layoutId: 'edu_qa_case',
        model: {
          title: '课堂高频问题答疑',
          subtitle: '把抽象问题拆回结构问题',
          question: '为什么我一加细节，整体比例就开始失控？',
          answer: '因为细节是在错误骨架上堆出来的，必须先回到大体块检查。',
          analysis: [
            { title: '原因 1', content: '跳过了中间的结构确认环节。' },
            { title: '原因 2', content: '没有给自己设置每 10 分钟的比例复查点。' },
          ],
          conclusion: '先保证轮廓和转折正确，再追求局部精致，进步会更稳定。',
        },
      },
      {
        label: '反思总结',
        summary: '最后一页收束为可带走的复盘框架，方便学生课后再看。',
        layoutId: 'edu_summary',
        model: {
          title: '本节课复盘与迁移',
          columns: [
            { title: '已经掌握', points: ['比例观察顺序', '结构拆分方法', '起稿检查节奏'] },
            { title: '仍需强化', points: ['复杂转折控制', '材质表现统一'] },
            { title: '下一步练习', points: ['独立完成一件静物建模', '做一页过程讲解图'] },
          ],
          closing: '好模板的价值，不只是美观，而是把一套教学节奏变得可复用。',
        },
      },
    ]),
  },
  tech_blue: {
    label: '完整故事板预览',
    description: '用技术发布的叙述方式把系统概览、逻辑链路、指标看板和演进路线全部串起来。',
    pages: buildPages('tech-blue', [
      {
        label: '技术封面',
        summary: '用蓝图式封面把发布主题和系统气质先建立起来。',
        layoutId: 'cover',
        model: {
          title: 'AI Agent 发布方案',
          subtitle: '从原型验证到生产环境交付',
          author: '平台工程团队',
          department: '智能应用中心',
          date: '2026 / Q1',
          background_image: artwork.techGrid,
        },
      },
      {
        label: '技术大纲',
        summary: '目录页交代技术汇报的阅读顺序和判断标准。',
        layoutId: 'toc',
        model: {
          title: '本次发布包含什么',
          items: [
            { index: 1, text: '系统架构与职责边界' },
            { index: 2, text: '核心运行时序' },
            { index: 3, text: '指标与约束条件' },
            { index: 4, text: '后续迭代路线' },
          ],
        },
      },
      {
        label: '技术架构',
        summary: '先讲架构，再讲细节，帮助用户快速抓住系统边界。',
        layoutId: 'title_content',
        model: {
          title: '系统如何分层协作',
          content: [
            '接入层负责收集用户输入、文件和上下文约束。',
            '编排层负责模型路由、工具调度与状态机推进。',
            '交付层负责把结构化结果输出为可编辑的 HTML 页面。'
          ],
          highlight: '模块之间的边界清晰，后续扩展时才不会牵一发动全身。',
        },
      },
      {
        label: '逻辑时序',
        summary: '时序页适合把一次请求的完整流转讲透。',
        layoutId: 'process_steps',
        model: {
          title: '一次生成请求如何被处理',
          subtitle: 'Request -> Orchestration -> Delivery',
          steps: [
            { number: 1, label: '解析输入', description: '识别任务类型、目标页数和风格约束。' },
            { number: 2, label: '编排工具', description: '分配大纲、描述、HTML 渲染等子任务。' },
            { number: 3, label: '验证结果', description: '检查结构完整性、页面状态和资源引用。' },
            { number: 4, label: '输出交付', description: '生成可预览、可编辑、可复用的页面。' },
          ],
        },
      },
      {
        label: '性能看板',
        summary: '指标卡页帮助用户理解系统已经稳定到什么程度。',
        layoutId: 'edu_data_board',
        model: {
          title: '运行指标总览',
          subtitle: '最近 14 天线上样本',
          metrics: [
            { value: '4.6s', label: '首屏可预览时间', note: '均值' },
            { value: '97.8%', label: '任务完成率', note: '含自动重试' },
            { value: '2.1%', label: '人工回退率', note: '主要发生在复杂表格页' },
          ],
          bars: [
            { label: '大纲生成', baseline: 72, current: 91 },
            { label: '页面描述', baseline: 69, current: 88 },
            { label: 'HTML 渲染', baseline: 63, current: 86 },
          ],
          bullets: [
            { text: '关键瓶颈已从模型端转移到资源组装。' },
            { text: '指标页适合放在中段，承接系统逻辑与价值证明。' },
          ],
          insight: '用户不只需要“系统能跑”，还需要看到“系统跑得怎么样”。',
        },
      },
      {
        label: '协议拆解',
        summary: '协议/字段类页面适合用高密度要点布局承接深度信息。',
        layoutId: 'title_bullets',
        model: {
          title: 'SSE 事件字段约定',
          subtitle: '让前后端对同一状态机说同一种语言',
          bullets: [
            {
              text: 'event',
              description: '定义消息类型，例如 progress、completed、error。',
            },
            {
              text: 'project_id',
              description: '让历史页、详情页和预览页都能定位同一个任务。',
            },
            {
              text: 'payload',
              description: '承载阶段状态、错误信息与下一步动作。'
            },
          ],
          keyTakeaway: '协议字段要稳定，界面状态才不会出现“已完成却显示未开始”这类错位。',
        },
      },
      {
        label: '需求规格',
        summary: '规格页强调上线前必须满足的可验证条件。',
        layoutId: 'title_bullets',
        model: {
          title: '本次上线的硬性要求',
          bullets: [
            {
              text: '可恢复',
              description: '历史项目刷新后仍能正确回推最终状态与预览资源。',
            },
            {
              text: '可观测',
              description: '关键阶段都要能在日志和前端状态中定位。',
            },
            {
              text: '可解释',
              description: '用户看到异常时，界面要告诉他卡在哪一步。'
            },
          ],
          keyTakeaway: '技术汇报不是罗列功能，而是证明系统质量边界。',
        },
      },
      {
        label: '选型对比',
        summary: '对比页适合解释为什么当前方案最平衡。',
        layoutId: 'two_column',
        model: {
          title: '为什么选择 HTML 渲染链路',
          left: {
            type: 'bullets',
            header: 'HTML 渲染',
            bullets: [
              { text: '可编辑', description: '后续可以继续细修样式和结构。' },
              { text: '可预览', description: '浏览器内直接看到最终效果。' },
              { text: '可复用', description: '组件和布局能沉淀成模板资产。' },
            ],
          },
          right: {
            type: 'bullets',
            header: '截图导出',
            bullets: [
              { text: '改动成本高', description: '一旦产出为图片，后续很难二次编辑。' },
              { text: '状态不透明', description: '中间步骤不易暴露给用户。' },
              { text: '资产复用弱', description: '很难沉淀成可组合的布局库。' },
            ],
          },
        },
      },
      {
        label: '技术原理',
        summary: '原理页用于承接核心设计思想，而不是只讲执行结果。',
        layoutId: 'title_content',
        model: {
          title: '状态驱动的前端展示原则',
          content: [
            '界面不应只看 project.status，一个历史项目的真实完成度必须由页面级状态、预览资源和模式一起推断。',
            '当 HTML 首页已经存在时，历史卡片就应该具备“已完成 + 可预览”的用户语义，而不是回退成默认占位。'
          ],
          highlight: '状态逻辑和资源逻辑必须统一，不然前台看到的就不是系统真实状态。',
        },
      },
      {
        label: '技术演进',
        summary: '最后用收束页把当前版本和下一阶段路线放到一起。',
        layoutId: 'ending',
        model: {
          title: '下一阶段迭代方向',
          subtitle: '把稳定性和模板体验继续往前推',
          reflection_blocks: [
            { title: '已完成', items: ['历史状态统一', 'HTML 首页预览', '模板故事板预览'] },
            { title: '下一步', items: ['模板轮播录屏', '跨设备预览优化', '布局推荐策略'] },
          ],
          closing: '技术型模板最重要的不是炫，而是让复杂逻辑看起来可靠且可验证。',
        },
      },
    ]),
  },
  academic: {
    label: '完整故事板预览',
    description: '完整展示学术研究系列的全部布局，让用户从封面、推导、案例、练习到结课收束完整看一遍。',
    pages: buildPages('academic', [
      {
        label: '学术封面',
        summary: '先建立课程身份、主题范围和学术语境。',
        layoutId: 'cover_academic',
        model: {
          title: '高斯过程回归导论',
          subtitle: '从概率先验到后验预测',
          author: '机器学习课程组',
          department: '人工智能学院',
          date: '2026 春季',
          background_image: artwork.academicPaper,
        },
      },
      {
        label: '学术目录',
        summary: '目录页用章节感明确讲授顺序。',
        layoutId: 'toc_academic',
        model: {
          title: 'Lecture Roadmap',
          items: [
            { index: 1, text: '问题定义与学习目标' },
            { index: 2, text: '核心概念与理论推导' },
            { index: 3, text: '案例分析与方法对比' },
            { index: 4, text: '练习、总结与作业' },
          ],
        },
      },
      {
        label: '学习目标',
        summary: '目标页帮助用户判断这套模板适合讲义还是研究汇报。',
        layoutId: 'learning_objectives',
        model: {
          title: '本讲学习目标',
          course_code: 'ML-402',
          objectives: [
            { text: '理解核函数如何定义样本相似性', level: '理解', hours: 1 },
            { text: '掌握后验均值与方差的推导逻辑', level: '分析', hours: 2 },
            { text: '能够解释 GPR 在小样本中的优势', level: '应用', hours: 1 },
          ],
        },
      },
      {
        label: '核心概念',
        summary: '用概念卡片快速解释本章术语和基础认知。',
        layoutId: 'key_concepts',
        model: {
          title: '三个必须先理解的概念',
          subtitle: '定义越清楚，后面推导越轻松',
          bullets: [
            {
              text: '先验分布',
              description: '在观测数据出现前，对函数空间的初始假设。',
            },
            {
              text: '核函数',
              description: '度量样本之间的相似性，并决定函数的平滑方式。',
            },
            {
              text: '后验预测',
              description: '结合观测样本后，对目标点给出均值和不确定性估计。',
            },
          ],
          keyTakeaway: '学术型模板适合先定义概念，再展开推导，不会让高密度内容显得拥挤。',
        },
      },
      {
        label: '理论讲解',
        summary: '这是学术系列的标志页，用于展示核心推导和公式语境。',
        layoutId: 'theory_explanation',
        model: {
          title: '后验分布为何仍是高斯分布',
          theory: [
            '我们将训练样本与目标点联合建模为一个多元高斯分布，再利用条件高斯分布公式求解目标点的后验。',
            '在这个过程中，核矩阵承担了“结构记忆”的角色，它决定了已有样本如何影响新样本的预测。',
          ],
          formulas: [
            {
              latex: 'p(f_* \\mid X, y, x_*) = \\mathcal{N}(K_*^T K^{-1} y, K_{**} - K_*^T K^{-1}K_*)',
              explanation: '后验均值由相似样本加权得到，后验方差描述模型不确定性。',
            },
          ],
          references: ['Rasmussen, C.E. & Williams, C.K.I. Gaussian Processes for Machine Learning.'],
        },
      },
      {
        label: '长文叙述',
        summary: '长文叙述页适合做章节型解释和边注。',
        layoutId: 'academic_narrative',
        model: {
          title: '从直觉理解到形式化表达',
          narrative: [
            '如果把每个可能的函数都看作一条候选曲线，那么高斯过程的任务不是只选一条，而是对“所有合理曲线”建立概率分布。',
            '这意味着我们不仅得到预测值，还能同时得到不确定性，从而帮助研究者判断哪些区域值得继续采样。'
          ],
          margin_notes: [
            { title: '定义', content: 'Gaussian Process 是定义在函数空间上的分布。' },
            { title: '教学提示', content: '旁注区适合放术语解释和课堂提醒。' },
          ],
          pull_quote: '学术模板的价值不只是装下更多文字，而是让文字的逻辑关系更清楚。',
        },
      },
      {
        label: '案例分析',
        summary: '案例页把理论与真实应用挂上钩。',
        layoutId: 'case_study',
        model: {
          title: '案例：小样本材料实验预测',
          scenario: '实验成本高，采样点少，传统回归难以稳定估计误差范围。',
          challenge: '如何在样本不足的情况下仍给出可靠预测？',
          points: [
            { title: '方法选择', description: 'GPR 能同时给出预测值与置信区间。' },
            { title: '决策价值', description: '研究者可优先采样高不确定性的区域。' },
            { title: '展示价值', description: '案例页适合说明“为什么这个方法值得用”。' },
          ],
          conclusion: '学术研究型模板很适合把“问题场景 -> 方法 -> 结论”讲完整。',
        },
      },
      {
        label: '对比分析',
        summary: '对比页适合解释方法边界与适用条件。',
        layoutId: 'comparison_table',
        model: {
          title: 'GPR 与其他回归方法对比',
          subtitle: '同样是回归，解释力差异很大',
          items: [
            { name: '线性回归', features: ['实现简单', '解释直接', '非线性能力弱'] },
            { name: '随机森林', features: ['鲁棒性好', '表达能力强', '不确定性解释弱'] },
            { name: 'GPR', features: ['小样本友好', '带不确定性', '计算开销较高'] },
          ],
          conclusion: '当样本贵、解释性强、需要不确定性时，GPR 是更合适的选择。',
        },
      },
      {
        label: '原理图解',
        summary: '图解页把抽象公式压成更易讲授的结构图。',
        layoutId: 'diagram_illustration',
        model: {
          title: '从输入到预测的结构图',
          subtitle: '核函数如何把样本关系注入预测过程',
          diagram_url: artwork.academicPaper,
          explanations: [
            { label: '输入样本', description: '训练数据为后验推断提供观测依据。' },
            { label: '核矩阵', description: '把样本相似性编码成协方差结构。' },
            { label: '后验输出', description: '同时得到预测均值与不确定性。' },
          ],
          summary: '图解页适合用在推导后，帮助学生把公式重新转回图像理解。',
        },
      },
      {
        label: '要点总结',
        summary: '总结页用知识卡方式把高密度内容重新压缩一遍。',
        layoutId: 'key_takeaways',
        model: {
          title: '本章要点浓缩',
          bullets: [
            { text: '核函数决定模型偏好', description: '不同核函数对应不同平滑与周期结构。' },
            { text: '后验均值是加权推断', description: '样本与目标点越相似，影响越大。' },
            { text: '后验方差帮助决策', description: '不确定区域更值得继续采样。' },
          ],
          keyTakeaway: '学术型页面需要让“讲授逻辑”本身可视化，这比堆字更重要。',
        },
      },
      {
        label: '随堂实训',
        summary: '练习页把内容从“听懂”推进到“能做”。',
        layoutId: 'academic_practice',
        model: {
          title: '课堂练习',
          task_type: 'task',
          description: '给出一组温度-材料强度样本，判断你会如何选择核函数，并说明理由。',
          requirements: ['说明核函数选择依据', '指出最需要补采样的区间', '给出不确定性判断'],
          hint: '优先关注数据变化趋势而不是单个异常点。',
        },
      },
      {
        label: '学术结束',
        summary: '最后收束为知识点、作业与下一章预告。',
        layoutId: 'ending_academic',
        model: {
          title: '本章小结与课后要求',
          summary_points: ['理解先验/后验的逻辑关系', '掌握核函数对预测行为的影响', '能解释不确定性的教学价值'],
          homework: ['完成一页 GPR 方法比较表', '选择一个小样本场景写 200 字方法说明'],
          next_chapter: '下节课：核函数选择与超参数优化',
        },
      },
    ]),
  },
  interactive: {
    label: '完整故事板预览',
    description: '用一节完整互动课的节奏展示导入、提问、讨论、协作、测验和收束的所有关键布局。',
    pages: buildPages('interactive', [
      {
        label: '导入封面',
        summary: '用轻快封面把课堂氛围先调动起来。',
        layoutId: 'cover',
        model: {
          title: 'AI PPT 共创工作坊',
          subtitle: '让学生边做边理解结构表达',
          author: '交互式课堂实验',
          department: '教学创新中心',
          date: '公开课',
          background_image: artwork.interactiveClass,
        },
      },
      {
        label: '学程地图',
        summary: '地图页先告诉学生今天会经历哪些互动节点。',
        layoutId: 'toc',
        model: {
          title: '今天的互动路线',
          items: [
            { index: 1, text: '情境导入与热身提问' },
            { index: 2, text: '即时投票与案例研讨' },
            { index: 3, text: '协作任务与脑图整理' },
            { index: 4, text: '快速测验与复盘收束' },
          ],
        },
      },
      {
        label: '课前探究',
        summary: '热身问题页适合把学生迅速拉进思考状态。',
        layoutId: 'warmup_question',
        model: {
          question: '如果一套 PPT 只有漂亮页面但没有叙事结构，它还能真正说服人吗？',
          thinkTime: 30,
          hints: ['先想最近一次看到的“好看但没重点”的演示', '再想你为什么没记住它'],
        },
      },
      {
        label: '即时投票',
        summary: '投票页让课堂瞬间变成参与式场域。',
        layoutId: 'poll_interactive',
        model: {
          question: '你觉得最需要优先优化的是哪一项？',
          instruction: '30 秒内完成投票，随后公布结果。',
          options: [
            { text: '结构设计', emoji: 'A' },
            { text: '视觉统一', emoji: 'B' },
            { text: '互动节奏', emoji: 'C' },
          ],
        },
      },
      {
        label: '案例研讨',
        summary: '用案例页抛出真实问题，方便进入讨论。',
        layoutId: 'title_content',
        model: {
          title: '案例：为什么这个课堂项目没人愿意继续看？',
          content: [
            '学生花了很多时间做页面，但没有明确的故事推进节点。',
            '老师需要引导大家先识别结构问题，再回头讨论画面风格。'
          ],
          highlight: '互动型模板的重点不是热闹，而是把参与行为设计进信息结构里。',
        },
      },
      {
        label: '协作任务',
        summary: '协作页适合明确角色、产出和时间限制。',
        layoutId: 'title_bullets',
        model: {
          title: '分组协作任务',
          bullets: [
            { text: '信息组', description: '梳理主题、问题和结论顺序。' },
            { text: '视觉组', description: '确定版式层级和关键画面。' },
            { text: '主持组', description: '设计提问、停顿和讲述节奏。' },
          ],
          keyTakeaway: '每个人都知道自己负责什么，课堂协作才不会变成空转。',
        },
      },
      {
        label: '知识脑图',
        summary: '脑图页帮助把讨论结果重新归纳成结构。',
        layoutId: 'image_full',
        model: {
          title: '共创后的知识脑图',
          image_src: artwork.interactiveClass,
          image_alt: '课堂脑图预览',
          caption: '把观点、证据和讲述顺序整理到同一张图里，便于全班共识化。',
        },
      },
      {
        label: '交互测验',
        summary: '测验页适合在中后段快速检查理解程度。',
        layoutId: 'title_bullets',
        model: {
          title: '快速检查',
          subtitle: '下面哪一项最能提升课堂说服力？',
          bullets: [
            { text: 'A. 统一动画', description: '好看，但不一定解决信息问题。' },
            { text: 'B. 清楚的故事骨架', description: '能让观众知道为什么要继续听。' },
            { text: 'C. 更大的标题字号', description: '只是局部优化。' },
          ],
          keyTakeaway: '互动型模板适合把正确答案嵌入讨论过程，而不是只放在最后公布。',
        },
      },
      {
        label: '情境模拟',
        summary: '情境页用角色和约束把练习拉近真实现场。',
        layoutId: 'title_content',
        model: {
          title: '模拟任务',
          content: [
            '假设你需要在 5 分钟内向校方说明一个教学创新方案。',
            '请用今天的互动结构重新安排你的页面顺序，只保留最必要的 6 张。'
          ],
          highlight: '让学生把模板结构迁移到自己的真实任务里，学习才算发生。',
        },
      },
      {
        label: '评价结语',
        summary: '最后收束课堂产出、评价标准与下一步行动。',
        layoutId: 'ending',
        model: {
          title: '本次工作坊收束',
          subtitle: '带走一套可复用的课堂组织方式',
          reflection_blocks: [
            { title: '今天完成了什么', items: ['识别结构问题', '完成小组共创', '做了一次现场复盘'] },
            { title: '下次继续做', items: ['把模板应用到自己的主题', '录一次 3 分钟试讲视频'] },
          ],
          closing: '互动模板不是加几个按钮，而是让每一页都能推动课堂往前走。',
        },
      },
    ]),
  },
  visual: {
    label: '完整故事板预览',
    description: '按现场叙事的节奏把时间线、大图、对比、细节和画廊陈列完整展开，让用户看到整个系列的视觉张力。',
    pages: buildPages('visual', [
      {
        label: '现场封面',
        summary: '先用强画面封面把故事氛围拉满。',
        layoutId: 'cover',
        model: {
          title: '城市更新观察档案',
          subtitle: '从现场勘察到设计表达',
          author: '视觉叙事工作室',
          department: '品牌与空间组',
          date: '2026 Collection',
          background_image: artwork.visualArchive,
        },
      },
      {
        label: '演进轴线',
        summary: '时间线先交代背景变化和故事骨架。',
        layoutId: 'timeline',
        model: {
          title: '项目演进轴线',
          orientation: 'vertical',
          events: [
            { year: '2021', title: '现场勘察', description: '记录空间状态与典型问题。' },
            { year: '2023', title: '方案成形', description: '形成修缮策略和展示逻辑。' },
            { year: '2026', title: '成果传播', description: '沉淀为可复用的案例资产。' },
          ],
        },
      },
      {
        label: '现场观测',
        summary: '大图页适合放全景图或关键现场记录。',
        layoutId: 'image_full',
        model: {
          title: '勘察现场总览',
          image_src: artwork.visualArchive,
          image_alt: '现场勘察图',
          caption: '视觉叙事系列的优势，是能先用一张图把观众带入场景。',
        },
      },
      {
        label: '专业图库',
        summary: '图库页适合陈列一组风格统一的图像样本。',
        layoutId: 'portfolio',
        model: {
          title: '关键画面样本',
          subtitle: '统一色调与镜头语言',
          layout: 'grid',
          items: [
            { image_src: artwork.visualArchive, title: '主场景', description: '建立叙事背景', tags: ['现场', '氛围'] },
            { image_src: artwork.academicPaper, title: '细部标注', description: '补充专业观察', tags: ['细节', '记录'] },
            { image_src: artwork.interactiveClass, title: '人物活动', description: '引入尺度与情绪', tags: ['人物', '关系'] },
          ],
        },
      },
      {
        label: '修缮对比',
        summary: '对比页适合用左右结构直观说明变化。',
        layoutId: 'two_column',
        model: {
          title: '改造前后对比',
          left: {
            type: 'bullets',
            header: '改造前',
            bullets: [
              { text: '信息碎片化', description: '没有清晰主线。' },
              { text: '画面质感弱', description: '素材风格不统一。' },
              { text: '缺少重点镜头', description: '难以形成记忆点。' },
            ],
          },
          right: {
            type: 'bullets',
            header: '改造后',
            bullets: [
              { text: '主线更清晰', description: '场景推进顺序明确。' },
              { text: '视觉更集中', description: '色调和镜头语言统一。' },
              { text: '情绪更完整', description: '观众更容易沉浸其中。' },
            ],
          },
        },
      },
      {
        label: '图文信息流',
        summary: '信息流页适合在大图叙事中补充少量关键解释。',
        layoutId: 'title_bullets',
        model: {
          title: '画面之外，文字该承担什么',
          bullets: [
            { text: '补足判断依据', description: '解释为什么这个镜头重要。' },
            { text: '承接情绪转场', description: '让故事推进更自然。' },
            { text: '标注专业信息', description: '补上坐标、材质或时间背景。' },
          ],
          keyTakeaway: '视觉型模板里，文字应该像旁白，而不是第二张 PPT。',
        },
      },
      {
        label: '踏勘报告',
        summary: '第二张大图页用于展示更具体的现场证据。',
        layoutId: 'image_full',
        model: {
          title: '多点位踏勘记录',
          image_src: artwork.techGrid,
          image_alt: '踏勘拼贴图',
          caption: '用另一张全图页展示不同观察视角，帮助叙事节奏形成层次。',
        },
      },
      {
        label: '标本特写',
        summary: '细节放大页适合强调工艺、材质或关键证据。',
        layoutId: 'detail_zoom',
        model: {
          title: '材料细节标注',
          image_src: artwork.visualArchive,
          annotations: [
            { x: 24, y: 38, label: 'A', description: '表面肌理变化最明显的区域。' },
            { x: 62, y: 52, label: 'B', description: '修缮后色差控制更稳定。' },
            { x: 79, y: 30, label: 'C', description: '保留原始痕迹，增强故事真实感。' },
          ],
        },
      },
      {
        label: '成果品鉴',
        summary: '结尾前再用一次画廊陈列展示最终成果集合。',
        layoutId: 'portfolio',
        model: {
          title: '成果陈列',
          subtitle: '从观察走向作品表达',
          layout: 'masonry',
          items: [
            { image_src: artwork.visualArchive, title: '场景海报', tags: ['品牌', '空间'] },
            { image_src: artwork.modernPulse, title: '展陈主视觉', tags: ['主视觉', '事件'] },
            { image_src: artwork.academicPaper, title: '研究手册', tags: ['档案', '方法'] },
          ],
        },
      },
      {
        label: '现场收束',
        summary: '最后一页回到愿景和核心印象。',
        layoutId: 'ending',
        model: {
          title: '让视觉成为讲述方式',
          subtitle: '不是每页都塞信息，而是让每页都留下画面记忆',
          reflection_blocks: [
            { title: '系列优势', items: ['大图有情绪', '细节可标注', '故事推进自然'] },
            { title: '适用场景', items: ['品牌故事', '空间项目', '案例档案'] },
          ],
          closing: '视觉叙事型模板的强项，是让观众在滚动中自然进入故事。',
        },
      },
    ]),
  },
  practical: {
    label: '完整故事板预览',
    description: '严格按实训现场的节奏排列，从点检、安全到 SOP、避坑和交付收束，完整展示实操流程系列。',
    pages: buildPages('practical', [
      {
        label: '实训封面',
        summary: '用明确的课题名和现场气质开启操作型内容。',
        layoutId: 'cover',
        model: {
          title: '设备上机实训',
          subtitle: '从准备点检到成果交付',
          author: '技能培训中心',
          department: '制造工程教研室',
          date: 'Workshop',
          background_image: artwork.practicalLab,
        },
      },
      {
        label: '核查清单',
        summary: '点检页必须放在最前面，避免后面返工。',
        layoutId: 'title_bullets',
        model: {
          title: '上机前核查清单',
          bullets: [
            { text: '环境确认', description: '检查软件版本、素材目录和输出路径。' },
            { text: '设备确认', description: '确认接口、电源和备份设备状态。' },
            { text: '权限确认', description: '确认本次任务具备写入与导出权限。' },
          ],
          keyTakeaway: '实操类模板先确认“能否安全开工”，再开始讲步骤。',
        },
      },
      {
        label: '安全禁令',
        summary: '安全页需要在任何操作示范前强插进去。',
        layoutId: 'safety_notice',
        model: {
          title: '操作前必须牢记',
          warnings: [
            { level: 'danger', text: '未备份原始文件时，不得直接覆盖批处理输出。' },
            { level: 'warning', text: '运行脚本前确认当前目录，不要误删上级资产。' },
            { level: 'caution', text: '演示阶段优先用压缩预览资源，避免整机卡顿。' },
          ],
          summary: '实训模板的核心体验，不是快，而是稳。',
        },
      },
      {
        label: '设备认知',
        summary: '先认设备和部件，再讲步骤，用户不会发懵。',
        layoutId: 'two_column',
        model: {
          title: '工作台组件认知',
          left: {
            type: 'image',
            header: '设备示意图',
            image_src: artwork.practicalLab,
            image_alt: '工作台示意',
          },
          right: {
            type: 'bullets',
            header: '关键部件',
            bullets: [
              { text: '控制区', description: '用于任务启动、暂停和回滚。' },
              { text: '监测区', description: '实时观察状态和异常提示。' },
              { text: '输出区', description: '检查结果文件与命名规范。' },
            ],
          },
        },
      },
      {
        label: 'SOP 手册',
        summary: '垂直流程页非常适合实操教学。',
        layoutId: 'vertical_timeline',
        model: {
          title: '标准操作流程',
          accent_color: '#14b8a6',
          events: [
            { title: '步骤 1: 建立工程', description: '创建独立任务目录并同步命名规则。'},
            { title: '步骤 2: 导入素材', description: '校验清晰度、比例和编码格式。'},
            { title: '步骤 3: 运行生成', description: '按预设参数完成批处理。'},
            { title: '步骤 4: 检查结果', description: '抽检关键页面并记录异常。', is_highlighted: true},
          ],
        },
      },
      {
        label: '工单指令',
        summary: '操作页要把具体动作说明到能直接照着做。',
        layoutId: 'title_content',
        model: {
          title: '本次任务要求',
          content: [
            '在 20 分钟内完成一个 8 页教学案例的生成与检查。',
            '每位学员需要提交目录截图、预览链接和一条自我复盘记录。'
          ],
          highlight: '实操型模板需要让任务指令比视觉样式更醒目。',
        },
      },
      {
        label: '故障排除',
        summary: '对照页适合讲最常见的错误和修复动作。',
        layoutId: 'two_column',
        model: {
          title: '常见错漏与修复',
          left: {
            type: 'bullets',
            header: '错误现象',
            bullets: [
              { text: '页面状态未更新', description: '历史列表仍显示未开始。' },
              { text: '预览图空白', description: '首页资源未回推到卡片。' },
              { text: '目录错乱', description: '页面顺序与状态机不一致。' },
            ],
          },
          right: {
            type: 'bullets',
            header: '处理动作',
            bullets: [
              { text: '回推页面状态', description: '以页面级真实资源校准项目状态。' },
              { text: '补首页预览资源', description: '优先使用首张 HTML 作为历史预览。' },
              { text: '统一排序字段', description: '按 order_index 稳定输出。' },
            ],
          },
        },
      },
      {
        label: '老师小结',
        summary: '引用页适合放经验口诀和避坑提醒。',
        layoutId: 'quote',
        model: {
          quote: '先把流程跑顺，再去追求每一页都漂亮。稳定的操作链路本身就是用户体验。',
          author: '实训讲师',
          source: '课堂操作复盘',
        },
      },
      {
        label: '零件精度',
        summary: '高密度参数说明页适合补充规范与验收标准。',
        layoutId: 'title_content',
        model: {
          title: '交付验收标准',
          content: [
            '输出页面命名必须连续、可追踪，预览资源必须能被历史页直接读取。',
            '异常任务需要保留错误阶段、错误信息与最后一个成功资源，用于后续复盘。'
          ],
          highlight: '工程型模板的信任感来自“标准明确”。',
        },
      },
      {
        label: '实训总结',
        summary: '最后把成果交付和后续练习要求说清楚。',
        layoutId: 'ending',
        model: {
          title: '本次实训交付',
          subtitle: '把流程跑通，才能把模板真正用起来',
          reflection_blocks: [
            { title: '必须提交', items: ['完整生成结果', '历史预览截图', '问题复盘记录'] },
            { title: '继续练习', items: ['尝试不同模板系列', '补充一页个人操作 SOP'] },
          ],
          closing: '实操模板的好处，是让“怎么做”比“看起来怎么样”更明确。',
        },
      },
    ]),
  },
  modern: {
    label: '完整故事板预览',
    description: '这个系列主打高冲击视觉和非对称构图，因此直接把全部先锋布局按一场提案的节奏完整摊开。',
    pages: buildPages('modern', [
      {
        label: '沉浸封面',
        summary: '先用全画幅的沉浸页建立品牌级气场。',
        layoutId: 'cinematic_overlay',
        model: {
          label: 'CAMPAIGN OPENING',
          title: '把提案做成一场被记住的视觉事件',
          description: '用电影感画面和简短文案，先抓住情绪，再进入内容。',
          metric: { value: '95%', label: '首屏停留率' },
          background_image: artwork.modernPulse,
        },
      },
      {
        label: '破格叠加',
        summary: '用超大字和错位层级抛出核心主张。',
        layoutId: 'overlap',
        model: {
          background_text: 'BOLD',
          label: '品牌主张',
          title: '视觉不是装饰，而是你最强的说服力',
          description: '这类布局适合迅速把观众注意力集中到一个观点上。',
          key_point: '先建立气质，再展开信息。',
          accent_color: '#fb923c',
        },
      },
      {
        label: '导航卡片',
        summary: '目录不必普通列表，也可以成为提案的一部分。',
        layoutId: 'sidebar_card',
        model: {
          title: 'Proposal Flow',
          subtitle: 'From Signal To Story',
          items: [
            { index: 1, title: 'Context', subtitle: '背景与机会' },
            { index: 2, title: 'Signal', subtitle: '关键洞察' },
            { index: 3, title: 'Concept', subtitle: '核心表达' },
            { index: 4, title: 'Execution', subtitle: '落地路径' },
          ],
        },
      },
      {
        label: '同心聚焦',
        summary: '转场页适合把所有视线聚焦到一个关键问题。',
        layoutId: 'concentric_focus',
        model: {
          label: 'KEY QUESTION',
          title: '我们要让品牌被看见，还是被记住？',
          subtitle: 'Visibility is not memorability.',
          accent_color: '#fb923c',
        },
      },
      {
        label: '横向流程',
        summary: '流程页把执行方案讲得更清楚。',
        layoutId: 'flow_process',
        model: {
          title: 'Campaign Rollout',
          steps: [
            { number: 1, label: 'Seed Signal', description: '先制造一个强识别画面。' },
            { number: 2, label: 'Scale Story', description: '把画面延展成完整叙事。' },
            { number: 3, label: 'Launch Scene', description: '在线下和线上形成事件。' },
            { number: 4, label: 'Keep Echo', description: '把视觉资产继续复用。' },
          ],
        },
      },
      {
        label: '矩阵宫格',
        summary: '矩阵页适合并列说明多个策略模块。',
        layoutId: 'grid_matrix',
        model: {
          title: 'Strategy Matrix',
          subtitle: '四个支撑点同时成立，品牌才会完整',
          items: [
            { title: 'Signal', description: '建立第一眼记忆点', tag: 'Attention', accent_color: '#fb923c' },
            { title: 'Story', description: '让信息具备递进关系', tag: 'Narrative', accent_color: '#38bdf8' },
            { title: 'System', description: '沉淀成统一视觉资产', tag: 'System', accent_color: '#22c55e' },
            { title: 'Scene', description: '进入真实传播场景', tag: 'Launch', accent_color: '#f472b6' },
          ],
        },
      },
      {
        label: '动感斜切',
        summary: '对比页适合制造张力和立场感。',
        layoutId: 'diagonal_split',
        model: {
          left: {
            title: '普通提案',
            subtitle: 'Safe / Flat',
            description: '信息完整，但缺少让人记住的情绪张力。',
            points: ['视觉均匀', '重点不突出', '难形成事件感'],
            accent_color: '#64748b',
          },
          right: {
            title: '先锋提案',
            subtitle: 'Sharp / Intentional',
            description: '通过版式冲突与层级对比，先抓住注意力再交付信息。',
            points: ['节奏更强', '主张更明确', '记忆点更集中'],
            accent_color: '#fb923c',
          },
        },
      },
      {
        label: '三柱支撑',
        summary: '三柱页适合把方法论收束成三根主支柱。',
        layoutId: 'tri_column',
        model: {
          title: 'Three Pillars',
          columns: [
            { number: 1, title: 'Identity', description: '用独特视觉建立识别。', accent_color: '#fb923c' },
            { number: 2, title: 'Narrative', description: '让页面之间形成故事推进。', accent_color: '#38bdf8' },
            { number: 3, title: 'Recall', description: '让观众离开后仍能记住。', accent_color: '#22c55e' },
          ],
        },
      },
      {
        label: '科技深色分割',
        summary: '数学感或逻辑感较强的内容也能维持先锋视觉。',
        layoutId: 'dark_math',
        model: {
          title: 'Attention Formula',
          subtitle: '视觉冲击如何转化为传播效率',
          description: '现代系列不仅能讲品牌，也能讲更抽象的逻辑模型。',
          note: '通过深色分栏与发光边界，让复杂概念也保持强风格。',
          formulas: [
            { label: 'Signal', latex: 'Impact = Contrast \\times Scale', explanation: '对比越强，第一眼记忆越深。' },
            { label: 'Recall', latex: 'Recall = Story + Repetition', explanation: '故事和重复共同决定记忆强度。' },
          ],
        },
      },
      {
        label: '垂直脉络',
        summary: '最后用时间脉络把提案推进到落地阶段。',
        layoutId: 'vertical_timeline',
        model: {
          title: 'Launch Timeline',
          accent_color: '#fb923c',
          events: [
            { title: 'Week 1', description: '提炼品牌关键词和视觉母体。' },
            { title: 'Week 2', description: '完成主视觉与叙事样页。' },
            { title: 'Week 3', description: '在发布场景中完成应用适配。' },
            { title: 'Week 4', description: '沉淀为完整资产库。', is_highlighted: true },
          ],
        },
      },
    ]),
  },
  minimal_clean: {
    label: '精工蓝图 (Exclusive)',
    description: '工业 2026 技术美学：采用极简 CAD 线图、Bento 数据网格与宏大排版，传达精密制造与工程逻辑。',
    pages: buildPages('minimal-clean', [
      {
        label: '精工解析封面',
        summary: 'CAD 蓝图底纹，超大号非对称排版，建立工业极简基调。',
        layoutId: 'blueprint_cover',
        model: {
          title: '涡扇发动机叶片精工',
          subtitle: '从单晶高温合金到气膜冷却孔的微观宇宙',
          author: '动力工程教研室',
          department: '航空制造专业',
          date: 'REV.2026.04',
        },
      },
      {
        label: '大师准则墙报',
        summary: '巨型引号装饰与呼吸感排版，用于传达灵魂观点。',
        layoutId: 'blueprint_quote',
        model: {
          quote: '制造的极致不在于庞大，而在于控制毫厘之间的生死。',
          author: '《航空发动机：从理论到制造》',
          description: '论叶片熔点与气流温度之悖论',
        },
      },
      {
        label: '规格明细清单',
        summary: '侧边栏修订记录风格目录，体现工程文档的严谨性。',
        layoutId: 'blueprint_toc',
        model: {
          title: '技术演进路线',
          items: [
            { index: 1, text: '材料特性：单晶合金' },
            { index: 2, text: '结构工艺：蛇形流道' },
            { index: 3, text: '表面处理：稀土涂层' },
            { index: 4, text: '制造难点：激光打孔' },
            { index: 5, text: '可靠性验证：应力测试' },
          ],
        },
      },
      {
        label: '技术规格卡',
        summary: '三轴向参数对比卡，用于展示教学目标的维度。',
        layoutId: 'blueprint_spec_card',
        model: {
          title: '制造精度要求',
          subtitle: '航空工业标准 // GR-104',
          bullets: [
            { text: '极高热耐受', description: '需在 1700°C 环境下保持结构稳固。' },
            { text: '亚微米精度', description: '榫头配合部位公差控制在 ±0.005mm。' },
            { text: '零晶界缺陷', description: '采用定向凝固技术，全程无应力点。' },
          ],
        },
      },
      {
        label: '剖面图注释板',
        summary: '左侧 CAD 示意圆环，右侧字母索引注释。',
        layoutId: 'blueprint_annotation',
        model: {
          title: '核心组件解析',
          image_src: artwork.academicPaper,
          annotations: [
            { label: 'A', content: '高压涡轮叶片主体' },
            { label: 'B', content: '气膜连接孔阵列' },
            { label: 'C', content: '陶瓷热障涂层 (TBC)' },
          ],
        },
      },
      {
        label: '阶段里程碑页',
        summary: '左侧巨型数字标识，右侧详细说明。',
        layoutId: 'blueprint_section_title',
        model: {
          title: '02. 制造工艺流程',
          subtitle: 'MANUFACTURING PROCESS',
          description: '从熔模铸造到精密研磨的 14 道核心工序全解析。',
        },
      },
      {
        label: '工艺对比双板',
        summary: '左右分栏对比，适合展示新旧技术迭代。',
        layoutId: 'blueprint_dual_panel',
        model: {
          title: '工艺迭代演进',
          left: {
            header: '传统精密铸造',
            bullets: [
              { text: '成品率约 45%', description: '无法完全避免微观晶界缺陷。' },
              { text: '热承载力较低', description: '工作温度极限受限于材料熔点。' },
            ],
          },
          right: {
            header: '定向凝固技术',
            bullets: [
              { text: '成品率提升至 82%', description: '消除横向晶界，显著提高蠕变强度。' },
              { text: '热稳定性能极佳', description: '配合气膜冷却可超越材料熔点运行。' },
            ],
          },
        },
      },
      {
        label: '时间轴轨迹',
        summary: '极简点位式时间轴。',
        layoutId: 'blueprint_timeline',
        model: {
          title: '测试节点计划',
          steps: [
            { label: '应力实验室测试', description: '模拟 2000 小时持续高温环境。' },
            { label: '风洞模拟验证', description: '验证气膜冷却孔的流道效率。' },
            { label: '整机挂架试车', description: '在真实极端工况下监测振动特征。' },
          ],
        },
      },
      {
        label: 'Bento 数据格',
        summary: '利用 Bento 式布局展示多维度性能数据。',
        layoutId: 'blueprint_bento_grid',
        model: {
          title: '性能表现矩阵',
          items: [
            { title: '热效率', content: '34.5%', tag: 'OPTIMAL' },
            { title: '疲劳寿命', content: '15000h+', tag: 'LEVEL A' },
            { title: '核心转速', content: '12500rpm', tag: 'STABLE' },
          ],
        },
      },
      {
        label: '三极支撑对比',
        summary: '三路并进的规格横评。',
        layoutId: 'blueprint_tri_compare',
        model: {
          title: '关键材料特性对比',
          columns: [
            { title: '第一代合金', points: ['耐温 1050°C', '蠕变强度普通', '成本较低'] },
            { title: '第二代单晶', points: ['耐温 1150°C', '抗蠕变性显著增强', '中等成本'] },
            { title: '第三代稀土', points: ['耐温 1250°C+', '几乎无疲劳退化', '高精尖成本'] },
          ],
        },
      },
      {
        label: '样本展示长廊',
        summary: '大面积图样展示区。',
        layoutId: 'blueprint_gallery',
        model: {
          title: '微观结构图样',
          subtitle: '扫描电镜下的叶片表面',
        },
      },
      {
        label: '巨幕揭示页',
        summary: '为核心观点预留的大篇幅文字展示。',
        layoutId: 'blueprint_big_reveal',
        model: {
          title: '突破技术封锁',
          content: '通过自主研发的高速脉冲激光打孔机，我们实现了在 0.5mm 壁厚上精准布置 3000 个非线性气膜孔，标志着国产发动机寿命的一次跨越式跃升。',
        },
      },
      {
        label: '精工结语归档',
        summary: '结尾页，保留 CAD 风格签名区域。',
        layoutId: 'blueprint_closing',
        model: {
          title: '航空动力，精益求精',
          closing: 'REPORT ARCHIVED // MISSION SUCCESSFUL',
        },
      },
    ]),
  },

  warm_edu: {
    label: '完整故事板预览',
    description: '12种重工终端布局全览 —— 从指令下达到任务归档，贯穿高危实训的完整闭环。',
    pages: buildPages('warm-edu', [
      {
        label: '指令下达页',
        summary: '任务代号 + 倒计时封面，黑底黄警戒水印，建立高危重工现场感。',
        layoutId: 'vocational_intro_cover',
        model: {
          title: '新能源汽车高压系统故障诊断实训',
          subtitle: '任务代号：EV-HV-07 │ 安全等级：高危工况',
          author: '实测教员：陈工',
          department: '新能源汽车技术教研组',
          date: '倒计时：120 分钟',
          hero_image: artwork.industryCase,
        },
      },
      {
        label: '作战序列页',
        summary: '硬切角相位卡片目录，青色首步高亮，告知学员完整作战节奏。',
        layoutId: 'vocational_mission_toc',
        model: {
          title: '作战序列 / OPERATION SEQUENCE',
          subtitle: '严格按节点顺序推进，禁止跨步操作',
          items: [
            { index: 1, text: '高压下电与安全验证' },
            { index: 2, text: '三电系统绝缘阻值测量' },
            { index: 3, text: '故障码读取与定位分析' },
            { index: 4, text: '部件更换与通电复测' },
          ],
        },
      },
      {
        label: '目标锁定制',
        summary: '雷达同心圆背景 + 狙击框客观卡，精准锁定本工位三大核心击破目标。',
        layoutId: 'vocational_target_lock',
        model: {
          title: '本工位目标契约',
          subtitle: '击破这 3 个绝对重点',
          bullets: [
            { text: '能使用绝缘电阻仪对动力电池包进行高压绝缘阻值检测' },
            { text: '能根据 DTC 故障码精准定位 BMS 控制板异常节点' },
            { text: '严格执行"断电、验电、等待5分钟"高压作业金标准' },
          ],
        },
      },
      {
        label: '禁忌防呆清单',
        summary: '极端红色斜纹边框，"严禁"关键词自动标红，未过核查不得继续。',
        layoutId: 'vocational_safety_check',
        model: {
          title: '上桩前生死核查',
          subtitle: '未完成以下确认，严禁触碰高压电缆与接插件',
          bullets: [
            { text: '严禁在未完成断高压服务插头操作前接触橙色高压线缆。' },
            { text: '必须确认维修开关已断开并取出，用绝缘胶带封堵插槽。' },
            { text: '必须等待至少 5 分钟让 DC-Link 电容自然放电至安全值。' },
            { text: '严禁两人同时在高压系统不同节点进行测量操作。' },
          ],
        },
      },
      {
        label: '装备库存阵列',
        summary: 'Bento 深色网格呈现工器具备料清单，大格重点装备突出显示。',
        layoutId: 'vocational_equipment_grid',
        model: {
          title: '高压作业装备备料',
          subtitle: '检查你的弹药库是否齐备',
          bullets: [
            { text: '绝缘电阻仪 Fluke 1587FC（1000V档）' },
            { text: '1000V 绝缘手套与绝缘靴（A级）' },
            { text: '高压服务插头专用扳手' },
            { text: '防弧面屏与绝缘改锥套装' },
            { text: '万用表 Fluke 17B+（AC/DC）' },
          ],
        },
      },
      {
        label: '蓝图微距透视',
        summary: 'CAD 标注式透视图，瞄准镜扫描动力电池包核心结构热区。',
        layoutId: 'vocational_blueprint_zoom',
        model: {
          title: '动力电池包拓扑透视',
          image_src: artwork.industryCase,
          annotations: [
            { x: 28, y: 38, label: 'BMS 控制板', description: '电池管理核心，负责采集各模组电压/温度信号。' },
            { x: 65, y: 55, label: '高压接触器组', description: '总正/总负/预充接触器，控制高压通断。' },
            { x: 48, y: 72, label: '手动维修开关 MSD', description: '断开此处即可物理切断高压回路，操作前必须取出。' },
          ],
          background_image: artwork.industryCase,
        },
      },
      {
        label: 'SOP 动作流',
        summary: '横排步骤横幅，黄色年度工业警戒配色，逐步呈现高压上电核验 SOP。',
        layoutId: 'vocational_sop_banner',
        model: {
          title: '高压系统绝缘阻值测量 SOP',
          subtitle: '进入高压作业前的生死防线',
          steps: [
            { number: 1, label: '断开 MSD 并封堵', description: '取出手动维修开关，用绝缘胶带封堵，防止误复位。' },
            { number: 2, label: '等待 5 分钟放电', description: '电容放电期间严禁任何接触高压线的操作。' },
            { number: 3, label: '设置绝缘仪档位', description: '选 1000V DC 档，测试棒分别接总正 P 和车身地。' },
            { number: 4, label: '读取并记录数值', description: '正常值应 ≥500MΩ，低于此值须立即挂红牌暂停。' },
          ],
        },
      },
      {
        label: '红黄警戒断路器',
        summary: '左合规 vs 右灾难对比，红色右栏对比呈现高压违规的致命后果。',
        layoutId: 'vocational_warning_split',
        model: {
          title: '高压诊断路径：合规 VS 灾难',
          left: {
            header: '规范作业路径',
            bullets: [
              { text: '先断 MSD、等待放电', description: '从低压侧开始诊断，逐步缩小故障范围。' },
              { text: '绝缘测量先行', description: '确认绝缘合格再进行任何接插件插拔操作。' },
            ],
          },
          right: {
            header: '高危违规路径',
            bullets: [
              { text: '未断高压直接操作', description: '在高压系统带电状态下拆插橙色接插件。' },
              { text: '灾难后果', description: '电弧闪络瞬间电流可达数千安培，造成致命烧伤！' },
            ],
            content: '新能源高压系统铁律：\n高压作业必须在 MSD 断开、验电确认安全后进行！',
          },
        },
      },
      {
        label: '状态参数平显',
        summary: 'HUD 仪表盘式指标回传，实时展示关键高压状态与报警参数。',
        layoutId: 'vocational_piv_hud',
        model: {
          title: '高压系统核心状态实时回传',
          subtitle: '通电诊断模式 / HV_DIAG_ACTIVE',
          metrics: [
            { value: '0.08MΩ', label: '整包绝缘阻值', note: '严重低于 500MΩ 合格线' },
            { value: '47°C', label: '电池模组最高温', note: '接近热管理警戒阈值' },
            { value: '396V', label: '当前总包电压', note: '系统仍处于带高压状态' },
          ],
          bars: [
            { label: '绝缘状态指数', baseline: 100, current: 8 },
            { label: '热管理系统负荷', baseline: 60, current: 88 },
            { label: '整体故障风险评估', baseline: 20, current: 91 },
          ],
          bullets: [
            { text: 'FAULT: ISO_RESIST_LOW', description: '第3模组对车身漏电路径阻值仅 80kΩ。' },
            { text: 'WARN: CELL_TEMP_HIGH', description: '快充后冷却系统未及时响应，排水管疑似堵塞。' },
          ],
          insight: '绝缘阻值 <500MΩ 即判定为高压安全隐患，必须立即下电并挂红牌禁用。',
        },
      },
      {
        label: '故障报错终端',
        summary: '黑屏绿字 CRT 终端，展示故障病历卡与 DTC 报错堆栈，引导排查思路。',
        layoutId: 'vocational_fault_diagnostic',
        model: {
          title: '工况病历卡 #EV-07：绝缘泄漏',
          subtitle: 'ERR_ISO_LOW // 高压绝缘失效',
          content: [
            '【故障现象】车辆充电桩连接后，BMS 主控板触发 P0D00 绝缘电阻低报警，充电立即中止。',
            '【前置条件】行驶里程：78,000km；上次绝缘测量合规（6个月前）；昨日遭遇强降雨。',
            '【接诊要求】请在确认高压下电后，使用绝缘电阻仪逐模组定位泄漏节点，完成排查并填写故障报告。',
          ],
        },
      },
      {
        label: '实兵推演沙盘',
        summary: '蓝图网格背景的模拟考核沙盘，驱动学员在拓扑图上定位故障热区。',
        layoutId: 'vocational_practice_sandbox',
        model: {
          title: '逐模组定位推演 / 实操考核',
          subtitle: '根据故障病历卡，在拓扑图上标记绝缘泄漏热区',
        },
      },
      {
        label: '归档核收签章',
        summary: '巨型绿色橡皮印章水印 + 签名栏，完整闭合考核流程的最终归档页。',
        layoutId: 'vocational_mission_complete',
        model: {
          title: 'MISSION COMPLETE',
          subtitle: 'EV-HV-07 OPERATION CONCLUDED',
          content: '绝缘泄漏节点已成功定位并完成模组更换验证。整包绝缘阻值恢复至 1200MΩ 以上，热管理系统排水管疏通完毕。工单已归档，考核通过，准备移交复检。',
        },
      },
    ]),
  },

  business_pro: {
    label: '完整故事板预览',
    description: '12种 DATA VAULT 布局全览 —— 彭博终端风格，专为深度行业分析与情报研判设计。',
    pages: buildPages('business-pro', [
      {
        label: '情报封档页',
        summary: '机密档案封面，包含任务代号、密级标志与分析员信息。',
        layoutId: 'vault_cover',
        model: {
          title: '2026 新能源汽车维修行业深度研判',
          subtitle: 'MARKET INTELLIGENCE // SECTOR: AUTOMOTIVE',
          author: '产教融合研究中心',
          date: '2026-Q2 RELEASE',
          classification: 'CONFIDENTIAL',
        },
      },
      {
        label: '线索导览板',
        summary: '情报目录，带进度统计与各章节密级标识。',
        layoutId: 'vault_index',
        model: {
          title: 'INTEL SECTIONS',
          subtitle: '本报告涵盖市场格局、技术演进及人才缺口三大核心维度',
          items: [
            '全球新能源汽车市场态势',
            '三电系统维修技术壁垒分析',
            '职教体系与产业链匹配度',
            '2026 关键风险与机遇评价',
          ],
        },
      },
      {
        label: '核心指标墙',
        summary: 'KPI Grid 分页呈现行业关键数据指标，大数字驱动。',
        layoutId: 'vault_kpi_grid',
        model: {
          title: 'SECTOR KPI MONITOR',
          subtitle: '关键行业指标实时快照',
          bullets: [
            { text: '35% 售后营收增速', description: '年复合增长率 (CAGR) 持续领跑整体车市。' },
            { text: '1:8 技师缺口比', description: '每 8 台新能源车仅对应 1 名合格高压电技师。' },
            { text: '850B 市场总规模', description: '预计 2028 年售后维保市场将突破 8500 亿。' },
            { text: '92% 集中分布', description: '新增维修业务高度集中在长三角与大湾区。' },
            { text: '42.5k 平均薪资', description: '三电诊断工程师平均月薪已达行业均值 2.2 倍。' },
            { text: '120% 培训需求', description: '传统维修站升级新能源能力的迫切度极高。' },
          ],
        },
      },
      {
        label: '风险热力矩阵',
        summary: '多维度评估行业风险点，色块标识严重等级。',
        layoutId: 'vault_heatmap',
        model: {
          title: 'THREAT LANDSCAPE',
          subtitle: '基于当前政策与技术环境的风险多维评估',
          bullets: [
            { text: '技术迭代过快', description: '固态电池及 800V 平台对现有维修设备的代差冲击。' },
            { text: '人才结构断层', description: '传统机电工无法直接转型，教学资源极度匮乏。' },
            { text: '核心数据闭环', description: '车企对诊断数据的封锁导致第三方维修商准入困难。' },
            { text: '高压作业事故', description: '未受训人员非法操作导致的触电与起火风险居高不下。' },
            { text: '售后体系混乱', description: '非标维修导致电池残值评估缺乏公信力。' },
            { text: '政策补贴退坡', description: '下游运营端盈利能力下降影响维保投入。' },
          ],
        },
      },
      {
        label: '时序脉络轴',
        summary: '行业演进时间轴，带有阶段状态标识。',
        layoutId: 'vault_timeline',
        model: {
          title: 'EV AFTERMARKET EVOLUTION',
          subtitle: '中国新能源维保市场发展阶段',
          steps: [
            { label: '起步探索期 (2015-2020)', description: '以车企直营模式为主，社会化维修初现。' },
            { label: '爆发成长期 (2021-2024)', description: '保有量突破千万级，三电维修认证体系建立。' },
            { label: '存量竞争期 (2025-2028)', description: '质保集中到期，第三方维修连锁大规模入局。' },
            { label: '智慧融合期 (2029+)', description: '预测性维护成为主流，数据修复取代硬件更换。' },
          ],
        },
      },
      {
        label: '情报双纵切',
        summary: '多维度横评比较，左侧现状 vs 右侧预测。',
        layoutId: 'vault_split_brief',
        model: {
          title: '战略选型：自营 VS 授权',
          left: {
            header: '车企直营模式',
            bullets: [
              { text: '数据完全闭环', description: '掌握底层诊断协议，技术支持力最强。' },
              { text: '客户忠诚度高', description: '首任车主终身质保强绑定。' },
            ],
          },
          right: {
            header: '社会化授权模式',
            bullets: [
              { text: '成本边缘优势', description: '网点覆盖广，非保项目价格更具竞争力。' },
              { text: '资产轻量化', description: '通过加盟模式实现快速区域渗透。' },
            ],
            content: 'CRITICAL INSIGHT: 未来 3 年，混合经营模式将占据 70% 的市场份额。',
          },
        },
      },
      {
        label: '电路逻辑流',
        summary: 'PCB 电路板风格的行业逻辑传导流。',
        layoutId: 'vault_flow_circuit',
        model: {
          title: '人才培养闭环逻辑',
          subtitle: 'FROM CAMPUS TO WORKSHOP',
          steps: [
            { label: '标准开发', description: '基于车企岗位规范制定教学大纲。' },
            { label: '课程实操', description: '在 1:1 仿真环境下完成高压作业。' },
            { label: '资格认证', description: '通过"1+X"级低压/高压电工考试。' },
            { label: '站端实习', description: '进入授权中心参与真实案例排查。' },
            { label: '持续演进', description: '定期返回培训中心进行技术迭代。' },
          ],
        },
      },
      {
        label: '全幅数据看板',
        summary: 'Bloomberg 看板风格，整合指标、进度条与动态日志。',
        layoutId: 'vault_dashboard',
        model: {
          title: 'INDUSTRY REAL-TIME MONITOR',
          subtitle: 'MARKET ACCESS GRANTED',
          metrics: [
            { value: '$420B', label: 'VC INVESTMENT', note: 'Q1-Q2 累计融资额' },
            { value: '78.2%', label: 'ADOPTION RATE', note: '一线城市新车渗透率' },
            { value: '0.04s', label: 'DATA LATENCY', note: '云端诊断同步耗时' },
          ],
          bars: [
            { label: '电池回收利用率', baseline: 100, current: 85 },
            { label: '快充桩覆盖密度', baseline: 100, current: 62 },
            { label: '技术专利国产化', baseline: 100, current: 94 },
            { label: '售后服务满意度', baseline: 100, current: 78 },
          ],
          bullets: [
            { text: 'NEW: 固态电池装车试验', description: '预计 2027 年实现小规模量产。' },
            { text: 'WARN: 硅基芯片供应收紧', description: '可能影响充电控制器交付周期。' },
            { text: 'INTEL: 欧盟电池排碳法案', description: '出口导向企业需提前配置碳足迹追踪。' },
          ],
          insight: '新能源维修已从"硬件驱动"转向"算法驱动"，软硬件一体化人才成为市场唯一的定海神针。',
        },
      },
      {
        label: '深钻拆解页',
        summary: '深色分析页，左侧大段研判文字 + 右侧重点摘要。',
        layoutId: 'vault_deep_analysis',
        model: {
          title: '三电系统维修的技术奇点',
          content: '随着 CTC (Cell to Chassis) 与集成式热管理系统的普及，新能源汽车的物理边界正在模糊。传统"拆件-换件"的维修逻辑正面临失效。现在的故障诊断更多依赖于对 CAN总线报文的抓取与云端数字孪生模型的对比。这就要求维修员不仅要懂扳手，更要懂 Python 数据分析与电压采样波形解析。这种转变是行业利润重构的源头。',
          sidebar_title: 'CORE INSIGHTS //',
          bullets: [
            { text: '去中心化诊断', description: '边缘计算设备将允许技师在脱机状态下完成 80% 故障定位。' },
            { text: '维修即研发', description: '顶级技师的反馈直接驱动 OEM 厂端的工程变更单 (ECN)。' },
          ],
        },
      },
      {
        label: '数据终端输出',
        summary: 'CRT 终端黑底绿字风格，展示底层数据流。',
        layoutId: 'vault_terminal',
        model: {
          title: 'ACCESSING REGIONAL DATA...',
          log_entries: [
            'Initializing vault connection... [OK]',
            'Pulling 2026 sales forecasting datasets...',
            'Processing multi-variate regression analysis...',
            'IDENTIFIED: Demand surge in Southwest regions.',
            'MATCHING: Educational resources against market gap...',
            'WARN: Chengdu-Chongqing cluster exhibits talent deficit.',
            'Generating intelligence report packet 0xDF42...',
            'Encrypting output with AES-256 standard.',
            'Report finalized. Ready for debrief.',
          ],
        },
      },
      {
        label: '多维横评表',
        summary: '精细化的数据对比表，带通过/失败色差分析。',
        layoutId: 'vault_compare',
        model: {
          title: '教学方案横向评估表',
          categories: ['实操安全性', '设备成本', '教学复用率', '行业认可度', '就业转化率'],
          options: [
            { name: '传统实物实训', values: ['Low', 'High', 'Low', 'High', 'Medium'] },
            { name: '全真 VR 仿真', values: ['High', 'Medium', 'High', 'Medium', 'Medium'] },
            { name: '混合现实 (MR)', values: ['High', 'High', 'High', 'High', 'High'] },
          ],
        },
      },
      {
        label: '任务复盘归档',
        summary: '结尾页，带有 ARCHIVED 水印和绿色归档徽章。',
        layoutId: 'vault_debrief',
        model: {
          title: 'INTELLIGENCE BRIEFING ENDS',
          subtitle: 'MISSION STATUS: CONCLUDED',
          content: '本报告所有数据均基于 2025-2026 年度实地调研与大数据建模。版权归属产教融合研究中心，严禁非受权外传。',
          keyTakeaway: '在新能源下半场，数据资产是唯一的护城河。',
        },
      },
    ]),
  },
};
