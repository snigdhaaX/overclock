# Starts everything the demo needs, each in its own window. Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts\start-demo.ps1
# The local chain starts empty, so this redeploys the contract and resets the demo data each time.
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root 'backend\.venv\Scripts\python.exe'

function Wait-Port($port) {
  $deadline = (Get-Date).AddSeconds(180)
  while (-not (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) {
    if ((Get-Date) -gt $deadline) { throw "Nothing started on port $port. Check its window for errors." }
    Start-Sleep -Seconds 1
  }
}

foreach ($port in 8545, 8000, 8081) {
  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($listener) { Stop-Process -Id $listener.OwningProcess -Force -Confirm:$false }
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\blockchain'; npx hardhat node --hostname 127.0.0.1 --port 8545"
Wait-Port 8545

Set-Location "$root\blockchain"
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/register-local-wallets.js --network localhost

Set-Location $root
& $python -m backend.app.ops.cli seed
& $python -m backend.app.ops.cli event

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; & '$python' -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"
Wait-Port 8000

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; `$env:EXPO_PUBLIC_API_URL='http://localhost:8000'; npx expo start --go --port 8081 --localhost --clear"
Wait-Port 8081

adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" host.exp.exponent
Write-Host 'Demo is up. Analyst: anish@company.com. Manager: Access Role Workspace, then Supply Chain Manager.'
