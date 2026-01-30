const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILE_NAME = 'folha.xlsx';
const FILE_PATH = path.join(__dirname, '..', FILE_NAME);
const DB_SHEET_NAME = 'BANCO DE DADOS';

function migrate() {
    if (!fs.existsSync(FILE_PATH)) {
        console.error("Arquivo não encontrado!");
        return;
    }

    const workbook = XLSX.readFile(FILE_PATH, { cellDates: true });
    const sheet = workbook.Sheets[DB_SHEET_NAME];

    if (!sheet) {
        console.error("Planilha BANCO DE DADOS não encontrada!");
        return;
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Encontrar linha de cabeçalho
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        if (row && Array.isArray(row) && row.some(cell => cell && String(cell).trim().toUpperCase() === 'NOME')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.error("Cabeçalhos não encontrados!");
        return;
    }

    const headers = rawData[headerRowIndex];
    if (headers.includes('SITUAÇÃO')) {
        console.log("Coluna SITUAÇÃO já existe.");
        return;
    }

    // Adicionar SITUAÇÃO ao final dos cabeçalhos
    headers.push('SITUAÇÃO');
    console.log("Adicionando coluna SITUAÇÃO...");

    // Preencher ATIVO para todos os funcionários existentes
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        if (rawData[i][0]) { // Se tem nome
            rawData[i][headers.length - 1] = 'ATIVO';
        }
    }

    // Salvar de volta
    const newSheet = XLSX.utils.aoa_to_sheet(rawData);
    workbook.Sheets[DB_SHEET_NAME] = newSheet;

    try {
        XLSX.writeFile(workbook, FILE_PATH);
        console.log("Migração concluída com sucesso!");
    } catch (e) {
        console.error("Erro ao salvar arquivo (pode estar aberto no Excel):", e.message);
    }
}

migrate();
