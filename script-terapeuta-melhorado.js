// Script melhorado para o Painel do Terapeuta
// Sistema robusto com verificação de conexão e backup de dados
// Versão: 2.1 - Correção strict mode

// Gerenciador de Firebase melhorado para Terapeutas
class FirebaseManagerTerapeutaMelhorado {
    constructor() {
        this.db = null;
        this.auth = null;
        this.initialized = false;
        this.connectionStatus = 'checking';
        this.statusCallbacks = [];
        this.initFirebase();
    }

    async initFirebase() {
        try {
            console.log('🔄 Terapeuta: Iniciando conexão com Firebase...');
            
            // Aguardar Firebase estar disponível
            let attempts = 0;
            while ((!window.firebase || !window.firebase.initialized) && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }
            
            if (window.firebase && window.firebase.initialized) {
                this.db = window.firebase.db;
                this.auth = window.firebase.auth;
                
                // Verificar se está realmente conectado
                await this.verificarConexao();
                
                this.initialized = true;
                this.connectionStatus = 'connected';
                console.log('✅ Terapeuta: Firebase conectado com sucesso');
                this.notifyStatusChange('connected');
                
            } else {
                console.warn('⚠️ Terapeuta: Timeout esperando Firebase');
                this.connectionStatus = 'offline';
                this.initialized = false;
                this.notifyStatusChange('offline');
            }
        } catch (error) {
            console.warn('❌ Terapeuta: Firebase não disponível:', error);
            this.initialized = false;
            this.connectionStatus = 'offline';
            this.notifyStatusChange('offline');
        }
    }

    async verificarConexao() {
        try {
            const { collection, getDocs, limit, query } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Tentar fazer uma leitura simples para verificar conexão
            const testQuery = query(collection(this.db, 'evaluations'), limit(1));
            await getDocs(testQuery);
            
            return true;
        } catch (error) {
            console.warn('⚠️ Terapeuta: Erro ao verificar conexão:', error);
            if (error.code === 'permission-denied') {
                // Permissão negada não significa desconexão
                return true;
            }
            return false;
        }
    }

    onStatusChange(callback) {
        this.statusCallbacks.push(callback);
    }

    notifyStatusChange(status) {
        this.statusCallbacks.forEach(cb => cb(status));
    }

    async getAllEvaluations() {
        console.log('🔍 Terapeuta: getAllEvaluations - Status:', this.connectionStatus);
        
        let cloudData = [];
        let localData = [];

        // Tentar buscar dados do Firebase primeiro
        if (this.initialized && this.connectionStatus === 'connected') {
            try {
                console.log('☁️ Terapeuta: Buscando dados do Firebase...');
                const { getDocs, collection, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const q = query(collection(this.db, 'evaluations'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    cloudData.push({
                        id: doc.id,
                        source: 'firebase',
                        ...data
                    });
                });
                
                console.log(`✅ Terapeuta: ${cloudData.length} avaliações do Firebase`);
            } catch (error) {
                console.error('❌ Terapeuta: Erro ao buscar Firebase:', error);
                this.connectionStatus = 'error';
                this.notifyStatusChange('error');
            }
        }

        // Sempre buscar dados locais como backup
        localData = this.getLocalStorageAsArray();
        console.log(`💾 Terapeuta: ${localData.length} avaliações locais`);

        // Mesclar dados, priorizando Firebase mas mantendo dados únicos do local
        const allData = [...cloudData];
        
        // Adicionar dados locais que não estão no Firebase
        localData.forEach(localItem => {
            const existsInFirebase = cloudData.some(cloudItem => {
                return cloudItem.patientInfo?.name === localItem.patientInfo?.name &&
                       cloudItem.patientInfo?.evaluationDate === localItem.patientInfo?.evaluationDate;
            });
            
            if (!existsInFirebase) {
                allData.push({
                    ...localItem,
                    source: 'local',
                    localOnly: true
                });
            }
        });

        console.log(`📊 Terapeuta: Total consolidado: ${allData.length} avaliações`);
        return allData;
    }

    async getEvaluationsByPatient(patientName) {
        const allEvaluations = await this.getAllEvaluations();
        return allEvaluations.filter(evaluation => 
            evaluation.patientInfo?.name?.toLowerCase().includes(patientName.toLowerCase())
        );
    }

    async getEvaluationsByDateRange(startDate, endDate) {
        const allEvaluations = await this.getAllEvaluations();
        return allEvaluations.filter(evaluation => {
            const evaluationDate = new Date(evaluation.patientInfo?.evaluationDate);
            return evaluationDate >= new Date(startDate) && evaluationDate <= new Date(endDate);
        });
    }

    async deleteEvaluation(evaluationId, isLocalOnly = false) {
        let success = false;
        
        // Se tem ID do Firebase e conexão ativa, deletar do Firebase
        if (this.initialized && evaluationId && !isLocalOnly) {
            try {
                const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                await deleteDoc(doc(this.db, 'evaluations', evaluationId));
                console.log('✅ Terapeuta: Avaliação deletada do Firebase');
                success = true;
            } catch (error) {
                console.error('❌ Terapeuta: Erro ao deletar do Firebase:', error);
            }
        }

        // Se é só local ou falhou no Firebase, tentar remover do localStorage
        if (isLocalOnly || !success) {
            success = this.removeFromLocalStorage(evaluationId);
        }
        
        return success;
    }

    async syncPendingData() {
        if (!this.initialized || this.connectionStatus !== 'connected') {
            console.log('⚠️ Terapeuta: Não é possível sincronizar - Firebase offline');
            return { success: false, reason: 'Firebase offline' };
        }

        console.log('🔄 Terapeuta: Iniciando sincronização de dados pendentes...');
        
        const localData = this.getLocalStorageAsArray();
        let synced = 0;
        let errors = 0;
        
        for (const item of localData) {
            // Verificar se já existe no Firebase
            if (!item.id || item.localOnly) {
                try {
                    const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                    
                    const docData = {
                        ...item,
                        syncedAt: new Date().toISOString(),
                        syncedFrom: 'terapeuta-local'
                    };
                    
                    const docRef = await addDoc(collection(this.db, 'evaluations'), docData);
                    console.log(`✅ Terapeuta: Sincronizado ${item.patientInfo?.name} - ID: ${docRef.id}`);
                    synced++;
                } catch (error) {
                    console.error('❌ Terapeuta: Erro ao sincronizar:', error);
                    errors++;
                }
            }
        }
        
        return { success: true, synced, errors };
    }

    getLocalStorageAsArray() {
        const localData = [];
        
        // Buscar em questionnaireData (formato dos pais)
        const questionnaireData = localStorage.getItem('questionnaireData');
        if (questionnaireData) {
            try {
                const parsed = JSON.parse(questionnaireData);
                Object.values(parsed).forEach(item => {
                    localData.push({
                        ...item,
                        source: 'localStorage-questionnaire'
                    });
                });
            } catch (e) {
                console.warn('Erro ao parsear questionnaireData:', e);
            }
        }
        
        // Buscar em evaluations (formato do terapeuta)
        const evaluations = localStorage.getItem('evaluations');
        if (evaluations) {
            try {
                const parsed = JSON.parse(evaluations);
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        localData.push({
                            ...item,
                            source: 'localStorage-evaluations'
                        });
                    });
                }
            } catch (e) {
                console.warn('Erro ao parsear evaluations:', e);
            }
        }

        // Buscar backups individuais
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('backup_evaluation_')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    localData.push({
                        ...item,
                        source: 'localStorage-backup',
                        backupKey: key
                    });
                } catch (e) {
                    console.warn(`Erro ao parsear backup ${key}:`, e);
                }
            }
        }

        return localData;
    }

    removeFromLocalStorage(evaluationId) {
        try {
            // Tentar remover de diferentes estruturas do localStorage
            let removed = false;

            // Remover de questionnaireData
            const questionnaireData = localStorage.getItem('questionnaireData');
            if (questionnaireData) {
                const parsed = JSON.parse(questionnaireData);
                const originalSize = Object.keys(parsed).length;
                
                // Filtrar por ID ou critérios
                Object.keys(parsed).forEach(key => {
                    const item = parsed[key];
                    if (item.id === evaluationId) {
                        delete parsed[key];
                        removed = true;
                    }
                });
                
                if (removed) {
                    localStorage.setItem('questionnaireData', JSON.stringify(parsed));
                }
            }

            // Remover de evaluations
            const evaluations = localStorage.getItem('evaluations');
            if (evaluations) {
                const parsed = JSON.parse(evaluations);
                if (Array.isArray(parsed)) {
                    const filtered = parsed.filter(item => item.id !== evaluationId);
                    if (filtered.length !== parsed.length) {
                        localStorage.setItem('evaluations', JSON.stringify(filtered));
                        removed = true;
                    }
                }
            }

            // Remover backups específicos
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('backup_evaluation_')) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (item.id === evaluationId) {
                            localStorage.removeItem(key);
                            removed = true;
                        }
                    } catch (e) {
                        console.warn(`Erro ao verificar backup ${key}:`, e);
                    }
                }
            }

            return removed;
        } catch (error) {
            console.error('Erro ao remover do localStorage:', error);
            return false;
        }
    }

    backupToLocalStorage(data, key = null) {
        try {
            const backupKey = key || `backup_terapeuta_${Date.now()}`;
            const backupData = {
                ...data,
                backedUpAt: new Date().toISOString(),
                backupSource: 'terapeuta'
            };
            
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            console.log(`💾 Terapeuta: Backup criado - ${backupKey}`);
            return true;
        } catch (error) {
            console.error('❌ Terapeuta: Erro ao criar backup:', error);
            return false;
        }
    }

    getConnectionStatus() {
        return {
            status: this.connectionStatus,
            initialized: this.initialized,
            timestamp: new Date().toISOString()
        };
    }
}

// Classe principal do Painel do Terapeuta melhorada
class TerapeutaPanelMelhorado {
    constructor() {
        this.firebaseManager = new FirebaseManagerTerapeutaMelhorado();
        this.currentView = 'dashboard';
        this.filteredEvaluations = [];
        this.selectedEvaluations = [];
        this.autoRefreshInterval = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Terapeuta: Inicializando painel melhorado...');
        
        this.setupEventListeners();
        this.setupConnectionMonitor();
        this.setupAutoRefresh();
        this.initializeReportsManager();
        this.loadDashboard();
        
        // Aguardar Firebase e fazer primeira sincronização
        setTimeout(() => {
            this.syncPendingDataIfNeeded();
        }, 3000);
    }

    initializeReportsManager() {
        // Inicializar gerenciador de relatórios
        if (typeof ReportsManager !== 'undefined') {
            window.reportsManager = new ReportsManager();
            console.log('📊 Sistema de relatórios inicializado');
        } else {
            console.warn('⚠️ ReportsManager não encontrado');
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Search and filters
        const searchInput = document.getElementById('search-patient');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterEvaluations(e.target.value);
            });
        }

        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.applyDateFilter();
            });
        }

        // Refresh button
        const refreshButton = document.getElementById('refresh-data');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshData();
            });
        }

        // Sync button
        const syncButton = document.getElementById('sync-data');
        if (syncButton) {
            syncButton.addEventListener('click', () => {
                this.syncPendingDataIfNeeded();
            });
        }

        // Bulk actions
        const deleteSelectedButton = document.getElementById('delete-selected');
        if (deleteSelectedButton) {
            deleteSelectedButton.addEventListener('click', () => {
                this.deleteSelectedEvaluations();
            });
        }

        // Export button
        const exportButton = document.getElementById('export-data');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    setupConnectionMonitor() {
        // Monitorar status da conexão
        this.firebaseManager.onStatusChange((status) => {
            this.updateConnectionIndicator(status);
        });
        
        // Verificar conexão periodicamente
        setInterval(() => {
            this.firebaseManager.verificarConexao();
        }, 30000); // A cada 30 segundos
        
        // Monitorar conexão de internet
        window.addEventListener('online', () => {
            console.log('🌐 Terapeuta: Conexão restaurada');
            this.firebaseManager.initFirebase();
            this.showNotification('Conexão restaurada - sincronizando dados...', 'success');
            this.syncPendingDataIfNeeded();
        });
        
        window.addEventListener('offline', () => {
            console.log('📵 Terapeuta: Sem conexão');
            this.updateConnectionIndicator('offline');
            this.showNotification('Sem conexão - trabalhando offline', 'warning');
        });
    }

    setupAutoRefresh() {
        // Auto-refresh dos dados a cada 2 minutos se conectado
        this.autoRefreshInterval = setInterval(() => {
            if (this.firebaseManager.connectionStatus === 'connected') {
                this.refreshData(true); // refresh silencioso
            }
        }, 120000);
    }

    updateConnectionIndicator(status) {
        // Criar ou atualizar indicador de status
        let indicator = document.getElementById('connection-indicator-terapeuta');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-indicator-terapeuta';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
                z-index: 9999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        switch(status) {
            case 'connected':
                indicator.innerHTML = '☁️ Online';
                indicator.style.background = '#d4edda';
                indicator.style.color = '#155724';
                break;
            case 'offline':
                indicator.innerHTML = '💾 Offline';
                indicator.style.background = '#fff3cd';
                indicator.style.color = '#856404';
                break;
            case 'error':
                indicator.innerHTML = '⚠️ Erro';
                indicator.style.background = '#f8d7da';
                indicator.style.color = '#721c24';
                break;
            case 'checking':
                indicator.innerHTML = '🔄 Verificando...';
                indicator.style.background = '#d1ecf1';
                indicator.style.color = '#0c5460';
                break;
        }
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
            case 'warning':
                notification.style.background = '#fff3cd';
                notification.style.color = '#856404';
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

    async loadDashboard() {
        console.log('📊 Terapeuta: Carregando dashboard...');
        this.showLoading(true);
        
        try {
            const evaluations = await this.firebaseManager.getAllEvaluations();
            this.filteredEvaluations = evaluations;
            
            this.updateStatistics(evaluations);
            this.populateEvaluationsList(evaluations);
            this.updateLastSyncTime();
            
            // Atualizar sistema de relatórios
            if (window.reportsManager) {
                window.reportsManager.setData(evaluations);
            }
            
            console.log(`✅ Terapeuta: Dashboard carregado - ${evaluations.length} avaliações`);
        } catch (error) {
            console.error('❌ Terapeuta: Erro ao carregar dashboard:', error);
            this.showNotification('Erro ao carregar dados', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshData(silent = false) {
        if (!silent) {
            console.log('🔄 Terapeuta: Atualizando dados...');
            this.showLoading(true);
        }
        
        try {
            const evaluations = await this.firebaseManager.getAllEvaluations();
            this.filteredEvaluations = evaluations;
            
            this.updateStatistics(evaluations);
            this.populateEvaluationsList(evaluations);
            this.updateLastSyncTime();
            
            // Atualizar sistema de relatórios
            if (window.reportsManager) {
                window.reportsManager.setData(evaluations);
            }
            
            if (!silent) {
                this.showNotification('Dados atualizados', 'success');
            }
        } catch (error) {
            console.error('❌ Terapeuta: Erro ao atualizar:', error);
            if (!silent) {
                this.showNotification('Erro ao atualizar dados', 'error');
            }
        } finally {
            if (!silent) {
                this.showLoading(false);
            }
        }
    }

    async syncPendingDataIfNeeded() {
        if (this.firebaseManager.connectionStatus !== 'connected') {
            console.log('⚠️ Terapeuta: Não é possível sincronizar - offline');
            return;
        }

        console.log('🔄 Terapeuta: Verificando dados pendentes...');
        this.showNotification('Sincronizando dados pendentes...', 'info');
        
        try {
            const result = await this.firebaseManager.syncPendingData();
            
            if (result.success && result.synced > 0) {
                this.showNotification(`${result.synced} avaliação(ões) sincronizada(s)`, 'success');
                this.refreshData(true); // Refresh silencioso após sync
            } else if (result.synced === 0) {
                console.log('✅ Terapeuta: Todos os dados já estão sincronizados');
            }
            
            if (result.errors > 0) {
                this.showNotification(`${result.errors} erro(s) na sincronização`, 'warning');
            }
        } catch (error) {
            console.error('❌ Terapeuta: Erro na sincronização:', error);
            this.showNotification('Erro na sincronização', 'error');
        }
    }

    updateStatistics(evaluations) {
        // Estatísticas gerais
        const totalElement = document.getElementById('total-evaluations');
        if (totalElement) {
            totalElement.textContent = evaluations.length;
        }

        const patientsCount = new Set(evaluations.map(e => e.patientInfo?.name)).size;
        const patientsElement = document.getElementById('total-patients');
        if (patientsElement) {
            patientsElement.textContent = patientsCount;
        }

        // Dados do Firebase vs Local
        const firebaseCount = evaluations.filter(e => e.source === 'firebase').length;
        const localCount = evaluations.filter(e => e.source !== 'firebase').length;
        
        const firebaseElement = document.getElementById('firebase-count');
        if (firebaseElement) {
            firebaseElement.textContent = firebaseCount;
        }
        
        const localElement = document.getElementById('local-count');
        if (localElement) {
            localElement.textContent = localCount;
        }

        // Avaliações recentes (últimos 7 dias)
        const recentCount = evaluations.filter(e => {
            const evalDate = new Date(e.patientInfo?.evaluationDate || e.createdAt);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return evalDate >= weekAgo;
        }).length;
        
        const recentElement = document.getElementById('recent-evaluations');
        if (recentElement) {
            recentElement.textContent = recentCount;
        }
    }

    populateEvaluationsList(evaluations) {
        console.log(`👥 Terapeuta: Populando lista com ${evaluations.length} avaliações`);
        
        const listContainer = document.getElementById('patients-list');
        if (!listContainer) {
            console.error('❌ Terapeuta: Elemento patients-list não encontrado');
            return;
        }

        if (evaluations.length === 0) {
            console.log('⚠️ Terapeuta: Nenhuma avaliação para mostrar');
            listContainer.innerHTML = `
                <div class="no-data">
                    <p>📝 Nenhuma avaliação encontrada</p>
                    <p>As avaliações preenchidas pelos pais aparecerão aqui.</p>
                </div>
            `;
            return;
        }

        // Agrupar avaliações por paciente
        const patientGroups = this.groupEvaluationsByPatient(evaluations);
        console.log('👥 Terapeuta: Grupos de pacientes:', Object.keys(patientGroups));
        
        const cardsHTML = Object.values(patientGroups).map(patientGroup => this.createPatientCard(patientGroup)).join('');
        console.log(`👥 Terapeuta: Gerando ${Object.keys(patientGroups).length} cartões de pacientes`);
        
        listContainer.innerHTML = cardsHTML;
        
        // Adicionar event listeners para as ações
        this.attachCardEventListeners();
        
        console.log('✅ Terapeuta: Lista de pacientes atualizada');
    }

    groupEvaluationsByPatient(evaluations) {
        const groups = {};
        
        evaluations.forEach(evaluation => {
            const patientName = evaluation.patientInfo?.name || 'Nome não informado';
            const key = patientName.toLowerCase().trim();
            
            if (!groups[key]) {
                groups[key] = {
                    patientName: patientName,
                    evaluations: [],
                    lastEvaluation: null,
                    totalEvaluations: 0
                };
            }
            
            groups[key].evaluations.push(evaluation);
            groups[key].totalEvaluations++;
            
            // Determinar última avaliação
            const evalDate = new Date(evaluation.patientInfo?.evaluationDate || evaluation.createdAt);
            if (!groups[key].lastEvaluation || evalDate > new Date(groups[key].lastEvaluation.patientInfo?.evaluationDate || groups[key].lastEvaluation.createdAt)) {
                groups[key].lastEvaluation = evaluation;
            }
        });
        
        return groups;
    }

    createPatientCard(patientGroup) {
        const { patientName, evaluations, lastEvaluation, totalEvaluations } = patientGroup;
        const lastEvalDate = lastEvaluation?.patientInfo?.evaluationDate || lastEvaluation?.createdAt;
        const formattedDate = lastEvalDate ? new Date(lastEvalDate).toLocaleDateString('pt-BR') : 'Não informado';
        
        // Calcular pontuação média das últimas avaliações
        const avgScore = this.calculateAverageScore(evaluations);
        
        // Determinar fonte dos dados (Firebase ou Local)
        const hasCloudData = evaluations.some(e => e.source === 'firebase');
        const hasLocalData = evaluations.some(e => e.source !== 'firebase');
        
        let sourceIndicator = '';
        if (hasCloudData && hasLocalData) {
            sourceIndicator = '☁️💾';
        } else if (hasCloudData) {
            sourceIndicator = '☁️';
        } else {
            sourceIndicator = '💾';
        }
        
        return `
            <div class="patient-card" data-patient="${patientName}">
                <div class="patient-header">
                    <div class="patient-info">
                        <h3 class="patient-name">${patientName} ${sourceIndicator}</h3>
                        <p class="patient-stats">${totalEvaluations} avaliação${totalEvaluations > 1 ? 'ões' : ''}</p>
                    </div>
                    <div class="patient-actions">
                        <button class="btn-view-patient" data-patient="${patientName}">
                            👁️ Ver Detalhes
                        </button>
                    </div>
                </div>
                <div class="patient-summary">
                    <div class="summary-item">
                        <label>Última Avaliação:</label>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="summary-item">
                        <label>Pontuação Média:</label>
                        <span class="score-badge ${this.getScoreClass(avgScore)}">${avgScore.toFixed(1)}</span>
                    </div>
                    <div class="summary-item">
                        <label>Avaliador:</label>
                        <span>${lastEvaluation?.evaluatorInfo?.name || 'Não informado'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    calculateAverageScore(evaluations) {
        if (!evaluations || evaluations.length === 0) return 0;
        
        let totalScore = 0;
        let validEvaluations = 0;
        
        evaluations.forEach(evaluation => {
            if (evaluation.responses) {
                const scores = Object.values(evaluation.responses).filter(score => typeof score === 'number');
                if (scores.length > 0) {
                    const evalAvg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                    totalScore += evalAvg;
                    validEvaluations++;
                }
            }
        });
        
        return validEvaluations > 0 ? totalScore / validEvaluations : 0;
    }

    getScoreClass(score) {
        if (score >= 4) return 'high-score';
        if (score >= 3) return 'medium-score';
        if (score >= 2) return 'low-score';
        return 'very-low-score';
    }

    attachCardEventListeners() {
        // Event listeners para botões de ver detalhes do paciente
        document.querySelectorAll('.btn-view-patient').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientName = e.target.dataset.patient;
                this.showPatientDetails(patientName);
            });
        });
    }

    async showPatientDetails(patientName) {
        console.log(`👤 Terapeuta: Mostrando detalhes do paciente: ${patientName}`);
        
        try {
            const patientEvaluations = await this.firebaseManager.getEvaluationsByPatient(patientName);
            
            if (patientEvaluations.length === 0) {
                this.showNotification('Nenhuma avaliação encontrada para este paciente', 'warning');
                return;
            }

            // Atualizar seção de detalhes do paciente
            const detailsSection = document.getElementById('patient-details');
            const patientNameTitle = document.getElementById('patient-name-title');
            const patientTotalEvaluations = document.getElementById('patient-total-evaluations');
            const patientFirstEvaluation = document.getElementById('patient-first-evaluation');
            const patientLastEvaluation = document.getElementById('patient-last-evaluation');
            const patientProgress = document.getElementById('patient-progress');
            const evaluationsTimeline = document.getElementById('evaluations-timeline');

            if (detailsSection && patientNameTitle) {
                patientNameTitle.textContent = patientName;
                
                // Calcular estatísticas do paciente
                const sortedEvaluations = patientEvaluations.sort((a, b) => 
                    new Date(a.patientInfo?.evaluationDate || a.createdAt) - 
                    new Date(b.patientInfo?.evaluationDate || b.createdAt)
                );
                
                const firstEval = sortedEvaluations[0];
                const lastEval = sortedEvaluations[sortedEvaluations.length - 1];
                
                const firstDate = firstEval?.patientInfo?.evaluationDate || firstEval?.createdAt;
                const lastDate = lastEval?.patientInfo?.evaluationDate || lastEval?.createdAt;
                
                if (patientTotalEvaluations) patientTotalEvaluations.textContent = patientEvaluations.length;
                if (patientFirstEvaluation) patientFirstEvaluation.textContent = firstDate ? new Date(firstDate).toLocaleDateString('pt-BR') : 'N/A';
                if (patientLastEvaluation) patientLastEvaluation.textContent = lastDate ? new Date(lastDate).toLocaleDateString('pt-BR') : 'N/A';
                
                // Calcular progresso geral
                const firstScore = this.calculateAverageScore([firstEval]);
                const lastScore = this.calculateAverageScore([lastEval]);
                const progressIndicator = lastScore > firstScore ? '📈 Melhoria' : lastScore < firstScore ? '📉 Declínio' : '➡️ Estável';
                if (patientProgress) patientProgress.textContent = progressIndicator;
                
                // Preencher timeline de avaliações
                if (evaluationsTimeline) {
                    evaluationsTimeline.innerHTML = sortedEvaluations.map(evaluation => `
                        <div class="timeline-item" data-source="${evaluation.source}">
                            <div class="timeline-date">${new Date(evaluation.patientInfo?.evaluationDate || evaluation.createdAt).toLocaleDateString('pt-BR')}</div>
                            <div class="timeline-content">
                                <div class="timeline-evaluator">Avaliador: ${evaluation.evaluatorInfo?.name || 'Não informado'}</div>
                                <div class="timeline-score">Pontuação: ${this.calculateAverageScore([evaluation]).toFixed(1)}</div>
                                <div class="timeline-source">${evaluation.source === 'firebase' ? '☁️ Nuvem' : '💾 Local'}</div>
                            </div>
                        </div>
                    `).join('');
                }
                
                // Mostrar seção de detalhes
                detailsSection.style.display = 'block';
                detailsSection.scrollIntoView({ behavior: 'smooth' });
                
                // Gerar gráficos do paciente
                this.generatePatientCharts(patientEvaluations);
            }
        } catch (error) {
            console.error('❌ Terapeuta: Erro ao mostrar detalhes:', error);
            this.showNotification('Erro ao carregar detalhes do paciente', 'error');
        }
    }

    createEvaluationCard(evaluation) {
        const isLocal = evaluation.source !== 'firebase';
        const patientName = evaluation.patientInfo?.name || 'Nome não disponível';
        const evaluationDate = evaluation.patientInfo?.evaluationDate || evaluation.createdAt;
        const evaluatorName = evaluation.evaluatorInfo?.name || 'N/A';
        const totalScore = evaluation.totalScore || 'N/A';
        
        const sourceIcon = isLocal ? '💾' : '☁️';
        const sourceLabel = isLocal ? 'Local' : 'Nuvem';
        const sourceClass = isLocal ? 'local-data' : 'cloud-data';
        
        return `
            <div class="evaluation-card ${sourceClass}" data-id="${evaluation.id || evaluation.timestamp}">
                <div class="card-header">
                    <div class="patient-info">
                        <h3>${patientName}</h3>
                        <span class="evaluation-date">${new Date(evaluationDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="card-actions">
                        <span class="source-indicator" title="Fonte dos dados">${sourceIcon} ${sourceLabel}</span>
                        <button class="btn-icon" onclick="window.terapeutaPanel.viewEvaluation('${evaluation.id || evaluation.timestamp}')" title="Ver detalhes">
                            👁️
                        </button>
                        <button class="btn-icon" onclick="window.terapeutaPanel.generateReport('${evaluation.id || evaluation.timestamp}')" title="Gerar relatório">
                            📊
                        </button>
                        <button class="btn-icon delete" onclick="window.terapeutaPanel.deleteEvaluation('${evaluation.id || evaluation.timestamp}', ${isLocal})" title="Excluir">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="evaluation-details">
                        <div class="detail-item">
                            <span class="label">Responsável:</span>
                            <span class="value">${evaluatorName}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Pontuação Total:</span>
                            <span class="value">${totalScore}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">Questões:</span>
                            <span class="value">${Object.keys(evaluation.responses || {}).length}</span>
                        </div>
                    </div>
                    
                    ${evaluation.localOnly ? '<div class="warning-banner">⚠️ Dados apenas locais - sincronização necessária</div>' : ''}
                </div>
            </div>
        `;
    }

    attachCardEventListeners() {
        // Implementar event listeners específicos se necessário
        // Por enquanto, usando onclick inline para simplicidade
    }

    async viewEvaluation(evaluationId) {
        console.log('👁️ Terapeuta: Visualizando avaliação:', evaluationId);
        
        const evaluation = this.filteredEvaluations.find(e => 
            (e.id && e.id === evaluationId) || e.timestamp === evaluationId
        );
        
        if (!evaluation) {
            this.showNotification('Avaliação não encontrada', 'error');
            return;
        }
        
        // Implementar modal ou página de detalhes
        this.showEvaluationDetails(evaluation);
    }

    showEvaluationDetails(evaluation) {
        // Criar modal com detalhes da avaliação
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>📋 Detalhes da Avaliação</h2>
                    <button class="close-modal" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="patient-summary">
                        <h3>Informações do Paciente</h3>
                        <p><strong>Nome:</strong> ${evaluation.patientInfo?.name || 'N/A'}</p>
                        <p><strong>Data da Avaliação:</strong> ${new Date(evaluation.patientInfo?.evaluationDate).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Responsável:</strong> ${evaluation.evaluatorInfo?.name || 'N/A'}</p>
                        <p><strong>Email:</strong> ${evaluation.evaluatorInfo?.email || 'N/A'}</p>
                        <p><strong>Telefone:</strong> ${evaluation.evaluatorInfo?.phone || 'N/A'}</p>
                    </div>
                    
                    <div class="scores-summary">
                        <h3>Resumo das Pontuações</h3>
                        <p><strong>Pontuação Total:</strong> ${evaluation.totalScore || 'N/A'}</p>
                        ${this.generateScoresSummary(evaluation.groupScores)}
                    </div>
                    
                    <div class="responses-detail">
                        <h3>Respostas Detalhadas</h3>
                        ${this.generateResponsesDetail(evaluation.responses)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="window.terapeutaPanel.generateReport('${evaluation.id || evaluation.timestamp}')" class="btn-primary">📊 Gerar Relatório</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-secondary">Fechar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    generateScoresSummary(groupScores) {
        if (!groupScores) return '<p>Dados de pontuação não disponíveis</p>';
        
        return Object.entries(groupScores).map(([group, data]) => `
            <div class="score-item">
                <span class="group-name">${group}:</span>
                <span class="score-value">${data.total}/${data.max} (${data.percentage}%)</span>
                <div class="score-bar">
                    <div class="score-fill" style="width: ${data.percentage}%"></div>
                </div>
            </div>
        `).join('');
    }

    generateResponsesDetail(responses) {
        if (!responses) return '<p>Respostas não disponíveis</p>';
        
        return Object.entries(responses).map(([questionId, response]) => `
            <div class="response-item">
                <div class="question-id">Questão ${questionId.replace('q', '')}:</div>
                <div class="question-text">${response.question}</div>
                <div class="response-score">Pontuação: ${response.score}/5</div>
            </div>
        `).join('');
    }

    async deleteEvaluation(evaluationId, isLocalOnly = false) {
        const evaluation = this.filteredEvaluations.find(e => 
            (e.id && e.id === evaluationId) || e.timestamp === evaluationId
        );
        
        if (!evaluation) {
            this.showNotification('Avaliação não encontrada', 'error');
            return;
        }
        
        const patientName = evaluation.patientInfo?.name || 'Paciente';
        const confirmMessage = `Tem certeza que deseja excluir a avaliação de "${patientName}"?\n\nEsta ação não pode ser desfeita.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        this.showLoading(true);
        
        try {
            const success = await this.firebaseManager.deleteEvaluation(evaluationId, isLocalOnly);
            
            if (success) {
                this.showNotification('Avaliação excluída com sucesso', 'success');
                this.refreshData();
            } else {
                this.showNotification('Erro ao excluir avaliação', 'error');
            }
        } catch (error) {
            console.error('❌ Terapeuta: Erro ao excluir:', error);
            this.showNotification('Erro ao excluir avaliação', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateReport(evaluationId) {
        console.log('📊 Terapeuta: Gerando relatório:', evaluationId);
        
        const evaluation = this.filteredEvaluations.find(e => 
            (e.id && e.id === evaluationId) || e.timestamp === evaluationId
        );
        
        if (!evaluation) {
            this.showNotification('Avaliação não encontrada', 'error');
            return;
        }
        
        // Implementar geração de relatório
        this.showNotification('Funcionalidade de relatório em desenvolvimento', 'info');
    }

    filterEvaluations(searchTerm) {
        const allEvaluations = this.filteredEvaluations;
        
        if (!searchTerm.trim()) {
            this.populateEvaluationsList(allEvaluations);
            return;
        }
        
        const filtered = allEvaluations.filter(evaluation => {
            const patientName = evaluation.patientInfo?.name?.toLowerCase() || '';
            const evaluatorName = evaluation.evaluatorInfo?.name?.toLowerCase() || '';
            const searchLower = searchTerm.toLowerCase();
            
            return patientName.includes(searchLower) || evaluatorName.includes(searchLower);
        });
        
        this.populateEvaluationsList(filtered);
    }

    showLoading(show) {
        let loading = document.getElementById('loading-overlay');
        
        if (show) {
            if (!loading) {
                loading = document.createElement('div');
                loading.id = 'loading-overlay';
                loading.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Carregando...</p>
                    </div>
                `;
                loading.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                `;
                document.body.appendChild(loading);
            }
        } else {
            if (loading) {
                loading.remove();
            }
        }
    }

    updateLastSyncTime() {
        const syncTimeElement = document.getElementById('last-sync-time');
        if (syncTimeElement) {
            syncTimeElement.textContent = new Date().toLocaleString('pt-BR');
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Atualizar botões de navegação
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Mostrar conteúdo apropriado
        document.querySelectorAll('.view-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`${view}-view`).style.display = 'block';
        
        // Carregar dados específicos da view se necessário
        switch(view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'reports':
                // Implementar carregamento de relatórios
                break;
            case 'settings':
                // Implementar configurações
                break;
        }
    }

    exportData() {
        const data = {
            evaluations: this.filteredEvaluations,
            exportedAt: new Date().toISOString(),
            totalCount: this.filteredEvaluations.length,
            connectionStatus: this.firebaseManager.getConnectionStatus()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `avaliações-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Dados exportados com sucesso', 'success');
    }
}

// Adicionar estilos para o terapeuta melhorado
const terapeutaStyle = document.createElement('style');
terapeutaStyle.textContent = `
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    }
    
    .modal-content {
        background: white;
        border-radius: 10px;
        max-width: 90%;
        max-height: 90%;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    
    .modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .modal-body {
        padding: 20px;
    }
    
    .modal-footer {
        padding: 20px;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }
    
    .close-modal {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
    }
    
    .evaluation-card {
        border: 1px solid #ddd;
        border-radius: 8px;
        margin: 10px 0;
        overflow: hidden;
        transition: box-shadow 0.3s ease;
    }
    
    .evaluation-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .evaluation-card.local-data {
        border-left: 4px solid #ffc107;
    }
    
    .evaluation-card.cloud-data {
        border-left: 4px solid #28a745;
    }
    
    .card-header {
        background: #f8f9fa;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .card-body {
        padding: 15px;
    }
    
    .card-actions {
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .source-indicator {
        background: #e9ecef;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .btn-icon {
        background: none;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
        transition: background 0.3s ease;
    }
    
    .btn-icon:hover {
        background: #f8f9fa;
    }
    
    .btn-icon.delete:hover {
        background: #f8d7da;
        color: #721c24;
    }
    
    .evaluation-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
    }
    
    .detail-item {
        display: flex;
        justify-content: space-between;
    }
    
    .detail-item .label {
        font-weight: bold;
        color: #666;
    }
    
    .warning-banner {
        background: #fff3cd;
        color: #856404;
        padding: 8px 12px;
        border-radius: 4px;
        margin-top: 10px;
        font-size: 14px;
    }
    
    .no-data {
        text-align: center;
        padding: 40px;
        color: #666;
    }
    
    .score-item {
        margin: 10px 0;
    }
    
    .score-bar {
        background: #e9ecef;
        height: 8px;
        border-radius: 4px;
        margin-top: 4px;
        overflow: hidden;
    }
    
    .score-fill {
        height: 100%;
        background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
        transition: width 0.3s ease;
    }
    
    .response-item {
        border-bottom: 1px solid #eee;
        padding: 10px 0;
    }
    
    .response-item:last-child {
        border-bottom: none;
    }
    
    .question-id {
        font-weight: bold;
        color: #007bff;
    }
    
    .question-text {
        margin: 5px 0;
        color: #333;
    }
    
    .response-score {
        color: #666;
        font-size: 14px;
    }
    
    .loading-spinner {
        text-align: center;
        color: white;
    }
    
    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    /* Estilos para cartões de pacientes */
    .patient-card {
        background: white;
        border-radius: 10px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        border: 1px solid #e0e0e0;
        transition: all 0.3s ease;
    }

    .patient-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .patient-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #f0f0f0;
    }

    .patient-name {
        font-size: 1.3rem;
        font-weight: bold;
        color: #2c3e50;
        margin: 0;
    }

    .patient-stats {
        color: #7f8c8d;
        margin: 0.25rem 0 0 0;
        font-size: 0.9rem;
    }

    .btn-view-patient {
        background: #3498db;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.3s ease;
    }

    .btn-view-patient:hover {
        background: #2980b9;
    }

    .patient-summary {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    .summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
    }

    .summary-item label {
        font-weight: 500;
        color: #555;
    }

    .summary-item span {
        font-weight: 600;
        color: #2c3e50;
    }

    .score-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        color: white;
        font-weight: bold;
        font-size: 0.85rem;
    }

    .high-score {
        background: #27ae60;
    }

    .medium-score {
        background: #f39c12;
    }

    .low-score {
        background: #e67e22;
    }

    .very-low-score {
        background: #e74c3c;
    }

    .no-data {
        text-align: center;
        padding: 3rem 1rem;
        color: #7f8c8d;
        background: #f8f9fa;
        border-radius: 10px;
        border: 2px dashed #bdc3c7;
    }

    .no-data p {
        margin: 0.5rem 0;
    }

    /* Timeline styles */
    .timeline-item {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        border-left: 4px solid #3498db;
        position: relative;
    }

    .timeline-item[data-source="firebase"] {
        border-left-color: #27ae60;
    }

    .timeline-item[data-source="local"] {
        border-left-color: #f39c12;
    }

    .timeline-date {
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 0.5rem;
    }

    .timeline-content {
        display: grid;
        gap: 0.25rem;
        font-size: 0.9rem;
        color: #555;
    }

    .timeline-source {
        font-size: 0.8rem;
        font-weight: 500;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .patient-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
        }

        .patient-actions {
            align-self: stretch;
        }

        .btn-view-patient {
            width: 100%;
        }

        .summary-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
        }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(terapeutaStyle);

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Terapeuta: Inicializando painel melhorado...');
    window.terapeutaPanel = new TerapeutaPanelMelhorado();
});

// Exportar classes para uso global
window.FirebaseManagerTerapeutaMelhorado = FirebaseManagerTerapeutaMelhorado;
window.TerapeutaPanelMelhorado = TerapeutaPanelMelhorado;