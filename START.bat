@echo off
title Folha PV - Iniciando na Rede...

echo ===========================================
echo   GG-FOLHA - ACESSO EM REDE
echo ===========================================
echo.

:: Obter o IP local
for /f "tokens=4 delims= " %%i in ('route print ^| findstr 0.0.0.0 ^| findstr /V "127.0.0.1"') do set LOCAL_IP=%%i

:: Finalizar processos anteriores se existirem
echo [1/2] Reiniciando servidor...
taskkill /f /im node.exe >nul 2>nul

:: Iniciar o servidor
echo [2/2] Iniciando servico...
echo.
echo O sistema estara disponivel em:
echo Local: http://localhost:3000
echo Rede:  http://%LOCAL_IP%:3000
echo.
echo Mantenha esta janela aberta enquanto estiver usando o sistema.
echo.
start http://localhost:3000
node server.js

pause
