/**
 * Event Bus - Observer Pattern Implementation
 *
 * Este módulo implementa o padrão Observer para comunicação entre módulos
 * sem acoplamento direto. Permite que módulos se inscrevam em eventos e
 * sejam notificados quando ocorrem mudanças.
 *
 * Design Patterns:
 * - Observer Pattern: Permite pub/sub entre módulos
 * - Singleton: Instância única do EventBus
 */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Inscreve um listener para um evento específico
     * @param {string} event - Nome do evento
     * @param {Function} callback - Função a ser chamada quando o evento ocorrer
     * @returns {Function} Função para cancelar a inscrição
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);

        // Retorna função de unsubscribe
        return () => this.off(event, callback);
    }

    /**
     * Remove um listener de um evento
     * @param {string} event - Nome do evento
     * @param {Function} callback - Função a ser removida
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emite um evento para todos os listeners inscritos
     * @param {string} event - Nome do evento
     * @param {any} data - Dados a serem enviados aos listeners
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Erro ao processar evento ${event}:`, error);
            }
        });
    }

    /**
     * Remove todos os listeners de um evento
     * @param {string} event - Nome do evento (opcional, remove todos se não especificado)
     */
    clear(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

// Singleton instance
const eventBus = new EventBus();

// Eventos disponíveis
export const Events = {
    // Eventos de seleção
    PATIENT_SELECTED: 'patient:selected',
    EVALUATION_SELECTED: 'evaluation:selected',

    // Eventos de dados
    EVALUATIONS_LOADED: 'evaluations:loaded',
    EVALUATIONS_FILTERED: 'evaluations:filtered',

    // Eventos de PDI
    PDI_GENERATED: 'pdi:generated',
    PDI_EXPORTED: 'pdi:exported',

    // Eventos de Analytics
    ANALYTICS_UPDATED: 'analytics:updated',

    // Eventos de sistema
    DATA_SYNCED: 'data:synced',
    ERROR_OCCURRED: 'error:occurred'
};

export default eventBus;

/**
 * Módulo para anexar EventBus ao protótipo
 */
export function attachEventBusModule(proto) {
    proto.eventBus = eventBus;
    proto.Events = Events;

    // Helper methods
    proto.subscribeToEvent = function(event, callback) {
        return this.eventBus.on(event, callback);
    };

    proto.publishEvent = function(event, data) {
        this.eventBus.emit(event, data);
    };

    proto.unsubscribeFromEvent = function(event, callback) {
        this.eventBus.off(event, callback);
    };
}
