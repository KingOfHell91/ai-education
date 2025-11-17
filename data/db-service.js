// Database Service - Abstraction Layer für DB-Operationen
// Unterstützt sowohl Mock-DB (localStorage) als auch DynamoDB

class DBService {
    constructor() {
        // Lade Konfiguration
        this.config = window.AWS_CONFIG || {};
        this.useMock = this.config.USE_MOCK !== false; // Default: Mock-Modus
        
        // Initialisiere entsprechenden DB-Provider
        if (this.useMock) {
            console.log('[DBService] Running in MOCK mode');
            this.provider = new window.DBMock();
        } else {
            console.log('[DBService] Running in PRODUCTION mode with DynamoDB');
            this.provider = new window.DynamoDBAdapter();
        }
        
        // Lade Schemas
        this.schemas = window.DataSchemas;
    }
    
    // ==================== User Profile Operations ====================
    
    async getUserProfile(userId) {
        try {
            this._log('getUserProfile', { userId });
            const profile = await this.provider.getItem(
                this.schemas.UserProfileSchema.tableName,
                { userId }
            );
            return profile;
        } catch (error) {
            this._logError('getUserProfile', error);
            throw error;
        }
    }
    
    async saveUserProfile(userId, profileData) {
        try {
            this._log('saveUserProfile', { userId });
            
            // Apply defaults
            const data = this.schemas.applyDefaults(profileData, this.schemas.UserProfileSchema);
            
            // Add metadata
            data.userId = userId;
            data.lastUpdated = this.schemas.generateTimestamp();
            if (!data.createdAt) {
                data.createdAt = data.lastUpdated;
            }
            
            // Validate
            const validation = this.schemas.validateAgainstSchema(data, this.schemas.UserProfileSchema);
            if (!validation.valid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }
            
            return await this.provider.putItem(
                this.schemas.UserProfileSchema.tableName,
                data
            );
        } catch (error) {
            this._logError('saveUserProfile', error);
            throw error;
        }
    }
    
    async updateUserProfile(userId, updates) {
        try {
            this._log('updateUserProfile', { userId, updates });
            updates.lastUpdated = this.schemas.generateTimestamp();
            
            return await this.provider.updateItem(
                this.schemas.UserProfileSchema.tableName,
                { userId },
                updates
            );
        } catch (error) {
            this._logError('updateUserProfile', error);
            throw error;
        }
    }
    
    // ==================== Competency Tracking Operations ====================
    
    async getCompetencyData(userId, topic = null) {
        try {
            this._log('getCompetencyData', { userId, topic });
            
            if (topic) {
                // Einzelnes Thema
                return await this.provider.getItem(
                    this.schemas.CompetencyTrackingSchema.tableName,
                    { userId, topic }
                );
            } else {
                // Alle Themen für User
                return await this.provider.query(
                    this.schemas.CompetencyTrackingSchema.tableName,
                    { userId }
                );
            }
        } catch (error) {
            this._logError('getCompetencyData', error);
            throw error;
        }
    }
    
    async updateCompetencyLevel(userId, topic, levelData) {
        try {
            this._log('updateCompetencyLevel', { userId, topic });
            
            // Apply defaults
            const data = this.schemas.applyDefaults(levelData, this.schemas.CompetencyTrackingSchema);
            
            // Add metadata
            data.userId = userId;
            data.topic = topic;
            data.lastUpdated = this.schemas.generateTimestamp();
            
            // Update history
            if (!data.history) {
                data.history = [];
            }
            data.history.push({
                timestamp: data.lastUpdated,
                level: data.overallLevel,
                event: 'level_update'
            });
            
            // Keep only last 50 history entries
            if (data.history.length > 50) {
                data.history = data.history.slice(-50);
            }
            
            return await this.provider.putItem(
                this.schemas.CompetencyTrackingSchema.tableName,
                data
            );
        } catch (error) {
            this._logError('updateCompetencyLevel', error);
            throw error;
        }
    }
    
    async updateSubTopicLevel(userId, topic, subTopic, level) {
        try {
            this._log('updateSubTopicLevel', { userId, topic, subTopic, level });
            
            // Hole aktuelle Daten
            const competency = await this.getCompetencyData(userId, topic) || {};
            
            // Update subTopic
            if (!competency.subTopics) {
                competency.subTopics = {};
            }
            competency.subTopics[subTopic] = level;
            
            // Berechne neuen overall level (Durchschnitt)
            const subTopicLevels = Object.values(competency.subTopics);
            if (subTopicLevels.length > 0) {
                competency.overallLevel = Math.round(
                    subTopicLevels.reduce((a, b) => a + b, 0) / subTopicLevels.length
                );
            }
            
            return await this.updateCompetencyLevel(userId, topic, competency);
        } catch (error) {
            this._logError('updateSubTopicLevel', error);
            throw error;
        }
    }
    
    // ==================== Performance Metrics Operations ====================
    
    async logPerformanceMetric(userId, metricData) {
        try {
            this._log('logPerformanceMetric', { userId });
            
            // Apply defaults
            const data = this.schemas.applyDefaults(metricData, this.schemas.PerformanceMetricsSchema);
            
            // Add metadata
            data.userId = userId;
            data.timestamp = this.schemas.generateTimestamp();
            data.metricId = this.schemas.generateId('metric');
            
            return await this.provider.putItem(
                this.schemas.PerformanceMetricsSchema.tableName,
                data
            );
        } catch (error) {
            this._logError('logPerformanceMetric', error);
            throw error;
        }
    }
    
    async getPerformanceHistory(userId, options = {}) {
        try {
            this._log('getPerformanceHistory', { userId, options });
            
            const { timeRange, topic, limit } = options;
            
            // Query mit optionalen Filtern
            const results = await this.provider.query(
                this.schemas.PerformanceMetricsSchema.tableName,
                { userId },
                { limit, sortDescending: true }
            );
            
            // Filter nach timeRange und topic
            let filtered = results;
            
            if (timeRange) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - timeRange);
                filtered = filtered.filter(m => new Date(m.timestamp) >= cutoffDate);
            }
            
            if (topic) {
                filtered = filtered.filter(m => m.topic === topic);
            }
            
            return filtered;
        } catch (error) {
            this._logError('getPerformanceHistory', error);
            throw error;
        }
    }
    
    async getPerformanceStats(userId, topic = null, days = 30) {
        try {
            this._log('getPerformanceStats', { userId, topic, days });
            
            const history = await this.getPerformanceHistory(userId, { 
                timeRange: days, 
                topic 
            });
            
            if (history.length === 0) {
                return {
                    tasksCompleted: 0,
                    successRate: 0,
                    averageTime: 0,
                    hintsUsedAvg: 0,
                    solutionShownRate: 0
                };
            }
            
            const stats = {
                tasksCompleted: history.length,
                successRate: (history.filter(h => h.success).length / history.length) * 100,
                averageTime: history.reduce((sum, h) => sum + (h.timeSpent || 0), 0) / history.length,
                hintsUsedAvg: history.reduce((sum, h) => sum + (h.hintsUsed || 0), 0) / history.length,
                solutionShownRate: (history.filter(h => h.showedSolution).length / history.length) * 100,
                fluctuationScore: this._calculateFluctuation(history)
            };
            
            return stats;
        } catch (error) {
            this._logError('getPerformanceStats', error);
            throw error;
        }
    }
    
    _calculateFluctuation(history) {
        if (history.length < 3) return 5; // Neutral
        
        // Berechne Standard-Abweichung der Erfolgsraten über Zeit
        const windowSize = 5;
        const windows = [];
        
        for (let i = 0; i <= history.length - windowSize; i++) {
            const window = history.slice(i, i + windowSize);
            const successRate = window.filter(h => h.success).length / windowSize;
            windows.push(successRate);
        }
        
        if (windows.length === 0) return 5;
        
        const mean = windows.reduce((a, b) => a + b) / windows.length;
        const variance = windows.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windows.length;
        const stdDev = Math.sqrt(variance);
        
        // Skaliere auf 0-10 (höher = mehr Fluktuation/Ablenkung)
        return Math.min(10, Math.round(stdDev * 20));
    }
    
    // ==================== Behavior Analytics Operations ====================
    
    async logBehavior(userId, behaviorData) {
        try {
            this._log('logBehavior', { userId, behaviorType: behaviorData.behaviorType });
            
            // Apply defaults
            const data = this.schemas.applyDefaults(behaviorData, this.schemas.BehaviorAnalyticsSchema);
            
            // Add metadata
            data.userId = userId;
            data.timestamp = this.schemas.generateTimestamp();
            data.behaviorKey = `${data.behaviorType}#${data.timestamp}`;
            
            if (!data.sessionId) {
                data.sessionId = this._getCurrentSessionId(userId);
            }
            
            return await this.provider.putItem(
                this.schemas.BehaviorAnalyticsSchema.tableName,
                data
            );
        } catch (error) {
            this._logError('logBehavior', error);
            throw error;
        }
    }
    
    async getBehaviorPatterns(userId, behaviorType = null, days = 30) {
        try {
            this._log('getBehaviorPatterns', { userId, behaviorType, days });
            
            // Query alle Behaviors
            const behaviors = await this.provider.query(
                this.schemas.BehaviorAnalyticsSchema.tableName,
                { userId }
            );
            
            // Filter nach Zeitraum
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            let filtered = behaviors.filter(b => new Date(b.timestamp) >= cutoffDate);
            
            // Filter nach Typ wenn angegeben
            if (behaviorType) {
                filtered = filtered.filter(b => b.behaviorType === behaviorType);
            }
            
            // Aggregiere Patterns
            const patterns = {};
            filtered.forEach(behavior => {
                if (!patterns[behavior.behaviorType]) {
                    patterns[behavior.behaviorType] = {
                        count: 0,
                        lastOccurrence: null,
                        contexts: []
                    };
                }
                patterns[behavior.behaviorType].count += behavior.frequency || 1;
                patterns[behavior.behaviorType].lastOccurrence = behavior.timestamp;
                if (behavior.context) {
                    patterns[behavior.behaviorType].contexts.push(behavior.context);
                }
            });
            
            return patterns;
        } catch (error) {
            this._logError('getBehaviorPatterns', error);
            throw error;
        }
    }
    
    // ==================== Session Operations ====================
    
    _getCurrentSessionId(userId) {
        // Hole oder erstelle Session ID für aktuelle Session
        const storageKey = `current_session_${userId}`;
        let sessionId = sessionStorage.getItem(storageKey);
        
        if (!sessionId) {
            sessionId = this.schemas.generateId('session');
            sessionStorage.setItem(storageKey, sessionId);
        }
        
        return sessionId;
    }
    
    async startSession(userId) {
        try {
            const sessionId = this._getCurrentSessionId(userId);
            const sessionData = {
                userId,
                sessionId,
                startTime: this.schemas.generateTimestamp(),
                tasksAttempted: 0,
                tasksCompleted: 0,
                topicsExplored: []
            };
            
            return await this.provider.putItem(
                this.schemas.SessionSchema.tableName,
                sessionData
            );
        } catch (error) {
            this._logError('startSession', error);
            throw error;
        }
    }
    
    async updateSession(userId, updates) {
        try {
            const sessionId = this._getCurrentSessionId(userId);
            
            return await this.provider.updateItem(
                this.schemas.SessionSchema.tableName,
                { userId, sessionId },
                updates
            );
        } catch (error) {
            this._logError('updateSession', error);
            throw error;
        }
    }
    
    // ==================== Helper Methods ====================
    
    getMode() {
        return this.useMock ? 'mock' : 'production';
    }
    
    _log(method, data = {}) {
        if (this.config.debug?.logApiCalls) {
            console.log(`[DBService] ${method}`, data);
        }
    }
    
    _logError(method, error) {
        if (this.config.debug?.verbose) {
            console.error(`[DBService] ${method} Error:`, error);
        }
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DBService;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.DBService = DBService;
}

