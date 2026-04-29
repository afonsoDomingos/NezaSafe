let risksData = [];
let chartInstance = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    
    // Fetch initial data from API
    await fetchRisks();
    
    // Setup event listeners
    document.getElementById('btn-add-risk').addEventListener('click', () => {
        document.getElementById('form-add-risk').style.display = 'block';
    });
    
    document.getElementById('btn-cancel-risk').addEventListener('click', () => {
        document.getElementById('form-add-risk').style.display = 'none';
        document.getElementById('risk-form').reset();
    });
    
    document.getElementById('risk-form').addEventListener('submit', handleRiskSubmit);
    
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderRisksList(e.target.dataset.filter);
        });
    });
});

async function fetchRisks() {
    try {
        const response = await fetch('/api/risks');
        if (response.ok) {
            risksData = await response.json();
            refreshAllViews();
        } else {
            console.error('Falha ao buscar riscos da API.');
        }
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        showAlert('Erro de Conexão', 'Não foi possível carregar os dados do servidor. Você está visualizando os dados locais ou a API não está respondendo.');
    }
}

// Navigation Logic
function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav li');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('current-page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const targetView = item.dataset.view;
            views.forEach(view => view.classList.remove('active'));
            document.getElementById(`view-${targetView}`).classList.add('active');

            pageTitle.innerText = item.querySelector('span').innerText;
        });
    });
}

function switchView(viewName) {
    const navItem = document.querySelector(`.sidebar-nav li[data-view="${viewName}"]`);
    if(navItem) navItem.click();
}

// Data Handling & Rendering
function updateDashboard() {
    const activeRisks = risksData.filter(r => r.status === 'ativo');
    const resolvedRisks = risksData.filter(r => r.status === 'resolvido');
    const highRisks = risksData.filter(r => r.level === 'alto' && r.status === 'ativo');
    
    document.getElementById('metric-active').innerText = activeRisks.length;
    document.getElementById('metric-resolved').innerText = resolvedRisks.length;
    document.getElementById('metric-high').innerText = highRisks.length;

    const threatLevelEl = document.getElementById('metric-threat');
    if (highRisks.length > 2) {
        threatLevelEl.innerText = 'Crítico';
        threatLevelEl.style.color = 'var(--status-high)';
    } else if (highRisks.length > 0 || activeRisks.length > 5) {
        threatLevelEl.innerText = 'Elevado';
        threatLevelEl.style.color = 'var(--status-medium)';
    } else {
        threatLevelEl.innerText = 'Controlado';
        threatLevelEl.style.color = 'var(--status-resolved)';
    }

    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';
    
    const recentRisks = [...risksData].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    recentRisks.forEach(risk => {
        const dateObj = new Date(risk.date);
        const dateStr = `${dateObj.toLocaleDateString('pt-BR')} ${dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
        const dotClass = risk.status === 'resolvido' ? 'resolvido' : risk.level;
        
        activityList.innerHTML += `
            <li>
                <div class="activity-dot ${dotClass}"></div>
                <div class="activity-info">
                    <p>${risk.name}</p>
                    <span>${dateStr} - ${risk.status === 'resolvido' ? 'Resolvido' : 'Registrado'}</span>
                </div>
            </li>
        `;
    });

    if(!chartInstance) {
        initChart();
    } else {
        updateChart();
    }
}

function renderRisksList(filter = 'all') {
    const grid = document.getElementById('risks-grid');
    grid.innerHTML = '';

    let filteredData = risksData;
    if (filter !== 'all') {
        filteredData = risksData.filter(r => r.status === filter);
    }

    filteredData.sort((a, b) => {
        if(a.status !== b.status) return a.status === 'ativo' ? -1 : 1;
        const levelWeight = { 'alto': 3, 'medio': 2, 'baixo': 1 };
        if(levelWeight[b.level] !== levelWeight[a.level]) return levelWeight[b.level] - levelWeight[a.level];
        return new Date(b.date) - new Date(a.date);
    });

    filteredData.forEach(risk => {
        let levelLabel = risk.level.charAt(0).toUpperCase() + risk.level.slice(1);
        let badgeClass = risk.status === 'resolvido' ? 'resolvido' : risk.level;
        let badgeText = risk.status === 'resolvido' ? 'Resolvido' : levelLabel;

        const card = document.createElement('div');
        card.className = 'risk-item';
        card.setAttribute('data-level', risk.level);
        card.setAttribute('data-status', risk.status);
        
        card.innerHTML = `
            <div class="risk-header">
                <h4>${risk.name}</h4>
                <span class="badge-level ${badgeClass}">${badgeText}</span>
            </div>
            <p class="risk-desc">${risk.description}</p>
            <div class="risk-actions">
                ${risk.status === 'ativo' ? 
                    `<button class="btn-small btn-resolve" onclick="resolveRisk('${risk.id}')">
                        <i class="fa-solid fa-check"></i> Resolver
                    </button>` 
                    : ''
                }
                <button class="btn-small btn-delete" onclick="deleteRisk('${risk.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderReportsTable() {
    const tbody = document.getElementById('reports-table-body');
    tbody.innerHTML = '';

    const sortedData = [...risksData].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedData.forEach(risk => {
        const dateObj = new Date(risk.date);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        
        let levelLabel = risk.level.charAt(0).toUpperCase() + risk.level.slice(1);
        let statusLabel = risk.status.charAt(0).toUpperCase() + risk.status.slice(1);

        tbody.innerHTML += `
            <tr>
                <td><strong>${risk.id}</strong></td>
                <td>${risk.name}</td>
                <td><span class="badge-level ${risk.level}">${levelLabel}</span></td>
                <td><span class="status-badge ${risk.status}">${statusLabel}</span></td>
                <td>${dateStr}</td>
                <td>
                    <button class="btn-text" onclick="deleteRisk('${risk.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// Chart.js Setup
function initChart() {
    const ctx = document.getElementById('risksChart');
    if (!ctx) return;
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: getChartData(),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true }
                }
            },
            borderWidth: 0
        }
    });
}

function getChartData() {
    const active = risksData.filter(r => r.status === 'ativo');
    const altos = active.filter(r => r.level === 'alto').length;
    const medios = active.filter(r => r.level === 'medio').length;
    const baixos = active.filter(r => r.level === 'baixo').length;

    return {
        labels: ['Alto Risco', 'Médio Risco', 'Baixo Risco'],
        datasets: [{
            data: [altos, medios, baixos],
            backgroundColor: ['#ef4444', '#eab308', '#3b82f6'],
            borderWidth: 0,
            hoverOffset: 4
        }]
    };
}

function updateChart() {
    if(chartInstance) {
        chartInstance.data = getChartData();
        chartInstance.update();
    }
}

// Actions
async function handleRiskSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('#risk-form .btn-primary');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Salvando...';
    submitBtn.disabled = true;

    const name = document.getElementById('risk-name').value;
    const desc = document.getElementById('risk-desc').value;
    const level = document.getElementById('risk-level').value;
    const status = document.getElementById('risk-status').value;
    
    const newRisk = {
        id: `RSK-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: name,
        description: desc,
        level: level,
        status: status,
        date: new Date().toISOString()
    };
    
    try {
        const res = await fetch('/api/risks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRisk)
        });
        
        if (!res.ok) throw new Error("Erro na API");

        await fetchRisks();
        
        document.getElementById('form-add-risk').style.display = 'none';
        document.getElementById('risk-form').reset();
        
        if(level === 'alto' && status === 'ativo') {
            showAlert('Novo Risco Crítico Adicionado', name);
        }
    } catch (error) {
        console.error('Erro ao salvar risco', error);
        showAlert('Erro', 'Não foi possível salvar o risco. Verifique a conexão com o banco de dados.');
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

async function resolveRisk(id) {
    try {
        const res = await fetch('/api/risks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'resolvido' })
        });
        if (!res.ok) throw new Error("Erro na API");
        
        await fetchRisks();
    } catch(error) {
        console.error('Erro ao resolver risco', error);
        showAlert('Erro', 'Não foi possível resolver o risco.');
    }
}

async function deleteRisk(id) {
    if(confirm('Tem certeza que deseja remover este registro?')) {
        try {
            const res = await fetch(`/api/risks?id=${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error("Erro na API");
            
            await fetchRisks();
        } catch(error) {
            console.error('Erro ao deletar risco', error);
            showAlert('Erro', 'Não foi possível remover o risco.');
        }
    }
}

function refreshAllViews() {
    updateDashboard();
    
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
    renderRisksList(filter);
    
    renderReportsTable();
}

// Alert System
let unreadAlerts = 0;

function showAlert(title, message) {
    const container = document.getElementById('alerts-container');
    const alert = document.createElement('div');
    alert.className = 'alert';
    
    alert.innerHTML = `
        <div class="alert-icon">
            <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div class="alert-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(alert);
    
    unreadAlerts++;
    document.getElementById('alert-badge').innerText = unreadAlerts;
    
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);
}

function exportReport() {
    const btn = document.querySelector('.reports-header .btn-primary');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Download Concluído';
        btn.style.backgroundColor = 'var(--status-resolved)';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '';
            btn.disabled = false;
        }, 2000);
    }, 1500);
}
