# tools/

Project-level scripts. Not deployed; only used during local setup and development.

## setup-git-history

Bootstraps the repo with an atomic commit history. Run **once** after the file structure has been generated, before pushing to GitHub.

```bash
# Git Bash / WSL / macOS / Linux
chmod +x tools/setup-git-history.sh
./tools/setup-git-history.sh

# Windows PowerShell
.\tools\setup-git-history.ps1
```

What it does:

1. Resets any existing `.git/` folder.
2. Initialises a fresh repository on `main`.
3. Creates five atomic commits scoped to logical units (foundation, docs, structure, skills, tools).
4. Prints the resulting log and the next-step commands for pushing.

## setup-skills

Clones two external design/UX skills into `.claude/skills/` so they're discoverable by Claude Code when you open this repo.

```bash
# Git Bash / WSL / macOS / Linux
chmod +x tools/setup-skills.sh
./tools/setup-skills.sh

# Windows PowerShell
.\tools\setup-skills.ps1
```

Installs:

- [`emil-design-eng`](https://github.com/emilkowalski/skill) — Emil Kowalski's design engineering philosophy: animation timing, easing, micro-interactions, component polish.
- [`ui-ux-pro-max`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — design intelligence database with 67 UI styles, 161 colour palettes, 57 font pairings, 99 UX guidelines.

The cloned skills land under `.claude/skills/<skill-name>/` with their internal `.git/` stripped, so they don't become nested repositories. The script is idempotent — rerun to refresh to latest `main`.

## After both scripts

```bash
git add .claude/skills tools/
git commit -m "chore: install external design skills"
```
