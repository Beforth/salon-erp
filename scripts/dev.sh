#!/usr/bin/env bash
# Salon ERP — local development runner (backend + frontend + docker infra)
#
# Usage:
#   ./scripts/dev.sh start              Start postgres/redis + backend + frontend
#   ./scripts/dev.sh stop               Stop app processes and docker infra
#   ./scripts/dev.sh restart            Restart backend + frontend (keeps infra up)
#   ./scripts/dev.sh restart backend    Restart backend only
#   ./scripts/dev.sh restart frontend   Restart frontend only
#   ./scripts/dev.sh restart infra      Restart postgres + redis
#   ./scripts/dev.sh status             Show what is running
#   ./scripts/dev.sh logs               Tail all logs
#   ./scripts/dev.sh logs backend       Tail backend log only
#
# Options (environment variables):
#   BACKEND_MODE=local|docker   Backend runtime (default: local nodemon)
#   POSTGRES_HOST_PORT=5434       Host port for postgres (default: 5434)
#   REDIS_HOST_PORT=6380          Host port for redis (default: 6380)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/salon-erp-be"
PID_DIR="$ROOT_DIR/.dev/pids"
LOG_DIR="$ROOT_DIR/.dev/logs"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

BACKEND_MODE="${BACKEND_MODE:-local}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5434}"
REDIS_HOST_PORT="${REDIS_HOST_PORT:-6380}"

BACKEND_URL="http://localhost:5001"
FRONTEND_URL="http://localhost:5173"

mkdir -p "$PID_DIR" "$LOG_DIR"

# ── helpers ──────────────────────────────────────────────────────────────────

color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }
info()  { echo "$(color '0;36' '→') $*"; }
ok()    { echo "$(color '0;32' '✓') $*"; }
warn()  { echo "$(color '0;33' '!') $*" >&2; }
err()   { echo "$(color '0;31' '✗') $*" >&2; }

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local file="$1"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

stop_pid_file() {
  local name="$1"
  local file="$2"
  local pid
  pid="$(read_pid "$file")"

  if is_running "$pid"; then
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 1 20); do
      is_running "$pid" || break
      sleep 0.25
    done
    if is_running "$pid"; then
      kill -9 "$pid" 2>/dev/null || true
    fi
    ok "Stopped $name (pid $pid)"
  elif [[ -n "$pid" ]]; then
    warn "$name pid file stale (pid $pid)"
  fi

  rm -f "$file"
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local tries="${3:-40}"

  for _ in $(seq 1 "$tries"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      ok "$label ready — $url"
      return 0
    fi
    sleep 0.5
  done

  warn "$label did not respond at $url (may still be starting — check logs)"
  return 1
}

load_backend_env() {
  if [[ -f "$BACKEND_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$BACKEND_DIR/.env"
    set +a
  fi

  # Build DATABASE_URL from POSTGRES_* (handles special chars in password).
  local built_url
  built_url="$(
    POSTGRES_HOST_PORT="$POSTGRES_HOST_PORT" node -e "
      require('dotenv').config({ path: process.argv[1] });
      const enc = encodeURIComponent;
      const port = process.env.POSTGRES_HOST_PORT || '5434';
      const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
      if (POSTGRES_USER && POSTGRES_PASSWORD && POSTGRES_DB) {
        process.stdout.write(
          'postgresql://' + enc(POSTGRES_USER) + ':' + enc(POSTGRES_PASSWORD) +
          '@localhost:' + port + '/' + POSTGRES_DB + '?schema=public'
        );
      }
    " "$BACKEND_DIR/.env" 2>/dev/null || true
  )"
  if [[ -n "$built_url" ]]; then
    export DATABASE_URL="$built_url"
  elif [[ "${DATABASE_URL:-}" == *"@postgres:"* ]]; then
    export DATABASE_URL="${DATABASE_URL/@postgres:5432/@localhost:${POSTGRES_HOST_PORT}}"
  elif [[ "${DATABASE_URL:-}" == *"@localhost:5432"* ]]; then
    export DATABASE_URL="${DATABASE_URL/@localhost:5432/@localhost:${POSTGRES_HOST_PORT}}"
  fi

  if [[ "${REDIS_HOST:-}" == "redis" ]]; then
    export REDIS_HOST="localhost"
    export REDIS_PORT="${REDIS_HOST_PORT}"
  elif [[ "${REDIS_HOST:-localhost}" == "localhost" && "${REDIS_PORT:-6379}" == "6379" ]]; then
    export REDIS_PORT="${REDIS_HOST_PORT}"
  fi
  export PORT="${PORT:-5001}"
  export NODE_ENV="${NODE_ENV:-development}"
}

ensure_node_modules() {
  local dir="$1"
  local label="$2"
  if [[ ! -d "$dir/node_modules" ]]; then
    warn "$label: node_modules missing — running npm install…"
    (cd "$dir" && npm install)
    ok "$label dependencies installed"
  fi
}

ensure_backend_ready() {
  ensure_node_modules "$BACKEND_DIR" "Backend"
  if [[ ! -f "$BACKEND_DIR/node_modules/.prisma/client/index.js" ]] \
    || grep -q 'did not initialize yet' "$BACKEND_DIR/node_modules/.prisma/client/default.js" 2>/dev/null; then
    info "Generating Prisma client…"
    (cd "$BACKEND_DIR" && npx prisma generate)
    ok "Prisma client ready"
  fi
}

apply_pending_migrations() {
  if [[ "$BACKEND_MODE" == "docker" ]]; then
    if docker ps --format '{{.Names}}' | grep -qx 'salon-erp-backend'; then
      info "Syncing database schema (docker backend)…"
      if docker_compose exec -T backend npx prisma db push >>"$LOG_DIR/migrate.log" 2>&1; then
        ok "Database schema up to date"
      else
        warn "prisma db push failed — see $LOG_DIR/migrate.log"
      fi
    fi
    return
  fi

  ensure_backend_ready
  load_backend_env
  if [[ -z "${DATABASE_URL:-}" ]]; then
    warn "DATABASE_URL not set — skipping db push"
    return
  fi

  info "Syncing database schema…"
  if (cd "$BACKEND_DIR" && npx prisma db push >>"$LOG_DIR/migrate.log" 2>&1); then
    ok "Database schema up to date"
  else
    warn "prisma db push failed — see $LOG_DIR/migrate.log"
  fi
}

docker_compose() {
  (cd "$BACKEND_DIR" && docker compose "$@")
}

# ── infra ───────────────────────────────────────────────────────────────────

start_infra() {
  info "Starting postgres + redis (docker)…"
  docker_compose up -d postgres redis

  info "Waiting for postgres on port $POSTGRES_HOST_PORT…"
  for _ in $(seq 1 60); do
    if docker_compose exec -T postgres pg_isready -U "${POSTGRES_USER:-salon_erp}" -d "${POSTGRES_DB:-salon_erp}" >/dev/null 2>&1; then
      ok "Postgres healthy (localhost:$POSTGRES_HOST_PORT)"
      return 0
    fi
    sleep 1
  done
  err "Postgres failed to become healthy"
  exit 1
}

stop_infra() {
  info "Stopping postgres + redis…"
  docker_compose stop postgres redis >/dev/null 2>&1 || true
  ok "Docker infra stopped"
}

restart_infra() {
  info "Restarting postgres + redis…"
  docker_compose restart postgres redis
  ok "Docker infra restarted"
}

# ── backend ───────────────────────────────────────────────────────────────────

stop_docker_backend() {
  if docker ps --format '{{.Names}}' | grep -qx 'salon-erp-backend'; then
    info "Stopping docker backend (freeing port 5001 for local dev)…"
    docker stop salon-erp-backend >/dev/null
    ok "Docker backend stopped"
  fi
}

start_backend_local() {
  stop_docker_backend
  ensure_backend_ready

  if is_running "$(read_pid "$BACKEND_PID_FILE")"; then
    warn "Backend already running (pid $(read_pid "$BACKEND_PID_FILE"))"
    return 0
  fi

  info "Starting backend (nodemon)…"
  load_backend_env

  (
    cd "$BACKEND_DIR"
    nohup env \
      DATABASE_URL="$DATABASE_URL" \
      REDIS_HOST="${REDIS_HOST:-localhost}" \
      REDIS_PORT="${REDIS_PORT:-$REDIS_HOST_PORT}" \
      PORT="$PORT" \
      NODE_ENV="$NODE_ENV" \
      npm run dev >>"$LOG_DIR/backend.log" 2>&1 &
    echo $! >"$BACKEND_PID_FILE"
  )

  wait_for_url "$BACKEND_URL/health" "Backend" || true
}

start_backend_docker() {
  stop_pid_file "backend (local)" "$BACKEND_PID_FILE"

  info "Starting backend (docker)…"
  docker_compose up -d backend
  wait_for_url "$BACKEND_URL/health" "Backend (docker)" || true
}

stop_backend_local() {
  stop_pid_file "backend" "$BACKEND_PID_FILE"
}

stop_backend_docker() {
  if docker ps --format '{{.Names}}' | grep -qx 'salon-erp-backend'; then
    docker stop salon-erp-backend >/dev/null
    ok "Stopped backend (docker)"
  fi
}

start_backend() {
  if [[ "$BACKEND_MODE" == "docker" ]]; then
    start_backend_docker
  else
    start_backend_local
  fi
}

stop_backend() {
  stop_backend_local
  if [[ "$BACKEND_MODE" == "docker" ]]; then
    stop_backend_docker
  fi
}

restart_backend() {
  stop_backend_local
  if [[ "$BACKEND_MODE" == "docker" ]]; then
    stop_backend_docker
    start_backend_docker
  else
    start_backend_local
  fi
}

# ── frontend ────────────────────────────────────────────────────────────────

start_frontend() {
  ensure_node_modules "$ROOT_DIR" "Frontend"

  if is_running "$(read_pid "$FRONTEND_PID_FILE")"; then
    warn "Frontend already running (pid $(read_pid "$FRONTEND_PID_FILE"))"
    return 0
  fi

  info "Starting frontend (vite)…"

  (
    cd "$ROOT_DIR"
    nohup npm run dev >>"$LOG_DIR/frontend.log" 2>&1 &
    echo $! >"$FRONTEND_PID_FILE"
  )

  wait_for_url "$FRONTEND_URL" "Frontend" || true
}

stop_frontend() {
  stop_pid_file "frontend" "$FRONTEND_PID_FILE"
}

restart_frontend() {
  stop_frontend
  start_frontend
}

# ── commands ──────────────────────────────────────────────────────────────────

cmd_start() {
  echo ""
  echo "Salon ERP dev — starting (backend mode: $BACKEND_MODE)"
  echo "  Frontend → $FRONTEND_URL"
  echo "  Backend  → $BACKEND_URL"
  echo "  Logs     → $LOG_DIR"
  echo ""

  start_infra
  apply_pending_migrations
  start_backend
  start_frontend

  echo ""
  ok "Dev stack running"
  echo "  ./scripts/dev.sh status   — check processes"
  echo "  ./scripts/dev.sh logs     — tail logs"
  echo "  ./scripts/dev.sh restart  — restart apps"
  echo "  ./scripts/dev.sh stop     — shut everything down"
  echo ""
}

cmd_stop() {
  info "Stopping dev stack…"
  stop_frontend
  stop_backend
  stop_infra
  ok "Dev stack stopped"
}

cmd_restart() {
  local target="${1:-all}"
  case "$target" in
    all)
      stop_frontend
      stop_backend_local
      start_backend
      start_frontend
      ok "Restarted backend + frontend"
      ;;
    backend)
      restart_backend
      ok "Restarted backend"
      ;;
    frontend)
      restart_frontend
      ok "Restarted frontend"
      ;;
    infra)
      restart_infra
      ;;
    *)
      err "Unknown restart target: $target (use all|backend|frontend|infra)"
      exit 1
      ;;
  esac
}

cmd_status() {
  local be_pid fe_pid
  be_pid="$(read_pid "$BACKEND_PID_FILE")"
  fe_pid="$(read_pid "$FRONTEND_PID_FILE")"

  echo ""
  echo "Salon ERP dev status"
  echo "────────────────────"

  if docker ps --format '{{.Names}}' | grep -qx 'salon-erp-postgres'; then
    ok "Postgres   running (localhost:$POSTGRES_HOST_PORT)"
  else
    warn "Postgres   stopped"
  fi

  if docker ps --format '{{.Names}}' | grep -qx 'salon-erp-redis'; then
    ok "Redis      running (localhost:$REDIS_HOST_PORT)"
  else
    warn "Redis      stopped"
  fi

  if [[ "$BACKEND_MODE" == "docker" ]] && docker ps --format '{{.Names}}' | grep -qx 'salon-erp-backend'; then
    ok "Backend    docker → $BACKEND_URL"
  elif is_running "$be_pid"; then
    ok "Backend    local pid $be_pid → $BACKEND_URL"
  elif docker ps --format '{{.Names}}' | grep -qx 'salon-erp-backend'; then
    ok "Backend    docker → $BACKEND_URL"
  else
    warn "Backend    stopped"
  fi

  if is_running "$fe_pid"; then
    ok "Frontend   pid $fe_pid → $FRONTEND_URL"
  else
    warn "Frontend   stopped"
  fi

  echo ""
  echo "Logs: $LOG_DIR/{backend,frontend}.log"
  echo ""
}

cmd_logs() {
  local target="${1:-all}"
  case "$target" in
    all)
      tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
      ;;
    backend|be)
      tail -f "$LOG_DIR/backend.log"
      ;;
    frontend|fe)
      tail -f "$LOG_DIR/frontend.log"
      ;;
    *)
      err "Unknown logs target: $target (use all|backend|frontend)"
      exit 1
      ;;
  esac
}

cmd_help() {
  sed -n '2,18p' "$0" | sed 's/^# \?//'
  echo ""
  echo "Environment:"
  echo "  BACKEND_MODE=local|docker   default: local (nodemon with hot reload)"
  echo "  POSTGRES_HOST_PORT=5434"
  echo "  REDIS_HOST_PORT=6380"
}

# ── main ─────────────────────────────────────────────────────────────────────

main() {
  local cmd="${1:-help}"
  shift || true

  case "$cmd" in
    start)   cmd_start "$@" ;;
    stop)    cmd_stop "$@" ;;
    restart) cmd_restart "$@" ;;
    status)  cmd_status "$@" ;;
    logs)    cmd_logs "$@" ;;
    help|-h|--help) cmd_help ;;
    *)
      err "Unknown command: $cmd"
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
