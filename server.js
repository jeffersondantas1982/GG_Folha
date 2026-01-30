const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./util/db');
const multer = require('multer');
const XLSX = require('xlsx');

// Multer configuration for logo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/img/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'logo' + ext); // Standard name for logo
    }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: 'folha-pv-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Institutional Data Middleware
app.use(async (req, res, next) => {
    try {
        const rows = await db.query('SELECT tipo, valor FROM settings WHERE tipo LIKE "INSTITUICAO_%"');
        const inst = {
            nome: rows.find(r => r.tipo === 'INSTITUICAO_NOME')?.valor || 'GG - Gestão de Gente',
            cnpj: rows.find(r => r.tipo === 'INSTITUICAO_CNPJ')?.valor || '',
            endereco: rows.find(r => r.tipo === 'INSTITUICAO_ENDERECO')?.valor || '',
            logotipo: rows.find(r => r.tipo === 'INSTITUICAO_LOGOTIPO')?.valor || ''
        };
        res.locals.institution = inst;
        res.locals.institutionName = inst.nome; // Backward compatibility
        next();
    } catch (error) {
        console.error('Erro ao buscar dados da instituição:', error);
        res.locals.institution = { nome: 'GG - Gestão de Gente' };
        res.locals.institutionName = 'GG - Gestão de Gente';
        next();
    }
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// Helpers
const getMonthName = (month) => {
    const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    return monthNames[month];
};

// Routes

// 0. Autenticação
app.get('/login', async (req, res) => {
    try {
        const users = await db.query('SELECT * FROM users');
        if (users.length === 0) {
            return res.redirect('/register-user');
        }
        res.render('login', { error: null });
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.post('/login', async (req, res) => {
    try {
        const { usuario, senha } = req.body;
        const [user] = await db.query('SELECT * FROM users WHERE usuario = ? AND senha = ?', [usuario, senha]);

        if (user) {
            req.session.userId = user.usuario;
            res.redirect('/');
        } else {
            res.render('login', { error: 'Usuário ou senha inválidos' });
        }
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/register-user', async (req, res) => {
    try {
        const users = await db.query('SELECT * FROM users LIMIT 1');
        if (users.length > 0 && !req.session.userId) {
            return res.redirect('/login');
        }
        res.render('register_user');
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.post('/register-user', async (req, res) => {
    try {
        const { usuario, senha } = req.body;
        await db.query('INSERT INTO users (usuario, senha) VALUES (?, ?)', [usuario, senha]);
        if (req.session.userId) {
            res.redirect('/users');
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        res.status(500).send(`Erro ao cadastrar usuário: ${error.message}`);
    }
});

// User Management Routes
app.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await db.query('SELECT * FROM users');
        res.render('users', { users, currentUser: req.session.userId });
    } catch (error) {
        res.status(500).send(`Erro ao listar usuários: ${error.message}`);
    }
});

app.get('/users/edit/:username', authMiddleware, async (req, res) => {
    try {
        const [user] = await db.query('SELECT * FROM users WHERE usuario = ?', [req.params.username]);
        if (!user) return res.status(404).send("Usuário não encontrado");
        res.render('edit_user', { user });
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.post('/users/edit/:username', authMiddleware, async (req, res) => {
    try {
        const { usuario, senha } = req.body;
        await db.query('UPDATE users SET usuario = ?, senha = ? WHERE usuario = ?', [usuario, senha, req.params.username]);
        res.redirect('/users');
    } catch (error) {
        res.status(500).send(`Erro ao atualizar usuário: ${error.message}`);
    }
});

app.post('/users/delete/:username', authMiddleware, async (req, res) => {
    try {
        if (req.params.username === req.session.userId) {
            return res.status(400).send("Você não pode excluir a si mesmo.");
        }
        await db.query('DELETE FROM users WHERE usuario = ?', [req.params.username]);
        res.redirect('/users');
    } catch (error) {
        res.status(500).send(`Erro ao excluir usuário: ${error.message}`);
    }
});

// 1. Dashboard com Pesquisa e Paginação (PROTECTED)
app.get('/', authMiddleware, async (req, res) => {
    try {
        const query = req.query.search;
        const filterUnidade = req.query.unidade;
        const filterCargo = req.query.cargo;
        const filterEscala = req.query.escala;
        const currentPage = parseInt(req.query.page) || 1;
        const itemsPerPage = 5;

        // --- Get All Specialists for Stats ---
        const allProfessionals = await db.query('SELECT * FROM professionals');

        // --- Get Settings for Dropdowns ---
        const rowsSettings = await db.query('SELECT tipo, valor FROM settings');
        const settings = {
            unidade_lotacao: rowsSettings.filter(s => s.tipo === 'UNIDADE_LOTACAO').map(s => s.valor),
            cargo: rowsSettings.filter(s => s.tipo === 'CARGO').map(s => s.valor),
            escala: rowsSettings.filter(s => s.tipo === 'ESCALA').map(s => s.valor)
        };

        // --- Build SQL Query for Listing ---
        let sql = 'SELECT * FROM professionals WHERE situacao != "INATIVO"';
        let params = [];

        if (query) {
            sql += ' AND (nome LIKE ? OR matricula LIKE ? OR cargo LIKE ? OR unidade_lotacao LIKE ?)';
            const q = `%${query}%`;
            params.push(q, q, q, q);
        }

        if (filterUnidade) {
            sql += ' AND unidade_lotacao = ?';
            params.push(filterUnidade);
        }
        if (filterCargo) {
            sql += ' AND cargo = ?';
            params.push(filterCargo);
        }
        if (filterEscala) {
            sql += ' AND escala = ?';
            params.push(filterEscala);
        }

        // Count for pagination
        const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
        const [countResult] = await db.query(countSql, params);
        const totalItems = countResult.count;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // Sorting and Pagination
        sql += ' ORDER BY nome ASC LIMIT ? OFFSET ?';
        params.push(itemsPerPage, (currentPage - 1) * itemsPerPage);

        const professionals = await db.query(sql, params);

        // --- Stats Calculation ---
        const today = new Date();
        const currentMonthNum = today.getMonth() + 1;
        const nextMonthNum = currentMonthNum === 12 ? 1 : currentMonthNum + 1;

        const stats = {
            total: allProfessionals.length,
            ativos: 0,
            ferias: 0,
            inativos: 0,
            porUnidade: {},
            porCargo: {},
            porEscala: {},
            aniversariantes: [],
            aniversariantesProximo: []
        };

        allProfessionals.forEach(p => {
            stats.porUnidade[p.unidade_lotacao || 'NÃO INFORMADA'] = (stats.porUnidade[p.unidade_lotacao || 'NÃO INFORMADA'] || 0) + 1;
            stats.porCargo[p.cargo || 'NÃO INFORMADO'] = (stats.porCargo[p.cargo || 'NÃO INFORMADO'] || 0) + 1;
            stats.porEscala[p.escala || 'NÃO INFORMADA'] = (stats.porEscala[p.escala || 'NÃO INFORMADA'] || 0) + 1;

            const situacao = (p.situacao || 'ATIVO').toUpperCase();
            if (situacao === 'FERIAS') stats.ferias++;
            else if (situacao === 'INATIVO') stats.inativos++;
            else stats.ativos++;

            if (p.data_nascimento) {
                const bDate = new Date(p.data_nascimento);
                const m = bDate.getMonth() + 1;
                const d = bDate.getDate();

                if (m === currentMonthNum) stats.aniversariantes.push({ nome: p.nome, dia: d });
                else if (m === nextMonthNum) stats.aniversariantesProximo.push({ nome: p.nome, dia: d });
            }
        });

        stats.aniversariantes.sort((a, b) => a.dia - b.dia);
        stats.aniversariantesProximo.sort((a, b) => a.dia - b.dia);

        const monthNames = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        stats.mesAtualNome = monthNames[currentMonthNum];
        stats.proximoMesNome = monthNames[nextMonthNum];
        stats.mesAtualNum = currentMonthNum;
        stats.proximoMesNum = nextMonthNum;

        res.render('index', {
            professionals,
            searchQuery: query || '',
            stats,
            pagination: {
                current: currentPage,
                total: totalPages,
                totalItems: totalItems
            },
            filters: {
                unidade: filterUnidade || '',
                cargo: filterCargo || '',
                escala: filterEscala || ''
            },
            settings
        });
    } catch (error) {
        res.status(500).send(`Erro ao ler dados: ${error.message}`);
    }
});

// 2. Cadastro (PROTECTED)
app.get('/register', authMiddleware, async (req, res) => {
    try {
        const rows = await db.query('SELECT tipo, valor FROM settings');
        const settings = {
            unidade_lotacao: rows.filter(s => s.tipo === 'UNIDADE_LOTACAO').map(s => s.valor),
            unidade_exercicio: rows.filter(s => s.tipo === 'UNIDADE_EXERCICIO').map(s => s.valor),
            cargo: rows.filter(s => s.tipo === 'CARGO').map(s => s.valor),
            carga_horaria: rows.filter(s => s.tipo === 'CARGA_HORARIA').map(s => s.valor),
            escala: rows.filter(s => s.tipo === 'ESCALA').map(s => s.valor)
        };
        res.render('register', { settings });
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.post('/register', authMiddleware, async (req, res) => {
    try {
        const { nome, matricula, cargo, unidade_lotacao, unidade_exercicio, escala, carga_horaria, email, data_nascimento, telefone, situacao } = req.body;
        await db.query(
            `INSERT INTO professionals (
                nome, matricula, cargo, unidade_lotacao, unidade_exercicio, 
                carga_horaria, email, telefone, data_nascimento, escala, situacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nome, matricula, cargo, unidade_lotacao, unidade_exercicio,
                carga_horaria, email, telefone, data_nascimento || null, escala, situacao || 'ATIVO'
            ]
        );
        res.redirect('/');
    } catch (error) {
        res.status(500).send(`Erro ao salvar: ${error.message}`);
    }
});

// 3. Edição (PROTECTED)
app.get('/edit/:matricula', authMiddleware, async (req, res) => {
    try {
        const [prof] = await db.query('SELECT * FROM professionals WHERE matricula = ?', [req.params.matricula]);
        if (!prof) return res.status(404).send("Colaborador não encontrado");

        const rows = await db.query('SELECT tipo, valor FROM settings');
        const settings = {
            unidade_lotacao: rows.filter(s => s.tipo === 'UNIDADE_LOTACAO').map(s => s.valor),
            unidade_exercicio: rows.filter(s => s.tipo === 'UNIDADE_EXERCICIO').map(s => s.valor),
            cargo: rows.filter(s => s.tipo === 'CARGO').map(s => s.valor),
            carga_horaria: rows.filter(s => s.tipo === 'CARGA_HORARIA').map(s => s.valor),
            escala: rows.filter(s => s.tipo === 'ESCALA').map(s => s.valor)
        };

        res.render('edit', { prof, settings });
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.post('/edit/:matricula', authMiddleware, async (req, res) => {
    try {
        const { nome, cargo, unidade_lotacao, unidade_exercicio, data_nascimento, escala, carga_horaria, email, telefone, situacao } = req.body;
        await db.query(
            `UPDATE professionals SET 
                nome = ?, cargo = ?, unidade_lotacao = ?, unidade_exercicio = ?, 
                data_nascimento = ?, escala = ?, carga_horaria = ?, email = ?, 
                telefone = ?, situacao = ? 
            WHERE matricula = ?`,
            [
                nome, cargo, unidade_lotacao, unidade_exercicio,
                data_nascimento || null, escala, carga_horaria, email,
                telefone, situacao, req.params.matricula
            ]
        );
        res.redirect('/');
    } catch (error) {
        res.status(500).send(`Erro ao atualizar: ${error.message}`);
    }
});

// 3.5 Férias (PROTECTED)
app.get('/inactives', authMiddleware, async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        let sql = 'SELECT * FROM professionals WHERE situacao = "INATIVO"';
        let params = [];

        if (searchQuery) {
            sql += ' AND (nome LIKE ? OR matricula LIKE ?)';
            const q = `%${searchQuery}%`;
            params.push(q, q);
        }

        const professionals = await db.query(sql, params);
        res.render('inactives', { professionals, searchQuery });
    } catch (error) {
        res.status(500).send(`Erro ao buscar inativos: ${error.message}`);
    }
});

app.get('/help', authMiddleware, (req, res) => {
    res.render('help');
});

app.post('/status/update/:matricula', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        await db.query('UPDATE professionals SET situacao = ? WHERE matricula = ?', [status, req.params.matricula]);
        res.redirect(req.get('referer') || '/');
    } catch (error) {
        res.status(500).send(`Erro ao atualizar status: ${error.message}`);
    }
});

app.get('/vacations/print', authMiddleware, async (req, res) => {
    try {
        const filterUnidade = req.query.unidade;
        let sql = 'SELECT * FROM professionals WHERE situacao = "FERIAS"';
        let params = [];

        if (filterUnidade) {
            sql += ' AND unidade_lotacao = ?';
            params.push(filterUnidade);
        }

        const professionals = await db.query(sql, params);

        const rowsSettings = await db.query('SELECT tipo, valor FROM settings WHERE tipo LIKE "INSTITUICAO_%"');
        const institution = {
            nome: rowsSettings.find(s => s.tipo === 'INSTITUICAO_NOME')?.valor || '',
            cnpj: rowsSettings.find(s => s.tipo === 'INSTITUICAO_CNPJ')?.valor || '',
            endereco: rowsSettings.find(s => s.tipo === 'INSTITUICAO_ENDERECO')?.valor || '',
            logotipo: rowsSettings.find(s => s.tipo === 'INSTITUICAO_LOGOTIPO')?.valor || ''
        };

        res.render('print_vacations', { professionals, institution, filterUnidade });
    } catch (error) {
        res.status(500).send(`Erro ao gerar lista de férias: ${error.message}`);
    }
});

// 4. Exclusão (PROTECTED)
app.post('/delete/:matricula', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM professionals WHERE matricula = ?', [req.params.matricula]);
        res.redirect('/');
    } catch (error) {
        res.status(500).send(`Erro ao excluir: ${error.message}`);
    }
});

// 5. Impressão de Lista (PROTECTED)
app.get('/print-list', authMiddleware, async (req, res) => {
    try {
        const professionals = await db.query('SELECT * FROM professionals ORDER BY nome ASC');
        res.render('print_list', { professionals });
    } catch (error) {
        res.status(500).send(`Erro ao gerar lista: ${error.message}`);
    }
});

// 6. Página Sobre (PROTECTED)
app.get('/about', authMiddleware, (req, res) => {
    res.render('about');
});

// 6.5 Impressão de Aniversariantes (PROTECTED)
app.get('/print-birthdays', authMiddleware, async (req, res) => {
    try {
        const today = new Date();
        const targetMonthNum = parseInt(req.query.month) || (today.getMonth() + 1);

        const professionals = await db.query(
            'SELECT * FROM professionals WHERE MONTH(data_nascimento) = ? ORDER BY DAY(data_nascimento) ASC',
            [targetMonthNum]
        );

        const aniversariantes = professionals.map(p => ({
            nome: p.nome,
            dia: new Date(p.data_nascimento).getDate(),
            cargo: p.cargo,
            unidade: p.unidade_lotacao
        }));

        const monthNames = ["", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
        const monthName = monthNames[targetMonthNum];

        res.render('print_birthdays', { aniversariantes, monthName });
    } catch (error) {
        res.status(500).send(`Erro ao gerar lista de aniversariantes: ${error.message}`);
    }
});

// 7. Configurações (PROTECTED)
app.get('/settings', authMiddleware, async (req, res) => {
    try {
        const rows = await db.query('SELECT tipo, valor FROM settings');
        const settings = {
            unidade_lotacao: rows.filter(s => s.tipo === 'UNIDADE_LOTACAO').map(s => s.valor),
            unidade_exercicio: rows.filter(s => s.tipo === 'UNIDADE_EXERCICIO').map(s => s.valor),
            cargo: rows.filter(s => s.tipo === 'CARGO').map(s => s.valor),
            carga_horaria: rows.filter(s => s.tipo === 'CARGA_HORARIA').map(s => s.valor),
            escala: rows.filter(s => s.tipo === 'ESCALA').map(s => s.valor),
            institution: {
                nome: rows.find(s => s.tipo === 'INSTITUICAO_NOME')?.valor || '',
                cnpj: rows.find(s => s.tipo === 'INSTITUICAO_CNPJ')?.valor || '',
                endereco: rows.find(s => s.tipo === 'INSTITUICAO_ENDERECO')?.valor || '',
                logotipo: rows.find(s => s.tipo === 'INSTITUICAO_LOGOTIPO')?.valor || ''
            }
        };
        res.render('settings', { settings });
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.post('/settings/institution', authMiddleware, upload.single('logoFile'), async (req, res) => {
    try {
        const { nome, cnpj, endereco, logotipo } = req.body;

        const updateSetting = async (tipo, valor) => {
            await db.query('DELETE FROM settings WHERE tipo = ?', [tipo]);
            await db.query('INSERT INTO settings (tipo, valor) VALUES (?, ?)', [tipo, valor]);
        };

        await updateSetting('INSTITUICAO_NOME', nome);
        await updateSetting('INSTITUICAO_CNPJ', cnpj);
        await updateSetting('INSTITUICAO_ENDERECO', endereco);

        if (req.file) {
            const newLogotipo = '/img/' + req.file.filename;
            await updateSetting('INSTITUICAO_LOGOTIPO', newLogotipo);
        } else {
            await updateSetting('INSTITUICAO_LOGOTIPO', logotipo);
        }

        res.redirect('/settings');
    } catch (error) {
        res.status(500).send(`Erro ao atualizar dados: ${error.message}`);
    }
});

app.post('/settings/add', authMiddleware, async (req, res) => {
    try {
        const { tipo, valor } = req.body;
        await db.query('INSERT INTO settings (tipo, valor) VALUES (?, ?)', [tipo, valor]);
        res.redirect('/settings');
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

app.post('/settings/delete', authMiddleware, async (req, res) => {
    try {
        const { tipo, valor } = req.body;
        await db.query('DELETE FROM settings WHERE tipo = ? AND valor = ?', [tipo, valor]);
        res.redirect('/settings');
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// 7.5 Backup (PROTECTED)
app.get('/backup/download', authMiddleware, async (req, res) => {
    try {
        // Fetch all data
        const professionals = await db.query('SELECT * FROM professionals');
        const users = await db.query('SELECT usuario, senha FROM users');
        const settings = await db.query('SELECT tipo, valor FROM settings');

        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // 1. Sheet: BANCO DE DADOS (Mapped to Match original Excel structure)
        const mappedProfessionals = professionals.map(p => ({
            'NOME': p.nome,
            'MATRICULA': p.matricula,
            'CARGO': p.cargo,
            'UNIDADE DE LOTAÇÃO': p.unidade_lotacao,
            'UNIDADE EXERCÍCIO': p.unidade_exercicio,
            'CARGA HORÁRIA(h/s):': p.carga_horaria,
            'E-MAIL': p.email,
            'TELEFONE': p.telefone,
            'DATA DE NASCIMENTO': p.data_nascimento,
            'ESCALA': p.escala,
            'SITUAÇÃO': p.situacao
        }));
        const wsBD = XLSX.utils.json_to_sheet(mappedProfessionals);
        XLSX.utils.book_append_sheet(wb, wsBD, "BANCO DE DADOS");

        // 2. Sheet: USUARIOS
        const mappedUsers = users.map(u => ({
            'USUARIO': u.usuario,
            'SENHA': u.senha
        }));
        const wsUsers = XLSX.utils.json_to_sheet(mappedUsers);
        XLSX.utils.book_append_sheet(wb, wsUsers, "USUARIOS");

        // 3. Sheet: CONFIGURACOES
        const mappedSettings = settings.map(s => ({
            'TIPO': s.tipo,
            'VALOR': s.valor
        }));
        const wsSettings = XLSX.utils.json_to_sheet(mappedSettings);
        XLSX.utils.book_append_sheet(wb, wsSettings, "CONFIGURACOES");

        // Generate Buffer
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const date = new Date().toISOString().split('T')[0];
        const fileName = `Backup_FOLHA_GG_${date}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);

    } catch (error) {
        res.status(500).send(`Erro ao gerar backup: ${error.message}`);
    }
});

// 8. Seleção de Folha (PROTECTED)
app.get('/timesheet', authMiddleware, async (req, res) => {
    try {
        const rows = await db.query('SELECT valor FROM settings WHERE tipo = "UNIDADE_LOTACAO"');
        const units = rows.map(r => r.valor);
        res.render('timesheet_select', { units });
    } catch (error) {
        res.status(500).send(`Erro: ${error.message}`);
    }
});

// 9. Impressão de Folhas (PROTECTED)
app.get('/timesheet/print', authMiddleware, async (req, res) => {
    try {
        let month = parseInt(req.query.month);
        if (isNaN(month)) month = new Date().getMonth();

        const year = parseInt(req.query.year) || new Date().getFullYear();
        const targetMatricula = req.query.matricula;
        const targetUnidade = req.query.unidade;

        let professionals = [];
        if (targetMatricula) {
            const [p] = await db.query('SELECT * FROM professionals WHERE matricula = ?', [targetMatricula]);
            if (p) {
                if (p.situacao === 'FERIAS') {
                    return res.status(403).send(`
                        <!DOCTYPE html>
                        <html lang="pt-br">
                        <head>
                            <meta charset="UTF-8">
                            <title>Aviso de Férias</title>
                            <script src="https://cdn.tailwindcss.com"></script>
                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                            <style>body { font-family: 'Inter', sans-serif; }</style>
                        </head>
                        <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
                            <div class="bg-white max-w-md w-full p-8 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 text-center space-y-6">
                                <div class="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-4xl mx-auto animate-bounce">
                                    🌴
                                </div>
                                <div class="space-y-2">
                                    <h1 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Impedimento de Impressão</h1>
                                    <p class="text-slate-500">O colaborador <b>${p.nome}</b> está atualmente em período de <b>FÉRIAS</b>.</p>
                                </div>
                                <div class="bg-amber-50 p-4 rounded-2xl text-amber-700 text-sm font-medium border border-amber-100">
                                    A folha de ponto não pode ser gerada para profissionais afastados para garantir a conformidade dos registros.
                                </div>
                                <button onclick="window.close()" class="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-200">
                                    Entendido, Fechar Aba
                                </button>
                            </div>
                        </body>
                        </html>
                    `);
                }
                professionals = [p];
            }
        } else if (targetUnidade) {
            professionals = await db.query('SELECT * FROM professionals WHERE unidade_lotacao = ? AND situacao != "FERIAS"', [targetUnidade]);
        } else {
            professionals = await db.query('SELECT * FROM professionals WHERE situacao != "FERIAS"');
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        const monthName = getMonthName(month);

        const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dayOfWeek = date.getDay();
            days.push({ day: i, isWeekend: (dayOfWeek === 0 || dayOfWeek === 6), label: weekdays[dayOfWeek] });
        }

        professionals.sort((a, b) => a.nome.localeCompare(b.nome));

        const rowsSettings = await db.query('SELECT tipo, valor FROM settings WHERE tipo LIKE "INSTITUICAO_%"');
        const institution = {
            nome: rowsSettings.find(s => s.tipo === 'INSTITUICAO_NOME')?.valor || 'INSTITUIÇÃO NÃO INFORMADA',
            cnpj: rowsSettings.find(s => s.tipo === 'INSTITUICAO_CNPJ')?.valor || '',
            endereco: rowsSettings.find(s => s.tipo === 'INSTITUICAO_ENDERECO')?.valor || '',
            logotipo: rowsSettings.find(s => s.tipo === 'INSTITUICAO_LOGOTIPO')?.valor || '/img/logo.png'
        };

        res.render('print_timesheet', { professionals, days, monthName, year, institution });
    } catch (error) {
        res.status(500).send(`Erro ao gerar folha de ponto: ${error.message}`);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Folha rodando na rede local na porta ${PORT}`);
});
