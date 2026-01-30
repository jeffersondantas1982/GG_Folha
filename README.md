# GG - Gestão de Gente

> *Tecnologia para gerir, sensibilidade para cuidar.*

Sistema de gestão de ponto e frequência desenvolvido para o Hospital Presidente Vargas.

![Licença MIT](https://img.shields.io/badge/License-MIT-teal.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue.svg)

## 🎯 Sobre o Projeto

O **GG (Gestão de Gente)** nasceu da ideia de que por trás de cada batida de ponto existe uma história, um esforço e uma meta. Como sistema de gestão, nosso propósito é simplificar o controle para que sobre tempo para o que realmente importa: o desenvolvimento humano e a confiança mútua.

## ✨ Funcionalidades

- 🔐 **Autenticação**: Sistema de login seguro com sessões
- 👥 **Gestão de Equipe**: CRUD completo de colaboradores via MySQL
- 📋 **Folhas de Ponto**: Geração inteligente com filtros por Unidade e Mês
- 📊 **Dashboard Estratégico**: Estatísticas automáticas da equipe
- 🎂 **Gestão de Aniversariantes**: Alertas do mês atual e preview do próximo
- ☁️ **Backup Inteligente**: Geração de arquivo Excel em tempo real a partir do MySQL
- 🔍 **Busca & Paginação**: Localização rápida e interface fluida
- 👤 **Gestão de Usuários**: Controle de acessos administrativo

## 📚 Documentação e Manuais

Para facilitar o uso e a manutenção, criamos guias detalhados:

1.  📖 [**Manual do Usuário**](MANUAL_USUARIO.md): Guia passo a passo de como operar o sistema no dia a dia do RH.
2.  🛠️ [**Guia de Implantação Técnica**](GUIA_IMPLANTACAO.md): Instruções para instalação no servidor, rede local e manutenção.

## 🚀 Como Iniciar (Rápido)

1. Execute `START.bat` (Windows)
2. Acesse http://collab-rh:3000
3. Siga o guia de primeiro acesso para cadastrar o Administrador.



## 🗂️ Estrutura de Dados

O sistema utiliza um banco de dados **MySQL** (`folha_pv`) com as seguintes tabelas:
- **professionals**: Cadastro principal de colaboradores.
- **users**: Credenciais de acesso administrativo.
- **settings**: Configurações globais e dados da instituição.

## 🛠️ Tecnologias

- Node.js + Express
- MySQL (Banco de dados principal)
- EJS (Templates)
- Tailwind CSS
- xlsx (Geração de backups e exportação)
- express-session (Autenticação)

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT** - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe do Projeto

**Desenvolvedor:**
- **Jefferson Carvalho Dantas**
- **Líder Técnico & Desenvolvedor Fullstack**: Jefferson C. Dantas
- **Cooperação**: Carlos André ([LinkedIn](https://www.linkedin.com/in/carlosandre81/))
- **Instituição de Origem**: Hospital Presidente Vargas (São Luís-MA)
- Departamento de Informática
- Recursos Humanos

---

*Recursos Humanos - 2026*
