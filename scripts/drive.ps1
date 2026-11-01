# 通用驱动：新建对话 → 发送消息 → 等待 → 截图
param(
  [Parameter(Mandatory=$true)][string]$Message,
  [Parameter(Mandatory=$true)][string]$Tag,
  [int]$WaitSec = 70
)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class CW32d {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", EntryPoint="GetWindowThreadProcessId")] public static extern uint GetWindowThreadId(IntPtr h, IntPtr pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("user32.dll")] public static extern void SwitchToThisWindow(IntPtr h, bool altTab);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
}
'@
$VK_MENU=0x12; $VK_CONTROL=0x11; $VK_V=0x56; $VK_N=0x4E; $VK_RETURN=0x0D; $KEYUP=0x0002; $SW_RESTORE=9
$shotDir = 'X:\work\_chatgpt-drive\shots'

function Get-ChatGPTWindow {
  $rows = [System.Collections.Generic.List[object]]::new()
  $cb = [CW32d+EnumProc]{ param($h,$l)
    $sb = New-Object System.Text.StringBuilder 512
    [void][CW32d]::GetWindowTextW($h,$sb,512)
    $t = $sb.ToString()
    if ($t.Length -gt 0) {
      $p32=[uint32]0; [void][CW32d]::GetWindowThreadProcessId($h,[ref]$p32)
      $rows.Add([pscustomobject]@{Hwnd=$h;Pid=$p32;Vis=[CW32d]::IsWindowVisible($h);Iconic=[CW32d]::IsIconic($h);Title=$t})
    }
    return $true }
  [void][CW32d]::EnumWindows($cb,[IntPtr]::Zero)
  $rows | Where-Object { $p = Get-Process -Id $_.Pid -ErrorAction SilentlyContinue; $p -and $p.ProcessName -eq 'ChatGPT' }
}
function Save-Shot([string]$T) {
  Add-Type -AssemblyName System.Drawing
  Add-Type -AssemblyName System.Windows.Forms
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($b.X, $b.Y, 0, 0, $bmp.Size)
  $f = Join-Path $shotDir ("{0}_{1}.png" -f (Get-Date -Format 'HHmmss'), $T)
  $bmp.Save($f, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  return $f
}
function Set-Foreground([IntPtr]$H) {
  if ([CW32d]::IsIconic($H)) { [void][CW32d]::ShowWindow($H,$SW_RESTORE); Start-Sleep -Milliseconds 250 }
  [CW32d]::keybd_event($VK_MENU,0,0,[UIntPtr]::Zero); [CW32d]::keybd_event($VK_MENU,0,$KEYUP,[UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  $fg=[CW32d]::GetForegroundWindow(); $ft=[CW32d]::GetWindowThreadId($fg,[IntPtr]::Zero); $ct=[CW32d]::GetCurrentThreadId()
  $att=$false
  if ($ft -ne 0 -and $ft -ne $ct) { $att=[CW32d]::AttachThreadInput($ct,$ft,$true) }
  [void][CW32d]::SetForegroundWindow($H)
  if ($att) { [void][CW32d]::AttachThreadInput($ct,$ft,$false) }
  Start-Sleep -Milliseconds 200
  if ([CW32d]::GetForegroundWindow() -ne $H) { [CW32d]::SwitchToThisWindow($H,$true); Start-Sleep -Milliseconds 300 }
  return ([CW32d]::GetForegroundWindow() -eq $H)
}

$wins = @(Get-ChatGPTWindow)
$main = $wins | Where-Object { $_.Vis -and $_.Title -eq 'ChatGPT' } | Select-Object -First 1
if (-not $main) { Write-Host "NO_WINDOW"; exit 1 }
$prevFg = [CW32d]::GetForegroundWindow()
if (-not (Set-Foreground $main.Hwnd)) {
  if ($prevFg -ne [IntPtr]::Zero) { [void][CW32d]::SetForegroundWindow($prevFg) }
  Write-Host "FOREGROUND_FAILED"; exit 1
}

# 新建对话
[CW32d]::keybd_event($VK_CONTROL,0,0,[UIntPtr]::Zero)
[CW32d]::keybd_event($VK_N,0,0,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 80
[CW32d]::keybd_event($VK_N,0,$KEYUP,[UIntPtr]::Zero)
[CW32d]::keybd_event($VK_CONTROL,0,$KEYUP,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 2200

# 粘贴并发送
Set-Clipboard -Value $Message
Start-Sleep -Milliseconds 250
[CW32d]::keybd_event($VK_CONTROL,0,0,[UIntPtr]::Zero)
[CW32d]::keybd_event($VK_V,0,0,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 80
[CW32d]::keybd_event($VK_V,0,$KEYUP,[UIntPtr]::Zero)
[CW32d]::keybd_event($VK_CONTROL,0,$KEYUP,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 900
[CW32d]::keybd_event($VK_RETURN,0,0,[UIntPtr]::Zero)
Start-Sleep -Milliseconds 60
[CW32d]::keybd_event($VK_RETURN,0,$KEYUP,[UIntPtr]::Zero)

Start-Sleep -Seconds $WaitSec
$shot = Save-Shot $Tag
Write-Host "SHOT: $shot"
Write-Host "MSG: $Message"
