from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_community.chat_models import ChatOllama
from app.core.config import settings

def get_llm(temperature: float = 0.1, response_format_json: bool = False):
    if settings.USE_LOCAL_LLM:
        kwargs = {
            "model": settings.LOCAL_LLM_MODEL,
            "base_url": "http://localhost:11434",
            "temperature": temperature,
        }
        if response_format_json:
            kwargs["format"] = "json"
        return ChatOllama(**kwargs)

    if settings.USE_AZURE_OPENAI:
        kwargs = {
            "azure_deployment": settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            "api_key": settings.AZURE_OPENAI_API_KEY,
            "azure_endpoint": settings.AZURE_OPENAI_ENDPOINT,
            "api_version": settings.AZURE_OPENAI_API_VERSION,
            "temperature": temperature,
            "request_timeout": 90,
        }
        if response_format_json:
            kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
        return AzureChatOpenAI(**kwargs)

    kwargs = {
        "model": "gpt-4o",
        "temperature": temperature,
        "openai_api_key": settings.OPENAI_API_KEY,
        "request_timeout": 90,
    }
    if response_format_json:
        kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}
    return ChatOpenAI(**kwargs)  # type: ignore[call-arg]
