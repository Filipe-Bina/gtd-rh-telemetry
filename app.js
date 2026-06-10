// ==========================================================================
// GTD-ABILITY SISTEMA DE TELEMETRIA E CONSULTA DE FUNCIONÁRIOS - CORE ENGINE
// ==========================================================================

// Alterado o nome da constante para evitar colisão com o objeto global da CDN
const supabaseClient = supabase.createClient(window.GTD_CONFIG.SUPABASE_URL, window.GTD_CONFIG.SUPABASE_ANON_KEY);

// Gerenciamento de Estado Global do App
const state = {
    view: 'public', // views possíveis: 'public', 'login', 'admin'
    user: null,     // Objeto do admin logado
    employees: [],  // Cache local dos funcionários para renderizações ultrarápidas
    searchQuery: '' // String do filtro de busca atual
};

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', async () => {
    initAppStructure();
    await fetchEmployeesData();
    render();
});

// Busca os dados dos funcionários
async function fetchEmployeesData() {
    try {
        const { data, error } = await supabaseClient
            .from('employees')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        state.employees = data || [];
    } catch (err) {
        console.error("Erro ao sincronizar dados dos colaboradores:", err.message);
    }
}

// Configura a casca HTML padrão do App (Topbar Dinâmica e Containers)
function initAppStructure() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <header class="topbar">
            <div class="topbar-inner">
                <div class="brand-logo" id="logo-click">
                    <span class="mini-mark">GTD</span>
                    <span class="brand-title">Ability Funcionários</span>
                </div>
                <div id="nav-actions"></div>
            </div>
        </header>
        <main class="content">
            <div id="alert-msg" class="message"></div>
            <div id="main-view"></div>
        </main>
    `;

    // Listener seguro para clique na logo
    document.getElementById('logo-click').addEventListener('click', () => {
        navigateTo('public');
    });
}

// Roteador de Navegação Virtual (SPA)
function navigateTo(targetView) {
    state.view = targetView;
    if (targetView === 'public') {
        state.searchQuery = '';
    }
    showAlert('', 'ok');
    render();
}

// Utilitário para Sanitização (XSS)
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Validador de Senha Defensivo (8 dígitos, contendo números e letras)
function isValidPassword(pwd) {
    return pwd.length === 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd);
}

// Exibe caixas de alerta na tela
function showAlert(msg, type = 'ok') {
    const box = document.getElementById('alert-msg');
    if (!box) return;
    if (!msg) {
        box.className = 'message';
        box.textContent = '';
        return;
    }
    box.className = `message show ${type}`;
    box.textContent = msg;
}

// Centralizador de Renderização de Telas
function render() {
    renderTopbarActions();
    
    const container = document.getElementById('main-view');
    if (!container) return;

    if (state.view === 'public') renderPublicView(container);
    else if (state.view === 'login') renderLoginView(container);
    else if (state.view === 'admin') renderAdminView(container);
}

// Renderiza as ações do cabeçalho de acordo com o estado do usuário
function renderTopbarActions() {
    const actions = document.getElementById('nav-actions');
    if (!actions) return;

    if (state.view === 'admin' && state.user) {
        actions.innerHTML = `
            <div class="user-chip">
                <span>👑 ${escapeHtml(state.user.name)}</span>
                <button class="ghost-btn" id="btn-logout">Sair</button>
            </div>
        `;
        document.getElementById('btn-logout').addEventListener('click', logoutAdmin);
    } else if (state.view !== 'login') {
        actions.innerHTML = `<button class="primary-btn shrink-btn" id="btn-nav-login">Acesso Restrito</button>`;
        document.getElementById('btn-nav-login').addEventListener('click', () => navigateTo('login'));
    } else {
        actions.innerHTML = `<button class="secondary-btn shrink-btn" id="btn-nav-public">Voltar à Consulta</button>`;
        document.getElementById('btn-nav-public').addEventListener('click', () => navigateTo('public'));
    }
}

// ==========================================
// MÓDULO 1: VIEW PÚBLICA (CONSULTA E TELEMETRIA)
// ==========================================
function renderPublicView(container) {
    const stats = { DADOS: {}, SWT: {} };
    const statusTypes = ['Total', 'Ativo', 'Férias', 'Atestado', 'Curso', 'Inativo', 'Emprestado'];
    
    ['DADOS', 'SWT'].forEach(t => {
        statusTypes.forEach(s => stats[t][s] = 0);
    });

    state.employees.forEach(emp => {
        if (stats[emp.team]) {
            stats[emp.team]['Total']++;
            if (stats[emp.team][emp.status] !== undefined) {
                stats[emp.team][emp.status]++;
            }
        }
    });

    const filtered = state.employees.filter(emp => 
        emp.name.toLowerCase().includes(state.searchQuery.toLowerCase())
    );

    container.innerHTML = `
        <section class="telemetry-section">
            <div class="section-head">
                <h2>Indicadores de Campo</h2>
                <p>Status operacional das equipes em tempo real</p>
            </div>
            
            <div class="telemetry-grid">
                <div class="panel telemetry-panel">
                    <h3>📊 EQUIPE DE DADOS</h3>
                    <div class="metrics-grid">
                        ${statusTypes.map(s => `
                            <div class="metric-card ${s.toLowerCase()}">
                                <span class="metric-val">${stats.DADOS[s]}</span>
                                <span class="metric-label">${s}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="panel telemetry-panel">
                    <h3>📊 EQUIPE SWT</h3>
                    <div class="metrics-grid">
                        ${statusTypes.map(s => `
                            <div class="metric-card ${s.toLowerCase()}">
                                <span class="metric-val">${stats.SWT[s]}</span>
                                <span class="metric-label">${s}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </section>

        <section class="search-section">
            <div class="panel search-panel">
                <div class="search-bar-container">
                    <input type="text" id="search-input" placeholder="Digite o nome do colaborador para consultar..." value="${escapeHtml(state.searchQuery)}">
                    <button class="primary-btn" id="btn-search-trigger">Buscar</button>
                </div>
                
                <div class="results-container">
                    ${state.searchQuery ? `
                        <h4 class="results-title">Resultados da Consulta (${filtered.length})</h4>
                        ${filtered.length === 0 ? `
                            <div class="empty">Nenhum funcionário encontrado com o termo informado.</div>
                        ` : `
                            <div class="employees-list-grid">
                                ${filtered.map(emp => `
                                    <div class="employee-card-public status-${emp.status.toLowerCase()}">
                                        <div class="emp-main-info">
                                            <span class="emp-badge-team">${escapeHtml(emp.team)}</span>
                                            <span class="emp-badge-status ${emp.status.toLowerCase()}">${escapeHtml(emp.status)}</span>
                                        </div>
                                        <h4 class="emp-name">${escapeHtml(emp.name)}</h4>
                                        <div class="emp-details-meta">
                                            <p><strong>RE:</strong> ${escapeHtml(emp.re)}</p>
                                            <p><strong>Cargo:</strong> ${escapeHtml(emp.role)}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    ` : `
                        <div class="empty">Use a barra de busca acima para carregar o dossiê e informações de um colaborador.</div>
                    `}
                </div>
            </div>
        </section>
    `;

    document.getElementById('btn-search-trigger').addEventListener('click', handleSearchClick);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearchClick();
    });
}

function handleSearchClick() {
    state.searchQuery = document.getElementById('search-input').value.trim();
    render();
}

// ==========================================
// MÓDULO 2: AUTENTICAÇÃO (LOGIN / REGISTRO)
// ==========================================
function renderLoginView(container) {
    container.innerHTML = `
        <div class="auth-shell">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="brand-badge">GTD PRIVADO</div>
                    <h1>Mesa Administrativa</h1>
                    <p class="brand-sub">Faça login ou cadastre suas chaves</p>
                </div>
                
                <div class="auth-tabs">
                    <button class="tab-btn active" id="btn-tab-login">Acessar</button>
                    <button class="tab-btn" id="btn-tab-reg">Novo Cadastro</button>
                </div>

                <div class="auth-forms-container">
                    <form id="form-login" class="auth-form show">
                        <label>
                            <span>RE Corporativo Admin</span>
                            <input type="text" name="re" required placeholder="Digite seu RE">
                        </label>
                        <label>
                            <span>Senha de Acesso</span>
                            <input type="password" name="password" required placeholder="••••••••">
                        </label>
                        <button type="submit" class="primary-btn">Entrar no Sistema</button>
                    </form>

                    <form id="form-reg" class="auth-form">
                        <label>
                            <span>RE Autorizado Whitelist</span>
                            <input type="text" name="re" required placeholder="Digite seu RE corporativo">
                        </label>
                        <label>
                            <span>Criar Nova Senha (8 dígitos alfanumérica)</span>
                            <input type="password" name="password" required placeholder="Ex: gtd12345">
                        </label>
                        <button type="submit" class="primary-btn">Efetuar Cadastro</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-tab-login').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('btn-tab-reg').addEventListener('click', () => switchAuthTab('reg'));
    
    document.getElementById('form-login').addEventListener('submit', handleLoginSubmit);
    document.getElementById('form-reg').addEventListener('submit', handleRegisterSubmit);
}

function switchAuthTab(type) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-reg');
    const loginTab = document.getElementById('btn-tab-login');
    const regTab = document.getElementById('btn-tab-reg');

    showAlert('');
    if (type === 'login') {
        loginForm.classList.add('show');
        regForm.classList.remove('show');
        loginTab.classList.add('active');
        regTab.classList.remove('active');
    } else {
        loginForm.classList.remove('show');
        regForm.classList.add('show');
        loginTab.classList.remove('active');
        regTab.classList.add('active');
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const re = form.re.value.trim();
    const pwd = form.password.value.trim();

    if (!isValidPassword(pwd)) {
        showAlert('A senha deve conter exatamente 8 dígitos, mesclando letras e números.', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.rpc('register_admin', { p_re: re, p_password: pwd });
        if (error) throw error;

        if (data.success) {
            showAlert(data.message, 'ok');
            form.reset();
            switchAuthTab('login');
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Erro de rede ou permissão ao registrar administrador.', 'error');
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const re = form.re.value.trim();
    const pwd = form.password.value.trim();

    try {
        const { data, error } = await supabaseClient.rpc('login_admin', { p_re: re, p_password: pwd });
        if (error) throw error;

        if (data.success) {
            state.user = { name: data.name, re: data.re };
            state.view = 'admin';
            showAlert('');
            render();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Erro de infraestrutura ou falha na RPC de Login.', 'error');
    }
}

function logoutAdmin() {
    state.user = null;
    state.view = 'public';
    render();
}

// ==========================================
// MÓDULO 3: VISÃO ADMINISTRATIVA (GOVERNANÇA)
// ==========================================
function renderAdminView(container) {
    if (!state.user) {
        navigateTo('login');
        return;
    }

    container.innerHTML = `
        <div class="admin-grid-layout">
            <div class="panel admin-panel-form">
                <h3>👥 Inclusão de Técnico</h3>
                <p class="panel-subtitle">Insira um novo profissional na malha operacional do banco</p>
                
                <form id="form-add-employee" class="form">
                    <label>
                        <span>RE do Colaborador</span>
                        <input type="text" name="re" required placeholder="Ex: 30123">
                    </label>
                    <label>
                        <span>Nome Completo</span>
                        <input type="text" name="name" required placeholder="Ex: JOÃO DA SILVA">
                    </label>
                    <label>
                        <span>Cargo Operacional</span>
                        <input type="text" name="role" required placeholder="Ex: TÉCNICO DE DADOS II">
                    </label>
                    <label>
                        <span>Cadeia / Equipe</span>
                        <select name="team" required>
                            <option value="DADOS">DADOS</option>
                            <option value="SWT">SWT</option>
                        </select>
                    </label>
                    <button type="submit" class="primary-btn">Cadastrar Funcionário</button>
                </form>
            </div>

            <div class="panel admin-panel-list">
                <div class="panel-header-action">
                    <h3>📋 Gestão de Efetivo e Status</h3>
                    <span class="counter-badge-s">Total: ${state.employees.length}</span>
                </div>
                
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>RE</th>
                                <th>Nome</th>
                                <th>Equipe</th>
                                <th>Cargo</th>
                                <th>Status Operacional</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.employees.map(emp => `
                                <tr>
                                    <td><strong>${escapeHtml(emp.re)}</strong></td>
                                    <td>${escapeHtml(emp.name)}</td>
                                    <td><span class="table-team-badge ${emp.team.toLowerCase()}">${escapeHtml(emp.team)}</span></td>
                                    <td class="text-muted">${escapeHtml(emp.role)}</td>
                                    <td>
                                        <select class="status-select select-${emp.status.toLowerCase()}" data-id="${emp.id}">
                                            <option value="Ativo" ${emp.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                                            <option value="Férias" ${emp.status === 'Férias' ? 'selected' : ''}>Férias</option>
                                            <option value="Atestado" ${emp.status === 'Atestado' ? 'selected' : ''}>Atestado</option>
                                            <option value="Curso" ${emp.status === 'Curso' ? 'selected' : ''}>Curso</option>
                                            <option value="Inativo" ${emp.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                                            <option value="Emprestado" ${emp.status === 'Emprestado' ? 'selected' : ''}>Emprestado</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('form-add-employee').addEventListener('submit', handleCreateEmployee);

    const selectors = container.querySelectorAll('.status-select');
    selectors.forEach(select => {
        select.addEventListener('change', (e) => {
            const id = e.target.getAttribute('data-id');
            const val = e.target.value;
            handleStatusMutation(id, val);
        });
    });
}

async function handleCreateEmployee(e) {
    e.preventDefault();
    const form = e.target;
    const re = form.re.value.trim();
    const name = form.name.value.trim().toUpperCase();
    const role = form.role.value.trim().toUpperCase();
    const team = form.team.value;

    try {
        const { error } = await supabaseClient
            .from('employees')
            .insert([{ re, name, role, team, status: 'Ativo' }]);

        if (error) {
            if (error.code === '23505') {
                showAlert('Erro: Já existe um funcionário cadastrado com este RE.', 'error');
            } else {
                throw error;
            }
            return;
        }

        showAlert('Colaborador acoplado à malha do banco com sucesso!', 'ok');
        form.reset();
        await fetchEmployeesData();
        render();
    } catch (err) {
        showAlert('Falha operacional ao inserir funcionário no banco.', 'error');
    }
}

async function handleStatusMutation(id, newStatus) {
    try {
        const { error } = await supabaseClient
            .from('employees')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        
        const target = state.employees.find(e => e.id === id);
        if (target) target.status = newStatus;
        
        showAlert('Status operacional alterado com sucesso!', 'ok');
        setTimeout(() => showAlert(''), 3000);
        render();
    } catch (err) {
        showAlert('Erro ao mutar status do colaborador.', 'error');
    }
}