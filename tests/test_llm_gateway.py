import os
from contextlib import contextmanager
import unittest

import httpx

from agent_core.llm_gateway import (
    ChatRequestPayload,
    LLMGateway,
    ProviderConfig,
    ProviderRequestError,
    ProviderResponse,
    ProviderOptions,
    SearchContext,
    extract_web_search_usage,
    extract_reasoning_content,
    parse_sse_json_line,
    extract_response_sources,
    extract_response_text,
    load_provider_configs,
    parse_json_object,
    select_provider,
)


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeHttpClient:
    def __init__(self, payload):
        self.payload = payload
        self.requests = []

    def post(self, url, **kwargs):
        self.requests.append({"url": url, **kwargs})
        return FakeResponse(self.payload)


class FakeStreamResponse:
    def __init__(self, lines):
        self.lines = lines

    def raise_for_status(self):
        return None

    def iter_lines(self):
        return iter(self.lines)


class FakeStreamingHttpClient:
    def __init__(self, lines):
        self.lines = lines
        self.requests = []

    @contextmanager
    def stream(self, method, url, **kwargs):
        self.requests.append({"method": method, "url": url, **kwargs})
        yield FakeStreamResponse(self.lines)


class FailingHttpClient:
    def post(self, url, **kwargs):
        request = httpx.Request("POST", url)
        response = httpx.Response(
            401,
            json={"error": {"message": "invalid api key"}},
            request=request,
        )
        raise httpx.HTTPStatusError("unauthorized", request=request, response=response)


class LLMGatewayTest(unittest.TestCase):
    def test_select_provider_from_ui_model(self):
        self.assertEqual(select_provider("DeepSeek-V4"), "deepseek")
        self.assertEqual(select_provider("豆包 Seed"), "doubao")
        self.assertEqual(select_provider("鲸杉GEO-Agent 调度"), "dispatcher")
        self.assertEqual(select_provider("Auto"), "dispatcher")

    def test_dispatcher_defaults_to_gpt54_xint(self):
        with unittest.mock.patch.dict(os.environ, {}, clear=True):
            config = load_provider_configs()["dispatcher"]

        self.assertEqual(config.provider, "openai")
        self.assertEqual(config.model, "gpt-5.4")
        self.assertEqual(config.base_url, "https://xint.cc")

    def test_parse_json_object_from_markdown_fence(self):
        payload = parse_json_object(
            "```json\n{\"company_name\":\"四川佳祺食品有限公司\",\"industry\":\"预制菜\"}\n```"
        )

        self.assertEqual(payload["company_name"], "四川佳祺食品有限公司")
        self.assertEqual(payload["industry"], "预制菜")

    def test_dispatcher_extracts_enterprise_profile_json(self):
        client = FakeHttpClient(
            {
                "output_text": "{\"company_name\":\"成都行乐音改汽车用品有限公司\",\"main_business\":\"汽车音响改装\"}"
            }
        )
        gateway = LLMGateway(
            {
                "dispatcher": ProviderConfig(
                    provider="openai",
                    api_key="key",
                    model="gpt-5.4",
                    base_url="https://xint.cc",
                )
            },
            http_client=client,
        )

        result = gateway.extract_enterprise_profile("公司名称：成都行乐音改汽车用品有限公司")

        self.assertEqual(result["company_name"], "成都行乐音改汽车用品有限公司")
        self.assertEqual(result["main_business"], "汽车音响改装")
        self.assertEqual(client.requests[0]["url"], "https://xint.cc/responses")

    def test_deepseek_enables_thinking(self):
        client = FakeHttpClient(
            {"choices": [{"message": {"content": "deepseek answer"}}]}
        )
        gateway = LLMGateway(
            {
                "deepseek": ProviderConfig(
                    provider="deepseek",
                    api_key="key",
                    model="deepseek-v4-pro",
                    base_url="https://api.deepseek.com",
                    deep_thinking=True,
                )
            },
            http_client=client,
        )

        result = gateway.complete(
            "deepseek",
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
            ),
        )

        self.assertEqual(result, ProviderResponse(provider="deepseek", model="deepseek-v4-pro", content="deepseek answer"))
        body = client.requests[0]["json"]
        self.assertEqual(client.requests[0]["url"], "https://api.deepseek.com/chat/completions")
        self.assertEqual(body["thinking"], {"type": "enabled"})
        self.assertEqual(body["reasoning_effort"], "high")

    def test_knowledge_context_is_injected_into_system_prompt(self):
        client = FakeHttpClient(
            {"choices": [{"message": {"content": "deepseek answer"}}]}
        )
        gateway = LLMGateway(
            {
                "deepseek": ProviderConfig(
                    provider="deepseek",
                    api_key="key",
                    model="deepseek-v4-pro",
                    base_url="https://api.deepseek.com",
                    deep_thinking=False,
                )
            },
            http_client=client,
        )

        gateway.complete(
            "deepseek",
            ChatRequestPayload(
                system_prompt="system",
                user_message="请介绍企业主营",
                conversation_id=None,
                knowledge_context="[1] 主营服务\n成都行乐音改主营汽车音响改装。",
            ),
        )

        system_prompt = client.requests[0]["json"]["messages"][0]["content"]
        self.assertIn("本地知识库资料", system_prompt)
        self.assertIn("成都行乐音改主营汽车音响改装", system_prompt)

    def test_doubao_uses_responses_api_with_search_and_thinking(self):
        client = FakeHttpClient(
            {
                "output": [
                    {
                        "type": "web_search_call",
                        "action": {
                            "type": "search",
                            "query": "成都预制菜排行",
                            "sources": ["search_engine", "toutiao"],
                            "limit": 20,
                        },
                    },
                    {
                        "type": "web_search_call",
                        "action": {"query": "成都预制菜排行"},
                    },
                    {
                        "type": "web_search_call",
                        "action": {
                            "type": "search",
                            "query": "2026 成都预制菜企业排名",
                            "sources": ["search_engine"],
                        },
                    },
                    {
                        "type": "reasoning",
                        "reasoning_content": "先拆解地域词和行业词，再搜索竞品排行。",
                    },
                    {
                        "content": [
                            {
                                "type": "output_text",
                                "text": "doubao answer",
                                "annotations": [
                                    {
                                        "type": "url_citation",
                                        "title": "成都预制菜企业排行",
                                        "url": "https://example.com/rank",
                                        "logo_url": "https://example.com/favicon.ico",
                                        "start_index": 0,
                                        "end_index": 6,
                                    },
                                    {
                                        "type": "url_citation",
                                        "title": "重复来源",
                                        "url": "https://example.com/rank",
                                    },
                                    {
                                        "type": "url_citation",
                                        "url": "https://news.example.com/article",
                                    },
                                ],
                            }
                        ]
                    }
                ],
                "usage": {
                    "tool_usage": 2,
                    "tool_usage_details": {
                        "search_engine": 1,
                        "toutiao": 1,
                    },
                },
            }
        )
        gateway = LLMGateway(
            {
                "doubao": ProviderConfig(
                    provider="doubao",
                    api_key="ark-key",
                    model="doubao-seed-2-0-lite-260428",
                    base_url="https://ark.cn-beijing.volces.com/api/v3",
                    deep_thinking=True,
                    web_search=True,
                )
            },
            http_client=client,
        )

        result = gateway.complete(
            "doubao",
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
                options=ProviderOptions(deep_thinking=True, web_search=True),
            ),
        )

        self.assertEqual(result.content, "doubao answer")
        self.assertEqual(result.reasoning_content, "先拆解地域词和行业词，再搜索竞品排行。")
        self.assertEqual(len(result.sources), 2)
        self.assertEqual(result.sources[0].title, "成都预制菜企业排行")
        self.assertEqual(result.sources[0].url, "https://example.com/rank")
        self.assertEqual(result.sources[0].logo_url, "https://example.com/favicon.ico")
        self.assertEqual(result.sources[0].start_index, 0)
        self.assertEqual(result.sources[0].end_index, 6)
        self.assertEqual(result.sources[1].title, "news.example.com")
        self.assertEqual(result.search_queries, ["成都预制菜排行", "2026 成都预制菜企业排名"])
        self.assertEqual(
            result.search_actions,
            [
                {"type": "search", "query": "成都预制菜排行", "sources": ["search_engine", "toutiao"], "limit": 20},
                {"type": "search", "query": "2026 成都预制菜企业排名", "sources": ["search_engine"]},
            ],
        )
        self.assertEqual(result.search_usage["tool_usage"], 2)
        self.assertEqual(result.search_usage["tool_usage_details"], {"search_engine": 1, "toutiao": 1})
        body = client.requests[0]["json"]
        self.assertEqual(client.requests[0]["url"], "https://ark.cn-beijing.volces.com/api/v3/responses")
        self.assertEqual(body["thinking"], {"type": "enabled"})
        self.assertEqual(body["reasoning"], {"effort": "high"})
        self.assertEqual(body["max_output_tokens"], 32768)
        self.assertEqual(body["tools"], [{"type": "web_search", "max_keyword": 10, "limit": 20, "sources": ["toutiao", "douyin"]}])
        self.assertEqual(body["max_tool_calls"], 10)
        self.assertNotIn("user_location", body["tools"][0])

    def test_doubao_includes_dynamic_user_location_when_provided(self):
        client = FakeHttpClient({"output_text": "doubao answer"})
        gateway = LLMGateway(
            {
                "doubao": ProviderConfig(
                    provider="doubao",
                    api_key="ark-key",
                    model="doubao-seed-2-0-lite-260428",
                    base_url="https://ark.cn-beijing.volces.com/api/v3",
                    web_search=True,
                )
            },
            http_client=client,
        )

        gateway.complete(
            "doubao",
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
                options=ProviderOptions(web_search=True),
                search_context=SearchContext(country="中国", region="广东", city="深圳"),
            ),
        )

        body = client.requests[0]["json"]
        self.assertEqual(body["tools"][0]["user_location"], {"type": "approximate", "country": "中国", "region": "广东", "city": "深圳"})

    def test_doubao_stream_parses_reasoning_search_and_answer(self):
        client = FakeStreamingHttpClient([
            'data: {"type":"response.reasoning_summary_text.delta","delta":"先拆关键词"}',
            'data: {"type":"response.output_item.done","item":{"type":"web_search_call","action":{"type":"search","query":"成都预制菜排行榜","limit":20}}}',
            'data: {"type":"response.output_text.delta","delta":"最终"}',
            'data: {"type":"response.output_text.delta","delta":"回答"}',
            'data: {"type":"response.completed","response":{"usage":{"tool_usage":1},"output":[{"content":[{"type":"output_text","text":"最终回答","annotations":[{"type":"url_citation","title":"来源","url":"https://example.com"}]}]}]}}',
        ])
        gateway = LLMGateway(
            {
                "doubao": ProviderConfig(
                    provider="doubao",
                    api_key="ark-key",
                    model="doubao-seed-2-0-lite-260428",
                    base_url="https://ark.cn-beijing.volces.com/api/v3",
                    deep_thinking=True,
                    web_search=True,
                )
            },
            http_client=client,
        )

        events = list(gateway.stream_doubao(
            gateway.configs["doubao"],
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
                options=ProviderOptions(deep_thinking=True, web_search=True),
            ),
        ))

        self.assertEqual(events[0], {"type": "reasoning_delta", "text": "先拆关键词"})
        self.assertEqual(events[1]["type"], "search")
        self.assertEqual(events[1]["search_query"], "成都预制菜排行榜")
        self.assertEqual(events[2], {"type": "delta", "text": "最终"})
        self.assertEqual(events[3], {"type": "delta", "text": "回答"})
        self.assertEqual(events[-1]["type"], "done")
        self.assertEqual(events[-1]["content"], "最终回答")
        self.assertEqual(events[-1]["reasoning_content"], "先拆关键词")
        self.assertEqual(events[-1]["search_queries"], ["成都预制菜排行榜"])
        self.assertEqual(events[-1]["sources"][0]["title"], "来源")
        self.assertEqual(client.requests[0]["json"]["stream"], True)

    def test_doubao_respects_disabled_search_and_thinking_options(self):
        client = FakeHttpClient({"output_text": "doubao plain"})
        gateway = LLMGateway(
            {
                "doubao": ProviderConfig(
                    provider="doubao",
                    api_key="ark-key",
                    model="doubao-seed-2-0-lite-260428",
                    base_url="https://ark.cn-beijing.volces.com/api/v3",
                    deep_thinking=True,
                    web_search=True,
                )
            },
            http_client=client,
        )

        gateway.complete(
            "doubao",
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
                options=ProviderOptions(deep_thinking=False, web_search=False),
            ),
        )

        body = client.requests[0]["json"]
        self.assertNotIn("thinking", body)
        self.assertNotIn("reasoning", body)
        self.assertNotIn("max_output_tokens", body)
        self.assertNotIn("tools", body)

    def test_response_parsing_collects_all_text_and_nested_citations(self):
        data = {
            "output_text": "短摘要",
            "output": [
                {
                    "content": [
                        {"type": "output_text", "text": "第一段"},
                        {"type": "output_text", "text": "第二段"},
                        {
                            "type": "output_text",
                            "text": "第三段",
                            "annotations": [
                                {
                                    "type": "url_citation",
                                    "url_citation": {
                                        "title": "嵌套来源",
                                        "url": "https://example.com/nested",
                                    },
                                }
                            ],
                        },
                    ],
                },
                {
                    "content": [
                        {
                            "type": "output_text",
                            "text": "第四段",
                            "annotations": [
                                {
                                    "type": "url_citation",
                                    "title": "第二来源",
                                    "url": "https://example.com/second",
                                }
                            ],
                        }
                    ],
                },
            ]
        }

        self.assertEqual(extract_response_text(data), "第一段\n第二段\n第三段\n第四段")
        sources = extract_response_sources(data)
        self.assertEqual([source.title for source in sources], ["嵌套来源", "第二来源"])

    def test_response_parsing_separates_reasoning_from_answer(self):
        data = {
            "output": [
                {"type": "reasoning", "summary": [{"text": "分析搜索结果"}]},
                {
                    "content": [
                        {"type": "reasoning_text", "text": "不要放进正文"},
                        {"type": "output_text", "text": "最终回答"},
                    ]
                },
            ]
        }

        self.assertEqual(extract_response_text(data), "最终回答")
        self.assertEqual(extract_reasoning_content(data), "分析搜索结果\n\n不要放进正文")

    def test_extract_web_search_usage(self):
        self.assertEqual(extract_web_search_usage({}), {})
        self.assertEqual(
            extract_web_search_usage({
                "usage": {
                    "tool_usage": 3,
                    "tool_usage_details": {"search_engine": 2, "toutiao": 1},
                }
            }),
            {"tool_usage": 3, "tool_usage_details": {"search_engine": 2, "toutiao": 1}},
        )

    def test_parse_sse_json_line(self):
        self.assertEqual(parse_sse_json_line(""), None)
        self.assertEqual(parse_sse_json_line("data: [DONE]"), None)
        self.assertEqual(parse_sse_json_line('data: {"type":"x"}'), {"type": "x"})

    def test_deepseek_ignores_web_search_option(self):
        client = FakeHttpClient(
            {"choices": [{"message": {"content": "deepseek answer"}}]}
        )
        gateway = LLMGateway(
            {
                "deepseek": ProviderConfig(
                    provider="deepseek",
                    api_key="key",
                    model="deepseek-v4-pro",
                    base_url="https://api.deepseek.com",
                    deep_thinking=True,
                    web_search=False,
                )
            },
            http_client=client,
        )

        gateway.complete(
            "deepseek",
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
                options=ProviderOptions(deep_thinking=True, web_search=True),
            ),
        )

        body = client.requests[0]["json"]
        self.assertEqual(body["thinking"], {"type": "enabled"})
        self.assertEqual(body["reasoning_effort"], "high")
        self.assertNotIn("tools", body)
        self.assertNotIn("web_search", body)

    def test_missing_config_uses_local_fallback(self):
        gateway = LLMGateway({}, http_client=FakeHttpClient({}))
        result = gateway.complete(
            "dispatcher",
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
            ),
        )

        self.assertEqual(result.provider, "local")
        self.assertIn("尚未配置", result.content)

    def test_dispatcher_uses_openai_responses_api(self):
        client = FakeHttpClient({"output_text": "dispatcher answer"})
        gateway = LLMGateway(
            {
                "dispatcher": ProviderConfig(
                    provider="openai",
                    api_key="openai-key",
                    model="gpt-5.4",
                    base_url="https://xint.cc",
                    deep_thinking=True,
                    reasoning_effort="medium",
                )
            },
            http_client=client,
        )

        result = gateway.complete(
            "dispatcher",
            ChatRequestPayload(
                system_prompt="system",
                user_message="hello",
                conversation_id=None,
                options=ProviderOptions(deep_thinking=True),
            ),
        )

        self.assertEqual(result.content, "dispatcher answer")
        self.assertEqual(client.requests[0]["url"], "https://xint.cc/responses")
        body = client.requests[0]["json"]
        self.assertEqual(body["model"], "gpt-5.4")
        self.assertEqual(body["reasoning"], {"effort": "medium"})

    def test_provider_http_error_is_structured(self):
        gateway = LLMGateway(
            {
                "deepseek": ProviderConfig(
                    provider="deepseek",
                    api_key="bad-key",
                    model="deepseek-v4-pro",
                    base_url="https://api.deepseek.com",
                )
            },
            http_client=FailingHttpClient(),
        )

        with self.assertRaises(ProviderRequestError) as error:
            gateway.complete(
                "deepseek",
                ChatRequestPayload(
                    system_prompt="system",
                    user_message="hello",
                    conversation_id=None,
                ),
            )

        self.assertEqual(error.exception.provider, "deepseek")
        self.assertEqual(error.exception.status_code, 401)
        self.assertIn("invalid api key", error.exception.message)


if __name__ == "__main__":
    unittest.main()
