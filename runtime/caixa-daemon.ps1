# Supervisor for the Caixa till daemon.
#
# `zeroclaw service install` writes a launchd or systemd unit and nothing else;
# on Windows it exits with "Access is denied" because there is no unit to write.
# A till that only runs 24/7 on Linux is not a till that runs 24/7. This script
# is the Windows half: Task Scheduler starts it at logon, it keeps the daemon
# up, and it writes one log the run can be read back out of.
#
# The API key is never written here. It is read from the user environment, which
# is where it was set programmatically — so it stays off disk and off screen.

$ErrorActionPreference = 'Stop'
$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$Binary  = 'C:\Users\arche\projects\zeroclaw\target\release\zeroclaw.exe'
$LogDir  = Join-Path $Root 'logs'
$Log     = Join-Path $LogDir 'daemon.log'

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

function Write-Line($text) {
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  Add-Content -Path $Log -Value "[$stamp supervisor] $text" -Encoding utf8
}

# Fail loudly rather than starting a daemon that cannot reach a model. A daemon
# that boots and does nothing is the failure mode this whole config is written
# against: five separate settings in it started cleanly and did nothing.
# Hydrate credentials from the persisted user environment rather than trusting
# inheritance. A supervisor launched from the Startup folder gets whatever
# Explorer's environment block held at logon, which is stale the moment a
# credential is added — and that is exactly how the Telegram channel sat at 404
# for nineteen hours with a valid token stored on the machine.
foreach ($name in @(
    'ZEROCLAW_providers__models__gemini__main__api_key',
    'ZEROCLAW_providers__models__groq__main__api_key',
    # The `default` segment is not optional. Under schema v3 the channel is
    # `[channels.telegram.default]`, so the override is
    # channels__telegram__default__bot_token. Without it the host rejects the
    # variable outright — "ZEROCLAW_channels__telegram__bot_token →
    # channels.telegram.bot_token" — and refuses to boot. The same v3 trap that
    # cost an evening in the config file, wearing a different hat.
    'ZEROCLAW_channels__telegram__default__bot_token'
  )) {
  if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
    $stored = [Environment]::GetEnvironmentVariable($name, 'User')
    if ($stored) { [Environment]::SetEnvironmentVariable($name, $stored, 'Process') }
  }
}

if (-not $env:ZEROCLAW_providers__models__gemini__main__api_key) {
  Write-Line 'refusing to start: no provider key in the environment'
  exit 1
}

if ($env:ZEROCLAW_channels__telegram__default__bot_token) {
  Write-Line 'telegram token present'
} else {
  Write-Line 'warning: no telegram token; that channel will 404 and the bot will not reply'
}

Write-Line "supervisor up; workspace $Root"

# Restart loop with a backoff floor. Without the floor, a daemon that dies on a
# bad config spins as fast as the CPU allows and fills the disk with the same
# error.
$backoff = 5
while ($true) {
  Write-Line 'starting daemon'
  $start = Get-Date

  # `-v` matters here. Without it the terminal shows only command output and
  # every structured event — channel bindings, plugin registration, heartbeat
  # turns — goes to the trace file instead. An unattended daemon whose log
  # cannot answer "did the heartbeat fire" is not evidence of anything.
  # utf8 because the default redirect writes UTF-16 and no ordinary tool reads it.
  & $Binary --config-dir $Root --log-level info -v daemon 2>&1 |
    ForEach-Object { $_ | Out-String } |
    Out-File -FilePath $Log -Append -Encoding utf8
  $code = $LASTEXITCODE

  $ran = [int]((Get-Date) - $start).TotalSeconds
  Write-Line "daemon exited code=$code after ${ran}s"

  # A run that lasted a while was healthy; reset. A run that died immediately
  # is a configuration problem and should back off.
  if ($ran -gt 60) { $backoff = 5 } else { $backoff = [Math]::Min($backoff * 2, 300) }
  Write-Line "restarting in ${backoff}s"
  Start-Sleep -Seconds $backoff
}
