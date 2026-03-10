"""
AI Service - thin facade that composes all AI mixin modules.

This preserves the original import path:
  from services.ai_service import AIService, ProjectContext
"""

from services.ai.base import AIBase, ProjectContext
from services.ai.description import DescriptionMixin
from services.ai.image import ImageMixin
from services.ai.layout import LayoutMixin
from services.ai.outline import OutlineMixin
from services.ai.refine import RefineMixin
from services.ai.structured import StructuredMixin


class AIService(
    OutlineMixin,
    DescriptionMixin,
    ImageMixin,
    LayoutMixin,
    RefineMixin,
    StructuredMixin,
    AIBase,
):
    """Backward-compatible AIService composed from focused mixins."""


__all__ = ["AIService", "ProjectContext"]
