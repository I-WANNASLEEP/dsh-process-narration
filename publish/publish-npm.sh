#!/usr/bin/env bash
# 发布 dsh-process-narration 到 npm 官方源，并等国内镜像（npmmirror）自动同步。
#
# 前置：本机要有 npm 凭据（npm login，或 //registry.npmjs.org/:_authToken=... 写进 ~/.npmrc）
# 用法：bash publish/publish-npm.sh [--dry-run]
set -euo pipefail

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="$(node -p "require('${PKG_DIR}/package.json').name")"
VERSION="$(node -p "require('${PKG_DIR}/package.json').version")"
OFFICIAL="https://registry.npmjs.org"
MIRROR="https://registry.npmmirror.com"

say() { printf '\n== %s\n' "$1"; }

cd "${PKG_DIR}"

say "0/5 检查登录状态"
if ! npm whoami >/dev/null 2>&1; then
  cat <<'EOF'
未登录 npm。二选一：
  A) npm login                # 交互式，走 2FA
  B) echo '//registry.npmjs.org/:_authToken=<你的 token>' >> ~/.npmrc
做完再重跑本脚本。
EOF
  exit 1
fi
echo "已登录：$(npm whoami)"

say "1/5 预检包内容"
npm pack --dry-run 2>&1 | grep -E "^npm notice (name|version|total files|package size|unpacked size)" || true

if [[ "${1:-}" == "--dry-run" ]]; then
  say "dry-run 结束，未发布"
  exit 0
fi

say "2/5 发布到官方 registry：${NAME}@${VERSION}"
npm publish --access public --registry "${OFFICIAL}"

say "3/5 等官方 registry 可见"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${OFFICIAL}/${NAME}/${VERSION}" || true)
  echo "  官方 try $i: HTTP $code"
  [[ "$code" == "200" ]] && break
  sleep 4
done

say "4/5 等国内镜像同步（npmmirror 自动拉取，通常几分钟）"
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${MIRROR}/${NAME}" || true)
  echo "  镜像 try $i: HTTP $code"
  [[ "$code" == "200" ]] && break
  sleep 15
done

say "5/5 结果"
echo "官方：${OFFICIAL}/${NAME}/${VERSION}"
echo "镜像：${MIRROR}/${NAME}"
echo
echo "装包命令（不带前缀也能装了）："
echo "  dsh plugin --profile <profile> add ${NAME}"
