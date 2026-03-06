"""Language prompt configuration and string generation utilities."""

LANGUAGE_CONFIG = {
    'zh': {
        'name': '中文',
        'instruction': '请使用全中文输出。',
        'ppt_text': 'PPT文字请使用全中文。'
    },
    'ja': {
        'name': '日本語',
        'instruction': 'すべて日本語で出力してください。',
        'ppt_text': 'PPTのテキストは全て日本語で出力してください。'
    },
    'en': {
        'name': 'English',
        'instruction': 'Please output all in English.',
        'ppt_text': 'Use English for PPT text.'
    },
    'auto': {
        'name': '自动',
        'instruction': '',  # 自动模式不添加语言限制
        'ppt_text': ''
    }
}


def get_default_output_language() -> str:
    from config_fastapi import settings
    return settings.output_language


def get_language_instruction(language: str = None) -> str:
    lang = language if language else get_default_output_language()
    config = LANGUAGE_CONFIG.get(lang, LANGUAGE_CONFIG['zh'])
    return config['instruction']


def get_ppt_language_instruction(language: str = None) -> str:
    lang = language if language else get_default_output_language()
    config = LANGUAGE_CONFIG.get(lang, LANGUAGE_CONFIG['zh'])
    return config['ppt_text']

__all__ = [
    "LANGUAGE_CONFIG",
    "get_default_output_language",
    "get_language_instruction",
    "get_ppt_language_instruction",
]
