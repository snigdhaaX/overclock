#!/bin/bash
# ==============================================================================
# TRUSTCHAIN — Safe Demo Shutdown Manager (macOS)
# Safely terminates only TRUSTCHAIN demo processes (Hardhat, Backend, Expo)
# without affecting unrelated user development processes.
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

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"
RUNTIME_DIR="$PROJECT_ROOT/.demo-runtime"

echo -e "${CLR_CYAN}${CLR_BOLD}"
echo "=============================================================================="
echo "          TRUSTCHAIN — Safe Demo Shutdown Manager                             "
echo "=============================================================================="
echo -e "${CLR_RESET}"

# Function to safely terminate a process by PID with command verification
safe_stop_pid() {
    local service_name="$1"
    local pid="$2"
    local expected_pattern="$3"

    if [ -z "$pid" ]; then return 0; fi

    # Check if PID exists
    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "  • ${service_name} (PID ${pid}): already stopped."
        return 0
    fi

    # Inspect command line to prevent killing unrelated processes
    local cmd=$(ps -p "$pid" -o command= 2>/dev/null || echo "")
    if [[ "$cmd" != *"$expected_pattern"* ]] && [[ "$cmd" != *"python"* ]] && [[ "$cmd" != *"node"* ]]; then
        echo -e "  ${CLR_YELLOW}⚠ PID ${pid} does not match ${expected_pattern} (${cmd}). Skipping to protect unrelated process.${CLR_RESET}"
        return 0
    fi

    echo -n "  • Stopping ${service_name} (PID ${pid})..."
    
    # Terminate child processes first
    pkill -P "$pid" 2>/dev/null || true
    
    # Graceful SIGTERM
    kill -15 "$pid" 2>/dev/null || true

    # Wait up to 3 seconds for graceful exit
    for i in {1..6}; do
        if ! kill -0 "$pid" 2>/dev/null; then
            echo -e " ${CLR_GREEN}STOPPED${CLR_RESET}"
            return 0
        fi
        sleep 0.5
    done

    # Force SIGKILL if still lingering
    echo -n " force terminating..."
    kill -9 "$pid" 2>/dev/null || true
    pkill -9 -P "$pid" 2>/dev/null || true
    sleep 0.5
    echo -e " ${CLR_GREEN}TERMINATED${CLR_RESET}"
}

# Function to check and clean a port if held by a Trustchain process
safe_clean_port() {
    local service_name="$1"
    local port="$2"
    local expected_pattern="$3"

    local pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || echo "")
    for p in $pids; do
        if [ -n "$p" ]; then
            local cmd=$(ps -p "$p" -o command= 2>/dev/null || echo "")
            if [[ "$cmd" == *"$expected_pattern"* ]] || [[ "$cmd" == *"trustchain"* ]] || [[ "$cmd" == *"uvicorn"* ]] || [[ "$cmd" == *"hardhat"* ]] || [[ "$cmd" == *"metro"* ]]; then
                echo -n "  • Releasing port ${port} from ${service_name} (PID ${p})..."
                pkill -P "$p" 2>/dev/null || true
                kill -15 "$p" 2>/dev/null || true
                sleep 0.5
                if kill -0 "$p" 2>/dev/null; then
                    kill -9 "$p" 2>/dev/null || true
                fi
                echo -e " ${CLR_GREEN}RELEASED${CLR_RESET}"
            fi
        fi
    done
}

echo -e "${CLR_BLUE}Stopping registered TRUSTCHAIN demo processes...${CLR_RESET}"

# 1. Stop FastAPI Backend
if [ -f "$RUNTIME_DIR/backend.pid" ]; then
    BE_PID=$(cat "$RUNTIME_DIR/backend.pid" 2>/dev/null || echo "")
    safe_stop_pid "FastAPI Backend" "$BE_PID" "uvicorn"
    rm -f "$RUNTIME_DIR/backend.pid"
fi
safe_clean_port "FastAPI Backend" 8000 "backend.app.main:app"

# 2. Stop Expo Frontend / Metro
if [ -f "$RUNTIME_DIR/frontend.pid" ]; then
    FE_PID=$(cat "$RUNTIME_DIR/frontend.pid" 2>/dev/null || echo "")
    safe_stop_pid "Expo Metro Bundler" "$FE_PID" "expo"
    rm -f "$RUNTIME_DIR/frontend.pid"
fi
safe_clean_port "Expo Metro Bundler" 8081 "metro"

# 3. Stop Hardhat Blockchain Node
if [ -f "$RUNTIME_DIR/hardhat.pid" ]; then
    HH_PID=$(cat "$RUNTIME_DIR/hardhat.pid" 2>/dev/null || echo "")
    safe_stop_pid "Hardhat Blockchain Node" "$HH_PID" "hardhat"
    rm -f "$RUNTIME_DIR/hardhat.pid"
fi
safe_clean_port "Hardhat Blockchain Node" 8545 "hardhat"

# ------------------------------------------------------------------------------
# VERIFY PORTS ARE RELEASED
# ------------------------------------------------------------------------------
echo ""
echo -e "${CLR_BLUE}Verifying port release status:${CLR_RESET}"

check_port_status() {
    local port="$1"
    local name="$2"
    local occ=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || echo "")
    if [ -z "$occ" ]; then
        echo -e "  ${CLR_GREEN}✓ Port ${port} (${name}): FREE${CLR_RESET}"
    else
        local cmd=$(ps -p "$occ" -o command= 2>/dev/null || echo "unknown")
        echo -e "  ${CLR_YELLOW}⚠ Port ${port} (${name}): in use by PID ${occ} (${cmd})${CLR_RESET}"
    fi
}

check_port_status 8545 "Hardhat Blockchain"
check_port_status 8000 "FastAPI Backend"
check_port_status 8081 "Expo Metro Bundler"

echo ""
echo -e "${CLR_GREEN}${CLR_BOLD}All TRUSTCHAIN demo services have been safely stopped.${CLR_RESET}"
echo -e "To restart the demonstration at any time, run: ${CLR_BOLD}./start-demo.command${CLR_RESET}"
echo ""
