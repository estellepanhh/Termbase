from __future__ import annotations

from flask import current_app, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db
from ..models import User


DEMO_USERS = (
    ("user", "123456", "user", "普通用户"),
    ("admin", "123456", "admin", "管理员"),
)


def _serializer() -> URLSafeTimedSerializer:
    secret = current_app.config["AUTH_TOKEN_SECRET"]
    return URLSafeTimedSerializer(secret_key=secret, salt="termbase-auth")


def _user_payload(user: User) -> dict[str, str]:
    return {
        "username": user.username,
        "role": user.role,
        "display_name": user.display_name,
    }


def serialize_user(user: User) -> dict[str, str]:
    return _user_payload(user)


def seed_demo_users() -> None:
    changed = False
    for username, password, role, display_name in DEMO_USERS:
        user = User.query.filter_by(username=username).first()
        if user is None:
            db.session.add(
                User(
                    username=username,
                    password_hash=generate_password_hash(password),
                    role=role,
                    display_name=display_name,
                    is_active=True,
                )
            )
            changed = True
    if changed:
        db.session.commit()


def create_auth_token(user: User) -> str:
    return _serializer().dumps({"user_id": user.id})


def load_user_from_token(token: str) -> User | None:
    try:
        data = _serializer().loads(
            token,
            max_age=current_app.config["AUTH_TOKEN_MAX_AGE_SECONDS"],
        )
    except (BadSignature, SignatureExpired):
        return None
    user_id = data.get("user_id")
    if not isinstance(user_id, int):
        return None
    user = db.session.get(User, user_id)
    if user is None or not user.is_active:
        return None
    return user


def current_user_from_request() -> User | None:
    auth_header = request.headers.get("Authorization", "")
    prefix = "Bearer "
    if not auth_header.startswith(prefix):
        return None
    return load_user_from_token(auth_header.removeprefix(prefix).strip())


def require_admin():
    user = current_user_from_request()
    if user is None:
        return jsonify({"code": 401, "message": "请先登录"}), 401
    if user.role != "admin":
        return jsonify({"code": 403, "message": "需要管理员权限"}), 403
    return user


def authenticate(username: str, password: str) -> User | None:
    seed_demo_users()
    user = User.query.filter_by(username=username, is_active=True).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return None
    return user


def register_user(username: str, password: str, display_name: str = "") -> tuple[User | None, str | None]:
    seed_demo_users()
    username = username.strip()
    display_name = display_name.strip() or username
    if len(username) < 3 or len(username) > 30:
        return None, "账号至少 3 位，最多 30 位"
    if not username.replace("_", "").replace("-", "").isalnum():
        return None, "账号只能包含字母、数字、下划线或短横线"
    if len(password) < 6:
        return None, "密码至少 6 位"
    if User.query.filter_by(username=username).first() is not None:
        return None, "账号已存在"
    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role="user",
        display_name=display_name[:100],
        is_active=True,
    )
    db.session.add(user)
    db.session.commit()
    return user, None
