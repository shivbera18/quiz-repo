# PowerShell script to fix Prisma permission issues on Windows
# Run as Administrator for best results

Write-Host "=== Prisma Permission Fix Script ===" -ForegroundColor Cyan
Write-Host "This script will fix file permission issues with Prisma query engine" -ForegroundColor Yellow

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Warn if not running as administrator
if (-not (Test-Administrator)) {
    Write-Host "WARNING: Not running as Administrator. Some operations may fail." -ForegroundColor Red
    Write-Host "For best results, right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Stop any running Node.js processes
Write-Host "Step 1: Stopping Node.js processes..." -ForegroundColor Green
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "pnpm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "yarn" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Node.js processes stopped" -ForegroundColor Green
} catch {
    Write-Host "✓ No Node.js processes to stop" -ForegroundColor Green
}

# Step 2: Navigate to project directory
$projectPath = "C:\Users\Shiv\Desktop\Quizzy"
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "✓ Changed to project directory: $projectPath" -ForegroundColor Green
} else {
    Write-Host "✗ Project directory not found: $projectPath" -ForegroundColor Red
    exit 1
}

# Step 3: Find and remove problematic Prisma files
Write-Host "Step 2: Cleaning up Prisma files..." -ForegroundColor Green

$prismaPath = "lib\generated\prisma"
if (Test-Path $prismaPath) {
    # Remove temporary files
    $tempFiles = Get-ChildItem -Path $prismaPath -Filter "*.tmp*" -ErrorAction SilentlyContinue
    foreach ($file in $tempFiles) {
        try {
            Remove-Item $file.FullName -Force
            Write-Host "✓ Removed temp file: $($file.Name)" -ForegroundColor Green
        } catch {
            Write-Host "✗ Could not remove: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Remove query engine files that might be locked
    $queryEngineFiles = Get-ChildItem -Path $prismaPath -Filter "*query_engine*" -ErrorAction SilentlyContinue
    foreach ($file in $queryEngineFiles) {
        try {
            Remove-Item $file.FullName -Force
            Write-Host "✓ Removed query engine file: $($file.Name)" -ForegroundColor Green
        } catch {
            Write-Host "! Could not remove: $($file.Name) - Will regenerate" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "! Prisma directory not found, will be created during install" -ForegroundColor Yellow
}

# Step 4: Clear npm/pnpm cache
Write-Host "Step 3: Clearing package manager cache..." -ForegroundColor Green
try {
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        pnpm store prune
        Write-Host "✓ PNPM cache cleared" -ForegroundColor Green
    } elseif (Get-Command "npm" -ErrorAction SilentlyContinue) {
        npm cache clean --force
        Write-Host "✓ NPM cache cleared" -ForegroundColor Green
    }
} catch {
    Write-Host "! Could not clear cache: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 5: Remove node_modules and reinstall
Write-Host "Step 4: Cleaning node_modules..." -ForegroundColor Green
if (Test-Path "node_modules") {
    try {
        Remove-Item "node_modules" -Recurse -Force
        Write-Host "✓ Removed node_modules" -ForegroundColor Green
    } catch {
        Write-Host "✗ Could not remove node_modules: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 6: Remove lock files
Write-Host "Step 5: Removing lock files..." -ForegroundColor Green
@("package-lock.json", "pnpm-lock.yaml", "yarn.lock") | ForEach-Object {
    if (Test-Path $_) {
        try {
            Remove-Item $_ -Force
            Write-Host "✓ Removed $_" -ForegroundColor Green
        } catch {
            Write-Host "✗ Could not remove $_" -ForegroundColor Red
        }
    }
}

# Step 7: Reinstall dependencies
Write-Host "Step 6: Reinstalling dependencies..." -ForegroundColor Green
try {
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        Write-Host "Using PNPM..." -ForegroundColor Cyan
        pnpm install
    } elseif (Get-Command "npm" -ErrorAction SilentlyContinue) {
        Write-Host "Using NPM..." -ForegroundColor Cyan
        npm install
    } else {
        Write-Host "✗ No package manager found (npm/pnpm)" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies reinstalled" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 8: Generate Prisma client
Write-Host "Step 7: Generating Prisma client..." -ForegroundColor Green
try {
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        pnpm prisma generate
    } else {
        npx prisma generate
    }
    Write-Host "✓ Prisma client generated" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to generate Prisma client: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 9: Try to build the project
Write-Host "Step 8: Testing build..." -ForegroundColor Green
try {
    if (Get-Command "pnpm" -ErrorAction SilentlyContinue) {
        pnpm build
    } else {
        npm run build
    }
    Write-Host "✓ Build successful!" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check the error messages above for specific issues." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Script Complete ===" -ForegroundColor Cyan
Write-Host "If you still have issues:" -ForegroundColor Yellow
Write-Host "1. Restart your computer" -ForegroundColor White
Write-Host "2. Temporarily disable antivirus" -ForegroundColor White
Write-Host "3. Run PowerShell as Administrator" -ForegroundColor White
Write-Host "4. Check if any IDE/editor has the project open" -ForegroundColor White

# Pause to see results
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
