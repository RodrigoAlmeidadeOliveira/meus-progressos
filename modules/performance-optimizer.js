/**
 * Performance Optimizer Module
 *
 * Otimizações de performance para carregamento de dados do Firebase:
 * - Cache inteligente com TTL
 * - Carregamento progressivo (pagination)
 * - Debouncing de queries
 * - Lazy loading de dados pesados
 * - IndexedDB para cache persistente
 */

export class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 5 * 60 * 1000; // 5 minutos
        this.dbName = 'FormAvalCache';
        this.dbVersion = 1;
        this.db = null;
        this.initIndexedDB();
    }

    /**
     * Inicializa IndexedDB para cache persistente
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.warn('⚠️ Performance: IndexedDB não disponível, usando cache em memória');
                resolve(null);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ Performance: IndexedDB inicializado');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Object store para avaliações
                if (!db.objectStoreNames.contains('evaluations')) {
                    const store = db.createObjectStore('evaluations', { keyPath: 'id' });
                    store.createIndex('patientName', 'patientInfo.name', { unique: false });
                    store.createIndex('evaluationDate', 'patientInfo.evaluationDate', { unique: false });
                    store.createIndex('timestamp', 'cached_at', { unique: false });
                }

                // Object store para metadados de cache
                if (!db.objectStoreNames.contains('cache_meta')) {
                    db.createObjectStore('cache_meta', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Salva dados no IndexedDB
     */
    async saveToIndexedDB(key, data) {
        if (!this.db) return false;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['evaluations', 'cache_meta'], 'readwrite');
                const evalStore = transaction.objectStore('evaluations');
                const metaStore = transaction.objectStore('cache_meta');

                // Limpar dados antigos primeiro
                evalStore.clear();

                // Salvar avaliações
                data.forEach(evaluation => {
                    evalStore.put({
                        ...evaluation,
                        cached_at: Date.now()
                    });
                });

                // Salvar metadados
                metaStore.put({
                    key,
                    timestamp: Date.now(),
                    count: data.length
                });

                transaction.oncomplete = () => resolve(true);
                transaction.onerror = () => resolve(false);
            } catch (error) {
                console.error('Erro ao salvar no IndexedDB:', error);
                resolve(false);
            }
        });
    }

    /**
     * Busca dados do IndexedDB
     */
    async getFromIndexedDB(key, maxAge = this.cacheTTL) {
        if (!this.db) return null;

        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['evaluations', 'cache_meta'], 'readonly');
                const evalStore = transaction.objectStore('evaluations');
                const metaStore = transaction.objectStore('cache_meta');

                // Verificar metadados
                const metaRequest = metaStore.get(key);

                metaRequest.onsuccess = () => {
                    const meta = metaRequest.result;

                    // Cache expirado ou inexistente
                    if (!meta || (Date.now() - meta.timestamp) > maxAge) {
                        resolve(null);
                        return;
                    }

                    // Buscar todas as avaliações
                    const getAllRequest = evalStore.getAll();

                    getAllRequest.onsuccess = () => {
                        const data = getAllRequest.result || [];
                        console.log(`✅ Performance: ${data.length} itens do cache IndexedDB`);
                        resolve(data);
                    };

                    getAllRequest.onerror = () => resolve(null);
                };

                metaRequest.onerror = () => resolve(null);
            } catch (error) {
                console.error('Erro ao ler do IndexedDB:', error);
                resolve(null);
            }
        });
    }

    /**
     * Cache com TTL em memória
     */
    setCache(key, value, ttl = this.cacheTTL) {
        this.cache.set(key, {
            value,
            expires: Date.now() + ttl
        });
    }

    /**
     * Busca do cache em memória
     */
    getCache(key) {
        const cached = this.cache.get(key);

        if (!cached) return null;

        if (Date.now() > cached.expires) {
            this.cache.delete(key);
            return null;
        }

        return cached.value;
    }

    /**
     * Limpa cache expirado
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, data] of this.cache.entries()) {
            if (now > data.expires) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Debounce de função
     */
    debounce(func, wait = 300) {
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

    /**
     * Throttle de função
     */
    throttle(func, limit = 1000) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Carregamento progressivo com cursor
     * Retorna dados em batches
     */
    async loadInBatches(loadFunction, batchSize = 50) {
        const results = [];
        let hasMore = true;
        let cursor = null;

        while (hasMore) {
            const batch = await loadFunction(cursor, batchSize);

            if (!batch || batch.length === 0) {
                hasMore = false;
                break;
            }

            results.push(...batch);

            if (batch.length < batchSize) {
                hasMore = false;
            } else {
                cursor = batch[batch.length - 1];
            }
        }

        return results;
    }

    /**
     * Lazy load - carrega dados sob demanda
     */
    createLazyLoader(dataSource) {
        let loaded = false;
        let data = null;

        return async () => {
            if (!loaded) {
                data = await dataSource();
                loaded = true;
            }
            return data;
        };
    }

    /**
     * Compressão de dados para localStorage
     */
    compressData(data) {
        try {
            // Remover campos desnecessários
            const compressed = data.map(item => {
                const { cached_at, source, localOnly, ...essentials } = item;
                return essentials;
            });
            return compressed;
        } catch (error) {
            console.error('Erro ao comprimir dados:', error);
            return data;
        }
    }

    /**
     * Batch updates para evitar múltiplas renderizações
     */
    batchUpdates(updates, callback) {
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => callback(updates), { timeout: 1000 });
        } else {
            setTimeout(() => callback(updates), 0);
        }
    }

    /**
     * Virtual scrolling - renderiza apenas itens visíveis
     */
    createVirtualScroller(items, itemHeight, containerHeight) {
        return {
            getVisibleRange(scrollTop) {
                const startIndex = Math.floor(scrollTop / itemHeight);
                const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
                return { startIndex, endIndex };
            },
            getVisibleItems(scrollTop) {
                const { startIndex, endIndex } = this.getVisibleRange(scrollTop);
                return items.slice(startIndex, Math.min(endIndex + 1, items.length));
            },
            getTotalHeight() {
                return items.length * itemHeight;
            }
        };
    }

    /**
     * Memoization de resultados caros
     */
    memoize(fn) {
        const cache = new Map();
        return (...args) => {
            const key = JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = fn(...args);
            cache.set(key, result);
            return result;
        };
    }

    /**
     * Web Worker para processamento pesado (futuro)
     */
    async processInWorker(data, processingFn) {
        // Placeholder para implementação futura com Web Workers
        // Por enquanto, processa no thread principal
        return processingFn(data);
    }
}

/**
 * Anexa o Performance Optimizer ao protótipo
 */
export function attachPerformanceOptimizer(proto) {
    proto.performanceOptimizer = new PerformanceOptimizer();

    // Helper methods
    proto.setCache = function(key, value, ttl) {
        return this.performanceOptimizer.setCache(key, value, ttl);
    };

    proto.getCache = function(key) {
        return this.performanceOptimizer.getCache(key);
    };

    proto.debounce = function(func, wait) {
        return this.performanceOptimizer.debounce(func, wait);
    };

    proto.throttle = function(func, limit) {
        return this.performanceOptimizer.throttle(func, limit);
    };

    proto.memoize = function(fn) {
        return this.performanceOptimizer.memoize(fn);
    };
}

export default PerformanceOptimizer;
