// ==========================================================================
// GTD-ABILITY SISTEMA DE TELEMETRIA E CONSULTA DE FUNCIONÁRIOS - V5.7 CORE
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
        document.getElementById('app').innerHTML = `<div class="message show error" style="max-width:600px; margin:50px auto;">Erro de Configuração: Verifique as chaves no config.js</div>`;
    });
}

const state = {
    view: 'login', 
    user: null,     
    employees: [],  
    searchQuery: '',
    editingEmployeeId: null 
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) return;
    initAppStructure();
    await fetchEmployeesData();
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
                <div class="brand-logo" id="logo-click-fix" style="cursor:pointer;">
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

    const logo = document.getElementById('logo-click-fix');
    if (logo) {
        logo.addEventListener('click', () => {
            if (state.user) navigateTo('public');
        });
    }
}

async function navigateTo(targetView) {
    if (!state.user && targetView !== 'login') {
        state.view = 'login';
    } else {
        state.view = targetView;
    }
    state.searchQuery = '';
    showAlert('', 'ok');
    await fetchEmployeesData(); 
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
                <span>👤 ${escapeHtml(state.user.name)} <small style="background:rgba(79,70,229,0.1); padding:2px 6px; border-radius:4px; font-size:0.75rem; color:var(--primary); font-weight:700;">${escapeHtml(state.user.role)}</small></span>
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
        actions.innerHTML = `<span class="brand-sub" style="font-weight:700; color:var(--muted);">Mesa de Autenticação</span>`;
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

function renderPublicView(container) {
    const statusTypes = ['Ativo', 'Férias', 'Atestado', 'Curso', 'Inativo', 'Emprestado', 'Folga'];
    
    const nucleos = {
        DADOS: ['COORDENADOR', 'SUPERVISOR DE DADOS', 'APOIO DE SUPERVISOR', 'TÉCNICO DE DADOS II', 'TÉCNICO DE DADOS I'],
        SWT: ['SUPERVISOR DE REDE', 'TÉCNICO MULTSKILL', 'TÉCNICO DE FIBRA II', 'TÉCNICO DE FIBRA I', 'AUXILIAR'],
        ESCRITÓRIO: ['SUPERVISORA DE ESCRITÓRIO', 'ASSISTENTE', 'ATENDENTE']
    };

    const totalGeral = { Total: 0, Ativo: 0, Férias: 0, Atestado: 0, Curso: 0, Inativo: 0, Emprestado: 0, Folga: 0 };
    
    state.employees.forEach(emp => {
        totalGeral.Total++;
        const statusNormalizado = (emp.status || '').toUpperCase().trim();
        if (statusNormalizado === 'ATIVO') totalGeral.Ativo++;
        else if (statusNormalizado === 'FÉRIAS' || statusNormalizado === 'FERIAS') totalGeral.Férias++;
        else if (statusNormalizado === 'ATESTADO') totalGeral.Atestado++;
        else if (statusNormalizado === 'CURSO') totalGeral.Curso++;
        else if (statusNormalizado === 'INATIVO') totalGeral.Inativo++;
        else if (statusNormalizado === 'EMPRESTADO') totalGeral.Emprestado++;
        else if (statusNormalizado === 'FOLGA') totalGeral.Folga++;
    });

    let telemetryHtml = '';

    for (const [nucleo, cargos] of Object.entries(nucleos)) {
        let rowsHtml = '';
        const totaisNucleo = { Total: 0, Ativo: 0, Férias: 0, Atestado: 0, Curso: 0, Inativo: 0, Emprestado: 0, Folga: 0 };

        cargos.forEach(cargo => {
            const statsCargo = { Total: 0, Ativo: 0, Férias: 0, Atestado: 0, Curso: 0, Inativo: 0, Emprestado: 0, Folga: 0 };

            state.employees.forEach(emp => {
                const empTeam = (emp.team || '').toUpperCase().trim();
                const empRole = (emp.role || '').toUpperCase().trim();
                const targetRole = cargo.toUpperCase().trim();

                if (empTeam === nucleo && empRole === targetRole) {
                    statsCargo.Total++;
                    totaisNucleo.Total++;
                    
                    const statusNormalizado = (emp.status || '').toUpperCase().trim();
                    if (statusNormalizado === 'ATIVO') { 
                        statsCargo.Ativo++; totaisNucleo.Ativo++; 
                    } else if (statusNormalizado === 'FÉRIAS' || statusNormalizado === 'FERIAS') { 
                        statsCargo.Férias++; totaisNucleo.Férias++; 
                    } else if (statusNormalizado === 'ATESTADO') { 
                        statsCargo.Atestado++; totaisNucleo.Atestado++; 
                    } else if (statusNormalizado === 'CURSO') { 
                        statsCargo.Curso++; totaisNucleo.Curso++; 
                    } else if (statusNormalizado === 'INATIVO') { 
                        statsCargo.Inativo++; totaisNucleo.Inativo++; 
                    } else if (statusNormalizado === 'EMPRESTADO') { 
                        statsCargo.Emprestado++; totaisNucleo.Emprestado++; 
                    } else if (statusNormalizado === 'FOLGA') {
                        statsCargo.Folga++; totaisNucleo.Folga++;
                    }
                }
            });

            rowsHtml += `
                <tr>
                    <td class="cell-cargo-title"><strong>${cargo}</strong></td>
                    <td class="cell-total">${statsCargo.Total}</td>
                    ${statusTypes.map(s => {
                        const val = statsCargo[s];
                        return `<td class="${val > 0 ? 'has-value status-' + s.toLowerCase() : 'cell-zero'}">${val}</td>`;
                    }).join('')}
                </tr>
            `;
        });

        telemetryHtml += `
            <div class="panel telemetry-panel" style="margin-bottom:32px;">
                <h3 style="font-size:1.1rem; color:var(--primary); font-weight:800; border-bottom:2px solid var(--line); padding-bottom:8px; margin-bottom:16px;">📊 NÚCLEO OPERACIONAL: ${nucleo}</h3>
                <div class="admin-table-wrapper">
                    <table class="telemetry-table-matrix">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding:16px;">Hierarquia / Cargo</th>
                                <th class="cell-total">Total</th>
                                ${statusTypes.map(s => `<th>${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                            <tr class="row-subtotal-summary" style="background:#f1f5f9; font-weight:700;">
                                <td style="text-align:left; padding:16px;"><strong>⚡ SUBTOTAL NÚCLEO</strong></td>
                                <td class="cell-total">${totaisNucleo.Total}</td>
                                ${statusTypes.map(s => `<td>${totaisNucleo[s]}</td>`).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    const filtered = state.employees.filter(emp => 
        (emp.name || '').toLowerCase().includes(state.searchQuery.toLowerCase()) || (emp.re || '').includes(state.searchQuery)
    );

    const getCleanTeamClass = (team) => {
        const clean = (team || '').toUpperCase().trim();
        if (clean === 'ESCRITÓRIO' || clean === 'ESCRITORIO') return 'escritorio';
        return clean.toLowerCase();
    };

    container.innerHTML = `
        <div class="section-head">
            <h2>Mesa de Telemetria Operacional</h2>
            <p>Visão estatística distribuída e fatiada pelo Organograma B2B</p>
        </div>

        <div class="panel" style="background:#0f172a; color:#fff; margin-bottom:32px; padding:24px; border-radius:12px;">
          <h3 style="color:#fff; margin-bottom:20px; font-size: 1.1rem; font-weight:700; letter-spacing: 0.02em;">🌍 CONSOLIDAÇÃO TOTAL DA ESTRUTURA</h3>
          <div class="metrics-grid">
             <div class="metric-card total" style="border-top: 4px solid #fff; background:rgba(255,255,255,0.05);"><span class="metric-val" style="color:#fff">${totalGeral.Total}</span><span class="metric-label" style="color:#94a3b8">Geral</span></div>
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
                                        <span class="emp-badge-team ${getCleanTeamClass(emp.team)}">${escapeHtml(emp.team)}</span>
                                        <span class="emp-badge-status ${emp.status.toLowerCase()}">${escapeHtml(emp.status)}</span>
                                    </div>
                                    <h4 class="emp-name">${escapeHtml(emp.name)}</h4>
                                    <div class="emp-details-meta">
                                        <p><strong>RE:</strong> ${escapeHtml(emp.re)} | <strong>RE Tel:</strong> ${escapeHtml(emp.re_tel || '-')} | <strong>SAP:</strong> ${escapeHtml(emp.sap || '-')}</p>
                                        <p><strong>Cargo:</strong> ${escapeHtml(emp.role)}</p>
                                        <hr style="margin:8px 0; border:0; border-top:1px dashed var(--line);">
                                        <p><strong>CPF:</strong> ${escapeHtml(emp.cpf || '-')} | <strong>RG:</strong> ${escapeHtml(emp.rg || '-')}</p>
                                        <p><strong>Celular:</strong> ${escapeHtml(emp.phone || '-')} | <strong>E-mail:</strong> ${escapeHtml(emp.email || '-')}</p>
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

function renderAdminView(container) {
    const getCleanTeamClass = (team) => {
        const clean = (team || '').toUpperCase().trim();
        if (clean === 'ESCRITÓRIO' || clean === 'ESCRITORIO') return 'escritorio';
        return clean.toLowerCase();
    };

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
                            <option value="COORDENADOR">COORDENADOR</option>
                            <option value="SUPERVISOR DE DADOS">SUPERVISOR DE DADOS</option>
                            <option value="SUPERVISOR DE REDE">SUPERVISOR DE REDE</option>
                            <option value="SUPERVISORA DE ESCRITÓRIO">SUPERVISORA DE ESCRITÓRIO</option>
                            <option value="APOIO DE SUPERVISOR">APOIO DE SUPERVISOR</option>
                            <option value="ASSISTENTE">ASSISTENTE</option>
                            <option value="ATENDENTE">ATENDENTE</option>
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
                                <th style="text-align: center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.employees.map(emp => `
                                <tr>
                                    <td>
                                        <div><strong>${escapeHtml(emp.re)}</strong></div>
                                        <div style="font-size:0.75rem; color:var(--muted);">SAP: ${escapeHtml(emp.sap || '-')}</div>
                                    </td>
                                    <td>${escapeHtml(emp.name)}</td>
                                    <td><span class="table-team-badge ${getCleanTeamClass(emp.team)}">${escapeHtml(emp.team)}</span></td>
                                    <td><small>${escapeHtml(emp.role)}</small></td>
                                    <td>
                                        <select class="status-select select-${emp.status.toLowerCase()}" data-id="${emp.id}">
                                            <option value="Ativo" ${emp.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                                            <option value="Férias" ${emp.status === 'Férias' ? 'selected' : ''}>Férias</option>
                                            <option value="Atestado" ${emp.status === 'Atestado' ? 'selected' : ''}>Atestado</option>
                                            <option value="Curso" ${emp.status === 'Curso' ? 'selected' : ''}>Curso</option>
                                            <option value="Inativo" ${emp.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                                            <option value="Emprestado" ${emp.status === 'Emprestado' ? 'selected' : ''}>Emprestado</option>
                                            <option value="Folga" ${emp.status === 'Folga' ? 'selected' : ''}>Folga</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div style="display: flex; gap: 8px; justify-content: center;">
                                            <button class="secondary-btn btn-edit-trigger" data-id="${emp.id}" style="padding: 6px 10px; font-size: 0.8rem; border-color: #cbd5e0;">Editar</button>
                                            <button class="ghost-btn btn-delete-trigger" data-id="${emp.id}" style="padding: 6px 10px; font-size: 0.8rem; color: #ef4444;">Excluir</button>
                                        </div>
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
    
    container.querySelectorAll('.btn-edit-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openEditModal(e.target.getAttribute('data-id'));
        });
    });

    container.querySelectorAll('.btn-delete-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => handleDeleteEmployee(e.target.getAttribute('data-id')));
    });
}

async function handleCreateEmployee(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
        re: formData.get('re').trim(), 
        sap: formData.get('sap').trim(),
        name: formData.get('name').trim().toUpperCase(), 
        role: formData.get('role'),
        cpf: formData.get('cpf').trim() || null, 
        rg: formData.get('rg').trim() || null,
        phone: formData.get('phone').trim() || null, 
        re_tel: formData.get('re_tel').trim() || null,
        email: formData.get('email').trim() || null, 
        address: formData.get('address').trim() || null,
        team: formData.get('team'), 
        status: 'Ativo'
    };
    try {
        const { error } = await supabaseClient.from('employees').insert([payload]);
        if (error) throw error;
        showAlert('Funcionário inserido com sucesso!', 'ok');
        e.target.reset();
        await fetchEmployeesData();
        render();
    } catch (err) { showAlert('Erro de cadastro (RE ou CPF duplicado).', 'error'); }
}

// FIX: Função limpa e sem nenhum caractere orfão remanescente ao final
function openEditModal(id) {
    const emp = state.employees.find(e => e.id === id);
    if (!emp) return;

    state.editingEmployeeId = id;
    const modal = document.getElementById('edit-modal');
    modal.classList.add('active');

    modal.innerHTML = `
        <div class="modal-card panel" style="max-width: 500px; width: 100%; margin: 40px auto; position: relative; z-index: 1000;">
            <h3 style="margin-bottom: 5px;">✏️ Editar Registro</h3>
            <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 20px;">Atualização de RE: ${escapeHtml(emp.re)}</p>
            
            <form id="form-update-employee" class="form" style="gap: 12px;">
                <div class="form-row-double">
                    <label><span>RE *</span><input type="text" name="re" required value="${escapeHtml(emp.re)}"></label>
                    <label><span>SAP</span><input type="text" name="sap" value="${escapeHtml(emp.sap || '')}"></label>
                </div>
                <label><span>Nome Completo *</span><input type="text" name="name" required value="${escapeHtml(emp.name)}"></label>
                <label><span>Cargo Cadastrado *</span><input type="text" name="role" required value="${escapeHtml(emp.role)}"></label>
                
                <div class="form-row-double">
                    <label><span>CPF</span><input type="text" name="cpf" value="${escapeHtml(emp.cpf || '')}"></label>
                    <label><span>RG</span><input type="text" name="rg" value="${escapeHtml(emp.rg || '')}"></label>
                </div>
                <div class="form-row-double">
                    <label><span>Celular</span><input type="text" name="phone" value="${escapeHtml(emp.phone || '')}"></label>
                    <label><span>RE Tel</span><input type="text" name="re_tel" value="${escapeHtml(emp.re_tel || '')}"></label>
                </div>
                <label><span>E-mail</span><input type="email" name="email" value="${escapeHtml(emp.email || '')}"></label>
                <label><span>Endereço</span><input type="text" name="address" value="${escapeHtml(emp.address || '')}"></label>
                
                <div class="form-row-double">
                    <label><span>Equipe</span>
                        <select name="team">
                            <option value="DADOS" ${emp.team === 'DADOS' ? 'selected' : ''}>DADOS</option>
                            <option value="SWT" ${emp.team === 'SWT' ? 'selected' : ''}>SWT</option>
                            <option value="ESCRITÓRIO" ${emp.team === 'ESCRITÓRIO' ? 'selected' : ''}>ESCRITÓRIO</option>
                        </select>
                    </label>
                    <label><span>Status Operacional</span>
                        <select name="status">
                            <option value="Ativo" ${emp.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="Férias" ${emp.status === 'Férias' ? 'selected' : ''}>Férias</option>
                            <option value="Atestado" ${emp.status === 'Atestado' ? 'selected' : ''}>Atestado</option>
                            <option value="Curso" ${emp.status === 'Curso' ? 'selected' : ''}>Curso</option>
                            <option value="Inativo" ${emp.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                            <option value="Emprestado" ${emp.status === 'Emprestado' ? 'selected' : ''}>Emprestado</option>
                        </select>
                    </label>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button type="submit" class="primary-btn" style="flex: 1;">Salvar Alterações</button>
                    <button type="button" id="btn-close-modal" class="secondary-btn" style="flex: 1;">Cancelar</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('btn-close-modal').addEventListener('click', closeEditModal);
    document.getElementById('form-update-employee').addEventListener('submit', handleUpdateEmployee);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('active');
    modal.innerHTML = '';
    state.editingEmployeeId = null;
}

async function handleUpdateEmployee(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const payload = {
        re: formData.get('re').trim(),
        sap: formData.get('sap').trim(),
        name: formData.get('name').trim().toUpperCase(),
        role: formData.get('role').trim().toUpperCase(),
        cpf: formData.get('cpf').trim() || null,
        rg: formData.get('rg').trim() || null,
        phone: formData.get('phone').trim() || null,
        re_tel: formData.get('re_tel').trim() || null,
        email: formData.get('email').trim() || null,
        address: formData.get('address').trim() || null,
        team: formData.get('team'),
        status: formData.get('status'),
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('employees')
            .update(payload)
            .eq('id', state.editingEmployeeId);

        if (error) throw error;

        alert('Registro modificado e updated com sucesso absoluto!');
        closeEditModal();
        await fetchEmployeesData();
        render();
    } catch (err) {
        console.error("Erro ao salvar:", err.message);
        alert('Erro ao salvar no banco de dados: ' + err.message);
    }
}

async function handleStatusMutation(id, newStatus) {
    const target = state.employees.find(e => e.id === id);
    if (target) target.status = newStatus;

    try {
        const { error } = await supabaseClient
            .from('employees')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);
            
        if (error) throw error;
        
        const { data } = await supabaseClient.from('employees').select('*').order('name', { ascending: true });
        if (data) state.employees = data;
    } catch (err) { 
        console.error("Erro ao mutar status:", err.message);
        showAlert('Erro ao salvar alteração no Supabase.', 'error'); 
    }
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