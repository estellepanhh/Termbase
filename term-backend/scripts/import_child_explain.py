"""导入儿童解释（按术语名称匹配更新，不覆盖其他数据）"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from sqlalchemy import select
from models import Term, get_session

DATA_FILE = Path(__file__).parent.parent / 'data' / 'terms.xlsx'

if not DATA_FILE.exists():
    print(f"错误：找不到 {DATA_FILE}")
    sys.exit(1)

df = pd.read_excel(str(DATA_FILE))

required = ['术语名称', '儿童解释']
if not all(col in df.columns for col in required):
    print(f"Excel 必须包含列：{required}")
    print(f"实际列名：{df.columns.tolist()}")
    sys.exit(1)

session = get_session()

try:
    updated = 0
    for _, row in df.iterrows():
        term_name = row['术语名称']
        child_exp = row['儿童解释']
        if pd.isna(child_exp) or str(child_exp).strip() == '':
            continue

        term = session.execute(
            select(Term).where(Term.term_name == term_name)
        ).scalar()

        if term is None:
            print(f"警告：未找到术语 '{term_name}'，跳过")
        else:
            term.child_explain = str(child_exp)
            updated += 1

    session.commit()
    print(f"儿童解释导入完成：更新 {updated} 条")
except Exception as e:
    session.rollback()
    print(f"导入失败：{e}")
    sys.exit(1)
finally:
    session.close()
