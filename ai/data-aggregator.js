// Data Aggregator - Sammelt und aggregiert alle User-Daten
// Bereitet Daten für KI-Prompt-Personalisierung auf

class DataAggregator {
    constructor(competencyTracker, performanceTracker, behaviorTracker) {
        this.competencyTracker = competencyTracker;
        this.performanceTracker = performanceTracker;
        this.behaviorTracker = behaviorTracker;
    }
    
    // ==================== User Context Aggregation ====================
    
    /**
     * Sammle vollständigen User-Kontext
     * @param {string} userId - User ID
     * @param {string} currentTopic - Aktuelles Thema (optional)
     * @returns {Object} Aggregierter Kontext
     */
    async getUserContext(userId, currentTopic = null) {
        try {
            const [
                competencies,
                performanceStats,
                behaviorPatterns,
                weakAreas,
                strongAreas,
                motivation,
                trend
            ] = await Promise.all([
                this.competencyTracker.getAllCompetencies(userId),
                this.performanceTracker.getStats(userId, currentTopic, 30),
                this.behaviorTracker.getPatterns(userId, 30),
                this.competencyTracker.getWeakAreas(userId),
                this.competencyTracker.getStrongAreas(userId),
                this.performanceTracker.estimateMotivation(userId, 7),
                this.performanceTracker.calculateTrend(userId, currentTopic, 14)
            ]);
            
            return {
                userId,
                timestamp: new Date().toISOString(),
                currentTopic,
                competencies,
                performance: performanceStats,
                behavior: behaviorPatterns,
                weakAreas,
                strongAreas,
                motivation,
                trend,
                summary: this._createSummary(competencies, performanceStats, motivation, trend)
            };
        } catch (error) {
            console.error('[DataAggregator] getUserContext error:', error);
            return this._getEmptyContext(userId);
        }
    }
    
    /**
     * Sammle spezifischen Kontext für ein Thema
     */
    async getTopicContext(userId, topic) {
        try {
            const [
                competency,
                performanceStats,
                performanceHistory
            ] = await Promise.all([
                this.competencyTracker.getCompetency(userId, topic),
                this.performanceTracker.getStats(userId, topic, 30),
                this.performanceTracker.getHistory(userId, { topic, limit: 10 })
            ]);
            
            return {
                topic,
                competency: competency || this._getEmptyCompetency(topic),
                performance: performanceStats,
                recentHistory: performanceHistory,
                analysis: this._analyzeTopicPerformance(competency, performanceStats, performanceHistory)
            };
        } catch (error) {
            console.error('[DataAggregator] getTopicContext error:', error);
            return null;
        }
    }
    
    // ==================== Data Analysis ====================
    
    /**
     * Analysiere Lernfortschritt über alle Themen
     */
    async analyzeLearningProgress(userId, days = 30) {
        try {
            const competencies = await this.competencyTracker.getAllCompetencies(userId);
            const performanceStats = await this.performanceTracker.getStats(userId, null, days);
            
            const progress = {
                overallLevel: this._calculateOverallLevel(competencies),
                improvement: await this._calculateImprovement(userId, days),
                strengths: this._identifyStrengths(competencies, performanceStats),
                weaknesses: this._identifyWeaknesses(competencies, performanceStats),
                recommendations: await this._generateProgressRecommendations(userId, competencies, performanceStats)
            };
            
            return progress;
        } catch (error) {
            console.error('[DataAggregator] analyzeLearningProgress error:', error);
            return null;
        }
    }
    
    /**
     * Identifiziere Fokus-Bereiche für nächste Session
     */
    async identifyFocusAreas(userId) {
        try {
            const [
                weakAreas,
                motivation,
                behaviorProblems,
                nextRecommendation
            ] = await Promise.all([
                this.competencyTracker.getWeakAreas(userId),
                this.performanceTracker.estimateMotivation(userId),
                this.behaviorTracker.identifyProblematicPatterns(userId),
                this.competencyTracker.recommendNextPractice(userId)
            ]);
            
            const focusAreas = [];
            
            // Prio 1: Kritische Schwächen
            if (weakAreas.topics.length > 0) {
                const mostCritical = weakAreas.topics.sort((a, b) => a.level - b.level)[0];
                focusAreas.push({
                    priority: 'high',
                    type: 'weakness',
                    topic: mostCritical.topic,
                    reason: `Niedrigstes Kompetenzlevel (${mostCritical.level}/5)`,
                    suggestedAction: 'practice_basics'
                });
            }
            
            // Prio 2: Motivations-Probleme
            if (motivation.level < 4) {
                focusAreas.push({
                    priority: 'high',
                    type: 'motivation',
                    reason: motivation.interpretation,
                    suggestedAction: 'take_break_or_change_topic'
                });
            }
            
            // Prio 3: Verhaltens-Probleme
            if (behaviorProblems.length > 0) {
                focusAreas.push({
                    priority: 'medium',
                    type: 'behavior',
                    problems: behaviorProblems,
                    suggestedAction: 'adjust_learning_approach'
                });
            }
            
            // Prio 4: Nächste Übung
            if (nextRecommendation) {
                focusAreas.push({
                    priority: 'normal',
                    type: 'next_practice',
                    ...nextRecommendation
                });
            }
            
            return focusAreas;
        } catch (error) {
            console.error('[DataAggregator] identifyFocusAreas error:', error);
            return [];
        }
    }
    
    // ==================== Contextual Insights ====================
    
    /**
     * Generiere kontextualisierte Insights
     */
    async generateInsights(userId, currentTopic = null) {
        try {
            const context = await this.getUserContext(userId, currentTopic);
            const insights = [];
            
            // Insight 1: Kompetenz-Level
            if (currentTopic && context.competencies[currentTopic]) {
                const comp = context.competencies[currentTopic];
                insights.push({
                    type: 'competency',
                    message: `Dein Kompetenzniveau in ${currentTopic}: ${comp.overallLevel}/5`,
                    details: comp
                });
            }
            
            // Insight 2: Trend
            if (context.trend !== 'insufficient_data') {
                const trendMessages = {
                    'improving': 'Deine Performance verbessert sich! 📈',
                    'stable': 'Deine Performance ist stabil.',
                    'declining': 'Deine Performance nimmt ab. Zeit für eine Pause? 📉'
                };
                insights.push({
                    type: 'trend',
                    message: trendMessages[context.trend] || 'Trend unbekannt',
                    trend: context.trend
                });
            }
            
            // Insight 3: Motivation
            if (context.motivation) {
                insights.push({
                    type: 'motivation',
                    message: `Motivationslevel: ${context.motivation.interpretation}`,
                    level: context.motivation.level,
                    factors: context.motivation.factors
                });
            }
            
            // Insight 4: Stärken & Schwächen
            if (context.strongAreas.topics.length > 0) {
                insights.push({
                    type: 'strength',
                    message: `Stärken: ${context.strongAreas.topics.map(t => t.topic).join(', ')}`,
                    areas: context.strongAreas
                });
            }
            
            if (context.weakAreas.topics.length > 0) {
                insights.push({
                    type: 'weakness',
                    message: `Bereiche zum Verbessern: ${context.weakAreas.topics.map(t => t.topic).join(', ')}`,
                    areas: context.weakAreas
                });
            }
            
            return insights;
        } catch (error) {
            console.error('[DataAggregator] generateInsights error:', error);
            return [];
        }
    }
    
    // ==================== Helper Methods ====================
    
    _createSummary(competencies, performanceStats, motivation, trend) {
        const summary = {
            totalTopics: Object.keys(competencies).length,
            averageLevel: this._calculateOverallLevel(competencies),
            successRate: performanceStats.successRate,
            motivationLevel: motivation.level,
            trend,
            overallStatus: 'good' // default
        };
        
        // Bestimme Overall Status
        if (summary.successRate < 50 || motivation.level < 4 || trend === 'declining') {
            summary.overallStatus = 'needs_attention';
        } else if (summary.successRate > 75 && motivation.level >= 7 && trend === 'improving') {
            summary.overallStatus = 'excellent';
        }
        
        return summary;
    }
    
    _calculateOverallLevel(competencies) {
        const levels = Object.values(competencies).map(c => c.overallLevel);
        if (levels.length === 0) return 0;
        return levels.reduce((sum, level) => sum + level, 0) / levels.length;
    }
    
    async _calculateImprovement(userId, days) {
        try {
            // Vergleiche erste und zweite Hälfte des Zeitraums
            const history = await this.performanceTracker.getHistory(userId, { timeRange: days });
            
            if (history.length < 4) {
                return 0; // Nicht genug Daten
            }
            
            const midpoint = Math.floor(history.length / 2);
            const firstHalf = history.slice(0, midpoint);
            const secondHalf = history.slice(midpoint);
            
            const firstRate = firstHalf.filter(h => h.success).length / firstHalf.length;
            const secondRate = secondHalf.filter(h => h.success).length / secondHalf.length;
            
            return ((secondRate - firstRate) * 100).toFixed(1); // Prozentpunkte
        } catch (error) {
            return 0;
        }
    }
    
    _identifyStrengths(competencies, performanceStats) {
        const strengths = [];
        
        for (const [topic, comp] of Object.entries(competencies)) {
            if (comp.overallLevel >= 4 && comp.successRate > 75) {
                strengths.push({
                    topic,
                    level: comp.overallLevel,
                    successRate: comp.successRate
                });
            }
        }
        
        return strengths;
    }
    
    _identifyWeaknesses(competencies, performanceStats) {
        const weaknesses = [];
        
        for (const [topic, comp] of Object.entries(competencies)) {
            if (comp.overallLevel <= 2 || comp.successRate < 50) {
                weaknesses.push({
                    topic,
                    level: comp.overallLevel,
                    successRate: comp.successRate
                });
            }
        }
        
        return weaknesses;
    }
    
    async _generateProgressRecommendations(userId, competencies, performanceStats) {
        const recommendations = [];
        
        // Performance-basierte Empfehlungen
        const perfRecs = await this.performanceTracker.generateRecommendations(userId);
        recommendations.push(...perfRecs);
        
        // Behavior-basierte Empfehlungen
        const behavRecs = await this.behaviorTracker.generateBehaviorRecommendations(userId);
        recommendations.push(...behavRecs);
        
        return recommendations;
    }
    
    _analyzeTopicPerformance(competency, performanceStats, recentHistory) {
        const analysis = {
            readyForAdvanced: false,
            needsReview: false,
            practicing: false
        };
        
        if (competency && competency.overallLevel >= 4 && performanceStats.successRate > 80) {
            analysis.readyForAdvanced = true;
        }
        
        if (competency && competency.overallLevel <= 2 || performanceStats.successRate < 40) {
            analysis.needsReview = true;
        }
        
        if (recentHistory.length >= 3) {
            analysis.practicing = true;
        }
        
        return analysis;
    }
    
    _getEmptyContext(userId) {
        return {
            userId,
            timestamp: new Date().toISOString(),
            competencies: {},
            performance: {},
            behavior: {},
            weakAreas: { topics: [], subTopics: [] },
            strongAreas: { topics: [], subTopics: [] },
            motivation: { level: 5, factors: [], interpretation: 'Unknown' },
            trend: 'insufficient_data',
            summary: {
                totalTopics: 0,
                averageLevel: 0,
                successRate: 0,
                motivationLevel: 5,
                trend: 'insufficient_data',
                overallStatus: 'unknown'
            }
        };
    }
    
    _getEmptyCompetency(topic) {
        return {
            topic,
            overallLevel: 3,
            subTopics: {},
            tasksCompleted: 0,
            successRate: 0,
            averageTime: 0
        };
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataAggregator;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.DataAggregator = DataAggregator;
}

