import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from agent_core.api.server import create_app
from agent_core.db import (
    create_connection,
    list_knowledge_entries,
    update_knowledge_entry_embedding_status,
)
from agent_core.geo_project_service import build_initial_keywords
from agent_core.knowledge_service import generate_long_tail_keywords


def complete_profile(project_id: str = "enterprise-geo-1") -> dict:
    return {
        "project_id": project_id,
        "company_name": "成都行乐音改汽车用品有限公司",
        "short_name": "成都行乐音改",
        "industry": "汽车音响改装",
        "main_business": "汽车音响无损升级、全车隔音、DSP 调音",
        "detailed_intro": "成都行乐音改专注汽车音响改装和隔音工程，为燃油车和新能源车提供门店施工服务。",
        "products_services": "入门音响升级、DSP 调音、四门隔音、全车隔音、低音炮升级。",
        "user_pain_points": "车主关注原车音质差、施工拆车风险、预算不透明、新能源车型改装适配等问题。",
        "trust_endorsements": "团队拥有多年汽车音响施工经验，门店提供标准化施工验收和售后支持。",
        "business_regions": "成都、成华区、四川",
        "target_keywords": "成都汽车音响改装\n成都靠谱的汽车音响改装店",
    }


class GeoProjectServiceTest(unittest.TestCase):
    def test_ensure_geo_project_collecting_until_index_ready(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            created = client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile(),
                headers=headers,
            )
            self.assertEqual(created.status_code, 200)

            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-geo-1"},
                headers=headers,
            )

            self.assertEqual(ensured.status_code, 200)
            body = ensured.json()
            self.assertEqual(body["project_id"], "enterprise-geo-1")
            self.assertIn(body["current_phase"], {"collecting", "ready_for_check"})
            self.assertEqual(
                body["initial_keywords"][:2],
                ["成都汽车音响改装", "成都靠谱的汽车音响改装店"],
            )

            listed = client.get(
                "/api/geo/projects?enterprise_project_id=enterprise-geo-1",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200)
            self.assertEqual(len(listed.json()["projects"]), 1)

    def test_geo_project_ready_when_profile_and_index_are_ready(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-ready"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-ready", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")

            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-ready"},
                headers=headers,
            )

            self.assertEqual(ensured.status_code, 200)
            body = ensured.json()
            self.assertTrue(body["knowledge_base_ready"])
            self.assertEqual(body["current_phase"], "ready_for_check")
            self.assertEqual(body["phase_status"]["stage_1"]["status"], "ready_for_check")

    def test_phase_two_confirm_and_cancel_update_geo_project_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-phase-two"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-phase-two", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-phase-two"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]

            confirmed = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/phase-2/confirm",
                headers=headers,
            )
            self.assertEqual(confirmed.status_code, 200)
            confirmed_body = confirmed.json()
            self.assertEqual(confirmed_body["current_phase"], "ready_for_check")
            self.assertEqual(confirmed_body["phase_status"]["platforms"]["doubao"]["stage_2"]["status"], "pending")
            self.assertEqual(confirmed_body["phase_status"]["platforms"]["deepseek"]["stage_2"]["status"], "not_started")

            refreshed = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-phase-two"},
                headers=headers,
            )
            self.assertEqual(refreshed.json()["current_phase"], "ready_for_check")
            self.assertEqual(refreshed.json()["phase_status"]["platforms"]["doubao"]["stage_2"]["status"], "pending")

            collecting = client.post(
                "/api/knowledge/enterprise-profile",
                json={"project_id": "enterprise-collecting", "company_name": "资料不足企业"},
                headers=headers,
            )
            self.assertEqual(collecting.status_code, 200)
            not_ready = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-collecting"},
                headers=headers,
            )
            rejected = client.post(
                f"/api/geo/projects/{not_ready.json()['id']}/platforms/doubao/phase-2/confirm",
                headers=headers,
            )
            self.assertEqual(rejected.status_code, 400)

    def test_phase_two_cancel_defers_without_breaking_stage_one_ready(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-defer"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-defer", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-defer"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]

            cancelled = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/deepseek/phase-2/cancel",
                headers=headers,
            )

            self.assertEqual(cancelled.status_code, 200)
            body = cancelled.json()
            self.assertEqual(body["current_phase"], "ready_for_check")
            self.assertTrue(body["knowledge_base_ready"])
            self.assertEqual(body["phase_status"]["platforms"]["deepseek"]["stage_2"]["status"], "user_deferred")
            self.assertEqual(body["phase_status"]["platforms"]["doubao"]["stage_2"]["status"], "not_started")

    def test_platform_phase_two_states_do_not_affect_each_other(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-platforms"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-platforms", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-platforms"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]

            doubao = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/phase-2/confirm",
                headers=headers,
            )
            self.assertEqual(doubao.status_code, 200)
            deepseek = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/deepseek/phase-2/cancel",
                headers=headers,
            )
            self.assertEqual(deepseek.status_code, 200)
            body = deepseek.json()
            self.assertEqual(body["phase_status"]["platforms"]["doubao"]["stage_2"]["status"], "pending")
            self.assertEqual(body["phase_status"]["platforms"]["deepseek"]["stage_2"]["status"], "user_deferred")

    def test_phase_two_prompt_is_persisted_as_recoverable_message(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-prompt"),
                headers=headers,
            )
            for row in list_knowledge_entries(Path(tmp), "enterprise-prompt", limit=200):
                update_knowledge_entry_embedding_status(Path(tmp), row["id"], "indexed")
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-prompt"},
                headers=headers,
            )
            geo_project_id = ensured.json()["id"]

            prompt = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/phase-2/prompt",
                json={"conversation_id": None},
                headers=headers,
            )

            self.assertEqual(prompt.status_code, 200)
            prompt_body = prompt.json()
            message = prompt_body["message"]
            self.assertEqual(message["role"], "assistant")
            self.assertIn("排行榜问题池", message["content"])
            self.assertEqual(message["metadata"]["type"], "geo_phase_prompt")
            self.assertEqual(message["metadata"]["flow"], "ranking_question_pool")
            self.assertEqual(message["metadata"]["confirmation_state"], "approval-requested")

            confirmed = client.post(
                f"/api/geo/projects/{geo_project_id}/platforms/doubao/phase-2/confirm",
                json={"message_id": message["id"]},
                headers=headers,
            )
            self.assertEqual(confirmed.status_code, 200)
            detail = client.get(f"/api/conversations/{prompt_body['conversation_id']}", headers=headers)
            restored = detail.json()["messages"][0]
            self.assertEqual(restored["metadata"]["confirmation_state"], "approval-responded")
            self.assertEqual(restored["metadata"]["status"], "running")
            self.assertTrue(restored["metadata"]["confirmation_approved"])

    def test_initial_keywords_fallback_uses_region_industry_and_subject(self):
        keywords = build_initial_keywords({
            "company_name": "四川佳祺食品有限公司",
            "short_name": "四川佳祺食品",
            "industry": "预制菜供应商",
            "business_regions": "成都、四川",
            "target_keywords": "",
        })

        self.assertIn("成都预制菜供应商", keywords)
        self.assertLessEqual(len(keywords), 5)

    def test_long_tail_keywords_are_limited_and_do_not_expand_question_keywords(self):
        generated = generate_long_tail_keywords(
            "\n".join([
                "ToB预制菜供应商",
                "速冻食品总经销",
                "餐饮料理包代工",
                "火锅丸滑批发",
                "冷链食品定制",
                "餐饮降本增效方案",
                "连锁餐饮为什么选择四川佳祺食品",
                "餐饮门店怎么解决出餐慢",
                "哪家ToB预制菜供应商支持定制研发",
                "冷链食品定制供应链怎么选",
            ]),
            "西南地区，并依托全国冷链配送网络覆盖全国。",
        )
        rows = generated.splitlines()

        self.assertLessEqual(len(rows), 30)
        self.assertTrue(any("西南地区ToB预制菜供应商哪家好" in row for row in rows))
        self.assertFalse(any("并依托全国冷链" in row for row in rows))
        self.assertFalse(any("为什么选择四川佳祺食品哪家好" in row for row in rows))
        self.assertFalse(any("哪家ToB预制菜供应商支持定制研发哪家好" in row for row in rows))

    def test_long_tail_keywords_support_pipe_delimited_keywords(self):
        generated = generate_long_tail_keywords(
            "成都ToB预制菜供应商哪家好 | 成都速冻食品定制批发 | 成都餐饮料理包代工厂",
            "成都、西南地区",
        )

        self.assertIn("成都速冻食品定制批发哪家好", generated)
        self.assertIn("成都餐饮料理包代工厂公司推荐", generated)
        self.assertNotIn("成都ToB预制菜供应商哪家好哪家好", generated)

    def test_delete_profile_removes_geo_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            token = "test-token"
            app = create_app(token=token, data_dir=Path(tmp))
            client = TestClient(app)
            headers = {"Authorization": f"Bearer {token}"}

            client.post(
                "/api/knowledge/enterprise-profile",
                json=complete_profile("enterprise-delete"),
                headers=headers,
            )
            ensured = client.post(
                "/api/geo/projects/ensure",
                json={"project_id": "enterprise-delete"},
                headers=headers,
            )
            self.assertEqual(ensured.status_code, 200)

            deleted = client.delete(
                "/api/knowledge/profiles/enterprise-delete",
                headers=headers,
            )

            self.assertEqual(deleted.status_code, 200)
            with create_connection(Path(tmp)) as conn:
                count = conn.execute(
                    "SELECT COUNT(*) AS count FROM geo_projects WHERE project_id = ?",
                    ("enterprise-delete",),
                ).fetchone()["count"]
            self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
