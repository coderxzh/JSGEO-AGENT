import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from agent_core.api.server import create_app
from agent_core.db import create_connection, list_knowledge_entries, update_knowledge_entry_embedding_status
from agent_core.llm_gateway import ProviderResponse
from tests.test_geo_project_service import complete_profile


class GeoArticleServiceTest(unittest.TestCase):
    def prepare_ready_project(self, tmp: str, project_id: str = "enterprise-article"):
        token = "test-token"
        app = create_app(token=token, data_dir=Path(tmp))
        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}
        client.post(
            "/api/knowledge/enterprise-profile",
            json=complete_profile(project_id),
            headers=headers,
        )
        for row in list_knowledge_entries(Path(tmp), project_id, limit=200):
            update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
        ensured = client.post(
            "/api/geo/projects/ensure",
            json={"project_id": project_id},
            headers=headers,
        )
        return client, headers, ensured.json()["id"]

    def run_phase_two_and_three(self, client, headers, geo_project_id: str, platform: str = "doubao"):
        def fake_complete(provider_key, payload):
            if "信源证据盘点" in payload.skill_prompt:
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "summary": "信源发现完成",
                        "source_scores": [{"source": "官网", "score": 88, "priority": "高", "why": "可控事实源"}],
                        "recommended_publish_targets": [{"source": "官网", "content_type": "consulting", "publish_reason": "沉淀企业事实"}],
                    }, ensure_ascii=False),
                )
            return ProviderResponse(
                provider=provider_key,
                model="fake",
                content=json.dumps({
                    "summary": "问题池完成",
                    "question_pool": [{"question": "成都汽车音响改装哪家好"}],
                    "ranking_questions": [{"question": "成都汽车音响改装店排行榜"}],
                    "supporting_content_needs": [
                        {"type": "consulting", "topic": "汽车音响改装怎么选"},
                        {"type": "review", "topic": "汽车音响改装服务能力测评"},
                    ],
                    "source_discovery_queries": [{"query": "成都汽车音响改装店排行榜"}],
                }, ensure_ascii=False),
            )

        with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_complete):
            report = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/{platform}/phase-2/run",
                headers=headers,
            )
            discovery = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/{platform}/source-discovery/run",
                headers=headers,
            )
        self.assertEqual(report.status_code, 200)
        self.assertEqual(discovery.status_code, 200)

    def test_article_generation_requires_source_discovery(self):
        with tempfile.TemporaryDirectory() as tmp:
            client, headers, geo_project_id = self.prepare_ready_project(tmp, "article-requires-source")
            rejected = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/articles/consulting/run",
                headers=headers,
            )
            self.assertEqual(rejected.status_code, 400)

    def test_consulting_and_review_drafts_are_saved_outside_knowledge_entries(self):
        with tempfile.TemporaryDirectory() as tmp:
            client, headers, geo_project_id = self.prepare_ready_project(tmp, "article-drafts")
            before_entries = len(list(list_knowledge_entries(Path(tmp), "article-drafts", limit=200)))
            self.run_phase_two_and_three(client, headers, geo_project_id)

            def fake_article(provider_key, payload):
                self.assertIn("支撑内容", payload.system_prompt)
                article_type = "review" if "review" in payload.user_message else "consulting"
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "title": "支撑文章草稿",
                        "article_type": article_type,
                        "target_question": "成都汽车音响改装店排行榜",
                        "publish_target": "官网",
                        "outline": ["选择标准", "企业能力", "适用场景"],
                        "content": "这是一篇支撑文章草稿。",
                        "facts_used": ["企业事实"],
                        "sources_to_reference": ["官网"],
                        "missing_facts": ["公开案例链接"],
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_article):
                consulting = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/articles/consulting/run",
                    headers=headers,
                )
                review = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/articles/review/run",
                    headers=headers,
                )

            self.assertEqual(consulting.status_code, 200)
            self.assertEqual(review.status_code, 200)
            self.assertEqual(consulting.json()["article_type"], "consulting")
            self.assertEqual(review.json()["article_type"], "review")
            self.assertEqual(before_entries, len(list(list_knowledge_entries(Path(tmp), "article-drafts", limit=200))))

            latest = client.get(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/articles/latest?article_type=consulting",
                headers=headers,
            )
            self.assertEqual(latest.status_code, 200)
            self.assertEqual(latest.json()["draft"]["title"], "支撑文章草稿")

    def test_support_articles_run_generates_both_article_types(self):
        with tempfile.TemporaryDirectory() as tmp:
            client, headers, geo_project_id = self.prepare_ready_project(tmp, "support-articles")
            before_entries = len(list(list_knowledge_entries(Path(tmp), "support-articles", limit=200)))
            self.run_phase_two_and_three(client, headers, geo_project_id)

            def fake_article(provider_key, payload):
                article_type = "review" if "文章类型：review" in payload.user_message else "consulting"
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "title": f"{article_type} 支撑文章",
                        "article_type": article_type,
                        "target_question": "成都汽车音响改装店排行榜",
                        "publish_target": "官网",
                        "outline": ["选择标准", "企业能力"],
                        "content": "支撑文章正文。",
                        "facts_used": ["企业事实"],
                        "sources_to_reference": ["官网"],
                        "missing_facts": [],
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_article):
                with create_connection(Path(tmp)) as conn:
                    conn.execute(
                        "INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)",
                        ("support-conversation", "support-articles", "阶段四测试"),
                    )
                    conn.execute(
                        "INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)",
                        ("support-message", "support-conversation", "assistant", "阶段三完成", "{}"),
                    )
                    conn.commit()
                response = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/articles/support/run",
                    json={"message_id": "support-message"},
                    headers=headers,
                )

            self.assertEqual(response.status_code, 200)
            body = response.json()
            self.assertEqual(body["status"], "completed")
            self.assertEqual(body["consulting_draft"]["article_type"], "consulting")
            self.assertEqual(body["consulting_draft"]["status"], "draft")
            self.assertEqual(body["review_draft"]["article_type"], "review")
            self.assertEqual(body["review_draft"]["status"], "draft")
            self.assertEqual(before_entries, len(list(list_knowledge_entries(Path(tmp), "support-articles", limit=200))))

            with create_connection(Path(tmp)) as conn:
                message = conn.execute(
                    "SELECT content, metadata FROM messages WHERE id = ?",
                    ("support-message",),
                ).fetchone()
            metadata = json.loads(message["metadata"])
            self.assertEqual(metadata["type"], "geo_phase_result")
            self.assertEqual(metadata["phase"], 4)
            self.assertEqual(metadata["support_articles"]["consulting_draft"]["id"], body["consulting_draft"]["id"])

            workflow = client.get(
                f"/api/geo/projects/{geo_project_id}/workflow-state",
                headers=headers,
            )
            self.assertEqual(workflow.status_code, 200)
            stages = workflow.json()["platforms"]["doubao"]["stages"]
            self.assertEqual(stages["stage_4"]["status"], "in_progress")
            self.assertEqual(stages["stage_5"]["status"], "not_started")

            consulting_id = body["consulting_draft"]["id"]
            review_id = body["review_draft"]["id"]
            confirmed_consulting = client.post(
                f"/api/geo/articles/{consulting_id}/confirm",
                json={"message_id": "support-message"},
                headers=headers,
            )
            self.assertEqual(confirmed_consulting.status_code, 200)
            self.assertEqual(confirmed_consulting.json()["status"], "confirmed")
            mid_workflow = client.get(
                f"/api/geo/projects/{geo_project_id}/workflow-state",
                headers=headers,
            )
            self.assertEqual(mid_workflow.json()["platforms"]["doubao"]["stages"]["stage_5"]["status"], "not_started")

            confirmed_review = client.post(
                f"/api/geo/articles/{review_id}/confirm",
                json={"message_id": "support-message"},
                headers=headers,
            )
            self.assertEqual(confirmed_review.status_code, 200)
            with create_connection(Path(tmp)) as conn:
                confirmed_message = conn.execute(
                    "SELECT metadata FROM messages WHERE id = ?",
                    ("support-message",),
                ).fetchone()
            confirmed_metadata = json.loads(confirmed_message["metadata"])
            self.assertEqual(confirmed_metadata["support_articles"]["consulting_draft"]["status"], "confirmed")
            self.assertEqual(confirmed_metadata["support_articles"]["review_draft"]["status"], "confirmed")
            final_workflow = client.get(
                f"/api/geo/projects/{geo_project_id}/workflow-state",
                headers=headers,
            )
            final_stages = final_workflow.json()["platforms"]["doubao"]["stages"]
            self.assertEqual(final_stages["stage_4"]["status"], "completed")
            self.assertEqual(final_stages["stage_5"]["status"], "ready")

    def test_article_draft_update_resets_to_draft_before_confirmation(self):
        with tempfile.TemporaryDirectory() as tmp:
            client, headers, geo_project_id = self.prepare_ready_project(tmp, "article-update")
            self.run_phase_two_and_three(client, headers, geo_project_id)

            def fake_article(provider_key, payload):
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "title": "原始标题",
                        "article_type": "consulting",
                        "content": "原始正文",
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_article):
                created = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/articles/consulting/run",
                    headers=headers,
                )
            self.assertEqual(created.status_code, 200)
            draft_id = created.json()["id"]

            updated = client.post(
                f"/api/geo/articles/{draft_id}/update",
                json={"draft": {"title": "修改后标题", "content": "修改后正文", "next_actions": ["不应保存"]}},
                headers=headers,
            )
            self.assertEqual(updated.status_code, 200)
            body = updated.json()
            self.assertEqual(body["status"], "draft")
            self.assertEqual(body["draft"]["title"], "修改后标题")
            self.assertEqual(body["draft"]["content"], "修改后正文")
            self.assertNotIn("next_actions", body["draft"])

    def test_platforms_do_not_overwrite_each_other(self):
        with tempfile.TemporaryDirectory() as tmp:
            client, headers, geo_project_id = self.prepare_ready_project(tmp, "article-platforms")
            self.run_phase_two_and_three(client, headers, geo_project_id, "doubao")
            self.run_phase_two_and_three(client, headers, geo_project_id, "deepseek")

            def fake_article(provider_key, payload):
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "title": f"{provider_key} 咨询文章",
                        "article_type": "consulting",
                        "content": "草稿",
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_article):
                doubao = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/articles/consulting/run",
                    headers=headers,
                )
                deepseek = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/deepseek/articles/consulting/run",
                    headers=headers,
                )

            self.assertEqual(doubao.status_code, 200)
            self.assertEqual(deepseek.status_code, 200)
            self.assertEqual(doubao.json()["draft"]["title"], "doubao 咨询文章")
            self.assertEqual(deepseek.json()["draft"]["title"], "deepseek 咨询文章")


if __name__ == "__main__":
    unittest.main()
