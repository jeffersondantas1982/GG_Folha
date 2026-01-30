const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILE_PATH = path.join(__dirname, '..', 'folha.xlsx');

console.log('==============================================');
console.log('  ADICIONANDO COLUNA DATA DE NASCIMENTO');
console.log('==============================================\n');

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets['BANCO DE DADOS'];

    // Ler dados atuais
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = data[0];

    // Verificar se já existe
    if (headers.includes('DATA DE NASCIMENTO')) {
        console.log('✓ Coluna DATA DE NASCIMENTO já existe!\n');
        process.exit(0);
    }

    // Adicionar ao cabeçalho
    console.log('[1/2] Atualizando cabeçalhos...');
    headers.push('DATA DE NASCIMENTO');

    // Adicionar vazios nas linhas existentes
    for (let i = 1; i < data.length; i++) {
        if (data[i].length > 0) {
            data[i].push('');
        }
    }

    // Salvar
    const newSheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets['BANCO DE DADOS'] = newSheet;

    console.log('[2/2] Salvando arquivo...');
    XLSX.writeFile(workbook, FILE_PATH);

    console.log('\n✓ Sucesso! Coluna adicionada.\n');

} catch (error) {
    console.error('\n❌ Erro:', error.message);
}
