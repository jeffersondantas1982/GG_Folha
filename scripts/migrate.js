const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const FILE_NAME = 'folha.xlsx';
const FILE_PATH = path.join(__dirname, '..', FILE_NAME);

async function migrate() {
    console.log("🚀 Iniciando migração de Excel para MySQL...");

    if (!fs.existsSync(FILE_PATH)) {
        console.error("❌ Erro: Arquivo folha.xlsx não encontrado!");
        return;
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS
    });

    try {
        // 1. Criar Banco de Dados (Fresh start)
        console.log("📁 Criando banco de dados...");
        await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);

        // 2. Criar Tabelas
        console.log("🏗️ Criando tabelas...");
        const schemaPath = path.join(__dirname, '..', 'util', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        const commands = schema.split(';').filter(cmd => cmd.trim());
        for (const cmd of commands) {
            await connection.query(cmd);
        }

        // 3. Ler Excel
        console.log("📖 Lendo folha.xlsx...");
        const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });

        // --- Migrar Usuários ---
        const userSheet = workbook.SheetNames.find(s => s.toUpperCase() === 'USUARIOS');
        if (userSheet) {
            console.log("👤 Migrando usuários...");
            const users = XLSX.utils.sheet_to_json(workbook.Sheets[userSheet]);
            for (const user of users) {
                await connection.query(
                    'INSERT IGNORE INTO users (usuario, senha) VALUES (?, ?)',
                    [user.USUARIO, user.SENHA]
                );
            }
        }

        // --- Migrar Configurações ---
        const configSheet = workbook.SheetNames.find(s => s.toUpperCase() === 'CONFIGURACOES');
        if (configSheet) {
            console.log("⚙️ Migrando configurações...");
            const settings = XLSX.utils.sheet_to_json(workbook.Sheets[configSheet]);
            for (const set of settings) {
                await connection.query(
                    'INSERT INTO settings (tipo, valor) VALUES (?, ?)',
                    [set.TIPO, set.VALOR]
                );
            }
        }

        // --- Migrar Profissionais ---
        const bdSheet = workbook.SheetNames.find(s => s.toUpperCase() === 'BANCO DE DADOS');
        if (bdSheet) {
            console.log("👨‍⚕️ Migrando profissionais...");
            const sheet = workbook.Sheets[bdSheet];
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Localizar cabeçalho
            let headerRowIndex = -1;
            for (let i = 0; i < rawData.length; i++) {
                if (rawData[i] && rawData[i].some(c => String(c).toUpperCase() === 'NOME')) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex !== -1) {
                const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
                const rows = rawData.slice(headerRowIndex + 1);

                for (const row of rows) {
                    const p = {};
                    headers.forEach((h, idx) => { p[h] = row[idx]; });

                    if (p.NOME && p.MATRICULA) {
                        try {
                            let dataNasc = null;
                            if (p['DATA DE NASCIMENTO']) {
                                const d = new Date(p['DATA DE NASCIMENTO']);
                                if (!isNaN(d.getTime())) {
                                    dataNasc = d.toISOString().split('T')[0];
                                }
                            }

                            await connection.query(
                                `INSERT IGNORE INTO professionals (
                                    nome, matricula, cargo, unidade_lotacao, unidade_exercicio, 
                                    carga_horaria, email, telefone, data_nascimento, escala, situacao
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    p.NOME,
                                    p.MATRICULA,
                                    p.CARGO,
                                    p['UNIDADE DE LOTAÇÃO'],
                                    p['UNIDADE EXERCÍCIO'],
                                    p['CARGA HORÁRIA(h/s):'],
                                    p['E-MAIL'],
                                    p.TELEFONE,
                                    dataNasc,
                                    p.ESCALA,
                                    p['SITUAÇÃO'] || 'ATIVO'
                                ]
                            );
                        } catch (err) {
                            console.warn(`⚠️ Aviso: Erro ao inserir profissional ${p.NOME}:`, err.message);
                        }
                    }
                }
            }
        }

        console.log("✅ Migração concluída com sucesso!");

    } catch (error) {
        console.error("❌ Erro durante a migração:", error);
    } finally {
        await connection.end();
    }
}

migrate();
