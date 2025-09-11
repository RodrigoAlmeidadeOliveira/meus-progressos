// Script melhorado com salvamento robusto e verificação de conexão
// Sistema de backup triplo: Firebase + localStorage + sessionStorage

// Gerenciador de Firebase com verificação de conexão
class FirebaseManagerMelhorado {
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
            console.log('🔄 Iniciando conexão com Firebase...');
            
            // Aguardar Firebase estar disponível
            let attempts = 0;
            while (!window.firebase && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!window.firebase) {
                throw new Error('Firebase não carregou após 3 segundos');
            }
            
            this.db = window.firebase.db;
            this.auth = window.firebase.auth;
            
            // Verificar se está realmente conectado
            await this.verificarConexao();
            
            this.initialized = true;
            this.connectionStatus = 'connected';
            console.log('✅ Firebase conectado com sucesso');
            this.notifyStatusChange('connected');
            
        } catch (error) {
            console.warn('⚠️ Firebase não disponível, usando modo offline:', error);
            this.initialized = false;
            this.connectionStatus = 'offline';
            this.notifyStatusChange('offline');
        }
    }

    async verificarConexao() {
        try {
            const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            // Tentar fazer uma leitura simples para verificar conexão
            const testCollection = collection(this.db, 'test-connection');
            await getDocs(testCollection);
            
            return true;
        } catch (error) {
            console.warn('⚠️ Erro ao verificar conexão:', error);
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

    async saveEvaluation(data) {
        console.log('💾 Iniciando salvamento com backup triplo...');
        
        const saveResult = {
            firebase: false,
            localStorage: false,
            sessionStorage: false,
            success: false,
            errors: []
        };
        
        // SEMPRE salvar localmente primeiro
        try {
            this.saveToLocalStorage(data);
            saveResult.localStorage = true;
            console.log('✅ Salvo no localStorage');
        } catch (error) {
            console.error('❌ Erro ao salvar no localStorage:', error);
            saveResult.errors.push(`localStorage: ${error.message}`);
        }
        
        // Salvar no sessionStorage como backup adicional
        try {
            this.saveToSessionStorage(data);
            saveResult.sessionStorage = true;
            console.log('✅ Salvo no sessionStorage');
        } catch (error) {
            console.error('❌ Erro ao salvar no sessionStorage:', error);
            saveResult.errors.push(`sessionStorage: ${error.message}`);
        }
        
        // Tentar salvar no Firebase se conectado
        if (this.initialized && this.connectionStatus === 'connected') {
            try {
                console.log('☁️ Tentando salvar no Firebase...');
                const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const docData = {
                    ...data,
                    createdAt: new Date().toISOString(),
                    patientId: this.generatePatientId(data.patientInfo.name),
                    evaluationId: `${data.patientInfo.name.replace(/\s+/g, '_')}_${data.patientInfo.evaluationDate}_${Date.now()}`
                };
                
                const docRef = await addDoc(collection(this.db, 'evaluations'), docData);
                saveResult.firebase = true;
                saveResult.firebaseId = docRef.id;
                console.log('✅ Salvo no Firebase com ID:', docRef.id);
                
            } catch (error) {
                console.error('❌ Erro ao salvar no Firebase:', error);
                saveResult.errors.push(`Firebase: ${error.message}`);
            }
        } else {
            console.log('⚠️ Firebase offline, dados salvos apenas localmente');
            saveResult.errors.push('Firebase offline');
        }
        
        // Determinar sucesso
        saveResult.success = saveResult.localStorage || saveResult.sessionStorage || saveResult.firebase;
        
        return saveResult;
    }

    saveToLocalStorage(data) {
        const key = `evaluation_${data.patientInfo.evaluationDate}_${Date.now()}`;
        const existingData = this.getFromLocalStorage();
        existingData[key] = data;
        localStorage.setItem('questionnaireData', JSON.stringify(existingData));
        
        // Também salvar em uma chave de backup
        localStorage.setItem(`backup_${key}`, JSON.stringify(data));
    }

    saveToSessionStorage(data) {
        const key = `session_evaluation_${Date.now()}`;
        sessionStorage.setItem(key, JSON.stringify(data));
        
        // Manter lista de avaliações na sessão
        let sessionList = JSON.parse(sessionStorage.getItem('evaluation_list') || '[]');
        sessionList.push(key);
        sessionStorage.setItem('evaluation_list', JSON.stringify(sessionList));
    }

    getFromLocalStorage() {
        const saved = localStorage.getItem('questionnaireData');
        return saved ? JSON.parse(saved) : {};
    }

    generatePatientId(name) {
        return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    async saveDraft(data) {
        console.log('📝 Salvando rascunho...');
        
        // Salvar no localStorage
        localStorage.setItem('questionnaireAutoSave', JSON.stringify(data));
        localStorage.setItem('lastAutoSave', new Date().toISOString());
        
        // Salvar no sessionStorage também
        sessionStorage.setItem('currentDraft', JSON.stringify(data));
        
        // Se conectado, tentar salvar rascunho no Firebase
        if (this.initialized && this.connectionStatus === 'connected') {
            try {
                const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const draftData = {
                    ...data,
                    isDraft: true,
                    draftSavedAt: new Date().toISOString()
                };
                
                await addDoc(collection(this.db, 'drafts'), draftData);
                console.log('✅ Rascunho salvo no Firebase');
                return { success: true, location: 'cloud' };
            } catch (error) {
                console.warn('⚠️ Não foi possível salvar rascunho no Firebase:', error);
            }
        }
        
        return { success: true, location: 'local' };
    }
}

// Gerenciador do formulário com salvamento automático melhorado
class ParentFormManagerMelhorado {
    constructor() {
        this.form = document.getElementById('questionnaire-form');
        this.questionData = this.initializeQuestionData();
        this.questionGroups = this.initializeQuestionGroups();
        this.tabData = this.initializeTabData();
        
        this.currentMainTab = 'comunicativas';
        this.currentSubTab = 'contato-visual';
        
        // Inicializar Firebase Manager melhorado
        this.firebaseManager = new FirebaseManagerMelhorado();
        
        // Auto-save timer
        this.autoSaveInterval = null;
        this.lastSaveTime = null;
        
        this.init();
    }

    init() {
        this.generateQuestions();
        this.setupTabNavigation();
        this.setupEventListeners();
        this.setupAutoSave();
        this.setupConnectionMonitor();
        this.updateAllProgress();
        this.loadSavedData();
        this.setTodayDate();
        this.checkForUnsavedData();
    }

    setupEventListeners() {
        // Submit do formulário
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Botão salvar rascunho
        const saveDraftButton = document.getElementById('save-draft');
        if (saveDraftButton) {
            saveDraftButton.addEventListener('click', () => this.saveDraft());
        }
        
        // Botão limpar formulário
        const clearButton = document.getElementById('clear-form');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearForm());
        }
        
        // Detectar mudanças no formulário
        this.form.addEventListener('change', () => {
            this.markAsUnsaved();
            this.updateAllProgress();
        });
        
        // Avisar antes de sair se houver dados não salvos
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
            }
        });
    }

    setupAutoSave() {
        // Auto-save a cada 30 segundos
        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.autoSave();
            }
        }, 30000);
        
        // Auto-save ao mudar de aba
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.hasUnsavedChanges()) {
                this.autoSave();
            }
        });
    }

    setupConnectionMonitor() {
        // Monitorar status da conexão
        this.firebaseManager.onStatusChange((status) => {
            this.updateConnectionIndicator(status);
        });
        
        // Verificar conexão periodicamente
        setInterval(() => {
            this.firebaseManager.verificarConexao();
        }, 60000); // A cada minuto
        
        // Monitorar conexão de internet
        window.addEventListener('online', () => {
            console.log('🌐 Conexão com internet restaurada');
            this.firebaseManager.initFirebase();
        });
        
        window.addEventListener('offline', () => {
            console.log('📵 Sem conexão com internet');
            this.updateConnectionIndicator('offline');
        });
    }

    updateConnectionIndicator(status) {
        // Criar ou atualizar indicador de status
        let indicator = document.getElementById('connection-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: bold;
                z-index: 9999;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        switch(status) {
            case 'connected':
                indicator.innerHTML = '☁️ Conectado';
                indicator.style.background = '#d4edda';
                indicator.style.color = '#155724';
                break;
            case 'offline':
                indicator.innerHTML = '💾 Modo Offline';
                indicator.style.background = '#fff3cd';
                indicator.style.color = '#856404';
                break;
            case 'checking':
                indicator.innerHTML = '🔄 Verificando...';
                indicator.style.background = '#d1ecf1';
                indicator.style.color = '#0c5460';
                break;
        }
    }

    hasUnsavedChanges() {
        const lastSave = localStorage.getItem('lastFormSave');
        const currentData = JSON.stringify(this.collectFormData());
        const savedData = localStorage.getItem('lastFormData');
        
        return currentData !== savedData;
    }

    markAsUnsaved() {
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
            indicator.textContent = '• Não salvo';
            indicator.style.color = '#dc3545';
        }
    }

    markAsSaved() {
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
            indicator.textContent = '✓ Salvo';
            indicator.style.color = '#28a745';
        }
        
        // Salvar estado atual
        localStorage.setItem('lastFormData', JSON.stringify(this.collectFormData()));
        localStorage.setItem('lastFormSave', new Date().toISOString());
    }

    async autoSave() {
        console.log('🔄 Salvamento automático...');
        const formData = this.collectFormData();
        
        // Salvar localmente sempre
        localStorage.setItem('questionnaireAutoSave', JSON.stringify(formData));
        localStorage.setItem('lastAutoSave', new Date().toISOString());
        
        // Tentar salvar rascunho no Firebase
        const result = await this.firebaseManager.saveDraft(formData);
        
        if (result.success) {
            this.showAutoSaveNotification(result.location);
            this.markAsSaved();
        }
    }

    showAutoSaveNotification(location) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 20px;
            background: #d4edda;
            color: #155724;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        notification.textContent = location === 'cloud' 
            ? '☁️ Rascunho salvo na nuvem' 
            : '💾 Rascunho salvo localmente';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    async saveDraft() {
        const formData = this.collectFormData();
        const result = await this.firebaseManager.saveDraft(formData);
        
        if (result.success) {
            const message = result.location === 'cloud'
                ? '✅ Rascunho salvo na nuvem com sucesso!'
                : '✅ Rascunho salvo localmente com sucesso!';
            
            alert(message + '\n\nVocê pode continuar preenchendo mais tarde.');
            this.markAsSaved();
        } else {
            alert('❌ Erro ao salvar rascunho. Tente novamente.');
        }
    }

    checkForUnsavedData() {
        // Verificar se há dados não enviados de sessões anteriores
        const unsavedKeys = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('backup_evaluation_')) {
                unsavedKeys.push(key);
            }
        }
        
        if (unsavedKeys.length > 0) {
            const recover = confirm(`⚠️ Foram encontradas ${unsavedKeys.length} avaliação(ões) não enviada(s).\n\nDeseja recuperar e enviar agora?`);
            
            if (recover) {
                this.recoverUnsavedData(unsavedKeys);
            }
        }
    }

    async recoverUnsavedData(keys) {
        console.log('🔄 Recuperando dados não enviados...');
        let recovered = 0;
        let sent = 0;
        
        for (const key of keys) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data) {
                    recovered++;
                    
                    // Tentar enviar ao Firebase
                    const result = await this.firebaseManager.saveEvaluation(data);
                    if (result.firebase) {
                        sent++;
                        // Remover backup se enviado com sucesso
                        localStorage.removeItem(key);
                    }
                }
            } catch (error) {
                console.error(`Erro ao recuperar ${key}:`, error);
            }
        }
        
        alert(`📊 Recuperação concluída:\n\n✅ ${recovered} avaliação(ões) recuperada(s)\n☁️ ${sent} enviada(s) para a nuvem`);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const formData = this.collectFormData();

        // Mostrar loading
        const submitButton = document.getElementById('submit-evaluation');
        const originalText = submitButton.textContent;
        submitButton.textContent = '💾 Salvando...';
        submitButton.disabled = true;

        try {
            console.log('📤 Iniciando envio da avaliação...');
            const result = await this.firebaseManager.saveEvaluation(formData);
            
            console.log('📊 Resultado do salvamento:', result);
            
            if (result.success) {
                let message = '';
                
                if (result.firebase) {
                    message = `✅ Avaliação salva com sucesso na nuvem!\nID: ${result.firebaseId}`;
                } else if (result.localStorage && result.sessionStorage) {
                    message = '⚠️ Avaliação salva localmente (backup duplo).\nSerá sincronizada quando a conexão for restaurada.';
                } else if (result.localStorage) {
                    message = '⚠️ Avaliação salva localmente.\nSerá sincronizada quando a conexão for restaurada.';
                } else {
                    message = '⚠️ Avaliação salva temporariamente.\nNão feche o navegador!';
                }
                
                if (result.errors.length > 0) {
                    message += '\n\nDetalhes:\n' + result.errors.join('\n');
                }
                
                alert(message);
                
                // Limpar formulário apenas se salvou em algum lugar
                if (result.localStorage) {
                    localStorage.removeItem('questionnaireAutoSave');
                    localStorage.removeItem('lastFormData');
                }
                
                this.showSuccessMessage(result);
                
            } else {
                throw new Error('Falha ao salvar em todos os locais');
            }
        } catch (error) {
            console.error('❌ Erro crítico ao salvar:', error);
            alert(`❌ Erro ao salvar avaliação: ${error.message}\n\nOs dados foram preservados. Tente novamente.`);
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    showSuccessMessage(result) {
        document.querySelector('.container > form').style.display = 'none';
        document.querySelector('.container > header').style.display = 'none';
        document.querySelector('.scale-info').style.display = 'none';
        
        const successMessage = document.getElementById('success-message');
        
        let statusIcon = '✅';
        let statusTitle = 'Avaliação Salva com Sucesso!';
        let statusDetails = '';
        
        if (result.firebase) {
            statusIcon = '☁️';
            statusTitle = 'Avaliação Enviada para a Nuvem!';
            statusDetails = 'Os dados foram salvos com segurança no banco de dados.';
        } else if (result.localStorage) {
            statusIcon = '💾';
            statusTitle = 'Avaliação Salva Localmente!';
            statusDetails = 'Os dados foram salvos no seu dispositivo e serão sincronizados quando a conexão for restaurada.';
        }
        
        successMessage.innerHTML = `
            <h2 style="font-size: 3em; text-align: center;">${statusIcon}</h2>
            <h3>${statusTitle}</h3>
            <p>${statusDetails}</p>
            <div class="save-summary" style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Resumo do Salvamento:</h4>
                <ul style="text-align: left;">
                    <li>Firebase: ${result.firebase ? '✅ Salvo' : '❌ Não disponível'}</li>
                    <li>Local Storage: ${result.localStorage ? '✅ Salvo' : '❌ Falhou'}</li>
                    <li>Session Storage: ${result.sessionStorage ? '✅ Salvo' : '❌ Falhou'}</li>
                </ul>
            </div>
            <div class="success-actions">
                <button type="button" onclick="location.reload()" class="btn-primary">📝 Nova Avaliação</button>
                <a href="verificar-dados-salvos.html" class="btn-secondary">🔍 Verificar Dados Salvos</a>
                <a href="terapeuta.html" class="btn-secondary">👨‍⚕️ Área do Terapeuta</a>
            </div>
        `;
        
        successMessage.style.display = 'block';
        successMessage.scrollIntoView({ behavior: 'smooth' });
    }

    // Manter todos os outros métodos existentes...
    
    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('evaluation-date').value = today;
    }

    initializeTabData() {
        return {
            'comunicativas': {
                name: 'Habilidades Comunicativas',
                subTabs: ['contato-visual', 'comunicacao-alternativa', 'linguagem-expressiva', 'linguagem-receptiva'],
                totalQuestions: 40
            },
            'sociais': {
                name: 'Habilidades Sociais', 
                subTabs: ['expressao-facial', 'imitacao', 'atencao-compartilhada', 'brincar'],
                totalQuestions: 40
            },
            'funcionais': {
                name: 'Habilidades Funcionais',
                subTabs: ['auto-cuidado', 'vestir-se', 'uso-banheiro'],
                totalQuestions: 29
            },
            'emocionais': {
                name: 'Habilidades Emocionais',
                subTabs: ['controle-inibitorio', 'flexibilidade', 'resposta-emocional', 'empatia'],
                totalQuestions: 40
            }
        };
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

    initializeQuestionData() {
        return {
            'contato-visual': [
                "Olhar para o adulto quando chamada pelo nome",
                "Manter contato ocular por pelo menos 1 segundo, quando chamada pelo nome",
                "Olhar nos olhos de uma pessoa durante uma interação (aprox. 3 segundos)",
                "Olhar nos olhos de uma pessoa durante 5 segundos",
                "Olhar quando engajada numa brincadeira",
                "Olhar à distância de 3 metros",
                "Olhar à distância de 5 metros",
                "Olhar à distância de 5 metros e engajada numa brincadeira",
                "Olhar para mais de uma pessoa (duas pessoas chamam a criança alternadamente)",
                "Olhar para mais de uma pessoa alternadamente quando engajada em alguma brincadeira"
            ],
            'comunicacao-alternativa': [
                "Estende a mão para pegar o que deseja",
                "Aponta para o que deseja",
                "Aponta a uma distância de aproximadamente 30 cm",
                "Aponta espontaneamente para mostrar algo ou fazer pedidos",
                "Faz gestos para se comunicar",
                "Consegue utilizar figuras/fotos para fazer pedidos",
                "Utiliza a comunicação por figuras, selecionando corretamente a figura correspondente ao pedido (discriminação)",
                "Consegue pegar uma figura correspondente ao desejo mesmo esta estando a uma distância de 5 metros",
                "Expressa verbos por meio de figuras",
                "Expressa sentimentos por meio de figuras (Me sinto triste, alegre...)"
            ],
            'linguagem-expressiva': [
                "Emite algum som com sentido comunicativo",
                "Emite sons direcionados quando quer alguma coisa",
                "Consegue imitar sons",
                "Emite 10 sons diferentes",
                "Pede por seus objetos e atividades favoritas",
                "Nomeia pessoas familiares",
                "Nomeia figuras",
                "Nomeia objetos",
                "Completa trechos de músicas conhecidas",
                "Faz perguntas e se envolve em conversas simples"
            ],
            'linguagem-receptiva': [
                "Segue instrução de 1 passo",
                "Segue instruções de 2 passos",
                "Segue sequência de instruções de 3 passos",
                "Identifica partes do corpo humano",
                "Identifica pessoas familiares",
                "Identifica pelo menos 10 figuras do seu cotidiano",
                "Identifica pelo menos 10 objetos presentes no seu dia a dia",
                "Responde perguntas simples (o que você quer?)",
                "Responde duas perguntas simples (qual cor você quer e o que você quer beber?)",
                "Responde perguntas complexas (qual seu time? Qual sua cor favorita?)"
            ],
            'expressao-facial': [
                "Imita expressões faciais",
                "Expressões faciais condizentes com o momento, com qualquer intensidade",
                "Tem episódios de expressão facial adequada",
                "Breves momentos de expressão facial durante interação",
                "Apresenta expressões faciais de acordo com o momento, porém exageradamente",
                "Identifica e diferencia expressões faciais de forma exagerada",
                "Emite algumas expressões faciais",
                "Utiliza o sorriso de maneira adequada durante uma interação social",
                "Demonstra com iniciativa uma gama de expressões faciais",
                "Responde de forma adequada às expressões faciais de outras pessoas"
            ],
            'imitacao': [
                "Comportamento imitativo com ajuda física e verbal",
                "Imitação simples com objeto",
                "Imita movimentos fonoarticulatórios",
                "Imita comportamentos de coordenação grossa sem ajuda",
                "Imita comportamentos simples sem ajuda",
                "Aprende comportamentos de autoajuda básicos por observação",
                "Aprende brincadeiras e esportes iniciais",
                "Consegue imitar três tarefas simples em sequência",
                "Consegue imitar comportamentos complexos de outras pessoas",
                "Aprende novos comportamentos sem ser especificamente ensinado a fazê-lo"
            ],
            'atencao-compartilhada': [
                "Olha para um objeto compartilhado",
                "Segue um ponto de deslocamento (ou objeto em movimento)",
                "Mantém ao menos um segundo de atenção nas brincadeiras propostas",
                "Demonstra interesse por um brinquedo de outra pessoa",
                "Inclui outra pessoa na brincadeira",
                "Segue instruções simples durante brincadeira",
                "Aguarda a resposta do falante, ao menos 30 seg, sem dispersar-se",
                "Mostra ao par algo que viu, aconteceu ou fez",
                "Junta-se a outra pessoa por iniciativa própria",
                "Brinca trocando turnos respeitando as regras do jogo e a vez de cada um"
            ],
            'brincar': [
                "Engaja-se em jogos corporais",
                "Manuseia e brinca corretamente com brinquedos giratórios ou de movimentos",
                "Brinca com jogos de encaixe",
                "Brinca com quebra-cabeças",
                "Brinca cooperativamente, ajudando o par a completar a atividade",
                "Brinca alternando turnos (minha vez/sua vez)",
                "Usa os brinquedos do playground de forma correta",
                "Manuseia fantoches e bonecos",
                "Se engaja em brincadeiras de casa, com criação de personagens",
                "Presta atenção em histórias contadas"
            ],
            'auto-cuidado': [
                "Escova dentes mesmo que com ajuda física",
                "Escova os dentes 3 vezes ao dia sem necessidade de ajuda",
                "Compreende a necessidade do uso do talco ou desodorante",
                "Lava as mãos antes das refeições",
                "Sabe pentear o cabelo",
                "Seca-se após o banho",
                "Realiza higiene íntima durante o banho",
                "Lava todas as partes do corpo durante o banho",
                "Toma banho sozinho"
            ],
            'vestir-se': [
                "Retira calça ou short",
                "Retira camisa ou blusa",
                "Ajuda a colocar calça/bermuda levantando os pés e puxando a roupa",
                "Ajuda a colocar camisa/blusa esticando os braços e descendo a roupa",
                "Coloca tênis ou sapato",
                "Amarra o cadarço",
                "Abotoa e desabotoa camisa",
                "Coloca a meia",
                "Veste a parte inferior (calça, bermuda...)",
                "Veste a parte superior (blusa, camisa...)"
            ],
            'uso-banheiro': [
                "Sente-se incomodado quando faz xixi/cocô na roupa ou fralda",
                "Retira roupa ou fralda para fazer xixi/cocô",
                "Faz xixi no penico/vaso sanitário quando colocado por um adulto",
                "Avisa o adulto a necessidade de fazer xixi",
                "Não faz xixi na cama",
                "Faz cocô no troninho/vaso sanitário quando colocado por um adulto",
                "Avisa ao adulto a necessidade de fazer cocô",
                "Tem a iniciativa de ir ao banheiro para fazer xixi e realiza sozinho",
                "Tem a iniciativa de ir ao banheiro para fazer o cocô e realiza sozinho",
                "Faz xixi e cocô sozinho e depois realiza a higiene pessoal"
            ],
            'controle-inibitorio': [
                "Permanece sentado por pelo menos 1 segundo com reforçador",
                "Permanece sentado por menos de 3 minutos com reforçador",
                "Permanece sentado por menos de 10 minutos com reforçador",
                "Consegue aguardar ao menos 30 segundos para receber algo que deseja",
                "Aguarda sem resistência ao menos 1 minuto por algo que está esperando que aconteça",
                "Aguarda sentado por pelo menos 3 minutos sem resistência, sem uso de reforçador",
                "Realiza as refeições sentado",
                "Consegue aguardar sua vez na fila pelo menos 10 minutos, sem comportamento inadequado",
                "Consegue participar efetivamente de brincadeiras em grupo, aguardando sua vez",
                "Lida bem com derrotas e com o término das atividades prazerosas"
            ],
            'flexibilidade': [
                "Com insistência consegue aceitar qualquer tentativa de mudança ou ajuda em atividades",
                "Resiste ativamente à mudança na rotina mas é possível modificar sua antiga atividade",
                "Permite participações nas atividades interativas rígidas/repetitivas escolhidas por ele",
                "Lida fácil e calmamente com limites impostos dentro de um ambiente com suporte",
                "Interage facilmente, demonstrando interesse pela atividade dos outros",
                "Com ajuda, consegue lidar com a exposição a diferentes estímulos sensoriais em ambientes apropriados para a idade",
                "Permite que você o auxilie nas atividades interativas e repetitivas escolhidas por ele",
                "Consegue lidar com pequenas mudanças na rotina",
                "Lida fácil e calmamente com quase todas as transições para novos ambientes ou novas atividades/brincadeiras",
                "Consegue lidar com pequenas frustrações sem emissão de comportamentos inadequados"
            ],
            'resposta-emocional': [
                "As respostas emocionais são intensas mas adequadas à situação",
                "É possível compreender suas emoções mesmo que apresente algumas caretas e rigidez na ausência de estímulos",
                "É possível alterar o humor, com insistência",
                "Apresenta reações inibidas ou excessivas mas condizentes com a situação",
                "Demonstra emoções diferentes e flexíveis",
                "Em certas situações, apresenta reações exageradas para o evento",
                "Apresenta tipo de resposta emocional adequada, porém com grau alterado",
                "Consegue reconhecer as principais emoções e associar às situações cotidianas",
                "Resposta emocional adequada à situação",
                "Expressão facial, postura e conduta adequados à situação"
            ],
            'empatia': [
                "Consegue conter o impulso de pegar o que quer de outra pessoa, com a ajuda de um adulto",
                "Come seu lanche sem necessidade de ajuda para não pegar o lanche dos amigos/irmãos",
                "Aceita compartilhar brinquedos e doces com outras crianças, com ajuda física e verbal de um adulto",
                "Demonstra alteração emocional diante de outras crianças chorando",
                "Aceita a divisão de doces sem grandes explosões de raiva, quando feito por um adulto",
                "Divide guloseimas com outras crianças quando orientado por um adulto",
                "Tem iniciativa para dividir algo com outra pessoa",
                "Ajuda o par a concluir uma atividade, quando solicitado",
                "Consegue perceber o que outra pessoa está sentindo, através dos sinais emitidos",
                "Percebe os sentimentos de outra pessoa e oferece auxílio"
            ]
        };
    }

    generateQuestions() {
        Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
            const container = document.getElementById(`${groupInfo.key}-questions`);
            if (!container) return;

            const questions = this.questionData[groupInfo.key];
            
            questions.forEach((questionText, index) => {
                const questionNumber = groupInfo.questions[index];
                const questionElement = this.createQuestionElement(questionNumber, questionText);
                container.appendChild(questionElement);
            });
        });
    }

    createQuestionElement(questionNumber, questionText) {
        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        
        questionItem.innerHTML = `
            <div class="question-number">${questionNumber}</div>
            <div class="question-text">${questionText}</div>
            <div class="rating-group">
                <label>Pontuação:</label>
                <div class="rating-scale">
                    <div class="scale-label-start">Nunca</div>
                    <input type="radio" id="q${questionNumber}_1" name="q${questionNumber}" value="1">
                    <label for="q${questionNumber}_1">1</label>
                    <input type="radio" id="q${questionNumber}_2" name="q${questionNumber}" value="2">
                    <label for="q${questionNumber}_2">2</label>
                    <input type="radio" id="q${questionNumber}_3" name="q${questionNumber}" value="3">
                    <label for="q${questionNumber}_3">3</label>
                    <input type="radio" id="q${questionNumber}_4" name="q${questionNumber}" value="4">
                    <label for="q${questionNumber}_4">4</label>
                    <input type="radio" id="q${questionNumber}_5" name="q${questionNumber}" value="5">
                    <label for="q${questionNumber}_5">5</label>
                    <div class="scale-label-end">Sempre</div>
                </div>
            </div>
        `;
        
        // Add change event listeners to update progress and auto-save
        const inputs = questionItem.querySelectorAll('input[type="radio"]');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateAllProgress();
                this.markAsUnsaved();
            });
        });
        
        return questionItem;
    }

    setupTabNavigation() {
        // Tab navigation logic
        const mainTabs = document.querySelectorAll('.tab-button');
        const subTabs = document.querySelectorAll('.sub-tab-button');
        const prevButton = document.getElementById('prev-tab');
        const nextButton = document.getElementById('next-tab');

        // Main tabs
        mainTabs.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                this.switchMainTab(tabId);
            });
        });

        // Sub tabs
        subTabs.forEach(button => {
            button.addEventListener('click', () => {
                const subTabId = button.dataset.subtab;
                this.switchSubTab(subTabId);
            });
        });

        // Navigation buttons
        if (prevButton) {
            prevButton.addEventListener('click', () => this.navigatePrevious());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.navigateNext());
        }
    }

    switchMainTab(tabId) {
        // Remove active class from all main tabs
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Add active class to selected tab
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected tab content
        document.getElementById(`tab-${tabId}`).classList.add('active');
        
        this.currentMainTab = tabId;
        
        // Switch to first sub-tab
        const tabData = this.tabData[tabId];
        if (tabData && tabData.subTabs.length > 0) {
            this.switchSubTab(tabData.subTabs[0]);
        }
    }

    switchSubTab(subTabId) {
        // Hide all sub-tab contents in current main tab
        const currentMainTabContent = document.getElementById(`tab-${this.currentMainTab}`);
        if (currentMainTabContent) {
            currentMainTabContent.querySelectorAll('.sub-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all sub-tab buttons
            currentMainTabContent.querySelectorAll('.sub-tab-button').forEach(button => {
                button.classList.remove('active');
            });
            
            // Show selected sub-tab content
            const selectedSubTabContent = document.getElementById(`subtab-${subTabId}`);
            if (selectedSubTabContent) {
                selectedSubTabContent.classList.add('active');
            }
            
            // Add active class to selected sub-tab button
            const selectedSubTabButton = currentMainTabContent.querySelector(`[data-subtab="${subTabId}"]`);
            if (selectedSubTabButton) {
                selectedSubTabButton.classList.add('active');
            }
        }
        
        this.currentSubTab = subTabId;
        this.updateTabInfo();
    }

    navigatePrevious() {
        const currentTabData = this.tabData[this.currentMainTab];
        const currentSubTabIndex = currentTabData.subTabs.indexOf(this.currentSubTab);
        
        if (currentSubTabIndex > 0) {
            this.switchSubTab(currentTabData.subTabs[currentSubTabIndex - 1]);
        } else {
            // Go to previous main tab's last sub-tab
            const mainTabs = Object.keys(this.tabData);
            const currentMainTabIndex = mainTabs.indexOf(this.currentMainTab);
            
            if (currentMainTabIndex > 0) {
                const prevMainTab = mainTabs[currentMainTabIndex - 1];
                const prevTabData = this.tabData[prevMainTab];
                this.switchMainTab(prevMainTab);
                this.switchSubTab(prevTabData.subTabs[prevTabData.subTabs.length - 1]);
            }
        }
    }

    navigateNext() {
        const currentTabData = this.tabData[this.currentMainTab];
        const currentSubTabIndex = currentTabData.subTabs.indexOf(this.currentSubTab);
        
        if (currentSubTabIndex < currentTabData.subTabs.length - 1) {
            this.switchSubTab(currentTabData.subTabs[currentSubTabIndex + 1]);
        } else {
            // Go to next main tab's first sub-tab
            const mainTabs = Object.keys(this.tabData);
            const currentMainTabIndex = mainTabs.indexOf(this.currentMainTab);
            
            if (currentMainTabIndex < mainTabs.length - 1) {
                const nextMainTab = mainTabs[currentMainTabIndex + 1];
                this.switchMainTab(nextMainTab);
                this.switchSubTab(this.tabData[nextMainTab].subTabs[0]);
            }
        }
    }

    updateTabInfo() {
        const tabInfoElement = document.getElementById('current-tab-info');
        if (tabInfoElement) {
            const mainTabName = this.tabData[this.currentMainTab].name;
            const subTabName = this.getSubTabDisplayName(this.currentSubTab);
            tabInfoElement.textContent = `${mainTabName} - ${subTabName}`;
        }
    }

    getSubTabDisplayName(subTabId) {
        const displayNames = {
            'contato-visual': 'Contato Visual',
            'comunicacao-alternativa': 'Comunicação Alternativa',
            'linguagem-expressiva': 'Linguagem Expressiva',
            'linguagem-receptiva': 'Linguagem Receptiva',
            'expressao-facial': 'Expressão Facial',
            'imitacao': 'Imitação',
            'atencao-compartilhada': 'Atenção Compartilhada',
            'brincar': 'Brincar',
            'auto-cuidado': 'Auto Cuidado',
            'vestir-se': 'Vestir-se',
            'uso-banheiro': 'Uso do Banheiro',
            'controle-inibitorio': 'Controle Inibitório',
            'flexibilidade': 'Flexibilidade',
            'resposta-emocional': 'Resposta Emocional',
            'empatia': 'Empatia'
        };
        return displayNames[subTabId] || subTabId;
    }

    updateAllProgress() {
        this.updateMainProgress();
        this.updateTabProgress();
        this.updateSubTabProgress();
    }

    updateMainProgress() {
        const totalQuestions = Object.values(this.questionGroups).reduce((sum, group) => sum + group.questions.length, 0);
        const answeredQuestions = this.getAnsweredQuestionsCount();
        const percentage = Math.round((answeredQuestions / totalQuestions) * 100);
        
        const progressFill = document.getElementById('main-progress');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${percentage}% Concluído`;
        }
    }

    updateTabProgress() {
        Object.keys(this.tabData).forEach(tabId => {
            const tabData = this.tabData[tabId];
            const answeredCount = this.getAnsweredQuestionsCountForTab(tabId);
            const progressElement = document.getElementById(`progress-${tabId}`);
            
            if (progressElement) {
                progressElement.textContent = `${answeredCount}/${tabData.totalQuestions}`;
            }
        });
    }

    updateSubTabProgress() {
        Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
            const answeredCount = this.getAnsweredQuestionsCountForGroup(groupInfo.key);
            const progressElement = document.getElementById(`sub-progress-${groupInfo.key}`);
            
            if (progressElement) {
                progressElement.textContent = `${answeredCount}/${groupInfo.questions.length}`;
            }
        });
    }

    getAnsweredQuestionsCount() {
        const totalQuestions = Object.values(this.questionGroups).reduce((sum, group) => sum + group.questions.length, 0);
        let answered = 0;
        
        for (let i = 1; i <= totalQuestions; i++) {
            if (document.querySelector(`input[name="q${i}"]:checked`)) {
                answered++;
            }
        }
        
        return answered;
    }

    getAnsweredQuestionsCountForTab(tabId) {
        const tabData = this.tabData[tabId];
        let answered = 0;
        
        tabData.subTabs.forEach(subTabId => {
            answered += this.getAnsweredQuestionsCountForGroup(subTabId);
        });
        
        return answered;
    }

    getAnsweredQuestionsCountForGroup(groupKey) {
        let answered = 0;
        
        const group = Object.values(this.questionGroups).find(g => g.key === groupKey);
        if (!group) return 0;
        
        group.questions.forEach(questionNumber => {
            if (document.querySelector(`input[name="q${questionNumber}"]:checked`)) {
                answered++;
            }
        });
        
        return answered;
    }

    validateForm() {
        const patientName = document.getElementById('patient-name').value.trim();
        const evaluatorName = document.getElementById('evaluator-name').value.trim();
        const evaluatorEmail = document.getElementById('evaluator-email').value.trim();
        const evaluatorPhone = document.getElementById('evaluator-phone').value.trim();
        const evaluationDate = document.getElementById('evaluation-date').value;
        
        if (!patientName || !evaluatorName || !evaluatorEmail || !evaluatorPhone || !evaluationDate) {
            return false;
        }

        const totalQuestions = Object.values(this.questionGroups).reduce((sum, group) => sum + group.questions.length, 0);
        const missingQuestions = [];
        
        for (let i = 1; i <= totalQuestions; i++) {
            const response = document.querySelector(`input[name="q${i}"]:checked`);
            if (!response) {
                missingQuestions.push(i);
            }
        }

        if (missingQuestions.length > 0) {
            alert(`Por favor, responda às questões: ${missingQuestions.slice(0, 10).join(', ')}${missingQuestions.length > 10 ? '...' : ''}`);
            return false;
        }

        return true;
    }

    collectFormData() {
        const patientInfo = {
            name: document.getElementById('patient-name').value.trim(),
            evaluationDate: document.getElementById('evaluation-date').value
        };

        const evaluatorInfo = {
            name: document.getElementById('evaluator-name').value.trim(),
            email: document.getElementById('evaluator-email').value.trim(),
            phone: document.getElementById('evaluator-phone').value.trim()
        };

        const responses = {};
        const groupScores = {};

        // Collect responses and calculate group scores
        Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
            let groupTotal = 0;
            
            groupInfo.questions.forEach(questionNumber => {
                const response = document.querySelector(`input[name="q${questionNumber}"]:checked`);
                if (response) {
                    const score = parseInt(response.value);
                    const questionText = this.questionData[groupInfo.key][groupInfo.questions.indexOf(questionNumber)];
                    
                    responses[`q${questionNumber}`] = {
                        score: score,
                        question: questionText
                    };
                    
                    groupTotal += score;
                }
            });

            const maxScore = groupInfo.questions.length * 5;
            groupScores[groupName] = {
                total: groupTotal,
                max: maxScore,
                percentage: Math.round((groupTotal / maxScore) * 100),
                category: groupInfo.category
            };
        });

        const totalScore = Object.values(responses).reduce((sum, response) => sum + response.score, 0);

        return {
            patientInfo,
            evaluatorInfo,
            responses,
            groupScores,
            timestamp: new Date().toISOString(),
            totalScore
        };
    }

    loadSavedData() {
        const savedState = localStorage.getItem('questionnaireAutoSave');
        if (savedState) {
            try {
                const data = JSON.parse(savedState);
                
                // Restore patient info
                if (data.patientInfo) {
                    document.getElementById('patient-name').value = data.patientInfo.name || '';
                    document.getElementById('evaluation-date').value = data.patientInfo.evaluationDate || '';
                }
                
                // Restore evaluator info
                if (data.evaluatorInfo) {
                    document.getElementById('evaluator-name').value = data.evaluatorInfo.name || '';
                    document.getElementById('evaluator-email').value = data.evaluatorInfo.email || '';
                    document.getElementById('evaluator-phone').value = data.evaluatorInfo.phone || '';
                }
                
                // Restore responses
                if (data.responses) {
                    Object.entries(data.responses).forEach(([questionId, responseData]) => {
                        const radioInput = document.querySelector(`[name="${questionId}"][value="${responseData.score}"]`);
                        if (radioInput) {
                            radioInput.checked = true;
                        }
                    });
                }
                
                this.updateAllProgress();
                console.log('📝 Dados salvos carregados');
            } catch (e) {
                console.warn('Erro ao carregar dados salvos:', e);
            }
        }
    }

    clearForm() {
        if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
            this.form.reset();
            localStorage.removeItem('questionnaireAutoSave');
            localStorage.removeItem('lastFormData');
            sessionStorage.clear();
            this.updateAllProgress();
            this.setTodayDate();
        }
    }
}

// Adicionar estilos para animações
const style = document.createElement('style');
style.textContent = `
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
    
    #save-indicator {
        position: fixed;
        top: 60px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: bold;
        background: white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
`;
document.head.appendChild(style);

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Criar indicador de salvamento
    const saveIndicator = document.createElement('div');
    saveIndicator.id = 'save-indicator';
    saveIndicator.textContent = '✓ Pronto';
    saveIndicator.style.color = '#28a745';
    document.body.appendChild(saveIndicator);
    
    // Inicializar gerenciador
    window.parentFormManager = new ParentFormManagerMelhorado();
});

// Exportar para uso global
window.ParentFormManagerMelhorado = ParentFormManagerMelhorado;
window.FirebaseManagerMelhorado = FirebaseManagerMelhorado;