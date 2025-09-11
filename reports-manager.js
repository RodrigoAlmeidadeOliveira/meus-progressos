// Sistema de Relatórios com Gráficos e Exportação PDF
// Gerenciador completo de relatórios de evolução

class ReportsManager {
    constructor() {
        this.charts = {};
        this.currentData = [];
        this.selectedPatient = null;
        this.selectedDateRange = null;
        this.isGeneratingReports = false;
        this.hasInitialReports = false;
        this.reportTypes = {
            GENERAL: 'geral',
            BY_GROUP: 'por_grupo', 
            BY_SUBGROUP: 'por_subgrupo',
            EVOLUTION: 'evolucao',
            COMPARISON: 'comparacao'
        };
        
        this.groupMapping = {
            'Habilidades Comunicativas': {
                color: '#667eea',
                subgroups: ['Contato Visual', 'Comunicação Alternativa', 'Linguagem Expressiva', 'Linguagem Receptiva']
            },
            'Habilidades Sociais': {
                color: '#4facfe', 
                subgroups: ['Expressão Facial', 'Imitação', 'Atenção Compartilhada', 'Brincar']
            },
            'Habilidades Funcionais': {
                color: '#ffecd2',
                subgroups: ['Auto Cuidado', 'Vestir-se', 'Uso do Banheiro']
            },
            'Habilidades Emocionais': {
                color: '#d299c2',
                subgroups: ['Controle Inibitório', 'Flexibilidade', 'Resposta Emocional', 'Empatia']
            }
        };
        
        this.init();
    }

    async init() {
        console.log('📊 Inicializando sistema de relatórios...');
        this.loadChartLibraries();
        this.setupEventListeners();
    }

    async loadChartLibraries() {
        // Verificar se Chart.js já está carregado
        if (typeof Chart !== 'undefined') {
            console.log('✅ Chart.js já está disponível');
            return Promise.resolve();
        }

        // Carregar Chart.js se não estiver carregado
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
            script.onload = () => {
                console.log('✅ Chart.js carregado com sucesso');
                resolve();
            };
            script.onerror = (error) => {
                console.error('❌ Erro ao carregar Chart.js:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });

        // Carregar jsPDF e html2canvas para PDF
        if (typeof jsPDF === 'undefined') {
            const jspdfScript = document.createElement('script');
            jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            jspdfScript.onload = () => console.log('✅ jsPDF carregado');
            document.head.appendChild(jspdfScript);
        }

        if (typeof html2canvas === 'undefined') {
            const html2canvasScript = document.createElement('script');
            html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            html2canvasScript.onload = () => console.log('✅ html2canvas carregado');
            document.head.appendChild(html2canvasScript);
        }
    }

    setupEventListeners() {
        // Listeners para filtros
        const patientSelect = document.getElementById('report-patient-select');
        if (patientSelect) {
            patientSelect.addEventListener('change', (e) => {
                this.selectedPatient = e.target.value;
                this.updateReports();
            });
        }

        const dateFromInput = document.getElementById('report-date-from');
        const dateToInput = document.getElementById('report-date-to');
        
        if (dateFromInput && dateToInput) {
            dateFromInput.addEventListener('change', () => this.updateDateRange());
            dateToInput.addEventListener('change', () => this.updateDateRange());
        }

        // Listeners para botões de relatório
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-report-type]')) {
                const reportType = e.target.dataset.reportType;
                this.generateReport(reportType);
            }
            
            if (e.target.matches('[data-export-pdf]')) {
                const reportType = e.target.dataset.exportPdf;
                this.exportToPDF(reportType);
            }
        });
    }

    async setData(evaluations) {
        console.log(`📊 Carregando ${evaluations.length} avaliações para relatórios`);
        
        // Processar dados para o formato esperado pelos relatórios
        this.currentData = this.processEvaluationsData(evaluations);
        console.log(`📊 Dados processados:`, this.currentData);
        
        this.populatePatientSelector();
        
        // Só gerar relatórios se não há dados ou se for a primeira vez
        if (!this.hasInitialReports) {
            this.generateDefaultReports();
            this.hasInitialReports = true;
        } else {
            console.log('📊 Dados atualizados, mas não regenerando relatórios automaticamente');
        }
    }

    processEvaluationsData(evaluations) {
        return evaluations.map(evaluation => {
            // Se já tem groupScores, usar como está
            if (evaluation.groupScores) {
                return evaluation;
            }

            // Se tem responses, converter para groupScores
            if (evaluation.responses) {
                const processedEvaluation = { ...evaluation };
                processedEvaluation.groupScores = this.convertResponsesToGroupScores(evaluation.responses);
                return processedEvaluation;
            }

            return evaluation;
        });
    }

    convertResponsesToGroupScores(responses) {
        // Mapear questões para subgrupos (baseado no formulário original)
        const questionToSubgroupMap = {
            // Habilidades Comunicativas
            'q1': 'Contato Visual',
            'q2': 'Contato Visual', 
            'q3': 'Comunicação Alternativa',
            'q4': 'Comunicação Alternativa',
            'q5': 'Linguagem Expressiva',
            'q6': 'Linguagem Expressiva',
            'q7': 'Linguagem Receptiva',
            'q8': 'Linguagem Receptiva',
            
            // Habilidades Sociais  
            'q9': 'Expressão Facial',
            'q10': 'Expressão Facial',
            'q11': 'Imitação',
            'q12': 'Imitação',
            'q13': 'Atenção Compartilhada',
            'q14': 'Atenção Compartilhada',
            'q15': 'Brincar',
            'q16': 'Brincar',
            
            // Habilidades Funcionais
            'q17': 'Auto Cuidado',
            'q18': 'Auto Cuidado',
            'q19': 'Vestir-se',
            'q20': 'Vestir-se',
            'q21': 'Uso do Banheiro',
            'q22': 'Uso do Banheiro',
            
            // Habilidades Emocionais
            'q23': 'Controle Inibitório',
            'q24': 'Controle Inibitório',
            'q25': 'Flexibilidade',
            'q26': 'Flexibilidade',
            'q27': 'Resposta Emocional',
            'q28': 'Resposta Emocional',
            'q29': 'Empatia',
            'q30': 'Empatia'
        };

        const subgroupScores = {};

        // Agrupar respostas por subgrupo
        Object.entries(responses).forEach(([questionId, score]) => {
            const subgroup = questionToSubgroupMap[questionId];
            if (subgroup) {
                if (!subgroupScores[subgroup]) {
                    subgroupScores[subgroup] = {
                        scores: [],
                        category: this.getSubgroupCategory(subgroup)
                    };
                }
                subgroupScores[subgroup].scores.push(parseInt(score));
            }
        });

        // Calcular estatísticas por subgrupo
        const groupScores = {};
        Object.entries(subgroupScores).forEach(([subgroup, data]) => {
            const scores = data.scores;
            const total = scores.reduce((sum, score) => sum + score, 0);
            const max = scores.length * 5; // Assumindo escala 1-5
            const percentage = Math.round((total / max) * 100);

            groupScores[subgroup] = {
                total,
                max,
                percentage,
                average: Math.round(total / scores.length * 10) / 10,
                category: data.category
            };
        });

        return groupScores;
    }

    getSubgroupCategory(subgroup) {
        for (const [category, info] of Object.entries(this.groupMapping)) {
            if (info.subgroups.includes(subgroup)) {
                return category;
            }
        }
        return 'Outros';
    }

    populatePatientSelector() {
        const patientSelect = document.getElementById('report-patient-select');
        if (!patientSelect) return;

        const patients = [...new Set(this.currentData.map(e => e.patientInfo?.name))].filter(Boolean);
        
        patientSelect.innerHTML = `
            <option value="">Todos os pacientes</option>
            ${patients.map(name => `<option value="${name}">${name}</option>`).join('')}
        `;
    }

    updateDateRange() {
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        
        if (dateFrom && dateTo) {
            this.selectedDateRange = { from: dateFrom, to: dateTo };
            this.updateReports();
        }
    }

    getFilteredData() {
        let filtered = [...this.currentData];

        // Filtrar por paciente
        if (this.selectedPatient) {
            filtered = filtered.filter(e => e.patientInfo?.name === this.selectedPatient);
        }

        // Filtrar por data
        if (this.selectedDateRange) {
            const fromDate = new Date(this.selectedDateRange.from);
            const toDate = new Date(this.selectedDateRange.to);
            
            filtered = filtered.filter(e => {
                const evalDate = new Date(e.patientInfo?.evaluationDate || e.createdAt);
                return evalDate >= fromDate && evalDate <= toDate;
            });
        }

        return filtered;
    }

    async generateDefaultReports() {
        if (this.isGeneratingReports) {
            console.log('⚠️ Relatórios já sendo gerados, ignorando...');
            return;
        }
        
        this.isGeneratingReports = true;
        console.log('📊 Gerando relatórios padrão...');
        
        try {
            await this.generateReport(this.reportTypes.GENERAL);
            await this.generateReport(this.reportTypes.BY_GROUP);
            await this.generateReport(this.reportTypes.BY_SUBGROUP);
            
            if (this.selectedPatient) {
                await this.generateReport(this.reportTypes.EVOLUTION);
            }
        } finally {
            // Liberar o lock após um delay menor
            setTimeout(() => {
                this.isGeneratingReports = false;
                console.log('🔓 Lock de relatórios liberado');
            }, 500);
        }
    }

    updateReports() {
        if (!this.isGeneratingReports) {
            this.generateDefaultReports();
        }
    }

    async generateReport(reportType) {
        const data = this.getFilteredData();
        
        switch (reportType) {
            case this.reportTypes.GENERAL:
                await this.generateGeneralReport(data);
                break;
            case this.reportTypes.BY_GROUP:
                await this.generateGroupReport(data);
                break;
            case this.reportTypes.BY_SUBGROUP:
                await this.generateSubgroupReport(data);
                break;
            case this.reportTypes.EVOLUTION:
                await this.generateEvolutionReport(data);
                break;
            case this.reportTypes.COMPARISON:
                this.generateComparisonReport(data);
                break;
        }
    }

    async generateGeneralReport(data) {
        console.log('📊 Gerando relatório geral...');
        
        if (data.length === 0) {
            this.showEmptyChart('general-chart', 'Nenhum dado disponível');
            return;
        }

        const generalStats = this.calculateGeneralStatistics(data);
        await this.createBarChart('general-chart', {
            title: 'Pontuação Geral por Categoria',
            labels: Object.keys(generalStats),
            datasets: [{
                label: 'Pontuação Média (%)',
                data: Object.values(generalStats),
                backgroundColor: [
                    '#667eea', // Comunicativas
                    '#4facfe', // Sociais  
                    '#ffecd2', // Funcionais
                    '#d299c2'  // Emocionais
                ],
                borderColor: [
                    '#5a6fd8',
                    '#42a5f5',
                    '#ffcc02',
                    '#ba68c8'
                ],
                borderWidth: 2
            }]
        });

        this.updateGeneralStatistics(generalStats, data.length);
    }

    async generateGroupReport(data) {
        console.log('📊 Gerando relatório por grupos...');
        
        if (data.length === 0) {
            this.showEmptyChart('groups-chart', 'Nenhum dado disponível');
            return;
        }

        const groupStats = this.calculateGroupStatistics(data);
        const chartData = this.prepareGroupChartData(groupStats);
        
        await this.createBarChart('groups-chart', {
            title: 'Evolução por Grupos de Habilidades',
            labels: chartData.labels,
            datasets: chartData.datasets
        });

        this.updateGroupStatisticsTable(groupStats);
    }

    async generateSubgroupReport(data) {
        console.log('📊 Gerando relatório por subgrupos...');
        
        if (data.length === 0) {
            this.showEmptyChart('subgroups-chart', 'Nenhum dado disponível');
            return;
        }

        const subgroupStats = this.calculateSubgroupStatistics(data);
        const chartData = this.prepareSubgroupChartData(subgroupStats);
        
        await this.createBarChart('subgroups-chart', {
            title: 'Desempenho por Subgrupos',
            labels: chartData.labels,
            datasets: chartData.datasets
        });

        this.updateSubgroupStatisticsTable(subgroupStats);
    }

    async generateEvolutionReport(data) {
        console.log('📊 Gerando relatório de evolução...');
        
        if (!this.selectedPatient || data.length < 2) {
            this.showEmptyChart('evolution-chart', 'Selecione um paciente com múltiplas avaliações');
            return;
        }

        const evolutionData = this.calculateEvolutionData(data);
        
        await this.createLineChart('evolution-chart', {
            title: `Evolução de ${this.selectedPatient}`,
            labels: evolutionData.dates,
            datasets: evolutionData.datasets
        });

        this.updateEvolutionTable(evolutionData);
    }

    calculateGeneralStatistics(data) {
        const stats = {};
        
        Object.keys(this.groupMapping).forEach(category => {
            const categoryScores = [];
            
            data.forEach(evaluation => {
                if (evaluation.groupScores) {
                    this.groupMapping[category].subgroups.forEach(subgroup => {
                        if (evaluation.groupScores[subgroup]) {
                            categoryScores.push(evaluation.groupScores[subgroup].percentage);
                        }
                    });
                }
            });
            
            if (categoryScores.length > 0) {
                stats[category] = Math.round(
                    categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
                );
            }
        });
        
        return stats;
    }

    calculateGroupStatistics(data) {
        const stats = {};
        
        data.forEach((evaluation, index) => {
            const evalDate = evaluation.patientInfo?.evaluationDate || evaluation.createdAt;
            const patientName = evaluation.patientInfo?.name || `Avaliação ${index + 1}`;
            
            if (evaluation.groupScores) {
                Object.keys(this.groupMapping).forEach(category => {
                    if (!stats[category]) stats[category] = [];
                    
                    let categoryScore = 0;
                    let validSubgroups = 0;
                    
                    this.groupMapping[category].subgroups.forEach(subgroup => {
                        if (evaluation.groupScores[subgroup]) {
                            categoryScore += evaluation.groupScores[subgroup].percentage;
                            validSubgroups++;
                        }
                    });
                    
                    if (validSubgroups > 0) {
                        stats[category].push({
                            patient: patientName,
                            date: evalDate,
                            score: Math.round(categoryScore / validSubgroups),
                            evaluation: evaluation
                        });
                    }
                });
            }
        });
        
        return stats;
    }

    calculateSubgroupStatistics(data) {
        const stats = {};
        
        data.forEach((evaluation, index) => {
            const patientName = evaluation.patientInfo?.name || `Paciente ${index + 1}`;
            
            if (evaluation.groupScores) {
                Object.entries(evaluation.groupScores).forEach(([subgroup, scoreData]) => {
                    if (!stats[subgroup]) stats[subgroup] = [];
                    
                    stats[subgroup].push({
                        patient: patientName,
                        score: scoreData.percentage,
                        total: scoreData.total,
                        max: scoreData.max,
                        category: scoreData.category,
                        evaluation: evaluation
                    });
                });
            }
        });
        
        return stats;
    }

    calculateEvolutionData(data) {
        // Ordenar por data
        const sortedData = data
            .filter(e => e.patientInfo?.name === this.selectedPatient)
            .sort((a, b) => new Date(a.patientInfo?.evaluationDate || a.createdAt) - new Date(b.patientInfo?.evaluationDate || b.createdAt));

        const dates = sortedData.map(e => {
            const date = new Date(e.patientInfo?.evaluationDate || e.createdAt);
            return date.toLocaleDateString('pt-BR');
        });

        const datasets = Object.keys(this.groupMapping).map((category, index) => {
            const categoryData = sortedData.map(evaluation => {
                if (evaluation.groupScores) {
                    let categoryScore = 0;
                    let validSubgroups = 0;
                    
                    this.groupMapping[category].subgroups.forEach(subgroup => {
                        if (evaluation.groupScores[subgroup]) {
                            categoryScore += evaluation.groupScores[subgroup].percentage;
                            validSubgroups++;
                        }
                    });
                    
                    return validSubgroups > 0 ? Math.round(categoryScore / validSubgroups) : 0;
                }
                return 0;
            });

            return {
                label: category,
                data: categoryData,
                borderColor: this.groupMapping[category].color,
                backgroundColor: this.groupMapping[category].color + '20',
                fill: false,
                tension: 0.4
            };
        });

        return { dates, datasets, rawData: sortedData };
    }

    prepareGroupChartData(groupStats) {
        const labels = [];
        const datasets = [];
        
        Object.keys(this.groupMapping).forEach(category => {
            if (groupStats[category] && groupStats[category].length > 0) {
                const categoryData = groupStats[category];
                
                categoryData.forEach(item => {
                    const label = `${item.patient} (${new Date(item.date).toLocaleDateString('pt-BR')})`;
                    if (!labels.includes(label)) {
                        labels.push(label);
                    }
                });
            }
        });

        Object.keys(this.groupMapping).forEach(category => {
            if (groupStats[category] && groupStats[category].length > 0) {
                const data = labels.map(label => {
                    const item = groupStats[category].find(item => {
                        const itemLabel = `${item.patient} (${new Date(item.date).toLocaleDateString('pt-BR')})`;
                        return itemLabel === label;
                    });
                    return item ? item.score : 0;
                });

                datasets.push({
                    label: category,
                    data: data,
                    backgroundColor: this.groupMapping[category].color + '80',
                    borderColor: this.groupMapping[category].color,
                    borderWidth: 2
                });
            }
        });

        return { labels, datasets };
    }

    prepareSubgroupChartData(subgroupStats) {
        const labels = Object.keys(subgroupStats);
        const avgData = [];
        const maxData = [];
        const minData = [];
        const colors = [];

        labels.forEach(subgroup => {
            const scores = subgroupStats[subgroup].map(item => item.score);
            avgData.push(Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length));
            maxData.push(Math.max(...scores));
            minData.push(Math.min(...scores));
            
            // Determinar cor baseada na categoria
            const category = subgroupStats[subgroup][0]?.category;
            const categoryColor = Object.values(this.groupMapping).find(g => 
                g.subgroups.includes(subgroup)
            )?.color || '#cccccc';
            colors.push(categoryColor);
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Pontuação Média',
                    data: avgData,
                    backgroundColor: colors.map(c => c + '80'),
                    borderColor: colors,
                    borderWidth: 2
                },
                {
                    label: 'Pontuação Máxima',
                    data: maxData,
                    backgroundColor: colors.map(c => c + '40'),
                    borderColor: colors,
                    borderWidth: 1,
                    type: 'line',
                    fill: false
                },
                {
                    label: 'Pontuação Mínima',
                    data: minData,
                    backgroundColor: colors.map(c => c + '40'),
                    borderColor: colors,
                    borderWidth: 1,
                    type: 'line',
                    fill: false
                }
            ]
        };
    }

    async createBarChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`❌ Canvas ${canvasId} não encontrado`);
            console.log('📋 Elementos canvas disponíveis:', 
                Array.from(document.querySelectorAll('canvas')).map(c => c.id));
            return;
        }
        
        console.log(`📊 Criando gráfico de barras para ${canvasId}`, config);

        // Aguardar um pouco antes de destruir/criar para evitar conflitos
        await new Promise(resolve => setTimeout(resolve, 50));

        // Destruir gráfico existente com verificação mais robusta
        if (this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
                console.log(`🗑️ Gráfico ${canvasId} destruído`);
                // Aguardar a destruição completar
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.warn(`⚠️ Erro ao destruir gráfico ${canvasId}:`, error);
            }
            delete this.charts[canvasId];
        }

        // Limpar contexto do canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Aguardar Chart.js estar disponível
        const createChart = () => {
            if (typeof Chart === 'undefined') {
                setTimeout(createChart, 100);
                return;
            }

            this.charts[canvasId] = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: config.labels,
                    datasets: config.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: config.title,
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: config.datasets.length > 1,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        };

        createChart();
    }

    async createLineChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`❌ Canvas ${canvasId} não encontrado`);
            return;
        }

        console.log(`📈 Criando gráfico de linha para ${canvasId}`, config);

        // Aguardar um pouco antes de destruir/criar para evitar conflitos
        await new Promise(resolve => setTimeout(resolve, 50));

        // Destruir gráfico existente com verificação mais robusta
        if (this.charts[canvasId]) {
            try {
                this.charts[canvasId].destroy();
                console.log(`🗑️ Gráfico ${canvasId} destruído`);
                // Aguardar a destruição completar
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.warn(`⚠️ Erro ao destruir gráfico ${canvasId}:`, error);
            }
            delete this.charts[canvasId];
        }

        // Limpar contexto do canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Aguardar Chart.js estar disponível
        const createChart = () => {
            if (typeof Chart === 'undefined') {
                setTimeout(createChart, 100);
                return;
            }

            this.charts[canvasId] = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: config.labels,
                    datasets: config.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: config.title,
                            font: {
                                size: 16,
                                weight: 'bold'
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        };

        createChart();
    }

    showEmptyChart(canvasId, message) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Destruir gráfico existente
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }

    updateGeneralStatistics(stats, totalEvaluations) {
        const container = document.getElementById('general-stats');
        if (!container) return;

        const avgScore = Object.values(stats).reduce((sum, score) => sum + score, 0) / Object.values(stats).length;
        
        container.innerHTML = `
            <div class="stats-summary">
                <h4>📊 Resumo Geral</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-number">${totalEvaluations}</span>
                        <span class="stat-label">Avaliações</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${Math.round(avgScore)}%</span>
                        <span class="stat-label">Média Geral</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${Object.keys(stats).length}</span>
                        <span class="stat-label">Categorias</span>
                    </div>
                </div>
                
                <div class="detailed-stats">
                    <h5>Detalhamento por Categoria:</h5>
                    ${Object.entries(stats).map(([category, score]) => `
                        <div class="category-stat">
                            <span class="category-name">${category}:</span>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${score}%; background: ${this.groupMapping[category]?.color || '#ccc'}"></div>
                                <span class="score-text">${score}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    updateGroupStatisticsTable(groupStats) {
        const container = document.getElementById('groups-stats');
        if (!container) return;

        let html = '<div class="stats-table"><h4>📊 Estatísticas por Grupo</h4>';
        
        Object.entries(groupStats).forEach(([category, items]) => {
            if (items.length > 0) {
                const avgScore = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
                const maxScore = Math.max(...items.map(item => item.score));
                const minScore = Math.min(...items.map(item => item.score));
                
                html += `
                    <div class="group-stats">
                        <h5 style="color: ${this.groupMapping[category]?.color}">${category}</h5>
                        <div class="mini-stats">
                            <span>Média: ${avgScore}%</span>
                            <span>Máximo: ${maxScore}%</span>
                            <span>Mínimo: ${minScore}%</span>
                            <span>Avaliações: ${items.length}</span>
                        </div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    updateSubgroupStatisticsTable(subgroupStats) {
        const container = document.getElementById('subgroups-stats');
        if (!container) return;

        let html = '<div class="stats-table"><h4>📊 Ranking por Subgrupos</h4>';
        
        // Calcular médias e ordenar
        const rankings = Object.entries(subgroupStats).map(([subgroup, items]) => {
            const avgScore = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
            const category = items[0]?.category;
            return { subgroup, avgScore, category, count: items.length };
        }).sort((a, b) => b.avgScore - a.avgScore);

        rankings.forEach((item, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
            const categoryColor = Object.values(this.groupMapping).find(g => 
                g.subgroups.includes(item.subgroup)
            )?.color || '#ccc';
            
            html += `
                <div class="ranking-item">
                    <span class="ranking-position">${medal}</span>
                    <span class="ranking-name" style="color: ${categoryColor}">${item.subgroup}</span>
                    <span class="ranking-score">${item.avgScore}%</span>
                    <span class="ranking-count">(${item.count} aval.)</span>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    updateEvolutionTable(evolutionData) {
        const container = document.getElementById('evolution-stats');
        if (!container) return;

        const { rawData } = evolutionData;
        
        let html = `
            <div class="evolution-table">
                <h4>📈 Evolução de ${this.selectedPatient}</h4>
                <div class="evolution-summary">
                    <p>Total de avaliações: ${rawData.length}</p>
                    <p>Período: ${new Date(rawData[0].patientInfo?.evaluationDate).toLocaleDateString('pt-BR')} até ${new Date(rawData[rawData.length - 1].patientInfo?.evaluationDate).toLocaleDateString('pt-BR')}</p>
                </div>
                
                <table class="evolution-data">
                    <thead>
                        <tr>
                            <th>Data</th>
                            ${Object.keys(this.groupMapping).map(category => `<th>${category}</th>`).join('')}
                            <th>Pontuação Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        rawData.forEach(evaluation => {
            const date = new Date(evaluation.patientInfo?.evaluationDate || evaluation.createdAt);
            html += `
                <tr>
                    <td>${date.toLocaleDateString('pt-BR')}</td>
            `;
            
            Object.keys(this.groupMapping).forEach(category => {
                let categoryScore = 0;
                let validSubgroups = 0;
                
                if (evaluation.groupScores) {
                    this.groupMapping[category].subgroups.forEach(subgroup => {
                        if (evaluation.groupScores[subgroup]) {
                            categoryScore += evaluation.groupScores[subgroup].percentage;
                            validSubgroups++;
                        }
                    });
                }
                
                const avgScore = validSubgroups > 0 ? Math.round(categoryScore / validSubgroups) : 0;
                html += `<td>${avgScore}%</td>`;
            });
            
            html += `<td>${evaluation.totalScore || 0}</td></tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    async exportToPDF(reportType) {
        console.log(`📄 Exportando relatório ${reportType} para PDF...`);
        
        // Aguardar jsPDF estar disponível
        const exportPDF = async () => {
            if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
                setTimeout(exportPDF, 100);
                return;
            }

            try {
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                // Título do relatório
                pdf.setFontSize(20);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Relatório de Avaliação - Meus Progressos', 20, 20);
                
                // Data do relatório
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);
                
                let yPosition = 50;

                // Informações do filtro
                if (this.selectedPatient) {
                    pdf.text(`Paciente: ${this.selectedPatient}`, 20, yPosition);
                    yPosition += 10;
                }

                if (this.selectedDateRange) {
                    pdf.text(`Período: ${new Date(this.selectedDateRange.from).toLocaleDateString('pt-BR')} até ${new Date(this.selectedDateRange.to).toLocaleDateString('pt-BR')}`, 20, yPosition);
                    yPosition += 10;
                }

                yPosition += 10;

                // Capturar gráficos baseado no tipo de relatório
                const chartsToCapture = this.getChartsForReport(reportType);
                
                for (const chartInfo of chartsToCapture) {
                    const chartCanvas = document.getElementById(chartInfo.canvasId);
                    const statsContainer = document.getElementById(chartInfo.statsId);
                    
                    if (chartCanvas && this.charts[chartInfo.canvasId]) {
                        // Adicionar título da seção
                        pdf.setFontSize(16);
                        pdf.setFont('helvetica', 'bold');
                        pdf.text(chartInfo.title, 20, yPosition);
                        yPosition += 15;
                        
                        // Capturar gráfico
                        const chartImage = chartCanvas.toDataURL('image/png');
                        const chartHeight = 80;
                        pdf.addImage(chartImage, 'PNG', 20, yPosition, pageWidth - 40, chartHeight);
                        yPosition += chartHeight + 10;
                        
                        // Capturar estatísticas se existirem
                        if (statsContainer) {
                            try {
                                const canvas = await html2canvas(statsContainer, {
                                    backgroundColor: '#ffffff',
                                    scale: 1
                                });
                                
                                const statsImage = canvas.toDataURL('image/png');
                                const statsHeight = Math.min(60, (canvas.height * (pageWidth - 40)) / canvas.width);
                                
                                // Verificar se precisa de nova página
                                if (yPosition + statsHeight > pageHeight - 20) {
                                    pdf.addPage();
                                    yPosition = 20;
                                }
                                
                                pdf.addImage(statsImage, 'PNG', 20, yPosition, pageWidth - 40, statsHeight);
                                yPosition += statsHeight + 15;
                            } catch (error) {
                                console.warn('Erro ao capturar estatísticas:', error);
                                yPosition += 10;
                            }
                        }
                        
                        // Verificar se precisa de nova página para próximo gráfico
                        if (yPosition > pageHeight - 100 && chartInfo !== chartsToCapture[chartsToCapture.length - 1]) {
                            pdf.addPage();
                            yPosition = 20;
                        }
                    }
                }
                
                // Adicionar rodapé
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(10);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 10);
                    pdf.text('Sistema Meus Progressos', 20, pageHeight - 10);
                }
                
                // Salvar PDF
                const fileName = `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
                pdf.save(fileName);
                
                // Mostrar sucesso
                this.showNotification('✅ Relatório PDF gerado com sucesso!', 'success');
                
            } catch (error) {
                console.error('Erro ao gerar PDF:', error);
                this.showNotification('❌ Erro ao gerar PDF: ' + error.message, 'error');
            }
        };

        exportPDF();
    }

    getChartsForReport(reportType) {
        const charts = [];
        
        switch (reportType) {
            case this.reportTypes.GENERAL:
                charts.push({
                    canvasId: 'general-chart',
                    statsId: 'general-stats',
                    title: 'Relatório Geral'
                });
                break;
                
            case this.reportTypes.BY_GROUP:
                charts.push({
                    canvasId: 'groups-chart', 
                    statsId: 'groups-stats',
                    title: 'Relatório por Grupos'
                });
                break;
                
            case this.reportTypes.BY_SUBGROUP:
                charts.push({
                    canvasId: 'subgroups-chart',
                    statsId: 'subgroups-stats', 
                    title: 'Relatório por Subgrupos'
                });
                break;
                
            case this.reportTypes.EVOLUTION:
                charts.push({
                    canvasId: 'evolution-chart',
                    statsId: 'evolution-stats',
                    title: 'Relatório de Evolução'
                });
                break;
                
            case 'complete':
                charts.push(
                    {
                        canvasId: 'general-chart',
                        statsId: 'general-stats',
                        title: 'Relatório Geral'
                    },
                    {
                        canvasId: 'groups-chart',
                        statsId: 'groups-stats', 
                        title: 'Relatório por Grupos'
                    },
                    {
                        canvasId: 'subgroups-chart',
                        statsId: 'subgroups-stats',
                        title: 'Relatório por Subgrupos'
                    }
                );
                
                if (this.selectedPatient) {
                    charts.push({
                        canvasId: 'evolution-chart',
                        statsId: 'evolution-stats',
                        title: 'Relatório de Evolução'
                    });
                }
                break;
        }
        
        return charts;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        switch(type) {
            case 'success':
                notification.style.background = '#d4edda';
                notification.style.color = '#155724';
                break;
            case 'error':
                notification.style.background = '#f8d7da';
                notification.style.color = '#721c24';
                break;
            default:
                notification.style.background = '#d1ecf1';
                notification.style.color = '#0c5460';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    destroy() {
        // Limpar todos os gráficos
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
}

// Exportar para uso global
window.ReportsManager = ReportsManager;