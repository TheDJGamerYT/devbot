# DevBot Build Context

This folder is your Docker build context for the multi-bot + VS Code Server container.
- Build locally: `docker build -t ghcr.io/<user>/devbot:latest .`
- Or push via GitHub Actions (workflow included in `.github/workflows/publish-ghcr.yml`).

At runtime the container seeds `/workspace` with examples if empty.
Put each bot under:
- `/workspace/bots/node/<bot-name>/` with `index.js` (and `.env` with DISCORD_TOKEN)
- `/workspace/bots/python/<bot-name>/` with `main.py` (and `.env` with DISCORD_TOKEN)
