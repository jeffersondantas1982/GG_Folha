@echo off
setlocal
title Instalador - GG-Folha

echo ===========================================
echo   INSTALADOR - GG-FOLHA
echo ===========================================
echo.

:: Verificar se o Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado! 
    echo Por favor, instale o Node.js (https://nodejs.org/) e tente novamente.
    pause
    exit /b
)

echo [1/3] Limpando instalacoes anteriores...
if exist node_modules (
    rmdir /s /q node_modules
)

echo [2/3] Instalando dependencias (isso pode levar alguns minutos)...
call npm install

echo [3/3] Criando scripts de atalho...
echo [OK] Dependencias instaladas com sucesso!
echo.
echo ===========================================
echo   INSTALACAO CONCLUIDA!
echo   Para iniciar o sistema, use o 'START.bat'
echo ===========================================
echo.
pause
