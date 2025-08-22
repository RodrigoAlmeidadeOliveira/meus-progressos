// Script simplificado para o formulário dos pais
// Focado apenas no preenchimento e envio da avaliação

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

    async saveEvaluation(data) {
        console.log('🔥 Iniciando saveEvaluation. Firebase inicializado:', this.initialized);
        
        if (!this.initialized) {
            console.log('⚠️ Firebase não inicializado, salvando localmente');
            return this.saveToLocalStorage(data);
        }

        try {
            console.log('🔥 Importando módulos Firestore...');
            const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            
            console.log('🔥 Preparando dados para salvar...');
            // Criar documento com ID baseado na data e nome do paciente
            const docData = {
                ...data,
                createdAt: new Date().toISOString(),
                patientId: this.generatePatientId(data.patientInfo.name),
                evaluationId: `${data.patientInfo.name.replace(/\s+/g, '_')}_${data.patientInfo.evaluationDate}`
            };

            console.log('🔥 Salvando no Firebase...', docData);
            const docRef = await addDoc(collection(this.db, 'evaluations'), docData);
            console.log('✅ Avaliação salva no Firebase com sucesso:', docRef.id);
            
            // Também salvar localmente como backup
            this.saveToLocalStorage(data);
            
            return { success: true, id: docRef.id, firebase: true };
        } catch (error) {
            console.error('❌ Erro ao salvar no Firebase:', error);
            console.error('❌ Detalhes do erro:', error.message, error.code);
            
            // Fallback para localStorage
            const localResult = this.saveToLocalStorage(data);
            return { ...localResult, firebaseError: error.message };
        }
    }

    generatePatientId(name) {
        return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }

    saveToLocalStorage(data) {
        const savedData = this.getFromLocalStorage();
        savedData[data.patientInfo.evaluationDate] = data;
        localStorage.setItem('questionnaireData', JSON.stringify(savedData));
        return { success: true, local: true };
    }

    getFromLocalStorage() {
        const saved = localStorage.getItem('questionnaireData');
        return saved ? JSON.parse(saved) : {};
    }
}

class ParentFormManager {
    constructor() {
        this.form = document.getElementById('questionnaire-form');
        this.questionData = this.initializeQuestionData();
        this.questionGroups = this.initializeQuestionGroups();
        this.tabData = this.initializeTabData();
        
        this.currentMainTab = 'comunicativas';
        this.currentSubTab = 'contato-visual';
        
        // Inicializar Firebase Manager
        this.firebaseManager = new FirebaseManager();
        
        this.init();
    }

    init() {
        this.generateQuestions();
        this.setupTabNavigation();
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        const saveDraftButton = document.getElementById('save-draft');
        if (saveDraftButton) {
            saveDraftButton.addEventListener('click', () => this.saveDraft());
        }
        
        const clearButton = document.getElementById('clear-form');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearForm());
        }
        
        this.updateAllProgress();
        this.loadSavedData();
        this.setTodayDate();
    }

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
        submitButton.textContent = '💾 Enviando...';
        submitButton.disabled = true;

        try {
            console.log('🔥 Iniciando salvamento da avaliação...');
            const result = await this.firebaseManager.saveEvaluation(formData);
            
            console.log('🔥 Resultado do salvamento:', result);
            
            if (result.success) {
                if (result.firebase) {
                    this.showSuccessMessage(false, 'Firebase - Dados na nuvem!');
                } else if (result.firebaseError) {
                    this.showSuccessMessage(true, `Erro Firebase: ${result.firebaseError}`);
                } else {
                    this.showSuccessMessage(true, 'Salvo localmente');
                }
                localStorage.removeItem('questionnaireAutoSave'); // Limpar rascunho
            } else {
                throw new Error('Falha ao salvar');
            }
        } catch (error) {
            console.error('❌ Erro crítico ao salvar:', error);
            alert(`❌ Erro ao enviar avaliação: ${error.message}\n\nVerifique o console (F12) para mais detalhes.`);
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    showSuccessMessage(isLocal, details = '') {
        document.querySelector('.container > form').style.display = 'none';
        document.querySelector('.container > header').style.display = 'none';
        document.querySelector('.scale-info').style.display = 'none';
        
        const successMessage = document.getElementById('success-message');
        
        if (isLocal) {
            successMessage.innerHTML = `
                <h3>⚠️ Avaliação Salva Localmente!</h3>
                <p>A avaliação foi salva no seu dispositivo. ${details}</p>
                <div class="success-actions">
                    <button type="button" onclick="location.reload()" class="btn-primary">📝 Nova Avaliação</button>
                    <a href="terapeuta.html" class="btn-secondary">👨‍⚕️ Área do Terapeuta</a>
                </div>
            `;
        } else {
            successMessage.innerHTML = `
                <h3>✅ Avaliação Enviada com Sucesso!</h3>
                <p>Obrigado por completar a avaliação. Os dados foram salvos com segurança na nuvem. ${details}</p>
                <div class="success-actions">
                    <button type="button" onclick="location.reload()" class="btn-primary">📝 Nova Avaliação</button>
                    <a href="terapeuta.html" class="btn-secondary">👨‍⚕️ Área do Terapeuta</a>
                </div>
            `;
        }
        
        successMessage.style.display = 'block';
        successMessage.scrollIntoView({ behavior: 'smooth' });
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
            if (document.querySelector(`input[name="q${questionNumber}}"]:checked`)) {
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
            localStorage.removeItem('questionnaireAutoSave');
            this.updateAllProgress();
            this.setTodayDate();
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.parentFormManager = new ParentFormManager();
});