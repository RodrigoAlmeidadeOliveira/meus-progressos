/**
 * Analytics Module - Consulta Analítica
 *
 * Design Patterns:
 * - Single Responsibility Principle (SRP): Responsável apenas por consultas analíticas
 * - Observer Pattern: Publica eventos quando dados mudam
 * - DRY: Funções reutilizáveis compartilhadas com PDI
 */

export function attachAnalyticsModule(proto) {
    Object.assign(proto, {
        getDetailContext,
        setupAnalyticsControls,
        populateAnalyticsFilters,
        populateDetailSelectors,
        populateEvaluationOptionsForPatient,
        handleDetailPatientChange,
        handleDetailEvaluationChange,
        exportSelectedEvaluation,
        updateAnalyticsResults
    });
}

function getDetailContext(context = 'analytics') {
    if (context === 'pdi') {
        const selectors = this.pdiSelectors;
        if (!selectors) return null;
        return {
            patientSelect: selectors.patient || null,
            evaluationSelect: selectors.evaluation || null,
            exportButton: selectors.exportButton || selectors.exportEvaluation || null,
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

function setupAnalyticsControls() {
    const panel = document.getElementById('analytics-menu');
    if (!panel) {
        return;
    }

    this.analyticsControls = {
        panel,
        grouping: document.getElementById('analytics-grouping'),
        metric: document.getElementById('analytics-metric'),
        patient: document.getElementById('analytics-patient'),
        evaluator: document.getElementById('analytics-evaluator'),
        dateFrom: document.getElementById('analytics-date-from'),
        dateTo: document.getElementById('analytics-date-to'),
        clear: document.getElementById('analytics-clear'),
        run: document.getElementById('analytics-run'),
        detailPatient: document.getElementById('analytics-detail-patient'),
        detailEvaluation: document.getElementById('analytics-detail-evaluation'),
        viewEvaluation: document.getElementById('analytics-export-evaluation'),
        summary: {
            total: document.getElementById('analytics-total-selected'),
            averagePercent: document.getElementById('analytics-average-percent'),
            bestGroup: document.getElementById('analytics-best-group')
        },
        resultsContainer: document.getElementById('analytics-results'),
        evaluationDetailContainer: document.getElementById('analytics-evaluation-detail')
    };

    const autoUpdateHandler = () => this.updateAnalyticsResults();

    ['grouping', 'metric', 'patient', 'evaluator'].forEach(key => {
        const element = this.analyticsControls[key];
        if (element) {
            element.addEventListener('change', autoUpdateHandler);
        }
    });

    ['dateFrom', 'dateTo'].forEach(key => {
        const element = this.analyticsControls[key];
        if (element) {
            element.addEventListener('change', () => this.updateAnalyticsResults());
        }
    });

    if (this.analyticsControls.run) {
        this.analyticsControls.run.addEventListener('click', () => this.updateAnalyticsResults(true));
    }

    if (this.analyticsControls.clear) {
        this.analyticsControls.clear.addEventListener('click', () => {
            if (this.analyticsControls.patient) this.analyticsControls.patient.value = '';
            if (this.analyticsControls.evaluator) this.analyticsControls.evaluator.value = '';
            if (this.analyticsControls.dateFrom) this.analyticsControls.dateFrom.value = '';
            if (this.analyticsControls.dateTo) this.analyticsControls.dateTo.value = '';
            if (this.analyticsControls.detailPatient) this.analyticsControls.detailPatient.value = '';
            if (this.analyticsControls.detailEvaluation) {
                this.analyticsControls.detailEvaluation.innerHTML = '<option value=\"\">Selecione uma avaliação...</option>';
                this.analyticsControls.detailEvaluation.disabled = true;
            }
            if (this.analyticsControls.viewEvaluation) {
                this.analyticsControls.viewEvaluation.disabled = true;
            }
            if (this.pdiSelectors?.patient) {
                this.pdiSelectors.patient.value = '';
            }
            if (this.pdiSelectors?.evaluation) {
                this.pdiSelectors.evaluation.innerHTML = '<option value=\"\">Selecione uma avaliação...</option>';
                this.pdiSelectors.evaluation.disabled = true;
            }
            if (this.pdiSelectors?.exportButton) {
                this.pdiSelectors.exportButton.disabled = true;
            }
            this.selectedEvaluationId = null;
            this.renderSelectedEvaluationDetail('analytics');
            this.renderSelectedEvaluationDetail('pdi');
            this.updateAnalyticsResults(true);
        });
    }

    if (this.analyticsControls.detailPatient) {
        this.analyticsControls.detailPatient.addEventListener('change', (event) => this.handleDetailPatientChange(event, 'analytics'));
    }

    if (this.analyticsControls.detailEvaluation) {
        this.analyticsControls.detailEvaluation.addEventListener('change', (event) => this.handleDetailEvaluationChange(event, 'analytics'));
    }

    if (this.analyticsControls.viewEvaluation) {
        this.analyticsControls.viewEvaluation.addEventListener('click', () => this.exportSelectedEvaluation());
    }
}

function populateAnalyticsFilters(evaluations) {
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    const patientSelect = this.analyticsControls?.patient;
    if (patientSelect) {
        const selectedPatient = patientSelect.value;
        const patientsMap = new Map();
        evaluations.forEach(evaluation => {
            const name = evaluation.patientInfo?.name?.trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (!patientsMap.has(key)) {
                patientsMap.set(key, name);
            }
        });
        const patients = Array.from(patientsMap.values()).sort(collator.compare);
        patientSelect.innerHTML = [
            '<option value="">Todos os pacientes</option>',
            ...patients.map(name => `<option value="${name}">${name}</option>`)
        ].join('');
        if (selectedPatient && patients.includes(selectedPatient)) {
            patientSelect.value = selectedPatient;
        }
    }

    const evaluatorSelect = this.analyticsControls?.evaluator;
    if (evaluatorSelect) {
        const selectedEvaluator = evaluatorSelect.value;
        const evaluatorsMap = new Map();
        evaluations.forEach(evaluation => {
            const name = evaluation.evaluatorInfo?.name?.trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (!evaluatorsMap.has(key)) {
                evaluatorsMap.set(key, name);
            }
        });
        const evaluators = Array.from(evaluatorsMap.values()).sort(collator.compare);
        evaluatorSelect.innerHTML = [
            '<option value="">Todos os avaliadores</option>',
            ...evaluators.map(name => `<option value="${name}">${name}</option>`)
        ].join('');
        if (selectedEvaluator && evaluators.includes(selectedEvaluator)) {
            evaluatorSelect.value = selectedEvaluator;
        }
    }

    this.populateDetailSelectors();
}

function populateDetailSelectors() {
    populateDetailSelectorsForContext.call(this, 'analytics');
    populateDetailSelectorsForContext.call(this, 'pdi');
}

function populateDetailSelectorsForContext(context) {
    const selectors = getDetailContext.call(this, context);
    if (!selectors || !selectors.patientSelect || !selectors.evaluationSelect) {
        return;
    }

    const patientSelect = selectors.patientSelect;
    const evaluationSelect = selectors.evaluationSelect;
    const exportButton = selectors.exportButton;

    const existingSelection = patientSelect.value;
    const patients = this.sortedPatients || [];

    let optionsHtml = '<option value="">Selecione um paciente...</option>';
    patients.forEach(entry => {
        const isSelected = entry.key === existingSelection;
        optionsHtml += `<option value="${this.escapeHtml(entry.key)}"${isSelected ? ' selected' : ''}>${this.escapeHtml(entry.name)}</option>`;
    });
    patientSelect.innerHTML = optionsHtml;

    const validSelection = patients.find(entry => entry.key === existingSelection) ? existingSelection : '';
    if (!validSelection) {
        patientSelect.value = '';
    }

    this.populateEvaluationOptionsForPatient(validSelection || null, context);

    if (exportButton) {
        exportButton.disabled = !this.selectedEvaluationId;
    }
}

function populateEvaluationOptionsForPatient(patientKey, context = 'analytics') {
    const selectors = getDetailContext.call(this, context);
    if (!selectors || !selectors.evaluationSelect) {
        return;
    }

    const evaluationSelect = selectors.evaluationSelect;
    const exportButton = selectors.exportButton;

    if (!patientKey || !this.evaluationsByPatient.has(patientKey)) {
        evaluationSelect.innerHTML = '<option value="">Selecione uma avaliação...</option>';
        evaluationSelect.disabled = true;
        if (exportButton) {
            exportButton.disabled = true;
        }
        if (context === 'pdi') {
            this.renderSelectedEvaluationDetail('pdi');
        } else {
            this.renderSelectedEvaluationDetail('analytics');
        }
        return;
    }

    const entry = this.evaluationsByPatient.get(patientKey);
    let optionsHtml = '<option value="">Selecione uma avaliação...</option>';

    entry.evaluations.forEach(({ id, data }) => {
        const label = this.formatEvaluationOptionLabel(data);
        const selectedAttr = id === this.selectedEvaluationId ? ' selected' : '';
        optionsHtml += `<option value="${this.escapeHtml(id)}"${selectedAttr}>${this.escapeHtml(label)}</option>`;
    });

    evaluationSelect.innerHTML = optionsHtml;
    evaluationSelect.disabled = entry.evaluations.length === 0;

    if (!this.selectedEvaluationId || !entry.evaluations.some(ev => ev.id === this.selectedEvaluationId)) {
        this.selectedEvaluationId = entry.evaluations.length > 0 ? entry.evaluations[0].id : null;
    }

    if (this.selectedEvaluationId) {
        evaluationSelect.value = this.selectedEvaluationId;
    }

    if (exportButton) {
        exportButton.disabled = !this.selectedEvaluationId;
    }

    if (context === 'pdi') {
        this.renderSelectedEvaluationDetail('pdi');
    } else {
        this.renderSelectedEvaluationDetail('analytics');
    }
}

function handleDetailPatientChange(event, context = 'analytics') {
    const patientKey = event.target.value || null;
    this.selectedEvaluationId = null;

    const otherContext = context === 'analytics' ? 'pdi' : 'analytics';
    const otherSelectors = getDetailContext.call(this, otherContext);
    if (otherSelectors?.patientSelect) {
        otherSelectors.patientSelect.value = patientKey || '';
    }

    this.populateEvaluationOptionsForPatient(patientKey, context);
    this.populateEvaluationOptionsForPatient(patientKey, otherContext);

    // Observer Pattern: Publica evento de seleção de paciente
    if (this.publishEvent && this.Events?.PATIENT_SELECTED) {
        this.publishEvent(this.Events.PATIENT_SELECTED, { patientKey, context });
    }
}

function handleDetailEvaluationChange(event, context = 'analytics') {
    const evaluationId = event.target.value || null;
    this.selectedEvaluationId = evaluationId || null;

    const contexts = ['analytics', 'pdi'];
    contexts.forEach(ctx => {
        const selectors = getDetailContext.call(this, ctx);
        if (selectors?.evaluationSelect && selectors.evaluationSelect !== event.target) {
            selectors.evaluationSelect.value = this.selectedEvaluationId || '';
        }
        if (selectors?.exportButton) {
            selectors.exportButton.disabled = !this.selectedEvaluationId;
        }
        if (ctx === 'pdi' && selectors?.generateButton) {
            selectors.generateButton.disabled = !this.selectedEvaluationId;
        }
    });

    this.renderSelectedEvaluationDetail('analytics');
    this.renderSelectedEvaluationDetail('pdi');

    // Observer Pattern: Publica evento de seleção de avaliação
    if (this.publishEvent && this.Events?.EVALUATION_SELECTED) {
        this.publishEvent(this.Events.EVALUATION_SELECTED, { evaluationId, context });
    }
}

function exportSelectedEvaluation() {
    if (!this.selectedEvaluationId) {
        this.showNotification('Selecione uma avaliação para exportar.', 'warning');
        return;
    }

    const evaluation = this.evaluationIndex.get(this.selectedEvaluationId);
    if (!evaluation) {
        this.showNotification('Avaliação não encontrada.', 'error');
        return;
    }

    const descriptions = this.getQuestionDescriptions();
    const responsesMap = this.mapResponsesByQuestion(evaluation);
    const patientName = evaluation.patientInfo?.name || '';
    const evaluatorName = evaluation.evaluatorInfo?.name || evaluation.patientInfo?.evaluatorName || '';
    const evaluationDate = this.parseEvaluationDate(evaluation);
    const formattedDate = evaluationDate ? evaluationDate.toLocaleDateString('pt-BR') : (evaluation.patientInfo?.evaluationDate || '');
    const source = this.formatEvaluationSource(evaluation);

    const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Paciente,Avaliacao,Data,Avaliador,Questao,Descricao,Pontuacao,Origem\n';

    for (let question = 1; question <= 149; question++) {
        const entry = responsesMap.get(question);
        const questionId = `q${question}`;
        const description = entry?.question || descriptions[questionId] || `Questão ${question}`;
        const score = entry && entry.score !== null && entry.score !== undefined ? entry.score : '';
        csvContent += [
            csvEscape(patientName),
            csvEscape(this.selectedEvaluationId),
            csvEscape(formattedDate),
            csvEscape(evaluatorName),
            question,
            csvEscape(description),
            score,
            csvEscape(source)
        ].join(',') + '\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `avaliacao_${patientName.replace(/\s+/g, '_')}_${this.selectedEvaluationId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showNotification('Avaliação exportada com sucesso.', 'success');
}

function updateAnalyticsResults(force = false) {
    if (!this.analyticsControls) {
        return;
    }

    const container = this.analyticsControls.resultsContainer;
    if (!container) {
        return;
    }

    const allEvaluations = this.filteredEvaluations || [];
    if (allEvaluations.length === 0) {
        container.innerHTML = `
            <div class="analytics-empty">
                <h4>Nenhuma avaliação disponível</h4>
                <p>Assim que os formulários forem preenchidos, os resultados analíticos aparecerão aqui.</p>
            </div>
        `;
        this.updateAnalyticsSummary([], []);
        return;
    }

    const filtered = this.filterEvaluationsForAnalytics(allEvaluations);
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="analytics-empty">
                <h4>Nenhum resultado para os filtros selecionados</h4>
                <p>Ajuste os filtros para visualizar os dados consolidados.</p>
            </div>
        `;
        this.updateAnalyticsSummary([], filtered);
        return;
    }

    const grouping = this.analyticsControls.grouping?.value || 'patient';
    const metric = this.analyticsControls.metric?.value || 'averagePercent';

    const rows = this.aggregateAnalyticsData(filtered, grouping);
    const orderedRows = rows.length ? this.sortAnalyticsRows(rows, metric) : [];

    const duplicates = this.findDuplicateEvaluations(filtered);
    const duplicateIds = new Set(duplicates.map(item => item.id));
    this.currentDuplicateIds = duplicateIds;
    const duplicateBanner = duplicates.length
        ? this.renderDuplicateBanner(duplicates)
        : '';

    const totalEvaluations = filtered.length;
    const totalPatients = new Set(filtered.map(item => (item.patientInfo?.name || '').toLowerCase().trim())).size;
    const metricLabel = this.getMetricLabel(metric);

    const summaryTableHtml = this.renderAnalyticsSummaryTable(orderedRows, grouping, metric);
    const detailedTable = this.renderAnalyticsDetailedTable(filtered, duplicateIds);

    const detailSection = `
        <div class="analytics-block">
            <div class="analytics-block-header">
                <h4>Detalhamento das Respostas</h4>
                <span class="analytics-metric-badge">${this.escapeHtml(detailedTable.countLabel)}</span>
            </div>
            <div class="analytics-summary-info">
                <p>Use os filtros para refinar o recorte e, quando necessário, utilize a aba de PDI para transformar essas respostas em um plano de intervenção.</p>
            </div>
            ${detailedTable.html}
        </div>
    `;

    container.innerHTML = `
        ${duplicateBanner}
        <div class="analytics-block">
            <div class="analytics-block-header">
                <h4>Resumo Analítico</h4>
                <span class="analytics-metric-badge">${this.escapeHtml(metricLabel)}</span>
            </div>
            <div class="analytics-summary-info">
                <p><strong>${totalEvaluations}</strong> avaliação(ões) atendem ao filtro atual, distribuídas entre <strong>${totalPatients}</strong> paciente(s).</p>
                <p>Use o seletor de paciente/avaliação para explorar cada formulário completo ou configure o PDI na aba dedicada.</p>
            </div>
        </div>
        ${summaryTableHtml}
        ${detailSection}
    `;

    this.updateAnalyticsSummary(orderedRows, filtered, metric, grouping);
    this.renderSelectedEvaluationDetail('analytics');
    this.renderSelectedEvaluationDetail('pdi');
}
