"""导入淮河名人数据（全量替换）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from models import HuaiheFigure, get_session

DATA_FILE = Path(__file__).parent.parent / 'data' / 'huaihe_figures.xlsx'

if not DATA_FILE.exists():
    print(f"错误：找不到 {DATA_FILE}")
    sys.exit(1)

df = pd.read_excel(str(DATA_FILE))
session = get_session()

try:
    session.query(HuaiheFigure).delete()
    session.flush()

    count = 0
    for _, row in df.iterrows():
        session.add(HuaiheFigure(
            name=str(row.get('人物', '')),
            baidu_link=str(row.get('百度链接', '')),
            category=str(row.get('分类', '')),
        ))
        count += 1

    session.commit()
    print(f"导入完成：{count} 条名人数据")
except Exception as e:
    session.rollback()
    print(f"导入失败：{e}")
    sys.exit(1)
finally:
    session.close()
