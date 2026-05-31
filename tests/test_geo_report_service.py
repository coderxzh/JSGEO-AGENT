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


class GeoReportServiceTest(unittest.TestCase):
    def test_phase_two_report_is_platform_scoped_and_not_knowledge_entry(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-report"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-report", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")

            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-report"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]
            before_entries = len(list(list_knowledge_entries(Path(tmp), "enterprise-report", limit=200)))

            def fake_complete(provider_key, payload):
                self.assertEqual(provider_key, "doubao")
                self.assertIn("排行榜问题池", payload.skill_prompt)
                return ProviderResponse(
                    provider="doubao",
                    model="fake",
                    content=json.dumps({
                        "summary": "豆包平台排行榜问题池完成",
                        "question_pool": [{"question": "成都汽车音响改装哪家好", "intent": "ranking"}],
                        "ranking_questions": [{"question": "成都汽车音响改装店排行榜", "keyword": "成都汽车音响改装", "priority": "high"}],
                        "supporting_content_needs": [{"type": "consulting", "topic": "汽车音响改装怎么选"}],
                        "source_discovery_queries": [{"query": "成都汽车音响改装店排行榜", "purpose": "提取引用信源"}],
                        "missing_knowledge": ["客户案例"],
                        "next_actions": ["发现高权重信源"],
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_complete):
                report = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/phase-2/run",
                    headers=headers,
                )

            self.assertEqual(report.status_code, 200)
            body = report.json()
            self.assertEqual(body["platform"], "doubao")
            self.assertEqual(body["status"], "completed")
            self.assertEqual(body["report"]["summary"], "豆包平台排行榜问题池完成")
            self.assertEqual(body["report"]["ranking_questions"][0]["question"], "成都汽车音响改装店排行榜")
            self.assertNotIn("supporting_content_needs", body["report"])
            self.assertNotIn("source_discovery_queries", body["report"])
            self.assertNotIn("missing_knowledge", body["report"])
            self.assertNotIn("next_actions", body["report"])
            self.assertEqual(before_entries, len(list(list_knowledge_entries(Path(tmp), "enterprise-report", limit=200))))
            question_set = client.get(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/question-sets/latest",
                headers=headers,
            )
            self.assertEqual(question_set.status_code, 200)
            self.assertEqual(question_set.json()["questions"]["ranking_questions"][0]["question"], "成都汽车音响改装店排行榜")

            latest = client.get(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/reports/latest",
                headers=headers,
            )
            self.assertEqual(latest.status_code, 200)
            self.assertEqual(latest.json()["id"], body["id"])

            with create_connection(Path(tmp)) as conn:
                rows = conn.execute("SELECT platform, report_json FROM geo_reports").fetchall()
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0]["platform"], "doubao")

    def test_phase_two_report_requires_ready_knowledge_base(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json={"project_id": "not-ready", "company_name": "资料不足企业"},
                headers=headers,
            )
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "not-ready"},
                headers=headers,
            )
            rejected = client.post(
                f"/api/geo/projects/{ensured.json()['id']}/platforms/deepseek/phase-2/run",
                headers=headers,
            )
            self.assertEqual(rejected.status_code, 400)

    def test_source_discovery_requires_question_pool_and_saves_platform_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-source"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-source", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-source"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]

            rejected = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/source-discovery/run",
                headers=headers,
            )
            self.assertEqual(rejected.status_code, 400)

            def fake_complete(provider_key, payload):
                if "信源证据盘点" in payload.skill_prompt:
                    return ProviderResponse(
                        provider=provider_key,
                        model="fake",
                        content=json.dumps({
                            "summary": "豆包信源发现完成",
                            "ai_recommended_sources": [{"source": "官网", "source_type": "owned", "reason": "品牌事实源", "confidence": "高"}],
                            "observed_citation_sources": [{"question": "成都汽车音响改装店排行榜", "source": "大众点评", "url": "", "evidence": "本地服务引用"}],
                            "source_scores": [{"source": "大众点评", "score": 88, "priority": "高", "why": "本地服务强信源"}],
                            "recommended_publish_targets": [{"source": "官网", "content_type": "consulting", "publish_reason": "沉淀企业事实"}],
                            "missing_evidence": ["门店案例链接"],
                            "next_actions": ["生成咨询类和测评类支撑内容"],
                        }, ensure_ascii=False),
                    )
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "summary": "问题池完成",
                        "question_pool": [{"question": "成都汽车音响改装哪家好"}],
                        "ranking_questions": [{"question": "成都汽车音响改装店排行榜"}],
                        "supporting_content_needs": [{"type": "consulting", "topic": "汽车音响改装怎么选"}],
                        "source_discovery_queries": [{"query": "成都汽车音响改装店排行榜"}],
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_complete):
                report = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/phase-2/run",
                    headers=headers,
                )
                self.assertEqual(report.status_code, 200)
                with create_connection(Path(tmp)) as conn:
                    conn.execute(
                        "INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)",
                        ("source-conversation", "enterprise-source", "阶段三测试"),
                    )
                    conn.execute(
                        "INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)",
                        ("source-message", "source-conversation", "assistant", "阶段二完成", "{}"),
                    )
                    conn.commit()
                discovery = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/source-discovery/run",
                    json={"message_id": "source-message"},
                    headers=headers,
                )

            self.assertEqual(discovery.status_code, 200)
            body = discovery.json()
            self.assertEqual(body["platform"], "doubao")
            self.assertEqual(body["discovery"]["summary"], "豆包信源发现完成")
            self.assertEqual(body["discovery"]["observed_citation_sources"], [])
            self.assertEqual(body["discovery"]["verified_observed_sources"], [])
            self.assertEqual(body["discovery"]["candidate_sources"][0]["source"], "官网")
            self.assertLessEqual(body["discovery"]["source_scores"][0]["score"], 60)
            self.assertEqual(body["discovery"]["source_scores"][0]["priority"], "待验证")
            self.assertIn("大众点评（成都汽车音响改装店排行榜）缺少可核验 URL", body["discovery"]["missing_evidence"][1])
            self.assertNotIn("recommended_publish_targets", body["discovery"])
            self.assertNotIn("next_actions", body["discovery"])

            with create_connection(Path(tmp)) as conn:
                message = conn.execute(
                    "SELECT content, metadata FROM messages WHERE id = ?",
                    ("source-message",),
                ).fetchone()
            metadata = json.loads(message["metadata"])
            self.assertEqual(metadata["type"], "geo_phase_result")
            self.assertEqual(metadata["phase"], 3)
            self.assertEqual(metadata["platform"], "doubao")
            self.assertEqual(metadata["source_discovery"]["id"], body["id"])
            self.assertIn("阶段三", message["content"])

            latest = client.get(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/source-discoveries/latest",
                headers=headers,
            )
            self.assertEqual(latest.status_code, 200)
            self.assertEqual(latest.json()["id"], body["id"])

    def test_source_discovery_backfills_question_set_from_legacy_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-legacy-report"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-legacy-report", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-legacy-report"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]
            legacy_report = {
                "summary": "旧阶段二报告",
                "question_pool": [{"question": "成都汽车音响改装哪家好"}],
                "ranking_questions": [{"question": "成都汽车音响改装店排行榜"}],
                "source_discovery_queries": [{"query": "成都汽车音响改装店排行榜"}],
            }
            with create_connection(Path(tmp)) as conn:
                conn.execute(
                    """
                    INSERT INTO geo_reports (
                        id, geo_project_id, enterprise_project_id, platform,
                        status, report_json, markdown
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        "legacy-report-id",
                        geo_project_id,
                        "enterprise-legacy-report",
                        "doubao",
                        "completed",
                        json.dumps(legacy_report, ensure_ascii=False),
                        "",
                    ),
                )
                conn.commit()

            def fake_complete(provider_key, payload):
                self.assertIn("成都汽车音响改装店排行榜", payload.user_message)
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "summary": "旧报告回填后信源发现完成",
                        "source_scores": [{"source": "官网", "score": 80, "priority": "高", "why": "可控事实源"}],
                        "recommended_publish_targets": [{"source": "官网", "content_type": "consulting", "publish_reason": "沉淀企业事实"}],
                        "next_actions": ["生成咨询类和测评类支撑内容"],
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_complete):
                discovery = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/source-discovery/run",
                    headers=headers,
                )

            self.assertEqual(discovery.status_code, 200)
            self.assertEqual(discovery.json()["discovery"]["summary"], "旧报告回填后信源发现完成")
            question_set = client.get(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/question-sets/latest",
                headers=headers,
            )
            self.assertEqual(question_set.status_code, 200)
            self.assertEqual(question_set.json()["questions"]["ranking_questions"][0]["question"], "成都汽车音响改装店排行榜")

    def test_source_discovery_backfills_question_set_from_request_payload(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-payload-report"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-payload-report", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-payload-report"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]
            fallback_report = {
                "id": "message-only-report",
                "geo_project_id": geo_project_id,
                "enterprise_project_id": "enterprise-payload-report",
                "platform": "doubao",
                "status": "completed",
                "report": {
                    "summary": "消息内阶段二结果",
                    "question_pool": [{"question": "成都汽车音响改装哪家好"}],
                    "ranking_questions": [{"question": "成都汽车音响改装店排行榜"}],
                    "source_discovery_queries": [{"query": "成都汽车音响改装店排行榜"}],
                },
            }

            def fake_complete(provider_key, payload):
                self.assertIn("消息内阶段二结果", payload.user_message)
                return ProviderResponse(
                    provider=provider_key,
                    model="fake",
                    content=json.dumps({
                        "summary": "payload 回填后信源发现完成",
                        "source_scores": [{"source": "官网", "score": 80, "priority": "高", "why": "可控事实源"}],
                    }, ensure_ascii=False),
                )

            with patch("agent_core.llm_gateway.LLMGateway.complete", side_effect=fake_complete):
                discovery = client.post(
                    f"/api/geo/projects/{geo_project_id}/platforms/doubao/source-discovery/run",
                    json={"fallback_report": fallback_report},
                    headers=headers,
                )

            self.assertEqual(discovery.status_code, 200)
            self.assertEqual(discovery.json()["discovery"]["summary"], "payload 回填后信源发现完成")
            question_set = client.get(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/question-sets/latest",
                headers=headers,
            )
            self.assertEqual(question_set.status_code, 200)
            self.assertEqual(question_set.json()["questions"]["summary"], "消息内阶段二结果")


if __name__ == "__main__":
    unittest.main()
