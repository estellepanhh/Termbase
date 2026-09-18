"""
中国特色话语多语术语库 — Flask 后端
使用 SQLAlchemy ORM 操作数据库
"""
import json
import os
import logging
from pathlib import Path

from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import pandas as pd
from openai import OpenAI
from sqlalchemy import select, func, and_, or_

from models import Term, HuaiheTerm, HuaiheFigure, HuaiheHerb, get_session

# ── 日志 ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)

# ── DeepSeek AI ─────────────────────────────────────────────
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_BASE_URL = os.environ.get(
    'DEEPSEEK_BASE_URL',
    'https://api.deepseek.com',
)
DEEPSEEK_MODEL = os.environ.get('DEEPSEEK_MODEL', 'deepseek-flash')

deepseek_client = None
if DEEPSEEK_API_KEY:
    deepseek_client = OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL,
    )
else:
    logger.warning("DeepSeek AI 未配置，/api/chat/stream 将不可用")

# ── Flask ───────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

DATA_DIR = Path(__file__).parent / 'data'


# ═══════════════════════════════════════════════════════════
# 辅助函数
# ═══════════════════════════════════════════════════════════

def paginate(req):
    """从请求中提取分页参数"""
    page = max(1, int(req.args.get('page', 1)))
    page_size = min(100, max(1, int(req.args.get('pageSize', 30))))
    offset = (page - 1) * page_size
    return page, page_size, offset


def ok(data=None, total=None):
    """成功响应"""
    resp = {"code": 200}
    if data is not None:
        resp["data"] = data
    if total is not None:
        resp["total"] = total
    return jsonify(resp)


def fail(msg, code=500):
    """失败响应"""
    logger.error("请求错误 [%d]: %s", code, msg)
    return jsonify({"code": code, "msg": str(msg)}), code


# ═══════════════════════════════════════════════════════════
# 术语 CRUD
# ═══════════════════════════════════════════════════════════

@app.route('/api/term-list')
def get_term_list():
    """获取所有术语（分页）"""
    session = get_session()
    try:
        page, page_size, offset = paginate(request)
        total = session.execute(
            select(func.count(Term.id))
        ).scalar()
        terms = session.execute(
            select(Term).order_by(Term.id).offset(offset).limit(page_size)
        ).scalars().all()
        return ok(data=[t.to_dict() for t in terms], total=total)
    except Exception as e:
        logger.exception("获取术语列表失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/search')
def search_terms():
    """搜索术语（分页）"""
    word = request.args.get("word", "")
    page, page_size, offset = paginate(request)
    session = get_session()
    try:
        pattern = f"%{word}%"
        stmt = select(Term).where(Term.term_name.like(pattern))
        total = session.execute(
            select(func.count()).select_from(stmt.subquery())
        ).scalar()
        terms = session.execute(
            stmt.order_by(Term.id).offset(offset).limit(page_size)
        ).scalars().all()
        return ok(data=[t.to_dict() for t in terms], total=total)
    except Exception as e:
        logger.exception("搜索术语失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/filter')
def filter_terms():
    """多条件筛选术语（分页）"""
    culture = request.args.get('culture', '')
    scene = request.args.get('scene', '')
    level = request.args.get('level', '')
    page, page_size, offset = paginate(request)

    session = get_session()
    try:
        conditions = []
        if culture:
            conditions.append(Term.culture_category == culture)
        if scene:
            conditions.append(Term.scene_category == scene)
        if level:
            conditions.append(Term.term_level == level)

        stmt = select(Term)
        if conditions:
            stmt = stmt.where(and_(*conditions))

        total = session.execute(
            select(func.count()).select_from(stmt.subquery())
        ).scalar()
        terms = session.execute(
            stmt.order_by(Term.id).offset(offset).limit(page_size)
        ).scalars().all()
        return ok(data=[t.to_dict() for t in terms], total=total)
    except Exception as e:
        logger.exception("筛选术语失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/import-excel', methods=['POST'])
def import_excel():
    """从 Excel 导入术语（保留 pandas 仅用于读取 Excel 文件）"""
    session = get_session()
    try:
        file_path = DATA_DIR / 'terms.xlsx'
        if not file_path.exists():
            return fail(f"文件不存在: {file_path}", 400)

        df = pd.read_excel(str(file_path))

        # 清空旧数据，写入新数据
        session.execute(select(Term))  # noop
        session.query(Term).delete()
        session.flush()

        for _, row in df.iterrows():
            term = Term(
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
            )
            session.add(term)

        session.commit()
        logger.info("Excel 导入成功，共 %d 条", len(df))
        return ok(data={"count": len(df)})
    except Exception as e:
        session.rollback()
        logger.exception("Excel 导入失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/terms', methods=['POST'])
def add_term():
    """添加术语"""
    session = get_session()
    try:
        data = request.json or {}
        term = Term(
            term_name=data.get('术语名称', ''),
            term_level=data.get('术语层级', ''),
            culture_category=data.get('文化分类', ''),
            scene_category=data.get('场景分类', ''),
            tags=data.get('筛选标签', ''),
            official_en=data.get('官方译法（英文）',
                                data.get('官方译法英文', '')),
            official_other=data.get('官方译法（小语种）',
                                    data.get('官方译法小语种', '')),
            cultural_connotation=data.get('文化内涵', ''),
            source=data.get('来源', ''),
        )
        session.add(term)
        session.commit()
        return ok(data={"msg": "添加成功"})
    except Exception as e:
        session.rollback()
        logger.exception("添加术语失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/terms/<int:term_id>', methods=['PUT'])
def update_term(term_id):
    """更新术语"""
    session = get_session()
    try:
        data = request.json or {}
        term = session.get(Term, term_id)
        if term is None:
            return fail("术语不存在", 404)

        term.term_name = data.get('术语名称', term.term_name)
        term.term_level = data.get('术语层级', term.term_level)
        term.culture_category = data.get('文化分类', term.culture_category)
        term.scene_category = data.get('场景分类', term.scene_category)
        term.tags = data.get('筛选标签', term.tags)
        term.official_en = data.get(
            '官方译法（英文）',
            data.get('官方译法英文', term.official_en),
        )
        term.official_other = data.get(
            '官方译法（小语种）',
            data.get('官方译法小语种', term.official_other),
        )
        term.cultural_connotation = data.get(
            '文化内涵', term.cultural_connotation,
        )
        term.source = data.get('来源', term.source)

        session.commit()
        return ok(data={"msg": "更新成功"})
    except Exception as e:
        session.rollback()
        logger.exception("更新术语失败 id=%s", term_id)
        return fail(e)
    finally:
        session.close()


@app.route('/api/terms/<int:term_id>', methods=['DELETE'])
def delete_term(term_id):
    """删除术语"""
    session = get_session()
    try:
        term = session.get(Term, term_id)
        if term is None:
            return fail("术语不存在", 404)
        session.delete(term)
        session.commit()
        return ok(data={"msg": "删除成功"})
    except Exception as e:
        session.rollback()
        logger.exception("删除术语失败 id=%s", term_id)
        return fail(e)
    finally:
        session.close()


# ═══════════════════════════════════════════════════════════
# AI 对话
# ═══════════════════════════════════════════════════════════

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """DeepSeek AI 流式对话"""
    if deepseek_client is None:
        return fail("AI 服务未配置", 503)

    data = request.json or {}
    user_message = data.get('message', '').strip()
    if not user_message:
        return fail("消息不能为空", 400)

    def generate():
        try:
            completion = deepseek_client.chat.completions.create(
                model=DEEPSEEK_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是中华文化术语库的AI助手，请用通俗易懂、"
                            "简洁的语言回答关于中华文化、术语、历史等方面的问题。"
                        ),
                    },
                    {"role": "user", "content": user_message},
                ],
                stream=True,
                temperature=0.7,
            )
            for chunk in completion:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': content})}\n\n"
        except Exception:
            logger.exception("AI 流式对话出错")
            yield f"data: {json.dumps({'error': 'AI 服务暂时不可用'})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
    )


# ═══════════════════════════════════════════════════════════
# 淮河文化
# ═══════════════════════════════════════════════════════════

@app.route('/api/huaihe/terms')
def get_huaihe_terms():
    """获取淮河术语列表（分页）"""
    session = get_session()
    try:
        page, page_size, offset = paginate(request)
        total = session.execute(
            select(func.count(HuaiheTerm.id))
        ).scalar()
        terms = session.execute(
            select(HuaiheTerm)
            .order_by(HuaiheTerm.id)
            .offset(offset)
            .limit(page_size)
        ).scalars().all()
        return ok(data=[t.to_dict() for t in terms], total=total)
    except Exception as e:
        logger.exception("获取淮河术语失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/huaihe/terms/search')
def search_huaihe_terms():
    """搜索淮河术语（分页）"""
    word = request.args.get("word", "")
    page, page_size, offset = paginate(request)
    session = get_session()
    try:
        pattern = f"%{word}%"
        stmt = select(HuaiheTerm).where(
            or_(
                HuaiheTerm.term_name.like(pattern),
                HuaiheTerm.cultural_connotation.like(pattern),
            )
        )
        total = session.execute(
            select(func.count()).select_from(stmt.subquery())
        ).scalar()
        terms = session.execute(
            stmt.order_by(HuaiheTerm.id).offset(offset).limit(page_size)
        ).scalars().all()
        return ok(data=[t.to_dict() for t in terms], total=total)
    except Exception as e:
        logger.exception("搜索淮河术语失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/huaihe/figures')
def get_huaihe_figures():
    """获取淮河名人列表"""
    session = get_session()
    try:
        figures = session.execute(
            select(HuaiheFigure)
        ).scalars().all()
        return ok(data=[f.to_dict() for f in figures])
    except Exception as e:
        logger.exception("获取淮河名人失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/huaihe/herbs')
def get_huaihe_herbs():
    """获取淮河中药材列表（分页）"""
    session = get_session()
    try:
        page, page_size, offset = paginate(request)
        total = session.execute(
            select(func.count(HuaiheHerb.id))
        ).scalar()
        herbs = session.execute(
            select(HuaiheHerb)
            .order_by(HuaiheHerb.id)
            .offset(offset)
            .limit(page_size)
        ).scalars().all()
        return ok(data=[h.to_dict() for h in herbs], total=total)
    except Exception as e:
        logger.exception("获取淮河中药材失败")
        return fail(e)
    finally:
        session.close()


@app.route('/api/huaihe/herbs/search')
def search_huaihe_herbs():
    """搜索淮河中药材（分页）"""
    word = request.args.get("word", "")
    page, page_size, offset = paginate(request)
    session = get_session()
    try:
        pattern = f"%{word}%"
        stmt = select(HuaiheHerb).where(
            or_(
                HuaiheHerb.chinese_name.like(pattern),
                HuaiheHerb.tags.like(pattern),
                HuaiheHerb.latin_name.like(pattern),
                HuaiheHerb.official_en.like(pattern),
                HuaiheHerb.compliance_note.like(pattern),
                HuaiheHerb.applicable_scenario.like(pattern),
            )
        )
        total = session.execute(
            select(func.count()).select_from(stmt.subquery())
        ).scalar()
        herbs = session.execute(
            stmt.order_by(HuaiheHerb.id).offset(offset).limit(page_size)
        ).scalars().all()
        return ok(data=[h.to_dict() for h in herbs], total=total)
    except Exception as e:
        logger.exception("搜索淮河中药材失败")
        return fail(e)
    finally:
        session.close()


# ═══════════════════════════════════════════════════════════
# 启动
# ═══════════════════════════════════════════════════════════

if __name__ == '__main__':
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    logger.info("术语库后端启动: %s:%d (debug=%s)", host, port, debug)
    app.run(host=host, port=port, debug=debug)
