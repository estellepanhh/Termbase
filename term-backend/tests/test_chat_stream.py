import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import app as app_module


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
        self.http = app_module.app.test_client()

    def test_stream_uses_configured_deepseek_model_and_preserves_sse_contract(self):
        with (
            patch.object(
                app_module, "deepseek_client", self.client, create=True
            ),
            patch.object(
                app_module, "DEEPSEEK_MODEL", "configured-model", create=True
            ),
        ):
            response = self.http.post(
                "/api/chat/stream",
                json={"message": "如何翻译和而不同？"},
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
        with self.assertLogs(app_module.logger, level="ERROR"):
            with patch.object(app_module, "deepseek_client", client):
                response = self.http.post(
                    "/api/chat/stream",
                    json={"message": "测试异常"},
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


if __name__ == "__main__":
    unittest.main()
