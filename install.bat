@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo ========================================
echo    HMK홀딩스 지식Agent 프로젝트 설치
echo ========================================
echo.

echo [1/3] Node.js 설치 확인 중...
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js가 설치되어 있지 않습니다.
    echo Node.js LTS 버전을 설치한 뒤 다시 실행하세요: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Node.js 설치 확인 완료
node --version

echo.
echo [2/3] 필요한 파일 확인 중...
if not exist package.json (
    echo package.json 파일이 없습니다.
    pause
    exit /b 1
)

if not exist App.tsx (
    echo App.tsx 파일이 없습니다.
    pause
    exit /b 1
)

if not exist data\data.json (
    echo data.json 파일이 없습니다.
    pause
    exit /b 1
)

echo 모든 필요한 파일이 존재합니다.

echo.
echo [3/3] 의존성 설치 중...
call npm install
if errorlevel 1 (
    echo 의존성 설치에 실패했습니다. 오류 메시지를 확인하세요.
    pause
    exit /b 1
)

echo.
echo [4/4] 설치 완료!
echo.
echo 이제 start.bat를 실행하여 개발 서버를 시작할 수 있습니다.
echo.
pause
exit /b 0


