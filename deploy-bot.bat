@echo off
cd /d C:\Users\dylan\Desktop\bot-lcp-discord

set /p msg=Message du commit : 

echo.
git add .
git commit -m "%msg%"
git push

echo.
ssh -i C:\Users\dylan\Desktop\bot-lcp-discord\ssh-key-2026-03-14.key ubuntu@89.168.60.237 "cd ~/bot-lcp-discord && git pull && pm2 restart lcp-bot"

echo.
echo Deploiement termine.
pause