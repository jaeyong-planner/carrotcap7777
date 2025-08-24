@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo ========================================
echo    HMK홀딩스 지식Agent 개발 서버 시작
echo ========================================
echo.

REM Node.js 설치 확인
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js가 설치되어 있지 않습니다.
    echo Node.js LTS 버전을 설치한 뒤 다시 실행하세요.
    echo.
    pause
    exit /b 1
)

REM 필요한 파일 확인
if not exist package.json (
    echo package.json 파일이 없습니다.
    pause
    exit /b 1
)

REM 의존성 설치 확인
if not exist node_modules (
    echo node_modules가 없습니다. 의존성을 먼저 설치합니다.
    call npm install
    if errorlevel 1 (
        echo 의존성 설치에 실패했습니다.
        pause
        exit /b 1
    )
)

set PORT=5173
echo HMK홀딩스 지식Agent 개발 서버를 시작합니다...
echo 포트: %PORT%
echo.
echo 서버가 시작되면 브라우저에서 다음 주소로 접속하세요:
echo http://localhost:%PORT%
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요.
echo.

REM Vite 개발 서버 시작
echo 개발 서버를 시작하고 있습니다...
echo.

REM 백그라운드에서 npm run dev 실행
start /min cmd /c "npm run dev"

REM 서버가 시작될 때까지 대기
echo 서버 시작을 확인하는 중...
:wait_for_server
timeout /t 1 /nobreak >nul
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:%PORT%' -TimeoutSec 1 -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
    echo.
    goto wait_for_server
)

echo 서버가 시작되었습니다. 브라우저를 열고 있습니다...
start http://localhost:%PORT%

echo.
echo 브라우저에서 http://localhost:%PORT% 에 접속하세요.
echo 서버를 중지하려면 이 창을 닫으세요.

echo.
echo 개발 서버가 종료되었습니다.
pause
exit /b 0



