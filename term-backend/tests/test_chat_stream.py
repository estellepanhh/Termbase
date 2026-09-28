import json
import unittest
from types import SimpleNamespace

from termbase_app import create_app
from termbase_app.extensions import db


class FakeCompletions:
    def __init__(self):
        self.request = None

    def create(self, **kwargs):
        self.request = kwargs
        return [
            SimpleNamespace(
                choices=[
                    SimpleNamespace(delta=SimpleNamespace(content="跨文化"))
                ]
            ),
            SimpleNamespace(
                choices=[SimpleNamespace(delta=SimpleNamespace(content="表达"))]
            ),
        ]


class FailingCompletions:
    def create(self, **kwargs):
        raise RuntimeError("provider-internal-details")


class ChatStreamTests(unittest.TestCase):
    def setUp(self):
        self.completions = FakeCompletions()
        self.client = SimpleNamespace(
            chat=SimpleNamespace(completions=self.completions)
        )
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "DEEPSEEK_CLIENT": self.client,
            "DEEPSEEK_MODEL": "configured-model",
            "AI_MAX_MESSAGE_CHARS": 20,
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.http = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def auth_header(self):
        response = self.http.post(
            "/api/v1/auth/login",
            json={"username": "user", "password": "123456"},
        )
        token = response.get_json()["data"]["token"]
        return {"Authorization": f"Bearer {token}"}

    def test_stream_uses_configured_deepseek_model_and_preserves_sse_contract(self):
        response = self.http.post(
            "/api/chat/stream",
            json={"message": "如何翻译和而不同？"},
            headers=self.auth_header(),
        )

        self.assertEqual(response.status_code, 200)
        events = [
            line.removeprefix("data: ")
            for line in response.get_data(as_text=True).splitlines()
            if line.startswith("data: ")
        ]
        self.assertEqual([json.loads(event) for event in events[:-1]], [
            {"content": "跨文化"},
            {"content": "表达"},
        ])
        self.assertEqual(events[-1], "[DONE]")
        self.assertEqual(self.completions.request["model"], "configured-model")
        self.assertTrue(self.completions.request["stream"])

    def test_stream_hides_provider_error_details_from_browser(self):
        client = SimpleNamespace(
            chat=SimpleNamespace(completions=FailingCompletions())
        )
        app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "DEEPSEEK_CLIENT": client,
        })
        with app.app_context():
            db.create_all()
            login = app.test_client().post(
                "/api/v1/auth/login",
                json={"username": "user", "password": "123456"},
            )
            token = login.get_json()["data"]["token"]
        with self.assertLogs("termbase_app.routes.ai", level="ERROR"):
            response = app.test_client().post(
                "/api/chat/stream",
                json={"message": "测试异常"},
                headers={"Authorization": f"Bearer {token}"},
            )

        body = response.get_data(as_text=True)
        self.assertNotIn("provider-internal-details", body)
        error_event = next(
            line.removeprefix("data: ")
            for line in body.splitlines()
            if line.startswith("data: {")
        )
        self.assertEqual(
            json.loads(error_event),
            {"error": "AI 服务暂时不可用"},
        )
        self.assertIn("data: [DONE]", body)

    def test_stream_requires_login(self):
        response = self.http.post(
            "/api/chat/stream",
            json={"message": "如何解释淮河文化？"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("请先登录", response.get_json()["msg"])

    def test_stream_rejects_overlong_message_before_provider_call(self):
        response = self.http.post(
            "/api/chat/stream",
            json={"message": "太长" * 20},
            headers=self.auth_header(),
        )

        self.assertEqual(response.status_code, 413)
        self.assertIn("过长", response.get_json()["msg"])
        self.assertIsNone(self.completions.request)

    def test_stream_rate_limit_can_be_configured(self):
        app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "DEEPSEEK_CLIENT": SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions())),
            "AI_CHAT_RATE_LIMIT": "1 per minute",
            "RATELIMIT_ENABLED": True,
        })
        with app.app_context():
            db.create_all()
            client = app.test_client()
            login = client.post(
                "/api/v1/auth/login",
                json={"username": "user", "password": "123456"},
            )
            token = login.get_json()["data"]["token"]
            headers = {"Authorization": f"Bearer {token}"}

            first = client.post("/api/chat/stream", json={"message": "第一次"}, headers=headers)
            first.get_data()
            second = client.post("/api/chat/stream", json={"message": "第二次"}, headers=headers)

            self.assertEqual(first.status_code, 200)
            self.assertEqual(second.status_code, 429)
            db.session.remove()
            db.drop_all()


if __name__ == "__main__":
    unittest.main()
