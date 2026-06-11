// ==========================================================================
// GTD-ABILITY SISTEMA DE TELEMETRIA E CONSULTA DE FUNCIONÁRIOS - MOTOR CORE V2.1
// ==========================================================================

let supabaseClient = null;

try {
    if (!window.GTD_CONFIG || !window.GTD_CONFIG.SUPABASE_URL || window.GTD_CONFIG.SUPABASE_URL.includes("seu-projeto-id")) {
        throw new Error("As credenciais do Supabase não foram configuradas no arquivo config.js.");
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
                    <p style="margin-top: 10px; font-size: 1rem; color: #58151c;">O arquivo <strong>config.js</strong> não foi preenchido corretamente.</p>
                </div>
            `;
        }
    });
}

const state = {
    view: 'public', 
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
        console.error("Erro na leitura de registros do Supabase:", err.message);
        showAlert("Erro de sincronização com a tabela 'employees'.", "error");
    }
}

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
        <div id="edit-modal" class="modal-overlay"></div>
    `;

    document.getElementById('logo-click').addEventListener('click', () => {
        navigateTo('public');
    });
}

function navigateTo(targetView) {
    state.view = targetView;
    if (targetView === 'public') {
        state.searchQuery = '';
    }
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

    if (state.view === 'public') renderPublicView(container);
    else if (state.view === 'login') renderLoginView(container);
    else if (state.view === 'admin') renderAdminView(container);
}

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
// MÓDULO: INTERFACE PÚBLICA DE TELEMETRIA (ATUALIZADA)
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
                                            <p><strong>RE:</strong> ${escapeHtml(emp.re)} | <strong>SAP:</strong> ${escapeHtml(emp.sap || '-')}</p>
                                            <p><strong>Cargo:</strong> ${escapeHtml(emp.role)}</p>
                                            
                                            <hr style="margin: 10px 0; border: 0; border-top: 1px dashed var(--line);">
                                            
                                            <div class="ficha-publica-grid">
                                                <p><strong>CPF:</strong> ${escapeHtml(emp.cpf || '-')}</p>
                                                <p><strong>RG:</strong> ${escapeHtml(emp.rg || '-')}</p>
                                                <p><strong>Celular:</strong> ${escapeHtml(emp.phone || '-')}</p>
                                                <p><strong>RE Tel:</strong> ${escapeHtml(emp.re_tel || '-')}</p>
                                            </div>
                                            <p style="margin-top: 4px;"><strong>E-mail:</strong> ${escapeHtml(emp.email || '-')}</p>
                                            <p style="margin-top: 4px;"><strong>Endereço:</strong> ${escapeHtml(emp.address || '-')}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    ` : `
                        <div class="empty">Insira o nome ou RE acima para carregar a ficha cadastral do colaborador.</div>
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

function renderLoginView(container) {
    container.innerHTML = `
        <div class="auth-shell" style="max-width: 420px; margin: 60px auto;">
            <div class="panel auth-card">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; color: #1a202c;">Acesso à Mesa</h2>
                    <p style="color: #718096; margin-top: 5px; font-size: 0.9rem;">Insira as credenciais de supervisor</p>
                </div>
                <form id="form-login" class="form">
                    <div style="margin-bottom: 15px;">
                        <label>RE Administrativo</label>
                        <input type="text" id="login-re" required placeholder="Digite o RE">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label>Chave Privada</label>
                        <input type="password" id="login-pwd" required placeholder="Sua senha">
                    </div>
                    <button type="submit" class="primary-btn" style="width: 100%;">Liberar Acesso</button>
                </form>
            </div>
        </div>
    `;
    document.getElementById('form-login').addEventListener('submit', (e) => {
        e.preventDefault();
        state.user = { name: "Supervisor Master", re: document.getElementById('login-re').value.trim() };
        navigateTo('admin');
    });
}

// ==========================================
// MÓDULO: VISÃO ADMINISTRATIVA (CRUD MASTER)
// ==========================================
function renderAdminView(container) {
    if (!state.user) { navigateTo('login'); return; }

    container.innerHTML = `
        <div class="admin-grid-layout">
            <div class="panel admin-panel-form">
                <h3>👥 Inclusão Cadastral</h3>
                <p class="panel-subtitle">Insira o técnico com todos os metadados corporativos</p>
                
                <form id="form-add-employee" class="form admin-compact-form">
                    <div class="form-row-double">
                        <label><span>RE *</span><input type="text" name="re" required placeholder="30123"></label>
                        <label><span>SAP</span><input type="text" name="sap" placeholder="100023"></label>
                    </div>
                    
                    <label><span>Nome Completo *</span><input type="text" name="name" required placeholder="EX: MARCOS SILVA"></label>
                    <label><span>Cargo Cadastrado *</span><input type="text" name="role" required placeholder="EX: TÉCNICO II"></label>
                    
                    <div class="form-row-double">
                        <label><span>CPF</span><input type="text" name="cpf" placeholder="000.000.000-00"></label>
                        <label><span>RG</span><input type="text" name="rg" placeholder="00.000.000-0"></label>
                    </div>
                    
                    <div class="form-row-double">
                        <label><span>Celular / WhatsApp</span><input type="text" name="phone" placeholder="(11) 99999-9999"></label>
                        <label><span>RE Tel</span><input type="text" name="re_tel" placeholder="RE Telefone"></label>
                    </div>
                    
                    <label><span>E-mail Corporativo</span><input type="email" name="email" placeholder="nome@empresa.com"></label>
                    <label><span>Endereço Residencial</span><input type="text" name="address" placeholder="Rua, Número, Bairro"></label>
                    
                    <label><span>Núcleo / Equipe *</span>
                        <select name="team" required>
                            <option value="DADOS">DADOS</option>
                            <option value="SWT">SWT</option>
                        </select>
                    </label>
                    <button type="submit" class="primary-btn" style="margin-top: 10px;">Cadastrar Novo Técnico</button>
                </form>
            </div>

            <div class="panel admin-panel-list">
                <div class="panel-header-action">
                    <h3>📋 Modificações, Status e Baixas</h3>
                    <span class="counter-badge-s">Total: ${state.employees.length}</span>
                </div>
                
                <div class="admin-table-wrapper">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>RE / SAP</th>
                                <th>Nome</th>
                                <th>Núcleo</th>
                                <th>Status</th>
                                <th style="text-align: center;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.employees.map(emp => `
                                <tr>
                                    <td>
                                        <div><strong>${escapeHtml(emp.re)}</strong></div>
                                        <div style="font-size: 0.75rem; color: var(--muted);">SAP: ${escapeHtml(emp.sap || '-')}</div>
                                    </td>
                                    <td>${escapeHtml(emp.name)}</td>
                                    <td><span class="table-team-badge ${escapeHtml((emp.team || '').toLowerCase())}">${escapeHtml(emp.team)}</span></td>
                                    <td>
                                        <select class="status-select select-${(emp.status || 'ativo').toLowerCase()}" data-id="${emp.id}">
                                            <option value="Ativo" ${emp.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                                            <option value="Férias" ${emp.status === 'Férias' ? 'selected' : ''}>Férias</option>
                                            <option value="Atestado" ${emp.status === 'Atestado' ? 'selected' : ''}>Atestado</option>
                                            <option value="Curso" ${emp.status === 'Curso' ? 'selected' : ''}>Curso</option>
                                            <option value="Inativo" ${emp.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                                            <option value="Emprestado" ${emp.status === 'Emprestado' ? 'selected' : ''}>Emprestado</option>
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
        select.addEventListener('change', (e) => {
            handleStatusMutation(e.target.getAttribute('data-id'), e.target.value);
        });
    });

    container.querySelectorAll('.btn-edit-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            openEditModal(e.target.getAttribute('data-id'));
        });
    });

    container.querySelectorAll('.btn-delete-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleDeleteEmployee(e.target.getAttribute('data-id'));
        });
    });
}

async function handleCreateEmployee(e) {
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
        status: 'Ativo'
    };

    try {
        const { error } = await supabaseClient.from('employees').insert([payload]);
        if (error) throw error;

        showAlert('Funcionário cadastrado com sucesso completo!', 'ok');
        e.target.reset();
        await fetchEmployeesData();
        render();
    } catch (err) {
        console.error(err);
        showAlert('Erro ao registrar funcionário (RE ou CPF duplicados).', 'error');
    }
}

async function handleStatusMutation(id, newStatus) {
    try {
        const { error } = await supabaseClient.from('employees').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        
        const target = state.employees.find(e => e.id === id);
        if (target) target.status = newStatus;
        showAlert('Status atualizado com sucesso.', 'ok');
        setTimeout(() => showAlert(''), 3000);
        render();
    } catch (err) {
        showAlert('Não foi possível alterar o status.', 'error');
    }
}

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
                    <label><span>SAP</span><input type="text" name="sap" value="${escapeHtml(emp.sap)}"></label>
                </div>
                <label><span>Nome Completo *</span><input type="text" name="name" required value="${escapeHtml(emp.name)}"></label>
                <label><span>Cargo Cadastrado *</span><input type="text" name="role" required value="${escapeHtml(emp.role)}"></label>
                
                <div class="form-row-double">
                    <label><span>CPF</span><input type="text" name="cpf" value="${escapeHtml(emp.cpf)}"></label>
                    <label><span>RG</span><input type="text" name="rg" value="${escapeHtml(emp.rg)}"></label>
                </div>
                <div class="form-row-double">
                    <label><span>Celular</span><input type="text" name="phone" value="${escapeHtml(emp.phone)}"></label>
                    <label><span>RE Tel</span><input type="text" name="re_tel" value="${escapeHtml(emp.re_tel)}"></label>
                </div>
                <label><span>E-mail</span><input type="email" name="email" value="${escapeHtml(emp.email)}"></label>
                <label><span>Endereço</span><input type="text" name="address" value="${escapeHtml(emp.address)}"></label>
                
                <div class="form-row-double">
                    <label><span>Equipe</span>
                        <select name="team">
                            <option value="DADOS" ${emp.team === 'DADOS' ? 'selected' : ''}>DADOS</option>
                            <option value="SWT" ${emp.team === 'SWT' ? 'selected' : ''}>SWT</option>
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

        showAlert('Registro modificado com sucesso!', 'ok');
        closeEditModal();
        await fetchEmployeesData();
        render();
    } catch (err) {
        showAlert('Erro ao atualizar registro. Verifique a duplicidade de dados.', 'error');
    }
}

async function handleDeleteEmployee(id) {
    const emp = state.employees.find(e => e.id === id);
    if (!emp) return;

    const confirmCheck = confirm(`⚠️ ATENÇÃO CRÍTICA:\nConfirmas a exclusão permanente do técnico ${emp.name} (RE: ${emp.re})? Esta ação é irreversível.`);
    if (!confirmCheck) return;

    try {
        const { error } = await supabaseClient
            .from('employees')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showAlert('Funcionário removido com sucesso do sistema.', 'ok');
        await fetchEmployeesData();
        render();
    } catch (err) {
        showAlert('Erro operacional ao deletar funcionário.', 'error');
    }
}