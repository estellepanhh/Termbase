"""导入术语主表数据（全量替换）"""
import sys
from pathlib import Path

# 确保能 import models
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from models import Term, get_session

DATA_FILE = Path(__file__).parent.parent / 'data' / 'terms.xlsx'

if not DATA_FILE.exists():
    print(f"错误：找不到 {DATA_FILE}")
    sys.exit(1)

df = pd.read_excel(str(DATA_FILE))
session = get_session()

try:
    # 清空旧数据
    session.query(Term).delete()
    session.flush()

    count = 0
    for _, row in df.iterrows():
        session.add(Term(
            term_name=str(row.get('术语名称', '')),
            term_level=str(row.get('术语层级', '')),
            culture_category=str(row.get('文化分类', '')),
            scene_category=str(row.get('场景分类', '')),
            tags=str(row.get('筛选标签', '')),
            official_en=str(row.get('官方译法（英文）', '')),
            official_other=str(row.get('官方译法（小语种）', '')),
            cultural_connotation=str(row.get('文化内涵', '')),
            source=str(row.get('来源', '')),
            child_explain=str(row.get('儿童解释', '')),
        ))
        count += 1

    session.commit()
    print(f"导入完成：{count} 条术语")
except Exception as e:
    session.rollback()
    print(f"导入失败：{e}")
    sys.exit(1)
finally:
    session.close()
