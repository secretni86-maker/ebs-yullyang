@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 같은 와이파이의 휴대폰에서도 볼 수 있게 켭니다.
echo 휴대폰 주소창에  http://(이 컴퓨터 IP):8000  을 입력하세요. (IP 확인: ipconfig)
start "" http://localhost:8000
py serverpp.py --public
pause
