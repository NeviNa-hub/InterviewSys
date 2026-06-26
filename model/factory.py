from abc import ABC, abstractmethod
import os
from typing import Optional
from langchain_core.embeddings import Embeddings
from langchain_community.chat_models.tongyi import BaseChatModel
from langchain_community.chat_models.tongyi import ChatTongyi
from langchain_community.embeddings import DashScopeEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from utils.config_handler import rag_conf


class BaseModelFactory(ABC):
    @abstractmethod
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        pass


class ChatModelFactory(BaseModelFactory):
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        provider = str(rag_conf.get("chat_provider", "tongyi")).strip().lower()
        if provider == "openai_compatible":
            api_key = os.getenv("DEEPSEEK_API_KEY", rag_conf.get("chat_api_key", "")).strip()
            base_url = os.getenv("DEEPSEEK_BASE_URL", rag_conf.get("chat_base_url", "")).strip()
            model_name = os.getenv("DEEPSEEK_MODEL", rag_conf.get("chat_model_name", "")).strip()

            if not api_key:
                raise ValueError("未配置 DEEPSEEK_API_KEY 或 config/rag.yml 中的 chat_api_key。")
            if not base_url:
                raise ValueError("未配置 DEEPSEEK_BASE_URL 或 config/rag.yml 中的 chat_base_url。")
            if not model_name:
                raise ValueError("未配置 DEEPSEEK_MODEL 或 config/rag.yml 中的 chat_model_name。")

            return ChatOpenAI(
                model=model_name,
                openai_api_key=api_key,
                openai_api_base=base_url,
                temperature=float(rag_conf.get("chat_temperature", 0.7)),
            )

        return ChatTongyi(model=rag_conf["chat_model_name"])


class EmbeddingsFactory(BaseModelFactory):
    def generator(self) -> Optional[Embeddings | BaseChatModel]:
        provider = str(rag_conf.get("embedding_provider", "dashscope")).strip().lower()
        if provider == "openai_compatible":
            api_key = (
                os.getenv("EMBEDDING_API_KEY")
                or os.getenv("DEEPSEEK_API_KEY")
                or os.getenv("DASHSCOPE_API_KEY")
                or rag_conf.get("embedding_api_key", "")
            )
            base_url = (
                os.getenv("EMBEDDING_BASE_URL")
                or os.getenv("DEEPSEEK_BASE_URL")
                or rag_conf.get("embedding_base_url", "")
            )
            model_name = (
                os.getenv("EMBEDDING_MODEL")
                or rag_conf.get("embedding_model_name", "")
            )

            api_key = str(api_key).strip()
            base_url = str(base_url).strip()
            model_name = str(model_name).strip()

            if not api_key:
                raise ValueError("未配置 EMBEDDING_API_KEY、DEEPSEEK_API_KEY、DASHSCOPE_API_KEY 或 config/rag.yml 中的 embedding_api_key。")
            if not base_url:
                raise ValueError("未配置 EMBEDDING_BASE_URL、DEEPSEEK_BASE_URL 或 config/rag.yml 中的 embedding_base_url。")
            if not model_name:
                raise ValueError("未配置 EMBEDDING_MODEL 或 config/rag.yml 中的 embedding_model_name。")

            return OpenAIEmbeddings(
                model=model_name,
                openai_api_key=api_key,
                openai_api_base=base_url,
            )

        return DashScopeEmbeddings(model=rag_conf["embedding_model_name"])


chat_model = ChatModelFactory().generator()
embed_model = EmbeddingsFactory().generator()
