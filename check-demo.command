#!/bin/bash
# ==============================================================================
# TRUSTCHAIN — Live Demo Health & Status Inspector (macOS)
# Checks process status, network connectivity, API health, Swagger docs,
# and blockchain node availability.
# ==============================================================================

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_RED="\033[1;31m"
CLR_GREEN="\033[1;32m"
CLR_YELLOW="\033[1;33m"
CLR_BLUE="\033[1;34m"
CLR_CYAN="\033[1;36m"
CLR_MAGENTA="\033[1;35m"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"
RUNTIME_DIR="$PROJECT_ROOT/.demo-runtime"

echo -e "${CLR_CYAN}${CLR_BOLD}"
echo "=============================================================================="
echo "          TRUSTCHAIN — Live Demo Health & Status Inspector                    "
echo "=============================================================================="
echo -e "${CLR_RESET}"

# 1. Detect LAN IP
detect_lan_ip() {
    local ip=""
    for iface in en0 en1 en2 en3; do
        ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
        if [ -n "$ip" ] && [ "$ip" != "127.0.0.1" ] && [ "$ip" != "0.0.0.0" ]; then
            echo "$ip"
            return 0
        fi
    done
    local def_iface=$(route get default 2>/dev/null | grep 'interface:' | awk '{print $2}' || true)
    if [ -n "$def_iface" ]; then
        ip=$(ipconfig getifaddr "$def_iface" 2>/dev/null || true)
        if [ -n "$ip" ] && [ "$ip" != "127.0.0.1" ] && [ "$ip" != "0.0.0.0" ]; then
            echo "$ip"
            return 0
        fi
    fi
    ip=$(ifconfig 2>/dev/null | grep -E "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -n 1 || true)
    if [ -n "$ip" ] && [ "$ip" != "0.0.0.0" ]; then
        echo "$ip"
        return 0
    fi
    echo "127.0.0.1"
}

LAN_IP=$(detect_lan_ip)

echo -e "${CLR_BOLD}NETWORK ENVIRONMENT:${CLR_RESET}"
echo -e "  • Detected Mac LAN IP:  ${CLR_CYAN}${CLR_BOLD}${LAN_IP}${CLR_RESET}"
echo -e "  • Mobile Base API URL:  ${CLR_CYAN}http://${LAN_IP}:8000${CLR_RESET}"
echo -e "  • Mobile Hardhat RPC:   ${CLR_CYAN}http://${LAN_IP}:8545${CLR_RESET}"
echo ""

# 2. Check Hardhat Blockchain Node
echo -e "${CLR_BOLD}1. BLOCKCHAIN LAYER (Hardhat Node :8545)${CLR_RESET}"
HH_PID=$(lsof -nP -iTCP:8545 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || echo "")
if [ -n "$HH_PID" ]; then
    HH_JSON=$(curl -s -m 2 -X POST http://127.0.0.1:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' 2>/dev/null || echo "")
    if [[ "$HH_JSON" == *"31337"* ]]; then
        BLOCK_HEX=$(curl -s -m 2 -X POST http://127.0.0.1:8545 \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":2}' 2>/dev/null | grep -o '"result":"[^"]*"' | cut -d'"' -f4 || echo "0x0")
        BLOCK_DEC=$((16#${BLOCK_HEX#0x}))
        echo -e "  • Status:       ${CLR_GREEN}[ONLINE]${CLR_RESET} (PID: ${HH_PID})"
        echo -e "  • Chain ID:     ${CLR_BOLD}31337${CLR_RESET} (Local Hardhat Node)"
        echo -e "  • Latest Block: ${CLR_BOLD}${BLOCK_DEC}${CLR_RESET}"
    else
        echo -e "  • Status:       ${CLR_YELLOW}[PORT OCCUPIED BUT RPC NOT RESPONDING]${CLR_RESET} (PID: ${HH_PID})"
    fi
else
    echo -e "  • Status:       ${CLR_RED}[OFFLINE]${CLR_RESET} Port 8545 is free."
fi
echo ""

# 3. Check FastAPI Backend
echo -e "${CLR_BOLD}2. BACKEND API LAYER (FastAPI / Uvicorn :8000)${CLR_RESET}"
BE_PID=$(lsof -nP -iTCP:8000 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || echo "")
if [ -n "$BE_PID" ]; then
    HEALTH_RESP=$(curl -s -m 2 http://127.0.0.1:8000/health 2>/dev/null || echo "")
    if [[ "$HEALTH_RESP" == *"TRUSTCHAIN-UNIFIED-API"* ]] || [[ "$HEALTH_RESP" == *"HEALTHY"* ]]; then
        echo -e "  • Status:        ${CLR_GREEN}[ONLINE]${CLR_RESET} (PID: ${BE_PID})"
        echo -e "  • Health Check:  ${CLR_GREEN}HTTP 200 OK${CLR_RESET} (${HEALTH_RESP})"
        
        # Test LAN Reachability
        LAN_HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 2 "http://${LAN_IP}:8000/health" 2>/dev/null || echo "FAIL")
        if [ "$LAN_HEALTH_CODE" == "200" ]; then
            echo -e "  • LAN Access:    ${CLR_GREEN}REACHABLE${CLR_RESET} via http://${LAN_IP}:8000/health"
        else
            echo -e "  • LAN Access:    ${CLR_RED}UNREACHABLE${CLR_RESET} (HTTP ${LAN_HEALTH_CODE})"
        fi

        # Test Swagger Docs
        SWAGGER_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 2 "http://${LAN_IP}:8000/docs" 2>/dev/null || echo "FAIL")
        if [ "$SWAGGER_CODE" == "200" ]; then
            echo -e "  • Swagger Docs:  ${CLR_GREEN}AVAILABLE${CLR_RESET} (http://${LAN_IP}:8000/docs)"
        else
            echo -e "  • Swagger Docs:  ${CLR_YELLOW}HTTP ${SWAGGER_CODE}${CLR_RESET}"
        fi

        # Check Chain Status endpoint
        CHAIN_RESP=$(curl -s -m 2 "http://127.0.0.1:8000/api/v1/chain/status" 2>/dev/null || echo "")
        if [ -n "$CHAIN_RESP" ]; then
            echo -e "  • Chain Status:  ${CLR_BOLD}${CHAIN_RESP}${CLR_RESET}"
        fi
    else
        echo -e "  • Status:        ${CLR_YELLOW}[PORT OCCUPIED BUT HEALTH NOT RESPONDING]${CLR_RESET} (PID: ${BE_PID})"
    fi
else
    echo -e "  • Status:        ${CLR_RED}[OFFLINE]${CLR_RESET} Port 8000 is free."
fi
echo ""

# 4. Check Frontend Metro Bundler
echo -e "${CLR_BOLD}3. FRONTEND MOBILE LAYER (Expo Metro :8081)${CLR_RESET}"
FE_PID=$(lsof -nP -iTCP:8081 -sTCP:LISTEN -t 2>/dev/null | head -n 1 || echo "")
if [ -n "$FE_PID" ]; then
    echo -e "  • Status:        ${CLR_GREEN}[ONLINE]${CLR_RESET} (PID: ${FE_PID})"
    echo -e "  • Bundler URL:   ${CLR_CYAN}http://${LAN_IP}:8081${CLR_RESET}"
else
    echo -e "  • Status:        ${CLR_RED}[OFFLINE]${CLR_RESET} Port 8081 is free."
fi
echo ""

# 5. Mobile Testing Readiness Checklist
echo -e "${CLR_BOLD}==============================================================================${CLR_RESET}"
echo -e "${CLR_BOLD}JURY DEMO READINESS SUMMARY:${CLR_RESET}"
if [ -n "$HH_PID" ] && [ -n "$BE_PID" ] && [ -n "$FE_PID" ]; then
    echo -e "  ${CLR_GREEN}✓ ALL SYSTEMS GO: Hardhat, FastAPI, and Expo are running!${CLR_RESET}"
    echo -e "  Open Expo Go on your phone to interact with the mobile app."
elif [ -n "$HH_PID" ] && [ -n "$BE_PID" ]; then
    echo -e "  ${CLR_YELLOW}⚠ Hardhat and Backend are running. Start Expo with ./start-demo.command${CLR_RESET}"
else
    echo -e "  ${CLR_RED}✖ One or more core services are offline. Run ./start-demo.command to launch.${CLR_RESET}"
fi
echo -e "${CLR_BOLD}==============================================================================${CLR_RESET}"
echo ""
