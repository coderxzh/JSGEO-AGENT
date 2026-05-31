import base64
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from agent_core.api.server import create_app


class KnowledgeDraftTest(unittest.TestCase):
    def test_create_draft_does_not_create_profile_until_confirmed(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}
            text = """
公司名称：四川佳祺食品有限公司
公司简称：四川佳祺食品
所属行业：食品行业 / ToB 预制菜供应链
主营业务：火锅丸滑、预制菜和餐饮供应链定制服务
企业详细介绍：
四川佳祺食品是面向餐饮连锁客户的预制菜供应商。
产品/服务介绍：
火锅丸滑、鱼豆腐、定制预制菜、冷链配送。
用户痛点：
餐饮客户关注出餐慢、成本高、口味不稳定。
核心优势与特色：
稳定供货、冷链配送、支持定制。
业务区域范围：
四川、成都及西南区域。
目标关键词：
成都预制菜供应商
"""
            encoded = base64.b64encode(text.encode("utf-8")).decode("ascii")

            draft_response = client.post(
                "/api/knowledge/drafts",
                json={
                    "message": "建立企业知识库",
                    "intent": "create",
                    "skill_id": "knowledge-base-ingest",
                    "assets": [
                        {
                            "filename": "佳祺食品.md",
                            "content_type": "text/markdown",
                            "content_base64": encoded,
                        }
                    ],
                },
                headers=headers,
            )

            self.assertEqual(draft_response.status_code, 200)
            draft = draft_response.json()
            self.assertEqual(draft["profile"]["company_name"], "四川佳祺食品有限公司")
            self.assertEqual(draft["assets"][0]["filename"], "佳祺食品.md")
            profiles_before = client.get("/api/knowledge/profiles", headers=headers).json()["profiles"]
            self.assertEqual(profiles_before, [])

            confirm_response = client.post(
                f"/api/knowledge/drafts/{draft['id']}/confirm",
                json={"profile": draft["profile"]},
                headers=headers,
            )

            self.assertEqual(confirm_response.status_code, 200)
            body = confirm_response.json()
            self.assertEqual(body["profile"]["company_name"], "四川佳祺食品有限公司")
            self.assertIn("成都预制菜供应商哪家好", body["profile"]["generated_long_tail_keywords"])
            self.assertGreater(body["total"], 0)
            profiles_after = client.get("/api/knowledge/profiles", headers=headers).json()["profiles"]
            self.assertEqual(len(profiles_after), 1)
            self.assertEqual(profiles_after[0]["company_name"], "四川佳祺食品有限公司")

    def test_reject_draft_does_not_create_profile(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            draft_response = client.post(
                "/api/knowledge/drafts",
                json={
                    "message": "公司名称：成都行乐音改汽车用品有限公司\n主营业务：汽车音响改装",
                    "intent": "create",
                    "skill_id": "knowledge-base-ingest",
                },
                headers=headers,
            )
            self.assertEqual(draft_response.status_code, 200)
            draft_id = draft_response.json()["id"]

            rejected = client.post(f"/api/knowledge/drafts/{draft_id}/reject", headers=headers)

            self.assertEqual(rejected.status_code, 200)
            profiles = client.get("/api/knowledge/profiles", headers=headers).json()["profiles"]
            self.assertEqual(profiles, [])

    def test_draft_flow_is_persisted_to_conversation_history(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            draft_response = client.post(
                "/api/knowledge/drafts",
                json={
                    "message": "我想建立四川佳祺食品的企业知识库",
                    "conversation_id": "draft-conversation",
                    "intent": "create",
                    "skill_id": "knowledge-base-ingest",
                    "assets": [
                        {
                            "filename": "佳祺食品.md",
                            "content_type": "text/markdown",
                            "content_base64": base64.b64encode(
                                "公司名称：四川佳祺食品有限公司\n主营业务：预制菜供应链\n企业详细介绍：四川佳祺食品面向餐饮客户提供预制菜。".encode("utf-8")
                            ).decode("ascii"),
                        }
                    ],
                },
                headers=headers,
            )

            self.assertEqual(draft_response.status_code, 200)
            draft = draft_response.json()
            self.assertEqual(draft["conversation_id"], "draft-conversation")

            detail = client.get("/api/conversations/draft-conversation", headers=headers)
            self.assertEqual(detail.status_code, 200)
            messages = detail.json()["messages"]
            self.assertEqual(len(messages), 2)
            self.assertEqual(messages[0]["role"], "user")
            self.assertIn("四川佳祺食品", messages[0]["content"])
            self.assertEqual(messages[1]["role"], "assistant")
            self.assertIn("__GEO_KNOWLEDGE_DRAFT__", messages[1]["content"])
            self.assertEqual(messages[1]["metadata"]["type"], "knowledge_draft")
            self.assertEqual(messages[1]["metadata"]["confirmation_state"], "approval-requested")

            confirm_response = client.post(
                f"/api/knowledge/drafts/{draft['id']}/confirm",
                json={"profile": draft["profile"]},
                headers=headers,
            )
            self.assertEqual(confirm_response.status_code, 200)

            confirmed_detail = client.get("/api/conversations/draft-conversation", headers=headers)
            confirmed_messages = confirmed_detail.json()["messages"]
            self.assertIn("已建立", confirmed_messages[1]["content"])
            self.assertNotIn("__GEO_KNOWLEDGE_DRAFT__", confirmed_messages[1]["content"])
            self.assertEqual(confirmed_messages[1]["metadata"]["confirmation_state"], "output-available")
            self.assertTrue(confirmed_messages[1]["metadata"]["confirmation_approved"])


if __name__ == "__main__":
    unittest.main()
