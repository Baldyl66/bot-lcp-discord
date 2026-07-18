@echo off
cd /d C:\Users\dylan\Desktop\bot-lcp-discord

set /p msg=Message du commit : 

echo.
git add .
git commit -m "%msg%"
git push

echo.
ssh -i "C:\Users\dylan\Desktop\bot-lcp-discord\infos-serveur\ssh-key-2026-03-14.key" ubuntu@89.168.60.237 "cd ~/bot-lcp-discord && git pull && npm install && pm2 restart lcp-bot && cd backend && npm install && npm run build && (pm2 restart virtual-world-backend || pm2 start dist/index.js --name virtual-world-backend) && cd ../frontend && npm install && npm run build"

echo.
echo Deploiement termine.
pause