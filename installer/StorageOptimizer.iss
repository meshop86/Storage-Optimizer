; ─────────────────────────────────────────────────────────────────────────────
;  Storage Optimizer — Windows Installer (Inno Setup Script)
;
;  Cách build:
;  1. Tải Inno Setup tại: https://jrsoftware.org/isinfo.php
;  2. Mở file này bằng Inno Setup IDE
;  3. Nhấn Ctrl+F9 để Build → file .exe được tạo trong thư mục installer/output/
;
;  Installer sẽ tự động:
;  - Kiểm tra và cài Node.js nếu chưa có
;  - Cài đặt toàn bộ ứng dụng vào Program Files
;  - Tạo shortcut trên Desktop và Start Menu
;  - Tạo entry Add/Remove Programs để gỡ cài đặt
; ─────────────────────────────────────────────────────────────────────────────

#define AppName      "Storage Optimizer"
#define AppVersion   "1.0.0"
#define AppPublisher "Storage Optimizer"
#define AppURL       "https://github.com/meshop86/Storage-Optimizer"
#define AppExeName   "StorageOptimizer.exe"
#define NodeVersion  "22.14.0"
#define NodeURL      "https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi"

[Setup]
AppId={{B3A4F2D1-8C5E-4A2B-9F7D-1E3C6A8B0D4F}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
; Không cần quyền Admin (cài cho user hiện tại)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=output
OutputBaseFilename=StorageOptimizer-Setup-v{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
UninstallDisplayName={#AppName}
UninstallDisplayIcon={sys}\shell32.dll,174

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
CheckingNode=Dang kiem tra Node.js...
InstallingNode=Dang cai dat Node.js (co the mat 2-3 phut)...
NodeInstallFailed=Khong the cai Node.js. Vui long cai thu cong tai nodejs.org
InstallingDeps=Đang cài đặt dependencies...
CreatingShortcut=Creating Desktop shortcut...
LaunchNow=Launch Storage Optimizer now
CreateDesktopShortcut=Create a Desktop shortcut

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopShortcut}"; GroupDescription: "Options:"
Name: "startmenuicon"; Description: "Create Start Menu shortcut"; GroupDescription: "Options:"

[Files]
; Toàn bộ source code (trừ node_modules và thư mục installer)
Source: "..\server.js";         DestDir: "{app}";          Flags: ignoreversion
Source: "..\package.json";      DestDir: "{app}";          Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}";          Flags: ignoreversion; Check: FileExists(ExpandConstant('{src}\..\package-lock.json'))
Source: "..\start.bat";        DestDir: "{app}";          Flags: ignoreversion
Source: "..\tray.js";          DestDir: "{app}";          Flags: ignoreversion; Check: FileExists(ExpandConstant('{src}\..\tray.js'))
Source: "..\public\*";         DestDir: "{app}\public";   Flags: ignoreversion recursesubdirs createallsubdirs

; Launch wrapper exe (tạo từ start.bat)
Source: "launcher\StorageOptimizer.exe"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists(ExpandConstant('{src}\launcher\StorageOptimizer.exe'))

[Icons]
; Desktop shortcut
Name: "{userdesktop}\{#AppName}"; Filename: "{app}\start.bat"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 174; Comment: "Storage Optimizer - Disk analysis and cleanup"; Tasks: desktopicon

Name: "{group}\{#AppName}"; Filename: "{app}\start.bat"; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 174; Comment: "Storage Optimizer - Disk analysis and cleanup"; Tasks: startmenuicon
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && npm install"; StatusMsg: "Installing dependencies..."; Flags: runhidden waituntilterminated

Filename: "{app}\start.bat"; Description: "{cm:LaunchNow}"; WorkingDir: "{app}"; Flags: postinstall nowait skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"

[Code]
// ─── Biến toàn cục ───────────────────────────────────────────────────────────
var
  NodeInstalled: Boolean;
  DownloadPage: TDownloadWizardPage;

// ─── Kiểm tra Node.js đã cài chưa ───────────────────────────────────────────
function IsNodeInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c where node >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := Result and (ResultCode = 0);
end;

// ─── Lấy phiên bản Node nếu đã cài ─────────────────────────────────────────
function GetNodeVersion(): String;
var
  TempFile: String;
  Lines: TArrayOfString;
  ResultCode: Integer;
begin
  TempFile := ExpandConstant('{tmp}\nodeversion.txt');
  Exec('cmd.exe', '/c node --version > "' + TempFile + '" 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if LoadStringsFromFile(TempFile, Lines) and (GetArrayLength(Lines) > 0) then
    Result := Trim(Lines[0])
  else
    Result := 'unknown';
end;

// ─── Trang tải Node.js ───────────────────────────────────────────────────────
procedure InitializeWizard();
begin
  DownloadPage := CreateDownloadPage(
    'Tải Node.js',
    'Đang tải Node.js LTS từ nodejs.org...',
    nil
  );
end;

// ─── Callback khi tải xong ───────────────────────────────────────────────────
function OnDownloadProgress(const Url, FileName: String; const Progress, ProgressMax: Int64): Boolean;
begin
  if ProgressMax <> 0 then
    DownloadPage.SetProgress(Progress, ProgressMax)
  else
    DownloadPage.SetProgress(Progress, Progress);
  Result := True;
end;

// ─── Kiểm tra trước khi cài ──────────────────────────────────────────────────
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  NodeMSI: String;
  ResultCode: Integer;
begin
  Result := '';
  
  // Kiểm tra Node.js
  WizardForm.StatusLabel.Caption := 'Đang kiểm tra Node.js...';
  NodeInstalled := IsNodeInstalled();
  
  if NodeInstalled then
  begin
    Log('Node.js found: ' + GetNodeVersion());
    Exit;
  end;
  
  // Node chưa có - tải về
  Log('Node.js not found. Downloading...');
  
  DownloadPage.Clear;
  DownloadPage.Add('{#NodeURL}', 'nodejs_installer.msi', '');
  DownloadPage.Show;
  
  try
    try
      DownloadPage.Download();
      NodeMSI := ExpandConstant('{tmp}\nodejs_installer.msi');
      
      // Cài đặt Node.js silent
      WizardForm.StatusLabel.Caption := 'Đang cài đặt Node.js...';
      if not Exec('msiexec.exe', '/i "' + NodeMSI + '" /quiet /norestart ADDLOCAL=ALL', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        Result := 'Không thể chạy trình cài đặt Node.js. Vui lòng cài thủ công tại nodejs.org';
        Exit;
      end;
      
      if ResultCode <> 0 then
      begin
        Result := 'Cài đặt Node.js thất bại (mã lỗi: ' + IntToStr(ResultCode) + '). Thử chạy với quyền Administrator.';
        Exit;
      end;
      
      NodeInstalled := True;
      Log('Node.js installed successfully');
      
    except
      Result := 'Không thể tải Node.js. Kiểm tra kết nối mạng và thử lại.';
    end;
  finally
    DownloadPage.Hide;
  end;
end;

// ─── Hiển thị thông tin trong trang Welcome ──────────────────────────────────
function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
end;

// ─── Sau khi cài xong ────────────────────────────────────────────────────────
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Refresh PATH để node hoạt động trong cmd mới
    Log('Installation complete. Node.js status: ' + BoolToStr(IsNodeInstalled));
  end;
end;
