// Performance Tracker - Verfolgt Leistungsmetriken und Fortschritt
// Success Rate, Time, Fluctuation, Hints/Solution Usage

class PerformanceTracker {
    constructor(dbService) {
        this.db = dbService;
        this.schemas = window.DataSchemas;
        this.currentTaskStart = null;
    }
    
    // ==================== Task Performance Tracking ====================
    
    /**
     * Starte Task-Tracking
     */
    startTask(topic, difficulty = 'medium') {
        this.currentTaskStart = {
            topic,
            difficulty,
            startTime: Date.now(),
            hintsUsed: 0
        };
    }
    
    /**
     * Log eine Performance-Metrik
     * @param {string} userId - User ID
     * @param {Object} metricData - Performance-Daten
     */
    async logPerformance(userId, metricData) {
        try {
            // Ergänze automatisch erfasste Daten
            if (this.currentTaskStart) {
                metricData.topic = metricData.topic || this.currentTaskStart.topic;
                metricData.difficulty = metricData.difficulty || this.currentTaskStart.difficulty;
                
                if (!metricData.timeSpent) {
                    metricData.timeSpent = Math.floor((Date.now() - this.currentTaskStart.startTime) / 1000);
                }
                
                metricData.hintsUsed = this.currentTaskStart.hintsUsed;
            }
            
            const result = await this.db.logPerformanceMetric(userId, metricData);
            
            // Reset current task
            this.currentTaskStart = null;
            
            return result;
        } catch (error) {
            console.error('[PerformanceTracker] logPerformance error:', error);
            throw error;
        }
    }
    
    /**
     * Inkrementiere Hint-Counter
     */
    recordHintUsed() {
        if (this.currentTaskStart) {
            this.currentTaskStart.hintsUsed++;
        }
    }
    
    // ==================== Performance Analysis ====================
    
    /**
     * Hole Performance-Statistiken
     * @param {string} userId - User ID
     * @param {string} topic - Optional: Spezifisches Thema
     * @param {number} days - Zeitraum in Tagen
     */
    async getStats(userId, topic = null, days = 30) {
        try {
            return await this.db.getPerformanceStats(userId, topic, days);
        } catch (error) {
            console.error('[PerformanceTracker] getStats error:', error);
            return this._getEmptyStats();
        }
    }
    
    /**
     * Hole Performance-Verlauf
     */
    async getHistory(userId, options = {}) {
        try {
            return await this.db.getPerformanceHistory(userId, options);
        } catch (error) {
            console.error('[PerformanceTracker] getHistory error:', error);
            return [];
        }
    }
    
    /**
     * Berechne Performance-Trend
     * @returns {string} 'improving', 'stable', 'declining'
     */
    async calculateTrend(userId, topic = null, days = 14) {
        try {
            const history = await this.getHistory(userId, { topic, timeRange: days });
            
            if (history.length < 5) {
                return 'insufficient_data';
            }
            
            // Teile in zwei Hälften
            const midpoint = Math.floor(history.length / 2);
            const firstHalf = history.slice(0, midpoint);
            const secondHalf = history.slice(midpoint);
            
            // Berechne durchschnittliche Success Rate für beide Hälften
            const firstSuccessRate = this._calculateSuccessRate(firstHalf);
            const secondSuccessRate = this._calculateSuccessRate(secondHalf);
            
            // Bestimme Trend
            const difference = secondSuccessRate - firstSuccessRate;
            
            if (difference > 10) return 'improving';
            if (difference < -10) return 'declining';
            return 'stable';
        } catch (error) {
            console.error('[PerformanceTracker] calculateTrend error:', error);
            return 'unknown';
        }
    }
    
    /**
     * Identifiziere Performance-Muster
     */
    async identifyPatterns(userId, days = 30) {
        try {
            const history = await this.getHistory(userId, { timeRange: days });
            
            const patterns = {
                peakPerformanceTime: this._findPeakTime(history),
                weaknessPatterns: this._findWeaknessPatterns(history),
                strengthPatterns: this._findStrengthPatterns(history),
                consistencyScore: this._calculateConsistency(history)
            };
            
            return patterns;
        } catch (error) {
            console.error('[PerformanceTracker] identifyPatterns error:', error);
            return null;
        }
    }
    
    // ==================== Fluctuation & Motivation Analysis ====================
    
    /**
     * Berechne Fluktuation-Score (Ablenkung/Motivation-Indikator)
     * @returns {number} 0-10 (höher = mehr Fluktuation)
     */
    async calculateFluctuation(userId, days = 7) {
        try {
            const history = await this.getHistory(userId, { timeRange: days });
            
            if (history.length < 3) {
                return 5; // Neutral
            }
            
            // Berechne Varianz in Success Rate über Zeit
            const windowSize = 3;
            const successRates = [];
            
            for (let i = 0; i <= history.length - windowSize; i++) {
                const window = history.slice(i, i + windowSize);
                const rate = this._calculateSuccessRate(window);
                successRates.push(rate);
            }
            
            const mean = successRates.reduce((a, b) => a + b) / successRates.length;
            const variance = successRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / successRates.length;
            const stdDev = Math.sqrt(variance);
            
            // Skaliere auf 0-10
            const fluctuationScore = Math.min(10, Math.round(stdDev / 5));
            
            return fluctuationScore;
        } catch (error) {
            console.error('[PerformanceTracker] calculateFluctuation error:', error);
            return 5;
        }
    }
    
    /**
     * Schätze Motivationslevel
     * @returns {Object} { level: number (1-10), factors: string[] }
     */
    async estimateMotivation(userId, days = 7) {
        try {
            const history = await this.getHistory(userId, { timeRange: days });
            const stats = await this.getStats(userId, null, days);
            
            let motivationScore = 5; // Neutral
            const factors = [];
            
            // Faktor 1: Success Rate
            if (stats.successRate > 70) {
                motivationScore += 2;
                factors.push('High success rate');
            } else if (stats.successRate < 30) {
                motivationScore -= 2;
                factors.push('Low success rate (potential frustration)');
            }
            
            // Faktor 2: Hint vs Solution Usage
            if (stats.solutionShownRate > 50) {
                motivationScore -= 1;
                factors.push('Frequently shows solutions (low engagement)');
            } else if (stats.hintsUsedAvg < 1) {
                motivationScore += 1;
                factors.push('Solves independently (high engagement)');
            }
            
            // Faktor 3: Fluktuation
            const fluctuation = await this.calculateFluctuation(userId, days);
            if (fluctuation > 7) {
                motivationScore -= 1;
                factors.push('High performance fluctuation (distraction)');
            }
            
            // Faktor 4: Aktivität (Tasks pro Tag)
            const tasksPerDay = history.length / days;
            if (tasksPerDay > 3) {
                motivationScore += 1;
                factors.push('High activity level');
            } else if (tasksPerDay < 0.5) {
                motivationScore -= 1;
                factors.push('Low activity level');
            }
            
            // Begrenze auf 1-10
            motivationScore = Math.max(1, Math.min(10, motivationScore));
            
            return {
                level: motivationScore,
                factors,
                interpretation: this._interpretMotivation(motivationScore)
            };
        } catch (error) {
            console.error('[PerformanceTracker] estimateMotivation error:', error);
            return { level: 5, factors: [], interpretation: 'Unknown' };
        }
    }
    
    // ==================== Recommendations ====================
    
    /**
     * Generiere Performance-basierte Empfehlungen
     */
    async generateRecommendations(userId, days = 14) {
        try {
            const stats = await this.getStats(userId, null, days);
            const motivation = await this.estimateMotivation(userId, days);
            const trend = await this.calculateTrend(userId, null, days);
            
            const recommendations = [];
            
            // Recommendation 1: Success Rate
            if (stats.successRate < 50) {
                recommendations.push({
                    type: 'difficulty',
                    priority: 'high',
                    message: 'Versuche leichtere Aufgaben, um Vertrauen aufzubauen.',
                    action: 'lower_difficulty'
                });
            }
            
            // Recommendation 2: Solution Usage
            if (stats.solutionShownRate > 60) {
                recommendations.push({
                    type: 'engagement',
                    priority: 'medium',
                    message: 'Du zeigst oft die Musterlösung. Versuche mehr selbst zu lösen – auch mit Tipps!',
                    action: 'encourage_hints'
                });
            }
            
            // Recommendation 3: Motivation
            if (motivation.level < 4) {
                recommendations.push({
                    type: 'motivation',
                    priority: 'high',
                    message: 'Mache eine Pause oder wechsle zu einem Thema, das dir mehr Spaß macht.',
                    action: 'suggest_break'
                });
            }
            
            // Recommendation 4: Trend
            if (trend === 'declining') {
                recommendations.push({
                    type: 'performance',
                    priority: 'high',
                    message: 'Deine Performance nimmt ab. Zeit für eine Wiederholung der Grundlagen?',
                    action: 'review_basics'
                });
            } else if (trend === 'improving') {
                recommendations.push({
                    type: 'encouragement',
                    priority: 'low',
                    message: 'Großartig! Du verbesserst dich stetig. Weiter so!',
                    action: 'positive_feedback'
                });
            }
            
            // Recommendation 5: Time Management
            if (stats.averageTime > 600) { // > 10 Minuten
                recommendations.push({
                    type: 'time',
                    priority: 'medium',
                    message: 'Du brauchst viel Zeit pro Aufgabe. Übe Zeitmanagement mit Timern.',
                    action: 'suggest_timer'
                });
            }
            
            return recommendations;
        } catch (error) {
            console.error('[PerformanceTracker] generateRecommendations error:', error);
            return [];
        }
    }
    
    // ==================== Helper Methods ====================
    
    _calculateSuccessRate(metrics) {
        if (metrics.length === 0) return 0;
        const successCount = metrics.filter(m => m.success).length;
        return (successCount / metrics.length) * 100;
    }
    
    _findPeakTime(history) {
        // Gruppiere nach Stunde des Tages
        const hourlyPerformance = {};
        
        history.forEach(metric => {
            const hour = new Date(metric.timestamp).getHours();
            if (!hourlyPerformance[hour]) {
                hourlyPerformance[hour] = { total: 0, success: 0 };
            }
            hourlyPerformance[hour].total++;
            if (metric.success) hourlyPerformance[hour].success++;
        });
        
        // Finde Stunde mit höchster Success Rate
        let peakHour = null;
        let peakRate = 0;
        
        for (const [hour, data] of Object.entries(hourlyPerformance)) {
            const rate = data.success / data.total;
            if (rate > peakRate) {
                peakRate = rate;
                peakHour = parseInt(hour);
            }
        }
        
        return peakHour;
    }
    
    _findWeaknessPatterns(history) {
        const weaknesses = [];
        
        // Häufig fehlgeschlagene Themen
        const topicFailures = {};
        history.forEach(m => {
            if (!m.success) {
                topicFailures[m.topic] = (topicFailures[m.topic] || 0) + 1;
            }
        });
        
        for (const [topic, count] of Object.entries(topicFailures)) {
            if (count >= 3) {
                weaknesses.push({ topic, failureCount: count });
            }
        }
        
        return weaknesses;
    }
    
    _findStrengthPatterns(history) {
        const strengths = [];
        
        // Konsistent erfolgreiche Themen
        const topicSuccess = {};
        const topicTotal = {};
        
        history.forEach(m => {
            topicTotal[m.topic] = (topicTotal[m.topic] || 0) + 1;
            if (m.success) {
                topicSuccess[m.topic] = (topicSuccess[m.topic] || 0) + 1;
            }
        });
        
        for (const [topic, total] of Object.entries(topicTotal)) {
            const successRate = (topicSuccess[topic] || 0) / total;
            if (successRate >= 0.8 && total >= 3) {
                strengths.push({ topic, successRate: successRate * 100 });
            }
        }
        
        return strengths;
    }
    
    _calculateConsistency(history) {
        if (history.length < 5) return 50;
        
        const successRates = [];
        const windowSize = 5;
        
        for (let i = 0; i <= history.length - windowSize; i++) {
            const window = history.slice(i, i + windowSize);
            successRates.push(this._calculateSuccessRate(window));
        }
        
        // Niedrige Varianz = hohe Konsistenz
        const mean = successRates.reduce((a, b) => a + b) / successRates.length;
        const variance = successRates.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / successRates.length;
        const stdDev = Math.sqrt(variance);
        
        // Skaliere auf 0-100 (höher = konsistenter)
        return Math.max(0, Math.min(100, 100 - stdDev));
    }
    
    _interpretMotivation(score) {
        if (score >= 8) return 'Sehr motiviert';
        if (score >= 6) return 'Gut motiviert';
        if (score >= 4) return 'Neutral';
        if (score >= 2) return 'Wenig motiviert';
        return 'Sehr wenig motiviert';
    }
    
    _getEmptyStats() {
        return {
            tasksCompleted: 0,
            successRate: 0,
            averageTime: 0,
            hintsUsedAvg: 0,
            solutionShownRate: 0,
            fluctuationScore: 5
        };
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceTracker;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.PerformanceTracker = PerformanceTracker;
}

