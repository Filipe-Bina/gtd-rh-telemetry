// ==========================================================================
// GTD-ABILITY SISTEMA DE TELEMETRIA E CONSULTA DE FUNCIONÁRIOS - V3.1 CORE
// ==========================================================================

let supabaseClient = null;

try {
    if (!window.GTD_CONFIG || !window.GTD_CONFIG.SUPABASE_URL || window.GTD_CONFIG.SUPABASE_URL.includes("seu-projeto-id")) {
        throw new Error("As credenciais do Supabase não foram configuradas no arquivo config.js.");
    }
    supabaseClient = supabase.createClient(window.GTD_CONFIG.SUPABASE_URL, window.GTD_CONFIG.SUPABASE_ANON_KEY);
} catch (configError) {
    console.error("Erro Crítico:", configError.message);
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('app').innerHTML = `<div class="message show error" style="max-width:600px; margin:50px auto;">Erro de Configuração: Verifique o config.js</div>`;
    });
}

const state = {
    view: 'login', 
    user: null,     
    employees: [],  
    searchQuery: '',
    editingEmployeeId: null 
};

document.addEventListener('DOMContentLoaded', () => {
    if (!supabaseClient) return;
    initAppStructure();
    render();
});

async function fetchEmployeesData() {
    try {
        const { data, error } = await supabaseClient
            .from('employees')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        state.employees = data || [];
    } catch (err) {
        console.error(err.message);
        showAlert("Falha ao sincronizar dados com o Supabase.", "error");
    }
}

function initAppStructure() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
        <header class="topbar">
            <div class="topbar-inner">
                <div class="brand-logo" id="logo-click">
                    <span class="mini-mark">GTD</span>
                    <span class="brand-title">Ability Operacional</span>
                </div>
                <div id="nav-actions"></div>
            </div>
        </header>
        <main class="content">
            <div id="alert-msg" class="message"></div>
            <div id="main-view"></div>
        </main>
        <div id="edit-modal" class="modal-overlay"></div>
    `;
}

function navigateTo(targetView) {
    if (!state.user && targetView !== 'login') {
        state.view = 'login';
    } else {
        state.view = targetView;
    }
    state.searchQuery = '';
    showAlert('', 'ok');
    render();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

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

function render() {
    renderTopbarActions();
    const container = document.getElementById('main-view');
    if (!container) return;

    if (state.view === 'login') renderLoginView(container);
    else if (state.view === 'public') renderPublicView(container);
    else if (state.view === 'admin') renderAdminView(container);
}

function renderTopbarActions() {
    const actions = document.getElementById('nav-actions');
    if (!actions) return;

    if (state.user) {
        actions.innerHTML = `
            <div class="user-chip">
                <span><span>👤 ${escapeHtml(state.user.name)}</span> <small style="background:rgba(255,255,255,0.15); padding:2px 6px; border-radius:4px; font-size:0.75rem;">${escapeHtml(state.user.role)}</small></span>
                <button class="secondary-btn shrink-btn" id="btn-toggle-view">
                    ${state.view === 'public' ? 'Painel Admin' : 'Consultas / Dashboard'}
                </button>
                <button class="ghost-btn" id="btn-logout">Sair</button>
            </div>
        `;
        document.getElementById('btn-toggle-view').addEventListener('click', () => {
            navigateTo(state.view === 'public' ? 'admin' : 'public');
        });
        document.getElementById('btn-logout').addEventListener('click', () => {
            state.user = null;
            navigateTo('login');
        });
    } else {
        actions.innerHTML = `<span class="brand-sub">Acesso Restrito</span>`;
    }
}

function renderLoginView(container) {
    container.innerHTML = `
        <div class="auth-shell">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="mini-mark" style="display:inline-block; margin-bottom:10px;">GTD SECURITY</div>
                    <h1>Portal Ability</h1>
                    <p class="brand-sub">Insira seu RE cadastrado na Whitelist</p>
                </div>
                <div class="auth-tabs">
                    <button class="tab-btn active" id="btn-tab-login">Acessar</button>
                    <button class="tab-btn" id="btn-tab-reg">Gerar Acesso</button>
                </div>
                <div class="auth-forms-container">
                    <form id="form-login" class="auth-form show">
                        <label><span>RE Corporativo Ability</span><input type="text" name="re" required placeholder="Digite seu RE"></label>
                        <label><span>Senha de Chave</span><input type="password" name="password" required placeholder="••••••••"></label>
                        <button type="submit" class="primary-btn">Entrar no Sistema</button>
                    </form>
                    <form id="form-reg" class="auth-form">
                        <label><span>RE Cadastrado na Whitelist</span><input type="text" name="re" required placeholder="Digite o RE para conferência"></label>
                        <label><span>Criar Senha (8 dígitos alfanumérica)</span><input type="password" name="password" required placeholder="Ex: gtd12345"></label>
                        <button type="submit" class="primary-btn">Validar e Cadastrar</button>
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
    showAlert('');
    document.getElementById('form-login').classList.toggle('show', type === 'login');
    document.getElementById('form-reg').classList.toggle('show', type === 'reg');
    document.getElementById('btn-tab-login').classList.toggle('active', type === 'login');
    document.getElementById('btn-tab-reg').classList.toggle('active', type === 'reg');
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const re = e.target.re.value.trim();
    const pwd = e.target.password.value.trim();

    if (pwd.length !== 8 || !/[A-Za-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
        showAlert('A senha deve possuir exatamente 8 dígitos contendo letras e números.', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.rpc('register_gtd_user', { p_re: re, p_password: pwd });
        if (error) throw error;
        if (data.success) {
            showAlert(data.message, 'ok');
            e.target.reset();
            switchAuthTab('login');
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) { showAlert('Falha de comunicação nas RPCs do Supabase.', 'error'); }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const re = e.target.re.value.trim();
    const pwd = e.target.password.value.trim();

    try {
        const { data, error } = await supabaseClient.rpc('login_gtd_user', { p_re: re, p_password: pwd });
        if (error) throw error;
        if (data.success) {
            state.user = { name: data.name, role: data.role, team: data.team, re: data.re };
            await fetchEmployeesData();
            navigateTo('public');
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) { showAlert('RE ou senha incorretos.', 'error'); }
}

// ==========================================
// MÓDULO: TELEMETRIA AVANÇADA POR CARGO (V3.1)
// ==========================================
function renderPublicView(container) {
    const statusTypes = ['Ativo', 'Férias', 'Atestado', 'Curso', 'Inativo', 'Emprestado'];
    
    // Organograma atualizado batendo com a estrutura corporativa exata
    const nucleos = {
        DADOS: ['Administrador Master do Sistema', 'Coordenador', 'Supervisor de Dados', 'Apoio de Supervisor', 'TÉCNICO DE DADOS II', 'TÉCNICO DE DADOS I'],
        SWT: ['Supervisor de Rede', 'TÉCNICO MULTSKILL', 'TÉCNICO DE FIBRA II', 'TÉCNICO DE FIBRA I', 'AUXILIAR'],
        ESCRITÓRIO: ['Supervisora de Escritório', 'Assistente', 'Atendente']
    };

    let telemetryHtml = '';

    for (const [nucleo, cargos] of Object.entries(nucleos)) {
        let rowsHtml = '';
        const totaisNucleo = { Total: 0 };
        statusTypes.forEach(s => totaisNucleo[s] = 0);

        cargos.forEach(cargo => {
            const statsCargo = { Total: 0 };
            statusTypes.forEach(s => statsCargo[s] = 0);

            state.employees.forEach(emp => {
                if (emp.team === nucleo && emp.role === cargo) {
                    statsCargo['Total']++;
                    totaisNucleo['Total']++;
                    if (statsCargo[emp.status] !== undefined) {
                        statsCargo[emp.status]++;
                        totaisNucleo[emp.status]++;
                    }
                }
            });

            rowsHtml += `
                <tr>
                    <td><strong>${cargo}</strong></td>
                    <td class="cell-total">${statsCargo['Total']}</td>
                    ${statusTypes.map(s => `<td class="${statsCargo[s] > 0 ? 'has-value status-' + s.toLowerCase() : ''}">${statsCargo[s]}</td>`).join('')}
                </tr>
            `;
        });

        telemetryHtml += `
            <div class="panel telemetry-panel" style="margin-bottom:24px;">
                <h3>📊 NÚCLEO ${nucleo}</h3>
                <div class="admin-table-wrapper">
                    <table class="telemetry-table-matrix">
                        <thead>
                            <tr>
                                <th>Hierarquia / Cargo</th>
                                <th class="cell-total">Total</th>
                                ${statusTypes.map(s => `<th>${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                            <tr class="row-subtotal-summary">
                                <td><strong>⚡ SUBTOTAL NÚCLEO</strong></td>
                                <td class="cell-total">${totaisNucleo['Total']}</td>
                                ${statusTypes.map(s => `<td>${totaisNucleo[s]}</td>`).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    const totalGeral = { Total: 0 };
    statusTypes.forEach(s => totalGeral[s] = 0);
    state.employees.forEach(emp => {
        totalGeral['Total']++;
        if (totalGeral[emp.status] !== undefined) totalGeral[emp.status]++;
    });

    const filtered = state.employees.filter(emp => 
        (emp.name || '').toLowerCase().includes(state.searchQuery.toLowerCase()) || (emp.re || '').includes(state.searchQuery)
    );

    container.innerHTML = `
        <div class="section-head">
            <h2>Mesa de Telemetria Operacional</h2>
            <p>Visão estatística distribuída e fatiada pelo organograma Ability</p>
        </div>

        <div class="panel" style="background:#1e1b4b; color:#fff; margin-bottom:32px;">
          <h3 style="color:#fff; margin-bottom:15px;">🌍 CONSOLIDAÇÃO TOTAL DA ESTRUTURA</h3>
          <div class="metrics-grid">
             <div class="metric-card total" style="background:rgba(255,255,255,0.1); border:0;"><span class="metric-val" style="color:#fff">${totalGeral['Total']}</span><span class="metric-label" style="color:#cbd5e1">Geral</span></div>
             ${statusTypes.map(s => `
                <div class="metric-card ${s.toLowerCase()}">
                    <span class="metric-val">${totalGeral[s]}</span>
                    <span class="metric-label">${s}</span>
                </div>
             `).join('')}
          </div>
        </div>

        ${telemetryHtml}

        <section class="search-section">
            <div class="panel search-panel">
                <div class="search-bar-container">
                    <input type="text" id="search-input" placeholder="Buscar funcionário por nome ou RE..." value="${escapeHtml(state.searchQuery)}">
                    <button class="primary-btn" id="btn-search-trigger">Consultar Ficha</button>
                </div>
                <div class="results-container">
                    ${state.searchQuery ? `
                        <h4 class="results-title">Registros Encontrados (${filtered.length})</h4>
                        <div class="employees-list-grid">
                            ${filtered.map(emp => `
                                <div class="employee-card-public status-${emp.status.toLowerCase()}">
                                    <div class="emp-main-info">
                                        <span class="emp-badge-team ${emp.team.toLowerCase()}">${escapeHtml(emp.team)}</span>
                                        <span class="emp-badge-status ${emp.status.toLowerCase()}">${escapeHtml(emp.status)}</span>
                                    </div>
                                    <h4 class="emp-name">${escapeHtml(emp.name)}</h4>
                                    <div class="emp-details-meta">
                                        <p><strong>RE:</strong> ${escapeHtml(emp.re)} | <strong>SAP:</strong> ${escapeHtml(emp.sap || '-')}</p>
                                        <p><strong>Cargo:</strong> ${escapeHtml(emp.role)}</p>
                                        <hr style="margin:8px 0; border:0; border-top:1px dashed var(--line);">
                                        <p><strong>CPF:</strong> ${escapeHtml(emp.cpf || '-')}</p>
                                        <p><strong>RG:</strong> ${escapeHtml(emp.rg || '-')}</p>
                                        <p><strong>Celular:</strong> ${escapeHtml(emp.phone || '-')}</p>
                                        <p><strong>Endereço:</strong> ${escapeHtml(emp.address || '-')}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `<div class="empty">Use o filtro acima para puxar o dossiê individual do profissional.</div>`}
                </div>
            </div>
        </section>
    `;

    document.getElementById('btn-search-trigger').addEventListener('click', () => {
        state.searchQuery = document.getElementById('search-input').value.trim();
        render();
    });
}

// ==========================================
// MÓDULO: GESTÃO E CADASTRO ADMINISTRATIVO
// ==========================================
function renderAdminView(container) {
    container.innerHTML = `
        <div class="admin-grid-layout" style="grid-template-columns: 420px 1fr;">
            <div class="panel admin-panel-form">
                <h3>👥 Cadastro de Integrante</h3>
                <p class="panel-subtitle">Insira colaboradores respeitando os novos núcleos ativos</p>
                <form id="form-add-employee" class="form admin-compact-form">
                    <div class="form-row-double">
                        <label><span>RE *</span><input type="text" name="re" required></label>
                        <label><span>SAP</span><input type="text" name="sap"></label>
                    </div>
                    <label><span>Nome Completo *</span><input type="text" name="name" required></label>
                    
                    <label><span>Cargo Cadastrado *</span>
                        <select name="role" required>
                            <option value="Administrador Master do Sistema">Administrador Master do Sistema</option>
                            <option value="Coordenador">Coordenador</option>
                            <option value="Supervisor de Dados">Supervisor de Dados</option>
                            <option value="Supervisor de Rede">Supervisor de Rede</option>
                            <option value="Supervisora de Escritório">Supervisora de Escritório</option>
                            <option value="Apoio de Supervisor">Apoio de Supervisor</option>
                            <option value="Assistente">Assistente</option>
                            <option value="Atendente">Atendente</option>
                            <option value="TÉCNICO DE DADOS II">TÉCNICO DE DADOS II</option>
                            <option value="TÉCNICO DE DADOS I">TÉCNICO DE DADOS I</option>
                            <option value="TÉCNICO MULTSKILL">TÉCNICO MULTSKILL</option>
                            <option value="TÉCNICO DE FIBRA II">TÉCNICO DE FIBRA II</option>
                            <option value="TÉCNICO DE FIBRA I">TÉCNICO DE FIBRA I</option>
                            <option value="AUXILIAR">AUXILIAR</option>
                        </select>
                    </label>
                    
                    <label><span>Núcleo Operacional *</span>
                        <select name="team" required>
                            <option value="DADOS">DADOS</option>
                            <option value="SWT">SWT</option>
                            <option value="ESCRITÓRIO">ESCRITÓRIO</option>
                        </select>
                    </label>
                    
                    <div class="form-row-double">
                        <label><span>CPF</span><input type="text" name="cpf"></label>
                        <label><span>RG</span><input type="text" name="rg"></label>
                    </div>
                    <div class="form-row-double">
                        <label><span>Celular</span><input type="text" name="phone"></label>
                        <label><span>RE Tel</span><input type="text" name="re_tel"></label>
                    </div>
                    <label><span>E-mail</span><input type="email" name="email"></label>
                    <label><span>Endereço</span><input type="text" name="address"></label>
                    
                    <button type="submit" class="primary-btn">Cadastrar Integrante</button>
                </form>
            </div>

            <div class="panel admin-panel-list">
                <div class="panel-header-action">
                    <h3>📋 Listagem Geral de Modificações</h3>
                    <span class="counter-badge-s">Total: ${state.employees.length}</span>
                </div>
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>RE / SAP</th>
                                <th>Nome</th>
                                <th>Núcleo</th>
                                <th>Cargo</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.employees.map(emp => `
                                <tr>
                                    <td><strong>${escapeHtml(emp.re)}</strong></td>
                                    <td>${escapeHtml(emp.name)}</td>
                                    <td><span class="table-team-badge ${emp.team.toLowerCase()}">${escapeHtml(emp.team)}</span></td>
                                    <td><small>${escapeHtml(emp.role)}</small></td>
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
                                    <td>
                                        <button class="ghost-btn btn-delete-trigger" data-id="${emp.id}" style="color:#ef4444;">Excluir</button>
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
    container.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => handleStatusMutation(e.target.getAttribute('data-id'), e.target.value));
    });
    container.querySelectorAll('.btn-delete-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => handleDeleteEmployee(e.target.getAttribute('data-id')));
    });
}

async function handleCreateEmployee(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
        re: formData.get('re').trim(), sap: formData.get('sap').trim(),
        name: formData.get('name').trim().toUpperCase(), role: formData.get('role'),
        cpf: formData.get('cpf').trim() || null, rg: formData.get('rg').trim() || null,
        phone: formData.get('phone').trim() || null, re_tel: formData.get('re_tel').trim() || null,
        email: formData.get('email').trim() || null, address: formData.get('address').trim() || null,
        team: formData.get('team'), status: 'Ativo'
    };
    try {
        const { error } = await supabaseClient.from('employees').insert([payload]);
        if (error) throw error;
        showAlert('Funcionário inserido com sucesso!', 'ok');
        e.target.reset();
        await fetchEmployeesData();
        render();
    } catch (err) { showAlert('Erro de cadastro (RE duplicado).', 'error'); }
}

async function handleStatusMutation(id, newStatus) {
    try {
        const { error } = await supabaseClient.from('employees').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        const target = state.employees.find(e => e.id === id);
        if (target) target.status = newStatus;
        showAlert('Status operacional mutado.', 'ok');
        setTimeout(() => showAlert(''), 2000);
        render();
    } catch (err) { showAlert('Erro ao alterar status.', 'error'); }
}

async function handleDeleteEmployee(id) {
    if (!confirm('Deseja excluir permanentemente este registro?')) return;
    try {
        const { error } = await supabaseClient.from('employees').delete().eq('id', id);
        if (error) throw error;
        showAlert('Registro deletado.', 'ok');
        await fetchEmployeesData();
        render();
    } catch (err) { showAlert('Erro ao remover colaborador.', 'error'); }
}