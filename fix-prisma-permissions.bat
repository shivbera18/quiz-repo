@echo off
echo === Prisma Permission Fix Script ===
echo This script will fix file permission issues with Prisma query engine
echo.

echo Step 1: Stopping Node.js processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1
taskkill /f /im pnpm.exe >nul 2>&1
echo ✓ Processes stopped

echo Step 2: Cleaning Prisma files...
cd /d "C:\Users\Shiv\Desktop\Quizzy"
if exist "lib\generated\prisma" (
    del /f /q "lib\generated\prisma\*.tmp*" >nul 2>&1
    del /f /q "lib\generated\prisma\*query_engine*" >nul 2>&1
    echo ✓ Prisma files cleaned
) else (
    echo ! Prisma directory not found
)

echo Step 3: Cleaning project...
if exist "node_modules" (
    rmdir /s /q "node_modules" >nul 2>&1
    echo ✓ node_modules removed
)

del /f /q "package-lock.json" >nul 2>&1
del /f /q "pnpm-lock.yaml" >nul 2>&1
del /f /q "yarn.lock" >nul 2>&1
echo ✓ Lock files removed

echo Step 4: Reinstalling dependencies...
where pnpm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using PNPM...
    pnpm install
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Dependencies installed
        echo Step 5: Generating Prisma client...
        pnpm prisma generate
        if %ERRORLEVEL% EQU 0 (
            echo ✓ Prisma client generated
            echo Step 6: Testing build...
            pnpm build
            if %ERRORLEVEL% EQU 0 (
                echo ✓ Build successful!
            ) else (
                echo ✗ Build failed
            )
        ) else (
            echo ✗ Prisma generation failed
        )
    ) else (
        echo ✗ Install failed
    )
) else (
    echo Using NPM...
    npm install
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Dependencies installed
        echo Step 5: Generating Prisma client...
        npx prisma generate
        if %ERRORLEVEL% EQU 0 (
            echo ✓ Prisma client generated
            echo Step 6: Testing build...
            npm run build
            if %ERRORLEVEL% EQU 0 (
                echo ✓ Build successful!
            ) else (
                echo ✗ Build failed
            )
        ) else (
            echo ✗ Prisma generation failed
        )
    ) else (
        echo ✗ Install failed
    )
)

echo.
echo === Script Complete ===
echo If you still have issues:
echo 1. Restart your computer
echo 2. Run as Administrator
echo 3. Temporarily disable antivirus
echo.
pause
