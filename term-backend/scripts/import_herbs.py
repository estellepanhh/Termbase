"""导入淮河中药材数据（全量替换）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from models import HuaiheHerb, get_session

DATA_FILE = Path(__file__).parent.parent / 'data' / 'huaihe_herbs.xlsx'

if not DATA_FILE.exists():
    print(f"错误：找不到 {DATA_FILE}")
    sys.exit(1)

df = pd.read_excel(str(DATA_FILE))
session = get_session()

try:
    session.query(HuaiheHerb).delete()
    session.flush()

    count = 0
    for _, row in df.iterrows():
        session.add(HuaiheHerb(
            code=str(row.get('术语编号', '')),
            chinese_name=str(row.get('中文品名', '')),
            term_level=str(row.get('术语层级', '')),
            culture_category=str(row.get('文化分类', '')),
            tags=str(row.get('筛选标签', '')),
            hs_code=str(row.get('海关 HS 编码', '')),
            latin_name=str(row.get('法定拉丁名（海关 / 药典通用）', '')),
            official_en=str(row.get('官方译法（英文）', '')),
            french=str(row.get('法语译法', '')),
            korean=str(row.get('韩语译法（韩国药典标准）', '')),
            vietnamese=str(row.get('越南语译法（东盟核心市场）', '')),
            japanese=str(row.get('日语译法（日本药局方标准）', '')),
            thai=str(row.get('泰语译法（东盟市场）', '')),
            malay=str(row.get('马来语译法（RCEP 市场）', '')),
            indonesian=str(row.get('印尼语译法（RCEP 核心市场）', '')),
            compliance_note=str(row.get('核心合规提示', '')),
            translation_risk=str(row.get('翻译雷区', '')),
            applicable_scenario=str(row.get('适用场景', '')),
        ))
        count += 1

    session.commit()
    print(f"导入完成：{count} 条淮河中药材")
except Exception as e:
    session.rollback()
    print(f"导入失败：{e}")
    sys.exit(1)
finally:
    session.close()
