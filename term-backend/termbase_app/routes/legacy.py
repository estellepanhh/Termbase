import logging

from flask import Blueprint, jsonify, request
from sqlalchemy import and_, func, or_, select

from models import HuaiheFigure, HuaiheHerb, HuaiheTerm, Term

from ..extensions import db


bp = Blueprint("legacy", __name__)
logger = logging.getLogger(__name__)


def _paginate():
    page = max(1, int(request.args.get("page", 1)))
    page_size = min(100, max(1, int(request.args.get("pageSize", 30))))
    return page_size, (page - 1) * page_size


def _ok(data=None, total=None):
    response = {"code": 200}
    if data is not None:
        response["data"] = data
    if total is not None:
        response["total"] = total
    return jsonify(response)


def _service_error(operation):
    logger.exception("%s失败", operation)
    return jsonify({"code": 500, "msg": "服务暂时不可用"}), 500


@bp.get("/api/term-list")
def get_term_list():
    try:
        page_size, offset = _paginate()
        total = db.session.execute(select(func.count(Term.id))).scalar()
        terms = db.session.execute(
            select(Term).order_by(Term.id).offset(offset).limit(page_size)
        ).scalars().all()
        return _ok(data=[term.to_dict() for term in terms], total=total)
    except Exception:
        return _service_error("获取术语列表")


@bp.get("/api/search")
def search_terms():
    try:
        page_size, offset = _paginate()
        pattern = f"%{request.args.get('word', '')}%"
        statement = select(Term).where(Term.term_name.like(pattern))
        total = db.session.execute(
            select(func.count()).select_from(statement.subquery())
        ).scalar()
        terms = db.session.execute(
            statement.order_by(Term.id).offset(offset).limit(page_size)
        ).scalars().all()
        return _ok(data=[term.to_dict() for term in terms], total=total)
    except Exception:
        return _service_error("搜索术语")


@bp.get("/api/filter")
def filter_terms():
    try:
        page_size, offset = _paginate()
        conditions = []
        if request.args.get("culture", ""):
            conditions.append(Term.culture_category == request.args["culture"])
        if request.args.get("scene", ""):
            conditions.append(Term.scene_category == request.args["scene"])
        if request.args.get("level", ""):
            conditions.append(Term.term_level == request.args["level"])

        statement = select(Term)
        if conditions:
            statement = statement.where(and_(*conditions))
        total = db.session.execute(
            select(func.count()).select_from(statement.subquery())
        ).scalar()
        terms = db.session.execute(
            statement.order_by(Term.id).offset(offset).limit(page_size)
        ).scalars().all()
        return _ok(data=[term.to_dict() for term in terms], total=total)
    except Exception:
        return _service_error("筛选术语")


@bp.get("/api/huaihe/terms")
def get_huaihe_terms():
    try:
        page_size, offset = _paginate()
        total = db.session.execute(select(func.count(HuaiheTerm.id))).scalar()
        terms = db.session.execute(
            select(HuaiheTerm)
            .order_by(HuaiheTerm.id)
            .offset(offset)
            .limit(page_size)
        ).scalars().all()
        return _ok(data=[term.to_dict() for term in terms], total=total)
    except Exception:
        return _service_error("获取淮河术语")


@bp.get("/api/huaihe/terms/search")
def search_huaihe_terms():
    try:
        page_size, offset = _paginate()
        pattern = f"%{request.args.get('word', '')}%"
        statement = select(HuaiheTerm).where(or_(
            HuaiheTerm.term_name.like(pattern),
            HuaiheTerm.cultural_connotation.like(pattern),
        ))
        total = db.session.execute(
            select(func.count()).select_from(statement.subquery())
        ).scalar()
        terms = db.session.execute(
            statement.order_by(HuaiheTerm.id).offset(offset).limit(page_size)
        ).scalars().all()
        return _ok(data=[term.to_dict() for term in terms], total=total)
    except Exception:
        return _service_error("搜索淮河术语")


@bp.get("/api/huaihe/figures")
def get_huaihe_figures():
    try:
        figures = db.session.execute(select(HuaiheFigure)).scalars().all()
        return _ok(data=[figure.to_dict() for figure in figures])
    except Exception:
        return _service_error("获取淮河名人")


@bp.get("/api/huaihe/herbs")
def get_huaihe_herbs():
    try:
        page_size, offset = _paginate()
        total = db.session.execute(select(func.count(HuaiheHerb.id))).scalar()
        herbs = db.session.execute(
            select(HuaiheHerb)
            .order_by(HuaiheHerb.id)
            .offset(offset)
            .limit(page_size)
        ).scalars().all()
        return _ok(data=[herb.to_dict() for herb in herbs], total=total)
    except Exception:
        return _service_error("获取淮河中药材")


@bp.get("/api/huaihe/herbs/search")
def search_huaihe_herbs():
    try:
        page_size, offset = _paginate()
        pattern = f"%{request.args.get('word', '')}%"
        statement = select(HuaiheHerb).where(or_(
            HuaiheHerb.chinese_name.like(pattern),
            HuaiheHerb.tags.like(pattern),
            HuaiheHerb.latin_name.like(pattern),
            HuaiheHerb.official_en.like(pattern),
            HuaiheHerb.compliance_note.like(pattern),
            HuaiheHerb.applicable_scenario.like(pattern),
        ))
        total = db.session.execute(
            select(func.count()).select_from(statement.subquery())
        ).scalar()
        herbs = db.session.execute(
            statement.order_by(HuaiheHerb.id).offset(offset).limit(page_size)
        ).scalars().all()
        return _ok(data=[herb.to_dict() for herb in herbs], total=total)
    except Exception:
        return _service_error("搜索淮河中药材")
