@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

cd /d "%~dp0"

echo ========================================
echo    HMK홀딩스 지식Agent 브라우저 실행
echo ========================================
echo.

REM 필요한 파일 확인
if not exist index.html (
    echo index.html 파일이 없습니다.
    pause
    exit /b 1
)

echo index.html 파일을 기본 브라우저에서 엽니다...
echo.

REM 기본 브라우저로 HTML 파일 열기
start "" index.html

echo 브라우저가 열렸습니다.
echo.
echo 참고: 일부 기능은 개발 서버 환경에서만 정상 작동할 수 있습니다.
echo 개발 서버를 실행하려면 start.bat를 사용하세요.
echo.
pause
exit /b 0
