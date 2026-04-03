#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Disk Manager UI — macOS Launcher
#  Usage: bash start.sh
# ─────────────────────────────────────────────────────────────────────────────

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RESET='\033[0m'; BOLD='\033[1m'

echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════╗${RESET}"
echo -e "${CYAN}  ║   🖥️  Disk Manager UI                 ║${RESET}"
echo -e "${CYAN}  ╚══════════════════════════════════════╝${RESET}"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${YELLOW}  ⚠️  Node.js chưa được cài đặt.${RESET}"
  echo -e "  Tải về tại: https://nodejs.org"
  echo ""
  exit 1
fi

NODE_VER=$(node --version)
echo -e "  ✓ Node.js ${NODE_VER} detected"

# Install dependencies nếu chưa có
if [ ! -d "$DIR/node_modules" ]; then
  echo -e "  📦 Cài đặt dependencies..."
  npm install --silent
  echo -e "  ${GREEN}✓ Dependencies đã cài xong${RESET}"
fi

echo -e "  ${GREEN}🚀 Khởi động server...${RESET}"
echo ""

# Kill port nếu đang dùng
lsof -ti:7788 | xargs kill -9 2>/dev/null

node server.js
