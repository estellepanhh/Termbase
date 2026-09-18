import unittest

from termbase_app import create_app


class AppFactoryTests(unittest.TestCase):
    def test_health_route_uses_test_database_without_mysql(self):
        app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        response = app.test_client().get("/api/v1/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "code": 200,
            "data": {"status": "ok"},
        })
