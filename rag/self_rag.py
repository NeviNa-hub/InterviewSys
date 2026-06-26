from __future__ import annotations

from dataclasses import dataclass
from typing import List

from langchain_core.documents import Document

from utils.config_handler import rag_conf


@dataclass
class SelfRAGDecision:
    should_self_reflect: bool
    reason: str = ""


class SelfRAGRouter:
    def __init__(self):
        self.enabled = bool(rag_conf.get("enable_self_rag", False))
        self.min_docs = int(rag_conf.get("self_rag_min_docs", 2))
        self.min_keyword_hits = int(rag_conf.get("self_rag_min_keyword_hits", 1))

    def should_route(self, query: str, docs: List[Document]) -> SelfRAGDecision:
        if not self.enabled:
            return SelfRAGDecision(False, "disabled")

        if len(docs) < self.min_docs:
            return SelfRAGDecision(True, "insufficient_docs")

        keyword_hits = self._keyword_hits(query, docs)
        if keyword_hits < self.min_keyword_hits:
            return SelfRAGDecision(True, "low_keyword_hits")

        return SelfRAGDecision(False, "enough_context")

    @staticmethod
    def _keyword_hits(query: str, docs: List[Document]) -> int:
        query_tokens = [token for token in str(query or "").split() if token]
        if not query_tokens:
            return 0

        joined_docs = " ".join(str(doc.page_content or "") for doc in docs[:3]).lower()
        hits = 0
        for token in query_tokens:
            if token.lower() in joined_docs:
                hits += 1
        return hits
