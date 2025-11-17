// Mock Database Implementation
// Nutzt localStorage um DynamoDB zu simulieren mit gleichem Schema

class DBMock {
    constructor() {
        this.storagePrefix = 'mathtutor_db_';
        this.initializeTables();
    }
    
    initializeTables() {
        // Stelle sicher, dass alle Tabellen existieren
        const tables = [
            'MathTutor-UserProfiles',
            'MathTutor-CompetencyTracking',
            'MathTutor-PerformanceMetrics',
            'MathTutor-BehaviorAnalytics',
            'MathTutor-Sessions',
            'MathTutor-LearningGoals'
        ];
        
        tables.forEach(table => {
            if (!this._tableExists(table)) {
                this._createTable(table);
            }
        });
    }
    
    _tableExists(tableName) {
        return localStorage.getItem(this._getTableKey(tableName)) !== null;
    }
    
    _createTable(tableName) {
        const tableData = {
            tableName: tableName,
            items: {},
            indexes: {}
        };
        localStorage.setItem(this._getTableKey(tableName), JSON.stringify(tableData));
    }
    
    _getTableKey(tableName) {
        return this.storagePrefix + tableName;
    }
    
    _getTable(tableName) {
        const tableJson = localStorage.getItem(this._getTableKey(tableName));
        if (!tableJson) {
            this._createTable(tableName);
            return this._getTable(tableName);
        }
        return JSON.parse(tableJson);
    }
    
    _saveTable(tableName, tableData) {
        localStorage.setItem(this._getTableKey(tableName), JSON.stringify(tableData));
    }
    
    _generateItemKey(keys) {
        // Erstelle einen eindeutigen Key aus Primary Key (und Sort Key)
        return Object.values(keys).join('#');
    }
    
    // ==================== CRUD Operations ====================
    
    async putItem(tableName, item) {
        try {
            const table = this._getTable(tableName);
            
            // Bestimme Key basierend auf Schema
            let itemKey;
            if (item.userId && item.topic !== undefined) {
                // Hat Sort Key (topic)
                itemKey = this._generateItemKey({ userId: item.userId, topic: item.topic });
            } else if (item.userId && item.sessionId) {
                // Session Table
                itemKey = this._generateItemKey({ userId: item.userId, sessionId: item.sessionId });
            } else if (item.userId && item.goalId) {
                // Goals Table
                itemKey = this._generateItemKey({ userId: item.userId, goalId: item.goalId });
            } else if (item.userId && item.timestamp) {
                // Performance/Behavior mit timestamp
                itemKey = this._generateItemKey({ userId: item.userId, timestamp: item.timestamp });
            } else if (item.userId && item.behaviorKey) {
                // Behavior mit behaviorKey
                itemKey = this._generateItemKey({ userId: item.userId, behaviorKey: item.behaviorKey });
            } else if (item.userId) {
                // Nur Primary Key (User Profile)
                itemKey = item.userId;
            } else {
                throw new Error('Item must have at least userId');
            }
            
            table.items[itemKey] = item;
            this._saveTable(tableName, table);
            
            return { success: true, item };
        } catch (error) {
            console.error('[DBMock] putItem error:', error);
            throw error;
        }
    }
    
    async getItem(tableName, keys) {
        try {
            const table = this._getTable(tableName);
            const itemKey = this._generateItemKey(keys);
            
            const item = table.items[itemKey];
            return item || null;
        } catch (error) {
            console.error('[DBMock] getItem error:', error);
            throw error;
        }
    }
    
    async updateItem(tableName, keys, updates) {
        try {
            const table = this._getTable(tableName);
            const itemKey = this._generateItemKey(keys);
            
            if (!table.items[itemKey]) {
                // Item existiert nicht, erstelle es
                const newItem = { ...keys, ...updates };
                return await this.putItem(tableName, newItem);
            }
            
            // Update existierendes Item
            table.items[itemKey] = {
                ...table.items[itemKey],
                ...updates
            };
            
            this._saveTable(tableName, table);
            
            return { success: true, item: table.items[itemKey] };
        } catch (error) {
            console.error('[DBMock] updateItem error:', error);
            throw error;
        }
    }
    
    async deleteItem(tableName, keys) {
        try {
            const table = this._getTable(tableName);
            const itemKey = this._generateItemKey(keys);
            
            if (table.items[itemKey]) {
                delete table.items[itemKey];
                this._saveTable(tableName, table);
            }
            
            return { success: true };
        } catch (error) {
            console.error('[DBMock] deleteItem error:', error);
            throw error;
        }
    }
    
    async query(tableName, keys, options = {}) {
        try {
            const table = this._getTable(tableName);
            const { limit, sortDescending } = options;
            
            // Filtere Items nach Keys
            let results = Object.values(table.items).filter(item => {
                for (const [key, value] of Object.entries(keys)) {
                    if (item[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
            
            // Sortiere nach timestamp wenn vorhanden
            if (results.length > 0 && results[0].timestamp) {
                results.sort((a, b) => {
                    const dateA = new Date(a.timestamp);
                    const dateB = new Date(b.timestamp);
                    return sortDescending ? dateB - dateA : dateA - dateB;
                });
            }
            
            // Apply limit
            if (limit) {
                results = results.slice(0, limit);
            }
            
            return results;
        } catch (error) {
            console.error('[DBMock] query error:', error);
            throw error;
        }
    }
    
    async scan(tableName, filter = {}) {
        try {
            const table = this._getTable(tableName);
            let results = Object.values(table.items);
            
            // Apply filter
            if (Object.keys(filter).length > 0) {
                results = results.filter(item => {
                    for (const [key, value] of Object.entries(filter)) {
                        if (item[key] !== value) {
                            return false;
                        }
                    }
                    return true;
                });
            }
            
            return results;
        } catch (error) {
            console.error('[DBMock] scan error:', error);
            throw error;
        }
    }
    
    // ==================== Batch Operations ====================
    
    async batchGetItems(tableName, keysArray) {
        try {
            const results = [];
            for (const keys of keysArray) {
                const item = await this.getItem(tableName, keys);
                if (item) {
                    results.push(item);
                }
            }
            return results;
        } catch (error) {
            console.error('[DBMock] batchGetItems error:', error);
            throw error;
        }
    }
    
    async batchPutItems(tableName, items) {
        try {
            const results = [];
            for (const item of items) {
                const result = await this.putItem(tableName, item);
                results.push(result);
            }
            return results;
        } catch (error) {
            console.error('[DBMock] batchPutItems error:', error);
            throw error;
        }
    }
    
    // ==================== Utility Methods ====================
    
    // Lösche alle Daten aus einer Tabelle
    async clearTable(tableName) {
        try {
            this._createTable(tableName);
            return { success: true };
        } catch (error) {
            console.error('[DBMock] clearTable error:', error);
            throw error;
        }
    }
    
    // Lösche alle Daten (für Tests)
    async clearAllTables() {
        try {
            const tables = [
                'MathTutor-UserProfiles',
                'MathTutor-CompetencyTracking',
                'MathTutor-PerformanceMetrics',
                'MathTutor-BehaviorAnalytics',
                'MathTutor-Sessions',
                'MathTutor-LearningGoals'
            ];
            
            for (const table of tables) {
                await this.clearTable(table);
            }
            
            return { success: true };
        } catch (error) {
            console.error('[DBMock] clearAllTables error:', error);
            throw error;
        }
    }
    
    // Exportiere alle Daten (für Backup/Migration)
    exportAllData() {
        const exportData = {};
        const tables = [
            'MathTutor-UserProfiles',
            'MathTutor-CompetencyTracking',
            'MathTutor-PerformanceMetrics',
            'MathTutor-BehaviorAnalytics',
            'MathTutor-Sessions',
            'MathTutor-LearningGoals'
        ];
        
        tables.forEach(table => {
            const tableData = this._getTable(table);
            exportData[table] = tableData.items;
        });
        
        return exportData;
    }
    
    // Importiere Daten (für Backup/Migration)
    importData(importData) {
        try {
            for (const [tableName, items] of Object.entries(importData)) {
                const table = this._getTable(tableName);
                table.items = items;
                this._saveTable(tableName, table);
            }
            return { success: true };
        } catch (error) {
            console.error('[DBMock] importData error:', error);
            throw error;
        }
    }
    
    // Statistiken über gespeicherte Daten
    getStats() {
        const stats = {};
        const tables = [
            'MathTutor-UserProfiles',
            'MathTutor-CompetencyTracking',
            'MathTutor-PerformanceMetrics',
            'MathTutor-BehaviorAnalytics',
            'MathTutor-Sessions',
            'MathTutor-LearningGoals'
        ];
        
        tables.forEach(table => {
            const tableData = this._getTable(table);
            stats[table] = {
                itemCount: Object.keys(tableData.items).length,
                sizeInBytes: new Blob([JSON.stringify(tableData)]).size
            };
        });
        
        // Gesamtstatistiken
        stats.total = {
            tables: tables.length,
            items: Object.values(stats).reduce((sum, s) => sum + s.itemCount, 0),
            sizeInBytes: Object.values(stats).reduce((sum, s) => sum + s.sizeInBytes, 0)
        };
        
        return stats;
    }
    
    // Prüfe LocalStorage-Kapazität
    checkStorageCapacity() {
        try {
            const test = 'x'.repeat(1024); // 1KB
            let size = 0;
            
            // Teste bis 10MB
            for (let i = 0; i < 10240; i++) {
                try {
                    localStorage.setItem('storage_test_' + i, test);
                    size += 1;
                } catch (e) {
                    // Quota exceeded
                    break;
                }
            }
            
            // Cleanup
            for (let i = 0; i < size; i++) {
                localStorage.removeItem('storage_test_' + i);
            }
            
            return {
                availableKB: size,
                availableMB: (size / 1024).toFixed(2)
            };
        } catch (error) {
            console.error('[DBMock] checkStorageCapacity error:', error);
            return { error: error.message };
        }
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DBMock;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.DBMock = DBMock;
}

