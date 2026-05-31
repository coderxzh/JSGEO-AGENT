import base64
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from agent_core.api.server import create_app
from agent_core.db import create_connection
from agent_core.rag_service import RAGService, extract_document_text


class RAGServiceTest(unittest.TestCase):
    def test_profile_save_indexes_current_enterprise_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json={
                    "project_id": "enterprise-a",
                    "company_name": "成都行乐音改",
                    "short_name": "行乐音改",
                    "industry": "汽车音响改装",
                    "main_business": "DSP 调音和汽车隔音",
                    "target_keywords": "成都汽车音响改装",
                },
                headers=headers,
            )
            client.post(
                "/api/knowledge/enterprise-profile",
                json={
                    "project_id": "enterprise-b",
                    "company_name": "四川佳祺食品",
                    "short_name": "佳祺食品",
                    "industry": "预制菜供应链",
                    "main_business": "餐饮预制菜供货",
                    "target_keywords": "成都预制菜供应商",
                },
                headers=headers,
            )

            rag = RAGService(Path(tmp))
            a_results = rag.search("enterprise-a", "DSP 调音汽车隔音", limit=5)
            b_results = rag.search("enterprise-b", "DSP 调音汽车隔音", limit=5)

            self.assertTrue(any("DSP 调音" in result.content for result in a_results))
            self.assertFalse(any("DSP 调音" in result.content for result in b_results))

            status = client.get(
                "/api/knowledge/index-status?project_id=enterprise-a",
                headers=headers,
            )
            self.assertEqual(status.status_code, 200)
            self.assertGreater(status.json()["indexed"], 0)

    def test_chat_capture_syncs_to_vector_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)

            response = client.post(
                "/api/chat",
                json={
                    "message": "写入知识库：成都行乐音改拥有新能源车型专属无损升级方案",
                    "project_id": "enterprise-a",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

            self.assertEqual(response.status_code, 200)
            results = RAGService(Path(tmp)).search("enterprise-a", "新能源车型无损升级", limit=3)
            self.assertTrue(any("新能源车型" in result.content for result in results))

    def test_asset_upload_creates_document_chunks_and_indexes_them(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            content = "成都行乐音改文档资料。" * 80
            encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")

            # Avoid requiring pypdf in the test environment while still exercising the asset pipeline.
            with patch("agent_core.rag_service.extract_document_text", return_value=content):
                response = client.post(
                    "/api/knowledge/assets",
                    json={
                        "project_id": "enterprise-a",
                        "filename": "行乐音改资料.pdf",
                        "content_type": "application/pdf",
                        "content_base64": encoded,
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )
            self.assertEqual(response.status_code, 200)
            body = response.json()

            self.assertEqual(body["asset"]["status"], "indexed")
            self.assertGreater(body["total"], 0)
            results = RAGService(Path(tmp)).search("enterprise-a", "行乐音改文档资料", limit=3)
            self.assertTrue(results)

    def test_markdown_asset_upload_creates_searchable_knowledge(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            content = "# 企业资料\n\n成都行乐音改拥有新能源车型专属无损升级方案，并提供 DSP 调音服务。"
            encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")

            response = client.post(
                "/api/knowledge/assets",
                json={
                    "project_id": "enterprise-a",
                    "filename": "企业资料.md",
                    "content_type": "text/markdown",
                    "content_base64": encoded,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            self.assertEqual(response.status_code, 200)
            body = response.json()

            self.assertEqual(body["asset"]["status"], "indexed")
            self.assertGreater(body["total"], 0)
            results = RAGService(Path(tmp)).search("enterprise-a", "新能源车型 DSP 调音", limit=3)
            self.assertTrue(any("新能源车型" in result.content for result in results))

    def test_asset_upload_updates_draft_enterprise_profile(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json={
                    "project_id": "draft-enterprise-profile",
                    "company_name": "企业知识库草稿",
                    "short_name": "企业知识库草稿",
                    "industry": "待补充",
                    "main_business": "待补充",
                    "detailed_intro": "这是通过智能助手知识库录入技能自动创建的草稿。",
                },
                headers=headers,
            )
            content = """
公司名称：四川佳祺食品有限公司
公司简称：四川佳祺食品
所属行业：食品行业 / ToB 预制菜与速冻食品供应链
主营业务：火锅丸滑、预制菜、速冻食品和餐饮供应链定制服务

企业详细介绍：
四川佳祺食品是农业产业化国家重点龙头企业“佳士博食品”体系下的核心供应商，同时是山东佳祺食品在西南地区的独家 ToB 总经销商。

产品/服务介绍：
火锅丸滑类、鱼豆腐、包心丸、定制预制菜、冷链配送服务。

用户痛点：
餐饮连锁客户关注出餐慢、成本高、口味不稳定、冷链配送不稳定等问题。
"""
            encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
            response = client.post(
                "/api/knowledge/assets",
                json={
                    "project_id": "draft-enterprise-profile",
                    "filename": "佳祺食品资料.md",
                    "content_type": "text/markdown",
                    "content_base64": encoded,
                },
                headers=headers,
            )
            self.assertEqual(response.status_code, 200)

            detail = client.get("/api/knowledge/profiles/draft-enterprise-profile", headers=headers)
            self.assertEqual(detail.status_code, 200)
            profile = detail.json()["profile"]
            self.assertEqual(profile["company_name"], "四川佳祺食品有限公司")
            self.assertEqual(profile["short_name"], "四川佳祺食品")
            self.assertIn("食品行业", profile["industry"])
            self.assertIn("火锅丸滑", profile["main_business"])
            self.assertIn("农业产业化", profile["detailed_intro"])
            self.assertIn("餐饮连锁", profile["user_pain_points"])

    def test_asset_upload_prefers_dispatcher_structured_profile(self):
        class FakeGateway:
            def extract_enterprise_profile(self, text):
                return {
                    "company_name": "成都行乐音改汽车用品有限公司",
                    "short_name": "成都行乐音改",
                    "industry": "汽车音响改装",
                    "main_business": "汽车音响改装、隔音工程、DSP 调音",
                    "core_advantages": "新能源车型专属无损升级方案",
                }

        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}
            client.post(
                "/api/knowledge/enterprise-profile",
                json={
                    "project_id": "draft-enterprise-profile",
                    "company_name": "企业知识库草稿",
                    "short_name": "企业知识库草稿",
                    "industry": "待补充",
                    "main_business": "待补充",
                    "detailed_intro": "这是通过智能助手知识库录入技能自动创建的草稿。",
                },
                headers=headers,
            )
            rag = RAGService(Path(tmp), llm_gateway=FakeGateway())
            content = "这是一份不含显式冒号字段的企业资料，但模型已经识别出结构化内容。"
            encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
            with patch("agent_core.rag_service.extract_document_text", return_value=content):
                response = client.post(
                    "/api/knowledge/assets",
                    json={
                        "project_id": "draft-enterprise-profile",
                        "filename": "企业资料.md",
                        "content_type": "text/markdown",
                        "content_base64": encoded,
                    },
                    headers=headers,
                )
            self.assertEqual(response.status_code, 200)

            # Exercise the structured rebuild with the fake dispatcher to keep the
            # test independent from environment API keys.
            rag.rebuild_enterprise_profile("draft-enterprise-profile", content)

            detail = client.get("/api/knowledge/profiles/draft-enterprise-profile", headers=headers)
            profile = detail.json()["profile"]
            self.assertEqual(profile["company_name"], "成都行乐音改汽车用品有限公司")
            self.assertEqual(profile["short_name"], "成都行乐音改")
            self.assertIn("DSP", profile["main_business"])
            self.assertIn("新能源", profile["core_advantages"])

    def test_docx_text_extraction_has_standard_library_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            docx_path = Path(tmp) / "企业资料.docx"
            document_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>成都行乐音改</w:t></w:r></w:p>
    <w:p><w:r><w:t>新能源车型专属无损升级方案</w:t></w:r></w:p>
  </w:body>
</w:document>"""
            with zipfile.ZipFile(docx_path, "w") as archive:
                archive.writestr("word/document.xml", document_xml)

            text = extract_document_text(
                docx_path,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )

            self.assertIn("成都行乐音改", text)
            self.assertIn("新能源车型专属无损升级方案", text)

    def test_delete_profile_removes_assets_entries_and_vector_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json={
                    "project_id": "enterprise-a",
                    "company_name": "成都行乐音改",
                    "main_business": "汽车音响改装",
                },
                headers=headers,
            )
            self.assertTrue(RAGService(Path(tmp)).search("enterprise-a", "汽车音响改装", limit=1))

            deleted = client.delete("/api/knowledge/profiles/enterprise-a", headers=headers)
            self.assertEqual(deleted.status_code, 200)
            self.assertEqual(RAGService(Path(tmp)).search("enterprise-a", "汽车音响改装", limit=1), [])
            with create_connection(Path(tmp)) as conn:
                entries = conn.execute(
                    "SELECT COUNT(*) AS count FROM knowledge_entries WHERE project_id = ?",
                    ("enterprise-a",),
                ).fetchone()["count"]
                assets = conn.execute(
                    "SELECT COUNT(*) AS count FROM knowledge_assets WHERE project_id = ?",
                    ("enterprise-a",),
                ).fetchone()["count"]
            self.assertEqual(entries, 0)
            self.assertEqual(assets, 0)


if __name__ == "__main__":
    unittest.main()
