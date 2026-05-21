# Run me first (Mac)

Open **Terminal** (Cmd+Space → type "Terminal" → Return), then paste this single line:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/brandonabaki-design/jsdlgj/claude/confident-curie-5agwS/install.sh)"
```

It will:

1. Ask for your Mac password once (to install Homebrew / Node if you don't have them)
2. Download the app to `~/Agent-OS-Notebook`
3. Ask you to paste your **Anthropic API key** (get one at https://console.anthropic.com/settings/keys — starts with `sk-ant-`)
4. Build the app
5. Open `http://localhost:3000` in your browser

**Leave the Terminal window open** while you use the app. To stop the app, press `Ctrl+C` in that Terminal window. To start it again later:

```bash
cd ~/Agent-OS-Notebook && npm start
```

That's it.
