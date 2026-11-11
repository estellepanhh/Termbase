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
echo "release_commit=$(git rev-parse --short HEAD)"

set -a
# shellcheck disable=SC1091
source "${backend_dir}/.env"
set +a

mkdir -p "${backup_dir}"
echo "backup=${backup_file}"
MYSQL_PWD="${DB_PASSWORD:-}" mysqldump \
  --host="${DB_HOST:-localhost}" \
  --user="${DB_USER:-root}" \
  --single-transaction \
  --quick \
  "${DB_NAME:-term_database}" > "${backup_file}"
test -s "${backup_file}"

cd "${backend_dir}"
source venv/bin/activate
echo "=== preview ==="
python scripts/import_catalog_release.py
echo "=== apply ==="
python scripts/import_catalog_release.py --apply

echo "=== public verification ==="
python - <<'PY'
import json
from urllib.request import urlopen

with urlopen("https://terms.estellepan.top/api/topics", timeout=20) as response:
    topics = json.load(response)["data"]
with urlopen("https://terms.estellepan.top/api/topics/huaihe-culture", timeout=20) as response:
    huaihe = json.load(response)["data"]
assert len(topics) == 10, len(topics)
assert huaihe["item_count"] == 179, huaihe["item_count"]
assert huaihe["entry_type_counts"] == {"herb": 20, "person": 21, "term": 138}, huaihe["entry_type_counts"]
print(json.dumps({
    "topics": len(topics),
    "huaihe_items": huaihe["item_count"],
    "huaihe_types": huaihe["entry_type_counts"],
}, ensure_ascii=False))
PY

echo "CATALOG_RELEASE_SUCCESS"
