# Installs external design/UX skills into .claude/skills/ so they are
# discoverable by Claude Code in this repository.
#
# Run from the repo root:
#   .\tools\setup-skills.ps1
#
# Idempotent: rerunning updates the skills to latest main.

$ErrorActionPreference = "Stop"

if (-not (Test-Path "README.md") -or -not (Test-Path "apps")) {
    Write-Error "Run this from the repo root (where README.md and apps/ live)."
    exit 1
}

New-Item -ItemType Directory -Force -Path ".claude/skills" | Out-Null

function Install-Skill {
    param(
        [string]$RepoUrl,
        [string]$TargetName,
        [string]$InternalPath
    )
    $tmp = New-Item -ItemType Directory -Path ([System.IO.Path]::Combine($env:TEMP, "skill-" + [Guid]::NewGuid().ToString())) -Force
    Write-Host "==> Fetching $TargetName from $RepoUrl" -ForegroundColor Yellow
    git clone --depth 1 $RepoUrl (Join-Path $tmp "clone") | Out-Null

    $targetDir = ".claude/skills/$TargetName"
    if (Test-Path $targetDir) {
        # Strip read-only flags before remove (Windows quirk for .git internals)
        Get-ChildItem $targetDir -Recurse -Force | ForEach-Object { try { $_.Attributes = 'Normal' } catch {} }
        Remove-Item $targetDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

    $source = if ($InternalPath -eq ".") { (Join-Path $tmp "clone") } else { (Join-Path (Join-Path $tmp "clone") $InternalPath) }
    Copy-Item -Path (Join-Path $source "*") -Destination $targetDir -Recurse -Force

    $cloneGitDir = Join-Path $targetDir ".git"
    if (Test-Path $cloneGitDir) {
        Get-ChildItem $cloneGitDir -Recurse -Force | ForEach-Object { try { $_.Attributes = 'Normal' } catch {} }
        Remove-Item $cloneGitDir -Recurse -Force
    }

    Remove-Item $tmp -Recurse -Force
    Write-Host "  OK  installed at $targetDir" -ForegroundColor Green
}

Install-Skill `
    -RepoUrl "https://github.com/emilkowalski/skill.git" `
    -TargetName "emil-design-eng" `
    -InternalPath "skills/emil-design-eng"

Install-Skill `
    -RepoUrl "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git" `
    -TargetName "ui-ux-pro-max" `
    -InternalPath "."

Write-Host ""
Write-Host "==> Skills installed under .claude/skills/:" -ForegroundColor Cyan
Get-ChildItem -Path ".claude/skills" -Directory | Select-Object -ExpandProperty Name
Write-Host ""
Write-Host "Claude Code will discover them automatically when you next open the repo." -ForegroundColor Cyan
