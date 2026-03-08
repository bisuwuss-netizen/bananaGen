import type { LayoutId } from '../types/schema';

export const LAYOUT_ID_ALIASES: Record<string, string> = {
  // academic
  cover_academic: 'cover',
  toc_academic: 'toc',
  key_concepts: 'title_bullets',
  key_takeaways: 'title_bullets',
  // interactive
  cover_interactive: 'cover',
  agenda_path: 'toc',
  story_narrative: 'vocational_content',
  group_collab: 'vocational_bullets',
  mind_map_structure: 'image_full',
  quiz_interaction: 'vocational_bullets',
  case_discussion: 'vocational_content',
  feedback_poll: 'vocational_content',
  discussion_card: 'vocational_content',
  reflection_quiz: 'title_bullets',
  role_play_scenario: 'vocational_content',
  warmup_inquiry: 'warmup_question',
  ending_interactive: 'ending',
  // visual
  cover_field: 'cover',
  timeline_evolution: 'timeline',
  field_observation: 'image_full',
  gallery_professional: 'portfolio',
  case_before_after: 'vocational_comparison',
  infographic_flow: 'vocational_bullets',
  site_survey: 'image_full',
  specimen_detail: 'detail_zoom',
  portfolio_industry: 'portfolio',
  ending_field: 'ending',
  // practical
  cover_practical: 'cover',
  checklist_verification: 'vocational_bullets',
  equipment_orientation: 'vocational_comparison',
  sop_vertical_steps: 'vertical_timeline',
  common_faults: 'vocational_comparison',
  technical_tip: 'quote',
  task_instruction: 'vocational_content',
  safety_protocol: 'safety_notice',
  detail_specs: 'vocational_content',
  ending_practical: 'ending',
  // tech_blue
  cover_tech: 'cover',
  arch_blocks: 'vocational_content',
  flow_logic_sequence: 'process_steps',
  param_dashboard: 'edu_data_board',
  protocol_analysis: 'vocational_bullets',
  requirement_specs: 'vocational_bullets',
  system_comparison: 'vocational_comparison',
  tech_principle: 'vocational_content',
  toc_tech: 'toc',
  ending_tech: 'ending',
  // modern (management)
  cover_modern: 'cover',
  business_canvas: 'grid_matrix',
  comparison_matrix: 'vocational_comparison',
  legal_regulation: 'vocational_content',
  org_structure_flow: 'vocational_bullets',
  process_sop_standard: 'process_steps',
  stat_report: 'edu_data_board',
  strategic_pillars: 'tri_column',
  toc_modern: 'toc',
  ending_modern: 'ending',
};

export const normalizeLayoutId = (layoutId: LayoutId): LayoutId => {
  return (LAYOUT_ID_ALIASES[layoutId] || layoutId) as LayoutId;
};
