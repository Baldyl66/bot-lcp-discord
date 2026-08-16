@echo off
cd /d C:\Users\dylan\Desktop\bot-lcp-discord

set /p msg=Message du commit : 

echo.
git add .
git commit -m "%msg%"
git push

echo.
echo Deploiement vers Railway en cours (automatique via GitHub)...
pause