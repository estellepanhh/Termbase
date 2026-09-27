from flask import Blueprint, jsonify, request

from ..services.auth import (
    authenticate,
    create_auth_token,
    current_user_from_request,
    seed_demo_users,
    serialize_user,
)


bp = Blueprint("auth", __name__)


@bp.post("/api/v1/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    user = authenticate(username, password)
    if user is None:
        return jsonify({"code": 401, "message": "用户名或密码错误"}), 401
    return jsonify(
        {
            "code": 200,
            "data": {
                "token": create_auth_token(user),
                "user": serialize_user(user),
            },
        }
    )


@bp.get("/api/v1/auth/me")
def me():
    seed_demo_users()
    user = current_user_from_request()
    if user is None:
        return jsonify({"code": 401, "message": "请先登录"}), 401
    return jsonify({"code": 200, "data": serialize_user(user)})
