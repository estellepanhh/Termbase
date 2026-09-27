import unittest

from termbase_app import create_app
from termbase_app.extensions import db


class AuthApiTests(unittest.TestCase):
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

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def test_login_returns_token_for_demo_admin(self):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "123456"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()["data"]
        self.assertTrue(payload["token"])
        self.assertEqual(payload["user"]["username"], "admin")
        self.assertEqual(payload["user"]["role"], "admin")

    def test_login_returns_token_for_demo_user(self):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": "user", "password": "123456"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()["data"]
        self.assertTrue(payload["token"])
        self.assertEqual(payload["user"]["username"], "user")
        self.assertEqual(payload["user"]["role"], "user")

    def test_login_rejects_wrong_password(self):
        response = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrong"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("用户名或密码错误", response.get_json()["message"])

    def test_me_returns_current_user_from_bearer_token(self):
        login = self.client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "123456"},
        )
        token = login.get_json()["data"]["token"]

        response = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"]["role"], "admin")

    def test_me_rejects_missing_token(self):
        response = self.client.get("/api/v1/auth/me")

        self.assertEqual(response.status_code, 401)
        self.assertIn("请先登录", response.get_json()["message"])


if __name__ == "__main__":
    unittest.main()
