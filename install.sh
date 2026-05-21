#!/usr/bin/env bash
# Agent OS Notebook — one-paste installer for macOS
# Usage: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/brandonabaki-design/jsdlgj/claude/confident-curie-5agwS/install.sh)"

set -e

BRANCH="claude/confident-curie-5agwS"
REPO_HTTPS="https://github.com/brandonabaki-design/jsdlgj.git"
INSTALL_DIR="$HOME/Agent-OS-Notebook"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

say()  { printf "${BLUE}==>${NC} %s\n" "$1"; }
ok()   { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}!${NC} %s\n" "$1"; }
err()  { printf "${RED}✗${NC} %s\n" "$1"; }

cat <<'BANNER'

  ┌─────────────────────────────────────────────┐
  │     Agent OS Notebook — installer (macOS)   │
  └─────────────────────────────────────────────┘

This will:
  1) Install Homebrew (if missing) — needs your Mac password
  2) Install Node.js and git (if missing)
  3) Clone the app to ~/Agent-OS-Notebook
  4) Ask you to paste your Anthropic API key
  5) Build and start the app, then open it in your browser

BANNER

read -r -p "Press Return to continue, or Ctrl-C to cancel. " _

# ───────────── 1. Homebrew ─────────────
if ! command -v brew >/dev/null 2>&1; then
  say "Installing Homebrew (you'll be asked for your Mac login password)…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Make brew available on Apple Silicon and Intel
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    grep -q 'opt/homebrew/bin/brew shellenv' "$HOME/.zprofile" 2>/dev/null \
      || echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  ok "Homebrew installed"
else
  ok "Homebrew already installed"
fi

# ───────────── 2. Node + git ─────────────
NEEDED=()
command -v node >/dev/null 2>&1 || NEEDED+=(node)
command -v git  >/dev/null 2>&1 || NEEDED+=(git)
if (( ${#NEEDED[@]} )); then
  say "Installing: ${NEEDED[*]}"
  brew install "${NEEDED[@]}"
fi
ok "Node $(node -v),  git $(git --version | awk '{print $3}')"

# ───────────── 3. Clone ─────────────
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  say "Cloning the app to $INSTALL_DIR …"
  if ! git clone "$REPO_HTTPS" "$INSTALL_DIR" 2>/dev/null; then
    warn "Public clone failed — the repo is probably private."
    echo
    echo "  You need to authenticate. Easiest way:"
    echo "    1) brew install gh"
    echo "    2) gh auth login   (pick GitHub.com → HTTPS → login with browser)"
    echo "    3) Re-run this installer"
    echo
    exit 1
  fi
else
  say "Repo already cloned — updating…"
fi

cd "$INSTALL_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
git pull --ff-only origin "$BRANCH"
ok "Code is up to date on branch $BRANCH"

# ───────────── 4. Install deps ─────────────
say "Installing dependencies (≈30 seconds the first time)…"
npm install --no-audit --no-fund --silent
ok "Dependencies installed"

# ───────────── 5. API key ─────────────
if [[ ! -f .env.local ]] || ! grep -q '^ANTHROPIC_API_KEY=sk-' .env.local 2>/dev/null; then
  echo
  echo "${YELLOW}Anthropic API key${NC}"
  echo "  Get one (free to create, pay-as-you-go after):"
  echo "  https://console.anthropic.com/settings/keys"
  echo "  It starts with sk-ant-"
  echo
  read -r -p "Paste your key and press Return: " KEY
  while [[ -z "$KEY" || "$KEY" != sk-ant-* ]]; do
    warn "That doesn't look like an Anthropic key (should start with 'sk-ant-')."
    read -r -p "Try again, or Ctrl-C to abort: " KEY
  done
  printf "ANTHROPIC_API_KEY=%s\n" "$KEY" > .env.local
  ok "Saved your key to .env.local (this file stays on your computer only)"
else
  ok "API key already configured"
fi

# ───────────── 6. Build + start ─────────────
say "Building the app (≈30 seconds)…"
npm run build --silent
ok "Build complete"

echo
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN} Starting Agent OS Notebook at http://localhost:3000${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "  • Your browser will open automatically in a moment."
echo "  • Leave this Terminal window OPEN to keep the app running."
echo "  • To stop the app: press Ctrl-C in this window."
echo "  • To start it again later: open Terminal and run"
echo "      cd ~/Agent-OS-Notebook && npm start"
echo

( sleep 3 && open http://localhost:3000 ) &
exec npm start
