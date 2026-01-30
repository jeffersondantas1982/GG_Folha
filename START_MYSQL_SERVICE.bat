@echo off
title Iniciador do Servidor MySQL
:: Verifica permissões de Administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :start_mysql
) else (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo    ERRO: SOLICITANDO PERMISSAO DE ADMINISTRADOR
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo.
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

:start_mysql
echo ===========================================
echo   INICIANDO SERVICO MYSQL (MySQL80)
echo ===========================================
echo.

:: Tenta iniciar o serviço padrão
net start MySQL80

if %errorLevel% == 0 (
    echo.
    echo [OK] MySQL iniciado com sucesso!
) else if %errorLevel% == 2 (
    echo.
    echo [AVISO] O servico MySQL ja esta rodando.
) else (
    echo.
    echo [ERRO] Nao foi possivel iniciar o MySQL. 
    echo Verifique se o nome do servico e 'MySQL80' ou se o MySQL esta instalado.
)

echo.
echo Pressione qualquer tecla para sair...
pause >nul
