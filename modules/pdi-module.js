/**
 * PDI Module - Plano de Desenvolvimento Individual
 *
 * Design Patterns:
 * - Single Responsibility Principle (SRP): Este módulo é responsável apenas pelo PDI
 * - Observer Pattern: Observa mudanças na seleção de avaliações
 * - DRY: Reutiliza dados de avaliação em vez de duplicar consultas
 */

export function attachPDIModule(proto) {
    Object.assign(proto, {
        setupPDIControls,
        handlePDIPatientChange,
        handlePDIEvaluationChange,
        generatePDI,
        exportPDI
    });
}

/**
 * Inicializa os controles do painel PDI
 */
function setupPDIControls() {
    const panel = document.getElementById('pdi-menu');
    if (!panel) {
        console.warn('⚠️ Terapeuta: Painel PDI não encontrado');
        return;
    }

    this.pdiSelectors = {
        panel,
        patient: document.getElementById('pdi-detail-patient'),
        evaluation: document.getElementById('pdi-detail-evaluation'),
        exportButton: document.getElementById('pdi-export-evaluation'),
        generateButton: document.getElementById('pdi-generate'),
        container: document.getElementById('pdi-evaluation-detail')
    };

    // Event listeners
    if (this.pdiSelectors.patient) {
        this.pdiSelectors.patient.addEventListener('change', (event) => {
            this.handlePDIPatientChange(event);
        });
    }

    if (this.pdiSelectors.evaluation) {
        this.pdiSelectors.evaluation.addEventListener('change', (event) => {
            this.handlePDIEvaluationChange(event);
        });
    }

    if (this.pdiSelectors.generateButton) {
        this.pdiSelectors.generateButton.addEventListener('click', () => {
            this.generatePDI();
        });
    }

    if (this.pdiSelectors.exportButton) {
        this.pdiSelectors.exportButton.addEventListener('click', () => {
            this.exportSelectedEvaluation();
        });
    }

    console.log('✅ PDI: Controles configurados');
}

/**
 * Observer Pattern: Notifica quando o paciente PDI muda
 * Sincroniza com o módulo Analytics se necessário
 */
function handlePDIPatientChange(event) {
    const patientKey = event.target.value || null;
    this.selectedEvaluationId = null;

    // Observer Pattern: Notifica o módulo Analytics da mudança
    if (this.analyticsControls?.detailPatient) {
        this.analyticsControls.detailPatient.value = patientKey || '';
    }

    // DRY: Reutiliza a função de populateEvaluationOptionsForPatient
    this.populateEvaluationOptionsForPatient(patientKey, 'pdi');
    this.populateEvaluationOptionsForPatient(patientKey, 'analytics');
}

/**
 * Observer Pattern: Notifica quando a avaliação PDI muda
 */
function handlePDIEvaluationChange(event) {
    const evaluationId = event.target.value || null;
    this.selectedEvaluationId = evaluationId || null;

    // Atualiza o botão de gerar PDI
    if (this.pdiSelectors?.generateButton) {
        this.pdiSelectors.generateButton.disabled = !this.selectedEvaluationId;
    }

    // Observer Pattern: Sincroniza com Analytics
    const contexts = ['analytics', 'pdi'];
    contexts.forEach(ctx => {
        const selectors = this.getDetailContextForPDI(ctx);
        if (selectors?.evaluationSelect && selectors.evaluationSelect !== event.target) {
            selectors.evaluationSelect.value = this.selectedEvaluationId || '';
        }
        if (selectors?.exportButton) {
            selectors.exportButton.disabled = !this.selectedEvaluationId;
        }
    });

    this.renderSelectedEvaluationDetail('analytics');
    this.renderSelectedEvaluationDetail('pdi');
}

/**
 * Função auxiliar para obter contexto (compartilhada entre módulos)
 */
function getDetailContextForPDI(context) {
    if (context === 'pdi') {
        const selectors = this.pdiSelectors;
        if (!selectors) return null;
        return {
            patientSelect: selectors.patient || null,
            evaluationSelect: selectors.evaluation || null,
            exportButton: selectors.exportButton || null,
            generateButton: selectors.generateButton || null,
            container: selectors.container || null
        };
    }

    if (!this.analyticsControls) return null;
    return {
        patientSelect: this.analyticsControls.detailPatient || null,
        evaluationSelect: this.analyticsControls.detailEvaluation || null,
        exportButton: this.analyticsControls.viewEvaluation || null,
        container: this.analyticsControls.evaluationDetailContainer || null
    };
}

/**
 * Gera o PDI baseado na avaliação selecionada
 * Esta função analisa as respostas e cria um plano de intervenção
 */
function generatePDI() {
    if (!this.selectedEvaluationId) {
        this.showNotification('Selecione uma avaliação para gerar o PDI.', 'warning');
        return;
    }

    const evaluation = this.evaluationIndex.get(this.selectedEvaluationId);
    if (!evaluation) {
        this.showNotification('Avaliação não encontrada.', 'error');
        return;
    }

    // DRY: Reutiliza funções existentes de análise
    const responsesMap = this.mapResponsesByQuestion(evaluation);
    const patientName = evaluation.patientInfo?.name || 'Paciente';

    // Análise de habilidades (baseado nas respostas)
    const weakAreas = this.identifyWeakAreas(responsesMap);
    const strengthAreas = this.identifyStrengthAreas(responsesMap);

    // Renderiza o PDI
    this.renderPDI(evaluation, weakAreas, strengthAreas);

    this.showNotification('PDI gerado com sucesso!', 'success');
}

/**
 * Exporta o PDI como PDF ou CSV
 */
function exportPDI() {
    if (!this.selectedEvaluationId) {
        this.showNotification('Gere um PDI antes de exportar.', 'warning');
        return;
    }

    // Implementação da exportação será adicionada
    this.showNotification('Função de exportação em desenvolvimento.', 'info');
}
