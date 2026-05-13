# Bootstraps the depthfolio repo with an atomic commit history (Windows PowerShell version).
# Run this ONCE from the repo root after Claude prepares files.
#
#   .\tools\setup-git-history.ps1
#
# Re-running this destroys any local commits and starts over.

$ErrorActionPreference = "Stop"

if (-not (Test-Path "README.md") -or -not (Test-Path "apps")) {
    Write-Error "Run this from the repo root (where README.md and apps/ live)."
    exit 1
}

Write-Host "==> Resetting git history (this destroys any existing .git folder)" -ForegroundColor Yellow
if (Test-Path ".git") {
    # Remove read-only attribute on .git contents if present (Windows quirk)
    Get-ChildItem ".git" -Recurse -Force | ForEach-Object {
        try { $_.Attributes = 'Normal' } catch {}
    }
    Remove-Item ".git" -Recurse -Force
}

git init -b main | Out-Null
git config user.name "Adrián León"
git config user.email "adrian.leon.alonso@gmail.com"

function Invoke-Commit {
    param([string]$Message, [string[]]$Paths)
    git add -- $Paths
    git commit -m $Message --no-verify | Out-Null
    Write-Host "  OK  $Message" -ForegroundColor Green
}

Write-Host "==> Creating atomic commits" -ForegroundColor Yellow

Invoke-Commit "chore: initial commit with README, LICENSE and editor config" `
    @("README.md", "LICENSE", ".gitignore", ".editorconfig", "CLAUDE.md")

Invoke-Commit "docs: add architecture documentation and ADRs" `
    @("docs/")

Invoke-Commit "chore: scaffold apps/web and apps/api folder structure" `
    @("apps/")

Invoke-Commit "docs(skills): add knowledge bundles for the five technical domains" `
    @(".skills/")

Invoke-Commit "chore(tools): add git history bootstrap script" `
    @("tools/")

Write-Host ""
Write-Host "==> Done. Commit history:" -ForegroundColor Cyan
git log --oneline --decorate

Write-Host ""
Write-Host "==> Next steps:" -ForegroundColor Cyan
Write-Host "  1. Create an empty public repo at https://github.com/new (name it 'depthfolio')."
Write-Host "  2. Add the remote and push:"
Write-Host "       git remote add origin git@github.com:<your-user>/depthfolio.git"
Write-Host "       git push -u origin main"
