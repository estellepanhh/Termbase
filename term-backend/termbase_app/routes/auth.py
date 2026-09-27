from flask import Blueprint, jsonify, request

from ..services.auth import (
    authenticate,
    create_auth_token,
    current_user_from_request,
    register_user,
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


@bp.post("/api/v1/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", ""))
    password = str(data.get("password", ""))
    display_name = str(data.get("display_name", ""))
    user, error = register_user(username, password, display_name)
    if error:
        status = 409 if error == "账号已存在" else 400
        return jsonify({"code": status, "message": error}), status
    assert user is not None
    return jsonify(
        {
            "code": 201,
            "data": {
                "token": create_auth_token(user),
                "user": serialize_user(user),
            },
        }
    ), 201


@bp.get("/api/v1/auth/me")
def me():
    seed_demo_users()
    user = current_user_from_request()
    if user is None:
        return jsonify({"code": 401, "message": "请先登录"}), 401
    return jsonify({"code": 200, "data": serialize_user(user)})
