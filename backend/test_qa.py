import asyncio
from services.ai.structured import StructuredMixin

class MockAI(StructuredMixin):
    def generate_json(self, prompt, thinking_budget=1000):
        # We just want to see if prompt generation or pre-processing fails.
        # If it doesn't fail before calling generate_json, we can mock the return.
        print("Prompt generated successfully:")
        print(prompt[:200] + "...")
        return {
            "model": {
                "title": "测试问答",
                "question": "什么是AI？",
                "answer": "人工智能",
                "analysis": [
                    {"title": "分析1", "content": "这是分析1"}
                ],
                "conclusion": "测试结论"
            },
            "closed_promise_ids": []
        }

def test_generation():
    ai = MockAI()
    page_outline = {
        "page_id": "p01",
        "title": "测试",
        "layout_id": "edu_qa_case",
        "has_image": False,
        "keywords": []
    }
    try:
        res = ai.generate_structured_page_content(page_outline, scheme_id="edu_dark")
        print("Generated content:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_generation()
