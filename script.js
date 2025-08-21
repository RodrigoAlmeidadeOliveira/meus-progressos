class QuestionnaireManager {
    constructor() {
        this.form = document.getElementById('questionnaire-form');
        this.clearButton = document.getElementById('clear-form');
        this.viewResultsButton = document.getElementById('view-results');
        this.resultsSection = document.getElementById('results-section');
        this.resultsContent = document.getElementById('results-content');
        
        this.questionData = this.initializeQuestionData();
        this.questionGroups = this.initializeQuestionGroups();
        this.tabData = this.initializeTabData();
        
        this.currentMainTab = 'comunicativas';
        this.currentSubTab = 'contato-visual';
        
        this.init();
    }

    init() {
        this.generateQuestions();
        this.setupTabNavigation();
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.clearButton.addEventListener('click', () => this.clearForm());
        this.viewResultsButton.addEventListener('click', () => this.viewResults());
        
        const saveDraftButton = document.getElementById('save-draft');
        if (saveDraftButton) {
            saveDraftButton.addEventListener('click', () => this.saveDraft());
        }
        
        this.updateViewResultsButton();
        this.updateAllProgress();
        this.loadSavedData();
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
                </div>
            </div>
        `;
        
        // Add change event listeners to update progress
        const inputs = questionItem.querySelectorAll('input[type="radio"]');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateAllProgress();
                this.autoSave();
            });
        });
        
        return questionItem;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const formData = this.collectFormData();
        
        if (this.evaluationExists(formData.evaluationDate)) {
            if (!confirm('Já existe uma avaliação para esta data. Deseja substituí-la?')) {
                return;
            }
        }

        this.saveData(formData);
        
        alert('Avaliação salva com sucesso!');
        this.updateViewResultsButton();
        this.clearForm();
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
        const data = {
            patientInfo: {
                name: document.getElementById('patient-name').value.trim(),
                evaluationDate: document.getElementById('evaluation-date').value
            },
            evaluatorInfo: {
                name: document.getElementById('evaluator-name').value.trim(),
                email: document.getElementById('evaluator-email').value.trim(),
                phone: document.getElementById('evaluator-phone').value.trim()
            },
            responses: {},
            groupScores: {},
            timestamp: new Date().toISOString(),
            totalScore: 0
        };

        let totalScore = 0;
        const totalQuestions = Object.values(this.questionGroups).reduce((sum, group) => sum + group.questions.length, 0);

        // Collect all responses
        for (let i = 1; i <= totalQuestions; i++) {
            const response = document.querySelector(`input[name="q${i}"]:checked`);
            if (response) {
                const score = parseInt(response.value);
                data.responses[`q${i}`] = {
                    score: score,
                    question: this.getQuestionText(i)
                };
                totalScore += score;
            }
        }

        // Calculate group scores
        Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
            const groupScores = groupInfo.questions.map(qNum => data.responses[`q${qNum}`]?.score || 0);
            const groupTotal = groupScores.reduce((sum, score) => sum + score, 0);
            const groupMax = groupInfo.questions.length * 5;
            
            data.groupScores[groupName] = {
                total: groupTotal,
                max: groupMax,
                percentage: Math.round((groupTotal / groupMax) * 100),
                category: groupInfo.category
            };
        });
        
        data.totalScore = totalScore;
        return data;
    }

    getQuestionText(questionNumber) {
        for (const [groupName, groupInfo] of Object.entries(this.questionGroups)) {
            const indexInGroup = groupInfo.questions.indexOf(questionNumber);
            if (indexInGroup !== -1) {
                return this.questionData[groupInfo.key][indexInGroup];
            }
        }
        return `Questão ${questionNumber}`;
    }

    evaluationExists(date) {
        const savedData = this.getSavedData();
        return savedData.hasOwnProperty(date);
    }

    saveData(data) {
        const savedData = this.getSavedData();
        savedData[data.patientInfo.evaluationDate] = data;
        localStorage.setItem('questionnaireData', JSON.stringify(savedData));
    }

    getSavedData() {
        const saved = localStorage.getItem('questionnaireData');
        return saved ? JSON.parse(saved) : {};
    }

    setupTabNavigation() {
        // Main tab navigation
        const mainTabButtons = document.querySelectorAll('.main-tabs .tab-button');
        mainTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchMainTab(tabId);
            });
        });

        // Sub-tab navigation
        const subTabButtons = document.querySelectorAll('.sub-tab-button');
        subTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const subTabId = button.getAttribute('data-subtab');
                this.switchSubTab(subTabId);
            });
        });

        // Navigation buttons
        const prevButton = document.getElementById('prev-tab');
        const nextButton = document.getElementById('next-tab');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => this.navigatePrevious());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.navigateNext());
        }
    }

    switchMainTab(tabId) {
        // Hide all main tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all main tab buttons
        document.querySelectorAll('.main-tabs .tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Show selected tab content
        const selectedTabContent = document.getElementById(`tab-${tabId}`);
        if (selectedTabContent) {
            selectedTabContent.classList.add('active');
        }
        
        // Add active class to selected tab button
        const selectedTabButton = document.querySelector(`[data-tab="${tabId}"]`);
        if (selectedTabButton) {
            selectedTabButton.classList.add('active');
        }
        
        this.currentMainTab = tabId;
        
        // Switch to first sub-tab of the selected main tab
        const tabData = this.tabData[tabId];
        if (tabData && tabData.subTabs.length > 0) {
            this.switchSubTab(tabData.subTabs[0]);
        }
        
        this.updateTabInfo();
    }

    switchSubTab(subTabId) {
        // Hide all sub-tab contents in current main tab
        const currentMainTabContent = document.getElementById(`tab-${this.currentMainTab}`);
        if (currentMainTabContent) {
            currentMainTabContent.querySelectorAll('.sub-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all sub-tab buttons in current main tab
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
            // Go to previous sub-tab
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
            // Go to next sub-tab
            this.switchSubTab(currentTabData.subTabs[currentSubTabIndex + 1]);
        } else {
            // Go to next main tab's first sub-tab
            const mainTabs = Object.keys(this.tabData);
            const currentMainTabIndex = mainTabs.indexOf(this.currentMainTab);
            
            if (currentMainTabIndex < mainTabs.length - 1) {
                const nextMainTab = mainTabs[currentMainTabIndex + 1];
                const nextTabData = this.tabData[nextMainTab];
                this.switchMainTab(nextMainTab);
                this.switchSubTab(nextTabData.subTabs[0]);
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
        
        // Find the group in questionGroups by key
        const group = Object.values(this.questionGroups).find(g => g.key === groupKey);
        if (!group) return 0;
        
        group.questions.forEach(questionNumber => {
            if (document.querySelector(`input[name="q${questionNumber}"]:checked`)) {
                answered++;
            }
        });
        
        return answered;
    }

    autoSave() {
        // Save current form state to localStorage
        const formData = new FormData(this.form);
        const currentState = {};
        
        // Save form inputs
        const inputs = this.form.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type === 'radio' && input.checked) {
                currentState[input.name] = input.value;
            } else if (input.type !== 'radio') {
                currentState[input.name] = input.value;
            }
        });
        
        localStorage.setItem('questionnaireAutoSave', JSON.stringify(currentState));
    }

    saveDraft() {
        this.autoSave();
        alert('Rascunho salvo com sucesso! Você pode continuar preenchendo depois.');
    }

    loadSavedData() {
        const savedState = localStorage.getItem('questionnaireAutoSave');
        if (savedState) {
            try {
                const data = JSON.parse(savedState);
                
                // Restore form values
                Object.entries(data).forEach(([name, value]) => {
                    const input = document.querySelector(`[name="${name}"]`);
                    if (input) {
                        if (input.type === 'radio') {
                            const radioInput = document.querySelector(`[name="${name}"][value="${value}"]`);
                            if (radioInput) {
                                radioInput.checked = true;
                            }
                        } else {
                            input.value = value;
                        }
                    }
                });
                
                this.updateAllProgress();
            } catch (e) {
                console.warn('Error loading saved data:', e);
            }
        }
    }

    clearForm() {
        if (confirm('Tem certeza que deseja limpar todos os dados do formulário?')) {
            this.form.reset();
            this.resultsSection.style.display = 'none';
            localStorage.removeItem('questionnaireAutoSave');
            this.updateAllProgress();
        }
    }

    updateViewResultsButton() {
        const savedData = this.getSavedData();
        const hasData = Object.keys(savedData).length > 0;
        
        this.viewResultsButton.style.display = hasData ? 'inline-block' : 'none';
    }

    viewResults() {
        const savedData = this.getSavedData();
        
        if (Object.keys(savedData).length === 0) {
            alert('Nenhuma avaliação salva encontrada.');
            return;
        }

        this.displayResults(savedData);
        this.createCharts(savedData);
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    displayResults(savedData) {
        const evaluations = Object.entries(savedData)
            .sort(([a], [b]) => new Date(a) - new Date(b));

        const totalQuestions = Object.values(this.questionGroups).reduce((sum, group) => sum + group.questions.length, 0);
        const maxScore = totalQuestions * 5;

        let html = `
            <div class="results-overview">
                <div class="summary-stats">
                    <h4>Resumo Geral - ${evaluations[0][1].patientInfo.name}</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${evaluations.length}</span>
                            <span class="stat-label">Avaliações</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.formatDate(evaluations[0][0])}</span>
                            <span class="stat-label">Primeira Avaliação</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.formatDate(evaluations[evaluations.length - 1][0])}</span>
                            <span class="stat-label">Última Avaliação</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${this.calculateProgress(evaluations, maxScore)}%</span>
                            <span class="stat-label">Progresso Geral</span>
                        </div>
                    </div>
                </div>
                
                <div class="evaluation-list">
                    <h4>Histórico de Avaliações</h4>
                    <div class="evaluations-grid">
        `;

        evaluations.forEach(([date, data]) => {
            const progressClass = this.getProgressClass(data.totalScore, maxScore);
            html += `
                <div class="evaluation-card ${progressClass}">
                    <div class="evaluation-header">
                        <h5>${this.formatDate(date)}</h5>
                        <span class="total-score">${data.totalScore}/${maxScore}</span>
                    </div>
                    <div class="evaluation-actions">
                        <button onclick="questionnaireManager.showDetailedResults('${date}')" class="btn-view-details">
                            Ver Detalhes
                        </button>
                        <button onclick="questionnaireManager.deleteEvaluation('${date}')" class="btn-delete">
                            Excluir
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                    <div class="global-actions">
                        <button onclick="questionnaireManager.exportAllResults()" class="btn-export-all">
                            📊 Exportar Todas as Avaliações (CSV)
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.resultsContent.innerHTML = html;
    }

    calculateProgress(evaluations, maxScore) {
        if (evaluations.length < 2) return 0;
        
        const first = evaluations[0][1].totalScore;
        const last = evaluations[evaluations.length - 1][1].totalScore;
        
        return Math.round(((last - first) / maxScore) * 100);
    }

    getProgressClass(score, maxScore) {
        const percentage = (score / maxScore) * 100;
        if (percentage >= 70) return 'high-score';
        if (percentage >= 40) return 'medium-score';
        return 'low-score';
    }

    showDetailedResults(date) {
        const savedData = this.getSavedData();
        const data = savedData[date];
        
        if (!data) return;

        const totalQuestions = Object.values(this.questionGroups).reduce((sum, group) => sum + group.questions.length, 0);
        const maxScore = totalQuestions * 5;

        let html = `
            <div class="detailed-results">
                <div class="result-header">
                    <h4>Avaliação Detalhada - ${this.formatDate(date)}</h4>
                    <div class="score-summary">
                        <span class="total-score-large">${data.totalScore}/${maxScore}</span>
                        <span class="score-percentage">${Math.round((data.totalScore / maxScore) * 100)}%</span>
                    </div>
                </div>
                
                <div class="group-analysis">
                    <h5>Análise por Grupos</h5>
                    ${this.generateGroupAnalysis(data)}
                </div>
                
                <div class="category-analysis">
                    <h5>Análise por Categorias</h5>
                    ${this.generateCategoryAnalysis(data)}
                </div>
                
                <div class="evaluator-info">
                    <h5>Informações do Avaliador</h5>
                    <div class="evaluator-details">
                        <p><strong>Nome:</strong> ${data.evaluatorInfo?.name || 'Não informado'}</p>
                        <p><strong>Email:</strong> ${data.evaluatorInfo?.email || 'Não informado'}</p>
                        <p><strong>Telefone:</strong> ${data.evaluatorInfo?.phone || 'Não informado'}</p>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button onclick="questionnaireManager.exportResults('${date}')" class="btn-secondary">
                        Exportar CSV
                    </button>
                    <button onclick="questionnaireManager.exportAllResults()" class="btn-secondary">
                        Exportar Todos os Resultados
                    </button>
                    <button onclick="questionnaireManager.viewResults()" class="btn-secondary">
                        Voltar
                    </button>
                </div>
            </div>
        `;

        this.resultsContent.innerHTML = html;
    }

    generateGroupAnalysis(data) {
        let html = '<div class="groups-grid">';
        
        Object.entries(data.groupScores || {}).forEach(([groupName, groupScore]) => {
            const groupInfo = this.questionGroups[groupName];
            if (!groupInfo) return;
            
            html += `
                <div class="group-card">
                    <h6 style="color: ${groupInfo.color}">${groupName}</h6>
                    <div class="group-score">
                        <span class="group-total">${groupScore.total}/${groupScore.max}</span>
                        <span class="group-percentage">${groupScore.percentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${groupScore.percentage}%; background-color: ${groupInfo.color}"></div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    generateCategoryAnalysis(data) {
        const categories = {};
        
        // Group by category
        Object.entries(data.groupScores || {}).forEach(([groupName, groupScore]) => {
            const groupInfo = this.questionGroups[groupName];
            if (!groupInfo) return;
            
            if (!categories[groupScore.category]) {
                categories[groupScore.category] = {
                    total: 0,
                    max: 0,
                    groups: []
                };
            }
            
            categories[groupScore.category].total += groupScore.total;
            categories[groupScore.category].max += groupScore.max;
            categories[groupScore.category].groups.push(groupName);
        });

        let html = '<div class="categories-grid">';
        
        Object.entries(categories).forEach(([categoryName, categoryData]) => {
            const percentage = Math.round((categoryData.total / categoryData.max) * 100);
            
            html += `
                <div class="category-card">
                    <h6>${categoryName}</h6>
                    <div class="category-score">
                        <span class="category-total">${categoryData.total}/${categoryData.max}</span>
                        <span class="category-percentage">${percentage}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%; background-color: #667eea"></div>
                    </div>
                    <div class="category-groups">
                        <small>${categoryData.groups.length} grupos avaliados</small>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    deleteEvaluation(date) {
        if (confirm('Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.')) {
            const savedData = this.getSavedData();
            delete savedData[date];
            
            localStorage.setItem('questionnaireData', JSON.stringify(savedData));
            
            this.updateViewResultsButton();
            
            if (Object.keys(savedData).length === 0) {
                this.resultsSection.style.display = 'none';
                alert('Avaliação excluída. Não há mais dados salvos.');
            } else {
                this.viewResults();
                alert('Avaliação excluída com sucesso!');
            }
        }
    }

    exportResults(date) {
        const savedData = this.getSavedData();
        const data = savedData[date];
        
        if (!data) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Header with all information
        csvContent += "Nome_Avaliado,Nome_Avaliador,Email_Avaliador,Telefone_Avaliador,Data_Avaliacao,Categoria,Grupo,Numero_Questao,Descricao_Questao,Pontuacao\n";

        // Add data for each question
        Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
            groupInfo.questions.forEach((questionNumber, index) => {
                const response = data.responses[`q${questionNumber}`];
                if (response) {
                    const evaluatorInfo = data.evaluatorInfo || { name: '', email: '', phone: '' };
                    csvContent += `"${data.patientInfo.name}","${evaluatorInfo.name}","${evaluatorInfo.email}","${evaluatorInfo.phone}","${date}","${groupInfo.category}","${groupName}",${questionNumber},"${response.question}",${response.score}\n`;
                }
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `avaliacao_completa_${data.patientInfo.name}_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    exportAllResults() {
        const savedData = this.getSavedData();
        
        if (Object.keys(savedData).length === 0) {
            alert('Nenhuma avaliação salva encontrada.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Header with all information
        csvContent += "Nome_Avaliado,Nome_Avaliador,Email_Avaliador,Telefone_Avaliador,Data_Avaliacao,Categoria,Grupo,Numero_Questao,Descricao_Questao,Pontuacao\n";

        // Add data for each evaluation
        Object.entries(savedData).forEach(([date, data]) => {
            Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
                groupInfo.questions.forEach((questionNumber, index) => {
                    const response = data.responses[`q${questionNumber}`];
                    if (response) {
                        const evaluatorInfo = data.evaluatorInfo || { name: '', email: '', phone: '' };
                        csvContent += `"${data.patientInfo.name}","${evaluatorInfo.name}","${evaluatorInfo.email}","${evaluatorInfo.phone}","${date}","${groupInfo.category}","${groupName}",${questionNumber},"${response.question}",${response.score}\n`;
                    }
                });
            });
        });

        const timestamp = new Date().toISOString().split('T')[0];
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `todas_avaliacoes_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    createCharts(savedData) {
        setTimeout(() => {
            this.populateGroupSelectors(savedData);
            this.createEvolutionChart(savedData);
            this.createComparisonChart(savedData);
            this.createCategoryChart(savedData);
            this.setupChartEventListeners(savedData);
        }, 100);
    }

    populateGroupSelectors(savedData) {
        const groupSelector = document.getElementById('group-selector');
        const comparisonGroupSelector = document.getElementById('comparison-group-selector');
        
        if (!groupSelector || !comparisonGroupSelector) return;

        // Clear existing options
        groupSelector.innerHTML = '<option value="">Selecione um grupo...</option>';
        comparisonGroupSelector.innerHTML = '<option value="">Selecione um grupo...</option>';

        // Add group options
        Object.keys(this.questionGroups).forEach(groupName => {
            const option1 = document.createElement('option');
            option1.value = groupName;
            option1.textContent = groupName;
            groupSelector.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = groupName;
            option2.textContent = groupName;
            comparisonGroupSelector.appendChild(option2);
        });

        // Select first group by default
        const firstGroup = Object.keys(this.questionGroups)[0];
        if (firstGroup) {
            groupSelector.value = firstGroup;
            comparisonGroupSelector.value = firstGroup;
        }
    }

    setupChartEventListeners(savedData) {
        const groupSelector = document.getElementById('group-selector');
        const comparisonGroupSelector = document.getElementById('comparison-group-selector');

        if (groupSelector) {
            groupSelector.addEventListener('change', () => {
                this.updateEvolutionChart(savedData, groupSelector.value);
            });
        }

        if (comparisonGroupSelector) {
            comparisonGroupSelector.addEventListener('change', () => {
                this.updateComparisonChart(savedData, comparisonGroupSelector.value);
            });
        }
    }

    createEvolutionChart(savedData) {
        const firstGroup = Object.keys(this.questionGroups)[0];
        if (firstGroup) {
            this.updateEvolutionChart(savedData, firstGroup);
        }
    }

    updateEvolutionChart(savedData, selectedGroup) {
        const ctx = document.getElementById('evolutionChart');
        if (!ctx || !selectedGroup) return;

        // Destroy existing chart
        if (this.evolutionChartInstance) {
            this.evolutionChartInstance.destroy();
        }

        const evaluations = Object.entries(savedData)
            .sort(([a], [b]) => new Date(a) - new Date(b));

        if (evaluations.length === 0) return;

        const groupInfo = this.questionGroups[selectedGroup];
        if (!groupInfo) return;

        const questions = groupInfo.questions;
        const labels = questions.map((_, index) => `Q${index + 1}`);
        
        const datasets = evaluations.map(([date, data], evalIndex) => {
            const scores = questions.map(qNum => data.responses[`q${qNum}`]?.score || 0);
            
            return {
                label: this.formatDate(date),
                data: scores,
                backgroundColor: this.getDatasetColor(evalIndex, 0.7),
                borderColor: this.getDatasetColor(evalIndex, 1),
                borderWidth: 2
            };
        });

        this.evolutionChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Evolução: ${selectedGroup}`
                    },
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const qIndex = context[0].dataIndex;
                                const qNum = questions[qIndex];
                                return `Questão ${qNum}`;
                            },
                            afterTitle: function(context) {
                                const qIndex = context[0].dataIndex;
                                const qNum = questions[qIndex];
                                return this.getQuestionText(qNum);
                            }.bind(this)
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Questões'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 5,
                        title: {
                            display: true,
                            text: 'Pontuação'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createComparisonChart(savedData) {
        const firstGroup = Object.keys(this.questionGroups)[0];
        if (firstGroup) {
            this.updateComparisonChart(savedData, firstGroup);
        }
    }

    updateComparisonChart(savedData, selectedGroup) {
        const ctx = document.getElementById('comparisonChart');
        if (!ctx || !selectedGroup) return;

        // Destroy existing chart
        if (this.comparisonChartInstance) {
            this.comparisonChartInstance.destroy();
        }

        const evaluations = Object.entries(savedData)
            .sort(([a], [b]) => new Date(a) - new Date(b));

        if (evaluations.length < 2) {
            // Show message if less than 2 evaluations
            ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
            return;
        }

        const groupInfo = this.questionGroups[selectedGroup];
        if (!groupInfo) return;

        const firstEval = evaluations[0][1];
        const lastEval = evaluations[evaluations.length - 1][1];
        
        const questions = groupInfo.questions;
        const labels = questions.map((_, index) => `Q${index + 1}`);
        
        const firstScores = questions.map(qNum => firstEval.responses[`q${qNum}`]?.score || 0);
        const lastScores = questions.map(qNum => lastEval.responses[`q${qNum}`]?.score || 0);

        this.comparisonChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: `Primeira (${this.formatDate(evaluations[0][0])})`,
                        data: firstScores,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    },
                    {
                        label: `Última (${this.formatDate(evaluations[evaluations.length - 1][0])})`,
                        data: lastScores,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Comparação: ${selectedGroup}`
                    },
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                const qIndex = context[0].dataIndex;
                                const qNum = questions[qIndex];
                                return `Questão ${qNum}`;
                            },
                            afterTitle: function(context) {
                                const qIndex = context[0].dataIndex;
                                const qNum = questions[qIndex];
                                return this.getQuestionText(qNum);
                            }.bind(this),
                            afterBody: function(context) {
                                const qIndex = context[0].dataIndex;
                                const firstScore = firstScores[qIndex];
                                const lastScore = lastScores[qIndex];
                                const diff = lastScore - firstScore;
                                const arrow = diff > 0 ? '↗️' : diff < 0 ? '↘️' : '➡️';
                                return `Evolução: ${diff > 0 ? '+' : ''}${diff} pontos ${arrow}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Questões'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 5,
                        title: {
                            display: true,
                            text: 'Pontuação'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createCategoryChart(savedData) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const evaluations = Object.entries(savedData)
            .sort(([a], [b]) => new Date(a) - new Date(b));

        if (evaluations.length === 0) return;

        // Group by category
        const categories = {};
        Object.entries(this.questionGroups).forEach(([groupName, groupInfo]) => {
            if (!categories[groupInfo.category]) {
                categories[groupInfo.category] = [];
            }
            categories[groupInfo.category].push(groupName);
        });

        const labels = Object.keys(categories);
        const datasets = evaluations.map(([date, data], evalIndex) => {
            const categoryScores = labels.map(categoryName => {
                const groupsInCategory = categories[categoryName];
                let totalScore = 0;
                let maxScore = 0;
                
                groupsInCategory.forEach(groupName => {
                    const groupScore = data.groupScores[groupName];
                    if (groupScore) {
                        totalScore += groupScore.total;
                        maxScore += groupScore.max;
                    }
                });
                
                return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
            });

            return {
                label: this.formatDate(date),
                data: categoryScores,
                backgroundColor: this.getDatasetColor(evalIndex, 0.7),
                borderColor: this.getDatasetColor(evalIndex, 1),
                borderWidth: 2
            };
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Progresso por Categoria (%)'
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Categorias'
                        }
                    },
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

    getDatasetColor(index, alpha = 1) {
        const colors = [
            `rgba(102, 126, 234, ${alpha})`,    // Blue
            `rgba(72, 187, 120, ${alpha})`,     // Green
            `rgba(245, 101, 101, ${alpha})`,    // Red
            `rgba(237, 137, 54, ${alpha})`,     // Orange
            `rgba(139, 92, 246, ${alpha})`,     // Purple
            `rgba(236, 72, 153, ${alpha})`,     // Pink
            `rgba(6, 182, 212, ${alpha})`,      // Cyan
            `rgba(251, 191, 36, ${alpha})`      // Yellow
        ];
        return colors[index % colors.length];
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.questionnaireManager = new QuestionnaireManager();
});

// Additional CSS for new features
const additionalCSS = `
.info-section {
    background: #f8fafc;
    padding: 20px;
    margin: 15px 0;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.info-section h4 {
    color: #667eea;
    margin-bottom: 15px;
    font-size: 1.1rem;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
}

.evaluator-info {
    background: #f0f4f8;
    padding: 20px;
    margin: 20px 0;
    border-radius: 8px;
    border-left: 4px solid #667eea;
}

.evaluator-info h5 {
    color: #667eea;
    margin-bottom: 15px;
}

.evaluator-details p {
    margin-bottom: 8px;
    color: #4a5568;
}

.global-actions {
    text-align: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid #e2e8f0;
}

.btn-export-all {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    color: white;
    padding: 15px 30px;
    border: none;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
}

.btn-export-all:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(72, 187, 120, 0.4);
    background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
}

.category-section {
    margin-bottom: 40px;
}

.category-title {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    margin: 30px 0 20px 0;
    border-radius: 10px;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 300;
}

.charts-section {
    margin-top: 30px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
}

.chart-container.full-width {
    grid-column: 1 / -1;
}

.chart-controls {
    margin-bottom: 15px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
}

.chart-controls label {
    font-weight: 600;
    color: #4a5568;
    margin-right: 10px;
}

.chart-controls select {
    padding: 8px 12px;
    border: 1px solid #cbd5e0;
    border-radius: 4px;
    background: white;
    color: #2d3748;
    font-size: 14px;
    min-width: 200px;
}

.chart-controls select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.chart-container {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.chart-container h4 {
    margin-bottom: 15px;
    color: #2d3748;
    text-align: center;
}

.chart-container canvas {
    max-height: 300px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.stat-item {
    text-align: center;
    padding: 15px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.stat-value {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: #667eea;
}

.stat-label {
    font-size: 0.9rem;
    color: #4a5568;
    margin-top: 5px;
}

.evaluations-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.evaluation-card {
    padding: 20px;
    border-radius: 8px;
    border: 2px solid transparent;
    transition: transform 0.2s ease;
}

.evaluation-card:hover {
    transform: translateY(-2px);
}

.evaluation-card.high-score {
    background: linear-gradient(135deg, #e8f5e8 0%, #f0fff0 100%);
    border-color: #48bb78;
}

.evaluation-card.medium-score {
    background: linear-gradient(135deg, #fff3cd 0%, #fef7e0 100%);
    border-color: #ed8936;
}

.evaluation-card.low-score {
    background: linear-gradient(135deg, #fed7d7 0%, #fef5e7 100%);
    border-color: #f56565;
}

.evaluation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.evaluation-header h5 {
    margin: 0;
    color: #2d3748;
}

.total-score {
    font-size: 1.5rem;
    font-weight: bold;
    color: #667eea;
}

.evaluation-actions {
    display: flex;
    gap: 10px;
}

.btn-view-details, .btn-delete {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: opacity 0.2s ease;
}

.btn-view-details {
    background: #667eea;
    color: white;
}

.btn-delete {
    background: #f56565;
    color: white;
}

.btn-view-details:hover, .btn-delete:hover {
    opacity: 0.8;
}

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e2e8f0;
}

.score-summary {
    text-align: center;
}

.total-score-large {
    display: block;
    font-size: 3rem;
    font-weight: bold;
    color: #667eea;
    line-height: 1;
}

.score-percentage {
    font-size: 1.2rem;
    color: #4a5568;
}

.groups-grid, .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.group-card, .category-card {
    padding: 20px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
}

.group-card h6, .category-card h6 {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
}

.group-score, .category-score {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.group-total, .category-total {
    font-weight: bold;
    color: #2d3748;
}

.group-percentage, .category-percentage {
    font-size: 1.2rem;
    font-weight: bold;
    color: #667eea;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
}

.category-groups {
    margin-top: 10px;
    text-align: center;
}

.action-buttons {
    margin-top: 30px;
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
}

@media (max-width: 768px) {
    .charts-section {
        grid-template-columns: 1fr;
    }
    
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .evaluations-grid {
        grid-template-columns: 1fr;
    }
    
    .groups-grid, .categories-grid {
        grid-template-columns: 1fr;
    }
    
    .result-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
}
`;

const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);