#!/bin/bash
# ==============================================================================
# TRUSTCHAIN — One-Click Hackathon Demo Launcher (macOS)
# Starts Hardhat Node, FastAPI Backend, and Expo Mobile Frontend in separate
# Terminal windows, dynamically detects Mac LAN IP, and verifies system health.
# ==============================================================================

set -e

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_RED="\033[1;31m"
CLR_GREEN="\033[1;32m"
CLR_YELLOW="\033[1;33m"
CLR_BLUE="\033[1;34m"
CLR_CYAN="\033[1;36m"
CLR_MAGENTA="\033[1;35m"

# Project Directories
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

RUNTIME_DIR="$PROJECT_ROOT/.demo-runtime"
mkdir -p "$RUNTIME_DIR"

echo -e "${CLR_CYAN}${CLR_BOLD}"
echo "=============================================================================="
echo "          TRUSTCHAIN — Disruption Recovery & Blockchain Governance            "
echo "                 Hackathon Demo Launcher & Environment Manager                "
echo "=============================================================================="
echo -e "${CLR_RESET}"

# ------------------------------------------------------------------------------
# STEP 1: PRE-FLIGHT DIRECTORY AND TOOL CHECKS
# ------------------------------------------------------------------------------
echo -e "${CLR_BLUE}[1/6] Running pre-flight validations...${CLR_RESET}"

# Verify Backend Directory and Entry Point
if [ ! -d "$PROJECT_ROOT/backend" ] || [ ! -f "$PROJECT_ROOT/backend/app/main.py" ]; then
    echo -e "${CLR_RED}[ERROR] Backend entry point not found at backend/app/main.py!${CLR_RESET}"
    exit 1
fi

# Verify Blockchain Directory
if [ ! -d "$PROJECT_ROOT/blockchain" ]; then
    echo -e "${CLR_RED}[ERROR] Blockchain directory not found at $PROJECT_ROOT/blockchain!${CLR_RESET}"
    exit 1
fi

# Verify Frontend Directory and package.json
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${CLR_RED}[ERROR] package.json not found in project root!${CLR_RESET}"
    exit 1
fi

# Verify Node.js and npm/npx
if ! command -v node >/dev/null 2>&1; then
    echo -e "${CLR_RED}[ERROR] Node.js is not installed or not in PATH!${CLR_RESET}"
    exit 1
fi
if ! command -v npx >/dev/null 2>&1; then
    echo -e "${CLR_RED}[ERROR] npx is not installed or not in PATH!${CLR_RESET}"
    exit 1
fi
NODE_VER=$(node -v)
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Node.js detected: ${CLR_BOLD}${NODE_VER}${CLR_RESET}"

# Verify Frontend node_modules
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "  ${CLR_YELLOW}⚠ node_modules missing. Installing npm dependencies...${CLR_RESET}"
    npm install
fi

# Locate Compatible Python Environment (with FastAPI, Uvicorn, Web3, JCS)
find_python() {
    # 1. Active virtualenv or Conda
    if [ -n "$VIRTUAL_ENV" ] && [ -x "$VIRTUAL_ENV/bin/python3" ]; then
        echo "$VIRTUAL_ENV/bin/python3"
        return 0
    fi
    if [ -n "$CONDA_PREFIX" ] && [ -x "$CONDA_PREFIX/bin/python3" ]; then
        echo "$CONDA_PREFIX/bin/python3"
        return 0
    fi
    # 2. Local virtualenv in project root
    for vpath in "$PROJECT_ROOT/.venv" "$PROJECT_ROOT/venv" "$PROJECT_ROOT/backend/.venv"; do
        if [ -x "$vpath/bin/python3" ]; then
            echo "$vpath/bin/python3"
            return 0
        fi
    done
    # 3. Known good Python environments
    for pbin in "/opt/anaconda3/bin/python3" "/Library/Frameworks/Python.framework/Versions/3.12/bin/python3" $(which -a python3 2>/dev/null); do
        if [ -x "$pbin" ] && "$pbin" -c "import fastapi, uvicorn" 2>/dev/null; then
            echo "$pbin"
            return 0
        fi
    done
    which python3 2>/dev/null || echo ""
}

PYTHON_BIN=$(find_python)
if [ -z "$PYTHON_BIN" ] || [ ! -x "$PYTHON_BIN" ]; then
    echo -e "${CLR_RED}[ERROR] Python 3 was not found on this machine!${CLR_RESET}"
    exit 1
fi

# Verify Python Dependencies
PY_DEPS_CHECK=$("$PYTHON_BIN" -c "
try:
    import fastapi, uvicorn, web3, sqlalchemy, pydantic
    print('OK')
except Exception as e:
    print('MISSING: ' + str(e))
" 2>&1 || echo "ERROR")

if [ "$PY_DEPS_CHECK" != "OK" ]; then
    echo -e "${CLR_YELLOW}⚠ Python dependencies missing: $PY_DEPS_CHECK${CLR_RESET}"
    echo -e "  Installing required Python packages..."
    "$PYTHON_BIN" -m pip install -q -r backend/requirements.txt jcs pydantic-settings
fi

PY_VER=$("$PYTHON_BIN" --version 2>&1)
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Python detected: ${CLR_BOLD}${PYTHON_BIN} (${PY_VER})${CLR_RESET}"

# ------------------------------------------------------------------------------
# STEP 2: DYNAMIC MAC LAN IP DETECTION
# ------------------------------------------------------------------------------
echo -e "${CLR_BLUE}[2/6] Detecting Mac LAN IP address...${CLR_RESET}"

detect_lan_ip() {
    local ip=""
    # 1. Primary Wi-Fi interfaces (en0 is standard Wi-Fi on MacBooks)
    for iface in en0 en1 en2 en3; do
        ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
        if [ -n "$ip" ] && [ "$ip" != "127.0.0.1" ] && [ "$ip" != "0.0.0.0" ]; then
            echo "$ip"
            return 0
        fi
    done
    # 2. Check default routing interface
    local def_iface=$(route get default 2>/dev/null | grep 'interface:' | awk '{print $2}' || true)
    if [ -n "$def_iface" ]; then
        ip=$(ipconfig getifaddr "$def_iface" 2>/dev/null || true)
        if [ -n "$ip" ] && [ "$ip" != "127.0.0.1" ] && [ "$ip" != "0.0.0.0" ]; then
            echo "$ip"
            return 0
        fi
    fi
    # 3. Fallback to ifconfig
    ip=$(ifconfig 2>/dev/null | grep -E "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -n 1 || true)
    if [ -n "$ip" ] && [ "$ip" != "0.0.0.0" ]; then
        echo "$ip"
        return 0
    fi
    echo ""
}

LAN_IP=$(detect_lan_ip)

if [ -z "$LAN_IP" ]; then
    echo -e "  ${CLR_YELLOW}⚠ WARNING: No active Wi-Fi or LAN IP detected!${CLR_RESET}"
    echo -e "    Using loopback 127.0.0.1 for local testing."
    echo -e "    To test on an Android phone, connect Mac & phone to the same Wi-Fi/hotspot."
    LAN_IP="127.0.0.1"
else
    echo -e "  ${CLR_GREEN}✓${CLR_RESET} Detected Mac LAN IP: ${CLR_BOLD}${CLR_GREEN}${LAN_IP}${CLR_RESET}"
fi

echo "$LAN_IP" > "$RUNTIME_DIR/lan_ip.txt"

# ------------------------------------------------------------------------------
# STEP 3: SYNCHRONIZE ENVIRONMENT AND CONSTANTS
# ------------------------------------------------------------------------------
echo -e "${CLR_BLUE}[3/6] Synchronizing API configuration and environment...${CLR_RESET}"

# Update .env
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Update EXPO_PUBLIC_API_URL and EXPO_PUBLIC_API_BASE_URL
    sed -i '' "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://${LAN_IP}:8000|g" "$PROJECT_ROOT/.env"
    sed -i '' "s|^EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=http://${LAN_IP}:8000|g" "$PROJECT_ROOT/.env"
    sed -i '' "s|^EXPO_PUBLIC_HARDHAT_RPC_URL=.*|EXPO_PUBLIC_HARDHAT_RPC_URL=http://${LAN_IP}:8545|g" "$PROJECT_ROOT/.env"
else
    cat << EOF > "$PROJECT_ROOT/.env"
ENVIRONMENT=development
ALLOW_DEV_AUTH_HEADERS=true
DATABASE_URL=sqlite:///./trustchain.db
TRUSTCHAIN_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
EXPO_PUBLIC_API_URL=http://${LAN_IP}:8000
EXPO_PUBLIC_API_BASE_URL=http://${LAN_IP}:8000
EXPO_PUBLIC_HARDHAT_RPC_URL=http://${LAN_IP}:8545
EXPO_PUBLIC_LOCAL_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
EXPO_PUBLIC_CHAIN_ID=31337
EOF
fi

# Synchronize LAPTOP_LAN_IP in src/constants/api.ts
if [ -f "$PROJECT_ROOT/src/constants/api.ts" ]; then
    sed -i '' "s|export const LAPTOP_LAN_IP = '.*';|export const LAPTOP_LAN_IP = '${LAN_IP}';|g" "$PROJECT_ROOT/src/constants/api.ts"
fi

# Synchronize LAPTOP_LAN_IP in src/contracts/TrustChainGovernanceABI.ts
if [ -f "$PROJECT_ROOT/src/contracts/TrustChainGovernanceABI.ts" ]; then
    # Ensure explorer uses the active LAN IP
    sed -i '' "s|http://[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}:8545|http://${LAN_IP}:8545|g" "$PROJECT_ROOT/src/contracts/TrustChainGovernanceABI.ts"
fi

echo -e "  ${CLR_GREEN}✓${CLR_RESET} Base API URL configured: ${CLR_BOLD}http://${LAN_IP}:8000${CLR_RESET}"
echo -e "  ${CLR_GREEN}✓${CLR_RESET} Hardhat RPC URL configured: ${CLR_BOLD}http://${LAN_IP}:8545${CLR_RESET}"

# ------------------------------------------------------------------------------
# STEP 4: SERVICE 1 — HARDHAT BLOCKCHAIN NODE (PORT 8545)
# ------------------------------------------------------------------------------
echo -e "${CLR_BLUE}[4/6] Checking Hardhat Blockchain Node (port 8545)...${CLR_RESET}"

is_hardhat_running() {
    local res=$(curl -s -m 2 -X POST http://127.0.0.1:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' 2>/dev/null || echo "")
    if [[ "$res" == *"31337"* ]]; then
        return 0
    fi
    return 1
}

if is_hardhat_running; then
    HH_PID=$(lsof -nP -iTCP:8545 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || echo "")
    echo -e "  ${CLR_GREEN}✓ Hardhat Blockchain node is already active on port 8545${CLR_RESET} (PID: ${HH_PID:-unknown})"
    if [ -n "$HH_PID" ]; then echo "$HH_PID" > "$RUNTIME_DIR/hardhat.pid"; fi
else
    echo -e "  Starting Hardhat Node in separate Terminal window..."
    cat << EOF > "$RUNTIME_DIR/launch_hardhat.sh"
#!/bin/bash
cd "$PROJECT_ROOT/blockchain"
echo \$\$ > "$RUNTIME_DIR/hardhat.pid"
printf '\e]2;TRUSTCHAIN — Blockchain (Hardhat :8545)\a'
echo -e "\033[1;36m==============================================================\033[0m"
echo -e "\033[1;36m  TRUSTCHAIN — Local Hardhat Blockchain (Chain ID 31337)     \033[0m"
echo -e "\033[1;36m  RPC: http://127.0.0.1:8545 | LAN: http://${LAN_IP}:8545      \033[0m"
echo -e "\033[1;36m==============================================================\033[0m"
exec npx hardhat node
EOF
    chmod +x "$RUNTIME_DIR/launch_hardhat.sh"

    osascript -e "tell application \"Terminal\" to do script \"bash \\\"$RUNTIME_DIR/launch_hardhat.sh\\\"\"" >/dev/null 2>&1

    # Wait up to 10 seconds for Hardhat to become responsive
    echo -n "  Waiting for blockchain RPC on port 8545..."
    for i in {1..20}; do
        if is_hardhat_running; then
            echo -e " ${CLR_GREEN}READY!${CLR_RESET}"
            break
        fi
        echo -n "."
        sleep 0.5
    done

    if ! is_hardhat_running; then
        echo -e " ${CLR_RED}TIMEOUT${CLR_RESET}"
        echo -e "${CLR_YELLOW}⚠ Hardhat node took longer to start. Check the Hardhat Terminal window.${CLR_RESET}"
    fi
fi

# Ensure smart contract & demo wallets are initialized
echo -e "  Checking smart contract and demo wallet registration on local node..."
"$PYTHON_BIN" blockchain/scripts/bootstrap_local_node.py 2>&1 | while read -r line; do
    echo -e "    $line"
done

# ------------------------------------------------------------------------------
# STEP 5: SERVICE 2 — FASTAPI BACKEND SERVER (PORT 8000)
# ------------------------------------------------------------------------------
echo -e "${CLR_BLUE}[5/6] Checking FastAPI Backend Server (port 8000)...${CLR_RESET}"

is_backend_running() {
    local res=$(curl -s -m 2 http://127.0.0.1:8000/health 2>/dev/null || echo "")
    if [[ "$res" == *"TRUSTCHAIN-UNIFIED-API"* ]] || [[ "$res" == *"HEALTHY"* ]]; then
        return 0
    fi
    return 1
}

if is_backend_running; then
    BE_PID=$(lsof -nP -iTCP:8000 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || echo "")
    echo -e "  ${CLR_GREEN}✓ FastAPI Backend is already active and healthy on port 8000${CLR_RESET} (PID: ${BE_PID:-unknown})"
    if [ -n "$BE_PID" ]; then echo "$BE_PID" > "$RUNTIME_DIR/backend.pid"; fi
else
    # Check if port 8000 is occupied by an unrelated rogue process
    OCCUPIED_8000=$(lsof -nP -iTCP:8000 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || echo "")
    if [ -n "$OCCUPIED_8000" ]; then
        OCCUPIED_CMD=$(ps -p "$OCCUPIED_8000" -o command= 2>/dev/null || echo "unknown")
        echo -e "  ${CLR_YELLOW}⚠ Port 8000 occupied by PID $OCCUPIED_8000 ($OCCUPIED_CMD). Releasing port...${CLR_RESET}"
        kill -15 "$OCCUPIED_8000" 2>/dev/null || true
        sleep 1
    fi

    echo -e "  Starting FastAPI Backend in separate Terminal window..."
    cat << EOF > "$RUNTIME_DIR/launch_backend.sh"
#!/bin/bash
cd "$PROJECT_ROOT"
echo \$\$ > "$RUNTIME_DIR/backend.pid"
printf '\e]2;TRUSTCHAIN — Backend (FastAPI :8000)\a'
echo -e "\033[1;32m==============================================================\033[0m"
echo -e "\033[1;32m  TRUSTCHAIN — FastAPI & Blockchain Governance Backend Engine \033[0m"
echo -e "\033[1;32m  Host: 0.0.0.0:8000 | LAN URL: http://${LAN_IP}:8000         \033[0m"
echo -e "\033[1;32m  Swagger: http://${LAN_IP}:8000/docs                         \033[0m"
echo -e "\033[1;32m==============================================================\033[0m"
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:8081,http://127.0.0.1:5173,http://${LAN_IP}:8081,http://${LAN_IP}:19006,http://${LAN_IP}:8000,http://${LAN_IP}:3000,http://${LAN_IP}:5173,http://10.0.2.2:8081"
exec "$PYTHON_BIN" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
EOF
    chmod +x "$RUNTIME_DIR/launch_backend.sh"

    osascript -e "tell application \"Terminal\" to do script \"bash \\\"$RUNTIME_DIR/launch_backend.sh\\\"\"" >/dev/null 2>&1

    # Wait up to 10 seconds for Backend to become responsive
    echo -n "  Waiting for backend health check on port 8000..."
    for i in {1..20}; do
        if is_backend_running; then
            echo -e " ${CLR_GREEN}HEALTHY (200 OK)!${CLR_RESET}"
            break
        fi
        echo -n "."
        sleep 0.5
    done

    if ! is_backend_running; then
        echo -e " ${CLR_RED}TIMEOUT${CLR_RESET}"
        echo -e "${CLR_YELLOW}⚠ Backend took longer to start. Check the FastAPI Terminal window for logs.${CLR_RESET}"
    fi
fi

# ------------------------------------------------------------------------------
# STEP 6: SERVICE 3 — EXPO MOBILE APPLICATION FRONTEND (PORT 8081)
# ------------------------------------------------------------------------------
echo -e "${CLR_BLUE}[6/6] Checking Expo Mobile Application Frontend (port 8081)...${CLR_RESET}"

is_expo_running() {
    local occ=$(lsof -nP -iTCP:8081 -sTCP:LISTEN -t 2>/dev/null || echo "")
    if [ -n "$occ" ]; then
        return 0
    fi
    return 1
}

if is_expo_running; then
    EXPO_PID=$(lsof -nP -iTCP:8081 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || echo "")
    echo -e "  ${CLR_GREEN}✓ Expo Metro Bundler is already active on port 8081${CLR_RESET} (PID: ${EXPO_PID:-unknown})"
    if [ -n "$EXPO_PID" ]; then echo "$EXPO_PID" > "$RUNTIME_DIR/frontend.pid"; fi
else
    echo -e "  Starting Expo Metro Bundler in separate Terminal window..."
    cat << EOF > "$RUNTIME_DIR/launch_frontend.sh"
#!/bin/bash
cd "$PROJECT_ROOT"
echo \$\$ > "$RUNTIME_DIR/frontend.pid"
printf '\e]2;TRUSTCHAIN — Frontend (Expo Metro :8081)\a'
echo -e "\033[1;35m==============================================================\033[0m"
echo -e "\033[1;35m  TRUSTCHAIN — Expo Mobile Application (React Native)         \033[0m"
echo -e "\033[1;35m  Mode: LAN | Target Backend: http://${LAN_IP}:8000           \033[0m"
echo -e "\033[1;35m==============================================================\033[0m"
export EXPO_PUBLIC_API_URL="http://${LAN_IP}:8000"
export EXPO_PUBLIC_API_BASE_URL="http://${LAN_IP}:8000"
export EXPO_PUBLIC_HARDHAT_RPC_URL="http://${LAN_IP}:8545"
export EXPO_PUBLIC_CHAIN_ID="31337"
export EXPO_PUBLIC_LOCAL_CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
exec npx expo start --lan --clear
EOF
    chmod +x "$RUNTIME_DIR/launch_frontend.sh"

    osascript -e "tell application \"Terminal\" to do script \"bash \\\"$RUNTIME_DIR/launch_frontend.sh\\\"\"" >/dev/null 2>&1
    echo -e "  ${CLR_GREEN}✓ Expo Metro server launched with --lan --clear${CLR_RESET}"
fi

# ------------------------------------------------------------------------------
# COMPLETE STARTUP SUMMARY FOR JURY DEMONSTRATION
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_GREEN}${CLR_BOLD}==============================================================================${CLR_RESET}"
echo -e "${CLR_GREEN}${CLR_BOLD}             TRUSTCHAIN HACKATHON DEMO ENVIRONMENT READY!                     ${CLR_RESET}"
echo -e "${CLR_GREEN}${CLR_BOLD}==============================================================================${CLR_RESET}"
echo ""
echo -e "  ${CLR_BOLD}Network Host (Mac LAN IP):${CLR_RESET}  ${CLR_CYAN}${LAN_IP}${CLR_RESET}"
echo -e "  ${CLR_BOLD}FastAPI Backend URL:${CLR_RESET}        ${CLR_CYAN}http://${LAN_IP}:8000${CLR_RESET}"
echo -e "  ${CLR_BOLD}FastAPI Health Status:${CLR_RESET}      ${CLR_CYAN}http://${LAN_IP}:8000/health${CLR_RESET}"
echo -e "  ${CLR_BOLD}Interactive Swagger Docs:${CLR_RESET}   ${CLR_CYAN}http://${LAN_IP}:8000/docs${CLR_RESET}"
echo -e "  ${CLR_BOLD}Hardhat Blockchain RPC:${CLR_RESET}     ${CLR_CYAN}http://${LAN_IP}:8545${CLR_RESET}"
echo -e "  ${CLR_BOLD}Expo Metro Bundler:${CLR_RESET}         ${CLR_CYAN}http://${LAN_IP}:8081${CLR_RESET}"
echo ""
echo -e "${CLR_BOLD}CONNECTING YOUR ANDROID PHONE FOR THE DEMO:${CLR_RESET}"
echo -e "  1. Ensure your Android phone is connected to the ${CLR_YELLOW}same Wi-Fi${CLR_RESET} as this Mac."
echo -e "  2. Open the ${CLR_MAGENTA}\"TRUSTCHAIN — Frontend (Expo Metro :8081)\"${CLR_RESET} Terminal window."
echo -e "  3. Scan the printed QR code using the ${CLR_BOLD}Expo Go${CLR_RESET} app on your phone."
echo -e "  4. Test Swagger in your phone's browser: ${CLR_CYAN}http://${LAN_IP}:8000/docs${CLR_RESET}"
echo ""
echo -e "${CLR_BOLD}MANAGEMENT COMMANDS:${CLR_RESET}"
echo -e "  • Check live service health: ${CLR_BOLD}./check-demo.command${CLR_RESET}"
echo -e "  • Safely stop all services:  ${CLR_BOLD}./stop-demo.command${CLR_RESET}"
echo ""
echo -e "${CLR_GREEN}All processes are running and monitored in dedicated Terminal windows.${CLR_RESET}"
echo ""
