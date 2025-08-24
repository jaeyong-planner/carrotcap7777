@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo ========================================
echo    HMK홀딩스 지식Agent 프로덕션 빌드
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

echo.
echo [1/3] 프로덕션 빌드 중...
call npm run build
if errorlevel 1 (
    echo 빌드에 실패했습니다.
    pause
    exit /b 1
)

echo.
echo [2/3] 빌드 완료! dist 폴더에 생성되었습니다.
echo.

echo [3/3] 프로덕션 서버 시작...
set PORT=3000
echo 포트: %PORT%
echo.
echo 서버가 시작되면 브라우저에서 다음 주소로 접속하세요:
echo http://localhost:%PORT%
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요.
echo.

REM 프로덕션 서버 시작
call npm run preview

echo.
echo 프로덕션 서버가 종료되었습니다.
pause
exit /b 0
