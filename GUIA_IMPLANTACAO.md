# 📔 Guia de Implantação Técnica - GG
## *Sistema Aberto de Gestão de Gente*

Este guia é destinado ao departamento de TI ou ao administrador responsável pela instalação e manutenção do sistema.

---

### 1. 📋 Pré-requisitos
Antes de iniciar, certifique-se de que a máquina servidor possui:
- **Node.js** (Versão 18.x ou superior)
- **MySQL Server** (Instalado e rodando)
- **Acesso à Internet** (apenas para a instalação inicial das bibliotecas)
- **Navegador Moderno** (Chrome, Edge ou Firefox)

### 2. 🚀 Passo a Passo de Instalação

#### Passo 1: Extração
Extraia a pasta do projeto `FOLHA_GG` no local desejado (ex: `C:\Sistemas\GG`).

#### Passo 2: Instalação de Dependências
Abra o terminal na pasta do projeto e execute o comando de instalação:
```powershell
./INSTALAR.bat
```
*Ou manualmente via cmd:* `npm install`

#### Passo 3: Primeiro Acesso (Configuração do Admin)
1. Execute o arquivo `START.bat`.

2. Acesse no navegador: `http://localhost:3000`.
3. O sistema detectará que não há usuários (ou use o padrão inicial) e redirecionará para a tela de **Login**.
   - **Usuário Padrão:** `admin`
   - **Senha Padrão:** `admin`

4. Para configurar o banco de dados pela primeira vez, certifique-se de que o MySQL está rodando e execute:
```powershell
node scripts/migrate.js
```
*Isso criará o banco de dados e as tabelas necessárias.*

### 3. 🌐 Acesso via COLLAB-RH:3000
Para acessar o sistema usando o nome amigável desejado:

#### Opção A: Renomear o Computador (Recomendado)
Para que o sistema seja acessível por **qualquer computador na rede** como `http://collab-rh:3000`:
1. No Servidor, pressione `Win + Pause/Break` ou procure por "Sobre o PC".
2. Clique em **"Renomear este computador"**.
3. Mude o nome para: **COLLAB-RH**.
4. Reinicie o servidor.
5. Agora, todos na rede podem acessar via `http://collab-rh:3000`.

#### Opção B: Arquivo Hosts (Apenas para uma máquina específica)
Se não puder renomear o servidor, edite o arquivo `C:\Windows\System32\drivers\etc\hosts` em cada máquina cliente e adicione:
`[IP-DO-SERVIDOR] collab-rh`

### 4. 🌐 Acesso em Rede Local (via IP)

### 4. 🗂️ Banco de Dados (MySQL)
O sistema utiliza **MySQL** como banco de dados principal. 
- As configurações de conexão estão no arquivo `.env`.
- O banco de dados é nomeado como `folha_pv`.
- Você pode gerenciar os dados via **MySQL Workbench**.
- O arquivo `folha.xlsx` agora é usado apenas para exportação de backups e pré-migração.

### 6. 🛠️ Manutenção e Backup
- **Reinicialização**: Se o sistema parar, basta fechar o terminal e clicar em `START.bat`.

- **Backup Manual**: O arquivo `folha.xlsx` pode ser copiado manualmente para um HD externo ou Nuvem a qualquer momento por segurança.
- **Backup via Sistema**: Utilize o botão ☁️ **Backup** no topo do site para baixar a versão mais recente.

### 6. 🚫 Resolução de Problemas
- **Erro EADDRINUSE**: A porta 3000 já está sendo usada. Feche outros terminais abertos ou reinicie o computador.
- **Folha não gera**: Verifique se o arquivo `folha.xlsx` não está aberto por outro usuário no Excel clássico, o que pode travar a escrita de dados.

---
---
*TI - Gestão de Gente 2026*
