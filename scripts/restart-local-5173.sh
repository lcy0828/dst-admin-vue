#!/bin/sh

set -eu

EXPECTED_BRANCH="feature/vue3-in-place"
SESSION_NAME="dst-admin-vue-5173"
TARGET_PANE="${SESSION_NAME}:0.0"
HOST="127.0.0.1"
PORT="5173"
LOG_FILE="/tmp/dst-admin-vue-v3-5173.log"

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
PROJECT_ROOT=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd -P)
CURRENT_BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current)

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "Refusing to restart ${PORT}: expected branch ${EXPECTED_BRANCH}, got ${CURRENT_BRANCH:-detached HEAD}." >&2
  exit 1
fi

for required_file in \
  "src/router/index.js" \
  "src/views/mods/ModList.vue" \
  "src/views/servers/CommandManager.vue"
do
  if [ ! -f "${PROJECT_ROOT}/${required_file}" ]; then
    echo "Refusing to restart ${PORT}: missing ${required_file}." >&2
    exit 1
  fi
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required to manage ${SESSION_NAME}." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1 || ! command -v lsof >/dev/null 2>&1; then
  echo "curl and lsof are required for the post-restart checks." >&2
  exit 1
fi

START_COMMAND="cd \"${PROJECT_ROOT}\" && exec npm run dev -- --host ${HOST} --port ${PORT} >>\"${LOG_FILE}\" 2>&1"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux respawn-pane -k -t "$TARGET_PANE" "$START_COMMAND"
else
  if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Refusing to start ${SESSION_NAME}: port ${PORT} is owned by another process." >&2
    exit 1
  fi
  tmux new-session -d -s "$SESSION_NAME" "$START_COMMAND"
fi

attempt=1
while [ "$attempt" -le 15 ]; do
  if curl -fsS --max-time 2 "http://${HOST}:${PORT}/" >/dev/null; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ "$attempt" -gt 15 ]; then
  echo "Frontend did not become ready on ${HOST}:${PORT}. See ${LOG_FILE}." >&2
  exit 1
fi

FRONTEND_PID=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN | head -n 1)
ACTUAL_ROOT=$(lsof -a -p "$FRONTEND_PID" -d cwd -Fn | sed -n 's/^n//p')

if [ "$ACTUAL_ROOT" != "$PROJECT_ROOT" ]; then
  echo "Frontend is listening from ${ACTUAL_ROOT}, expected ${PROJECT_ROOT}." >&2
  exit 1
fi

HEAD_REVISION=$(git -C "$PROJECT_ROOT" rev-parse --short=12 HEAD)
echo "Frontend ready: http://${HOST}:${PORT}"
echo "PID: ${FRONTEND_PID}"
echo "Root: ${PROJECT_ROOT}"
echo "Branch: ${CURRENT_BRANCH}"
echo "HEAD: ${HEAD_REVISION}"
