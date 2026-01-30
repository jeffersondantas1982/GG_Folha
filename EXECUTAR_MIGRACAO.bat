@echo off
title Migracao Excel para MySQL - GG
echo ===========================================
echo   MIGRANDO DADOS: EXCEL -> MYSQL
echo ===========================================
echo.

:: Verifica se o node está instalado
where node >nul 2>nul
if %errorLevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Por favor, instale o Node.js.
    pause
    exit /b
)

echo [1/1] Executando script de migracao...
echo Isso pode levar alguns segundos dependendo do tamanho da sua planilha...
echo.

node scripts/migrate.js

if %errorLevel% == 0 (
    echo.
    echo ===========================================
    echo [OK] Migracao concluida com sucesso!
    echo Agora voce pode fechar esta janela e rodar o START.bat
    echo ===========================================
) else (
    echo.
    echo [ERRO] Ocorreu um erro durante a migracao.
    echo Verifique se o MySQL esta rodando e se a senha no .env esta correta.
)

echo.
pause
