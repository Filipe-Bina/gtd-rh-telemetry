// ==========================================================================
// GTD-ABILITY SISTEMA DE TELEMETRIA E CONSULTA DE FUNCIONÁRIOS - MOTOR CORE
// ==========================================================================

let supabaseClient = null;

// Inicialização segura com tratamento preventivo contra URLs inválidas ou nulas
try {
    if (!window.GTD_CONFIG || !window.GTD_CONFIG.SUPABASE_URL || window.GTD_CONFIG.SUPABASE_URL.includes("seu-projeto-id")) {
        throw new Error("As credenciais do Supabase não foram configuradas no arquivo config.js ou ainda utilizam a URL de exemplo.");
    }
    supabaseClient = supabase.createClient(window.GTD_CONFIG.SUPABASE_URL, window.GTD_CONFIG.SUPABASE_ANON_KEY);
} catch (configError) {
    console.error("Erro Crítico ao instanciar o cliente do Banco de Dados:", configError.message);
    document.addEventListener('DOMContentLoaded', () => {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div style="padding: 40px; text-align: center; font-family: 'Inter', sans-serif; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; max-width: 650px; margin: 60px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h3 style="margin-top: 0; font-size: 1.4rem;">⚠️ Falha na Inicialização da Infraestrutura</h3>
                    <p style="margin-top: 10px; font-size: 1rem; color: #58151c;">O arquivo <strong>config.js</strong> não foi preenchido ou contém erros de sintaxe.</p>
                    <p style="font-size: 0.9rem; margin-top: 15px; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 4px; font-family: monospace; text-align: left; word-break: break-all;">Detalhe: ${configError.message}</p>
                </div>
            `;
        }
    });
}

// Estado da Aplicação unificado para Single Page Application (SPA)
const state = {
    view: 'public', // views disponíveis: 'public', 'login', 'admin'
    user: null,     // Armazena dados do administrador autenticado
    employees: [],  // Memória local do efetivo para filtros em tempo de execução
    searchQuery: '' // Termo digitado na barra de buscas públicas
};

// Inicializador assíncrono acionado assim que o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) return;
    initAppStructure();
    await fetchEmployeesData();
    render();
});

// Sincroniza dados com o Supabase de forma transparente
async function fetchEmployeesData() {
    try {
        const { data, error } = await supabaseClient
            .from('employees')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        state.employees = data || [];
    } catch (err) {
        console.error("Erro na leitura de registros do Supabase:", err.message);
        showAlert("Erro de sincronização: Não foi possível ler os dados da tabela 'employees'. Verifique as políticas RLS do banco.", "error");
    }
}

// Injeta o esqueleto visual fixo (Topbar e Main Container)
function initAppStructure() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <header class="topbar">
            <div class="topbar-inner">
                <div class="brand-logo" id="logo-click" style="cursor: pointer;">
                    <span class="mini-mark">GTD</span>
                    <span class="brand-title">Ability Tecnologia</span>
                </div>
                <div id="nav-actions"></div>
            </div>
        </header>
        <main class="content">
            <div id="alert-msg" class="message"></div>
            <div id="main-view"></div>
        </main>
    `;

    document.getElementById('logo-click').addEventListener('click', () => {
        navigateTo('public');
    });
}

// Gerenciador de Rotas Internas Virtuais
function navigateTo(targetView) {
    state.view = targetView;
    if (targetView === 'public') {
        state.searchQuery = '';
    }
    showAlert('', 'ok');
    render();
}

// Utilitário Escudo contra Ataques de Injeção de Tags (XSS)
function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Exibe caixas de alerta textuais na interface
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

// Orquestrador de Visualização Global
function render() {
    renderTopbarActions();
    
    const container = document.getElementById('main-view');
    if (!container) return;

    if (state.view === 'public') renderPublicView(container);
    else if (state.view === 'login') renderLoginView(container);
    else if (state.view === 'admin') renderAdminView(container);
}

// Altera dinamicamente os botões de ação e chips do Header
function renderTopbarActions() {
    const actions = document.getElementById('nav-actions');
    if (!actions) return;

    if (state.view === 'admin' && state.user) {
        actions.innerHTML = `
            <div class="user-chip" style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 600; color: #2d3748;">👑 Admin: ${escapeHtml(state.user.name)}</span>
                <button class="secondary-btn shrink-btn" id="btn-logout" style="padding: 6px 12px; font-size: 0.85rem;">Desconectar</button>
            </div>
        `;
        document.getElementById('btn-logout').addEventListener('click', () => {
            state.user = null;
            navigateTo('public');
        });
    } else if (state.view !== 'login') {
        actions.innerHTML = `<button class="primary-btn shrink-btn" id="btn-nav-login">Painel Administrativo</button>`;
        document.getElementById('btn-nav-login').addEventListener('click', () => navigateTo('login'));
    } else {
        actions.innerHTML = `<button class="secondary-btn shrink-btn" id="btn-nav-public">Voltar à Consulta</button>`;
        document.getElementById('btn-nav-public').addEventListener('click', () => navigateTo('public'));
    }
}

// ==========================================
// MÓDULO: RENDERIZAÇÃO DA INTERFACE PÚBLICA
// ==========================================
function renderPublicView(container) {
    const stats = { DADOS: {}, SWT: {} };
    const statusTypes = ['Total', 'Ativo', 'Férias', 'Atestado', 'Curso', 'Inativo', 'Emprestado'];
    
    ['DADOS', 'SWT'].forEach(t => {
        statusTypes.forEach(s => stats[t][s] = 0);
    });

    state.employees.forEach(emp => {
        const teamKey = (emp.team || '').toUpperCase();
        if (stats[teamKey]) {
            stats[teamKey]['Total']++;
            if (stats[teamKey][emp.status] !== undefined) {
                stats[teamKey][emp.status]++;
            }
        }
    });

    const filtered = state.employees.filter(emp => {
        const nameMatch = (emp.name || '').toLowerCase().includes(state.searchQuery.toLowerCase());
        const reMatch = (emp.re || '').toLowerCase().includes(state.searchQuery.toLowerCase());
        return nameMatch || reMatch;
    });

    container.innerHTML = `
        <section class="telemetry-section">
            <div class="section-head">
                <h2>Indicadores de Efetivo Operacional</h2>
                <p>Monitoramento e alocação de equipes em tempo real</p>
            </div>
            
            <div class="telemetry-grid">
                <div class="panel telemetry-panel">
                    <h3>📊 NÚCLEO DE DADOS</h3>
                    <div class="metrics-grid">
                        ${statusTypes.map(s => `
                            <div class="metric-card ${s.toLowerCase()}">
                                <span class="metric-val">${stats.DADOS[s] || 0}</span>
                                <span class="metric-label">${s}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="panel telemetry-panel">
                    <h3>📊 NÚCLEO SWT</h3>
                    <div class="metrics-grid">
                        ${statusTypes.map(s => `
                            <div class="metric-card ${s.toLowerCase()}">
                                <span class="metric-val">${stats.SWT[s] || 0}</span>
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
                    <input type="text" id="search-input" placeholder="Consulte por nome ou RE do colaborador..." value="${escapeHtml(state.searchQuery)}">
                    <button class="primary-btn" id="btn-search-trigger">Filtrar</button>
                </div>
                
                <div class="results-container">
                    ${state.searchQuery ? `
                        <h4 class="results-title">Registros Encontrados (${filtered.length})</h4>
                        ${filtered.length === 0 ? `
                            <div class="empty">Nenhum profissional localizado sob os critérios informados.</div>
                        ` : `
                            <div class="employees-list-grid">
                                ${filtered.map(emp => `
                                    <div class="employee-card-public status-${(emp.status || 'ativo').toLowerCase()}">
                                        <div class="emp-main-info">
                                            <span class="emp-badge-team ${escapeHtml((emp.team || '').toLowerCase())}">${escapeHtml(emp.team)}</span>
                                            <span class="emp-badge-status ${(emp.status || 'ativo').toLowerCase()}">${escapeHtml(emp.status)}</span>
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
                        <div class="empty">Insira o termo de pesquisa acima para carregar o cartão operacional de um funcionário.</div>
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
// MÓDULO: SISTEMA DE AUTENTICAÇÃO SIMPLIFICADO
// ==========================================
function renderLoginView(container) {
    container.innerHTML = `
        <div class="auth-shell" style="max-width: 420px; margin: 60px auto;">
            <div class="panel auth-card">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #1a202c;">Acesso à Mesa</h2>
                    <p style="color: #718096; margin-top: 5px; font-size: 0.9rem;">Para fins de teste, insira qualquer credencial</p>
                </div>
                
                <form id="form-login" class="form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">RE Administrativo</label>
                        <input type="text" id="login-re" required placeholder="Digite o RE corporativo" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Chave Privada</label>
                        <input type="password" id="login-pwd" required placeholder="Sua senha de acesso" style="width: 100%; padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px;">
                    </div>
                    <button type="submit" class="primary-btn" style="width: 100%; padding: 12px;">Liberar Acesso</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('form-login').addEventListener('submit', (e) => {
        e.preventDefault();
        const re = document.getElementById('login-re').value.trim();
        state.user = { name: "Supervisor Corporativo", re: re };
        navigateTo('admin');
    });
}

// ==========================================
// MÓDULO: GOVERNANÇA E CONTROLE ADMINISTRATIVO
// ==========================================
function renderAdminView(container) {
    if (!state.user) {
        navigateTo('login');
        return;
    }

    container.innerHTML = `
        <div class="admin-grid-layout">
            <div class="panel admin-panel-form">
                <h3>👥 Inclusão Operacional</h3>
                <p class="panel-subtitle">Insira um novo profissional ativo nas malhas de infraestrutura</p>
                
                <form id="form-add-employee" class="form">
                    <label>
                        <span>RE do Colaborador</span>
                        <input type="text" name="re" required placeholder="Ex: 30455">
                    </label>
                    <label>
                        <span>Nome Completo</span>
                        <input type="text" name="name" required placeholder="Ex: CARLOS SILVA">
                    </label>
                    <label>
                        <span>Cargo Cadastrado</span>
                        <input type="text" name="role" required placeholder="Ex: AUXILIAR TÉCNICO I">
                    </label>
                    <label>
                        <span>Núcleo / Equipe</span>
                        <select name="team" required>
                            <option value="DADOS">DADOS</option>
                            <option value="SWT">SWT</option>
                        </select>
                    </label>
                    <button type="submit" class="primary-btn">Cadastrar na Base</button>
                </form>
            </div>

            <div class="panel admin-panel-list">
                <div class="panel-header-action" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3>📋 Gerenciamento de Status de Escopo</h3>
                    <span class="counter-badge-s" style="background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: 0.85rem;">Total: ${state.employees.length}</span>
                </div>
                
                <div class="admin-table-wrapper" style="overflow-x: auto;">
                    <table class="admin-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead>
                            <tr style="background: #f7fafc; border-bottom: 2px solid #edf2f7;">
                                <th style="padding: 12px;">RE</th>
                                <th style="padding: 12px;">Nome</th>
                                <th style="padding: 12px;">Equipe</th>
                                <th style="padding: 12px;">Cargo</th>
                                <th style="padding: 12px;">Status Atual</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.employees.map(emp => `
                                <tr style="border-bottom: 1px solid #edf2f7;">
                                    <td style="padding: 12px;"><strong>${escapeHtml(emp.re)}</strong></td>
                                    <td style="padding: 12px;">${escapeHtml(emp.name)}</td>
                                    <td style="padding: 12px;"><span class="table-team-badge ${escapeHtml((emp.team || '').toLowerCase())}">${escapeHtml(emp.team)}</span></td>
                                    <td style="padding: 12px; color: #4a5568;">${escapeHtml(emp.role)}</td>
                                    <td style="padding: 12px;">
                                        <select class="status-select select-${(emp.status || 'ativo').toLowerCase()}" data-id="${emp.id}" style="padding: 6px; border-radius: 4px; border: 1px solid #cbd5e0;">
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
                showAlert('Conflito de Escopo: Já existe um funcionário com este RE na base de dados.', 'error');
            } else {
                throw error;
            }
            return;
        }

        showAlert('Funcionário cadastrado e acoplado ao Supabase com sucesso!', 'ok');
        form.reset();
        await fetchEmployeesData();
        render();
    } catch (err) {
        showAlert('Falha na requisição: erro interno de rede ou bloqueio RLS no banco.', 'error');
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
        
        showAlert('Status operacional alterado em tempo real com sucesso!', 'ok');
        setTimeout(() => showAlert(''), 3000);
        render();
    } catch (err) {
        showAlert('Não foi possível mutar o status do funcionário.', 'error');
    }
}