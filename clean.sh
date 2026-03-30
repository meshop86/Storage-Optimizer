#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  DiskCleaner — Phân tích & Dọn dẹp ổ hệ điều hành macOS
#  Run: bash clean.sh
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
SEP="────────────────────────────────────────────────────────"

hr() { echo -e "${CYAN}${SEP}${RESET}"; }
size() { du -sh "$1" 2>/dev/null | cut -f1; }
confirm() { read -r -p "$1 [y/N]: " r; [[ "$r" =~ ^[Yy]$ ]]; }

show_disk() {
  hr
  echo -e "${BOLD}💽 DISK USAGE${RESET}"
  hr
  df -h / /Volumes/Data 2>/dev/null | awk 'NR==1{print "  "$0} NR>1{
    split($5,a,"%"); pct=a[1]+0
    color="\033[0;32m"
    if(pct>=80) color="\033[0;31m"
    else if(pct>=60) color="\033[1;33m"
    printf "  %s%s\033[0m\n", color, $0
  }'
  hr
}

scan() {
  echo ""
  echo -e "${BOLD}🔍 PHÂN TÍCH CÁC THÀNH PHẦN LỚN TRÊN Ổ HỆ ĐIỀU HÀNH${RESET}"
  hr
  printf "  ${BOLD}%-42s %8s${RESET}\n" "Đường dẫn" "Kích thước"
  hr

  declare -A ITEMS
  declare -a ORDER

  add() {
    local label="$1" path="$2" action="$3"
    local s; s=$(size "$path")
    [[ -z "$s" || "$s" == "0B" ]] && return
    ITEMS["$label"]="$s|$path|$action"
    ORDER+=("$label")
  }

  # Xcode
  add "Xcode DerivedData"             "$HOME/Library/Developer/Xcode/DerivedData"          "delete"
  add "Xcode iOS DeviceSupport"       "$HOME/Library/Developer/Xcode/iOS DeviceSupport"     "move"
  add "Xcode Simulator Devices"       "$HOME/Library/Developer/CoreSimulator/Devices"       "info"

  # Caches
  add "Cache: Google"                 "$HOME/Library/Caches/Google"                         "delete"
  add "Cache: pip"                    "$HOME/Library/Caches/pip"                            "delete"
  add "Cache: Homebrew"               "$HOME/Library/Caches/Homebrew"                       "brew"
  add "Cache: CocoaPods"              "$HOME/Library/Caches/CocoaPods"                      "delete"
  add "Cache: ms-playwright"          "$HOME/Library/Caches/ms-playwright"                  "delete"
  add "Cache: com.openai.codex"       "$HOME/Library/Caches/com.openai.codex"               "delete"
  add "Cache: pnpm"                   "$HOME/Library/Caches/pnpm"                           "delete"
  add "Cache: node-gyp"               "$HOME/Library/Caches/node-gyp"                       "delete"
  add "Cache: go-build"               "$HOME/Library/Caches/go-build"                       "delete"
  add "Cache: electron"               "$HOME/Library/Caches/electron"                       "delete"

  # App Support
  add "VSCode extensions"             "$HOME/Library/Application Support/Code"              "move"
  add "Chrome data"                   "$HOME/Library/Application Support/Google/Chrome"     "move"
  add "Trae IDE"                      "$HOME/Library/Application Support/Trae"              "move"

  # Dev tools
  add "Gradle caches"                 "$HOME/.gradle/caches"                                "delete"
  add "npm cache"                     "$HOME/.npm"                                          "delete"
  add "cargo"                         "$HOME/.cargo"                                        "move"
  add "Homebrew"                      "/opt/homebrew"                                       "info"
  add "Downloads"                     "$HOME/Downloads"                                     "move"

  for label in "${ORDER[@]}"; do
    IFS='|' read -r s path action <<< "${ITEMS[$label]}"
    case "$action" in
      delete) icon="🗑️ " color="$RED" ;;
      move)   icon="📦 " color="$YELLOW" ;;
      brew)   icon="🍺 " color="$YELLOW" ;;
      *)      icon="ℹ️  " color="$RESET" ;;
    esac
    printf "  ${color}%-2s %-40s %8s${RESET}\n" "$icon" "$label" "$s"
  done
  hr
  echo -e "  ${RED}🗑️  = Có thể xóa an toàn${RESET}   ${YELLOW}📦 = Nên chuyển sang /Volumes/Data${RESET}"
  hr
}

menu_clean() {
  echo ""
  echo -e "${BOLD}🧹 DỌN DẸP NHANH${RESET}"
  hr
  echo "  1) Xóa Xcode DerivedData          ($(size "$HOME/Library/Developer/Xcode/DerivedData"))"
  echo "  2) Xóa Homebrew cache             ($(size "$HOME/Library/Caches/Homebrew"))"
  echo "  3) Xóa pip cache                  ($(size "$HOME/Library/Caches/pip"))"
  echo "  4) Xóa CocoaPods cache            ($(size "$HOME/Library/Caches/CocoaPods"))"
  echo "  5) Xóa Gradle caches              ($(size "$HOME/.gradle/caches"))"
  echo "  6) Xóa npm cache                  ($(size "$HOME/.npm"))"
  echo "  7) Xóa Google cache               ($(size "$HOME/Library/Caches/Google"))"
  echo "  8) Xóa Playwright cache           ($(size "$HOME/Library/Caches/ms-playwright"))"
  echo "  9) Xóa node-gyp cache             ($(size "$HOME/Library/Caches/node-gyp"))"
  echo " 10) Xóa OpenAI Codex cache         ($(size "$HOME/Library/Caches/com.openai.codex"))"
  echo " 11) Xóa tất cả ở trên (DỌN TỔNG)  ⚠️"
  echo "  0) Quay lại"
  hr
  read -r -p "  Chọn: " choice
  case $choice in
    1) do_delete "$HOME/Library/Developer/Xcode/DerivedData" "Xcode DerivedData" ;;
    2) do_brew_clean ;;
    3) do_delete "$HOME/Library/Caches/pip" "pip cache" ;;
    4) do_delete "$HOME/Library/Caches/CocoaPods" "CocoaPods cache" ;;
    5) do_delete "$HOME/.gradle/caches" "Gradle caches" ;;
    6) do_delete "$HOME/.npm" "npm cache" ;;
    7) do_delete "$HOME/Library/Caches/Google" "Google cache" ;;
    8) do_delete "$HOME/Library/Caches/ms-playwright" "Playwright cache" ;;
    9) do_delete "$HOME/Library/Caches/node-gyp" "node-gyp cache" ;;
   10) do_delete "$HOME/Library/Caches/com.openai.codex" "OpenAI Codex cache" ;;
   11) do_clean_all ;;
  esac
}

menu_move() {
  echo ""
  echo -e "${BOLD}📦 CHUYỂN SANG /Volumes/Data${RESET}"
  hr
  echo "  1) Xcode iOS DeviceSupport         ($(size "$HOME/Library/Developer/Xcode/iOS DeviceSupport"))"
  echo "  2) VSCode extensions               ($(size "$HOME/Library/Application Support/Code"))"
  echo "  3) cargo                           ($(size "$HOME/.cargo"))"
  echo "  4) Downloads folder                ($(size "$HOME/Downloads"))"
  echo "  0) Quay lại"
  hr
  read -r -p "  Chọn: " choice
  case $choice in
    1) do_move "$HOME/Library/Developer/Xcode/iOS DeviceSupport" "/Volumes/Data/.system-offload/xcode-device-support" ;;
    2) do_move "$HOME/Library/Application Support/Code" "/Volumes/Data/.system-offload/vscode" ;;
    3) do_move "$HOME/.cargo" "/Volumes/Data/.system-offload/cargo" ;;
    4) do_move "$HOME/Downloads" "/Volumes/Data/Downloads" ;;
  esac
}

do_delete() {
  local path="$1" label="$2"
  local s; s=$(size "$path")
  echo ""
  echo -e "  ${YELLOW}Sắp xóa: ${label} (${s})${RESET}"
  echo -e "  📁 $path"
  if confirm "  Xác nhận xóa?"; then
    rm -rf "$path" && echo -e "  ${GREEN}✅ Đã xóa ${label} (tiết kiệm ${s})${RESET}" || echo -e "  ${RED}❌ Lỗi khi xóa${RESET}"
  else
    echo "  Bỏ qua."
  fi
}

do_brew_clean() {
  echo ""
  echo -e "  ${YELLOW}Chạy: brew cleanup --prune=all${RESET}"
  if confirm "  Xác nhận?"; then
    brew cleanup --prune=all 2>&1 | tail -5
    echo -e "  ${GREEN}✅ Homebrew đã được dọn sạch${RESET}"
  fi
}

do_move() {
  local src="$1" dst="$2"
  local s; s=$(size "$src")
  echo ""
  echo -e "  ${YELLOW}Di chuyển: ${src} → ${dst} (${s})${RESET}"
  echo -e "  ⚠️  Sẽ tạo symlink để app vẫn hoạt động bình thường"
  if confirm "  Xác nhận?"; then
    mkdir -p "$(dirname "$dst")"
    if mv "$src" "$dst"; then
      ln -s "$dst" "$src"
      echo -e "  ${GREEN}✅ Đã chuyển và tạo symlink${RESET}"
    else
      echo -e "  ${RED}❌ Lỗi khi di chuyển${RESET}"
    fi
  fi
}

do_clean_all() {
  echo ""
  echo -e "  ${RED}⚠️  SẮP XÓA TẤT CẢ CACHE (có thể giải phóng 10-15GB)${RESET}"
  if confirm "  Xác nhận xóa tổng?"; then
    local total=0
    clean_one() {
      local p="$1"
      [[ -d "$p" ]] && rm -rf "$p" && echo -e "  ${GREEN}✅ Xóa: $p${RESET}"
    }
    clean_one "$HOME/Library/Developer/Xcode/DerivedData"
    clean_one "$HOME/Library/Caches/pip"
    clean_one "$HOME/Library/Caches/CocoaPods"
    clean_one "$HOME/.gradle/caches"
    clean_one "$HOME/.npm"
    clean_one "$HOME/Library/Caches/Google"
    clean_one "$HOME/Library/Caches/ms-playwright"
    clean_one "$HOME/Library/Caches/node-gyp"
    clean_one "$HOME/Library/Caches/com.openai.codex"
    clean_one "$HOME/Library/Caches/go-build"
    brew cleanup --prune=all > /dev/null 2>&1
    echo -e "  ${GREEN}✅ Homebrew cleaned${RESET}"
    echo ""
    show_disk
  fi
}

# ── MAIN LOOP ─────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}${CYAN}  ╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}  ║    🖥️  macOS Disk Cleaner Tool       ║${RESET}"
echo -e "${BOLD}${CYAN}  ╚══════════════════════════════════════╝${RESET}"
echo ""

while true; do
  show_disk
  echo ""
  echo -e "  ${BOLD}MENU CHÍNH${RESET}"
  hr
  echo "  1) 🔍 Phân tích chi tiết"
  echo "  2) 🧹 Dọn dẹp (xóa cache)"
  echo "  3) 📦 Chuyển thư mục sang ổ Data"
  echo "  0) ❌ Thoát"
  hr
  read -r -p "  Chọn: " main_choice
  case $main_choice in
    1) scan ;;
    2) menu_clean ;;
    3) menu_move ;;
    0) echo ""; echo -e "  ${GREEN}Bye! 👋${RESET}"; echo ""; exit 0 ;;
    *) echo "  Không hợp lệ." ;;
  esac
  echo ""
  read -r -p "  [Enter để tiếp tục...]"
  clear
done
