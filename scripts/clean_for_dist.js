const db = require('../util/db');

async function cleanForDist() {
    try {
        console.log('--- Iniciando Limpeza para Distribuição ---');

        // 1. Limpar Colaboradores
        console.log('Removendo registros de profissionais...');
        await db.query('TRUNCATE TABLE professionals');

        // 2. Resetar Usuários
        console.log('Resetando usuários para admin/admin...');
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE users');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        await db.query('INSERT INTO users (usuario, senha) VALUES (?, ?)', ['admin', 'admin']);

        // 3. Configurações Genéricas
        console.log('Aplicando configurações genéricas...');
        await db.query('TRUNCATE TABLE settings');

        const defaultSettings = [
            { tipo: 'INSTITUICAO_NOME', valor: 'NOME DA SUA UNIDADE' },
            { tipo: 'INSTITUICAO_CNPJ', valor: '00.000.000/0001-00' },
            { tipo: 'INSTITUICAO_ENDERECO', valor: 'RUA EXEMPLO, 123 - CENTRO' },
            { tipo: 'INSTITUICAO_LOGOTIPO', valor: '/img/logo.png' },

            // Unidades de Exemplo
            { tipo: 'UNIDADE_LOTACAO', valor: 'ADMINISTRAÇÃO' },
            { tipo: 'UNIDADE_LOTACAO', valor: 'RECURSOS HUMANOS' },
            { tipo: 'UNIDADE_LOTACAO', valor: 'GERAL' },

            { tipo: 'UNIDADE_EXERCICIO', valor: 'SEDE' },

            // Cargos de Exemplo
            { tipo: 'CARGO', valor: 'ASSISTENTE ADMINISTRATIVO' },
            { tipo: 'CARGO', valor: 'AUXILIAR DE SERVIÇOS GERAIS' },
            { tipo: 'CARGO', valor: 'GERENTE' },

            // Escalas de Exemplo
            { tipo: 'ESCALA', valor: 'DIARISTA (08-18)' },
            { tipo: 'ESCALA', valor: '12X36 (DIURNO)' },
            { tipo: 'ESCALA', valor: '12X36 (NOTURNO)' },

            // Cargas Horárias
            { tipo: 'CARGA_HORARIA', valor: '44' },
            { tipo: 'CARGA_HORARIA', valor: '40' },
            { tipo: 'CARGA_HORARIA', valor: '36' },
            { tipo: 'CARGA_HORARIA', valor: '30' }
        ];

        for (const s of defaultSettings) {
            await db.query('INSERT INTO settings (tipo, valor) VALUES (?, ?)', [s.tipo, s.valor]);
        }

        console.log('--- Limpeza Concluída com Sucesso! ---');
        console.log('Acesso Padrão: admin / admin');
        process.exit(0);
    } catch (error) {
        console.error('Erro durante a limpeza:', error);
        process.exit(1);
    }
}

cleanForDist();
