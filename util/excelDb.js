const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILE_NAME = 'folha.xlsx';
const FILE_PATH = path.join(__dirname, '..', FILE_NAME);
const DB_SHEET_NAME = 'BANCO DE DADOS';
const USER_SHEET_NAME = 'USUARIOS';
const SETTINGS_SHEET_NAME = 'CONFIGURACOES';

function checkFileExists() {
    if (!fs.existsSync(FILE_PATH)) {
        throw new Error(`Arquivo base não encontrado em ${FILE_PATH}`);
    }
}

function getWorkbook() {
    checkFileExists();
    return XLSX.readFile(FILE_PATH, { cellDates: true });
}

function saveWorkbook(workbook) {
    try {
        XLSX.writeFile(workbook, FILE_PATH);
    } catch (error) {
        if (error.code === 'EBUSY' || error.message.includes('EBUSY')) {
            throw new Error("O arquivo 'folha.xlsx' está aberto no Excel. Por favor, feche-o e tente novamente.");
        }
        throw error;
    }
}

const ExcelDb = {
    initDb: () => {
        const workbook = getWorkbook();
        let changed = false;

        if (!workbook.SheetNames.includes(USER_SHEET_NAME)) {
            const ws = XLSX.utils.aoa_to_sheet([['USUARIO', 'SENHA']]);
            XLSX.utils.book_append_sheet(workbook, ws, USER_SHEET_NAME);
            changed = true;
        }

        if (!workbook.SheetNames.includes(SETTINGS_SHEET_NAME)) {
            const ws = XLSX.utils.aoa_to_sheet([['TIPO', 'VALOR']]);
            XLSX.utils.book_append_sheet(workbook, ws, SETTINGS_SHEET_NAME);

            // Add default shift types and institution details
            const defaultSettings = [
                { TIPO: 'ESCALA', VALOR: 'ADMINISTRATIVO' },
                { TIPO: 'ESCALA', VALOR: 'PLANTÃO SD' },
                { TIPO: 'ESCALA', VALOR: 'PLANTÃO SN' },
                { TIPO: 'ESCALA', VALOR: '12X36' },
                { TIPO: 'INSTITUICAO_NOME', VALOR: 'HOSPITAL PRESIDENTE VARGAS' },
                { TIPO: 'INSTITUICAO_CNPJ', VALOR: '21.843.341/0001-07' },
                { TIPO: 'INSTITUICAO_ENDERECO', VALOR: "Ed. Biadene,9º Andar, Ponta D'Areia, São Luis-MA CEP: 65.077-470, Fone: (98) 3304-6504" },
                { TIPO: 'INSTITUICAO_LOGOTIPO', VALOR: '/images/logo.png' }
            ];
            XLSX.utils.sheet_add_json(workbook.Sheets[SETTINGS_SHEET_NAME], defaultSettings, { skipHeader: true, origin: -1 });

            changed = true;
        }

        if (changed) saveWorkbook(workbook);
    },

    getSettings: (type) => {
        try {
            const workbook = getWorkbook();
            const sheet = workbook.Sheets[SETTINGS_SHEET_NAME];
            if (!sheet) return [];
            const data = XLSX.utils.sheet_to_json(sheet);
            if (type) {
                return data.filter(item => item.TIPO === type).map(item => item.VALOR);
            }
            return data;
        } catch (error) {
            console.error("[ExcelDb] Erro ao buscar configurações:", error.message);
            return [];
        }
    },

    addSetting: (type, value) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[SETTINGS_SHEET_NAME];
        if (!sheet) throw new Error("Planilha de configurações não encontrada");

        const data = XLSX.utils.sheet_to_json(sheet);

        // Evitar duplicados
        const exists = data.some(item => item.TIPO === type && String(item.VALOR).trim().toUpperCase() === String(value).trim().toUpperCase());
        if (exists) return true;

        data.push({ TIPO: type, VALOR: value });
        const newSheet = XLSX.utils.json_to_sheet(data);
        workbook.Sheets[SETTINGS_SHEET_NAME] = newSheet;
        saveWorkbook(workbook);
        return true;
    },

    deleteSetting: (type, value) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[SETTINGS_SHEET_NAME];
        if (!sheet) throw new Error("Planilha não encontrada");

        let data = XLSX.utils.sheet_to_json(sheet);
        const filtered = data.filter(item => !(item.TIPO === type && String(item.VALOR).trim() === String(value).trim()));

        const newSheet = XLSX.utils.json_to_sheet(filtered);
        workbook.Sheets[SETTINGS_SHEET_NAME] = newSheet;
        saveWorkbook(workbook);
        return true;
    },

    updateSingleSetting: (type, value) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[SETTINGS_SHEET_NAME];
        if (!sheet) throw new Error("Planilha não encontrada");

        let data = XLSX.utils.sheet_to_json(sheet);
        data = data.filter(item => item.TIPO !== type);
        data.push({ TIPO: type, VALOR: value });

        const newSheet = XLSX.utils.json_to_sheet(data);
        workbook.Sheets[SETTINGS_SHEET_NAME] = newSheet;
        saveWorkbook(workbook);
        return true;
    },

    getProfessionals: () => {
        try {
            const workbook = getWorkbook();
            const sheet = workbook.Sheets[DB_SHEET_NAME];
            if (!sheet) return [];
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            let headerRowIndex = -1;
            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                if (row && Array.isArray(row) && row.some(cell => cell && String(cell).trim().toUpperCase() === 'NOME')) {
                    headerRowIndex = i;
                    break;
                }
            }

            if (headerRowIndex === -1) return [];

            const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
            const rows = rawData.slice(headerRowIndex + 1);

            return rows.map(row => {
                let prof = {};
                headers.forEach((header, index) => {
                    if (header) {
                        prof[header] = row[index] !== undefined ? row[index] : '';
                    }
                });
                return prof;
            }).filter(p => p['NOME'] && String(p['NOME']).trim().length > 0);
        } catch (error) {
            console.error("[ExcelDb] Erro ao buscar profissionais:", error.message);
            return [];
        }
    },

    addProfessional: (data) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[DB_SHEET_NAME];
        if (!sheet) throw new Error("Planilha de banco de dados não encontrada");
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell => cell && String(cell).trim().toUpperCase() === 'NOME')) {
                headerRowIndex = i;
                break;
            }
        }
        if (headerRowIndex === -1) throw new Error("Cabeçalhos não encontrados");
        const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
        const newRowArray = headers.map(h => data[h] !== undefined ? data[h] : '');
        XLSX.utils.sheet_add_aoa(sheet, [newRowArray], { origin: -1 });
        saveWorkbook(workbook);
        return true;
    },

    updateProfessional: (matricula, updatedData) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[DB_SHEET_NAME];
        if (!sheet) throw new Error("Planilha não encontrada");
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell => cell && String(cell).trim().toUpperCase() === 'NOME')) {
                headerRowIndex = i;
                break;
            }
        }
        if (headerRowIndex === -1) throw new Error("Cabeçalhos não encontrados");
        const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
        const matIndex = headers.indexOf('MATRICULA');
        let foundRowIndex = -1;
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            if (String(rawData[i][matIndex] || '').trim() === String(matricula).trim()) {
                foundRowIndex = i;
                break;
            }
        }
        if (foundRowIndex === -1) throw new Error("Colaborador não encontrado");
        const newRowArray = headers.map((h, index) => updatedData[h] !== undefined ? updatedData[h] : (rawData[foundRowIndex][index] || ''));
        XLSX.utils.sheet_add_aoa(sheet, [newRowArray], { origin: foundRowIndex });
        saveWorkbook(workbook);
        return true;
    },

    deleteProfessional: (matricula) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[DB_SHEET_NAME];
        let rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row.some(cell => cell && String(cell).trim().toUpperCase() === 'NOME')) {
                headerRowIndex = i;
                break;
            }
        }
        const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
        const matIndex = headers.indexOf('MATRICULA');
        const initialLength = rawData.length;
        const filteredData = rawData.filter((row, idx) => {
            if (idx <= headerRowIndex) return true;
            return String(row[matIndex] || '').trim() !== String(matricula).trim();
        });
        if (filteredData.length === initialLength) throw new Error("Colaborador não encontrado");
        const newSheet = XLSX.utils.aoa_to_sheet(filteredData);
        workbook.Sheets[DB_SHEET_NAME] = newSheet;
        saveWorkbook(workbook);
        return true;
    },

    getUsers: () => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[USER_SHEET_NAME];
        if (!sheet) return [];
        return XLSX.utils.sheet_to_json(sheet);
    },

    addUser: (userData) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[USER_SHEET_NAME];
        const users = XLSX.utils.sheet_to_json(sheet);
        users.push({ USUARIO: String(userData.usuario || '').trim(), SENHA: String(userData.senha || '').trim() });
        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[USER_SHEET_NAME] = newSheet;
        saveWorkbook(workbook);
        return true;
    },

    updateUser: (oldUsername, newUserData) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[USER_SHEET_NAME];
        let users = XLSX.utils.sheet_to_json(sheet);
        const index = users.findIndex(u => String(u.USUARIO).trim() === String(oldUsername).trim());
        if (index === -1) throw new Error("Usuário não encontrado");
        users[index] = { USUARIO: String(newUserData.usuario || '').trim(), SENHA: String(newUserData.senha || '').trim() };
        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[USER_SHEET_NAME] = newSheet;
        saveWorkbook(workbook);
        return true;
    },

    deleteUser: (username) => {
        const workbook = getWorkbook();
        const sheet = workbook.Sheets[USER_SHEET_NAME];
        let users = XLSX.utils.sheet_to_json(sheet);
        const initialCount = users.length;
        users = users.filter(u => String(u.USUARIO).trim() !== String(username).trim());
        if (users.length === initialCount) throw new Error("Usuário não encontrado");
        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[USER_SHEET_NAME] = newSheet;
        saveWorkbook(workbook);
        return true;
    }
};

module.exports = ExcelDb;
