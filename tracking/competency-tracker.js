// Competency Tracker - Verfolgt Lernfortschritt und Kompetenzlevel
// Overall Level (1-5) pro Hauptthema und Sub-Topics

class CompetencyTracker {
    constructor(dbService) {
        this.db = dbService;
        this.schemas = window.DataSchemas;
    }
    
    // ==================== Competency Level Management ====================
    
    /**
     * Hole Kompetenzlevel für einen User
     * @param {string} userId - User ID
     * @param {string} topic - Optional: Spezifisches Thema
     * @returns {Object|Array} Kompetenz-Daten
     */
    async getCompetency(userId, topic = null) {
        try {
            return await this.db.getCompetencyData(userId, topic);
        } catch (error) {
            console.error('[CompetencyTracker] getCompetency error:', error);
            return topic ? null : [];
        }
    }
    
    /**
     * Hole alle Kompetenzen für einen User
     */
    async getAllCompetencies(userId) {
        try {
            const competencies = await this.db.getCompetencyData(userId);
            
            // Konvertiere Array zu Map für einfacheren Zugriff
            const competencyMap = {};
            competencies.forEach(comp => {
                competencyMap[comp.topic] = comp;
            });
            
            return competencyMap;
        } catch (error) {
            console.error('[CompetencyTracker] getAllCompetencies error:', error);
            return {};
        }
    }
    
    /**
     * Update Kompetenzlevel nach erfolgter Aufgabe
     * @param {string} userId - User ID
     * @param {string} topic - Hauptthema
     * @param {Object} performanceData - Performance-Daten der Aufgabe
     */
    async updateAfterTask(userId, topic, performanceData) {
        try {
            // Hole aktuelle Kompetenz
            let competency = await this.getCompetency(userId, topic);
            
            if (!competency) {
                // Initialisiere neue Kompetenz
                competency = this._initializeCompetency(topic);
            }
            
            // Update Statistiken
            competency.tasksCompleted = (competency.tasksCompleted || 0) + 1;
            
            // Berechne neue Success Rate
            const previousTotal = (competency.tasksCompleted - 1) * (competency.successRate || 0) / 100;
            const newTotal = previousTotal + (performanceData.success ? 1 : 0);
            competency.successRate = (newTotal / competency.tasksCompleted) * 100;
            
            // Update Average Time
            const previousTimeTotal = (competency.tasksCompleted - 1) * (competency.averageTime || 0);
            competency.averageTime = (previousTimeTotal + performanceData.timeSpent) / competency.tasksCompleted;
            
            // Update Last Practiced
            competency.lastPracticed = this.schemas.generateTimestamp();
            
            // Berechne neues Overall Level basierend auf Performance
            const newLevel = this._calculateNewLevel(competency, performanceData);
            if (newLevel !== competency.overallLevel) {
                competency.overallLevel = newLevel;
            }
            
            // Speichere Updates
            return await this.db.updateCompetencyLevel(userId, topic, competency);
        } catch (error) {
            console.error('[CompetencyTracker] updateAfterTask error:', error);
            throw error;
        }
    }
    
    /**
     * Update Sub-Topic Level
     * @param {string} userId - User ID
     * @param {string} topic - Hauptthema
     * @param {string} subTopic - Sub-Thema
     * @param {number} levelChange - Änderung (+1, -1, oder absoluter Wert)
     */
    async updateSubTopic(userId, topic, subTopic, levelChange) {
        try {
            let competency = await this.getCompetency(userId, topic);
            
            if (!competency) {
                competency = this._initializeCompetency(topic);
            }
            
            if (!competency.subTopics) {
                competency.subTopics = {};
            }
            
            // Bestimme neues Level
            const currentLevel = competency.subTopics[subTopic] || 3; // Default: 3
            let newLevel;
            
            if (Math.abs(levelChange) <= 1) {
                // Relative Änderung
                newLevel = currentLevel + levelChange;
            } else {
                // Absoluter Wert
                newLevel = levelChange;
            }
            
            // Begrenze auf 1-5
            newLevel = Math.max(1, Math.min(5, newLevel));
            
            // Update Sub-Topic
            return await this.db.updateSubTopicLevel(userId, topic, subTopic, newLevel);
        } catch (error) {
            console.error('[CompetencyTracker] updateSubTopic error:', error);
            throw error;
        }
    }
    
    /**
     * Automatische Sub-Topic-Anpassung basierend auf Performance
     */
    async adjustSubTopicFromPerformance(userId, topic, subTopic, performanceData) {
        try {
            // Bestimme Level-Änderung basierend auf Performance
            let levelChange = 0;
            
            if (performanceData.success) {
                // Erfolg: Level erhöhen
                if (performanceData.difficulty === 'hard') {
                    levelChange = +1; // Schwere Aufgabe gemeistert
                } else if (performanceData.difficulty === 'medium') {
                    levelChange = +0.5;
                } else {
                    levelChange = +0.3;
                }
                
                // Weniger Erhöhung wenn viele Tipps genutzt
                if (performanceData.hintsUsed > 2) {
                    levelChange *= 0.5;
                }
                
                // Keine Erhöhung wenn Musterlösung gezeigt
                if (performanceData.showedSolution) {
                    levelChange = 0;
                }
            } else {
                // Misserfolg: Level senken
                if (performanceData.difficulty === 'easy') {
                    levelChange = -1; // Leichte Aufgabe nicht geschafft
                } else if (performanceData.difficulty === 'medium') {
                    levelChange = -0.5;
                } else {
                    levelChange = -0.3; // Schwere Aufgabe, weniger Abzug
                }
            }
            
            // Hole aktuelles Sub-Topic Level
            const competency = await this.getCompetency(userId, topic);
            const currentLevel = competency?.subTopics?.[subTopic] || 3;
            const newLevel = Math.max(1, Math.min(5, currentLevel + levelChange));
            
            if (Math.abs(newLevel - currentLevel) >= 0.2) {
                // Nur updaten wenn signifikante Änderung
                return await this.updateSubTopic(userId, topic, subTopic, Math.round(newLevel));
            }
            
            return null;
        } catch (error) {
            console.error('[CompetencyTracker] adjustSubTopicFromPerformance error:', error);
            throw error;
        }
    }
    
    // ==================== Analysis & Recommendations ====================
    
    /**
     * Identifiziere schwache Bereiche
     */
    async getWeakAreas(userId, threshold = 3) {
        try {
            const competencies = await this.getAllCompetencies(userId);
            const weakAreas = {
                topics: [],
                subTopics: []
            };
            
            for (const [topic, competency] of Object.entries(competencies)) {
                // Check Overall Level
                if (competency.overallLevel < threshold) {
                    weakAreas.topics.push({
                        topic,
                        level: competency.overallLevel,
                        successRate: competency.successRate
                    });
                }
                
                // Check Sub-Topics
                if (competency.subTopics) {
                    for (const [subTopic, level] of Object.entries(competency.subTopics)) {
                        if (level < threshold) {
                            weakAreas.subTopics.push({
                                topic,
                                subTopic,
                                level
                            });
                        }
                    }
                }
            }
            
            return weakAreas;
        } catch (error) {
            console.error('[CompetencyTracker] getWeakAreas error:', error);
            return { topics: [], subTopics: [] };
        }
    }
    
    /**
     * Identifiziere starke Bereiche (zum Aufbauen)
     */
    async getStrongAreas(userId, threshold = 4) {
        try {
            const competencies = await this.getAllCompetencies(userId);
            const strongAreas = {
                topics: [],
                subTopics: []
            };
            
            for (const [topic, competency] of Object.entries(competencies)) {
                if (competency.overallLevel >= threshold) {
                    strongAreas.topics.push({
                        topic,
                        level: competency.overallLevel,
                        successRate: competency.successRate
                    });
                }
                
                if (competency.subTopics) {
                    for (const [subTopic, level] of Object.entries(competency.subTopics)) {
                        if (level >= threshold) {
                            strongAreas.subTopics.push({
                                topic,
                                subTopic,
                                level
                            });
                        }
                    }
                }
            }
            
            return strongAreas;
        } catch (error) {
            console.error('[CompetencyTracker] getStrongAreas error:', error);
            return { topics: [], subTopics: [] };
        }
    }
    
    /**
     * Empfehle nächstes Übungsthema basierend auf Kompetenz
     */
    async recommendNextPractice(userId) {
        try {
            const competencies = await this.getAllCompetencies(userId);
            
            // Finde Thema mit niedrigstem Level das noch nicht gemeistert ist
            let lowestCompetency = null;
            let lowestLevel = 6;
            
            for (const [topic, competency] of Object.entries(competencies)) {
                if (competency.overallLevel < lowestLevel && competency.overallLevel < 4) {
                    lowestLevel = competency.overallLevel;
                    lowestCompetency = { topic, ...competency };
                }
            }
            
            if (lowestCompetency) {
                // Finde schwächstes Sub-Topic in diesem Thema
                let weakestSubTopic = null;
                let weakestLevel = 6;
                
                if (lowestCompetency.subTopics) {
                    for (const [subTopic, level] of Object.entries(lowestCompetency.subTopics)) {
                        if (level < weakestLevel) {
                            weakestLevel = level;
                            weakestSubTopic = subTopic;
                        }
                    }
                }
                
                return {
                    topic: lowestCompetency.topic,
                    subTopic: weakestSubTopic,
                    currentLevel: lowestLevel,
                    reason: 'Needs improvement',
                    suggestedDifficulty: this._suggestDifficulty(lowestLevel)
                };
            }
            
            // Alle Themen gemeistert, empfehle zufälliges schwieriges Thema
            const topics = Object.keys(this.schemas.CompetencyTrackingSchema.topics);
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];
            
            return {
                topic: randomTopic,
                subTopic: null,
                currentLevel: 5,
                reason: 'All topics mastered - practice advanced',
                suggestedDifficulty: 'hard'
            };
        } catch (error) {
            console.error('[CompetencyTracker] recommendNextPractice error:', error);
            return null;
        }
    }
    
    // ==================== Helper Methods ====================
    
    _initializeCompetency(topic) {
        const topicInfo = this.schemas.CompetencyTrackingSchema.topics[topic];
        const competency = {
            topic,
            overallLevel: 3, // Neutral start
            subTopics: {},
            tasksCompleted: 0,
            successRate: 0,
            averageTime: 0,
            history: []
        };
        
        // Initialize sub-topics with neutral level
        if (topicInfo && topicInfo.subTopics) {
            topicInfo.subTopics.forEach(subTopic => {
                competency.subTopics[subTopic] = 3;
            });
        }
        
        return competency;
    }
    
    _calculateNewLevel(competency, performanceData) {
        const currentLevel = competency.overallLevel;
        
        // Faktoren für Level-Berechnung
        const successRateFactor = competency.successRate / 100; // 0-1
        const taskCountFactor = Math.min(competency.tasksCompleted / 20, 1); // max bei 20 Tasks
        const recentSuccess = performanceData.success ? 1 : 0;
        
        // Gewichteter Score
        const score = (successRateFactor * 0.6) + (taskCountFactor * 0.2) + (recentSuccess * 0.2);
        
        // Mappe Score zu Level (1-5)
        let newLevel;
        if (score < 0.2) newLevel = 1;
        else if (score < 0.4) newLevel = 2;
        else if (score < 0.6) newLevel = 3;
        else if (score < 0.8) newLevel = 4;
        else newLevel = 5;
        
        // Gradueller Übergang: max ±1 Level pro Update
        if (Math.abs(newLevel - currentLevel) > 1) {
            newLevel = currentLevel + (newLevel > currentLevel ? 1 : -1);
        }
        
        return newLevel;
    }
    
    _suggestDifficulty(level) {
        if (level <= 2) return 'easy';
        if (level === 3) return 'medium';
        return 'hard';
    }
    
    /**
     * Export Kompetenz-Daten (für Reporting/Analytics)
     */
    async exportData(userId) {
        try {
            const competencies = await this.getAllCompetencies(userId);
            
            return {
                userId,
                exportDate: this.schemas.generateTimestamp(),
                competencies,
                summary: {
                    totalTopics: Object.keys(competencies).length,
                    averageLevel: this._calculateAverageLevel(competencies),
                    masteredTopics: Object.values(competencies).filter(c => c.overallLevel >= 4).length
                }
            };
        } catch (error) {
            console.error('[CompetencyTracker] exportData error:', error);
            throw error;
        }
    }
    
    _calculateAverageLevel(competencies) {
        const levels = Object.values(competencies).map(c => c.overallLevel);
        if (levels.length === 0) return 0;
        return levels.reduce((sum, level) => sum + level, 0) / levels.length;
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompetencyTracker;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.CompetencyTracker = CompetencyTracker;
}

