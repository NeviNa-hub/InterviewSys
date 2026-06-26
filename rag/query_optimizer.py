from __future__ import annotations

from typing import Iterable, List, Sequence

from langchain_core.documents import Document

from utils.config_handler import rag_conf


class QueryOptimizer:
    def __init__(self):
        self.enable_multi_recall = bool(rag_conf.get("enable_multi_recall", True))
        self.enable_keyword_expand = bool(rag_conf.get("enable_keyword_expand", True))
        self.enable_query_rewrite = bool(rag_conf.get("enable_query_rewrite", True))
        self.query_keyword_max = int(rag_conf.get("query_keyword_max", 6))

    def build_recall_queries(self, query: str, history=None) -> List[str]:
        base_query = self._normalize_text(query)
        if not base_query:
            return []

        recall_queries: List[str] = [base_query]

        if history:
            history_summary = self._history_tail(history)
            if history_summary and self.enable_query_rewrite:
                recall_queries.append(f"{history_summary} {base_query}".strip())

        if self.enable_keyword_expand:
            keywords = self._extract_keywords(base_query)
            if keywords:
                recall_queries.append(" ".join(keywords))

        if not self.enable_multi_recall:
            return [recall_queries[0]]
        return self._deduplicate_strings(recall_queries)

    def get_rerank_query(self, query: str, history=None) -> str:
        base_query = self._normalize_text(query)
        if not history or not self.enable_query_rewrite:
            return base_query

        history_summary = self._history_tail(history)
        if not history_summary:
            return base_query
        return f"{history_summary} {base_query}".strip()

    def merge_documents(self, docs_groups: Iterable[Sequence[Document]]) -> List[Document]:
        merged: List[Document] = []
        seen_keys = set()

        for docs in docs_groups:
            for doc in docs:
                if not isinstance(doc, Document):
                    continue
                key = (
                    str(doc.page_content).strip(),
                    tuple(sorted((doc.metadata or {}).items())),
                )
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                merged.append(doc)
        return merged

    def _extract_keywords(self, query: str) -> List[str]:
        tokens = []
        for token in query.replace("，", " ").replace("。", " ").replace(",", " ").split():
            token = token.strip()
            if len(token) >= 2:
                tokens.append(token)
        return tokens[: self.query_keyword_max]

    @staticmethod
    def _normalize_text(text: str) -> str:
        return " ".join(str(text or "").strip().split())

    def _history_tail(self, history) -> str:
        parts: List[str] = []
        for message in list(history)[-4:]:
            if not isinstance(message, dict):
                continue
            content = self._normalize_text(message.get("content", ""))
            if content:
                parts.append(content)
        return " ".join(parts[-2:])

    @staticmethod
    def _deduplicate_strings(items: Sequence[str]) -> List[str]:
        result: List[str] = []
        seen = set()
        for item in items:
            normalized = item.strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            result.append(normalized)
        return result
