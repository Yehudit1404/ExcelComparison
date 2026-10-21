@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages...
  call npm install
)
echo Starting the site - open http://localhost:4200 in the browser
call npm start
pause
