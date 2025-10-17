import { attachAnalyticsModule } from './modules/analytics-module.js';
import { ui } from './modules/ui.js';

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

        // Tentar buscar dados do Firebase primeiro (sem depender do connectionStatus)
        if (this.initialized && this.db) {
            try {
                console.log('☁️ Terapeuta: Buscando dados do Firebase...');
                const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

                // Buscar TODOS os documentos sem orderBy para pegar também os que não têm createdAt
                const querySnapshot = await getDocs(collection(this.db, 'evaluations'));

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    cloudData.push({
                        id: doc.id,
                        source: 'firebase',
                        ...data
                    });
                });

                // Ordenar manualmente por createdAt/updatedAt
                cloudData.sort((a, b) => {
                    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                    return dateB - dateA;
                });

                console.log(`✅ Terapeuta: ${cloudData.length} avaliações do Firebase`);

                // Marcar como conectado se conseguimos buscar dados
                if (this.connectionStatus !== 'connected') {
                    this.connectionStatus = 'connected';
                    this.notifyStatusChange('connected');
                }
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

        console.log('🔄 Terapeuta: Iniciando sincronização MELHORADA de dados pendentes...');
        
        // MELHORIA: Buscar dados do Firebase primeiro para comparação robusta
        const cloudData = await this.getFirebaseData();
        const localData = this.getLocalStorageAsArray();
        
        console.log(`📊 Dados: ${cloudData.length} no Firebase, ${localData.length} locais`);
        
        let synced = 0;
        let errors = 0;
        let skipped = 0;
        
        for (const localItem of localData) {
            // MELHORIA: Verificação mais robusta de duplicados
            const isDuplicate = await this.checkIfExistsInFirebase(localItem, cloudData);
            
            if (isDuplicate) {
                console.log(`⏭️ Pulando ${localItem.patientInfo?.name} - já existe no Firebase`);
                skipped++;
                continue;
            }
            
            try {
                const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                // MELHORIA: Limpar dados antes do envio
                const cleanedData = this.cleanDataForSync(localItem);
                const evaluationId = cleanedData.evaluationId || this.generateEvaluationIdFromData(cleanedData);
                const docRef = doc(this.db, 'evaluations', evaluationId);
                const existing = await getDoc(docRef);
                const createdAt = existing.exists() ? (existing.data()?.createdAt || cleanedData.createdAt || new Date().toISOString()) : (cleanedData.createdAt || new Date().toISOString());
                const payload = {
                    ...cleanedData,
                    createdAt,
                    updatedAt: new Date().toISOString(),
                    evaluationId
                };
                
                await setDoc(docRef, payload, { merge: true });
                console.log(`✅ Sincronizado: ${localItem.patientInfo?.name} - ID: ${evaluationId}`);
                synced++;
                
                // MELHORIA: Marcar como sincronizado no localStorage
                this.markAsSynced(localItem, evaluationId);
                
            } catch (error) {
                console.error('❌ Erro ao sincronizar:', error);
                errors++;
            }
        }
        
        console.log(`✅ Sincronização completa: ${synced} enviados, ${skipped} pulados, ${errors} erros`);
        return { success: true, synced, errors, skipped };
    }

    getLocalStorageAsArray() {
        const localData = [];
        const seenItems = new Set(); // Evitar duplicados
        
        console.log('🔍 Escaneando localStorage para dados...');
        
        // Buscar em questionnaireData (formato dos pais)
        const questionnaireData = localStorage.getItem('questionnaireData');
        if (questionnaireData) {
            try {
                const parsed = JSON.parse(questionnaireData);
                Object.values(parsed).forEach(item => {
                    const key = this.generateItemKey(item);
                    if (!seenItems.has(key)) {
                        localData.push({
                            ...item,
                            source: 'localStorage-questionnaire'
                        });
                        seenItems.add(key);
                    }
                });
                console.log(`💾 Encontrados ${Object.keys(parsed).length} itens em questionnaireData`);
            } catch (e) {
                console.warn('❌ Erro ao parsear questionnaireData:', e);
            }
        }
        
        // Buscar em evaluations (formato do terapeuta)
        const evaluations = localStorage.getItem('evaluations');
        if (evaluations) {
            try {
                const parsed = JSON.parse(evaluations);
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        const key = this.generateItemKey(item);
                        if (!seenItems.has(key)) {
                            localData.push({
                                ...item,
                                source: 'localStorage-evaluations'
                            });
                            seenItems.add(key);
                        }
                    });
                }
                console.log(`💾 Encontrados ${parsed.length} itens em evaluations`);
            } catch (e) {
                console.warn('❌ Erro ao parsear evaluations:', e);
            }
        }

        // Buscar backups individuais e outros padrões
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('backup_evaluation_') || 
                key.startsWith('evaluation_') || 
                key.startsWith('patient_')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item && item.patientInfo) {
                        const itemKey = this.generateItemKey(item);
                        if (!seenItems.has(itemKey)) {
                            localData.push({
                                ...item,
                                source: 'localStorage-backup',
                                backupKey: key
                            });
                            seenItems.add(itemKey);
                        }
                    }
                } catch (e) {
                    console.warn(`❌ Erro ao parsear ${key}:`, e);
                }
            }
        }

        console.log(`📊 Total de ${localData.length} itens únicos encontrados no localStorage`);
        return localData;
    }

    // NOVOS MÉTODOS AUXILIARES PARA SINCRONIZAÇÃO MELHORADA
    generateItemKey(item) {
        // Gerar chave única para identificar itens
        const name = item.patientInfo?.name || 'unknown';
        const date = item.patientInfo?.evaluationDate || item.createdAt || Date.now();
        const responses = JSON.stringify(item.responses || {});
        return `${name}_${date}_${responses.slice(0, 50)}`;
    }

    generateEvaluationIdFromData(item) {
        const name = (item.patientInfo?.name || 'avaliacao')
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        const evaluationDate = item.patientInfo?.evaluationDate ||
            item.evaluationDate ||
            (item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : null) ||
            new Date().toISOString().split('T')[0];

        // Adicionar timestamp para evitar colisões quando houver múltiplas avaliações no mesmo dia
        const timestamp = item.createdAt || item.timestamp || new Date().toISOString();
        const timestampHash = timestamp.replace(/[^0-9]/g, '').slice(0, 10); // Usar apenas números do timestamp

        return `${name}_${evaluationDate}_${timestampHash}`;
    }

    generatePatientId(name) {
        return (name || 'avaliacao')
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
    }

    async deduplicateEvaluations() {
        if (!this.initialized || this.connectionStatus !== 'connected') {
            throw new Error('Firebase offline');
        }

        console.log('🧹 Iniciando deduplicação de avaliações no Firebase...');

        const { getDocs, collection, deleteDoc, doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const snapshot = await getDocs(collection(this.db, 'evaluations'));

        // Agrupar por nome do paciente + data de avaliação (sem timestamp)
        // Isso identifica avaliações duplicadas do mesmo paciente no mesmo dia
        const groups = new Map();
        snapshot.forEach((docSnap) => {
            const data = docSnap.data() || {};

            // Gerar chave de comparação: nome + data (sem timestamp)
            const name = (data.patientInfo?.name || 'avaliacao')
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '');

            const evaluationDate = data.patientInfo?.evaluationDate ||
                data.evaluationDate ||
                (data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : null) ||
                new Date().toISOString().split('T')[0];

            const comparisonKey = `${name}_${evaluationDate}`;

            if (!groups.has(comparisonKey)) {
                groups.set(comparisonKey, []);
            }
            groups.get(comparisonKey).push({
                docId: docSnap.id,
                data
            });
        });

        let consolidated = 0;
        let deleted = 0;
        const nowIso = new Date().toISOString();

        for (const [comparisonKey, documents] of groups.entries()) {
            if (!documents || documents.length <= 1) continue; // Não há duplicatas

            console.log(`🔍 Encontradas ${documents.length} duplicatas para ${comparisonKey}`);

            // Ordenar mantendo o registro mais recente por updatedAt ou createdAt
            const sorted = documents.sort((a, b) => {
                const dateA = new Date(a.data.updatedAt || a.data.createdAt || 0).getTime();
                const dateB = new Date(b.data.updatedAt || b.data.createdAt || 0).getTime();
                return dateB - dateA;
            });

            // Manter o primeiro (mais recente) e deletar o resto
            const primary = sorted[0];

            // Gerar novo evaluationId único com timestamp
            const newEvaluationId = this.generateEvaluationIdFromData(primary.data);

            const payload = {
                ...primary.data,
                evaluationId: newEvaluationId,
                patientId: primary.data.patientId || this.generatePatientId(primary.data.patientInfo?.name),
                createdAt: primary.data.createdAt || nowIso,
                updatedAt: nowIso,
                deduplicatedAt: nowIso
            };

            // Salvar o registro consolidado
            await setDoc(doc(this.db, 'evaluations', newEvaluationId), payload);
            consolidated++;
            console.log(`✅ Consolidado: ${newEvaluationId}`);

            // Deletar todos os registros antigos (incluindo o primário se o ID mudou)
            for (const entry of sorted) {
                try {
                    await deleteDoc(doc(this.db, 'evaluations', entry.docId));
                    deleted++;
                    console.log(`🗑️ Removido: ${entry.docId}`);
                } catch (error) {
                    console.warn(`⚠️ Erro ao deletar ${entry.docId}:`, error);
                }
            }
        }

        console.log(`🧹 Deduplicação concluída: ${consolidated} registros consolidados, ${deleted} duplicatas removidas.`);
        return {
            consolidated,
            removed: deleted,
            totalDocuments: snapshot.size,
            uniqueEvaluations: groups.size
        };
    }

    async getFirebaseData() {
        try {
            const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Buscar TODOS os documentos sem orderBy
            const querySnapshot = await getDocs(collection(this.db, 'evaluations'));

            const cloudData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const evaluationId = data.evaluationId || this.generateEvaluationIdFromData(data);
                cloudData.push({
                    id: doc.id,
                    ...data,
                    evaluationId
                });
            });

            // Ordenar manualmente por createdAt/updatedAt
            cloudData.sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            return cloudData;
        } catch (error) {
            console.warn('⚠️ Erro ao buscar dados do Firebase:', error);
            return [];
        }
    }

    async checkIfExistsInFirebase(localItem, cloudData) {
        // Verificação robusta de existência
        const evaluationId = localItem.evaluationId || this.generateEvaluationIdFromData(localItem);
        if (evaluationId) {
            const existsById = cloudData.some(cloudItem => {
                const cloudEvalId = cloudItem.evaluationId || this.generateEvaluationIdFromData(cloudItem);
                return cloudEvalId === evaluationId;
            });
            if (existsById) {
                return true;
            }
        }

        const itemKey = this.generateItemKey(localItem);
        
        return cloudData.some(cloudItem => {
            const cloudKey = this.generateItemKey(cloudItem);
            return cloudKey === itemKey;
        });
    }

    cleanDataForSync(localItem) {
        // Limpar dados antes de enviar para Firebase
        const evaluationId = localItem.evaluationId || this.generateEvaluationIdFromData(localItem);
        const cleaned = {
            patientInfo: localItem.patientInfo,
            evaluatorInfo: localItem.evaluatorInfo,
            responses: localItem.responses,
            groupScores: localItem.groupScores,
            totalScore: localItem.totalScore,
            createdAt: localItem.createdAt || new Date().toISOString(),
            syncedAt: new Date().toISOString(),
            syncedFrom: 'terapeuta-local-improved',
            evaluationId
        };
        
        // Remover propriedades desnecessárias
        delete cleaned.source;
        delete cleaned.localOnly;
        delete cleaned.backupKey;
        delete cleaned.id; // Firebase gerará novo ID
        
        return cleaned;
    }

    markAsSynced(localItem, firebaseId) {
        // Marcar item como sincronizado no localStorage
        try {
            if (localItem.backupKey) {
                const updated = {
                    ...localItem,
                    syncedToFirebase: true,
                    firebaseId: firebaseId,
                    syncedAt: new Date().toISOString()
                };
                localStorage.setItem(localItem.backupKey, JSON.stringify(updated));
            }
        } catch (error) {
            console.warn('⚠️ Erro ao marcar como sincronizado:', error);
        }
    }

    // MÉTODO PARA SINCRONIZAÇÃO FORÇADA MANUAL
    async forceSyncAllLocalData() {
        console.log('🚀 SINCRONIZAÇÃO FORÇADA: Enviando TODOS os dados locais...');
        
        if (!this.initialized || this.connectionStatus !== 'connected') {
            throw new Error('Firebase não conectado');
        }
        
        const localData = this.getLocalStorageAsArray();
        let synced = 0;
        let errors = 0;
        
        for (const localItem of localData) {
            try {
                const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const cleanedData = {
                    ...this.cleanDataForSync(localItem),
                    forceSynced: true,
                    forceSyncAt: new Date().toISOString()
                };
                
                const evaluationId = cleanedData.evaluationId || this.generateEvaluationIdFromData(cleanedData);
                const docRef = doc(this.db, 'evaluations', evaluationId);
                const existing = await getDoc(docRef);
                const createdAt = existing.exists() ? (existing.data()?.createdAt || cleanedData.createdAt || new Date().toISOString()) : (cleanedData.createdAt || new Date().toISOString());
                
                await setDoc(docRef, {
                    ...cleanedData,
                    createdAt,
                    updatedAt: new Date().toISOString(),
                    evaluationId
                }, { merge: true });
                console.log(`🚀 FORÇADO: ${localItem.patientInfo?.name} - ID: ${evaluationId}`);
                synced++;
                
                this.markAsSynced(localItem, evaluationId);
                
            } catch (error) {
                console.error('❌ Erro na sincronização forçada:', error);
                errors++;
            }
        }
        
        return { synced, errors, total: localData.length };
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
        this.lastReportDataUpdate = null;
        this.analyticsControls = null;
        this.evaluationIndex = new Map();
        this.evaluationsByPatient = new Map();
        this.sortedPatients = [];
        this.selectedEvaluationId = null;
        this.currentDuplicateIds = new Set();
        this.questionDescriptionsCache = null;
        this.questionMetadataCache = null;
        this.categoryStructureCache = null;
        this.currentPdiResults = [];
        this.currentPdiEvaluation = null;
        this.pdiControls = null;
        this.runDeduplication = this.runDeduplication.bind(this);

        this.init();
    }

    async init() {
        console.log('🚀 Terapeuta: Inicializando painel melhorado...');
        
        this.setupEventListeners();
        this.setupAnalyticsControls();
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

        // Force sync button
        const forceSyncButton = document.getElementById('force-sync-data');
        if (forceSyncButton) {
            forceSyncButton.addEventListener('click', () => {
                this.forceSyncAllData();
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

        const deduplicateButton = document.getElementById('deduplicate-data');
        if (deduplicateButton) {
            deduplicateButton.addEventListener('click', () => {
                this.runDeduplication();
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
        
        let badgeState = { state: 'warning', label: 'Verificando...' };
        switch(status) {
            case 'connected':
                indicator.innerHTML = '☁️ Online';
                indicator.style.background = '#d4edda';
                indicator.style.color = '#155724';
                badgeState = { state: 'online', label: 'Online' };
                break;
            case 'offline':
                indicator.innerHTML = '💾 Offline';
                indicator.style.background = '#fff3cd';
                indicator.style.color = '#856404';
                badgeState = { state: 'offline', label: 'Offline' };
                break;
            case 'error':
                indicator.innerHTML = '⚠️ Erro';
                indicator.style.background = '#f8d7da';
                indicator.style.color = '#721c24';
                badgeState = { state: 'warning', label: 'Erro' };
                break;
            case 'checking':
                indicator.innerHTML = '🔄 Verificando...';
                indicator.style.background = '#d1ecf1';
                indicator.style.color = '#0c5460';
                badgeState = { state: 'warning', label: 'Verificando...' };
                break;
            default:
                badgeState = { state: 'default', label: '—' };
        }

        const connectionBadge = document.getElementById('insight-connection-status');
        if (connectionBadge) {
            connectionBadge.dataset.defaultLabel = 'Status';
            ui.applyBadgeState(connectionBadge, badgeState.state, badgeState.label);
        }
    }

    showNotification(message, type = 'info', options = {}) {
        ui.notify({
            message,
            type,
            duration: typeof options.duration === 'number' ? options.duration : 4000
        });
    }

    async loadDashboard() {
        console.log('📊 Terapeuta: Carregando dashboard...');
        this.showLoading(true);
        
        try {
            const evaluations = await this.firebaseManager.getAllEvaluations();
            this.filteredEvaluations = evaluations;
            this.indexEvaluations(evaluations);
            
            this.updateStatistics(evaluations);
            this.populateEvaluationsList(evaluations);
            this.populateAnalyticsFilters(evaluations);
            this.updateAnalyticsResults();
            this.updateLastSyncTime();
            this.updateQuickInsights(evaluations);
            
            // Atualizar sistema de relatórios apenas se os dados mudaram
            if (window.reportsManager && (!this.lastReportDataUpdate || 
                JSON.stringify(evaluations) !== JSON.stringify(this.lastReportDataUpdate))) {
                console.log('📊 Atualizando dados dos relatórios...');
                window.reportsManager.setData(evaluations);
                this.lastReportDataUpdate = JSON.parse(JSON.stringify(evaluations));
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
            this.indexEvaluations(evaluations);
            
            this.updateStatistics(evaluations);
            this.populateEvaluationsList(evaluations);
            this.populateAnalyticsFilters(evaluations);
            this.updateAnalyticsResults();
            this.updateLastSyncTime();
            this.updateQuickInsights(evaluations);
            
            // Atualizar sistema de relatórios apenas se os dados mudaram
            if (window.reportsManager && (!this.lastReportDataUpdate || 
                JSON.stringify(evaluations) !== JSON.stringify(this.lastReportDataUpdate))) {
                console.log('📊 Atualizando dados dos relatórios...');
                window.reportsManager.setData(evaluations);
                this.lastReportDataUpdate = JSON.parse(JSON.stringify(evaluations));
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
            this.showNotification('Não é possível sincronizar - Firebase offline', 'warning');
            return;
        }

        console.log('🔄 Terapeuta: Verificando dados pendentes...');
        this.showNotification('Sincronizando dados pendentes...', 'info');
        
        try {
            const result = await this.firebaseManager.syncPendingData();
            
            if (result.success && result.synced > 0) {
                this.showNotification(`✅ ${result.synced} avaliação(ões) sincronizada(s) com sucesso`, 'success');
                this.refreshData(true); // Refresh silencioso após sync
            } else if (result.synced === 0) {
                this.showNotification('✅ Todos os dados já estão sincronizados', 'success');
                console.log('✅ Terapeuta: Todos os dados já estão sincronizados');
            }
            
            if (result.skipped > 0) {
                console.log(`ℹ️ ${result.skipped} item(ns) pulados (já existem no Firebase)`);
            }
            
            if (result.errors > 0) {
                this.showNotification(`⚠️ ${result.errors} erro(s) na sincronização`, 'warning');
            }
        } catch (error) {
            console.error('❌ Terapeuta: Erro na sincronização:', error);
            this.showNotification('❌ Erro na sincronização: ' + error.message, 'error');
        }
    }

    async forceSyncAllData() {
        const confirmMessage = 'ATENÇÃO: Esta operação irá enviar TODOS os dados locais para o Firebase, mesmo que já existam duplicados.\n\nEsta é uma operação de emergência. Tem certeza?';
        
        if (!confirm(confirmMessage)) {
            return;
        }

        if (this.firebaseManager.connectionStatus !== 'connected') {
            this.showNotification('❌ Firebase não conectado - não é possível sincronizar', 'error');
            return;
        }

        console.log('🚀 FORÇANDO sincronização de todos os dados...');
        this.showLoading(true);
        this.showNotification('🚀 Sincronização forçada iniciada...', 'info');
        
        try {
            const result = await this.firebaseManager.forceSyncAllLocalData();
            
            this.showNotification(
                `🚀 Sincronização forçada completa:\n✅ ${result.synced} enviados\n❌ ${result.errors} erros\n📊 Total: ${result.total}`, 
                result.errors > 0 ? 'warning' : 'success'
            );
            
            console.log('🚀 Resultado da sincronização forçada:', result);
            
            // Refresh dados após sync forçada
            this.refreshData(true);
            
        } catch (error) {
            console.error('❌ Erro na sincronização forçada:', error);
            this.showNotification('❌ Erro na sincronização forçada: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
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

    indexEvaluations(evaluations) {
        const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
        this.evaluationIndex = new Map();
        this.evaluationsByPatient = new Map();

        evaluations.forEach((evaluation) => {
            const evaluationId = this.getEvaluationId(evaluation);
            if (!evaluationId) {
                return;
            }

            this.evaluationIndex.set(evaluationId, evaluation);

            const patientName = evaluation.patientInfo?.name?.trim() || 'Paciente não informado';
            const patientKey = patientName.toLowerCase();

            if (!this.evaluationsByPatient.has(patientKey)) {
                this.evaluationsByPatient.set(patientKey, {
                    key: patientKey,
                    name: patientName,
                    evaluations: []
                });
            }

            this.evaluationsByPatient.get(patientKey).evaluations.push({
                id: evaluationId,
                data: evaluation
            });
        });

        // Ordenar pacientes e avaliações por data (mais recente primeiro)
        this.sortedPatients = Array.from(this.evaluationsByPatient.values()).sort((a, b) =>
            collator.compare(a.name, b.name)
        );

        this.evaluationsByPatient.forEach((entry) => {
            entry.evaluations.sort((a, b) => {
                const dateA = this.parseEvaluationDate(a.data);
                const dateB = this.parseEvaluationDate(b.data);
                return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
            });
        });
    }

    renderSelectedEvaluationDetail() {
        const container = this.analyticsControls?.evaluationDetailContainer;
        const exportButton = this.analyticsControls?.viewEvaluation;
        if (!container) {
            return;
        }

        this.currentPdiEvaluation = null;
        this.currentPdiResults = [];
        this.pdiControls = null;

        if (!this.selectedEvaluationId) {
            container.innerHTML = `
                <div class="analytics-empty">
                    <h4>Nenhuma avaliação selecionada</h4>
                    <p>Escolha um paciente e uma avaliação para visualizar os detalhes.</p>
                </div>
            `;
            if (exportButton) {
                exportButton.disabled = true;
            }
            return;
        }

        const evaluation = this.evaluationIndex.get(this.selectedEvaluationId);
        if (!evaluation) {
            container.innerHTML = `
                <div class="analytics-empty">
                    <h4>Avaliação não encontrada</h4>
                    <p>Selecione outra avaliação ou recarregue os dados.</p>
                </div>
            `;
            if (exportButton) {
                exportButton.disabled = true;
            }
            return;
        }

        if (exportButton) {
            exportButton.disabled = false;
        }

        const metrics = this.extractEvaluationScore(evaluation);
        const evaluationDate = this.parseEvaluationDate(evaluation);
        const formattedDate = evaluationDate ? evaluationDate.toLocaleDateString('pt-BR') : (evaluation.patientInfo?.evaluationDate || 'N/A');
        const patientName = evaluation.patientInfo?.name || 'Paciente não informado';
        const evaluatorName = evaluation.evaluatorInfo?.name || evaluation.patientInfo?.evaluatorName || 'Não informado';
        const sourceLabel = this.formatEvaluationSource(evaluation);
        const answeredQuestions = this.countAnsweredQuestions(evaluation);
        const totalQuestions = 149;
        const averagePercent = metrics.maxScore > 0 ? (metrics.totalScore / metrics.maxScore) * 100 : 0;
        const isDuplicate = this.currentDuplicateIds?.has(this.selectedEvaluationId);

        const duplicateBanner = isDuplicate ? `
            <div class="analytics-warning">
                <div class="analytics-warning-content">
                    <strong>⚠️ Esta avaliação possui duplicatas</strong>
                    <p>Utilize o botão "Corrigir duplicados" para manter apenas o registro mais recente.</p>
                </div>
                <div class="analytics-warning-actions">
                    <button class="btn-primary" onclick="window.terapeutaPanel.runDeduplication()">
                        ♻️ Corrigir duplicados
                    </button>
                </div>
            </div>
        ` : '';

        const summaryHtml = `
            <div class="evaluation-detail-header">
                <h3>${this.escapeHtml(patientName)}</h3>
                <div class="evaluation-detail-meta">
                    <span><strong>Data:</strong> ${this.escapeHtml(formattedDate)}</span>
                    <span><strong>Avaliador:</strong> ${this.escapeHtml(evaluatorName)}</span>
                    <span><strong>Origem:</strong> ${this.escapeHtml(sourceLabel)}</span>
                </div>
            </div>
            ${duplicateBanner}
            <div class="evaluation-detail-summary">
                <h4>Resumo geral</h4>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Pontuação total</span>
                        <span class="summary-value">${Math.round(metrics.totalScore || 0)} / ${metrics.maxScore}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Pontuação média (%)</span>
                        <span class="summary-value">${this.formatPercentage(averagePercent)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Perguntas respondidas</span>
                        <span class="summary-value">${answeredQuestions}/${totalQuestions}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">ID da avaliação</span>
                        <span class="summary-value">${this.escapeHtml(this.selectedEvaluationId)}</span>
                    </div>
                </div>
            </div>
        `;

        const pdiPanelHtml = this.buildPdiPanelHtml();
        const questionsHtml = this.buildEvaluationQuestionsMarkup(evaluation);

        container.innerHTML = summaryHtml + pdiPanelHtml + questionsHtml;

        this.setupPdiControls(evaluation);
    }

    buildPdiPanelHtml() {
        return `
            <div class="pdi-panel">
                <div class="pdi-panel-header">
                    <h4>Plano de Desenvolvimento de Intervenção (PDI)</h4>
                    <p>Selecione as respostas que precisam de intervenção e gere um plano personalizado.</p>
                </div>
                <div class="pdi-controls">
                    <div class="pdi-control">
                        <span class="control-label">Filtrar por pontuação</span>
                        <div class="pdi-score-options">
                            <label>
                                <input type="checkbox" name="pdi-score" value="1">
                                1 - Nunca ou raramente
                            </label>
                            <label>
                                <input type="checkbox" name="pdi-score" value="2">
                                2 - Com pouca frequência
                            </label>
                            <label>
                                <input type="checkbox" name="pdi-score" value="3">
                                3 - Com regular frequência
                            </label>
                            <label>
                                <input type="checkbox" name="pdi-score" value="4">
                                4 - Muito frequentemente
                            </label>
                            <label>
                                <input type="checkbox" name="pdi-score" value="5">
                                5 - Sempre ou quase sempre
                            </label>
                        </div>
                        <div class="pdi-quick-buttons">
                            <button type="button" id="pdi-select-low" class="btn-secondary quick-action">
                                ⚡ Selecionar Baixas (1, 2, 3)
                            </button>
                            <button type="button" id="pdi-select-all-groups" class="btn-secondary quick-action">
                                📚 Selecionar Todos os Grupos
                            </button>
                            <button type="button" id="pdi-clear-filters" class="btn-secondary quick-action">
                                🧹 Limpar Filtros
                            </button>
                        </div>
                    </div>
                    <div class="pdi-control">
                        <label for="pdi-group-select" class="control-label">Grupos de habilidades</label>
                        <select id="pdi-group-select" multiple size="4"></select>
                        <small class="control-hint">Selecione um ou mais grupos (ou deixe em branco para considerar todos).</small>
                    </div>
                    <div class="pdi-control">
                        <label for="pdi-subgroup-select" class="control-label">Subgrupos</label>
                        <select id="pdi-subgroup-select" multiple size="6" disabled></select>
                        <small class="control-hint">Será habilitado após escolher um grupo. Pode selecionar mais de um.</small>
                    </div>
                    <div class="pdi-control pdi-actions">
                        <button type="button" id="pdi-generate" class="btn-primary">Gerar PDI</button>
                        <button type="button" id="pdi-export" class="btn-secondary" disabled>Exportar CSV</button>
                    </div>
                </div>
                <div id="pdi-results" class="pdi-results">
                    <div class="analytics-empty">
                        <h4>Configure os filtros para gerar o PDI</h4>
                        <p>Escolha as pontuações, grupos e subgrupos que deseja trabalhar. As sugestões aparecerão aqui.</p>
                    </div>
                </div>
            </div>
        `;
    }

    setupPdiControls(evaluation) {
        if (!this.analyticsControls) return;

        const detailContainer = this.analyticsControls.evaluationDetailContainer;
        if (!detailContainer) return;

        const scoreInputs = Array.from(detailContainer.querySelectorAll('input[name="pdi-score"]'));
        const groupSelect = detailContainer.querySelector('#pdi-group-select');
        const subgroupSelect = detailContainer.querySelector('#pdi-subgroup-select');
        const generateButton = detailContainer.querySelector('#pdi-generate');
        const exportButton = detailContainer.querySelector('#pdi-export');
        const resultsContainer = detailContainer.querySelector('#pdi-results');
        const quickLowButton = detailContainer.querySelector('#pdi-select-low');
        const quickAllGroupsButton = detailContainer.querySelector('#pdi-select-all-groups');
        const clearFiltersButton = detailContainer.querySelector('#pdi-clear-filters');

        this.currentPdiEvaluation = evaluation;
        this.currentPdiResults = [];
        this.pdiControls = {
            scoreInputs,
            groupSelect,
            subgroupSelect,
            generateButton,
            exportButton,
            resultsContainer,
            quickLowButton,
            quickAllGroupsButton,
            clearFiltersButton
        };

        if (groupSelect) {
            this.populatePdiGroupOptions(groupSelect);
        }
        if (subgroupSelect) {
            this.populatePdiSubgroupOptions(subgroupSelect, this.getSelectedOptions(groupSelect));
        }
        const regenerate = (event) => {
            if (event) {
                event.preventDefault();
            }
            this.generatePdiPlan(evaluation);
        };

        scoreInputs.forEach(input => {
            input.addEventListener('change', regenerate);
        });

        if (groupSelect) {
            groupSelect.addEventListener('change', () => {
                const selectedGroups = this.getSelectedOptions(groupSelect);
                this.populatePdiSubgroupOptions(subgroupSelect, selectedGroups);
                regenerate();
            });
        }

        if (subgroupSelect) {
            subgroupSelect.addEventListener('change', regenerate);
        }

        if (generateButton) {
            generateButton.addEventListener('click', regenerate);
        }

        if (exportButton) {
            exportButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.exportPdiPlan();
            });
        }

        if (quickLowButton) {
            quickLowButton.addEventListener('click', () => {
                this.applyPdiQuickLowScores();
                regenerate();
            });
        }

        if (quickAllGroupsButton) {
            quickAllGroupsButton.addEventListener('click', () => {
                this.applyPdiSelectAllGroups();
                regenerate();
            });
        }

        if (clearFiltersButton) {
            clearFiltersButton.addEventListener('click', () => {
                this.clearPdiFilters();
                if (exportButton) {
                    exportButton.disabled = true;
                }
                resultsContainer.innerHTML = `
                    <div class="analytics-empty">
                        <h4>Filtros limpos</h4>
                        <p>Selecione as combinações desejadas e clique em "Gerar PDI".</p>
                    </div>
                `;
            });
        }

        this.applyPdiDefaultFilters();
        regenerate();
    }

    populatePdiGroupOptions(selectElement) {
        if (!selectElement) return;
        const categories = this.getCategoryStructure();
        const options = categories.map(category => `<option value="${this.escapeHtml(category.key)}">${this.escapeHtml(category.name)}</option>`).join('');
        selectElement.innerHTML = options;
    }

    populatePdiSubgroupOptions(selectElement, selectedGroups = []) {
        if (!selectElement) return;
        const previousSelection = new Set(this.getSelectedOptions(selectElement));
        const categories = this.getCategoryStructure();
        const includeAll = !selectedGroups || selectedGroups.length === 0;
        const options = [];

        categories.forEach(category => {
            if (!includeAll && !selectedGroups.includes(category.key)) {
                return;
            }
            category.subgroups.forEach(subgroup => {
                options.push({
                    value: subgroup.key,
                    label: `${category.name} • ${subgroup.name}`,
                    categoryKey: category.key
                });
            });
        });

        if (options.length === 0) {
            selectElement.innerHTML = '';
            selectElement.disabled = true;
            return;
        }

        selectElement.innerHTML = options.map(option => `<option value="${this.escapeHtml(option.value)}">${this.escapeHtml(option.label)}</option>`).join('');
        selectElement.disabled = false;

        const toRestore = options.filter(option => previousSelection.has(option.value));
        if (toRestore.length) {
            toRestore.forEach(option => {
                const opt = Array.from(selectElement.options).find(o => o.value === option.value);
                if (opt) opt.selected = true;
            });
        }
    }

    getSelectedOptions(selectElement) {
        if (!selectElement) return [];
        return Array.from(selectElement.selectedOptions || []).map(option => option.value);
    }

    applyPdiDefaultFilters() {
        if (!this.pdiControls) return;
        const { scoreInputs, groupSelect, subgroupSelect } = this.pdiControls;

        if (scoreInputs && scoreInputs.length) {
            scoreInputs.forEach(cb => {
                cb.checked = ['1', '2', '3'].includes(cb.value);
            });
        }

        if (groupSelect) {
            Array.from(groupSelect.options).forEach(option => {
                option.selected = true;
            });
            this.populatePdiSubgroupOptions(subgroupSelect, this.getSelectedOptions(groupSelect));
            if (subgroupSelect) {
                Array.from(subgroupSelect.options).forEach(option => option.selected = false);
            }
        }
    }

    applyPdiQuickLowScores() {
        if (!this.pdiControls) return;
        const { scoreInputs } = this.pdiControls;
        if (!scoreInputs) return;
        scoreInputs.forEach(cb => {
            cb.checked = ['1', '2', '3'].includes(cb.value);
        });
        this.showNotification('Pontuações 1, 2 e 3 selecionadas.', 'success');
    }

    applyPdiSelectAllGroups() {
        if (!this.pdiControls) return;
        const { groupSelect, subgroupSelect } = this.pdiControls;
        if (!groupSelect) return;
        Array.from(groupSelect.options).forEach(option => {
            option.selected = true;
        });
        this.populatePdiSubgroupOptions(subgroupSelect, this.getSelectedOptions(groupSelect));
        if (subgroupSelect) {
            Array.from(subgroupSelect.options).forEach(option => option.selected = false);
        }
        this.showNotification('Todos os grupos foram selecionados.', 'success');
    }

    clearPdiFilters() {
        if (!this.pdiControls) return;
        const { scoreInputs, groupSelect, subgroupSelect } = this.pdiControls;

        if (scoreInputs) {
            scoreInputs.forEach(cb => cb.checked = false);
        }

        if (groupSelect) {
            Array.from(groupSelect.options).forEach(option => option.selected = false);
        }

        if (subgroupSelect) {
            subgroupSelect.innerHTML = '';
            subgroupSelect.disabled = true;
        }

        this.currentPdiResults = [];
        this.currentPdiEvaluation = null;

        this.showNotification('Filtros do PDI limpos. Configure novamente para gerar o plano.', 'info');
    }

    generatePdiPlan(evaluation) {
        if (!this.pdiControls) return;

        const { scoreInputs, groupSelect, subgroupSelect, resultsContainer, exportButton } = this.pdiControls;
        if (!resultsContainer) return;

        const selectedScores = new Set(
            (scoreInputs || [])
                .filter(input => input.checked)
                .map(input => parseInt(input.value, 10))
                .filter(value => Number.isFinite(value))
        );

        if ((scoreInputs || []).length && selectedScores.size === 0) {
            resultsContainer.innerHTML = `
                <div class="analytics-empty">
                    <h4>Nenhuma pontuação selecionada</h4>
                    <p>Escolha ao menos uma pontuação (1 a 5) para gerar o PDI.</p>
                </div>
            `;
            this.currentPdiResults = [];
            if (exportButton) exportButton.disabled = true;
            return;
        }

        const selectedGroups = new Set(this.getSelectedOptions(groupSelect));
        const selectedSubgroups = new Set(this.getSelectedOptions(subgroupSelect));

        const metadataMap = this.getQuestionMetadata();
        const responsesMap = this.mapResponsesByQuestion(evaluation);
        const descriptions = this.getQuestionDescriptions();
        const categories = this.getCategoryStructure();
        const categoryLookup = new Map(categories.map(category => [category.key, category]));
        const subgroupLookup = new Map();
        categories.forEach(category => {
            category.subgroups.forEach(subgroup => {
                subgroupLookup.set(subgroup.key, { ...subgroup, categoryKey: category.key, categoryName: category.name, categoryColor: category.color });
            });
        });

        const results = [];

        for (let questionNum = 1; questionNum <= 149; questionNum++) {
            const responseEntry = responsesMap.get(questionNum);
            const metadata = metadataMap.get(questionNum);
            if (!metadata) continue;

            const score = responseEntry?.score ?? null;
            if (score === null || !Number.isFinite(score)) continue;

            if (selectedScores.size > 0 && !selectedScores.has(score)) {
                continue;
            }

            if (selectedGroups.size > 0 && !selectedGroups.has(metadata.categoryKey)) {
                continue;
            }

            if (selectedSubgroups.size > 0 && !selectedSubgroups.has(metadata.subgroupKey)) {
                continue;
            }

            const description = responseEntry?.question || descriptions[`q${questionNum}`] || `Questão ${questionNum}`;
            const level = this.getScoreLevel(score);

            results.push({
                questionNum,
                questionId: `q${questionNum}`,
                description,
                score,
                level,
                categoryKey: metadata.categoryKey,
                categoryName: metadata.categoryName,
                categoryColor: metadata.categoryColor,
                categoryIndex: metadata.categoryIndex,
                subgroupKey: metadata.subgroupKey,
                subgroupName: metadata.subgroupName,
                subgroupIndex: metadata.subgroupIndex
            });
        }

        results.sort((a, b) => {
            if (a.categoryIndex !== b.categoryIndex) return a.categoryIndex - b.categoryIndex;
            if (a.subgroupIndex !== b.subgroupIndex) return a.subgroupIndex - b.subgroupIndex;
            return a.questionNum - b.questionNum;
        });

        this.currentPdiResults = results;
        this.currentPdiEvaluation = evaluation;

        if (exportButton) {
            exportButton.disabled = results.length === 0;
        }

        this.renderPdiResults(results, {
            scores: selectedScores,
            groups: selectedGroups,
            subgroups: selectedSubgroups
        });
    }

    renderPdiResults(results, filters) {
        if (!this.pdiControls?.resultsContainer) return;
        const container = this.pdiControls.resultsContainer;

        if (!results.length) {
            container.innerHTML = `
                <div class="analytics-empty">
                    <h4>Nenhuma questão corresponde aos filtros</h4>
                    <p>Ajuste as pontuações, grupos ou subgrupos para encontrar as habilidades que precisam de intervenção.</p>
                </div>
            `;
            return;
        }

        const categories = this.getCategoryStructure();
        const categoryLookup = new Map(categories.map(category => [category.key, category]));
        const grouped = new Map();

        results.forEach(item => {
            if (!grouped.has(item.categoryKey)) {
                grouped.set(item.categoryKey, new Map());
            }
            const subgroups = grouped.get(item.categoryKey);
            if (!subgroups.has(item.subgroupKey)) {
                subgroups.set(item.subgroupKey, []);
            }
            subgroups.get(item.subgroupKey).push(item);
        });

        const selectedScoresLabel = filters.scores && filters.scores.size > 0
            ? Array.from(filters.scores).sort().map(score => `${score}`).join(', ')
            : 'todas as pontuações';

        const selectedGroupsLabel = filters.groups && filters.groups.size > 0
            ? Array.from(filters.groups).map(key => categoryLookup.get(key)?.name || key).join(', ')
            : 'todos os grupos';

        const selectedSubgroupsLabel = filters.subgroups && filters.subgroups.size > 0
            ? `${filters.subgroups.size} selecionado(s)`
            : 'todos os subgrupos';

        const scoreCounts = {};
        results.forEach(item => {
            scoreCounts[item.score] = (scoreCounts[item.score] || 0) + 1;
        });

        const scoreSummary = Object.keys(scoreCounts)
            .map(value => parseInt(value, 10))
            .filter(value => Number.isFinite(value))
            .sort((a, b) => a - b)
            .map(score => {
                const level = this.getScoreLevel(score);
                return `<span class="score-pill" style="background:${level.color}">Nota ${score}: ${scoreCounts[score]}</span>`;
            }).join('');

        let html = `
            <div class="pdi-summary">
                <div><strong>${results.length}</strong> questão(ões) selecionadas para intervenção.</div>
                <div class="pdi-summary-filters">
                    <span>Notas: ${this.escapeHtml(selectedScoresLabel)}</span>
                    <span>Grupos: ${this.escapeHtml(selectedGroupsLabel)}</span>
                    <span>Subgrupos: ${this.escapeHtml(selectedSubgroupsLabel)}</span>
                </div>
                <div class="pdi-score-summary">${scoreSummary}</div>
            </div>
        `;

        categories.forEach(category => {
            if (!grouped.has(category.key)) {
                return;
            }
            const subgroupsMap = grouped.get(category.key);
            html += `
                <div class="evaluation-category-card pdi-category-card" style="border-top: 3px solid ${category.color};">
                    <h4 style="margin-top:0; color:${category.color};">${this.escapeHtml(category.name)}</h4>
            `;

            category.subgroups.forEach(subgroup => {
                const items = subgroupsMap.get(subgroup.key);
                if (!items || !items.length) {
                    return;
                }

                const total = items.reduce((sum, item) => sum + (item.score || 0), 0);
                const max = items.length * 5;
                const percentage = max > 0 ? Math.round((total / max) * 100) : 0;

                html += `
                    <div class="evaluation-subgroup-card pdi-subgroup-card" style="border-left-color:${category.color}; background:${category.color}10;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div>
                                <strong>${this.escapeHtml(subgroup.name)}</strong>
                                <small style="display:block; color:#718096;">${items.length} questão(ões)</small>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:22px; font-weight:700; color:${category.color};">${percentage}%</div>
                                <div style="font-size:12px; color:#4a5568;">${total}/${max} pontos</div>
                            </div>
                        </div>
                        <table class="pdi-result-table">
                            <thead>
                                <tr>
                                    <th>Questão</th>
                                    <th>Descrição</th>
                                    <th style="text-align:center;">Pontuação</th>
                                    <th style="text-align:center;">Classificação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td style="font-weight:600;">Q${item.questionNum}</td>
                                        <td>${this.escapeHtml(item.description)}</td>
                                        <td style="text-align:center; font-weight:600;">${item.score}/5</td>
                                        <td style="text-align:center;">
                                            <span class="score-badge" style="background:${item.level.color}">${this.escapeHtml(item.level.label)}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });

            html += `</div>`;
        });

        container.innerHTML = html;
    }

    exportPdiPlan() {
        if (!this.currentPdiResults || this.currentPdiResults.length === 0) {
            this.showNotification('Nenhum dado para exportar. Ajuste os filtros do PDI.', 'warning');
            return;
        }

        const evaluation = this.currentPdiEvaluation;
        const patientName = evaluation?.patientInfo?.name || '';
        const evaluatorName = evaluation?.evaluatorInfo?.name || evaluation?.patientInfo?.evaluatorName || '';
        const evaluationDate = this.parseEvaluationDate(evaluation);
        const formattedDate = evaluationDate ? evaluationDate.toLocaleDateString('pt-BR') : (evaluation?.patientInfo?.evaluationDate || '');
        const source = this.formatEvaluationSource(evaluation || {});

        const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Paciente,Data,Avaliador,Origem,Questao,Descricao,Grupo,Subgrupo,Pontuacao,Classificacao\n';

        this.currentPdiResults.forEach(item => {
            csvContent += [
                csvEscape(patientName),
                csvEscape(formattedDate),
                csvEscape(evaluatorName),
                csvEscape(source),
                csvEscape(`Q${item.questionNum}`),
                csvEscape(item.description),
                csvEscape(item.categoryName),
                csvEscape(item.subgroupName),
                csvEscape(item.score),
                csvEscape(item.level.label)
            ].join(',') + '\n';
        });

        const encodedUri = encodeURI(csvContent);
        const fileName = `pdi_${patientName.replace(/\s+/g, '_')}_${this.selectedEvaluationId || 'avaliacao'}.csv`;
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('PDI exportado com sucesso.', 'success');
    }

    formatEvaluationOptionLabel(evaluation) {
        const evaluationDate = this.parseEvaluationDate(evaluation);
        const formattedDate = evaluationDate ? evaluationDate.toLocaleDateString('pt-BR') : (evaluation.patientInfo?.evaluationDate || 'Sem data');
        const sourceText = evaluation.source === 'firebase' || evaluation.firebaseId ? 'Firebase' :
            (evaluation.source === 'local' || evaluation.localOnly ? 'Local' : 'Origem desconhecida');
        const sourceIcon = evaluation.source === 'firebase' || evaluation.firebaseId ? '☁️' :
            (evaluation.source === 'local' || evaluation.localOnly ? '💾' : '•');
        const metrics = this.extractEvaluationScore(evaluation);
        const percent = metrics.maxScore > 0 ? (metrics.totalScore / metrics.maxScore) * 100 : 0;
        const totalScore = Math.round(metrics.totalScore || 0);
        return `${formattedDate} • ${sourceIcon} ${sourceText} • ${totalScore} pts (${this.formatPercentage(percent)})`;
    }

    formatEvaluationSource(evaluation) {
        if (evaluation.source === 'firebase' || evaluation.firebaseId) {
            return '☁️ Firebase';
        }
        if (evaluation.source === 'local' || evaluation.localOnly) {
            return '💾 Local';
        }
        return '—';
    }

    buildEvaluationQuestionsMarkup(evaluation) {
        const categories = this.getCategoryStructure();
        const descriptions = this.getQuestionDescriptions();
        const responsesMap = this.mapResponsesByQuestion(evaluation);
        let html = '<div class="evaluation-questions">';
        let hasContent = false;

        categories.forEach(category => {
            const subgroupsHtml = category.subgroups.map(subgroup => {
                const questions = [];
                for (let num = subgroup.start; num <= subgroup.end; num++) {
                    const response = responsesMap.get(num);
                    const questionId = `q${num}`;
                    const description = response?.question || descriptions[questionId] || `Questão ${num}`;
                    const score = Number.isFinite(response?.score) ? response.score : null;
                    questions.push({ num, description, score });
                }

                const total = questions.reduce((sum, item) => sum + (item.score ?? 0), 0);
                const answered = questions.filter(item => item.score !== null).length;
                const max = questions.length * 5;
                const percentage = max > 0 ? Math.round((total / max) * 100) : 0;

                return `
                    <div class="evaluation-subgroup-card" style="border-left-color: ${category.color}; background: ${category.color}10;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div>
                                <strong>${this.escapeHtml(subgroup.name)}</strong>
                                <small style="display:block; color: #718096;">${answered}/${questions.length} respondidas</small>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 22px; font-weight: 700; color: ${category.color};">${percentage}%</div>
                                <div style="font-size: 12px; color: #4a5568;">${total}/${max} pontos</div>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Questão</th>
                                    <th>Descrição</th>
                                    <th style="text-align:center;">Pontuação</th>
                                    <th style="text-align:center;">Classificação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${questions.map(question => {
                                    const scoreDisplay = question.score !== null ? `${question.score}/5` : '—';
                                    const level = question.score !== null ? this.getScoreLevel(question.score) : null;
                                    const badge = question.score !== null
                                        ? `<span class="score-badge" style="background:${level.color}">${level.label}</span>`
                                        : `<span class="score-badge" style="background:#a0aec0">Sem resposta</span>`;
                                    return `
                                        <tr>
                                            <td style="font-weight:600;">Q${question.num}</td>
                                            <td>${this.escapeHtml(question.description)}</td>
                                            <td style="text-align:center; font-weight:600;">${scoreDisplay}</td>
                                            <td style="text-align:center;">${badge}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }).join('');

            if (subgroupsHtml.trim()) {
                hasContent = true;
                html += `
                    <div class="evaluation-category-card" style="border-top: 3px solid ${category.color};">
                        <h4 style="margin-top:0; color:${category.color};">${this.escapeHtml(category.name)}</h4>
                        ${subgroupsHtml}
                    </div>
                `;
            }
        });

        html += hasContent ? '</div>' : `
            <div class="analytics-empty">
                <h4>Nenhuma resposta registrada</h4>
                <p>Não foram encontradas respostas para esta avaliação.</p>
            </div>
        `;

        return html;
    }

    getCategoryStructure() {
        if (this.categoryStructureCache) {
            return this.categoryStructureCache;
        }

        const categories = [
            {
                key: 'habilidades-comunicativas',
                name: 'Habilidades Comunicativas',
                color: '#667eea',
                subgroups: [
                    { name: 'Contato Visual', start: 1, end: 10 },
                    { name: 'Comunicação Alternativa', start: 11, end: 20 },
                    { name: 'Linguagem Expressiva', start: 21, end: 30 },
                    { name: 'Linguagem Receptiva', start: 31, end: 40 }
                ]
            },
            {
                key: 'habilidades-sociais',
                name: 'Habilidades Sociais',
                color: '#4facfe',
                subgroups: [
                    { name: 'Expressão Facial', start: 41, end: 50 },
                    { name: 'Imitação', start: 51, end: 60 },
                    { name: 'Atenção Compartilhada', start: 61, end: 70 },
                    { name: 'Brincar', start: 71, end: 80 }
                ]
            },
            {
                key: 'habilidades-funcionais',
                name: 'Habilidades Funcionais',
                color: '#ffb778',
                subgroups: [
                    { name: 'Auto Cuidado', start: 81, end: 89 },
                    { name: 'Vestir-se', start: 90, end: 99 },
                    { name: 'Uso do Banheiro', start: 100, end: 109 }
                ]
            },
            {
                key: 'habilidades-emocionais',
                name: 'Habilidades Emocionais',
                color: '#d299c2',
                subgroups: [
                    { name: 'Controle Inibitório', start: 110, end: 119 },
                    { name: 'Flexibilidade', start: 120, end: 129 },
                    { name: 'Resposta Emocional', start: 130, end: 139 },
                    { name: 'Empatia', start: 140, end: 149 }
                ]
            }
        ];

        categories.forEach((category, categoryIndex) => {
            category.index = categoryIndex;
            category.subgroups = category.subgroups.map((subgroup, subgroupIndex) => ({
                ...subgroup,
                key: `${category.key}__${this.slugify(subgroup.name)}`,
                index: subgroupIndex
            }));
        });

        this.categoryStructureCache = categories;
        return categories;
    }

    slugify(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    getQuestionMetadata() {
        if (this.questionMetadataCache) {
            return this.questionMetadataCache;
        }

        const categories = this.getCategoryStructure();
        const map = new Map();

        categories.forEach(category => {
            category.subgroups.forEach(subgroup => {
                for (let num = subgroup.start; num <= subgroup.end; num++) {
                    map.set(num, {
                        categoryKey: category.key,
                        categoryName: category.name,
                        categoryColor: category.color,
                        categoryIndex: category.index,
                        subgroupKey: subgroup.key,
                        subgroupName: subgroup.name,
                        subgroupIndex: subgroup.index
                    });
                }
            });
        });

        this.questionMetadataCache = map;
        return map;
    }

    mapResponsesByQuestion(evaluation) {
        const map = new Map();
        const responses = evaluation.responses || {};

        Object.entries(responses).forEach(([questionId, value]) => {
            const questionNum = parseInt(questionId.replace(/\D/g, ''), 10);
            if (!Number.isInteger(questionNum)) {
                return;
            }

            let score = null;
            let description = null;

            if (value && typeof value === 'object') {
                if (typeof value.score === 'number') {
                    score = value.score;
                } else if (typeof value.score === 'string') {
                    const numericScore = parseFloat(value.score);
                    if (!Number.isNaN(numericScore)) {
                        score = numericScore;
                    }
                }
                if (value.question) {
                    description = value.question;
                }
            } else if (typeof value === 'number') {
                score = value;
            } else if (typeof value === 'string') {
                const numericScore = parseFloat(value);
                if (!Number.isNaN(numericScore)) {
                    score = numericScore;
                }
            }

            map.set(questionNum, {
                score: Number.isFinite(score) ? score : null,
                question: description || null
            });
        });

        return map;
    }

    countAnsweredQuestions(evaluation) {
        const responsesMap = this.mapResponsesByQuestion(evaluation);
        let answered = 0;
        responsesMap.forEach(entry => {
            if (entry.score !== null && entry.score !== undefined) {
                answered += 1;
            }
        });
        return answered;
    }

    getQuestionDescriptions() {
        if (this.questionDescriptionsCache) {
            return this.questionDescriptionsCache;
        }
        if (window.reportsManager && typeof window.reportsManager.getQuestionDescriptions === 'function') {
            this.questionDescriptionsCache = window.reportsManager.getQuestionDescriptions();
            return this.questionDescriptionsCache;
        }
        const fallback = {};
        for (let i = 1; i <= 149; i++) {
            fallback[`q${i}`] = `Questão ${i}`;
        }
        this.questionDescriptionsCache = fallback;
        return this.questionDescriptionsCache;
    }

    getScoreLevel(score) {
        const levels = {
            5: { label: 'Sempre ou quase sempre', color: '#2f855a' },
            4: { label: 'Muito frequentemente', color: '#38a169' },
            3: { label: 'Com regular frequência', color: '#dd6b20' },
            2: { label: 'Com pouca frequência', color: '#ed8936' },
            1: { label: 'Nunca ou raramente', color: '#e53e3e' }
        };
        return levels[score] || { label: 'Sem classificação', color: '#a0aec0' };
    }

    filterEvaluationsForAnalytics(evaluations) {
        if (!this.analyticsControls) return evaluations;

        const patientFilter = this.analyticsControls.patient?.value?.toLowerCase() || '';
        const evaluatorFilter = this.analyticsControls.evaluator?.value?.toLowerCase() || '';
        const dateFromValue = this.analyticsControls.dateFrom?.value || '';
        const dateToValue = this.analyticsControls.dateTo?.value || '';

        const dateFrom = dateFromValue ? new Date(dateFromValue + 'T00:00:00') : null;
        const dateTo = dateToValue ? new Date(dateToValue + 'T23:59:59') : null;

        return evaluations.filter(evaluation => {
            const patientName = evaluation.patientInfo?.name?.toLowerCase() || '';
            if (patientFilter && patientName !== patientFilter) {
                return false;
            }

            const evaluatorName = evaluation.evaluatorInfo?.name?.toLowerCase() || '';
            if (evaluatorFilter && evaluatorName !== evaluatorFilter) {
                return false;
            }

            if (dateFrom || dateTo) {
                const evalDate = this.parseEvaluationDate(evaluation);
                if (!evalDate) {
                    return false;
                }
                if (dateFrom && evalDate < dateFrom) {
                    return false;
                }
                if (dateTo && evalDate > dateTo) {
                    return false;
                }
            }

            return true;
        });
    }

    aggregateAnalyticsData(evaluations, grouping) {
        switch (grouping) {
            case 'patient':
                return this.aggregateByPatient(evaluations);
            case 'evaluator':
                return this.aggregateByEvaluator(evaluations);
            case 'category':
                return this.aggregateByCategory(evaluations);
            case 'subgroup':
                return this.aggregateBySubgroup(evaluations);
            case 'month':
                return this.aggregateByMonth(evaluations);
            default:
                return this.aggregateByPatient(evaluations);
        }
    }

    aggregateByPatient(evaluations) {
        const map = new Map();

        evaluations.forEach(evaluation => {
            const name = evaluation.patientInfo?.name?.trim() || 'Paciente não informado';
            const key = name.toLowerCase();
            const metrics = this.extractEvaluationScore(evaluation);

            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    label: name,
                    totalScore: 0,
                    maxScore: 0,
                    count: 0,
                    dataPoints: []
                });
            }

            const bucket = map.get(key);
            bucket.totalScore += metrics.totalScore;
            bucket.maxScore += metrics.maxScore;
            bucket.count += 1;
            if (Number.isFinite(metrics.percentage)) {
                bucket.dataPoints.push({
                    date: metrics.evaluationDate,
                    value: metrics.percentage
                });
            }
        });

        return this.finalizeAnalyticsRows(map);
    }

    aggregateByEvaluator(evaluations) {
        const map = new Map();

        evaluations.forEach(evaluation => {
            const name = evaluation.evaluatorInfo?.name?.trim() || 'Avaliador não informado';
            const key = name.toLowerCase();
            const metrics = this.extractEvaluationScore(evaluation);

            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    label: name,
                    totalScore: 0,
                    maxScore: 0,
                    count: 0,
                    dataPoints: []
                });
            }

            const bucket = map.get(key);
            bucket.totalScore += metrics.totalScore;
            bucket.maxScore += metrics.maxScore;
            bucket.count += 1;
            if (Number.isFinite(metrics.percentage)) {
                bucket.dataPoints.push({
                    date: metrics.evaluationDate,
                    value: metrics.percentage
                });
            }
        });

        return this.finalizeAnalyticsRows(map);
    }

    aggregateByCategory(evaluations) {
        const map = new Map();

        evaluations.forEach(evaluation => {
            const evalKey = this.generateEvaluationKey(evaluation);
            const evalDate = this.parseEvaluationDate(evaluation);
            const categories = this.extractCategoryTotals(evaluation);

            Object.entries(categories).forEach(([categoryName, data]) => {
                const key = categoryName.toLowerCase();
                if (!map.has(key)) {
                    map.set(key, {
                        id: key,
                        label: categoryName,
                        totalScore: 0,
                        maxScore: 0,
                        dataPoints: [],
                        uniqueEvaluations: new Set()
                    });
                }

                const bucket = map.get(key);
                bucket.totalScore += data.total;
                bucket.maxScore += data.max;
                if (Number.isFinite(data.percentage)) {
                    bucket.dataPoints.push({
                        date: evalDate,
                        value: data.percentage
                    });
                }
                if (evalKey) {
                    bucket.uniqueEvaluations.add(evalKey);
                }
            });
        });

        return this.finalizeAnalyticsRows(map, { useUniqueEvaluations: true });
    }

    aggregateBySubgroup(evaluations) {
        const map = new Map();

        evaluations.forEach(evaluation => {
            const evalKey = this.generateEvaluationKey(evaluation);
            const evalDate = this.parseEvaluationDate(evaluation);
            const subgroups = this.extractSubgroupTotals(evaluation);

            subgroups.forEach(subgroupData => {
                const key = subgroupData.key;
                if (!map.has(key)) {
                    map.set(key, {
                        id: key,
                        label: subgroupData.label,
                        totalScore: 0,
                        maxScore: 0,
                        dataPoints: [],
                        uniqueEvaluations: new Set(),
                        metadata: {
                            category: subgroupData.category
                        }
                    });
                }

                const bucket = map.get(key);
                bucket.totalScore += subgroupData.total;
                bucket.maxScore += subgroupData.max;
                if (Number.isFinite(subgroupData.percentage)) {
                    bucket.dataPoints.push({
                        date: evalDate,
                        value: subgroupData.percentage
                    });
                }
                if (evalKey) {
                    bucket.uniqueEvaluations.add(evalKey);
                }
            });
        });

        return this.finalizeAnalyticsRows(map, { useUniqueEvaluations: true });
    }

    aggregateByMonth(evaluations) {
        const map = new Map();

        evaluations.forEach(evaluation => {
            const evalDate = this.parseEvaluationDate(evaluation);
            if (!evalDate) return;

            const key = `${evalDate.getFullYear()}-${String(evalDate.getMonth() + 1).padStart(2, '0')}`;
            if (!map.has(key)) {
                const label = this.capitalize(evalDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }));
                map.set(key, {
                    id: key,
                    label,
                    totalScore: 0,
                    maxScore: 0,
                    count: 0,
                    dataPoints: []
                });
            }

            const bucket = map.get(key);
            const metrics = this.extractEvaluationScore(evaluation);
            bucket.totalScore += metrics.totalScore;
            bucket.maxScore += metrics.maxScore;
            bucket.count += 1;
            if (Number.isFinite(metrics.percentage)) {
                bucket.dataPoints.push({
                    date: evalDate,
                    value: metrics.percentage
                });
            }
        });

        return this.finalizeAnalyticsRows(map);
    }

    finalizeAnalyticsRows(map, options = {}) {
        const rows = [];
        map.forEach(bucket => {
            const dataPoints = (bucket.dataPoints || []).map(point => ({
                date: point.date instanceof Date ? point.date : (point.date ? new Date(point.date) : null),
                value: Number.isFinite(point.value) ? point.value : null
            })).sort((a, b) => {
                if (!a.date && !b.date) return 0;
                if (!a.date) return -1;
                if (!b.date) return 1;
                return a.date - b.date;
            });

            const evaluationCount = options.useUniqueEvaluations && bucket.uniqueEvaluations
                ? bucket.uniqueEvaluations.size
                : (bucket.count || dataPoints.length || 0);

            const averagePercent = bucket.maxScore > 0 ? (bucket.totalScore / bucket.maxScore) * 100 : 0;
            const averageScore = evaluationCount > 0 ? bucket.totalScore / evaluationCount : 0;
            const firstPoint = dataPoints.find(point => point.value !== null);
            const lastPoint = [...dataPoints].reverse().find(point => point.value !== null);
            const firstValue = firstPoint ? firstPoint.value : averagePercent;
            const lastValue = lastPoint ? lastPoint.value : averagePercent;
            const trend = dataPoints.filter(point => point.value !== null).length >= 2 ? lastValue - firstValue : 0;
            const firstDate = firstPoint ? firstPoint.date : (dataPoints.length ? dataPoints[0].date : null);
            const lastDate = lastPoint ? lastPoint.date : (dataPoints.length ? dataPoints[dataPoints.length - 1].date : null);

            rows.push({
                id: bucket.id,
                label: bucket.label,
                count: evaluationCount,
                totalScore: bucket.totalScore,
                maxScore: bucket.maxScore,
                averagePercent,
                averageScore,
                lastScore: lastValue,
                trend,
                firstDate,
                lastDate,
                metadata: bucket.metadata || {}
            });
        });
        return rows;
    }

    extractEvaluationScore(evaluation) {
        const totalScore = typeof evaluation.totalScore === 'number'
            ? evaluation.totalScore
            : this.calculateFallbackTotalScore(evaluation);
        const maxScore = this.calculateMaxScore(evaluation);
        const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const evaluationDate = this.parseEvaluationDate(evaluation);

        return { totalScore, maxScore, percentage, evaluationDate };
    }

    calculateFallbackTotalScore(evaluation) {
        if (evaluation.groupScores) {
            return Object.values(evaluation.groupScores).reduce((sum, group) => sum + (group.total || 0), 0);
        }

        if (evaluation.responses) {
            return Object.values(evaluation.responses).reduce((sum, response) => {
                if (typeof response === 'number') {
                    return sum + response;
                }
                if (response && typeof response.score === 'number') {
                    return sum + response.score;
                }
                return sum;
            }, 0);
        }

        return 0;
    }

    calculateMaxScore(evaluation) {
        if (evaluation.groupScores) {
            const totalMax = Object.values(evaluation.groupScores).reduce((sum, group) => sum + (group.max || 0), 0);
            if (totalMax > 0) {
                return totalMax;
            }
        }

        if (evaluation.responses) {
            const questions = Object.keys(evaluation.responses).length;
            if (questions > 0) {
                return questions * 5;
            }
        }

        // Fallback para o total completo do formulário (149 perguntas * 5)
        return 149 * 5;
    }

    extractCategoryTotals(evaluation) {
        const totals = {};

        if (!evaluation.groupScores) {
            return totals;
        }

        Object.entries(evaluation.groupScores).forEach(([groupName, groupData]) => {
            const category = groupData.category || 'Categoria não informada';
            if (!totals[category]) {
                totals[category] = {
                    total: 0,
                    max: 0,
                    percentage: 0
                };
            }

            totals[category].total += groupData.total || 0;
            totals[category].max += groupData.max || 0;
        });

        Object.values(totals).forEach(data => {
            data.percentage = data.max > 0 ? (data.total / data.max) * 100 : 0;
        });

        return totals;
    }

    extractSubgroupTotals(evaluation) {
        const totals = [];

        if (!evaluation.groupScores) {
            return totals;
        }

        Object.entries(evaluation.groupScores).forEach(([groupName, groupData]) => {
            const key = groupName.toLowerCase();
            const total = groupData.total || 0;
            const max = groupData.max || 0;
            const percentage = max > 0 ? (total / max) * 100 : 0;

            totals.push({
                key,
                label: `${groupName}${groupData.category ? ` · ${groupData.category}` : ''}`,
                category: groupData.category || null,
                total,
                max,
                percentage
            });
        });

        return totals;
    }

    sortAnalyticsRows(rows, metric) {
        const metricKey = metric || 'averagePercent';

        const getValue = (row) => {
            switch (metricKey) {
                case 'averageScore':
                    return Number.isFinite(row.averageScore) ? row.averageScore : 0;
                case 'count':
                    return Number.isFinite(row.count) ? row.count : 0;
                case 'lastScore':
                    return Number.isFinite(row.lastScore) ? row.lastScore : 0;
                case 'averagePercent':
                default:
                    return Number.isFinite(row.averagePercent) ? row.averagePercent : 0;
            }
        };

        return [...rows].sort((a, b) => getValue(b) - getValue(a));
    }

    renderAnalyticsSummaryTable(rows, grouping, metric) {
        if (!rows.length) {
            return `
                <div class="analytics-empty">
                    <h4>Dados não disponíveis</h4>
                    <p>Experimente ajustar os filtros para visualizar outros resultados.</p>
                </div>
            `;
        }

        const header = `
            <thead>
                <tr>
                    <th>${grouping === 'month' ? 'Período' : 'Segmento'}</th>
                    <th>Avaliações</th>
                    <th>Pontuação média (%)</th>
                    <th>Pontuação média (total)</th>
                    <th>Última avaliação</th>
                    <th>Última pontuação</th>
                    <th>Tendência</th>
                </tr>
            </thead>
        `;

        const bodyRows = rows.map(row => `
            <tr>
                <td>${this.escapeHtml(row.label)}</td>
                <td>${row.count}</td>
                <td>${this.formatPercentage(row.averagePercent)}</td>
                <td>${this.formatScore(row.averageScore)}</td>
                <td>${this.formatDate(row.lastDate)}</td>
                <td>${this.formatPercentage(row.lastScore)}</td>
                <td>${this.createTrendPill(row.trend)}</td>
            </tr>
        `).join('');

        return `
            <div class="analytics-table-wrapper">
                <table>
                    ${header}
                    <tbody>
                        ${bodyRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    createTrendPill(value) {
        if (!Number.isFinite(value) || value === 0) {
            return `<span class="metric-pill">Estável</span>`;
        }

        const rounded = value.toFixed(1);
        if (value > 0) {
            return `<span class="metric-pill positive">▲ +${rounded} pts</span>`;
        }
        return `<span class="metric-pill negative">▼ ${rounded} pts</span>`;
    }

    getMetricLabel(metric) {
        const labels = {
            averagePercent: 'Pontuação média (%)',
            averageScore: 'Pontuação média (total)',
            count: 'Número de avaliações',
            lastScore: 'Última pontuação (%)'
        };
        return labels[metric] || labels.averagePercent;
    }

    renderAnalyticsDetailedTable(evaluations, duplicateIds = new Set()) {
        const detailRows = [];

        evaluations.forEach((evaluation) => {
            if (!evaluation || !evaluation.responses) return;

            const patientName = evaluation.patientInfo?.name || 'Paciente não informado';
            const evaluatorName = evaluation.evaluatorInfo?.name || 'Avaliador não informado';
            const evaluationDateObj = this.parseEvaluationDate(evaluation);
            const evaluationDateDisplay = evaluationDateObj
                ? evaluationDateObj.toLocaleDateString('pt-BR')
                : (evaluation.patientInfo?.evaluationDate || 'N/A');
            const evaluationId = this.getEvaluationId(evaluation);
            const sourceLabel = evaluation.source === 'firebase'
                ? '☁️ Firebase'
                : (evaluation.source === 'local' || evaluation.localOnly)
                    ? '💾 Local'
                    : '—';

            Object.entries(evaluation.responses || {}).forEach(([questionId, response]) => {
                const questionNumber = parseInt(String(questionId).replace(/\D/g, ''), 10);
                const questionText = response?.question || `Questão ${questionNumber || questionId}`;
                const score = typeof response === 'number'
                    ? response
                    : (typeof response?.score === 'number' ? response.score : null);

                detailRows.push({
                    evaluationId,
                    evaluationDateObj,
                    evaluationDateDisplay,
                    patientName,
                    evaluatorName,
                    questionNumber,
                    questionId,
                    questionText,
                    score,
                    sourceLabel
                });
            });
        });

        if (!detailRows.length) {
            return {
                countLabel: '0 respostas encontradas',
                html: `
                    <div class="analytics-empty">
                        <h4>Nenhuma resposta encontrada</h4>
                        <p>Complete uma avaliação ou ajuste os filtros para visualizar as respostas.</p>
                    </div>
                `
            };
        }

        detailRows.sort((a, b) => {
            const dateA = a.evaluationDateObj ? a.evaluationDateObj.getTime() : 0;
            const dateB = b.evaluationDateObj ? b.evaluationDateObj.getTime() : 0;
            if (dateA !== dateB) {
                return dateA - dateB;
            }
            return (a.questionNumber || 0) - (b.questionNumber || 0);
        });

        const duplicateClass = (evaluationId) => duplicateIds.has(evaluationId) ? 'duplicate-row' : '';

        const rowsHtml = detailRows.map(row => `
            <tr class="${duplicateClass(row.evaluationId)}" data-evaluation-id="${this.escapeHtml(row.evaluationId)}">
                <td>${this.escapeHtml(row.evaluationId)}</td>
                <td>${this.escapeHtml(row.patientName)}</td>
                <td>${this.escapeHtml(row.evaluationDateDisplay)}</td>
                <td>${row.questionNumber || this.escapeHtml(row.questionId)}</td>
                <td>${this.escapeHtml(row.questionText)}</td>
                <td>${row.score ?? '—'}</td>
                <td>${row.sourceLabel}</td>
            </tr>
        `).join('');

        return {
            countLabel: `${detailRows.length} respostas`,
            html: `
                <div class="analytics-table-wrapper analytics-detailed-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Avaliação</th>
                                <th>Paciente</th>
                                <th>Data</th>
                                <th>Questão</th>
                                <th>Descrição</th>
                                <th>Pontuação</th>
                                <th>Origem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `
        };
    }

    findDuplicateEvaluations(evaluations) {
        const counter = new Map();
        evaluations.forEach(evaluation => {
            // Usar chave de comparação sem timestamp para detectar duplicatas
            const comparisonKey = this.getEvaluationComparisonKey(evaluation);
            if (!comparisonKey) return;
            counter.set(comparisonKey, (counter.get(comparisonKey) || 0) + 1);
        });

        return Array.from(counter.entries())
            .filter(([, count]) => count > 1)
            .map(([id, count]) => ({ id, count }));
    }

    renderDuplicateBanner(duplicates) {
        if (!duplicates.length) return '';

        const totalDuplicated = duplicates.reduce((sum, item) => sum + item.count, 0);
        const listItems = duplicates.map(item => `
            <li>
                <code>${this.escapeHtml(item.id)}</code> • ${item.count} registros
            </li>
        `).join('');

        return `
            <div class="analytics-warning">
                <div class="analytics-warning-content">
                    <strong>⚠️ Avaliações duplicadas detectadas</strong>
                    <p>Identificamos ${duplicates.length} avaliação(ões) com múltiplas cópias (${totalDuplicated} registros no total).</p>
                    <ul>${listItems}</ul>
                </div>
                <div class="analytics-warning-actions">
                    <button class="btn-primary" onclick="window.terapeutaPanel.runDeduplication()">
                        ♻️ Corrigir duplicados agora
                    </button>
                </div>
            </div>
        `;
    }

    getEvaluationId(evaluation) {
        if (!evaluation) return null;
        if (evaluation.evaluationId) return evaluation.evaluationId;

        if (this.firebaseManager && typeof this.firebaseManager.generateEvaluationIdFromData === 'function') {
            return this.firebaseManager.generateEvaluationIdFromData(evaluation);
        }

        const name = (evaluation.patientInfo?.name || 'avaliacao')
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        const rawDate = evaluation.patientInfo?.evaluationDate ||
            evaluation.createdAt ||
            new Date().toISOString();

        const datePart = String(rawDate).split('T')[0];

        // Incluir timestamp para manter compatibilidade com novo formato
        const timestamp = evaluation.createdAt || evaluation.timestamp || new Date().toISOString();
        const timestampHash = timestamp.replace(/[^0-9]/g, '').slice(0, 10);

        return `${name}_${datePart}_${timestampHash}`;
    }

    getEvaluationComparisonKey(evaluation) {
        // Retorna chave sem timestamp para detectar duplicatas
        if (!evaluation) return null;

        const name = (evaluation.patientInfo?.name || 'avaliacao')
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');

        const rawDate = evaluation.patientInfo?.evaluationDate ||
            evaluation.evaluationDate ||
            (evaluation.createdAt ? new Date(evaluation.createdAt).toISOString().split('T')[0] : null) ||
            new Date().toISOString().split('T')[0];

        return `${name}_${rawDate}`;
    }

    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatPercentage(value) {
        if (!Number.isFinite(value)) return '0%';
        return `${value.toFixed(1)}%`;
    }

    formatScore(value) {
        if (!Number.isFinite(value)) return '0';
        return value.toFixed(1);
    }

    formatDate(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return 'N/A';
        }
        return date.toLocaleDateString('pt-BR');
    }

    updateAnalyticsSummary(rows, filteredEvaluations, metric = 'averagePercent', grouping = 'patient') {
        if (!this.analyticsControls) return;

        const summary = this.analyticsControls.summary || {};
        const totals = this.calculateGlobalAnalyticsTotals(filteredEvaluations || []);

        if (summary.total) {
            summary.total.textContent = totals.totalEvaluations;
        }

        if (summary.averagePercent) {
            summary.averagePercent.textContent = this.formatPercentage(totals.averagePercent || 0);
        }

        if (summary.bestGroup) {
            if (!rows.length) {
                summary.bestGroup.textContent = '-';
            } else {
                const topRow = this.sortAnalyticsRows(rows, metric)[0];
                const metricValue = (() => {
                    switch (metric) {
                        case 'averageScore':
                            return `${this.formatScore(topRow.averageScore)}`;
                        case 'count':
                            return `${topRow.count}`;
                        case 'lastScore':
                            return this.formatPercentage(topRow.lastScore);
                        case 'averagePercent':
                        default:
                            return this.formatPercentage(topRow.averagePercent);
                    }
                })();
                summary.bestGroup.textContent = `${topRow.label} • ${metricValue}`;
            }
        }
    }

    calculateGlobalAnalyticsTotals(evaluations) {
        if (!evaluations.length) {
            return { totalEvaluations: 0, averagePercent: 0 };
        }

        let totalScore = 0;
        let maxScore = 0;

        evaluations.forEach(evaluation => {
            const metrics = this.extractEvaluationScore(evaluation);
            totalScore += metrics.totalScore;
            maxScore += metrics.maxScore;
        });

        return {
            totalEvaluations: evaluations.length,
            averagePercent: maxScore > 0 ? (totalScore / maxScore) * 100 : 0
        };
    }

    parseEvaluationDate(evaluation) {
        const dateStr = evaluation.patientInfo?.evaluationDate || evaluation.createdAt;
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    generateEvaluationKey(evaluation) {
        const patient = evaluation.patientInfo?.name || 'unknown';
        const date = evaluation.patientInfo?.evaluationDate || evaluation.createdAt || '';
        return `${patient}__${date}`;
    }

    capitalize(text) {
        if (!text || typeof text !== 'string') return text;
        return text.charAt(0).toUpperCase() + text.slice(1);
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

    showLoading(show, options = {}) {
        ui.setGlobalLoader(show, { text: options.text || 'Carregando...' });
    }

    updateLastSyncTime() {
        const syncTimeElement = document.getElementById('last-sync-time');
        if (syncTimeElement) {
            syncTimeElement.textContent = new Date().toLocaleString('pt-BR');
        }

        const insightSync = document.getElementById('insight-last-sync');
        if (insightSync) {
            insightSync.textContent = new Date().toLocaleTimeString('pt-BR');
        }
    }

    updateQuickInsights(evaluations = []) {
        const pendingElement = document.getElementById('insight-pending-queue');
        if (pendingElement) {
            const pendingCount = evaluations.filter(item => item?.localOnly || item?.source === 'local').length;
            pendingElement.textContent = pendingCount;
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Atualizar botões de navegação
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetNavButton = document.querySelector(`[data-view="${view}"]`);
        if (targetNavButton) {
            targetNavButton.classList.add('active');
        }
        
        // Mostrar conteúdo apropriado
        document.querySelectorAll('.view-content').forEach(content => {
            if (content) {
                content.style.display = 'none';
            }
        });
        const targetView = document.getElementById(`${view}-view`);
        if (targetView) {
            targetView.style.display = 'block';
        }
        
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

    async runDeduplication() {
        console.log('♻️ Terapeuta: Correção de duplicados solicitada pelo usuário.');
        if (this.firebaseManager.connectionStatus !== 'connected') {
            this.showNotification('Conecte-se ao Firebase para corrigir duplicadas.', 'warning');
            return;
        }

        this.showLoading(true);
        this.showNotification('Iniciando correção de duplicatas...', 'info');

        try {
            const result = await this.firebaseManager.deduplicateEvaluations();
            this.showNotification(
                `Correção concluída: ${result.removed} duplicata(s) removida(s).`,
                result.removed > 0 ? 'success' : 'info'
            );
            console.log('♻️ Terapeuta: Resultado da deduplicação manual', result);
            await this.refreshData(true);
        } catch (error) {
            console.error('❌ Erro ao remover duplicadas:', error);
            this.showNotification('Erro ao remover duplicadas: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Método para visualizar detalhes completos de uma avaliação
    async viewEvaluationDetails(evaluationId) {
        console.log('🔍 Visualizando detalhes da avaliação:', evaluationId);

        // Buscar a avaliação específica
        const evaluations = await this.firebaseManager.getAllEvaluations();
        const evaluation = evaluations.find(e =>
            e.id === evaluationId ||
            e.evaluationId === evaluationId ||
            e.timestamp === evaluationId
        );

        if (!evaluation) {
            this.showNotification('Avaliação não encontrada', 'error');
            return;
        }

        // Chamar o método do ReportsManager para mostrar os detalhes
        if (window.reportsManager && typeof window.reportsManager.showEvaluationDetails === 'function') {
            window.reportsManager.showEvaluationDetails(evaluation);
        } else {
            this.showNotification('Sistema de relatórios não disponível', 'error');
        }
    }

    // Método para gerar PDI (Plano de Desenvolvimento de Intervenção)
    async generatePDI(evaluationId) {
        console.log('📋 Gerando PDI para avaliação:', evaluationId);

        // Buscar a avaliação específica
        const evaluations = await this.firebaseManager.getAllEvaluations();
        const evaluation = evaluations.find(e =>
            e.id === evaluationId ||
            e.evaluationId === evaluationId ||
            e.timestamp === evaluationId
        );

        if (!evaluation) {
            this.showNotification('Avaliação não encontrada', 'error');
            return;
        }

        // Chamar o método do ReportsManager para mostrar o gerador de PDI
        if (window.reportsManager && typeof window.reportsManager.showPDIGenerator === 'function') {
            window.reportsManager.showPDIGenerator(evaluation);
        } else {
            this.showNotification('Sistema de relatórios não disponível', 'error');
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

attachAnalyticsModule(TerapeutaPanelMelhorado.prototype);

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
