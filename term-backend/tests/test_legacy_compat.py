import unittest

from models import Base as LegacyBase, Term as LegacyTerm
from termbase_app import create_app
from termbase_app.extensions import db


class LegacyCompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
            "DEEPSEEK_API_KEY": "",
        })
        self.context = self.app.app_context()
        self.context.push()
        LegacyBase.metadata.create_all(db.engine)

    def tearDown(self):
        db.session.remove()
        LegacyBase.metadata.drop_all(db.engine)
        self.context.pop()

    def test_new_app_registers_required_transition_routes(self):
        rules = {rule.rule for rule in self.app.url_map.iter_rules()}

        self.assertTrue({
            "/api/term-list",
            "/api/search",
            "/api/huaihe/terms",
            "/api/huaihe/figures",
            "/api/huaihe/herbs",
            "/api/chat/stream",
        }.issubset(rules))

    def test_transition_routes_do_not_restore_legacy_writes(self):
        methods_by_rule = {
            rule.rule: rule.methods
            for rule in self.app.url_map.iter_rules()
        }

        self.assertNotIn("/api/import-excel", methods_by_rule)
        self.assertNotIn("/api/terms", methods_by_rule)
        self.assertNotIn("/api/terms/<int:term_id>", methods_by_rule)

    def test_term_list_preserves_legacy_response_shape(self):
        db.session.add(LegacyTerm(term_name="和而不同", official_en="harmony in diversity"))
        db.session.commit()

        response = self.app.test_client().get(
            "/api/term-list?page=1&pageSize=30"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "code": 200,
            "data": [{
                "id": 1,
                "术语名称": "和而不同",
                "术语层级": None,
                "文化分类": None,
                "场景分类": None,
                "筛选标签": None,
                "官方译法（英文）": "harmony in diversity",
                "官方译法（小语种）": None,
                "文化内涵": None,
                "来源": None,
                "儿童解释": None,
            }],
            "total": 1,
        })


if __name__ == "__main__":
    unittest.main()
