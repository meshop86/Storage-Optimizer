; ─────────────────────────────────────────────────────────────────────────────
;  Storage Optimizer — Windows Installer (Inno Setup Script)
;  Build: Mo file nay bang Inno Setup IDE, nhan Ctrl+F9
; ─────────────────────────────────────────────────────────────────────────────

#define AppName      "Storage Optimizer"
#define AppVersion   "2.0.0"
#define AppPublisher "Luong Xuan Hoa"
#define AppURL       "https://github.com/meshop86/Storage-Optimizer"
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
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=output
OutputBaseFilename=StorageOptimizer-Setup-v{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=120
UninstallDisplayName={#AppName}

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
LaunchNow=Launch Storage Optimizer now

[Tasks]
Name: "desktopicon";   Description: "{cm:CreateDesktopShortcut}";    GroupDescription: "Shortcuts:"
Name: "startmenuicon"; Description: "Tao shortcut trong Start Menu"; GroupDescription: "Shortcuts:"
Name: "autostart";     Description: "Tu khoi dong cung Windows";     GroupDescription: "Options:"

[Files]
Source: "..\server.js";    DestDir: "{app}"; Flags: ignoreversion
Source: "..\license.js";   DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start.bat";    DestDir: "{app}"; Flags: ignoreversion
Source: "..\tray.js";      DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\public\*";     DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{userdesktop}\{#AppName}";     Filename: "{app}\start.bat"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{group}\{#AppName}";           Filename: "{app}\start.bat"; WorkingDir: "{app}"; Tasks: startmenuicon
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "{#AppName}"; ValueData: """{app}\start.bat"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "cmd.exe"; Parameters: "/c cd /d ""{app}"" && npm install --omit=dev"; StatusMsg: "Cai dependencies..."; Flags: runhidden waituntilterminated
Filename: "{app}\start.bat"; Description: "{cm:LaunchNow}"; WorkingDir: "{app}"; Flags: postinstall nowait skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"

[Code]
var
  DownloadPage: TDownloadWizardPage;

function IsNodeInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c where node >nul 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := Result and (ResultCode = 0);
end;

procedure InitializeWizard();
begin
  DownloadPage := CreateDownloadPage(
    'Downloading Node.js',
    'Please wait while Node.js is being downloaded...',
    nil
  );
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  NodeMSI: String;
  ResultCode: Integer;
begin
  Result := '';

  if IsNodeInstalled() then
    Exit;

  DownloadPage.Clear;
  DownloadPage.Add('{#NodeURL}', 'nodejs_installer.msi', '');
  DownloadPage.Show;

  try
    try
      DownloadPage.Download();
      NodeMSI := ExpandConstant('{tmp}\nodejs_installer.msi');
      if not Exec('msiexec.exe', '/i "' + NodeMSI + '" /quiet /norestart ADDLOCAL=ALL', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        Result := 'Cannot install Node.js. Please install manually from nodejs.org';
        Exit;
      end;
      if ResultCode <> 0 then
        Result := 'Node.js install failed (code: ' + IntToStr(ResultCode) + '). Try running as Administrator.';
    except
      Result := 'Could not download Node.js. Check internet connection.';
    end;
  finally
    DownloadPage.Hide;
  end;
end;
