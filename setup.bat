
@echo off
echo Setting up Rayin Translation Website...

cd /d "%~dp0"

if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies. Please check if Node.js is installed.
        pause
        exit /b 1
    )
)

echo Seeding database from markdown files...
call npm run seed

echo Starting development server...
call npm run dev
