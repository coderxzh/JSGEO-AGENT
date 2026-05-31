import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import json

from fastapi.testclient import TestClient

from agent_core.api.server import create_app, load_environment
from agent_core.db import (
    create_connection,
    create_geo_article_draft,
    create_geo_question_set,
    create_geo_report,
    create_geo_source_discovery,
    update_knowledge_entry_embedding_status,
)
from agent_core.llm_gateway import ProviderRequestError, ProviderResponse, SourceCitation
from scripts.seed_demo_knowledge import seed


class BackendContractTest(unittest.TestCase):
    def test_health_chat_and_project_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            with patch("agent_core.api.server.load_dotenv"), patch.dict("os.environ", {}, clear=True):
                app = create_app(token=token, data_dir=Path(tmp))
                client = TestClient(app)

                health = client.get("/health")
                self.assertEqual(health.status_code, 200)
                self.assertEqual(health.json()["ok"], True)

                config = client.get(
                    "/api/config/status",
                    headers={"Authorization": f"Bearer {token}"},
                )
                self.assertEqual(config.status_code, 200)
                self.assertIn("providers", config.json())
                self.assertNotIn("api_key", str(config.json()).lower())

                rejected = client.post("/api/chat", json={"message": "hello"})
                self.assertEqual(rejected.status_code, 401)

                accepted = client.post(
                    "/api/chat",
                    json={"message": "hello"},
                    headers={"Authorization": f"Bearer {token}"},
                )
                self.assertEqual(accepted.status_code, 200)
                body = accepted.json()
                self.assertEqual(body["role"], "assistant")
                self.assertEqual(body["provider"], "local")
                self.assertEqual(body["sources"], [])
                self.assertEqual(body["search_queries"], [])
                self.assertEqual(body["search_actions"], [])
                self.assertEqual(body["search_usage"], {})
                self.assertIsNone(body["reasoning_content"])
                self.assertIn("尚未配置", body["content"])

                projects = client.get(
                    "/api/projects",
                    headers={"Authorization": f"Bearer {token}"},
                )
                self.assertEqual(projects.status_code, 200)
                self.assertEqual(projects.json(), {"projects": []})

                with create_connection(Path(tmp)) as conn:
                    rows = conn.execute("SELECT role, content FROM messages ORDER BY created_at").fetchall()

                self.assertEqual(rows[0]["role"], "user")
                self.assertEqual(rows[0]["content"], "hello")
                self.assertEqual(rows[1]["role"], "assistant")

    def test_knowledge_entry_contract_and_chat_capture(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            created = client.post(
                "/api/knowledge/entries",
                json={
                    "title": "企业主营",
                    "content": "成都行乐音改主营汽车音响改装",
                    "project_id": "enterprise-1",
                    "source_type": "manual",
                },
                headers=headers,
            )
            self.assertEqual(created.status_code, 200)
            created_body = created.json()
            self.assertEqual(created_body["total"], 1)
            self.assertEqual(created_body["entries"][0]["title"], "企业主营")
            self.assertEqual(created_body["entries"][0]["source_type"], "manual")
            self.assertEqual(created_body["entries"][0]["project_id"], "enterprise-1")

            captured = client.post(
                "/api/chat",
                json={
                    "message": "补充企业资料：成都行乐音改拥有专业汽车隔音施工团队",
                    "project_id": "enterprise-1",
                },
                headers=headers,
            )
            self.assertEqual(captured.status_code, 200)
            captured_body = captured.json()
            self.assertEqual(captured_body["provider"], "local")
            self.assertEqual(captured_body["model"], "knowledge-capture")
            self.assertIn("已写入本地知识库", captured_body["content"])
            self.assertIn("当前知识库共有 2 条资料", captured_body["content"])
            self.assertIn("知识条目", captured_body["reasoning_content"])

            listed = client.get(
                "/api/knowledge/entries?project_id=enterprise-1&limit=10",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200)
            listed_body = listed.json()
            self.assertEqual(listed_body["total"], 2)
            self.assertEqual(len(listed_body["entries"]), 2)

            searched = client.post(
                "/api/knowledge/search",
                json={"query": "隔音施工", "project_id": "enterprise-1"},
                headers=headers,
            )
            self.assertEqual(searched.status_code, 200)
            searched_body = searched.json()
            self.assertEqual(searched_body["total"], 1)
            self.assertIn("隔音施工", searched_body["entries"][0]["content"])

    def test_conversation_history_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            with patch(
                "agent_core.api.server.LLMGateway.complete",
                return_value=ProviderResponse(
                    provider="deepseek",
                    model="deepseek-v4-pro",
                    content="已处理。",
                ),
            ):
                first = client.post(
                    "/api/chat",
                    json={
                        "message": "请帮我规划成都行乐音改的知识库录入流程",
                        "project_id": "enterprise-1",
                        "selected_model": "DeepSeek-V4 深度思考",
                    },
                    headers=headers,
                )
                self.assertEqual(first.status_code, 200)
                conversation_id = first.json()["conversation_id"]

                second = client.post(
                    "/api/chat",
                    json={
                        "message": "继续补充产品服务字段",
                        "conversation_id": conversation_id,
                        "project_id": "enterprise-1",
                        "selected_model": "DeepSeek-V4 深度思考",
                    },
                    headers=headers,
                )
            self.assertEqual(second.status_code, 200)
            self.assertEqual(second.json()["conversation_id"], conversation_id)

            listed = client.get(
                "/api/conversations?project_id=enterprise-1",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200)
            conversations = listed.json()["conversations"]
            self.assertEqual(len(conversations), 1)
            self.assertEqual(conversations[0]["id"], conversation_id)
            self.assertIn("请帮我规划成都行乐音改", conversations[0]["title"])
            self.assertEqual(conversations[0]["message_count"], 4)

            detail = client.get(
                f"/api/conversations/{conversation_id}",
                headers=headers,
            )
            self.assertEqual(detail.status_code, 200)
            body = detail.json()
            self.assertEqual(body["conversation"]["id"], conversation_id)
            self.assertEqual(len(body["messages"]), 4)
            self.assertEqual(body["messages"][0]["role"], "user")
            self.assertEqual(body["messages"][0]["content"], "请帮我规划成都行乐音改的知识库录入流程")

            missing = client.get(
                "/api/conversations/not-found",
                headers=headers,
            )
            self.assertEqual(missing.status_code, 404)

            deleted = client.delete(
                f"/api/conversations/{conversation_id}",
                headers=headers,
            )
            self.assertEqual(deleted.status_code, 200)
            self.assertEqual(deleted.json(), {"ok": True})
            after_delete = client.get(
                f"/api/conversations/{conversation_id}",
                headers=headers,
            )
            self.assertEqual(after_delete.status_code, 404)
            with create_connection(Path(tmp)) as conn:
                remaining_messages = conn.execute(
                    "SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ?",
                    (conversation_id,),
                ).fetchone()["count"]
            self.assertEqual(remaining_messages, 0)

            deleted_missing = client.delete(
                "/api/conversations/not-found",
                headers=headers,
            )
            self.assertEqual(deleted_missing.status_code, 404)

    def test_delete_conversation_keeps_business_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            profile = {
                "project_id": "enterprise-assets",
                "company_name": "成都行乐音改",
                "short_name": "行乐音改",
                "industry": "汽车音响改装",
                "main_business": "汽车音响改装和隔音施工",
                "detailed_intro": "成都本地汽车音响改装门店。",
                "products_services": "汽车音响、隔音、DSP 调音。",
                "user_pain_points": "车主希望提升音质并降低噪音。",
                "trust_endorsements": "本地门店案例和授权品牌。",
                "target_keywords": "成都汽车音响改装",
            }
            saved = client.post(
                "/api/knowledge/enterprise-profile",
                json=profile,
                headers=headers,
            )
            self.assertEqual(saved.status_code, 200)

            with patch(
                "agent_core.api.server.LLMGateway.complete",
                return_value=ProviderResponse(
                    provider="deepseek",
                    model="deepseek-v4-pro",
                    content="围绕企业资料完成分析。",
                ),
            ):
                response = client.post(
                    "/api/chat",
                    json={
                        "message": "请分析当前企业知识库",
                        "project_id": "enterprise-assets",
                        "selected_model": "DeepSeek-V4 深度思考",
                    },
                    headers=headers,
                )
            self.assertEqual(response.status_code, 200)
            conversation_id = response.json()["conversation_id"]

            deleted = client.delete(
                f"/api/conversations/{conversation_id}",
                headers=headers,
            )
            self.assertEqual(deleted.status_code, 200)

            profile_detail = client.get(
                "/api/knowledge/profiles/enterprise-assets",
                headers=headers,
            )
            self.assertEqual(profile_detail.status_code, 200)
            self.assertEqual(profile_detail.json()["profile"]["company_name"], "成都行乐音改")

            entries = client.get(
                "/api/knowledge/entries?project_id=enterprise-assets&limit=20",
                headers=headers,
            )
            self.assertEqual(entries.status_code, 200)
            self.assertGreater(entries.json()["total"], 0)

    def test_legacy_generic_conversation_title_uses_first_user_message(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            with create_connection(Path(tmp)) as conn:
                conn.execute(
                    "INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)",
                    ("legacy-conversation", "enterprise-1", "本地 GEO-Agent 对话"),
                )
                conn.execute(
                    "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                    ("legacy-message-1", "legacy-conversation", "user", "请帮我分析成都预制菜供应商的 GEO 排名机会"),
                )
                conn.execute(
                    "INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                    ("legacy-message-2", "legacy-conversation", "assistant", "可以，我会先拆解关键词。"),
                )
                conn.commit()

            listed = client.get(
                "/api/conversations?project_id=enterprise-1",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200)
            conversations = listed.json()["conversations"]
            self.assertEqual(conversations[0]["id"], "legacy-conversation")
            self.assertIn("请帮我分析成都预制菜供应商", conversations[0]["title"])
            self.assertNotEqual(conversations[0]["title"], "本地 GEO-Agent 对话")

            detail = client.get(
                "/api/conversations/legacy-conversation",
                headers=headers,
            )
            self.assertEqual(detail.status_code, 200)
            self.assertIn("请帮我分析成都预制菜供应商", detail.json()["conversation"]["title"])

    def test_assistant_only_conversation_title_uses_phase_metadata(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            with create_connection(Path(tmp)) as conn:
                conn.execute(
                    "INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)",
                    ("assistant-only", "enterprise-1", "新对话"),
                )
                conn.execute(
                    "INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)",
                    (
                        "assistant-message",
                        "assistant-only",
                        "assistant",
                        "已完成豆包阶段三：高权重信源发现。",
                        json.dumps({
                            "type": "geo_phase_result",
                            "phase": 3,
                            "platform": "doubao",
                            "project": {"company_name": "四川佳祺食品有限公司"},
                        }, ensure_ascii=False),
                    ),
                )
                conn.commit()

            listed = client.get(
                "/api/conversations?project_id=enterprise-1",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200)
            self.assertIn("豆包阶段3结果：四川佳祺食品", listed.json()["conversations"][0]["title"])
            self.assertNotEqual(listed.json()["conversations"][0]["title"], "新对话")

    def test_clear_conversations_keeps_business_assets(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            data_dir = Path(tmp)
            app = create_app(token=token, data_dir=data_dir)
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            profile = {
                "project_id": "enterprise-clear",
                "company_name": "四川佳祺食品有限公司",
                "short_name": "佳祺食品",
                "industry": "预制菜",
                "main_business": "ToB 预制菜和速冻食品供应",
                "detailed_intro": "面向成都及西南餐饮客户提供预制菜供应链服务。",
                "products_services": "火锅丸滑、料理包、特色酱料、调理肉制品。",
                "user_pain_points": "餐饮门店需要稳定出餐、降低后厨成本。",
                "trust_endorsements": "龙头企业体系、冷链和质量管理能力。",
                "target_keywords": "成都ToB预制菜供应商",
            }
            saved = client.post(
                "/api/knowledge/enterprise-profile",
                json=profile,
                headers=headers,
            )
            self.assertEqual(saved.status_code, 200)
            for row in saved.json()["entries"]:
                update_knowledge_entry_embedding_status(data_dir, row["id"], "indexed")

            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-clear"},
                headers=headers,
            )
            self.assertEqual(ensured.status_code, 200)
            geo_project_id = ensured.json()["id"]
            question_set_id = create_geo_question_set(
                data_dir,
                geo_project_id,
                "enterprise-clear",
                "doubao",
                json.dumps({"question_pool": ["成都ToB预制菜供应商哪家好"], "ranking_questions": []}, ensure_ascii=False),
            )
            report_id = create_geo_report(
                data_dir,
                geo_project_id,
                "enterprise-clear",
                "doubao",
                "completed",
                json.dumps({"summary": "阶段二完成"}, ensure_ascii=False),
                "",
            )
            discovery_id = create_geo_source_discovery(
                data_dir,
                geo_project_id,
                "enterprise-clear",
                "doubao",
                json.dumps({"candidate_sources": [{"name": "官网"}]}, ensure_ascii=False),
            )
            draft_id = create_geo_article_draft(
                data_dir,
                geo_project_id,
                "enterprise-clear",
                "doubao",
                "consulting",
                "draft",
                json.dumps({"title": "采购选型指南"}, ensure_ascii=False),
            )

            with create_connection(data_dir) as conn:
                conn.execute(
                    "INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)",
                    ("clear-conversation", "enterprise-clear", "新对话"),
                )
                conn.execute(
                    "INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)",
                    ("clear-message", "clear-conversation", "assistant", "阶段二完成", "{}"),
                )
                conn.execute(
                    """
                    INSERT INTO knowledge_profile_drafts (
                        id, intent, project_id, conversation_id, assistant_message_id, status, profile_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        "clear-draft",
                        "update",
                        "enterprise-clear",
                        "clear-conversation",
                        "clear-message",
                        "pending",
                        "{}",
                    ),
                )
                conn.commit()

            response = client.post("/api/conversations/clear", headers=headers)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(Path(response.json()["backup_path"]).exists())

            self.assertEqual(client.get("/api/conversations?project_id=enterprise-clear", headers=headers).json()["conversations"], [])
            with create_connection(data_dir) as conn:
                self.assertEqual(conn.execute("SELECT COUNT(*) AS count FROM messages").fetchone()["count"], 0)
                self.assertEqual(conn.execute("SELECT COUNT(*) AS count FROM conversations").fetchone()["count"], 0)
                draft = conn.execute("SELECT conversation_id, assistant_message_id FROM knowledge_profile_drafts WHERE id = ?", ("clear-draft",)).fetchone()
                self.assertIsNone(draft["conversation_id"])
                self.assertIsNone(draft["assistant_message_id"])

            profile_detail = client.get("/api/knowledge/profiles/enterprise-clear", headers=headers)
            self.assertEqual(profile_detail.status_code, 200)
            self.assertEqual(profile_detail.json()["profile"]["company_name"], "四川佳祺食品有限公司")
            self.assertGreater(profile_detail.json()["total"], 0)
            self.assertEqual(client.get(f"/api/geo/question-sets/{question_set_id}", headers=headers).status_code, 200)
            self.assertEqual(client.get(f"/api/geo/reports/{report_id}", headers=headers).status_code, 200)
            self.assertEqual(client.get(f"/api/geo/source-discoveries/{discovery_id}", headers=headers).status_code, 200)
            self.assertEqual(client.get(f"/api/geo/articles/{draft_id}", headers=headers).status_code, 200)

    def test_enterprise_profile_generates_structured_knowledge_entries(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            response = client.post(
                "/api/knowledge/enterprise-profile",
                json={
                    "project_id": "成都行乐音改",
                    "company_name": "成都行乐音改汽车用品有限公司",
                    "short_name": "成都行乐音改",
                    "industry": "汽车音响改装、隔音工程",
                    "main_business": "汽车音响无损升级、全车隔音、DSP 调音",
                    "trust_endorsements": "IASCA 认证调音师团队，德国彩虹授权。",
                    "business_regions": "成都",
                    "target_keywords": "成都汽车音响改装\n成都靠谱的汽车音响改装店",
                },
                headers=headers,
            )

            self.assertEqual(response.status_code, 200)
            body = response.json()
            self.assertGreaterEqual(body["total"], 8)
            titles = [entry["title"] for entry in body["entries"]]
            contents = "\n".join(entry["content"] for entry in body["entries"])
            self.assertTrue(any("长尾语义词" in title for title in titles))
            self.assertIn("成都汽车音响改装 | 成都汽车音响改装哪家好", contents)
            self.assertIn("德国彩虹授权", contents)

    def test_enterprise_profile_list_edit_delete_and_seed_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            data_dir = Path(tmp) / "data"
            token = "test-token"
            seed(data_dir)
            app = create_app(token=token, data_dir=data_dir)
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            listed = client.get("/api/knowledge/profiles", headers=headers)
            self.assertEqual(listed.status_code, 200)
            profiles = listed.json()["profiles"]
            self.assertEqual(len(profiles), 2)
            self.assertTrue(all(profile["entry_count"] > 10 for profile in profiles))

            detail = client.get(
                "/api/knowledge/profiles/%E6%88%90%E9%83%BD%E8%A1%8C%E4%B9%90%E9%9F%B3%E6%94%B9",
                headers=headers,
            )
            self.assertEqual(detail.status_code, 200)
            detail_body = detail.json()
            self.assertEqual(detail_body["profile"]["short_name"], "成都行乐音改")
            self.assertGreater(detail_body["total"], 10)

            edited = client.put(
                "/api/knowledge/profiles/%E6%88%90%E9%83%BD%E8%A1%8C%E4%B9%90%E9%9F%B3%E6%94%B9",
                json={
                    "company_name": "成都行乐音改汽车用品有限公司",
                    "short_name": "成都行乐音改",
                    "industry": "汽车音响改装",
                    "main_business": "汽车音响升级和新能源车型调音",
                    "business_regions": "成都高新区",
                    "target_keywords": "成都高新区汽车音响改装",
                },
                headers=headers,
            )
            self.assertEqual(edited.status_code, 200)
            with create_connection(data_dir) as conn:
                profile_count = conn.execute(
                    "SELECT COUNT(*) AS count FROM enterprise_profiles WHERE project_id = ?",
                    ("成都行乐音改",),
                ).fetchone()["count"]
                entry_rows = conn.execute(
                    "SELECT title, content FROM knowledge_entries WHERE project_id = ?",
                    ("成都行乐音改",),
                ).fetchall()
            self.assertEqual(profile_count, 1)
            self.assertTrue(any("成都高新区汽车音响改装" in row["content"] for row in entry_rows))

            deleted = client.delete(
                "/api/knowledge/profiles/%E6%88%90%E9%83%BD%E8%A1%8C%E4%B9%90%E9%9F%B3%E6%94%B9",
                headers=headers,
            )
            self.assertEqual(deleted.status_code, 200)
            self.assertEqual(deleted.json(), {"ok": True})
            after_delete = client.get(
                "/api/knowledge/profiles/%E6%88%90%E9%83%BD%E8%A1%8C%E4%B9%90%E9%9F%B3%E6%94%B9",
                headers=headers,
            )
            self.assertEqual(after_delete.status_code, 404)
            with create_connection(data_dir) as conn:
                remaining_entries = conn.execute(
                    "SELECT COUNT(*) AS count FROM knowledge_entries WHERE project_id = ?",
                    ("成都行乐音改",),
                ).fetchone()["count"]
            self.assertEqual(remaining_entries, 0)

    def test_skills_loader_contract(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            skill_dir = root / ".skills" / "knowledge-base-ingest"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text(
                "---\n"
                "name: 知识库录入\n"
                "description: 引导用户录入企业知识库。\n"
                "visibility: user\n"
                "---\n"
                "# 知识库录入\n"
                "请按字段收集企业资料。",
                encoding="utf-8",
            )
            internal_skill_dir = root / ".skills" / "ranking-article"
            internal_skill_dir.mkdir(parents=True)
            (internal_skill_dir / "SKILL.md").write_text(
                "---\n"
                "name: 排行榜文章\n"
                "description: 流程内部生成排行榜文章。\n"
                "---\n"
                "# 排行榜文章\n"
                "由 GEO 流程自动调用。",
                encoding="utf-8",
            )
            app = create_app(token="token", data_dir=root / "data", project_root=root)
            client = TestClient(app)

            response = client.get(
                "/api/skills",
                headers={"Authorization": "Bearer token"},
            )

            self.assertEqual(response.status_code, 200)
            skills = response.json()["skills"]
            self.assertEqual(len(skills), 1)
            self.assertEqual(skills[0]["id"], "knowledge-base-ingest")
            self.assertEqual(skills[0]["name"], "知识库录入")
            self.assertIn("按字段收集企业资料", skills[0]["content"])

    def test_project_skills_have_visibility_and_expected_menu_boundary(self):
        root = Path(__file__).resolve().parents[1]
        skill_files = sorted((root / ".skills").glob("*/SKILL.md"))
        self.assertGreaterEqual(len(skill_files), 8)

        visible_skills = []
        internal_skills = []
        for skill_file in skill_files:
            raw = skill_file.read_text(encoding="utf-8")
            self.assertTrue(raw.startswith("---\n"), f"{skill_file} missing frontmatter")
            frontmatter = raw.split("---", 2)[1]
            self.assertIn("name:", frontmatter, f"{skill_file} missing name")
            self.assertIn("description:", frontmatter, f"{skill_file} missing description")
            self.assertIn("visibility:", frontmatter, f"{skill_file} missing visibility")
            if "visibility: user" in frontmatter:
                visible_skills.append(skill_file.parent.name)
            if "visibility: internal" in frontmatter:
                internal_skills.append(skill_file.parent.name)

        self.assertEqual(visible_skills, ["knowledge-base-ingest"])
        self.assertIn("geo-check", internal_skills)
        geo_check = (root / ".skills" / "geo-check" / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("排行榜问题池", geo_check)
        self.assertNotIn("营销执行全案", geo_check)

    def test_chat_injects_selected_skill_prompt_internally(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            skill_dir = root / ".skills" / "knowledge-base-ingest"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text(
                "---\n"
                "name: 知识库录入\n"
                "description: 引导用户录入企业知识库。\n"
                "---\n"
                "内部技能步骤：收集企业名称、业务、关键词。",
                encoding="utf-8",
            )
            token = "test-token"
            app = create_app(token=token, data_dir=root / "data", project_root=root)
            client = TestClient(app)
            captured_payload = {}

            def complete(_provider_key, payload):
                captured_payload["user_message"] = payload.user_message
                captured_payload["skill_prompt"] = payload.skill_prompt
                return ProviderResponse(
                    provider="deepseek",
                    model="deepseek-v4-pro",
                    content="已按技能处理。",
                )

            with patch("agent_core.api.server.LLMGateway.complete", side_effect=complete):
                response = client.post(
                    "/api/chat",
                    json={
                        "message": "请开始引导我录入企业资料",
                        "selected_model": "DeepSeek-V4 深度思考",
                        "skill_id": "knowledge-base-ingest",
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(captured_payload["user_message"], "请开始引导我录入企业资料")
            self.assertIn("知识库录入", captured_payload["skill_prompt"])
            self.assertIn("内部技能步骤", captured_payload["skill_prompt"])

    def test_chat_injects_matching_knowledge_context(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/entries",
                json={
                    "title": "主营服务",
                    "content": "成都行乐音改主营汽车音响改装和 DSP 调音。",
                    "project_id": "enterprise-1",
                },
                headers=headers,
            )

            captured_payload = {}

            def complete(_provider_key, payload):
                captured_payload["knowledge_context"] = payload.knowledge_context
                return ProviderResponse(
                    provider="deepseek",
                    model="deepseek-v4-pro",
                    content="已基于知识库回答。",
                )

            with patch("agent_core.api.server.LLMGateway.complete", side_effect=complete):
                response = client.post(
                    "/api/chat",
                    json={
                        "message": "请介绍成都行乐音改的汽车音响业务",
                        "selected_model": "DeepSeek-V4 深度思考",
                        "project_id": "enterprise-1",
                    },
                    headers=headers,
                )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["content"], "已基于知识库回答。")
            self.assertIn("主营服务", captured_payload["knowledge_context"])
            self.assertIn("DSP 调音", captured_payload["knowledge_context"])

    def test_chat_stream_knowledge_capture(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)

            with client.stream(
                "POST",
                "/api/chat/stream",
                json={
                    "message": "写入知识库：成都行乐音改提供汽车音响调音服务",
                    "project_id": "enterprise-1",
                },
                headers={"Authorization": f"Bearer {token}"},
            ) as response:
                lines = [line for line in response.iter_lines() if line]

            events = [json.loads(line) for line in lines]
            self.assertEqual(response.status_code, 200)
            self.assertEqual(events[0]["type"], "meta")
            self.assertEqual(events[0]["provider_key"], "local")
            self.assertTrue(any(event["type"] == "delta" for event in events))
            self.assertEqual(events[-1]["type"], "done")
            self.assertEqual(events[-1]["provider"], "local")
            self.assertEqual(events[-1]["model"], "knowledge-capture")
            self.assertIn("汽车音响调音服务", events[-1]["content"])

            listed = client.get(
                "/api/knowledge/entries?project_id=enterprise-1",
                headers={"Authorization": f"Bearer {token}"},
            )
            self.assertEqual(listed.json()["total"], 1)

    def test_project_root_env_is_loaded(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / ".env").write_text(
                "DEEPSEEK_API_KEY=test-key\n"
                "DEEPSEEK_MODEL=test-model\n",
                encoding="utf-8",
            )

            with patch.dict("os.environ", {}, clear=True):
                load_environment(root)
                app = create_app(token="token", data_dir=root / "data", project_root=root)
                client = TestClient(app)

                response = client.get(
                    "/api/config/status",
                    headers={"Authorization": "Bearer token"},
                )

            deepseek = response.json()["providers"]["deepseek"]
            self.assertEqual(deepseek["configured"], True)
            self.assertEqual(deepseek["model"], "test-model")

    def test_provider_error_is_returned_as_chat_response(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)

            def fail_complete(_provider_key, _payload):
                raise ProviderRequestError(
                    provider="deepseek",
                    model="deepseek-v4-pro",
                    status_code=401,
                    message="deepseek 请求失败（HTTP 401）：invalid api key",
                )

            app.dependency_overrides = {}
            route = next(route for route in app.routes if getattr(route, "path", None) == "/api/chat")
            original_endpoint = route.endpoint

            with patch("agent_core.api.server.LLMGateway.complete", side_effect=fail_complete):
                accepted = client.post(
                    "/api/chat",
                    json={"message": "hello", "selected_model": "DeepSeek-V4 深度思考"},
                    headers={"Authorization": f"Bearer {token}"},
                )

            route.endpoint = original_endpoint
            self.assertEqual(accepted.status_code, 200)
            body = accepted.json()
            self.assertEqual(body["provider"], "deepseek")
            self.assertEqual(body["error"], "deepseek 请求失败（HTTP 401）：invalid api key")
            self.assertEqual(body["sources"], [])
            self.assertEqual(body["search_queries"], [])
            self.assertEqual(body["search_actions"], [])
            self.assertEqual(body["search_usage"], {})
            self.assertIsNone(body["reasoning_content"])
            self.assertIn("请确认 .env", body["content"])
            log_file = Path(tmp) / "logs" / "provider-errors.log"
            self.assertIn("invalid api key", log_file.read_text(encoding="utf-8"))

    def test_chat_stream_returns_meta_delta_and_done(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)

            with patch(
                "agent_core.api.server.LLMGateway.complete",
                return_value=ProviderResponse(
                    provider="doubao",
                    model="doubao-seed-2-0-lite-260428",
                    content="OK",
                    sources=[SourceCitation(title="参考资料", url="https://example.com")],
                    search_queries=["成都预制菜排行"],
                    search_actions=[{"type": "search", "query": "成都预制菜排行", "limit": 20}],
                    search_usage={"tool_usage": 1, "tool_usage_details": {"search_engine": 1}},
                    reasoning_content="分析关键词和引用来源。",
                ),
            ):
                with client.stream(
                    "POST",
                    "/api/chat/stream",
                    json={"message": "hello", "selected_model": "DeepSeek-V4 深度思考"},
                    headers={"Authorization": f"Bearer {token}"},
                ) as response:
                    lines = [line for line in response.iter_lines() if line]

            events = [json.loads(line) for line in lines]
            self.assertEqual(response.status_code, 200)
            self.assertEqual(events[0]["type"], "meta")
            self.assertTrue(any(event["type"] == "delta" and event["text"] == "OK" for event in events))
            self.assertEqual(events[-1]["type"], "done")
            self.assertEqual(events[-1]["sources"], [{"title": "参考资料", "url": "https://example.com", "logo_url": None, "start_index": None, "end_index": None}])
            self.assertEqual(events[-1]["search_queries"], ["成都预制菜排行"])
            self.assertEqual(events[-1]["search_actions"], [{"type": "search", "query": "成都预制菜排行", "limit": 20}])
            self.assertEqual(events[-1]["search_usage"], {"tool_usage": 1, "tool_usage_details": {"search_engine": 1}})
            self.assertEqual(events[-1]["reasoning_content"], "分析关键词和引用来源。")


if __name__ == "__main__":
    unittest.main()
