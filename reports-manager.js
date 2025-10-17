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
        
        // DESABILITADO: Geração automática de relatórios
        // Os relatórios serão gerados apenas quando solicitados pelo usuário
        console.log('📊 Dados carregados. Use o botão "Gerar Relatórios" para visualizar.');
        this.showInitialMessage();
    }

    showInitialMessage() {
        // Mostrar mensagem inicial em todos os containers de relatórios
        const containers = ['general-stats', 'groups-stats', 'subgroups-stats', 'evolution-stats'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="initial-report-message">
                        <h3>📊 Relatórios Disponíveis</h3>
                        <p>Dados carregados: <strong>${this.currentData.length} avaliações</strong></p>
                        <button class="btn-generate-reports" onclick="window.reportsManager.generateAllReports()">
                            📈 Gerar Relatórios Agora
                        </button>
                        <p class="help-text">Clique no botão acima para visualizar os gráficos e estatísticas</p>
                    </div>
                `;
            }
        });

        // Limpar os canvas também
        const canvasIds = ['general-chart', 'groups-chart', 'subgroups-chart', 'evolution-chart'];
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#6c757d';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Clique em "Gerar Relatórios" para visualizar', canvas.width/2, canvas.height/2);
            }
        });
    }

    async generateAllReports() {
        console.log('🚀 Gerando todos os relatórios manualmente...');
        
        if (this.isGeneratingReports) {
            console.log('⚠️ Já está gerando relatórios, aguarde...');
            return;
        }

        // Mostrar loading
        this.showLoadingMessage();
        
        try {
            await this.generateDefaultReports();
        } catch (error) {
            console.error('❌ Erro ao gerar relatórios:', error);
        }
    }

    showLoadingMessage() {
        const containers = ['general-stats', 'groups-stats', 'subgroups-stats', 'evolution-stats'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="loading-report-message">
                        <h3>⏳ Gerando Relatórios...</h3>
                        <p>Aguarde enquanto os gráficos são criados...</p>
                        <div class="loading-spinner"></div>
                    </div>
                `;
            }
        });
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
        // Total: 149 questões
        const questionToSubgroupMap = {
            // Habilidades Comunicativas (q1-q40)
            // Contato Visual (q1-q10)
            'q1': 'Contato Visual', 'q2': 'Contato Visual', 'q3': 'Contato Visual',
            'q4': 'Contato Visual', 'q5': 'Contato Visual', 'q6': 'Contato Visual',
            'q7': 'Contato Visual', 'q8': 'Contato Visual', 'q9': 'Contato Visual',
            'q10': 'Contato Visual',

            // Comunicação Alternativa (q11-q20)
            'q11': 'Comunicação Alternativa', 'q12': 'Comunicação Alternativa',
            'q13': 'Comunicação Alternativa', 'q14': 'Comunicação Alternativa',
            'q15': 'Comunicação Alternativa', 'q16': 'Comunicação Alternativa',
            'q17': 'Comunicação Alternativa', 'q18': 'Comunicação Alternativa',
            'q19': 'Comunicação Alternativa', 'q20': 'Comunicação Alternativa',

            // Linguagem Expressiva (q21-q30)
            'q21': 'Linguagem Expressiva', 'q22': 'Linguagem Expressiva',
            'q23': 'Linguagem Expressiva', 'q24': 'Linguagem Expressiva',
            'q25': 'Linguagem Expressiva', 'q26': 'Linguagem Expressiva',
            'q27': 'Linguagem Expressiva', 'q28': 'Linguagem Expressiva',
            'q29': 'Linguagem Expressiva', 'q30': 'Linguagem Expressiva',

            // Linguagem Receptiva (q31-q40)
            'q31': 'Linguagem Receptiva', 'q32': 'Linguagem Receptiva',
            'q33': 'Linguagem Receptiva', 'q34': 'Linguagem Receptiva',
            'q35': 'Linguagem Receptiva', 'q36': 'Linguagem Receptiva',
            'q37': 'Linguagem Receptiva', 'q38': 'Linguagem Receptiva',
            'q39': 'Linguagem Receptiva', 'q40': 'Linguagem Receptiva',

            // Habilidades Sociais (q41-q80)
            // Expressão Facial (q41-q50)
            'q41': 'Expressão Facial', 'q42': 'Expressão Facial',
            'q43': 'Expressão Facial', 'q44': 'Expressão Facial',
            'q45': 'Expressão Facial', 'q46': 'Expressão Facial',
            'q47': 'Expressão Facial', 'q48': 'Expressão Facial',
            'q49': 'Expressão Facial', 'q50': 'Expressão Facial',

            // Imitação (q51-q60)
            'q51': 'Imitação', 'q52': 'Imitação', 'q53': 'Imitação',
            'q54': 'Imitação', 'q55': 'Imitação', 'q56': 'Imitação',
            'q57': 'Imitação', 'q58': 'Imitação', 'q59': 'Imitação',
            'q60': 'Imitação',

            // Atenção Compartilhada (q61-q70)
            'q61': 'Atenção Compartilhada', 'q62': 'Atenção Compartilhada',
            'q63': 'Atenção Compartilhada', 'q64': 'Atenção Compartilhada',
            'q65': 'Atenção Compartilhada', 'q66': 'Atenção Compartilhada',
            'q67': 'Atenção Compartilhada', 'q68': 'Atenção Compartilhada',
            'q69': 'Atenção Compartilhada', 'q70': 'Atenção Compartilhada',

            // Brincar (q71-q80)
            'q71': 'Brincar', 'q72': 'Brincar', 'q73': 'Brincar',
            'q74': 'Brincar', 'q75': 'Brincar', 'q76': 'Brincar',
            'q77': 'Brincar', 'q78': 'Brincar', 'q79': 'Brincar',
            'q80': 'Brincar',

            // Habilidades Funcionais (q81-q109)
            // Auto Cuidado (q81-q89)
            'q81': 'Auto Cuidado', 'q82': 'Auto Cuidado', 'q83': 'Auto Cuidado',
            'q84': 'Auto Cuidado', 'q85': 'Auto Cuidado', 'q86': 'Auto Cuidado',
            'q87': 'Auto Cuidado', 'q88': 'Auto Cuidado', 'q89': 'Auto Cuidado',

            // Vestir-se (q90-q99)
            'q90': 'Vestir-se', 'q91': 'Vestir-se', 'q92': 'Vestir-se',
            'q93': 'Vestir-se', 'q94': 'Vestir-se', 'q95': 'Vestir-se',
            'q96': 'Vestir-se', 'q97': 'Vestir-se', 'q98': 'Vestir-se',
            'q99': 'Vestir-se',

            // Uso do Banheiro (q100-q109)
            'q100': 'Uso do Banheiro', 'q101': 'Uso do Banheiro',
            'q102': 'Uso do Banheiro', 'q103': 'Uso do Banheiro',
            'q104': 'Uso do Banheiro', 'q105': 'Uso do Banheiro',
            'q106': 'Uso do Banheiro', 'q107': 'Uso do Banheiro',
            'q108': 'Uso do Banheiro', 'q109': 'Uso do Banheiro',

            // Habilidades Emocionais (q110-q149)
            // Controle Inibitório (q110-q119)
            'q110': 'Controle Inibitório', 'q111': 'Controle Inibitório',
            'q112': 'Controle Inibitório', 'q113': 'Controle Inibitório',
            'q114': 'Controle Inibitório', 'q115': 'Controle Inibitório',
            'q116': 'Controle Inibitório', 'q117': 'Controle Inibitório',
            'q118': 'Controle Inibitório', 'q119': 'Controle Inibitório',

            // Flexibilidade (q120-q129)
            'q120': 'Flexibilidade', 'q121': 'Flexibilidade',
            'q122': 'Flexibilidade', 'q123': 'Flexibilidade',
            'q124': 'Flexibilidade', 'q125': 'Flexibilidade',
            'q126': 'Flexibilidade', 'q127': 'Flexibilidade',
            'q128': 'Flexibilidade', 'q129': 'Flexibilidade',

            // Resposta Emocional (q130-q139)
            'q130': 'Resposta Emocional', 'q131': 'Resposta Emocional',
            'q132': 'Resposta Emocional', 'q133': 'Resposta Emocional',
            'q134': 'Resposta Emocional', 'q135': 'Resposta Emocional',
            'q136': 'Resposta Emocional', 'q137': 'Resposta Emocional',
            'q138': 'Resposta Emocional', 'q139': 'Resposta Emocional',

            // Empatia (q140-q149)
            'q140': 'Empatia', 'q141': 'Empatia', 'q142': 'Empatia',
            'q143': 'Empatia', 'q144': 'Empatia', 'q145': 'Empatia',
            'q146': 'Empatia', 'q147': 'Empatia', 'q148': 'Empatia',
            'q149': 'Empatia'
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
            this.showNotification('⚠️ Aguarde, relatórios ainda estão sendo gerados...', 'info');
            return;
        }
        
        this.isGeneratingReports = true;
        console.log('📊 Iniciando geração de relatórios padrão...');
        
        try {
            // Limpar todos os gráficos existentes antes de começar
            console.log('🧹 Limpando gráficos existentes...');
            await this.destroyAllCharts();
            
            // Gerar cada relatório com intervalo para evitar conflitos
            console.log('📈 Gerando relatório geral...');
            await this.generateReport(this.reportTypes.GENERAL);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('📊 Gerando relatório por grupos...');
            await this.generateReport(this.reportTypes.BY_GROUP);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            console.log('📋 Gerando relatório por subgrupos...');
            await this.generateReport(this.reportTypes.BY_SUBGROUP);
            
            if (this.selectedPatient) {
                await new Promise(resolve => setTimeout(resolve, 200));
                console.log('📈 Gerando relatório de evolução...');
                await this.generateReport(this.reportTypes.EVOLUTION);
            }
            
            console.log('✅ Todos os relatórios foram gerados com sucesso!');
            this.showNotification('✅ Relatórios gerados com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro durante geração de relatórios:', error);
            this.showNotification('❌ Erro ao gerar relatórios: ' + error.message, 'error');
        } finally {
            // Liberar o lock imediatamente ao terminar
            this.isGeneratingReports = false;
            console.log('🔓 Geração de relatórios finalizada');
        }
    }

    updateReports() {
        // DESABILITADO: Não gera relatórios automaticamente em mudanças de filtro
        // Os usuários devem clicar em "Gerar Relatórios" manualmente
        console.log('⚠️ Filtros alterados. Clique em "Gerar Relatórios" para atualizar.');
        this.showInitialMessage();
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
            return;
        }
        
        console.log(`📊 Criando gráfico de barras para ${canvasId}`);

        // SOLUÇÃO ROBUSTA: Destruição completa e recriação do canvas
        await this.safeDestroyChart(canvasId);
        await this.recreateCanvas(canvasId);
        
        // Obter nova referência do canvas após recriação
        const newCanvas = document.getElementById(canvasId);
        if (!newCanvas) {
            console.error(`❌ Erro: Canvas ${canvasId} não pôde ser recriado`);
            return;
        }

        // Aguardar Chart.js estar disponível e criar o gráfico
        await this.waitForChart();
        
        try {
            this.charts[canvasId] = new Chart(newCanvas, {
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
            console.log(`✅ Gráfico ${canvasId} criado com sucesso`);
        } catch (error) {
            console.error(`❌ Erro ao criar gráfico ${canvasId}:`, error);
        }
    }

    async createLineChart(canvasId, config) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`❌ Canvas ${canvasId} não encontrado`);
            return;
        }

        console.log(`📈 Criando gráfico de linha para ${canvasId}`);

        // SOLUÇÃO ROBUSTA: Destruição completa e recriação do canvas
        await this.safeDestroyChart(canvasId);
        await this.recreateCanvas(canvasId);
        
        // Obter nova referência do canvas após recriação
        const newCanvas = document.getElementById(canvasId);
        if (!newCanvas) {
            console.error(`❌ Erro: Canvas ${canvasId} não pôde ser recriado`);
            return;
        }

        // Aguardar Chart.js estar disponível e criar o gráfico
        await this.waitForChart();
        
        try {
            this.charts[canvasId] = new Chart(newCanvas, {
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
            console.log(`✅ Gráfico ${canvasId} criado com sucesso`);
        } catch (error) {
            console.error(`❌ Erro ao criar gráfico ${canvasId}:`, error);
        }
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

    // NOVOS MÉTODOS SEGUROS PARA GERENCIAMENTO DE CANVAS
    async safeDestroyChart(canvasId) {
        console.log(`🗑️ Destruindo chart ${canvasId} de forma segura...`);
        
        if (this.charts[canvasId]) {
            try {
                // Tentar destruir o gráfico
                this.charts[canvasId].destroy();
                console.log(`✅ Chart ${canvasId} destruído`);
            } catch (error) {
                console.warn(`⚠️ Erro ao destruir chart ${canvasId}:`, error);
            }
            
            // Remover da lista de charts
            delete this.charts[canvasId];
        }
        
        // Aguardar um pouco para garantir que a destruição foi processada
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    async recreateCanvas(canvasId) {
        console.log(`🔄 Recriando canvas ${canvasId}...`);
        
        const originalCanvas = document.getElementById(canvasId);
        if (!originalCanvas) {
            console.error(`❌ Canvas original ${canvasId} não encontrado`);
            return;
        }
        
        // Obter informações do canvas original
        const parent = originalCanvas.parentNode;
        const nextSibling = originalCanvas.nextSibling;
        const originalClasses = originalCanvas.className;
        const originalWidth = originalCanvas.width;
        const originalHeight = originalCanvas.height;
        
        // Remover canvas antigo
        originalCanvas.remove();
        
        // Criar novo canvas
        const newCanvas = document.createElement('canvas');
        newCanvas.id = canvasId;
        newCanvas.className = originalClasses;
        newCanvas.width = originalWidth;
        newCanvas.height = originalHeight;
        
        // Inserir no DOM
        if (nextSibling) {
            parent.insertBefore(newCanvas, nextSibling);
        } else {
            parent.appendChild(newCanvas);
        }
        
        console.log(`✅ Canvas ${canvasId} recriado`);
        
        // Aguardar um pouco para o DOM processar
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    async waitForChart() {
        return new Promise((resolve) => {
            const checkChart = () => {
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkChart, 50);
                }
            };
            checkChart();
        });
    }
    
    async destroyAllCharts() {
        console.log('🗑️ Destruindo todos os gráficos existentes...');
        
        const chartIds = Object.keys(this.charts);
        for (const chartId of chartIds) {
            await this.safeDestroyChart(chartId);
        }
        
        console.log('✅ Todos os gráficos foram destruídos');
    }

    destroy() {
        // Limpar todos os gráficos
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                try {
                    chart.destroy();
                } catch (error) {
                    console.warn('Erro ao destruir chart:', error);
                }
            }
        });
        this.charts = {};
    }

    // Novo método para visualização detalhada de uma avaliação
    showEvaluationDetails(evaluation) {
        console.log('🔍 Mostrando detalhes da avaliação:', evaluation);

        // Criar modal se não existir
        let modal = document.getElementById('evaluation-details-modal');
        if (!modal) {
            modal = this.createEvaluationDetailsModal();
        }

        // Preencher com dados da avaliação
        this.populateEvaluationDetails(modal, evaluation);

        // Mostrar modal
        modal.style.display = 'flex';
    }

    createEvaluationDetailsModal() {
        const modal = document.createElement('div');
        modal.id = 'evaluation-details-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div class="modal-content-evaluation" style="
                background: white;
                border-radius: 10px;
                max-width: 1200px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <div class="modal-header-evaluation" style="
                    position: sticky;
                    top: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 100;
                ">
                    <h2 id="evaluation-title" style="margin: 0;">Detalhes da Avaliação</h2>
                    <button class="close-modal-btn" onclick="document.getElementById('evaluation-details-modal').style.display='none'" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">&times;</button>
                </div>
                <div id="evaluation-content" class="modal-body-evaluation" style="padding: 30px;">
                    <!-- Conteúdo será preenchido dinamicamente -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora do modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        return modal;
    }

    populateEvaluationDetails(modal, evaluation) {
        const title = modal.querySelector('#evaluation-title');
        const content = modal.querySelector('#evaluation-content');

        const patientName = evaluation.patientInfo?.name || 'Paciente';
        const evalDate = evaluation.patientInfo?.evaluationDate || evaluation.createdAt;
        const formattedDate = new Date(evalDate).toLocaleDateString('pt-BR');

        title.textContent = `Avaliação de ${patientName} - ${formattedDate}`;

        let html = `
            <div class="evaluation-summary" style="
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
            ">
                <h3 style="margin-top: 0;">📊 Resumo Geral</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Paciente:</strong> ${patientName}
                    </div>
                    <div>
                        <strong>Data:</strong> ${formattedDate}
                    </div>
                    <div>
                        <strong>Avaliador:</strong> ${evaluation.patientInfo?.evaluatorName || 'Não informado'}
                    </div>
                    <div>
                        <strong>Pontuação Total:</strong> ${evaluation.totalScore || 0} pontos
                    </div>
                </div>
            </div>
        `;

        // Adicionar visualização por categorias e subgrupos
        html += this.generateQuestionsView(evaluation);

        content.innerHTML = html;
    }

    generateQuestionsView(evaluation) {
        if (!evaluation.responses) {
            return '<p>Nenhuma resposta encontrada para esta avaliação.</p>';
        }

        // Mapa de perguntas (você pode expandir isso com as descrições completas das 149 perguntas)
        const questionDescriptions = this.getQuestionDescriptions();

        let html = '<div class="questions-view">';

        // Organizar por categoria
        const categoriesConfig = {
            'Habilidades Comunicativas': {
                color: '#667eea',
                subgroups: {
                    'Contato Visual': { range: [1, 10], questions: [] },
                    'Comunicação Alternativa': { range: [11, 20], questions: [] },
                    'Linguagem Expressiva': { range: [21, 30], questions: [] },
                    'Linguagem Receptiva': { range: [31, 40], questions: [] }
                }
            },
            'Habilidades Sociais': {
                color: '#4facfe',
                subgroups: {
                    'Expressão Facial': { range: [41, 50], questions: [] },
                    'Imitação': { range: [51, 60], questions: [] },
                    'Atenção Compartilhada': { range: [61, 70], questions: [] },
                    'Brincar': { range: [71, 80], questions: [] }
                }
            },
            'Habilidades Funcionais': {
                color: '#ffecd2',
                subgroups: {
                    'Auto Cuidado': { range: [81, 89], questions: [] },
                    'Vestir-se': { range: [90, 99], questions: [] },
                    'Uso do Banheiro': { range: [100, 109], questions: [] }
                }
            },
            'Habilidades Emocionais': {
                color: '#d299c2',
                subgroups: {
                    'Controle Inibitório': { range: [110, 119], questions: [] },
                    'Flexibilidade': { range: [120, 129], questions: [] },
                    'Resposta Emocional': { range: [130, 139], questions: [] },
                    'Empatia': { range: [140, 149], questions: [] }
                }
            }
        };

        // Preencher respostas nas estruturas
        Object.entries(evaluation.responses).forEach(([questionId, score]) => {
            const questionNum = parseInt(questionId.replace('q', ''));
            const description = questionDescriptions[questionId] || `Questão ${questionNum}`;

            Object.entries(categoriesConfig).forEach(([categoryName, categoryData]) => {
                Object.entries(categoryData.subgroups).forEach(([subgroupName, subgroupData]) => {
                    if (questionNum >= subgroupData.range[0] && questionNum <= subgroupData.range[1]) {
                        subgroupData.questions.push({
                            id: questionId,
                            num: questionNum,
                            description: description,
                            score: parseInt(score)
                        });
                    }
                });
            });
        });

        // Gerar HTML para cada categoria
        Object.entries(categoriesConfig).forEach(([categoryName, categoryData]) => {
            html += `
                <div class="category-section" style="margin-bottom: 30px;">
                    <h3 style="
                        color: ${categoryData.color};
                        border-bottom: 3px solid ${categoryData.color};
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    ">${categoryName}</h3>
            `;

            // Gerar HTML para cada subgrupo
            Object.entries(categoryData.subgroups).forEach(([subgroupName, subgroupData]) => {
                if (subgroupData.questions.length > 0) {
                    // Calcular estatísticas do subgrupo
                    const total = subgroupData.questions.reduce((sum, q) => sum + q.score, 0);
                    const max = subgroupData.questions.length * 5;
                    const percentage = Math.round((total / max) * 100);

                    html += `
                        <div class="subgroup-section" style="
                            background: ${categoryData.color}10;
                            border-left: 4px solid ${categoryData.color};
                            padding: 15px;
                            margin-bottom: 20px;
                            border-radius: 5px;
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: ${categoryData.color};">${subgroupName}</h4>
                                <div style="text-align: right;">
                                    <div style="font-size: 24px; font-weight: bold; color: ${categoryData.color};">${percentage}%</div>
                                    <div style="font-size: 12px; color: #666;">${total}/${max} pontos</div>
                                </div>
                            </div>

                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: ${categoryData.color}20;">
                                        <th style="padding: 10px; text-align: left; width: 60px;">Questão</th>
                                        <th style="padding: 10px; text-align: left;">Descrição</th>
                                        <th style="padding: 10px; text-align: center; width: 100px;">Pontuação</th>
                                        <th style="padding: 10px; text-align: center; width: 120px;">Nível</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;

                    // Ordenar questões por número
                    subgroupData.questions.sort((a, b) => a.num - b.num);

                    subgroupData.questions.forEach(question => {
                        const level = this.getScoreLevel(question.score);
                        html += `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px; font-weight: bold;">Q${question.num}</td>
                                <td style="padding: 10px;">${question.description}</td>
                                <td style="padding: 10px; text-align: center; font-weight: bold; font-size: 18px;">
                                    ${question.score}/5
                                </td>
                                <td style="padding: 10px; text-align: center;">
                                    <span style="
                                        background: ${level.color};
                                        color: white;
                                        padding: 5px 10px;
                                        border-radius: 15px;
                                        font-size: 12px;
                                        font-weight: bold;
                                    ">${level.label}</span>
                                </td>
                            </tr>
                        `;
                    });

                    html += `
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            });

            html += `</div>`;
        });

        html += '</div>';
        return html;
    }

    getScoreLevel(score) {
        if (score >= 5) return { label: 'Excelente', color: '#28a745' };
        if (score >= 4) return { label: 'Bom', color: '#5cb85c' };
        if (score >= 3) return { label: 'Regular', color: '#ffc107' };
        if (score >= 2) return { label: 'Baixo', color: '#ff9800' };
        return { label: 'Muito Baixo', color: '#dc3545' };
    }

    // Novo método para gerar PDI (Plano de Desenvolvimento de Intervenção)
    showPDIGenerator(evaluation) {
        console.log('📋 Gerando PDI para avaliação:', evaluation);

        // Criar modal de PDI se não existir
        let modal = document.getElementById('pdi-generator-modal');
        if (!modal) {
            modal = this.createPDIModal();
        }

        // Preencher com dados da avaliação
        this.populatePDIGenerator(modal, evaluation);

        // Mostrar modal
        modal.style.display = 'flex';
    }

    createPDIModal() {
        const modal = document.createElement('div');
        modal.id = 'pdi-generator-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div class="modal-content-pdi" style="
                background: white;
                border-radius: 10px;
                max-width: 1400px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            ">
                <div class="modal-header-pdi" style="
                    position: sticky;
                    top: 0;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 100;
                ">
                    <div>
                        <h2 id="pdi-title" style="margin: 0;">PDI - Plano de Desenvolvimento de Intervenção</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Selecione as habilidades para intervenção</p>
                    </div>
                    <button class="close-modal-btn" onclick="document.getElementById('pdi-generator-modal').style.display='none'" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">&times;</button>
                </div>
                <div id="pdi-content" class="modal-body-pdi" style="padding: 30px;">
                    <!-- Conteúdo será preenchido dinamicamente -->
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora do modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        return modal;
    }

    populatePDIGenerator(modal, evaluation) {
        const title = modal.querySelector('#pdi-title');
        const content = modal.querySelector('#pdi-content');

        const patientName = evaluation.patientInfo?.name || 'Paciente';
        const evalDate = evaluation.patientInfo?.evaluationDate || evaluation.createdAt;
        const formattedDate = new Date(evalDate).toLocaleDateString('pt-BR');

        title.textContent = `PDI - ${patientName} - ${formattedDate}`;

        // Armazenar avaliação no modal para uso posterior
        modal.dataset.evaluationData = JSON.stringify(evaluation);

        let html = `
            <div class="pdi-info-box" style="
                background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #667eea;
            ">
                <h3 style="margin-top: 0; color: #667eea;">ℹ️ Como usar o gerador de PDI</h3>
                <p style="margin: 10px 0;">
                    <strong>1.</strong> Selecione as <strong>pontuações</strong> que deseja trabalhar (ex: notas 1, 2 e 3)<br>
                    <strong>2.</strong> Selecione os <strong>grupos</strong> e/ou <strong>subgrupos</strong> de habilidades<br>
                    <strong>3.</strong> Clique em <strong>"Gerar PDI"</strong> para visualizar as questões selecionadas<br>
                    <strong>4.</strong> Exporte o PDI em PDF para impressão ou compartilhamento
                </p>
            </div>

            <!-- Filtros de PDI -->
            <div class="pdi-filters" style="
                background: #f8f9fa;
                padding: 25px;
                border-radius: 10px;
                margin-bottom: 30px;
            ">
                <h3 style="margin-top: 0; color: #495057;">🎯 Filtros para PDI</h3>

                <!-- Filtro de Pontuações -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #495057;">
                        📊 Selecione as Pontuações para Intervir:
                    </label>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${[1, 2, 3, 4, 5].map(score => {
                            const level = this.getScoreLevel(score);
                            return `
                                <label style="
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                    padding: 10px 15px;
                                    background: white;
                                    border: 2px solid ${level.color};
                                    border-radius: 8px;
                                    cursor: pointer;
                                    transition: all 0.3s;
                                ">
                                    <input type="checkbox"
                                        class="pdi-score-filter"
                                        value="${score}"
                                        style="width: 18px; height: 18px; cursor: pointer;">
                                    <span style="
                                        background: ${level.color};
                                        color: white;
                                        padding: 4px 10px;
                                        border-radius: 15px;
                                        font-size: 13px;
                                        font-weight: bold;
                                    ">${score} - ${level.label}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                    <small style="display: block; margin-top: 8px; color: #6c757d;">
                        💡 Dica: Geralmente seleciona-se pontuações baixas (1, 2, 3) para intervenção
                    </small>
                </div>

                <!-- Filtro de Grupos -->
                <div style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #495057;">
                        📚 Selecione os Grupos de Habilidades:
                    </label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px;">
                        ${Object.entries(this.groupMapping).map(([groupName, groupData]) => `
                            <label style="
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                padding: 12px;
                                background: white;
                                border: 2px solid ${groupData.color};
                                border-radius: 8px;
                                cursor: pointer;
                            ">
                                <input type="checkbox"
                                    class="pdi-group-filter"
                                    value="${groupName}"
                                    onchange="window.reportsManager.updatePDISubgroupFilters()"
                                    style="width: 18px; height: 18px; cursor: pointer;">
                                <span style="font-weight: 600; color: ${groupData.color};">${groupName}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Filtro de Subgrupos -->
                <div id="pdi-subgroups-container" style="margin-bottom: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 10px; color: #495057;">
                        🎯 Selecione os Subgrupos (opcional):
                    </label>
                    <div id="pdi-subgroups-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
                        <!-- Subgrupos serão preenchidos dinamicamente -->
                    </div>
                    <small style="display: block; margin-top: 8px; color: #6c757d;">
                        💡 Selecione grupos acima para ver os subgrupos disponíveis
                    </small>
                </div>

                <!-- Botões de Ação -->
                <div style="display: flex; gap: 10px; margin-top: 25px;">
                    <button onclick="window.reportsManager.generatePDI()" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        📋 Gerar PDI
                    </button>
                    <button onclick="window.reportsManager.clearPDIFilters()" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                    ">
                        🗑️ Limpar Filtros
                    </button>
                    <button onclick="window.reportsManager.selectAllLowScores()" style="
                        background: #28a745;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                    ">
                        ⚡ Selecionar Baixas (1,2,3)
                    </button>
                </div>
            </div>

            <!-- Resultado do PDI -->
            <div id="pdi-result" style="display: none;">
                <!-- Resultado será preenchido dinamicamente -->
            </div>
        `;

        content.innerHTML = html;

        // Inicializar subgrupos
        this.updatePDISubgroupFilters();
    }

    updatePDISubgroupFilters() {
        const selectedGroups = Array.from(document.querySelectorAll('.pdi-group-filter:checked'))
            .map(cb => cb.value);

        const subgroupsList = document.getElementById('pdi-subgroups-list');
        if (!subgroupsList) return;

        if (selectedGroups.length === 0) {
            subgroupsList.innerHTML = '<p style="color: #6c757d; font-style: italic;">Selecione um ou mais grupos acima</p>';
            return;
        }

        let html = '';
        selectedGroups.forEach(groupName => {
            const groupData = this.groupMapping[groupName];
            if (groupData && groupData.subgroups) {
                groupData.subgroups.forEach(subgroupName => {
                    html += `
                        <label style="
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            padding: 8px 12px;
                            background: ${groupData.color}20;
                            border: 1px solid ${groupData.color};
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">
                            <input type="checkbox"
                                class="pdi-subgroup-filter"
                                value="${subgroupName}"
                                data-group="${groupName}"
                                style="width: 16px; height: 16px; cursor: pointer;">
                            <span style="color: ${groupData.color};">${subgroupName}</span>
                        </label>
                    `;
                });
            }
        });

        subgroupsList.innerHTML = html;
    }

    selectAllLowScores() {
        // Selecionar pontuações 1, 2 e 3
        document.querySelectorAll('.pdi-score-filter').forEach(cb => {
            const score = parseInt(cb.value);
            cb.checked = (score >= 1 && score <= 3);
        });
        this.showNotification('Pontuações baixas (1, 2, 3) selecionadas', 'success');
    }

    clearPDIFilters() {
        document.querySelectorAll('.pdi-score-filter, .pdi-group-filter, .pdi-subgroup-filter').forEach(cb => {
            cb.checked = false;
        });
        this.updatePDISubgroupFilters();
        document.getElementById('pdi-result').style.display = 'none';
        this.showNotification('Filtros limpos', 'info');
    }

    generatePDI() {
        const modal = document.getElementById('pdi-generator-modal');
        const evaluationData = JSON.parse(modal.dataset.evaluationData);

        // Obter filtros selecionados
        const selectedScores = Array.from(document.querySelectorAll('.pdi-score-filter:checked'))
            .map(cb => parseInt(cb.value));

        const selectedGroups = Array.from(document.querySelectorAll('.pdi-group-filter:checked'))
            .map(cb => cb.value);

        const selectedSubgroups = Array.from(document.querySelectorAll('.pdi-subgroup-filter:checked'))
            .map(cb => cb.value);

        // Validações
        if (selectedScores.length === 0) {
            this.showNotification('Selecione pelo menos uma pontuação', 'error');
            return;
        }

        if (selectedGroups.length === 0 && selectedSubgroups.length === 0) {
            this.showNotification('Selecione pelo menos um grupo ou subgrupo', 'error');
            return;
        }

        // Filtrar questões
        const filteredQuestions = this.filterQuestionsForPDI(
            evaluationData,
            selectedScores,
            selectedGroups,
            selectedSubgroups
        );

        // Mostrar resultado
        this.displayPDIResult(evaluationData, filteredQuestions, selectedScores, selectedGroups, selectedSubgroups);
    }

    filterQuestionsForPDI(evaluation, selectedScores, selectedGroups, selectedSubgroups) {
        if (!evaluation.responses) return [];

        const questionDescriptions = this.getQuestionDescriptions();
        const categoriesConfig = this.getCategoriesConfig();
        const results = [];

        Object.entries(evaluation.responses).forEach(([questionId, score]) => {
            const questionNum = parseInt(questionId.replace('q', ''));
            const scoreValue = parseInt(score);

            // Filtrar por pontuação
            if (!selectedScores.includes(scoreValue)) {
                return;
            }

            // Encontrar categoria e subgrupo da questão
            let questionCategory = null;
            let questionSubgroup = null;

            Object.entries(categoriesConfig).forEach(([categoryName, categoryData]) => {
                Object.entries(categoryData.subgroups).forEach(([subgroupName, subgroupData]) => {
                    if (questionNum >= subgroupData.range[0] && questionNum <= subgroupData.range[1]) {
                        questionCategory = categoryName;
                        questionSubgroup = subgroupName;
                    }
                });
            });

            // Filtrar por grupo
            if (selectedGroups.length > 0 && !selectedGroups.includes(questionCategory)) {
                return;
            }

            // Filtrar por subgrupo (se especificado)
            if (selectedSubgroups.length > 0 && !selectedSubgroups.includes(questionSubgroup)) {
                return;
            }

            // Adicionar questão ao resultado
            results.push({
                questionId,
                questionNum,
                description: questionDescriptions[questionId] || `Questão ${questionNum}`,
                score: scoreValue,
                level: this.getScoreLevel(scoreValue),
                category: questionCategory,
                subgroup: questionSubgroup,
                categoryColor: categoriesConfig[questionCategory]?.color || '#ccc'
            });
        });

        // Ordenar por categoria, subgrupo e número
        results.sort((a, b) => {
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }
            if (a.subgroup !== b.subgroup) {
                return a.subgroup.localeCompare(b.subgroup);
            }
            return a.questionNum - b.questionNum;
        });

        return results;
    }

    displayPDIResult(evaluation, questions, selectedScores, selectedGroups, selectedSubgroups) {
        const resultDiv = document.getElementById('pdi-result');
        if (!resultDiv) return;

        const patientName = evaluation.patientInfo?.name || 'Paciente';
        const evalDate = evaluation.patientInfo?.evaluationDate || evaluation.createdAt;
        const formattedDate = new Date(evalDate).toLocaleDateString('pt-BR');

        if (questions.length === 0) {
            resultDiv.innerHTML = `
                <div style="
                    background: #fff3cd;
                    border: 2px solid #ffc107;
                    border-radius: 10px;
                    padding: 20px;
                    text-align: center;
                ">
                    <h3 style="color: #856404; margin-top: 0;">⚠️ Nenhuma questão encontrada</h3>
                    <p>Não há questões que correspondam aos filtros selecionados.</p>
                    <p>Tente ajustar os filtros ou selecionar pontuações diferentes.</p>
                </div>
            `;
            resultDiv.style.display = 'block';
            return;
        }

        // Agrupar por categoria e subgrupo
        const grouped = new Map();
        questions.forEach(q => {
            if (!grouped.has(q.category)) {
                grouped.set(q.category, new Map());
            }
            if (!grouped.get(q.category).has(q.subgroup)) {
                grouped.get(q.category).set(q.subgroup, []);
            }
            grouped.get(q.category).get(q.subgroup).push(q);
        });

        let html = `
            <div style="
                background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 20px;
            ">
                <h3 style="margin-top: 0;">✅ PDI Gerado com Sucesso!</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Paciente:</strong> ${patientName}
                    </div>
                    <div>
                        <strong>Data da Avaliação:</strong> ${formattedDate}
                    </div>
                    <div>
                        <strong>Questões Selecionadas:</strong> ${questions.length}
                    </div>
                    <div>
                        <strong>Pontuações:</strong> ${selectedScores.join(', ')}
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <button onclick="window.reportsManager.exportPDIToPDF()" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        margin-right: 10px;
                    ">
                        📄 Exportar PDF
                    </button>
                    <button onclick="window.reportsManager.printPDI()" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                    ">
                        🖨️ Imprimir
                    </button>
                </div>
            </div>
        `;

        // Gerar HTML para cada categoria e subgrupo
        grouped.forEach((subgroupsMap, categoryName) => {
            const categoryColor = questions.find(q => q.category === categoryName)?.categoryColor || '#ccc';

            html += `
                <div style="
                    border-top: 4px solid ${categoryColor};
                    background: white;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                ">
                    <h3 style="color: ${categoryColor}; margin-top: 0;">${categoryName}</h3>
            `;

            subgroupsMap.forEach((questionsInSubgroup, subgroupName) => {
                html += `
                    <div style="
                        background: ${categoryColor}10;
                        border-left: 4px solid ${categoryColor};
                        padding: 15px;
                        margin-bottom: 15px;
                        border-radius: 5px;
                    ">
                        <h4 style="color: ${categoryColor}; margin-top: 0;">${subgroupName} (${questionsInSubgroup.length} questões)</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: ${categoryColor}30;">
                                    <th style="padding: 10px; text-align: left; width: 70px;">Questão</th>
                                    <th style="padding: 10px; text-align: left;">Habilidade a Desenvolver</th>
                                    <th style="padding: 10px; text-align: center; width: 100px;">Pontuação</th>
                                    <th style="padding: 10px; text-align: center; width: 120px;">Nível</th>
                                    <th style="padding: 10px; text-align: left; width: 200px;">Estratégia</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                questionsInSubgroup.forEach(question => {
                    html += `
                        <tr style="border-bottom: 1px solid #dee2e6;">
                            <td style="padding: 12px; font-weight: bold;">Q${question.questionNum}</td>
                            <td style="padding: 12px;">${question.description}</td>
                            <td style="padding: 12px; text-align: center; font-size: 20px; font-weight: bold;">
                                ${question.score}/5
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <span style="
                                    background: ${question.level.color};
                                    color: white;
                                    padding: 5px 10px;
                                    border-radius: 15px;
                                    font-size: 12px;
                                    font-weight: bold;
                                ">${question.level.label}</span>
                            </td>
                            <td style="padding: 12px;">
                                <textarea placeholder="Descreva a estratégia de intervenção..." style="
                                    width: 100%;
                                    min-height: 60px;
                                    padding: 8px;
                                    border: 1px solid #ced4da;
                                    border-radius: 5px;
                                    font-family: inherit;
                                    resize: vertical;
                                "></textarea>
                            </td>
                        </tr>
                    `;
                });

                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            });

            html += `</div>`;
        });

        resultDiv.innerHTML = html;
        resultDiv.style.display = 'block';

        // Scroll suave para o resultado
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

        this.showNotification(`PDI gerado com ${questions.length} questões!`, 'success');
    }

    getCategoriesConfig() {
        return {
            'Habilidades Comunicativas': {
                color: '#667eea',
                subgroups: {
                    'Contato Visual': { range: [1, 10] },
                    'Comunicação Alternativa': { range: [11, 20] },
                    'Linguagem Expressiva': { range: [21, 30] },
                    'Linguagem Receptiva': { range: [31, 40] }
                }
            },
            'Habilidades Sociais': {
                color: '#4facfe',
                subgroups: {
                    'Expressão Facial': { range: [41, 50] },
                    'Imitação': { range: [51, 60] },
                    'Atenção Compartilhada': { range: [61, 70] },
                    'Brincar': { range: [71, 80] }
                }
            },
            'Habilidades Funcionais': {
                color: '#ffecd2',
                subgroups: {
                    'Auto Cuidado': { range: [81, 89] },
                    'Vestir-se': { range: [90, 99] },
                    'Uso do Banheiro': { range: [100, 109] }
                }
            },
            'Habilidades Emocionais': {
                color: '#d299c2',
                subgroups: {
                    'Controle Inibitório': { range: [110, 119] },
                    'Flexibilidade': { range: [120, 129] },
                    'Resposta Emocional': { range: [130, 139] },
                    'Empatia': { range: [140, 149] }
                }
            }
        };
    }

    exportPDIToPDF() {
        this.showNotification('Exportando PDI para PDF...', 'info');
        // TODO: Implementar exportação real para PDF
        // Por enquanto, usa a função de impressão do navegador
        window.print();
    }

    printPDI() {
        window.print();
    }

    getQuestionDescriptions() {
        // Descrições completas das 149 questões
        return {
            // Contato Visual (q1-q10)
            'q1': 'Olhar para o adulto quando chamada pelo nome',
            'q2': 'Manter contato ocular por pelo menos 1 segundo, quando chamada pelo nome',
            'q3': 'Olhar nos olhos de uma pessoa durante uma interação (aprox. 3 segundos)',
            'q4': 'Olhar nos olhos de uma pessoa durante 5 segundos',
            'q5': 'Olhar quando engajada numa brincadeira',
            'q6': 'Olhar à distância de 3 metros',
            'q7': 'Olhar à distância de 5 metros',
            'q8': 'Olhar à distância de 5 metros e engajada numa brincadeira',
            'q9': 'Olhar para mais de uma pessoa (duas pessoas chamam a criança alternadamente)',
            'q10': 'Manter contato visual durante toda a interação',

            // Comunicação Alternativa (q11-q20)
            'q11': 'Apontar para objetos desejados',
            'q12': 'Usar gestos simples (acenar, tchau)',
            'q13': 'Usar cartões de comunicação',
            'q14': 'Combinar gestos com vocalizações',
            'q15': 'Usar PECS (Sistema de Comunicação por Troca de Figuras)',
            'q16': 'Indicar sim/não com a cabeça',
            'q17': 'Usar dispositivos de comunicação assistida',
            'q18': 'Expressar necessidades básicas com gestos',
            'q19': 'Responder a perguntas com gestos',
            'q20': 'Iniciar comunicação usando gestos',

            // Linguagem Expressiva (q21-q30)
            'q21': 'Emitir sons vocálicos',
            'q22': 'Imitar sons simples',
            'q23': 'Dizer palavras simples (mamã, papá)',
            'q24': 'Combinar duas palavras',
            'q25': 'Formar frases simples (3-4 palavras)',
            'q26': 'Nomear objetos comuns',
            'q27': 'Descrever ações simples',
            'q28': 'Fazer pedidos verbais',
            'q29': 'Responder perguntas simples',
            'q30': 'Contar experiências curtas',

            // Linguagem Receptiva (q31-q40)
            'q31': 'Responder ao próprio nome',
            'q32': 'Seguir comandos simples (vem aqui)',
            'q33': 'Identificar partes do corpo',
            'q34': 'Apontar para objetos nomeados',
            'q35': 'Seguir instruções de dois passos',
            'q36': 'Compreender conceitos espaciais (em cima, embaixo)',
            'q37': 'Identificar cores',
            'q38': 'Compreender perguntas "onde"',
            'q39': 'Compreender perguntas "o que"',
            'q40': 'Seguir instruções complexas (3+ passos)',

            // Expressão Facial (q41-q50)
            'q41': 'Sorrir em resposta a estímulos sociais',
            'q42': 'Demonstrar expressão de alegria',
            'q43': 'Mostrar tristeza facialmente',
            'q44': 'Expressar surpresa',
            'q45': 'Demonstrar medo ou apreensão',
            'q46': 'Mostrar raiva apropriadamente',
            'q47': 'Responder a expressões faciais de outros',
            'q48': 'Imitar expressões faciais',
            'q49': 'Usar expressões para comunicar necessidades',
            'q50': 'Modular expressões conforme contexto',

            // Imitação (q51-q60)
            'q51': 'Imitar ações com objetos',
            'q52': 'Imitar movimentos motores grossos',
            'q53': 'Imitar movimentos motores finos',
            'q54': 'Imitar sons e vocalizações',
            'q55': 'Imitar sequências de ações',
            'q56': 'Imitar comportamentos sociais',
            'q57': 'Imitar espontaneamente',
            'q58': 'Imitar após demonstração',
            'q59': 'Imitar com precisão',
            'q60': 'Usar imitação para aprender novas habilidades',

            // Atenção Compartilhada (q61-q70)
            'q61': 'Seguir o olhar do adulto',
            'q62': 'Seguir apontamento',
            'q63': 'Compartilhar interesse em objetos',
            'q64': 'Mostrar objetos para outras pessoas',
            'q65': 'Verificar a reação do adulto',
            'q66': 'Alternar olhar entre objeto e pessoa',
            'q67': 'Apontar para compartilhar interesse',
            'q68': 'Iniciar atenção compartilhada',
            'q69': 'Responder a atenção compartilhada',
            'q70': 'Manter atenção compartilhada por período prolongado',

            // Brincar (q71-q80)
            'q71': 'Explorar brinquedos',
            'q72': 'Brincar funcionalmente com objetos',
            'q73': 'Engajar em brincadeira paralela',
            'q74': 'Participar de brincadeiras simples',
            'q75': 'Brincar de faz-de-conta',
            'q76': 'Compartilhar brinquedos',
            'q77': 'Seguir regras simples em jogos',
            'q78': 'Participar de brincadeiras cooperativas',
            'q79': 'Criar sequências de brincadeiras',
            'q80': 'Brincar de forma imaginativa e criativa',

            // Auto Cuidado (q81-q89)
            'q81': 'Aceitar ser alimentado',
            'q82': 'Segurar colher',
            'q83': 'Comer sozinho com colher',
            'q84': 'Beber de copo',
            'q85': 'Usar guardanapo',
            'q86': 'Lavar as mãos (com ajuda)',
            'q87': 'Lavar as mãos (independentemente)',
            'q88': 'Escovar dentes (com ajuda)',
            'q89': 'Escovar dentes (independentemente)',

            // Vestir-se (q90-q99)
            'q90': 'Cooperar ao ser vestido',
            'q91': 'Tirar peças simples de roupa',
            'q92': 'Colocar peças simples de roupa',
            'q93': 'Tirar sapatos',
            'q94': 'Colocar sapatos',
            'q95': 'Subir zíper',
            'q96': 'Abotoar botões grandes',
            'q97': 'Vestir-se completamente (com ajuda)',
            'q98': 'Vestir-se completamente (independentemente)',
            'q99': 'Escolher roupas apropriadas',

            // Uso do Banheiro (q100-q109)
            'q100': 'Indicar necessidade de ir ao banheiro',
            'q101': 'Sentar no vaso sanitário',
            'q102': 'Usar o banheiro com assistência',
            'q103': 'Usar o banheiro independentemente (dia)',
            'q104': 'Usar o banheiro independentemente (noite)',
            'q105': 'Limpar-se adequadamente',
            'q106': 'Lavar as mãos após usar o banheiro',
            'q107': 'Dar descarga',
            'q108': 'Vestir-se após usar o banheiro',
            'q109': 'Gerenciar completamente a rotina do banheiro',

            // Controle Inibitório (q110-q119)
            'q110': 'Esperar sua vez em atividades',
            'q111': 'Parar uma atividade quando solicitado',
            'q112': 'Controlar impulsos básicos',
            'q113': 'Não interromper outros',
            'q114': 'Pensar antes de agir',
            'q115': 'Resistir a distrações',
            'q116': 'Manter-se em tarefa',
            'q117': 'Controlar comportamentos repetitivos',
            'q118': 'Adaptar comportamento a contextos diferentes',
            'q119': 'Demonstrar autocontrole em situações desafiadoras',

            // Flexibilidade (q120-q129)
            'q120': 'Aceitar pequenas mudanças na rotina',
            'q121': 'Experimentar novos alimentos',
            'q122': 'Tolerar mudanças no ambiente',
            'q123': 'Adaptar-se a novos cuidadores',
            'q124': 'Lidar com transições',
            'q125': 'Aceitar mudanças de planos',
            'q126': 'Experimentar novas atividades',
            'q127': 'Tolerar imprevistos',
            'q128': 'Demonstrar pensamento flexível',
            'q129': 'Ajustar comportamento a novas situações',

            // Resposta Emocional (q130-q139)
            'q130': 'Acalmar-se com conforto do adulto',
            'q131': 'Expressar emoções apropriadamente',
            'q132': 'Identificar emoções básicas',
            'q133': 'Demonstrar afeto',
            'q134': 'Buscar conforto quando necessário',
            'q135': 'Controlar reações emocionais intensas',
            'q136': 'Responder a conforto emocional',
            'q137': 'Demonstrar orgulho por conquistas',
            'q138': 'Lidar com frustração',
            'q139': 'Regular emoções independentemente',

            // Empatia (q140-q149)
            'q140': 'Perceber quando outros estão chateados',
            'q141': 'Demonstrar preocupação com outros',
            'q142': 'Oferecer conforto a outros',
            'q143': 'Compartilhar com outros',
            'q144': 'Comemorar sucessos de outros',
            'q145': 'Respeitar sentimentos alheios',
            'q146': 'Ajustar comportamento baseado em emoções de outros',
            'q147': 'Pedir desculpas quando apropriado',
            'q148': 'Demonstrar empatia em situações variadas',
            'q149': 'Tomar perspectiva de outras pessoas'
        };
    }
}

// Exportar para uso global
window.ReportsManager = ReportsManager;