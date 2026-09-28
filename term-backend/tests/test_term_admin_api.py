import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import AdminAuditLog, Term, Topic, TopicItem


class TermAdminApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:"})
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.term = Term(preferred_name_zh="礼", definition_zh="社会交往规范", status="draft")
        db.session.add(self.term)
        db.session.commit()

    def auth_header(self, username="admin"):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": "123456"},
        )
        token = response.get_json()["data"]["token"]
        return {"Authorization": f"Bearer {token}"}

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_lists_draft_and_published_terms_for_management(self):
        response = self.client.get("/api/v1/admin/terms?q=礼", headers=self.auth_header())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"][0]["status"], "draft")

    def test_creates_and_updates_a_term(self):
        created = self.client.post("/api/v1/admin/terms", json={
            "preferred_name_zh": "天下大同", "definition_zh": "共同理想", "status": "published",
            "term_level": "本源层", "culture_category": "传统文化", "cultural_connotation": "和合愿景",
        }, headers=self.auth_header())
        self.assertEqual(created.status_code, 201)
        term_id = created.get_json()["data"]["id"]

        updated = self.client.put(f"/api/v1/admin/terms/{term_id}", json={
            "preferred_name_zh": "大同", "definition_zh": "共同理想", "status": "draft",
        }, headers=self.auth_header())
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["data"]["preferred_name_zh"], "大同")
        self.assertEqual(db.session.get(Term, term_id).status, "draft")

    def test_rejects_invalid_name_and_status(self):
        headers = self.auth_header()
        empty = self.client.post("/api/v1/admin/terms", json={"preferred_name_zh": " ", "status": "draft"}, headers=headers)
        invalid = self.client.put(f"/api/v1/admin/terms/{self.term.id}", json={"preferred_name_zh": "礼", "status": "removed"}, headers=headers)
        self.assertEqual(empty.status_code, 400)
        self.assertEqual(invalid.status_code, 400)

    def test_archives_an_unlinked_term_instead_of_hard_deleting(self):
        term_id = self.term.id
        response = self.client.delete(f"/api/v1/admin/terms/{term_id}", headers=self.auth_header())
        self.assertEqual(response.status_code, 200)
        archived = db.session.get(Term, term_id)
        self.assertIsNotNone(archived)
        self.assertEqual(archived.status, "archived")
        self.assertIn("下架", response.get_json()["message"])

    def test_records_admin_audit_logs_for_term_changes(self):
        headers = self.auth_header()
        created = self.client.post("/api/v1/admin/terms", json={
            "preferred_name_zh": "仁", "definition_zh": "爱人", "status": "published",
        }, headers=headers)
        term_id = created.get_json()["data"]["id"]

        self.client.put(f"/api/v1/admin/terms/{term_id}", json={
            "preferred_name_zh": "仁爱", "definition_zh": "爱人之德", "status": "draft",
        }, headers=headers)
        self.client.delete(f"/api/v1/admin/terms/{term_id}", headers=headers)

        logs = AdminAuditLog.query.order_by(AdminAuditLog.id.asc()).all()
        self.assertEqual([log.action for log in logs], ["term.create", "term.update", "term.archive"])
        self.assertEqual(logs[-1].target_type, "term")
        self.assertEqual(logs[-1].target_id, str(term_id))

        response = self.client.get("/api/v1/admin/audit-logs", headers=headers)
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()["data"]
        self.assertEqual(payload[0]["action"], "term.archive")
        self.assertEqual(payload[0]["actor_username"], "admin")

    def test_refuses_to_delete_a_term_used_by_a_topic(self):
        topic = Topic(slug="ritual", title="礼文化", status="published")
        TopicItem(topic=topic, term=self.term, entry_type="term", title="礼")
        db.session.add(topic)
        db.session.commit()
        response = self.client.delete(f"/api/v1/admin/terms/{self.term.id}", headers=self.auth_header())
        self.assertEqual(response.status_code, 409)
        self.assertIn("专题", response.get_json()["message"])

    def test_rejects_admin_term_list_without_token(self):
        response = self.client.get("/api/v1/admin/terms")

        self.assertEqual(response.status_code, 401)
        self.assertIn("请先登录", response.get_json()["message"])

    def test_rejects_admin_term_list_for_normal_user(self):
        response = self.client.get("/api/v1/admin/terms", headers=self.auth_header("user"))

        self.assertEqual(response.status_code, 403)
        self.assertIn("管理员权限", response.get_json()["message"])


if __name__ == "__main__":
    unittest.main()
