// Script para o Painel do Terapeuta
// Gestão completa de pacientes, avaliações e relatórios

// Firebase Functions
class FirebaseManager {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.initFirebase();
    }

    async initFirebase() {
        try {
            // Aguardar Firebase estar disponível
            while (!window.firebase) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.db = window.firebase.db;
            this.initialized = true;
            console.log('Firebase inicializado com sucesso');
        } catch (error) {
            console.warn('Firebase não disponível, usando localStorage:', error);
            this.initialized = false;
        }
    }

    async getAllEvaluations() {
        if (!this.initialized) {
            return this.getFromLocalStorage();
        }

        try {
            const { getDocs, collection, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            const q = query(collection(this.db, 'evaluations'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const evaluations = [];
            
            querySnapshot.forEach((doc) => {
                evaluations.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return evaluations;
        } catch (error) {
            console.error('Erro ao buscar dados do Firebase:', error);
            return this.getLocalStorageAsArray();
        }
    }

    async getEvaluationsByPatient(patientName) {
        const allEvaluations = await this.getAllEvaluations();
        return allEvaluations.filter(eval => 
            eval.patientInfo.name.toLowerCase().includes(patientName.toLowerCase())
        );
    }

    async getEvaluationsByDateRange(startDate, endDate) {
        const allEvaluations = await this.getAllEvaluations();
        return allEvaluations.filter(eval => {
            const evalDate = new Date(eval.patientInfo.evaluationDate);
            return evalDate >= new Date(startDate) && evalDate <= new Date(endDate);
        });
    }

    async deleteEvaluation(evaluationId) {
        if (this.initialized && evaluationId) {
            try {
                const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                await deleteDoc(doc(this.db, 'evaluations', evaluationId));
                console.log('Avaliação deletada do Firebase');
                return true;
            } catch (error) {
                console.error('Erro ao deletar do Firebase:', error);
                return false;
            }
        }
        return false;
    }

    getFromLocalStorage() {
        const saved = localStorage.getItem('questionnaireData');
        return saved ? JSON.parse(saved) : {};
    }

    getLocalStorageAsArray() {
        const savedData = this.getFromLocalStorage();
        return Object.entries(savedData).map(([date, data]) => ({
            id: `local_${date}`,
            ...data,
            createdAt: data.timestamp || new Date(date).toISOString()
        }));
    }
}

class TherapistDashboard {
    constructor() {
        this.firebaseManager = new FirebaseManager();
        this.currentPatient = null;
        this.allEvaluations = [];
        this.filteredEvaluations = [];
        this.questionGroups = this.initializeQuestionGroups();
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.updateStatistics();
        this.renderPatientsList();
    }

    setupEventListeners() {
        // Filtros
        document.getElementById('apply-filters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters').addEventListener('click', () => this.clearFilters());
        document.getElementById('refresh-data').addEventListener('click', () => this.refreshData());
        
        // Relatórios
        document.getElementById('export-general-report').addEventListener('click', () => this.exportGeneralReport());
        document.getElementById('export-period-report').addEventListener('click', () => this.exportPeriodReport());
        document.getElementById('export-evaluator-report').addEventListener('click', () => this.exportEvaluatorReport());
        document.getElementById('export-backup').addEventListener('click', () => this.exportBackup());
        
        // Detalhes do paciente
        document.getElementById('close-details').addEventListener('click', () => this.closePatientDetails());
        document.getElementById('export-patient-data').addEventListener('click', () => this.exportPatientData());
        document.getElementById('generate-report').addEventListener('click', () => this.generateDetailedReport());
        
        // Modal
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        
        // Busca em tempo real
        document.getElementById('patient-filter').addEventListener('input', (e) => {
            this.debounce(() => this.filterPatients(e.target.value), 300)();
        });
    }

    async loadData() {
        try {
            this.allEvaluations = await this.firebaseManager.getAllEvaluations();
            this.filteredEvaluations = [...this.allEvaluations];
            this.populateFilterOptions();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados. Verifique a conexão.');
        }
    }

    async refreshData() {
        const refreshButton = document.getElementById('refresh-data');
        const originalText = refreshButton.textContent;
        refreshButton.textContent = '🔄 Atualizando...';
        refreshButton.disabled = true;
        
        try {
            await this.loadData();
            this.updateStatistics();
            this.renderPatientsList();
            this.showSuccess('Dados atualizados com sucesso!');
        } catch (error) {
            this.showError('Erro ao atualizar dados.');
        } finally {
            refreshButton.textContent = originalText;
            refreshButton.disabled = false;
        }
    }

    updateStatistics() {
        const patients = this.getUniquePatients();
        const totalEvaluations = this.allEvaluations.length;
        const lastEvaluation = this.getLastEvaluationDate();
        const avgScore = this.calculateAverageScore();
        
        document.getElementById('total-patients').textContent = patients.length;
        document.getElementById('total-evaluations').textContent = totalEvaluations;
        document.getElementById('last-evaluation').textContent = lastEvaluation;
        document.getElementById('avg-score').textContent = avgScore;
    }

    getUniquePatients() {
        const patientNames = new Set();
        this.allEvaluations.forEach(eval => {
            patientNames.add(eval.patientInfo.name);
        });
        return Array.from(patientNames);
    }

    getLastEvaluationDate() {
        if (this.allEvaluations.length === 0) return 'Nenhuma';
        
        const latest = this.allEvaluations.reduce((latest, current) => {
            const currentDate = new Date(current.patientInfo.evaluationDate);
            const latestDate = new Date(latest.patientInfo.evaluationDate);
            return currentDate > latestDate ? current : latest;
        });
        
        return this.formatDate(latest.patientInfo.evaluationDate);
    }

    calculateAverageScore() {
        if (this.allEvaluations.length === 0) return '0%';
        
        const totalScore = this.allEvaluations.reduce((sum, eval) => sum + eval.totalScore, 0);
        const maxPossibleScore = 149 * 5; // 149 questões × 5 pontos máximos
        const avgScore = totalScore / this.allEvaluations.length;
        const percentage = Math.round((avgScore / maxPossibleScore) * 100);
        
        return `${percentage}%`;
    }

    populateFilterOptions() {
        const evaluatorSelector = document.getElementById('evaluator-filter');
        const reportEvaluatorSelector = document.getElementById('report-evaluator-selector');
        
        const evaluators = new Set();
        this.allEvaluations.forEach(eval => {
            if (eval.evaluatorInfo?.name) {
                evaluators.add(eval.evaluatorInfo.name);
            }
        });
        
        [evaluatorSelector, reportEvaluatorSelector].forEach(selector => {
            if (selector) {
                selector.innerHTML = '<option value="">Todos os avaliadores</option>';
                evaluators.forEach(evaluator => {
                    const option = document.createElement('option');
                    option.value = evaluator;
                    option.textContent = evaluator;
                    selector.appendChild(option);
                });
            }
        });
    }

    renderPatientsList() {
        const patientsContainer = document.getElementById('patients-list');
        const patients = this.getPatientsSummary();
        
        if (patients.length === 0) {
            patientsContainer.innerHTML = `
                <div class="loading-message">
                    📋 Nenhum paciente encontrado
                    <p>As avaliações aparecerão aqui conforme forem enviadas pelos pais.</p>
                </div>
            `;
            return;
        }
        
        patientsContainer.innerHTML = patients.map(patient => `
            <div class="patient-card" onclick="therapistDashboard.selectPatient('${patient.name}')">
                <div class="patient-name">${patient.name}</div>
                <div class="patient-summary">
                    <div class="summary-item">
                        <span>Avaliações:</span>
                        <span class="summary-value">${patient.evaluationsCount}</span>
                    </div>
                    <div class="summary-item">
                        <span>Última:</span>
                        <span class="summary-value">${this.formatDate(patient.lastEvaluation)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Progresso:</span>
                        <span class="summary-value">${patient.progress}%</span>
                    </div>
                    <div class="summary-item">
                        <span>Avaliador:</span>
                        <span class="summary-value">${patient.lastEvaluator}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getPatientsSummary() {
        const patientsMap = new Map();
        
        this.filteredEvaluations.forEach(evaluation => {
            const patientName = evaluation.patientInfo.name;
            
            if (!patientsMap.has(patientName)) {
                patientsMap.set(patientName, {
                    name: patientName,
                    evaluations: [],
                    evaluationsCount: 0,
                    firstEvaluation: evaluation.patientInfo.evaluationDate,
                    lastEvaluation: evaluation.patientInfo.evaluationDate,
                    lastEvaluator: evaluation.evaluatorInfo?.name || 'N/A',
                    progress: 0
                });
            }
            
            const patient = patientsMap.get(patientName);
            patient.evaluations.push(evaluation);
            patient.evaluationsCount++;
            
            // Atualizar última avaliação
            if (new Date(evaluation.patientInfo.evaluationDate) > new Date(patient.lastEvaluation)) {
                patient.lastEvaluation = evaluation.patientInfo.evaluationDate;
                patient.lastEvaluator = evaluation.evaluatorInfo?.name || 'N/A';
            }
            
            // Atualizar primeira avaliação
            if (new Date(evaluation.patientInfo.evaluationDate) < new Date(patient.firstEvaluation)) {
                patient.firstEvaluation = evaluation.patientInfo.evaluationDate;
            }
        });
        
        // Calcular progresso
        patientsMap.forEach(patient => {
            if (patient.evaluationsCount >= 2) {
                const firstEval = patient.evaluations.find(e => e.patientInfo.evaluationDate === patient.firstEvaluation);
                const lastEval = patient.evaluations.find(e => e.patientInfo.evaluationDate === patient.lastEvaluation);
                
                if (firstEval && lastEval) {
                    const improvement = lastEval.totalScore - firstEval.totalScore;
                    const maxScore = 149 * 5;
                    patient.progress = Math.round((improvement / maxScore) * 100);
                }
            } else {
                const maxScore = 149 * 5;
                const currentScore = patient.evaluations[0]?.totalScore || 0;
                patient.progress = Math.round((currentScore / maxScore) * 100);
            }
        });
        
        return Array.from(patientsMap.values()).sort((a, b) => 
            new Date(b.lastEvaluation) - new Date(a.lastEvaluation)
        );
    }

    selectPatient(patientName) {
        this.currentPatient = patientName;
        const patientEvaluations = this.allEvaluations.filter(eval => 
            eval.patientInfo.name === patientName
        );
        
        this.showPatientDetails(patientName, patientEvaluations);
    }

    showPatientDetails(patientName, evaluations) {
        const detailsSection = document.getElementById('patient-details');
        const nameTitle = document.getElementById('patient-name-title');
        
        nameTitle.textContent = patientName;
        
        // Atualizar informações do paciente
        this.updatePatientInfo(evaluations);
        
        // Criar timeline
        this.createEvaluationsTimeline(evaluations);
        
        // Criar gráficos
        this.createPatientCharts(evaluations);
        
        detailsSection.style.display = 'block';
        detailsSection.scrollIntoView({ behavior: 'smooth' });
    }

    updatePatientInfo(evaluations) {
        const totalEvaluations = evaluations.length;
        const firstEvaluation = evaluations.reduce((first, current) => 
            new Date(current.patientInfo.evaluationDate) < new Date(first.patientInfo.evaluationDate) ? current : first
        );
        const lastEvaluation = evaluations.reduce((last, current) => 
            new Date(current.patientInfo.evaluationDate) > new Date(last.patientInfo.evaluationDate) ? current : last
        );
        
        let progress = 0;
        if (totalEvaluations >= 2) {
            const improvement = lastEvaluation.totalScore - firstEvaluation.totalScore;
            const maxScore = 149 * 5;
            progress = Math.round((improvement / maxScore) * 100);
        }
        
        document.getElementById('patient-total-evaluations').textContent = totalEvaluations;
        document.getElementById('patient-first-evaluation').textContent = this.formatDate(firstEvaluation.patientInfo.evaluationDate);
        document.getElementById('patient-last-evaluation').textContent = this.formatDate(lastEvaluation.patientInfo.evaluationDate);
        document.getElementById('patient-progress').textContent = `${progress}%`;
    }

    createEvaluationsTimeline(evaluations) {
        const timeline = document.getElementById('evaluations-timeline');
        const sortedEvaluations = evaluations.sort((a, b) => 
            new Date(b.patientInfo.evaluationDate) - new Date(a.patientInfo.evaluationDate)
        );
        
        timeline.innerHTML = sortedEvaluations.map(evaluation => `
            <div class="timeline-item">
                <div class="timeline-date">${this.formatDate(evaluation.patientInfo.evaluationDate)}</div>
                <div class="timeline-score">${evaluation.totalScore}/745 pontos</div>
                <div class="timeline-evaluator">Avaliador: ${evaluation.evaluatorInfo?.name || 'N/A'}</div>
            </div>
        `).join('');
    }

    createPatientCharts(evaluations) {
        // Implementar gráficos específicos do paciente
        this.createCategoryProgressChart(evaluations);
        this.createTemporalEvolutionChart(evaluations);
        this.populateGroupComparisonSelector();
    }

    createCategoryProgressChart(evaluations) {
        const ctx = document.getElementById('categoryProgressChart');
        if (!ctx) return;
        
        const categories = ['Habilidades Comunicativas', 'Habilidades Sociais', 'Habilidades Funcionais', 'Habilidades Emocionais'];
        const latestEvaluation = evaluations.reduce((latest, current) => 
            new Date(current.patientInfo.evaluationDate) > new Date(latest.patientInfo.evaluationDate) ? current : latest
        );
        
        const categoryScores = categories.map(category => {
            const groupsInCategory = Object.entries(this.questionGroups)
                .filter(([_, groupInfo]) => groupInfo.category === category);
            
            let totalScore = 0;
            let maxScore = 0;
            
            groupsInCategory.forEach(([groupName, groupInfo]) => {
                if (latestEvaluation.groupScores[groupName]) {
                    totalScore += latestEvaluation.groupScores[groupName].total;
                    maxScore += latestEvaluation.groupScores[groupName].max;
                }
            });
            
            return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        });
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Progresso (%)',
                    data: categoryScores,
                    backgroundColor: ['#667eea', '#48bb78', '#f093fb', '#fef9d7'],
                    borderColor: ['#5a67d8', '#38a169', '#d53f8c', '#f6e05e'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Porcentagem (%)'
                        }
                    }
                }
            }
        });
    }

    createTemporalEvolutionChart(evaluations) {
        const ctx = document.getElementById('temporalEvolutionChart');
        if (!ctx || evaluations.length < 2) return;
        
        const sortedEvaluations = evaluations.sort((a, b) => 
            new Date(a.patientInfo.evaluationDate) - new Date(b.patientInfo.evaluationDate)
        );
        
        const labels = sortedEvaluations.map(eval => this.formatDate(eval.patientInfo.evaluationDate));
        const scores = sortedEvaluations.map(eval => Math.round((eval.totalScore / 745) * 100));
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Progresso Geral (%)',
                    data: scores,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Porcentagem (%)'
                        }
                    }
                }
            }
        });
    }

    populateGroupComparisonSelector() {
        const selector = document.getElementById('group-comparison-selector');
        if (!selector) return;
        
        selector.innerHTML = '<option value="">Selecione um grupo...</option>';
        
        Object.keys(this.questionGroups).forEach(groupName => {
            const option = document.createElement('option');
            option.value = groupName;
            option.textContent = groupName;
            selector.appendChild(option);
        });
    }

    applyFilters() {
        const patientFilter = document.getElementById('patient-filter').value.toLowerCase();
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const evaluatorFilter = document.getElementById('evaluator-filter').value;
        
        this.filteredEvaluations = this.allEvaluations.filter(evaluation => {
            // Filtro por paciente
            if (patientFilter && !evaluation.patientInfo.name.toLowerCase().includes(patientFilter)) {
                return false;
            }
            
            // Filtro por data
            const evalDate = new Date(evaluation.patientInfo.evaluationDate);
            if (dateFrom && evalDate < new Date(dateFrom)) {
                return false;
            }
            if (dateTo && evalDate > new Date(dateTo)) {
                return false;
            }
            
            // Filtro por avaliador
            if (evaluatorFilter && evaluation.evaluatorInfo?.name !== evaluatorFilter) {
                return false;
            }
            
            return true;
        });
        
        this.renderPatientsList();
        this.updateStatistics();
    }

    clearFilters() {
        document.getElementById('patient-filter').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        document.getElementById('evaluator-filter').value = '';
        
        this.filteredEvaluations = [...this.allEvaluations];
        this.renderPatientsList();
        this.updateStatistics();
    }

    filterPatients(searchTerm) {
        if (!searchTerm) {
            this.applyFilters();
            return;
        }
        
        this.filteredEvaluations = this.allEvaluations.filter(evaluation =>
            evaluation.patientInfo.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderPatientsList();
    }

    closePatientDetails() {
        document.getElementById('patient-details').style.display = 'none';
        this.currentPatient = null;
    }

    exportPatientData() {
        if (!this.currentPatient) return;
        
        const patientEvaluations = this.allEvaluations.filter(eval => 
            eval.patientInfo.name === this.currentPatient
        );
        
        this.generateCSV(patientEvaluations, `dados_${this.currentPatient.replace(/\s+/g, '_')}`);
    }

    exportGeneralReport() {
        this.generateCSV(this.allEvaluations, 'relatorio_geral');
    }

    exportPeriodReport() {
        const dateFrom = document.getElementById('report-date-from').value;
        const dateTo = document.getElementById('report-date-to').value;
        
        if (!dateFrom || !dateTo) {
            alert('Selecione o período para exportação.');
            return;
        }
        
        const filteredData = this.allEvaluations.filter(eval => {
            const evalDate = new Date(eval.patientInfo.evaluationDate);
            return evalDate >= new Date(dateFrom) && evalDate <= new Date(dateTo);
        });
        
        this.generateCSV(filteredData, `relatorio_periodo_${dateFrom}_${dateTo}`);
    }

    exportEvaluatorReport() {
        const evaluator = document.getElementById('report-evaluator-selector').value;
        
        if (!evaluator) {
            alert('Selecione um avaliador.');
            return;
        }
        
        const filteredData = this.allEvaluations.filter(eval => 
            eval.evaluatorInfo?.name === evaluator
        );
        
        this.generateCSV(filteredData, `relatorio_${evaluator.replace(/\s+/g, '_')}`);
    }

    exportBackup() {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '2.0',
            evaluations: this.allEvaluations,
            statistics: {
                totalPatients: this.getUniquePatients().length,
                totalEvaluations: this.allEvaluations.length
            }
        };
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateCSV(evaluations, filename) {
        if (evaluations.length === 0) {
            alert('Nenhum dado para exportar.');
            return;
        }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Nome_Paciente,Nome_Avaliador,Email_Avaliador,Telefone_Avaliador,Data_Avaliacao,Categoria,Grupo,Numero_Questao,Descricao_Questao,Pontuacao\n";
        
        evaluations.forEach(evaluation => {
            Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
                groupInfo.questions.forEach((questionNumber, index) => {
                    const response = evaluation.responses[`q${questionNumber}`];
                    if (response) {
                        const evaluatorInfo = evaluation.evaluatorInfo || { name: '', email: '', phone: '' };
                        csvContent += `"${evaluation.patientInfo.name}","${evaluatorInfo.name}","${evaluatorInfo.email}","${evaluatorInfo.phone}","${evaluation.patientInfo.evaluationDate}","${groupInfo.category}","${groupName}",${questionNumber},"${response.question}",${response.score}\n`;
                    }
                });
            });
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generateDetailedReport() {
        if (!this.currentPatient) return;
        
        const patientEvaluations = this.allEvaluations.filter(eval => 
            eval.patientInfo.name === this.currentPatient
        );
        
        // Implementar geração de relatório detalhado
        this.showModal('Relatório Detalhado', this.createDetailedReportHTML(patientEvaluations));
    }

    createDetailedReportHTML(evaluations) {
        // Implementar HTML do relatório detalhado
        return `
            <div class="detailed-report">
                <h4>Relatório Detalhado - ${this.currentPatient}</h4>
                <p>Total de avaliações: ${evaluations.length}</p>
                <!-- Adicionar mais conteúdo do relatório -->
            </div>
        `;
    }

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('report-modal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('report-modal').style.display = 'none';
    }

    initializeQuestionGroups() {
        return {
            'Contato Visual': {
                key: 'contato-visual',
                questions: Array.from({length: 10}, (_, i) => i + 1),
                color: '#667eea',
                category: 'Habilidades Comunicativas'
            },
            'Comunicação Alternativa': {
                key: 'comunicacao-alternativa',
                questions: Array.from({length: 10}, (_, i) => i + 11),
                color: '#764ba2',
                category: 'Habilidades Comunicativas'
            },
            'Linguagem Expressiva': {
                key: 'linguagem-expressiva',
                questions: Array.from({length: 10}, (_, i) => i + 21),
                color: '#f093fb',
                category: 'Habilidades Comunicativas'
            },
            'Linguagem Receptiva': {
                key: 'linguagem-receptiva',
                questions: Array.from({length: 10}, (_, i) => i + 31),
                color: '#f5576c',
                category: 'Habilidades Comunicativas'
            },
            'Expressão Facial': {
                key: 'expressao-facial',
                questions: Array.from({length: 10}, (_, i) => i + 41),
                color: '#4facfe',
                category: 'Habilidades Sociais'
            },
            'Imitação': {
                key: 'imitacao',
                questions: Array.from({length: 10}, (_, i) => i + 51),
                color: '#00f2fe',
                category: 'Habilidades Sociais'
            },
            'Atenção Compartilhada': {
                key: 'atencao-compartilhada',
                questions: Array.from({length: 10}, (_, i) => i + 61),
                color: '#43e97b',
                category: 'Habilidades Sociais'
            },
            'Brincar': {
                key: 'brincar',
                questions: Array.from({length: 10}, (_, i) => i + 71),
                color: '#38f9d7',
                category: 'Habilidades Sociais'
            },
            'Auto Cuidado': {
                key: 'auto-cuidado',
                questions: Array.from({length: 9}, (_, i) => i + 81),
                color: '#ffecd2',
                category: 'Habilidades Funcionais'
            },
            'Vestir-se': {
                key: 'vestir-se',
                questions: Array.from({length: 10}, (_, i) => i + 90),
                color: '#fcb69f',
                category: 'Habilidades Funcionais'
            },
            'Uso do Banheiro': {
                key: 'uso-banheiro',
                questions: Array.from({length: 10}, (_, i) => i + 100),
                color: '#a8edea',
                category: 'Habilidades Funcionais'
            },
            'Controle Inibitório': {
                key: 'controle-inibitorio',
                questions: Array.from({length: 10}, (_, i) => i + 110),
                color: '#d299c2',
                category: 'Habilidades Emocionais'
            },
            'Flexibilidade': {
                key: 'flexibilidade',
                questions: Array.from({length: 10}, (_, i) => i + 120),
                color: '#fef9d7',
                category: 'Habilidades Emocionais'
            },
            'Resposta Emocional': {
                key: 'resposta-emocional',
                questions: Array.from({length: 10}, (_, i) => i + 130),
                color: '#eea2a2',
                category: 'Habilidades Emocionais'
            },
            'Empatia': {
                key: 'empatia',
                questions: Array.from({length: 10}, (_, i) => i + 140),
                color: '#bbc2ea',
                category: 'Habilidades Emocionais'
            }
        };
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showSuccess(message) {
        // Implementar notificação de sucesso
        console.log('Success:', message);
    }

    showError(message) {
        // Implementar notificação de erro
        console.error('Error:', message);
    }
}

// Inicializar dashboard quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.therapistDashboard = new TherapistDashboard();
});