// ─────────────────────────────────────────────────────────────────────────────
//  Disk Manager UI — Cross-Platform (macOS & Windows)
//  Run: node server.js
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const app = express();
const PORT = process.env.PORT || 7788;
const HOME = os.homedir();
const IS_WIN = process.platform === "win32";
const IS_MAC = process.platform === "darwin";

// Windows special dirs
const LOCALAPPDATA = process.env.LOCALAPPDATA || "";
const APPDATA      = process.env.APPDATA || "";
const TEMP         = process.env.TEMP || process.env.TMP || "";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── CATALOG ─────────────────────────────────────────────────────────────────

const CATALOG_MAC = [
  // ── XCODE ──
  {
    id: "xcode-derived",
    label: "Xcode DerivedData",
    path: `${HOME}/Library/Developer/Xcode/DerivedData`,
    action: "delete", category: "xcode", icon: "⚒️", safetyLevel: "safe",
    title: "Build artifacts tự động của Xcode",
    description: "Chứa toàn bộ kết quả biên dịch (compiled objects, indexes, build logs) từ mọi project Xcode. Được tái tạo hoàn toàn tự động mỗi lần Build.",
    consequence: "Xcode sẽ rebuild từ đầu — mất thêm 2–5 phút lần đầu. Không ảnh hưởng code, không mất dữ liệu.",
    tip: "Nên xóa sau mỗi sprint hoặc khi ổ đầy. Xóa định kỳ 1 tháng/lần.",
  },
  {
    id: "xcode-device-support",
    label: "Xcode iOS DeviceSupport",
    path: `${HOME}/Library/Developer/Xcode/iOS DeviceSupport`,
    action: "move", category: "xcode", icon: "📱", safetyLevel: "movable",
    title: "Debug symbols cho từng phiên bản iOS",
    description: "Xcode tải ~5–10 GB symbol file cho từng phiên bản iOS lần đầu kết nối thiết bị. Nhiều iPhone/iPad dễ vượt 20–30 GB.",
    consequence: "Chuyển sang /Volumes/Data với symlink → Xcode không biết sự khác biệt, vẫn debug bình thường.",
    tip: "Ứng cử viên số 1 để chuyển sang ổ Data. Có thể tiết kiệm 10–30 GB.",
    moveTarget: "/Volumes/Data/.system-offload/xcode-device-support",
  },
  {
    id: "xcode-simulators",
    label: "Xcode Simulator Devices",
    path: `${HOME}/Library/Developer/CoreSimulator/Devices`,
    action: "info", category: "xcode", icon: "🖥️", safetyLevel: "caution",
    title: "Máy ảo iOS Simulator đã tạo",
    description: "Mỗi Simulator là thiết bị ảo hoàn chỉnh gồm hệ thống iOS và dữ liệu app. Mỗi simulator chiếm 4–10 GB. Thường có hàng chục loại.",
    consequence: "Không nên xóa toàn bộ. Dùng Xcode → Devices & Simulators để xóa từng loại không cần.",
    tip: "Xóa simulator iOS cũ (< iOS 16) để tiết kiệm đáng kể.",
    manageCmd: "open -a Xcode",
  },
  // ── CACHE ──
  {
    id: "cache-pip",
    label: "Cache: pip (Python)",
    path: `${HOME}/Library/Caches/pip`,
    action: "delete", category: "cache", icon: "🐍", safetyLevel: "safe",
    title: "Cache tải packages Python",
    description: "pip lưu tạm các wheel file đã tải để tái dùng khi reinstall. Không chứa môi trường Python/venv nào đang dùng.",
    consequence: "pip install lần sau tải lại từ PyPI. Mọi venv hiện tại không bị ảnh hưởng.",
    tip: "An toàn xóa bất cứ lúc nào.",
  },
  {
    id: "cache-homebrew",
    label: "Cache: Homebrew",
    path: `${HOME}/Library/Caches/Homebrew`,
    action: "brew", category: "cache", icon: "🍺", safetyLevel: "safe",
    title: "File cài đặt Homebrew đã tải",
    description: "Homebrew lưu package archive sau khi cài để rollback nhanh. Upgrade cũng để lại bản cũ. Qua nhiều năm có thể lên 5–15 GB.",
    consequence: "brew cleanup an toàn — giữ lại phiên bản đang dùng, chỉ xóa bản cũ.",
    tip: "Dùng `brew cleanup --prune=all` thay vì xóa thủ công.",
  },
  {
    id: "cache-cocoapods",
    label: "Cache: CocoaPods",
    path: `${HOME}/Library/Caches/CocoaPods`,
    action: "delete", category: "cache", icon: "🍫", safetyLevel: "safe",
    title: "Cache download của iOS dependency manager",
    description: "CocoaPods lưu source code các pod đã tải để `pod install` nhanh hơn. Tương tự npm cache cho Swift/Obj-C.",
    consequence: "`pod install` lần sau tải lại pod từ GitHub/CDN. Chậm hơn 1–2 phút. Project không bị ảnh hưởng.",
    tip: "Nếu thường xuyên pod install, cache giúp tăng tốc. Xóa khi cần dọn.",
  },
  {
    id: "cache-google",
    label: "Cache: Google Chrome",
    path: `${HOME}/Library/Caches/Google`,
    action: "delete", category: "cache", icon: "🌐", safetyLevel: "safe",
    title: "Cache trang web của Chrome",
    description: "Chrome lưu tạm HTML, CSS, JS, hình ảnh từ các trang đã truy cập để tải nhanh lần sau.",
    consequence: "Trang web tải chậm hơn một chút lần đầu. Cookies và mật khẩu không bị ảnh hưởng.",
    tip: "Cache không chứa tài khoản/mật khẩu — an toàn xóa hoàn toàn.",
  },
  {
    id: "cache-playwright",
    label: "Cache: Playwright Browsers",
    path: `${HOME}/Library/Caches/ms-playwright`,
    action: "delete", category: "cache", icon: "🎭", safetyLevel: "safe",
    title: "Trình duyệt headless cho automated testing",
    description: "Playwright tải và lưu Chromium, Firefox, WebKit riêng. Mỗi browser ~400–800 MB, tổng dễ vượt 3–5 GB.",
    consequence: "Nếu dùng Playwright: `npx playwright install` để tải lại. Nếu không dùng: xóa hoàn toàn an toàn.",
    tip: "Kiểm tra project có dùng Playwright không trước khi xóa.",
  },
  {
    id: "cache-openai",
    label: "Cache: OpenAI Codex",
    path: `${HOME}/Library/Caches/com.openai.codex`,
    action: "delete", category: "cache", icon: "🤖", safetyLevel: "safe",
    title: "Cache của OpenAI Codex CLI",
    description: "Tạo bởi OpenAI Codex CLI. Thường nhỏ nhưng tích lũy theo thời gian.",
    consequence: "Không ảnh hưởng gì. Tool AI tạo lại cache khi cần.",
    tip: "An toàn xóa bất cứ lúc nào.",
  },
  {
    id: "cache-pnpm",
    label: "Cache: pnpm",
    path: `${HOME}/Library/Caches/pnpm`,
    action: "delete", category: "cache", icon: "📦", safetyLevel: "safe",
    title: "Content-addressable store của pnpm",
    description: "pnpm lưu packages theo content hash để chia sẻ giữa các projects. Cache download này riêng biệt với store chính.",
    consequence: "pnpm install lần sau tải lại từ registry. Projects hiện tại không bị ảnh hưởng.",
    tip: "pnpm store chính thường ở ~/.pnpm-store — không xóa nhầm.",
  },
  {
    id: "cache-node-gyp",
    label: "Cache: node-gyp",
    path: `${HOME}/Library/Caches/node-gyp`,
    action: "delete", category: "cache", icon: "⚙️", safetyLevel: "safe",
    title: "Node.js header files cho native addons",
    description: "node-gyp lưu header files (.h) của từng phiên bản Node.js để compile native C++ addons (bcrypt, sharp...). Tự tải lại khi cần.",
    consequence: "Compile native addons lần sau tải lại headers. Code đang chạy không bị ảnh hưởng.",
    tip: "Hay đổi Node version → cache to. An toàn xóa.",
  },
  {
    id: "cache-go-build",
    label: "Cache: Go build",
    path: `${HOME}/Library/Caches/go-build`,
    action: "delete", category: "cache", icon: "🦫", safetyLevel: "safe",
    title: "Build cache incremental của Go compiler",
    description: "Go compiler lưu kết quả biên dịch trung gian để rebuild nhanh hơn. Tương tự DerivedData của Xcode nhưng cho Go.",
    consequence: "`go build` lần sau rebuild từ đầu — chậm hơn. Binary đã build không bị ảnh hưởng.",
    tip: "Không code Go thường xuyên → xóa an toàn.",
  },
  {
    id: "cache-electron",
    label: "Cache: Electron",
    path: `${HOME}/Library/Caches/electron`,
    action: "delete", category: "cache", icon: "⚡", safetyLevel: "safe",
    title: "Cached binaries của Electron framework",
    description: "Electron cache binaries cho từng version khi build apps. Mỗi version ~80–150 MB.",
    consequence: "Electron tải lại khi build app. Apps đang cài đặt không bị ảnh hưởng.",
    tip: "Không develop Electron apps → xóa hoàn toàn an toàn.",
  },
  // ── DEV TOOLS ──
  {
    id: "npm-cache",
    label: "npm cache",
    path: `${HOME}/.npm`,
    action: "delete", category: "dev", icon: "📦", safetyLevel: "safe",
    title: "Cache download packages npm",
    description: "npm lưu tạm package tarballs đã tải từ registry. Không chứa node_modules của project nào.",
    consequence: "`npm install` tải lại từ registry. node_modules hiện tại không bị ảnh hưởng.",
    tip: "An toàn xóa bất cứ lúc nào.",
  },
  {
    id: "gradle-caches",
    label: "Gradle caches",
    path: `${HOME}/.gradle/caches`,
    action: "delete", category: "dev", icon: "🐘", safetyLevel: "safe",
    title: "Build cache Android/Java của Gradle",
    description: "Gradle lưu dependencies (JAR, AAR), compiled classes, build metadata. Mỗi Android project có thể thêm vài GB.",
    consequence: "Gradle build lần sau tải lại dependencies và rebuild. Project code không bị ảnh hưởng.",
    tip: "Không phát triển Android/Java → xóa an toàn.",
  },
  {
    id: "cargo",
    label: "Rust cargo",
    path: `${HOME}/.cargo`,
    action: "move", category: "dev", icon: "🦀", safetyLevel: "movable",
    title: "Rust toolchain, binaries và registry",
    description: "Chứa toàn bộ Rust: compiler (rustc), cargo, rustfmt, clippy, registry crates. Rất khó tái tạo nếu xóa.",
    consequence: "Chuyển sang /Volumes/Data với symlink là cách an toàn nhất. Tất cả tools vẫn hoạt động 100%.",
    tip: "KHÔNG xóa — chỉ chuyển sang ổ Data.",
    moveTarget: "/Volumes/Data/.system-offload/cargo",
  },
  {
    id: "homebrew",
    label: "Homebrew",
    path: "/opt/homebrew",
    action: "info", category: "dev", icon: "🍺", safetyLevel: "caution",
    title: "Package manager chính của macOS",
    description: "Chứa tất cả packages brew: git, node, python, ffmpeg... Nặng nhưng KHÔNG NÊN xóa hay chuyển.",
    consequence: "Xóa sẽ mất toàn bộ packages. Dùng `brew cleanup` để dọn cache thay thế.",
    tip: "Quản lý bằng `brew cleanup`, `brew autoremove`, `brew uninstall`.",
    manageCmd: "brew cleanup --prune=all && brew autoremove",
  },
  // ── APP DATA ──
  {
    id: "vscode-data",
    label: "VSCode extensions & data",
    path: `${HOME}/Library/Application Support/Code`,
    action: "move", category: "app", icon: "💻", safetyLevel: "movable",
    title: "Extensions, settings và workspace data của VS Code",
    description: "Chứa tất cả extensions (Copilot, Python, ESLint...), user settings, workspace state. Extensions có thể chiếm 2–8 GB.",
    consequence: "Chuyển sang /Volumes/Data với symlink → VS Code không biết sự khác biệt.",
    tip: "Symlink là giải pháp hoàn hảo — VS Code vẫn dùng đường dẫn cũ.",
    moveTarget: "/Volumes/Data/.system-offload/vscode",
  },
  {
    id: "chrome-data",
    label: "Chrome data",
    path: `${HOME}/Library/Application Support/Google/Chrome`,
    action: "move", category: "app", icon: "🌐", safetyLevel: "movable",
    title: "Profile, extensions và data của Chrome",
    description: "Chứa profiles, bookmarks, saved passwords, extensions, history, cookies. Có thể lên 5–10 GB.",
    consequence: "Chuyển với symlink → Chrome tiếp tục hoạt động bình thường.",
    tip: "Đóng Chrome hoàn toàn trước khi chuyển để tránh lỗi.",
    moveTarget: "/Volumes/Data/.system-offload/chrome",
  },
  {
    id: "downloads",
    label: "Downloads folder",
    path: `${HOME}/Downloads`,
    action: "move", category: "personal", icon: "📥", safetyLevel: "review",
    title: "Thư mục tải về của bạn",
    description: "Thường chứa installer cũ (.dmg, .pkg), file zip, PDF, video. Dễ tích lũy 10–50 GB theo năm.",
    consequence: "Chuyển sang /Volumes/Data/Downloads với symlink — Finder vẫn mở Downloads bình thường.",
    tip: "Xem xét dọn thủ công trước. Giữ file cần, xóa installers/archives cũ.",
    moveTarget: "/Volumes/Data/Downloads",
  },
  // ── iTUNES / FINDER iOS ──
  {
    id: "itunes-backup-mac",
    label: "iTunes / Finder iOS Backup",
    path: `${HOME}/Library/Application Support/MobileSync/Backup`,
    action: "delete", category: "mobile", icon: "📱", safetyLevel: "caution",
    title: "Bản sao lưu iPhone/iPad qua iTunes hoặc Finder",
    description: "Mỗi lần backup iPhone/iPad qua dây cáp, macOS lưu toàn bộ dữ liệu thiết bị vào đây. Một backup có thể chiếm 5–50 GB, nhiều thiết bị hoặc nhiều phiên bản tích lũy rất nhanh. Thư mục này thường bị ẩn và ít người biết.",
    consequence: "Xóa sẽ mất toàn bộ backup cục bộ. Nếu đã bật iCloud Backup, dữ liệu vẫn an toàn trên cloud. Nếu chưa có iCloud Backup, KHÔNG XÓA cho đến khi đã backup lên nơi khác.",
    tip: "Kiểm tra iCloud Backup trong Cài đặt iPhone trước. Nếu có iCloud Backup → an toàn xóa backup cục bộ.",
  },
  {
    id: "itunes-firmware-mac",
    label: "iTunes iOS Firmware (IPSW)",
    path: `${HOME}/Library/iTunes/iPhone Software Updates`,
    action: "delete", category: "mobile", icon: "💿", safetyLevel: "safe",
    title: "File firmware iOS/iPadOS đã tải qua iTunes",
    description: "iTunes lưu file IPSW (firmware iOS toàn vẹn) sau khi update thiết bị. Mỗi file IPSW nặng 5–8 GB. Sau khi update xong, file này không còn cần thiết nhưng iTunes không tự xóa.",
    consequence: "Xóa an toàn 100% sau khi đã update xong. Nếu cần restore lại iOS, iTunes sẽ tải lại firmware mới.",
    tip: "Hay bị bỏ quên — kiểm tra ngay. Thường ẩn trong ~/Library. Tiết kiệm 5–20 GB dễ dàng.",
  },
  {
    id: "ios-device-logs-mac",
    label: "iOS Device Crash Logs",
    path: `${HOME}/Library/Logs/CrashReporter/MobileDevice`,
    action: "delete", category: "mobile", icon: "📋", safetyLevel: "safe",
    title: "Log crash của iPhone/iPad đồng bộ qua iTunes",
    description: "Mỗi lần kết nối iPhone/iPad, macOS sao chép toàn bộ crash logs từ thiết bị. Theo thời gian có thể lên vài GB với hàng nghìn file log nhỏ.",
    consequence: "Xóa hoàn toàn an toàn. Chỉ là log cũ — không ảnh hưởng thiết bị hay ứng dụng.",
    tip: "An toàn xóa bất cứ lúc nào. iOS tự tạo lại log mới khi cần.",
  },
];

const CATALOG_WIN = [
  // ── SYSTEM TEMP ──
  {
    id: "win-temp",
    label: "Windows Temp (%TEMP%)",
    path: TEMP,
    action: "delete", category: "system", icon: "🗂️", safetyLevel: "safe",
    title: "File tạm của Windows và các ứng dụng",
    description: "Windows và ứng dụng tạo file tạm trong quá trình cài đặt, cập nhật, vận hành. Đây là thư mục chứa rác nhiều nhất trên Windows.",
    consequence: "Windows tự tạo lại khi cần. Có thể có file đang dùng — sẽ bỏ qua tự động.",
    tip: "An toàn xóa. Nên làm định kỳ mỗi tháng. Có thể giải phóng 1–10 GB.",
  },
  {
    id: "win-prefetch",
    label: "Windows Prefetch",
    path: "C:\\Windows\\Prefetch",
    action: "delete", category: "system", icon: "⚡", safetyLevel: "safe",
    title: "Dữ liệu tăng tốc khởi động ứng dụng",
    description: "Windows ghi lại pattern khởi động app để lần sau load nhanh hơn. Thư mục này tích lũy qua thời gian nhưng không cần thiết.",
    consequence: "Các app khởi động chậm hơn một chút lần đầu. Windows tự tạo lại prefetch data.",
    tip: "Cần quyền Administrator. An toàn xóa trên Windows 10/11.",
  },
  {
    id: "win-update-cache",
    label: "Windows Update Cache",
    path: "C:\\Windows\\SoftwareDistribution\\Download",
    action: "delete", category: "system", icon: "🪟", safetyLevel: "safe",
    title: "File cài đặt Windows Update đã tải",
    description: "Windows Update tải bản vá và cập nhật về đây trước khi cài. Sau khi cài xong, files này không còn cần thiết nhưng không tự xóa.",
    consequence: "Update tiếp theo sẽ tải lại nếu cần. Không ảnh hưởng đến các update đã cài.",
    tip: "Cần quyền Administrator. Có thể tiết kiệm 2–10 GB. Dừng Windows Update service trước khi xóa.",
  },
  {
    id: "win-recycle-bin",
    label: "Recycle Bin",
    path: "C:\\$Recycle.Bin",
    action: "recycle", category: "system", icon: "🗑️", safetyLevel: "safe",
    title: "Thùng rác Windows",
    description: "Chứa các file đã xóa nhưng chưa xóa vĩnh viễn. Không chiếm dụng dung lượng trên ổ ngay lập tức nhưng tích lũy theo thời gian.",
    consequence: "File bị xóa vĩnh viễn — không thể khôi phục.",
    tip: "Chỉ dọn khi chắc chắn không cần phục hồi file nào.",
  },
  // ── CACHE ──
  {
    id: "cache-pip-win",
    label: "Cache: pip (Python)",
    path: `${LOCALAPPDATA}\\pip\\Cache`,
    action: "delete", category: "cache", icon: "🐍", safetyLevel: "safe",
    title: "Cache tải packages Python",
    description: "pip lưu tạm wheel files đã tải để tái dùng khi reinstall. Không chứa môi trường Python/venv nào.",
    consequence: "pip install lần sau tải lại từ PyPI. Mọi venv hiện tại không bị ảnh hưởng.",
    tip: "An toàn xóa bất cứ lúc nào.",
  },
  {
    id: "cache-npm-win",
    label: "npm cache",
    path: `${LOCALAPPDATA}\\npm-cache`,
    action: "delete", category: "cache", icon: "📦", safetyLevel: "safe",
    title: "Cache download packages npm",
    description: "npm lưu tạm package tarballs đã tải từ registry. Không chứa node_modules của project nào.",
    consequence: "`npm install` tải lại từ registry. node_modules hiện tại không bị ảnh hưởng.",
    tip: "An toàn xóa. npm tự tạo lại cache khi cần.",
  },
  {
    id: "cache-pnpm-win",
    label: "Cache: pnpm",
    path: `${LOCALAPPDATA}\\pnpm-cache`,
    action: "delete", category: "cache", icon: "📦", safetyLevel: "safe",
    title: "Cache download của pnpm",
    description: "pnpm lưu package cache để cài đặt nhanh hơn giữa các projects. Riêng biệt với pnpm store chính.",
    consequence: "pnpm install lần sau tải lại. Projects hiện tại không bị ảnh hưởng.",
    tip: "pnpm store chính ở AppData\\Local\\pnpm\\store — không xóa nhầm.",
  },
  {
    id: "cache-yarn-win",
    label: "Cache: Yarn",
    path: `${LOCALAPPDATA}\\Yarn\\Cache`,
    action: "delete", category: "cache", icon: "🧶", safetyLevel: "safe",
    title: "Cache download của Yarn package manager",
    description: "Yarn lưu package archives để cài đặt offline và nhanh hơn.",
    consequence: "Yarn install lần sau tải lại từ registry. Projects hiện tại không bị ảnh hưởng.",
    tip: "An toàn xóa. Yarn tạo lại khi cần.",
  },
  {
    id: "cache-playwright-win",
    label: "Cache: Playwright Browsers",
    path: `${LOCALAPPDATA}\\ms-playwright`,
    action: "delete", category: "cache", icon: "🎭", safetyLevel: "safe",
    title: "Trình duyệt headless cho automated testing",
    description: "Playwright tải và lưu Chromium, Firefox, WebKit riêng. Mỗi browser ~400–800 MB, tổng dễ vượt 3–5 GB.",
    consequence: "Nếu dùng Playwright: `npx playwright install` để tải lại. Nếu không: xóa hoàn toàn an toàn.",
    tip: "Kiểm tra project có dùng Playwright không trước khi xóa.",
  },
  {
    id: "cache-nuget",
    label: "Cache: NuGet (.NET)",
    path: `${LOCALAPPDATA}\\NuGet\\Cache`,
    action: "delete", category: "cache", icon: "🔷", safetyLevel: "safe",
    title: "Cache packages .NET / NuGet",
    description: "NuGet lưu tạm packages đã tải cho Visual Studio và .NET projects. Tích lũy theo thời gian với nhiều phiên bản.",
    consequence: "dotnet restore tải lại packages. Build lần đầu sau khi xóa sẽ chậm hơn.",
    tip: "An toàn xóa nếu không làm .NET thường xuyên.",
  },
  {
    id: "cache-node-gyp-win",
    label: "Cache: node-gyp",
    path: `${LOCALAPPDATA}\\node-gyp`,
    action: "delete", category: "cache", icon: "⚙️", safetyLevel: "safe",
    title: "Node.js header files cho native addons",
    description: "node-gyp lưu header files (.h) của từng phiên bản Node.js để compile native C++ addons.",
    consequence: "Compile native addons lần sau tải lại headers. Code đang chạy không bị ảnh hưởng.",
    tip: "An toàn xóa.",
  },
  {
    id: "cache-electron-win",
    label: "Cache: Electron",
    path: `${LOCALAPPDATA}\\electron`,
    action: "delete", category: "cache", icon: "⚡", safetyLevel: "safe",
    title: "Cached binaries của Electron framework",
    description: "Electron cache binaries cho từng version khi build apps. Mỗi version ~80–150 MB.",
    consequence: "Electron tải lại khi build app. Apps đang cài không bị ảnh hưởng.",
    tip: "Không develop Electron apps → xóa hoàn toàn an toàn.",
  },
  {
    id: "cache-chrome-win",
    label: "Cache: Google Chrome",
    path: `${LOCALAPPDATA}\\Google\\Chrome\\User Data\\Default\\Cache`,
    action: "delete", category: "cache", icon: "🌐", safetyLevel: "safe",
    title: "Cache trang web của Chrome",
    description: "Chrome lưu tạm HTML, CSS, JS, hình ảnh từ các trang đã truy cập để tải nhanh hơn.",
    consequence: "Trang web tải chậm hơn một chút lần đầu. Cookies và mật khẩu không bị ảnh hưởng.",
    tip: "Chỉ xóa Cache — không xóa toàn bộ User Data (sẽ mất tài khoản/mật khẩu).",
  },
  {
    id: "cache-edge-win",
    label: "Cache: Microsoft Edge",
    path: `${LOCALAPPDATA}\\Microsoft\\Edge\\User Data\\Default\\Cache`,
    action: "delete", category: "cache", icon: "🌀", safetyLevel: "safe",
    title: "Cache trang web của Microsoft Edge",
    description: "Edge lưu tạm assets trang web để tải nhanh hơn. Tương tự Chrome cache.",
    consequence: "Trang tải chậm hơn một chút lần đầu. Cookies và mật khẩu an toàn.",
    tip: "An toàn xóa. Edge tạo lại cache tự động.",
  },
  // ── DEV TOOLS ──
  {
    id: "gradle-caches-win",
    label: "Gradle caches",
    path: `${HOME}\\.gradle\\caches`,
    action: "delete", category: "dev", icon: "🐘", safetyLevel: "safe",
    title: "Build cache Android/Java của Gradle",
    description: "Gradle lưu dependencies (JAR, AAR), compiled classes. Mỗi Android project có thể thêm vài GB.",
    consequence: "Gradle build lần sau tải lại dependencies. Project code không bị ảnh hưởng.",
    tip: "Không làm Android/Java → xóa an toàn.",
  },
  {
    id: "maven-repo-win",
    label: "Maven local repository",
    path: `${HOME}\\.m2\\repository`,
    action: "delete", category: "dev", icon: "☕", safetyLevel: "safe",
    title: "Local repo của Apache Maven (Java)",
    description: "Maven lưu tất cả JARs đã tải về local repository. Tích lũy qua nhiều dự án Java có thể lên 5–15 GB.",
    consequence: "Maven build lần sau tải lại từ Maven Central. Build đầu tiên chậm hơn. Code không bị ảnh hưởng.",
    tip: "Nếu nhiều dự án Java → cân nhắc trước khi xóa.",
  },
  {
    id: "cargo-win",
    label: "Rust cargo",
    path: `${HOME}\\.cargo`,
    action: "delete", category: "dev", icon: "🦀", safetyLevel: "caution",
    title: "Rust toolchain, binaries và registry",
    description: "Chứa toàn bộ Rust: compiler (rustc), cargo, rustfmt, clippy, registry crates. Rất khó tái tạo nếu xóa nhầm.",
    consequence: "Cần reinstall Rust hoàn toàn nếu xóa. Chỉ xóa thư mục con `registry` và `git` để tiết kiệm.",
    tip: "THẬN TRỌNG — Đây là toàn bộ Rust installation. Nên xóa từng phần: ~/.cargo/registry",
  },
  {
    id: "vscode-data-win",
    label: "VSCode extensions",
    path: `${HOME}\\.vscode\\extensions`,
    action: "delete", category: "app", icon: "💻", safetyLevel: "caution",
    title: "Extensions cài trong VS Code",
    description: "Mỗi extension chiếm vài MB đến vài trăm MB. Copilot, Python, Java extensions thường nặng nhất.",
    consequence: "Cần cài lại extensions. Settings và workspace data không bị ảnh hưởng.",
    tip: "Chỉ xóa nếu muốn reset extensions. VS Code có thể sync lại từ account.",
  },
  {
    id: "downloads-win",
    label: "Downloads folder",
    path: `${HOME}\\Downloads`,
    action: "info", category: "personal", icon: "📥", safetyLevel: "review",
    title: "Thư mục tải về của bạn",
    description: "Thường chứa installer cũ (.exe, .msi), file zip, PDF, video. Dễ tích lũy 10–50 GB theo năm.",
    consequence: "Xem xét thủ công từng file trước khi xóa.",
    tip: "Mở thư mục và sort by Date modified → xóa file cũ không cần.",
    manageCmd: `explorer "${HOME}\\Downloads"`,
  },
  // ── iTUNES / APPLE MOBILE ──
  {
    id: "itunes-backup-win",
    label: "iTunes iOS Backup",
    path: `${APPDATA}\\Apple Computer\\MobileSync\\Backup`,
    action: "delete", category: "mobile", icon: "📱", safetyLevel: "caution",
    title: "Bản sao lưu iPhone/iPad qua iTunes (Windows)",
    description: "Mỗi lần backup iPhone/iPad qua cáp USB, iTunes lưu toàn bộ dữ liệu thiết bị vào đây. Một backup chiếm 5–50 GB. Thư mục này thường ẩn trong AppData và ít người biết đến.",
    consequence: "Xóa sẽ mất backup cục bộ. Nếu đã bật iCloud Backup → an toàn. Nếu chưa có iCloud Backup, KHÔNG XÓA.",
    tip: "Kiểm tra iCloud Backup trong Settings iPhone trước. Đây thường là 'bom dung lượng' ẩn lớn nhất trên Windows.",
  },
  {
    id: "itunes-firmware-win",
    label: "iTunes iOS Firmware (IPSW)",
    path: `${APPDATA}\\Apple Computer\\iTunes\\iPhone Software Updates`,
    action: "delete", category: "mobile", icon: "💿", safetyLevel: "safe",
    title: "File firmware iOS đã tải qua iTunes",
    description: "iTunes lưu file IPSW (5–8 GB mỗi file) sau khi update iPhone/iPad. Sau khi update xong, file này không còn cần thiết nhưng iTunes không tự xóa. Có thể tích lũy 10–30 GB theo thời gian.",
    consequence: "Xóa an toàn 100% sau khi update xong. Nếu cần restore, iTunes tải lại firmware mới.",
    tip: "Rất hay bị bỏ quên. Kiểm tra ngay — tiết kiệm 5–30 GB dễ dàng.",
  },
  {
    id: "itunes-firmware-win2",
    label: "iTunes Firmware (ProgramData)",
    path: `C:\\ProgramData\\Apple Computer\\iTunes\\iPhone Software Updates`,
    action: "delete", category: "mobile", icon: "💿", safetyLevel: "safe",
    title: "File firmware iOS trong thư mục hệ thống",
    description: "Vị trí thứ hai iTunes có thể lưu firmware IPSW trên một số phiên bản Windows/iTunes. Thường bị ẩn hoàn toàn.",
    consequence: "Xóa an toàn sau khi update xong. iTunes tải lại khi cần.",
    tip: "Kiểm tra cả hai vị trí IPSW. Cộng lại có thể tiết kiệm 20+ GB.",
  },
  {
    id: "ios-device-logs-win",
    label: "Apple Device Crash Logs",
    path: `${APPDATA}\\Apple Computer\\Logs\\CrashReporter\\MobileDevice`,
    action: "delete", category: "mobile", icon: "📋", safetyLevel: "safe",
    title: "Log crash của iPhone/iPad đồng bộ qua iTunes",
    description: "Mỗi lần kết nối iPhone/iPad, iTunes sao chép crash logs từ thiết bị. Theo thời gian có thể lên vài GB với hàng nghìn file nhỏ.",
    consequence: "Xóa hoàn toàn an toàn. Chỉ là log cũ không có giá trị sử dụng.",
    tip: "An toàn xóa bất cứ lúc nào.",
  },
  // ── 3uTOOLS ──
  {
    id: "3utools-firmware-win",
    label: "3uTools Firmware Cache",
    path: `${HOME}\\3uTools\\Firmware`,
    action: "delete", category: "mobile", icon: "🔧", safetyLevel: "safe",
    title: "Firmware iOS đã tải bằng 3uTools",
    description: "3uTools lưu file IPSW tại đây sau khi flash/restore thiết bị. Mỗi file 5–8 GB, nhiều phiên bản iOS tích lũy rất nhanh. Đây là một trong những thư mục 'ẩn' ngốn dung lượng nhiều nhất khi dùng 3uTools.",
    consequence: "Xóa an toàn hoàn toàn — 3uTools tải lại firmware khi cần. Không ảnh hưởng thiết bị đang dùng.",
    tip: "Thường nằm ở C:\\Users\\[tên]\\3uTools\\Firmware. Kiểm tra ngay — dễ tiết kiệm 10–50 GB.",
  },
  {
    id: "3utools-backup-win",
    label: "3uTools iOS Backup",
    path: `${HOME}\\3uTools\\Backup`,
    action: "delete", category: "mobile", icon: "📦", safetyLevel: "caution",
    title: "Bản sao lưu iPhone/iPad tạo bởi 3uTools",
    description: "3uTools lưu backup thiết bị iOS tại đây. Mỗi backup 5–50 GB tùy dung lượng thiết bị và dữ liệu. Thường bị quên hoàn toàn sau khi thay máy.",
    consequence: "Xóa sẽ mất backup cục bộ. Chỉ xóa khi chắc chắn không cần khôi phục lại thiết bị cũ.",
    tip: "Kiểm tra ngày tạo backup. Backup cũ hơn 6 tháng thường không còn hữu ích.",
  },
  {
    id: "3utools-ipsw-alt-win",
    label: "3uTools IPSW Alt Location",
    path: `C:\\Users\\Public\\3uTools\\Firmware`,
    action: "delete", category: "mobile", icon: "🔧", safetyLevel: "safe",
    title: "Firmware 3uTools lưu ở thư mục Public",
    description: "Một số phiên bản 3uTools lưu firmware tại thư mục Public thay vì thư mục user. Hay bị bỏ sót khi dọn dẹp.",
    consequence: "Xóa an toàn. 3uTools tải lại khi cần.",
    tip: "Kiểm tra cả hai vị trí 3uTools Firmware để không bỏ sót.",
  },
];

const CATALOG = IS_WIN ? CATALOG_WIN : CATALOG_MAC;
const PLATFORM_INFO = {
  os: IS_WIN ? "windows" : IS_MAC ? "macos" : "linux",
  label: IS_WIN ? "Windows" : IS_MAC ? "macOS" : "Linux",
  home: HOME,
  version: os.release(),
  hostname: os.hostname(),
};

// ─── PLATFORM-SPECIFIC COMMANDS ──────────────────────────────────────────────

function getSize(filePath) {
  return new Promise((resolve) => {
    if (IS_WIN) {
      const ps = `(Get-ChildItem -Path '${filePath.replace(/'/g,"''")}' -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum`;
      exec(`powershell -NoProfile -Command "${ps}"`, (err, stdout) => {
        const n = parseInt(stdout.trim());
        resolve(isNaN(n) ? 0 : n);
      });
    } else {
      exec(`du -sk "${filePath}" 2>/dev/null`, (err, stdout) => {
        if (err || !stdout.trim()) return resolve(0);
        const kb = parseInt(stdout.split(/\s+/)[0]);
        resolve(isNaN(kb) ? 0 : kb * 1024);
      });
    }
  });
}

function getDiskInfo() {
  return new Promise((resolve) => {
    if (IS_WIN) {
      const ps = `Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free | ConvertTo-Json`;
      exec(`powershell -NoProfile -Command "${ps}"`, (err, stdout) => {
        const result = {};
        try {
          let drives = JSON.parse(stdout);
          if (!Array.isArray(drives)) drives = [drives];
          for (const d of drives) {
            if (!d.Name) continue;
            const used = d.Used || 0;
            const free = d.Free || 0;
            const total = used + free;
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            result[d.Name + ":\\"] = { total, used, available: free, pct, label: d.Name + ":\\" };
          }
        } catch {}
        resolve(result);
      });
    } else {
      exec("df -k / /Volumes/Data 2>/dev/null", (err, stdout) => {
        const result = {};
        if (stdout) {
          const lines = stdout.trim().split("\n").slice(1);
          for (const line of lines) {
            const p = line.trim().split(/\s+/);
            if (p.length < 5) continue;
            const mount = p[p.length - 1];
            result[mount] = {
              total: parseInt(p[1]) * 1024,
              used: parseInt(p[2]) * 1024,
              available: parseInt(p[3]) * 1024,
              pct: parseInt(p[4]),
              label: mount,
            };
          }
        }
        resolve(result);
      });
    }
  });
}

function deleteItem(itemPath) {
  return new Promise((resolve) => {
    if (IS_WIN) {
      exec(`powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue '${itemPath.replace(/'/g, "''")}'"`, (err) => resolve(err));
    } else {
      exec(`rm -rf "${itemPath}"`, (err) => resolve(err));
    }
  });
}

function moveWithLink(src, dst) {
  return new Promise((resolve) => {
    const dstParent = path.dirname(dst);
    const mkdirCmd = IS_WIN
      ? `powershell -NoProfile -Command "New-Item -ItemType Directory -Force -Path '${dstParent}' | Out-Null"`
      : `mkdir -p "${dstParent}"`;

    exec(mkdirCmd, (mkErr) => {
      if (mkErr) return resolve({ ok: false, msg: "Không tạo được thư mục: " + mkErr.message });

      const moveCmd = IS_WIN
        ? `powershell -NoProfile -Command "Move-Item -Path '${src.replace(/'/g,"''")}' -Destination '${dst.replace(/'/g,"''")}' -Force"`
        : `mv "${src}" "${dst}"`;

      exec(moveCmd, (mvErr) => {
        if (mvErr) return resolve({ ok: false, msg: "Lỗi di chuyển: " + mvErr.message });

        // Windows: use Junction (no admin needed), macOS: symlink
        const linkCmd = IS_WIN
          ? `mklink /J "${src}" "${dst}"`
          : `ln -s "${dst}" "${src}"`;

        exec(linkCmd, { shell: IS_WIN ? "cmd.exe" : "/bin/sh" }, (lnErr) => {
          if (lnErr) resolve({ ok: false, msg: "Lỗi tạo link: " + lnErr.message });
          else resolve({ ok: true });
        });
      });
    });
  });
}

function emptyRecycleBin() {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"`, (err) => resolve(err));
  });
}

function isSymlink(filePath) {
  try { return fs.lstatSync(filePath).isSymbolicLink(); } catch { return false; }
}

function isJunction(filePath) {
  if (!IS_WIN) return false;
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isSymbolicLink();
  } catch { return false; }
}

function pathExists(filePath) {
  try { fs.accessSync(filePath, fs.constants.F_OK); return true; } catch { return false; }
}

function readlinkTarget(filePath) {
  try { return fs.readlinkSync(filePath); } catch { return null; }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, size = bytes;
  while (size >= 1024 && i < 4) { size /= 1024; i++; }
  return `${size.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function sseWrite(res, data) { res.write(`data: ${JSON.stringify(data)}\n\n`); }
function setupSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

// ─── API ──────────────────────────────────────────────────────────────────────

app.get("/api/platform", (req, res) => {
  res.json({ success: true, data: PLATFORM_INFO });
});

app.get("/api/disk", async (req, res) => {
  const data = await getDiskInfo();
  res.json({ success: true, data });
});

app.get("/api/scan", async (req, res) => {
  const results = await Promise.all(
    CATALOG.map(async (item) => {
      const exists = pathExists(item.path);
      const symlink = exists && (isSymlink(item.path) || isJunction(item.path));
      const symlinkTarget = symlink ? readlinkTarget(item.path) : null;
      const sizeBytes = exists && !symlink ? await getSize(item.path) : 0;
      return {
        ...item,
        exists, isSymlink: symlink, symlinkTarget,
        sizeBytes, sizeFormatted: formatBytes(sizeBytes),
      };
    })
  );
  res.json({ success: true, data: results });
});

app.post("/api/operation", async (req, res) => {
  const { type, id } = req.body;
  const item = CATALOG.find((i) => i.id === id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  setupSSE(res);

  if (type === "delete" || type === "recycle") {
    const sizeBefore = await getSize(item.path);
    sseWrite(res, { type: "start",   message: `🗑️  Đang xóa: ${item.label}` });
    sseWrite(res, { type: "info",    message: `📁 ${item.path}` });
    sseWrite(res, { type: "info",    message: `📦 Kích thước: ${formatBytes(sizeBefore)}` });

    if (type === "recycle" && IS_WIN) {
      const err = await emptyRecycleBin();
      if (err) sseWrite(res, { type: "error", message: `❌ ${err.message}` });
      else sseWrite(res, { type: "success", message: `✅ Đã dọn Recycle Bin!`, freed: sizeBefore, itemId: id });
    } else {
      const err = await deleteItem(item.path);
      if (err) sseWrite(res, { type: "error", message: `❌ Lỗi: ${err.message}` });
      else sseWrite(res, { type: "success", message: `✅ Đã xóa! Giải phóng ${formatBytes(sizeBefore)}`, freed: sizeBefore, itemId: id });
    }
    sseWrite(res, { type: "done" });
    return res.end();
  }

  if (type === "move") {
    const target = item.moveTarget;
    if (!target) {
      sseWrite(res, { type: "error", message: "❌ Không có đích di chuyển" });
      sseWrite(res, { type: "done" });
      return res.end();
    }
    const sizeBefore = await getSize(item.path);
    sseWrite(res, { type: "start",   message: `📦 Đang di chuyển: ${item.label}` });
    sseWrite(res, { type: "info",    message: `📁 Từ: ${item.path}` });
    sseWrite(res, { type: "info",    message: `📦 Đến: ${target}` });
    sseWrite(res, { type: "info",    message: `📏 Kích thước: ${formatBytes(sizeBefore)}` });
    sseWrite(res, { type: "warning", message: IS_WIN ? `⚠️  Sẽ tạo Junction point (Windows link)` : `⚠️  Sẽ tạo symlink để app vẫn hoạt động` });

    const result = await moveWithLink(item.path, target);
    if (!result.ok) {
      sseWrite(res, { type: "error", message: `❌ ${result.msg}` });
    } else {
      sseWrite(res, { type: "success", message: `✅ Đã chuyển và tạo link!`, freed: sizeBefore, itemId: id });
      sseWrite(res, { type: "info",    message: `🔗 ${item.path} → ${target}` });
    }
    sseWrite(res, { type: "done" });
    return res.end();
  }

  if (type === "brew") {
    sseWrite(res, { type: "start", message: "🍺 Chạy: brew cleanup --prune=all" });
    const sizeBefore = await getSize(item.path);
    const proc = spawn("brew", ["cleanup", "--prune=all"]);
    proc.stdout.on("data", (d) => d.toString().trim().split("\n").forEach(l => l && sseWrite(res, { type: "log", message: l })));
    proc.stderr.on("data", (d) => d.toString().trim().split("\n").forEach(l => l && sseWrite(res, { type: "log", message: l })));
    proc.on("close", async (code) => {
      const sizeAfter = await getSize(item.path);
      const freed = Math.max(0, sizeBefore - sizeAfter);
      if (code === 0) sseWrite(res, { type: "success", message: `✅ Homebrew cleaned! Giải phóng ${formatBytes(freed)}`, freed, itemId: id });
      else sseWrite(res, { type: "error", message: "❌ Lỗi khi chạy brew cleanup" });
      sseWrite(res, { type: "done" });
      res.end();
    });
    return;
  }

  sseWrite(res, { type: "error", message: "❌ Unknown operation" });
  sseWrite(res, { type: "done" });
  res.end();
});

app.post("/api/clean-all", (req, res) => {
  setupSSE(res);
  const deleteItems = CATALOG.filter(i => i.action === "delete" && pathExists(i.path) && !isSymlink(i.path) && !isJunction(i.path));

  sseWrite(res, { type: "start", message: `🧹 Bắt đầu dọn ${deleteItems.length} mục...` });
  let totalFreed = 0;

  const next = async (i) => {
    if (i >= deleteItems.length) {
      if (!IS_WIN && pathExists(CATALOG.find(c => c.action === "brew")?.path || "")) {
        sseWrite(res, { type: "log", message: "🍺 Chạy brew cleanup..." });
        exec("brew cleanup --prune=all > /dev/null 2>&1", async () => {
          sseWrite(res, { type: "log", message: "✅ Homebrew cleaned" });
          finish();
        });
      } else finish();
      return;
    }
    const item = deleteItems[i];
    const size = await getSize(item.path);
    sseWrite(res, { type: "log", message: `🗑️  ${item.label} (${formatBytes(size)})` });
    const err = await deleteItem(item.path);
    if (!err && size) totalFreed += size;
    next(i + 1);
  };

  const finish = () => {
    sseWrite(res, { type: "success", message: `🎉 Xong! Tổng giải phóng: ${formatBytes(totalFreed)}`, freed: totalFreed });
    sseWrite(res, { type: "done" });
    res.end();
  };

  next(0);
});

app.post("/api/restore", async (req, res) => {
  const { id } = req.body;
  const item = CATALOG.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: "Item not found" });

  setupSSE(res);
  if (!isSymlink(item.path) && !isJunction(item.path)) {
    sseWrite(res, { type: "error", message: "❌ Không phải link/junction" });
    sseWrite(res, { type: "done" });
    return res.end();
  }

  const target = readlinkTarget(item.path);
  sseWrite(res, { type: "start", message: `↩️  Khôi phục: ${item.label}` });
  sseWrite(res, { type: "info", message: `📁 ${target} → ${item.path}` });

  const rmCmd = IS_WIN
    ? `powershell -NoProfile -Command "Remove-Item -Force '${item.path.replace(/'/g, "''")}'"`
    : `rm "${item.path}"`;

  exec(rmCmd, (rmErr) => {
    if (rmErr) {
      sseWrite(res, { type: "error", message: `❌ ${rmErr.message}` });
      sseWrite(res, { type: "done" });
      return res.end();
    }
    const mvCmd = IS_WIN
      ? `powershell -NoProfile -Command "Move-Item -Path '${target.replace(/'/g,"''")}' -Destination '${item.path.replace(/'/g,"''")}' -Force"`
      : `mv "${target}" "${item.path}"`;

    exec(mvCmd, (mvErr) => {
      if (mvErr) sseWrite(res, { type: "error", message: `❌ ${mvErr.message}` });
      else sseWrite(res, { type: "success", message: `✅ Đã khôi phục về ổ gốc!`, itemId: id });
      sseWrite(res, { type: "done" });
      res.end();
    });
  });
});

app.get("/api/open-folder", (req, res) => {
  const { p } = req.query;
  if (!p) return res.status(400).json({ error: "No path" });
  const cmd = IS_WIN ? `explorer "${p}"` : `open "${p}"`;
  exec(cmd);
  res.json({ success: true });
});

// ─── PORTS ───────────────────────────────────────────────────────────────────

const KNOWN_PORTS = {
  80:{name:"HTTP",cat:"web",icon:"🌐",desc:"Web server không mã hóa",risk:"low"},
  443:{name:"HTTPS",cat:"web",icon:"🔒",desc:"Web server SSL/TLS",risk:"low"},
  8080:{name:"HTTP-Alt",cat:"dev",icon:"🌐",desc:"HTTP alternative port",risk:"low"},
  3000:{name:"Node/React",cat:"dev",icon:"⚛️",desc:"Node.js/React dev server",risk:"low"},
  3001:{name:"Dev Server",cat:"dev",icon:"⚛️",desc:"Dev server alternative",risk:"low"},
  4200:{name:"Angular",cat:"dev",icon:"🔴",desc:"Angular CLI dev server",risk:"low"},
  5173:{name:"Vite",cat:"dev",icon:"⚡",desc:"Vite bundler dev server",risk:"low"},
  5000:{name:"Flask/Dev",cat:"dev",icon:"🐍",desc:"Python Flask / generic dev",risk:"low"},
  7788:{name:"Disk Manager",cat:"dev",icon:"💾",desc:"Disk Manager UI — ứng dụng này",risk:"low"},
  8000:{name:"Django/Dev",cat:"dev",icon:"🐍",desc:"Django dev server",risk:"low"},
  8888:{name:"Jupyter",cat:"dev",icon:"📓",desc:"Jupyter Notebook/Lab",risk:"low"},
  8501:{name:"Streamlit",cat:"dev",icon:"🚀",desc:"Streamlit Python app",risk:"low"},
  3306:{name:"MySQL",cat:"db",icon:"🐬",desc:"MySQL / MariaDB",risk:"low"},
  5432:{name:"PostgreSQL",cat:"db",icon:"🐘",desc:"PostgreSQL database",risk:"low"},
  27017:{name:"MongoDB",cat:"db",icon:"🍃",desc:"MongoDB NoSQL",risk:"low"},
  6379:{name:"Redis",cat:"db",icon:"⚡",desc:"Redis cache / message broker",risk:"low"},
  9200:{name:"Elasticsearch",cat:"db",icon:"🔍",desc:"Elasticsearch",risk:"low"},
  22:{name:"SSH",cat:"system",icon:"🔐",desc:"Secure Shell — truy cập terminal từ xa",risk:"medium"},
  23:{name:"Telnet",cat:"system",icon:"☠️",desc:"TELNET — KHÔNG mã hóa! Nguy hiểm",risk:"high"},
  21:{name:"FTP",cat:"system",icon:"📂",desc:"File Transfer Protocol — không mã hóa",risk:"medium"},
  3389:{name:"RDP",cat:"system",icon:"🖥️",desc:"Windows Remote Desktop",risk:"medium"},
  5900:{name:"VNC",cat:"system",icon:"🖥️",desc:"Virtual Network Computing",risk:"medium"},
  445:{name:"SMB",cat:"system",icon:"📁",desc:"Windows file sharing (SMB/CIFS)",risk:"medium"},
  2375:{name:"Docker",cat:"dev",icon:"🐳",desc:"Docker daemon API — KHÔNG mã hóa! Nguy hiểm",risk:"high"},
  2376:{name:"Docker-TLS",cat:"dev",icon:"🐳",desc:"Docker daemon API với TLS",risk:"low"},
  5672:{name:"RabbitMQ",cat:"service",icon:"🐇",desc:"RabbitMQ AMQP message broker",risk:"low"},
  9092:{name:"Kafka",cat:"service",icon:"📨",desc:"Apache Kafka event streaming",risk:"low"},
};

const RISK_CFG = {
  high:   { label:"☠ NGUY HIỂM", color:"#ff453a" },
  medium: { label:"⚡ CẨN THẬN", color:"#ff9f0a" },
  low:    { label:"✓ AN TOÀN",   color:"#30d158" },
  unknown:{ label:"? UNKNOWN",   color:"#636366" },
};

function enrichPort(port, pid, cmd, proto, addr) {
  const k = KNOWN_PORTS[port];
  const risk = k ? (k.risk||"low") : (port < 1024 ? "medium" : "unknown");
  return { port, pid, cmd, proto, addr,
    name: k?.name || cmd || "Unknown",
    desc: k?.desc || `Process ${cmd||"?"} (port ${port})`,
    icon: k?.icon || "🔌", cat: k?.cat || "unknown", risk,
    riskLabel: RISK_CFG[risk]?.label || "?",
    riskColor: RISK_CFG[risk]?.color || "#636366",
    isLocal: ["127.0.0.1","::1","localhost","[::1]","::ffff:127.0.0.1"].includes(addr),
  };
}

function scanPortsMac() {
  return new Promise(r => {
    exec(`lsof -iTCP -n -P 2>/dev/null | grep LISTEN; lsof -iUDP -n -P 2>/dev/null | grep -v "^COMMAND"`, (e, o) => {
      const seen = new Set(), ports = [];
      (o||"").trim().split("\n").filter(Boolean).forEach(line => {
        const p = line.trim().split(/\s+/); if (p.length < 9) return;
        const cmd=p[0], pid=parseInt(p[1]), protoFull=p[7], name=p[8];
        const proto = protoFull.startsWith("TCP") ? "TCP" : "UDP";
        const m = name.match(/^([^:]+):(\d+)(?:\s*\((\w+)\))?$/);
        if (!m) return;
        const addr = m[1]==="*" ? "0.0.0.0" : m[1], port = parseInt(m[2]), st = m[3]||"";
        if (proto==="TCP" && st!=="LISTEN") return;
        const key = `${proto}:${port}`; if (seen.has(key)) return; seen.add(key);
        if (!isNaN(port) && port > 0) ports.push(enrichPort(port, pid, cmd, proto, addr));
      });
      r(ports.sort((a,b) => a.port - b.port));
    });
  });
}

function scanPortsWin() {
  return new Promise(r => {
    const ps = `$r=@();Get-NetTCPConnection -State Listen -EA SilentlyContinue|ForEach-Object{$p=Get-Process -Id $_.OwningProcess -EA SilentlyContinue;$r+=[PSCustomObject]@{port=$_.LocalPort;addr=$_.LocalAddress;pid=$_.OwningProcess;cmd=if($p){$p.Name}else{'?'};proto='TCP'}};$r|Sort-Object port|ConvertTo-Json -Compress`;
    exec(`powershell -NoProfile -Command "${ps}"`, (e, o) => {
      try {
        let raw = JSON.parse(o); if (!Array.isArray(raw)) raw=[raw];
        const seen = new Set();
        r(raw.filter(x=>{ const k=`${x.proto}:${x.port}`; if(seen.has(k)) return false; seen.add(k); return true; })
          .map(x => enrichPort(x.port, x.pid, x.cmd, x.proto, x.addr||"0.0.0.0")));
      } catch { r([]); }
    });
  });
}

app.get("/api/ports", async (_, res) => {
  res.json({ success: true, data: IS_WIN ? await scanPortsWin() : await scanPortsMac() });
});

app.post("/api/kill-pid", (req, res) => {
  const { pid, admin=false } = req.body;
  if (!pid || isNaN(pid)) return res.status(400).json({ error: "Invalid PID" });
  setupSSE(res);
  sseWrite(res, { type:"start", message:`⚡ Kill PID ${pid}...` });
  const cmd = admin
    ? (IS_WIN
        ? `powershell -Command "Start-Process cmd -Verb RunAs -ArgumentList '/c taskkill /PID ${pid} /F' -Wait -WindowStyle Hidden"`
        : `osascript -e 'do shell script "kill -9 ${pid}" with administrator privileges'`)
    : (IS_WIN ? `taskkill /PID ${pid} /F` : `kill -9 ${pid}`);
  exec(cmd, err => {
    if (err) {
      const needsAdmin = !admin && (err.message.includes("Operation not permitted") || err.message.includes("Access is denied"));
      sseWrite(res, { type:"error", message:`❌ ${err.message}`, needsAdmin, pid });
    } else {
      sseWrite(res, { type:"success", message:`✅ PID ${pid} đã kill thành công!`, pid });
    }
    sseWrite(res, { type:"done" }); res.end();
  });
});

// ─── MONITOR ─────────────────────────────────────────────────────────────────

let _prevCpu = null;
function cpuPercent() {
  const curr = os.cpus();
  if (!_prevCpu) { _prevCpu = curr.map(c => ({...c.times})); return 0; }
  let tot = 0, idl = 0;
  curr.forEach((c, i) => {
    const p = _prevCpu[i];
    const cv = Object.values(c.times).reduce((a,b)=>a+b,0);
    const pv = Object.values(p).reduce((a,b)=>a+b,0);
    tot += cv - pv; idl += c.times.idle - p.idle;
  });
  _prevCpu = curr.map(c => ({...c.times}));
  return tot > 0 ? Math.max(0, Math.min(100, (1 - idl/tot) * 100)) : 0;
}

function ramInfo() {
  const total = os.totalmem();
  if (IS_MAC) {
    return new Promise(resolve => {
      exec("vm_stat", (err, out) => {
        if (err) { const f=os.freemem(); return resolve({total,free:f,used:total-f,pct:Math.round((total-f)/total*100)}); }
        const ps = parseInt((out.match(/page size of (\d+)/)||[])[1]) || 16384;
        const get = k => (parseInt((out.match(new RegExp(k+":\\s*(\\d+)"))||[])[1])||0)*ps;
        const free = get("Pages free") + get("Pages inactive") + get("Pages speculative");
        const used = Math.max(0, total - free);
        resolve({ total, free: Math.min(free,total), used, pct: Math.round(used/total*100) });
      });
    });
  }
  if (IS_WIN) {
    return new Promise(resolve => {
      exec(`powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"`, (err, out) => {
        if (err) { const f=os.freemem(); return resolve({total,free:f,used:total-f,pct:Math.round((total-f)/total*100)}); }
        const free = (parseInt(out.trim())||0) * 1024;
        const used = Math.max(0, total - free);
        resolve({ total, free, used, pct: Math.round(used/total*100) });
      });
    });
  }
  const f = os.freemem(), u = total - f;
  return Promise.resolve({ total, free:f, used:u, pct: Math.round(u/total*100) });
}

function topProcs() {
  return new Promise(r => {
    if (IS_WIN) {
      const ps = `Get-Process|Sort-Object CPU -Desc|Select-Object -First 20|ForEach-Object{[PSCustomObject]@{pid=$_.Id;name=$_.Name;cpu=[math]::Round($_.CPU/10,1);ram=[math]::Round($_.WorkingSet/1MB,0)}}|ConvertTo-Json -Compress`;
      exec(`powershell -NoProfile -Command "${ps}"`, (e,o) => { try{let d=JSON.parse(o);r(Array.isArray(d)?d:[d]);}catch{r([]);} });
    } else {
      exec(`ps -A -o pid=,pcpu=,rss=,comm= 2>/dev/null | sort -rn -k2 | head -25`, (e, o) => {
        const list = (o||"").trim().split("\n").filter(Boolean).map(l => {
          const p = l.trim().split(/\s+/); if (p.length < 3) return null;
          return { pid:parseInt(p[0]), cpu:parseFloat(p[1]), ram:Math.round(parseInt(p[2])/1024), name:(p.slice(3).join(" ")||"").split("/").pop().slice(0,30) };
        }).filter(Boolean);
        r(list);
      });
    }
  });
}

app.get("/api/resources/stream", (req, res) => {
  setupSSE(res);
  let tick = 0;
  const push = async () => {
    const cpu = cpuPercent(), ram = await ramInfo();
    const payload = { cpu: Math.round(cpu*10)/10, ram, ts: Date.now() };
    if (tick % 4 === 0) { payload.processes = await topProcs(); }
    tick++;
    try { sseWrite(res, payload); } catch {}
  };
  push();
  const iv = setInterval(push, 1000);
  req.on("close", () => clearInterval(iv));
});

app.get("/api/top-processes", async (_, res) => {
  res.json({ success:true, data: await topProcs() });
});

// ─── TRAY ────────────────────────────────────────────────────────────────────

const { spawn: spawnProc } = require("child_process");
let _trayProc = null;
function trayRunning() { return _trayProc !== null && !_trayProc.killed; }

app.get("/api/tray/status", (_, res) => {
  res.json({ running: trayRunning() });
});

app.post("/api/tray/start", (_, res) => {
  if (trayRunning()) return res.json({ ok:true, msg:"already running" });
  const trayScript = path.join(__dirname, "tray.js");
  _trayProc = spawnProc("node", [trayScript], {
    stdio:"ignore", detached:true,
    env: { ...process.env, PORT: String(PORT) },
    ...(IS_WIN ? { windowsHide:true } : {}),
  });
  _trayProc.unref();
  _trayProc.on("exit", () => { _trayProc = null; });
  setTimeout(() => res.json({ ok:true, msg: trayRunning() ? "started" : "started (detached)" }), 500);
});

app.post("/api/tray/stop", (_, res) => {
  if (!trayRunning()) return res.json({ ok:true, msg:"not running" });
  _trayProc.kill("SIGTERM"); _trayProc = null;
  res.json({ ok:true, msg:"stopped" });
});

// ─── START ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   🖥️  macOS Disk Manager UI — ${PLATFORM_INFO.label.padEnd(10)}║`);
  console.log(`  ╚══════════════════════════════════════════╝`);
  console.log(`\n  ➜  ${url}\n`);
  const openCmd = IS_WIN ? `start ${url}` : `open ${url}`;
  exec(openCmd);
});
