#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
backend_dir="$(cd -- "${script_dir}/.." && pwd)"
repo_dir="$(cd -- "${backend_dir}/.." && pwd)"
release_stamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${TERMBASE_BACKUP_DIR:-${HOME}/termbase-backups}"
backup_file="${backup_dir}/termbase-before-release-${release_stamp}.sql"

trap 'echo "CATALOG_RELEASE_FAILED line=${LINENO}"' ERR

cd "${repo_dir}"
export GIT_PAGER=cat
echo "release_commit=$(git rev-parse --short HEAD)"

test -f "${backend_dir}/.env"
dotenv_exports="$("${backend_dir}/venv/bin/python" - "${backend_dir}/.env" <<'PY'
import shlex
import sys

from dotenv import dotenv_values

allowed = {"DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"}
for key, value in dotenv_values(sys.argv[1]).items():
    if key in allowed and value is not None:
        print(f"export {key}={shlex.quote(value)}")
PY
)"
eval "${dotenv_exports}"
unset dotenv_exports

mkdir -p "${backup_dir}"
echo "backup=${backup_file}"
MYSQL_PWD="${DB_PASSWORD:-}" mysqldump \
  --host="${DB_HOST:-localhost}" \
  --user="${DB_USER:-root}" \
  --single-transaction \
  --quick \
  "${DB_NAME:-term_database}" > "${backup_file}"
test -s "${backup_file}"
grep -q -- "-- MySQL dump" "${backup_file}"

cd "${backend_dir}"
source venv/bin/activate
echo "=== preview ==="
python scripts/import_catalog_release.py
echo "=== apply ==="
python scripts/import_catalog_release.py --apply

echo "=== database verification ==="
python - <<'PY'
from sqlalchemy import func, select

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Term, TopicItem, Translation

app = create_app()
with app.app_context():
    terms = db.session.scalar(select(func.count(Term.id)))
    translations = db.session.scalar(select(func.count(Translation.id)))
    term_items = db.session.scalar(
        select(func.count(TopicItem.id)).where(TopicItem.entry_type == "term")
    )
    people = db.session.scalar(
        select(func.count(TopicItem.id)).where(TopicItem.entry_type == "person")
    )
    herbs = db.session.scalar(
        select(func.count(TopicItem.id)).where(TopicItem.entry_type == "herb")
    )
assert (terms, translations, term_items, people, herbs) == (835, 5010, 835, 21, 20), (
    terms, translations, term_items, people, herbs
)
print({
    "term_records": terms,
    "translations": translations,
    "term_topic_items": term_items,
    "people": people,
    "herbs": herbs,
})
PY

echo "=== public verification ==="
python - <<'PY'
import json
from urllib.request import urlopen

with urlopen("https://terms.estellepan.top/api/topics", timeout=20) as response:
    topics = json.load(response)["data"]
with urlopen("https://terms.estellepan.top/api/v1/terms?page=1&page_size=1", timeout=20) as response:
    terms = json.load(response)
with urlopen("https://terms.estellepan.top/api/topics/huaihe-culture", timeout=20) as response:
    huaihe = json.load(response)["data"]
assert len(topics) == 10, len(topics)
assert terms["meta"]["total"] == 828, terms["meta"]
assert huaihe["item_count"] == 179, huaihe["item_count"]
assert huaihe["entry_type_counts"] == {"herb": 20, "person": 21, "term": 138}, huaihe["entry_type_counts"]
print(json.dumps({
    "topics": len(topics),
    "canonical_terms": terms["meta"]["total"],
    "huaihe_items": huaihe["item_count"],
    "huaihe_types": huaihe["entry_type_counts"],
}, ensure_ascii=False))
PY

echo "CATALOG_RELEASE_SUCCESS"
