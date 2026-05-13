#!/usr/bin/env bash
#
# Bootstraps the depthfolio repo with an atomic commit history.
# Run this ONCE from the repo root after cloning or after Claude prepares files.
#
#   chmod +x tools/setup-git-history.sh
#   ./tools/setup-git-history.sh
#
# Or on Windows Git Bash:
#   bash tools/setup-git-history.sh
#
# Re-running this destroys any local commits and starts over.

set -euo pipefail

if [ ! -f "README.md" ] || [ ! -d "apps" ]; then
  echo "ERROR: run this from the repo root (where README.md and apps/ live)."
  exit 1
fi

echo "==> Resetting git history (this destroys any existing .git folder)"
rm -rf .git

git init -b main
git config user.name "Adrián León"
git config user.email "adrian.leon.alonso@gmail.com"

commit() {
  local message="$1"
  shift
  git add -- "$@"
  git commit -m "$message" --no-verify > /dev/null
  echo "  ✓ ${message}"
}

echo "==> Creating atomic commits"

commit "chore: initial commit with README, LICENSE and editor config" \
  README.md LICENSE .gitignore .editorconfig CLAUDE.md

commit "docs: add architecture documentation and ADRs" \
  docs/

commit "chore: scaffold apps/web and apps/api folder structure" \
  apps/

commit "docs(skills): add knowledge bundles for the five technical domains" \
  .skills/

commit "chore(tools): add git history bootstrap script" \
  tools/

echo ""
echo "==> Done. Commit history:"
git log --oneline --decorate

echo ""
echo "==> Next steps:"
echo "  1. Create an empty public repo at https://github.com/new (name it 'depthfolio')."
echo "  2. Add the remote and push:"
echo "       git remote add origin git@github.com:<your-user>/depthfolio.git"
echo "       git push -u origin main"
