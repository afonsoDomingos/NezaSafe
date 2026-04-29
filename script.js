let risksData = [];
let chartInstance = null;
let statusChartInstance = null;

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

    if(!chartInstance || !statusChartInstance) {
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

// Chart Plugins
const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
        if (chart.config.type === 'doughnut') {
            const width = chart.width,
                  height = chart.height,
                  ctx = chart.ctx;
                  
            ctx.restore();
            
            const active = risksData.filter(r => r.status === 'ativo').length;
            
            const fontSize = (height / 114).toFixed(2);
            ctx.font = "bold " + fontSize + "em Inter";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#f3f4f6";

            const text = active.toString(),
                  textX = Math.round((width - ctx.measureText(text).width) / 2),
                  textY = height / 2 - 10;

            ctx.fillText(text, textX, textY);
            
            ctx.font = "normal " + (fontSize * 0.3) + "em Inter";
            ctx.fillStyle = "#9ca3af";
            const text2 = "Riscos Ativos",
                  text2X = Math.round((width - ctx.measureText(text2).width) / 2),
                  text2Y = height / 2 + 20;
                  
            ctx.fillText(text2, text2X, text2Y);
            ctx.save();
        }
    }
};

// Chart.js Setup
function initChart() {
    Chart.defaults.color = '#9ca3af';
    Chart.defaults.font.family = "'Inter', sans-serif";

    // Doughnut Chart
    const ctxDoughnut = document.getElementById('risksChart');
    if (ctxDoughnut) {
        chartInstance = new Chart(ctxDoughnut.getContext('2d'), {
            type: 'doughnut',
            data: getChartData(),
            plugins: [centerTextPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { 
                            padding: 20, 
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 23, 0.9)',
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, weight: 'bold', family: 'Inter' },
                        padding: 12,
                        cornerRadius: 8,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1
                    }
                },
                layout: { padding: 10 }
            }
        });
    }

    // Bar Chart
    const ctxBar = document.getElementById('statusChart');
    if (ctxBar) {
        statusChartInstance = new Chart(ctxBar.getContext('2d'), {
            type: 'bar',
            data: getStatusChartData(),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutBounce'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 23, 0.9)',
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, weight: 'bold', family: 'Inter' },
                        padding: 12,
                        cornerRadius: 8,
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false, drawBorder: false }
                    }
                },
                borderRadius: 4
            }
        });
    }
}

function getChartData() {
    const active = risksData.filter(r => r.status === 'ativo');
    const altos = active.filter(r => r.level === 'alto').length;
    const medios = active.filter(r => r.level === 'medio').length;
    const baixos = active.filter(r => r.level === 'baixo').length;

    const isEmpty = altos === 0 && medios === 0 && baixos === 0;

    return {
        labels: ['Alto Risco', 'Médio Risco', 'Baixo Risco'],
        datasets: [{
            data: isEmpty ? [1] : [altos, medios, baixos],
            backgroundColor: isEmpty ? ['#1f2937'] : ['#ef4444', '#f59e0b', '#06b6d4'],
            borderWidth: 4,
            borderColor: '#111827',
            hoverOffset: 6,
            borderRadius: isEmpty ? 0 : 5
        }]
    };
}

function getStatusChartData() {
    const ativos = risksData.filter(r => r.status === 'ativo').length;
    const resolvidos = risksData.filter(r => r.status === 'resolvido').length;

    return {
        labels: ['Riscos Ativos', 'Riscos Resolvidos'],
        datasets: [{
            label: 'Eventos',
            data: [ativos, resolvidos],
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)',
                'rgba(16, 185, 129, 0.8)'
            ],
            borderColor: [
                '#ef4444',
                '#10b981'
            ],
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 40
        }]
    };
}

function updateChart() {
    if(chartInstance) {
        chartInstance.data = getChartData();
        chartInstance.update();
    }
    if(statusChartInstance) {
        statusChartInstance.data = getStatusChartData();
        statusChartInstance.update();
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
