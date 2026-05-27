@echo off
cd /d "%~dp0"
set "ROOT=%~dp0"
echo Starting servers from: %ROOT%
echo.
start "AI Screenplay Node Server" /D "%ROOT%server" cmd /k "node server.js"
start "AI Screenplay Python AI Server" /D "%ROOT%python_api" cmd /k "..\\.venv\\Scripts\\python.exe app.py"
start "Ngrok Port Forwarding" cmd /k "ngrok http 3000 --url pesky-unlaced-guidable.ngrok-free.dev"
echo.
echo ====================================================
echo  Servers started! (kien truc 1-port)
echo ====================================================
echo  Node.js (cong chinh): http://localhost:3000
echo  Python  (noi bo)    : http://localhost:5000
echo.
echo  Mo browser tai: http://localhost:3000
echo  AI request se duoc proxy tu :3000/python-api/* -> :5000/api/*
echo  Chi can forward 1 port voi ngrok: ngrok http 3000 --url pesky-unlaced-guidable.ngrok-free.dev
echo ====================================================
echo.
echo Press any key to close this window...
pause >nul