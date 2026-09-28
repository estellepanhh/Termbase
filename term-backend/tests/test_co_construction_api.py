import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import AdminAuditLog, Term


class CoConstructionApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
                "SECRET_KEY": "test-secret",
                "AUTH_TOKEN_SECRET": "test-token-secret",
            }
        )
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()
        self.user_token = self._login("user")
        self.admin_token = self._login("admin")

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def _login(self, username):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": "123456"},
        )
        return response.get_json()["data"]["token"]

    def _headers(self, token):
        return {"Authorization": f"Bearer {token}"}

    def _payload(self, name="天下为公"):
        return {
            "preferred_name_zh": name,
            "definition_zh": "天下属于公众，体现公共价值。",
            "recommended_translation": "the world belongs to all",
            "cultural_connotation": "体现中国传统政治理想。",
            "source_text": "《礼记·礼运》",
        }

    def test_user_creates_lists_updates_and_withdraws_own_submission(self):
        created = self.client.post(
            "/api/v1/co-construction/submissions",
            headers=self._headers(self.user_token),
            json=self._payload(),
        )
        self.assertEqual(created.status_code, 201)
        submission = created.get_json()["data"]
        self.assertEqual(submission["status"], "pending")
        self.assertEqual(submission["preferred_name_zh"], "天下为公")

        listed = self.client.get(
            "/api/v1/co-construction/submissions",
            headers=self._headers(self.user_token),
        )
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.get_json()["meta"]["total"], 1)

        updated = self.client.put(
            f"/api/v1/co-construction/submissions/{submission['public_id']}",
            headers=self._headers(self.user_token),
            json=self._payload("天下为公思想"),
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.get_json()["data"]["preferred_name_zh"], "天下为公思想")

        withdrawn = self.client.post(
            f"/api/v1/co-construction/submissions/{submission['public_id']}/withdraw",
            headers=self._headers(self.user_token),
        )
        self.assertEqual(withdrawn.status_code, 200)
        self.assertEqual(withdrawn.get_json()["data"]["status"], "withdrawn")

    def test_submission_requires_login_and_valid_payload(self):
        missing_login = self.client.post(
            "/api/v1/co-construction/submissions",
            json=self._payload(),
        )
        self.assertEqual(missing_login.status_code, 401)

        invalid = self.client.post(
            "/api/v1/co-construction/submissions",
            headers=self._headers(self.user_token),
            json={"preferred_name_zh": "", "definition_zh": ""},
        )
        self.assertEqual(invalid.status_code, 400)
        self.assertIn("术语名称", invalid.get_json()["message"])

    def test_admin_reviews_submission_and_publishes_term(self):
        created = self.client.post(
            "/api/v1/co-construction/submissions",
            headers=self._headers(self.user_token),
            json=self._payload(),
        ).get_json()["data"]

        forbidden = self.client.get(
            "/api/v1/admin/co-construction/submissions",
            headers=self._headers(self.user_token),
        )
        self.assertEqual(forbidden.status_code, 403)

        queue = self.client.get(
            "/api/v1/admin/co-construction/submissions",
            headers=self._headers(self.admin_token),
        )
        self.assertEqual(queue.status_code, 200)
        self.assertEqual(queue.get_json()["meta"]["total"], 1)

        approved = self.client.post(
            f"/api/v1/admin/co-construction/submissions/{created['public_id']}/approve",
            headers=self._headers(self.admin_token),
        )
        self.assertEqual(approved.status_code, 200)
        data = approved.get_json()["data"]
        self.assertEqual(data["status"], "approved")
        self.assertTrue(data["term_id"])
        self.assertEqual(Term.query.filter_by(preferred_name_zh="天下为公").count(), 1)
        self.assertEqual(AdminAuditLog.query.filter_by(action="submission.approve").count(), 1)

    def test_admin_rejects_submission_with_note(self):
        created = self.client.post(
            "/api/v1/co-construction/submissions",
            headers=self._headers(self.user_token),
            json=self._payload(),
        ).get_json()["data"]

        rejected = self.client.post(
            f"/api/v1/admin/co-construction/submissions/{created['public_id']}/reject",
            headers=self._headers(self.admin_token),
            json={"review_note": "来源不够明确"},
        )
        self.assertEqual(rejected.status_code, 200)
        self.assertEqual(rejected.get_json()["data"]["status"], "rejected")
        self.assertEqual(rejected.get_json()["data"]["review_note"], "来源不够明确")
        self.assertEqual(AdminAuditLog.query.filter_by(action="submission.reject").count(), 1)


if __name__ == "__main__":
    unittest.main()
