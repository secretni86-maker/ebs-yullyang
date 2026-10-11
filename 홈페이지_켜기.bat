@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 홈페이지를 켜는 중입니다. 이 검은 창을 닫으면 홈페이지가 꺼집니다.
start "" http://localhost:8000
py serverpp.py
pause
