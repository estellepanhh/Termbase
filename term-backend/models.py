"""SQLAlchemy ORM 模型 —— 映射现有数据库表"""
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
import os

Base = declarative_base()


class Term(Base):
    """术语主表"""
    __tablename__ = 'terms'

    id = Column(Integer, primary_key=True, autoincrement=True)
    term_name = Column('术语名称', String(255), nullable=False)
    term_level = Column('术语层级', String(50))
    culture_category = Column('文化分类', String(100))
    scene_category = Column('场景分类', String(100))
    tags = Column('筛选标签', String(255))
    official_en = Column('官方译法（英文）', Text)
    official_other = Column('官方译法（小语种）', Text)
    cultural_connotation = Column('文化内涵', Text)
    source = Column('来源', String(255))
    child_explain = Column('儿童解释', Text)

    def to_dict(self) -> dict:
        """转为前端期望的 JSON 格式（中文 key）"""
        return {
            'id': self.id,
            '术语名称': self.term_name,
            '术语层级': self.term_level,
            '文化分类': self.culture_category,
            '场景分类': self.scene_category,
            '筛选标签': self.tags,
            '官方译法（英文）': self.official_en,
            '官方译法（小语种）': self.official_other,
            '文化内涵': self.cultural_connotation,
            '来源': self.source,
            '儿童解释': self.child_explain,
        }


class HuaiheTerm(Base):
    """淮河术语表"""
    __tablename__ = 'huaihe_terms'

    id = Column(Integer, primary_key=True, autoincrement=True)
    term_name = Column('术语名称', String(255))
    term_level = Column('术语层级', String(50))
    culture_category = Column('文化分类', String(100))
    scene_category = Column('场景分类', String(100))
    tags = Column('筛选标签', String(255))
    official_en = Column('官方译法（英文）', Text)
    official_other = Column('官方译法（小语种）', Text)
    cultural_connotation = Column('文化内涵', Text)
    source = Column('来源', String(255))
    child_explain = Column('儿童解释', Text)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            '术语名称': self.term_name,
            '术语层级': self.term_level,
            '文化分类': self.culture_category,
            '场景分类': self.scene_category,
            '筛选标签': self.tags,
            '官方译法（英文）': self.official_en,
            '官方译法（小语种）': self.official_other,
            '文化内涵': self.cultural_connotation,
            '来源': self.source,
            '儿童解释': self.child_explain,
        }


class HuaiheFigure(Base):
    """淮河名人表"""
    __tablename__ = 'huaihe_figures'

    # 此表无 id 列，以「人物」作为主键
    name = Column('人物', String(255), primary_key=True)
    baidu_link = Column('百度链接', String(500))
    category = Column('分类', String(100))

    def to_dict(self) -> dict:
        return {
            '人物': self.name,
            '百度链接': self.baidu_link,
            '分类': self.category,
        }


class HuaiheHerb(Base):
    """淮河中药材表"""
    __tablename__ = 'huaihe_herbs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column('术语编号', String(50))
    chinese_name = Column('中文品名', String(255))
    term_level = Column('术语层级', String(50))
    culture_category = Column('文化分类', String(100))
    tags = Column('筛选标签', String(255))
    hs_code = Column('海关 HS 编码', String(100))
    latin_name = Column('法定拉丁名（海关 / 药典通用）', Text)
    official_en = Column('官方译法（英文）', Text)
    french = Column('法语译法', Text)
    korean = Column('韩语译法（韩国药典标准）', Text)
    vietnamese = Column('越南语译法（东盟核心市场）', Text)
    japanese = Column('日语译法（日本药局方标准）', Text)
    thai = Column('泰语译法（东盟市场）', Text)
    malay = Column('马来语译法（RCEP 市场）', Text)
    indonesian = Column('印尼语译法（RCEP 核心市场）', Text)
    compliance_note = Column('核心合规提示', Text)
    translation_risk = Column('翻译雷区', Text)
    applicable_scenario = Column('适用场景', Text)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            '术语编号': self.code,
            '中文品名': self.chinese_name,
            '术语层级': self.term_level,
            '文化分类': self.culture_category,
            '筛选标签': self.tags,
            '海关 HS 编码': self.hs_code,
            '法定拉丁名（海关 / 药典通用）': self.latin_name,
            '官方译法（英文）': self.official_en,
            '法语译法': self.french,
            '韩语译法（韩国药典标准）': self.korean,
            '越南语译法（东盟核心市场）': self.vietnamese,
            '日语译法（日本药局方标准）': self.japanese,
            '泰语译法（东盟市场）': self.thai,
            '马来语译法（RCEP 市场）': self.malay,
            '印尼语译法（RCEP 核心市场）': self.indonesian,
            '核心合规提示': self.compliance_note,
            '翻译雷区': self.translation_risk,
            '适用场景': self.applicable_scenario,
        }


# ── 数据库连接 ──────────────────────────────────────────────
def _load_env():
    """加载 .env 中的数据库配置"""
    try:
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path(__file__).parent / '.env')
    except ImportError:
        pass


_load_env()

DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_NAME = os.environ.get('DB_NAME', 'term_database')

DB_URI = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'
engine = create_engine(DB_URI, pool_pre_ping=True)
SessionFactory = scoped_session(sessionmaker(bind=engine))


def get_session():
    """获取一个新的数据库 session"""
    return SessionFactory()
