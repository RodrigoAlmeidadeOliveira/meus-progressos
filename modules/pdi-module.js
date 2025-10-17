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
        handleGeneratePDI,
        handleExportPDI
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
            this.handleGeneratePDI();
        });
    }

    if (this.pdiSelectors.exportButton) {
        this.pdiSelectors.exportButton.addEventListener('click', () => {
            this.handleExportPDI();
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

    if (this.pdiSelectors?.generateButton) {
        this.pdiSelectors.generateButton.disabled = true;
    }
    if (this.pdiSelectors?.exportButton) {
        this.pdiSelectors.exportButton.disabled = true;
    }

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
    this.currentPdiEvaluation = evaluationId ? this.evaluationIndex.get(evaluationId) : null;

    // Atualiza o botão de gerar PDI
    if (this.pdiSelectors?.generateButton) {
        this.pdiSelectors.generateButton.disabled = !this.selectedEvaluationId;
    }

    // Observer Pattern: Sincroniza com Analytics
    const contexts = ['analytics', 'pdi'];
    contexts.forEach(ctx => {
        const selectors = this.getDetailContext ? this.getDetailContext(ctx) : null;
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
 * Gera o PDI baseado na avaliação selecionada
 */
function handleGeneratePDI() {
    if (!this.selectedEvaluationId) {
        this.showNotification('Selecione uma avaliação para gerar o PDI.', 'warning');
        return;
    }

    if (!this.currentPdiEvaluation) {
        this.currentPdiEvaluation = this.evaluationIndex.get(this.selectedEvaluationId) || null;
    }

    if (!this.currentPdiEvaluation) {
        this.showNotification('Avaliação não encontrada.', 'error');
        return;
    }

    this.generatePdiPlan(this.currentPdiEvaluation, { trigger: 'manual' });
}

/**
 * Exporta o PDI como PDF ou CSV
 */
function handleExportPDI() {
    if (!this.selectedEvaluationId) {
        this.showNotification('Gere um PDI antes de exportar.', 'warning');
        return;
    }

    this.exportPdiPlan();
}
