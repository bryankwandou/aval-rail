# Supervisor for the till's HTTP front door.
#
# The daemon has run unattended for over fourteen hours and restarts itself, but
# the till page in front of it was a node process someone started by hand. One
# reboot and the only channel a judge can actually reach is gone, while the
# daemon underneath carries on looking healthy. That is not 24/7; that is 24/7
# with a manual step nobody wrote down.
#
# So the proxy gets the same treatment as the daemon: started at logon, kept up,
# and logged where the run can be read back out.
#
# The bearer token is read from the environment, never written here. That is the
# entire reason this process exists — the browser must not hold it.

$ErrorActionPreference = 'Stop'
$Root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Server = Join-Path (Split-Path -Parent $Root) 'video\till\server.js'
$LogDir = Join-Path $Root 'logs'
$Log    = Join-Path $LogDir 'till.log'

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

function Write-Line($text) {
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  Add-Content -Path $Log -Value "[$stamp supervisor] $text" -Encoding utf8
}

if (-not (Test-Path $Server)) {
  Write-Line "refusing to start: no server at $Server"
  exit 1
}

# Resolved absolutely, not by name. Launched from the Startup folder through
# wscript the PATH is the bare logon one — the nvm shim that makes `node` work
# in a terminal is not on it, so `& node` failed silently and the port never
# opened while the supervisor sat there looking healthy.
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { $Node = 'C:\nvm4w\nodejs\node.exe' }
if (-not (Test-Path $Node)) {
  Write-Line "refusing to start: no node executable at $Node"
  exit 1
}

# Read the credential from the persisted user environment rather than trusting
# inheritance. A process launched from the Startup folder inherits whatever
# Explorer's environment block held at logon, which can be stale — and one
# launched from a shell inherits that shell's. Reading the stored value makes
# the supervisor independent of who started it.
#
# Same rule as the daemon: a process that starts without its credential and
# then serves errors is worse than one that refuses to start.
if (-not $env:GATEWAY_TOKEN) {
  $env:GATEWAY_TOKEN = [Environment]::GetEnvironmentVariable('GATEWAY_TOKEN', 'User')
}

# The till's /truth endpoint calls the Telegram API directly rather than
# believing the daemon's health report, so it needs the same token.
if (-not $env:ZEROCLAW_channels__telegram__default__bot_token) {
  $env:ZEROCLAW_channels__telegram__default__bot_token =
    [Environment]::GetEnvironmentVariable('ZEROCLAW_channels__telegram__default__bot_token', 'User')
}
if (-not $env:GATEWAY_TOKEN) {
  Write-Line 'refusing to start: GATEWAY_TOKEN is not set for this user'
  exit 1
}

Write-Line "supervisor up; serving $Server"

# Re-assert the shop's own Telegram menu.
#
# The daemon registers ZeroClaw's runtime commands on every startup — /models,
# /config, /sop_execute, /http_request — and overwrites whatever was there. Those
# are operator controls for a generic agent; a shop owner opening the Menu button
# was offered a model switcher and no way to take a payment.
#
# So the till re-applies its own list after the daemon has had time to register
# its own. Last writer wins, and the shop should be the last writer.
$tgToken = $env:ZEROCLAW_channels__telegram__default__bot_token
if ($tgToken) {
  Start-Job -ScriptBlock {
    param($tok, $log)
    Start-Sleep -Seconds 45   # let the daemon finish registering first
    $body = @{ commands = @(
      @{ command = 'charge';  description = 'Take a payment - charge table 4, 25 USDC' },
      @{ command = 'status';  description = 'Is the till up, and what has settled' },
      @{ command = 'refund';  description = 'Prepare a refund for approval' },
      @{ command = 'help';    description = 'What this till does' }
    ) } | ConvertTo-Json -Depth 4 -Compress
    try {
      Invoke-RestMethod -Method Post -TimeoutSec 25 `
        -Uri "https://api.telegram.org/bot$tok/setMyCommands" `
        -ContentType 'application/json' -Body $body | Out-Null
      Add-Content -Path $log -Value "[$((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')) supervisor] shop menu re-applied" -Encoding utf8
    } catch {
      Add-Content -Path $log -Value "[$((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')) supervisor] shop menu re-apply failed: $_" -Encoding utf8
    }
  } -ArgumentList $tgToken, $Log | Out-Null
  Write-Line 'shop menu re-application scheduled'
} else {
  Write-Line 'no telegram token; shop menu not re-applied'
}

# Same backoff shape as the daemon supervisor: a floor so a process that dies on
# a bad port does not spin as fast as the CPU allows, and a ceiling so a long
# outage does not turn into an hour-long wait.
$backoff = 5
while ($true) {
  Write-Line 'starting till proxy'
  $start = Get-Date

  & $Node $Server 2>&1 |
    ForEach-Object { $_ | Out-String } |
    Out-File -FilePath $Log -Append -Encoding utf8
  $code = $LASTEXITCODE

  $ran = [int]((Get-Date) - $start).TotalSeconds
  Write-Line "till proxy exited code=$code after ${ran}s"

  if ($ran -gt 60) { $backoff = 5 } else { $backoff = [Math]::Min($backoff * 2, 300) }
  Write-Line "restarting in ${backoff}s"
  Start-Sleep -Seconds $backoff
}
