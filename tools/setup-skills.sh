#!/usr/bin/env bash
#
# Installs external design/UX skills into .claude/skills/ so they are
# discoverable by Claude Code in this repository.
#
# Run from the repo root:
#   chmod +x tools/setup-skills.sh
#   ./tools/setup-skills.sh
#
# Idempotent: rerunning updates the skills to latest main.

set -euo pipefail

if [ ! -f "README.md" ] || [ ! -d "apps" ]; then
  echo "ERROR: run this from the repo root (where README.md and apps/ live)."
  exit 1
fi

mkdir -p .claude/skills

install_skill() {
  local repo_url="$1"
  local target_name="$2"
  local internal_path="$3"   # path inside the cloned repo where SKILL.md lives, or "." for repo root

  local tmpdir
  tmpdir=$(mktemp -d)
  echo "==> Fetching ${target_name} from ${repo_url}"
  git clone --depth 1 "${repo_url}" "${tmpdir}/clone" > /dev/null 2>&1

  local target_dir=".claude/skills/${target_name}"
  rm -rf "${target_dir}"
  mkdir -p "${target_dir}"

  if [ "${internal_path}" = "." ]; then
    cp -r "${tmpdir}/clone/." "${target_dir}/"
  else
    cp -r "${tmpdir}/clone/${internal_path}/." "${target_dir}/"
  fi
  # Strip the cloned .git folder so the skill doesn't become a nested repo
  rm -rf "${target_dir}/.git"

  rm -rf "${tmpdir}"
  echo "  ✓ installed at ${target_dir}"
}

install_skill \
  "https://github.com/emilkowalski/skill.git" \
  "emil-design-eng" \
  "skills/emil-design-eng"

install_skill \
  "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git" \
  "ui-ux-pro-max" \
  "."

echo ""
echo "==> Skills installed under .claude/skills/:"
ls -1 .claude/skills/
echo ""
echo "Claude Code will discover them automatically when you next open the repo."
