// Behavior Tracker - Verfolgt Nutzerverhalten und generiert Interventionen
// Gewohnheiten, Muster, Auto-Interventionen

class BehaviorTracker {
    constructor(dbService) {
        this.db = dbService;
        this.schemas = window.DataSchemas;
        this.behaviorTypes = this.schemas.BehaviorAnalyticsSchema.behaviorTypes;
        
        // Intervention-Thresholds
        this.thresholds = {
            solutionRequest: 4, // Max 4 Musterlösungen in kurzer Zeit (dann Intervention)
            quickSolution: 3, // Max 3 schnelle Musterlösungen ohne Versuch
            taskAbandon: 3, // Max 3 Aufgaben-Abbrüche
            longPause: 600, // 10 Minuten Pause
            rapidSwitching: 5 // 5 Task-Wechsel in kurzer Zeit
        };
        
        // Session-Tracking
        this.sessionBehaviors = [];
    }
    
    // ==================== Behavior Logging ====================
    
    /**
     * Log ein Verhalten
     * @param {string} userId - User ID
     * @param {string} behaviorType - Typ des Verhaltens
     * @param {Object} context - Zusätzlicher Kontext
     */
    async logBehavior(userId, behaviorType, context = {}) {
        try {
            const behaviorData = {
                behaviorType,
                action: context.action || behaviorType,
                context,
                frequency: 1
            };
            
            // Log in DB
            await this.db.logBehavior(userId, behaviorData);
            
            // Füge zu Session hinzu
            this.sessionBehaviors.push({
                type: behaviorType,
                timestamp: Date.now(),
                context
            });
            
            // Prüfe ob Intervention nötig
            const intervention = await this._checkForIntervention(userId, behaviorType, context);
            
            return { logged: true, intervention };
        } catch (error) {
            console.error('[BehaviorTracker] logBehavior error:', error);
            throw error;
        }
    }
    
    // ==================== Specific Behavior Tracking ====================
    
    /**
     * User fordert Musterlösung an
     */
    async trackSolutionRequest(userId, context) {
        return await this.logBehavior(userId, this.behaviorTypes.SOLUTION_REQUEST, context);
    }
    
    /**
     * User fordert Tipp an
     */
    async trackHintRequest(userId, context) {
        return await this.logBehavior(userId, this.behaviorTypes.HINT_REQUEST, context);
    }
    
    /**
     * User bricht Aufgabe ab
     */
    async trackTaskAbandon(userId, context) {
        return await this.logBehavior(userId, this.behaviorTypes.TASK_ABANDON, context);
    }
    
    /**
     * User zeigt schnell Lösung ohne eigenen Versuch
     */
    async trackQuickSolution(userId, context) {
        return await this.logBehavior(userId, this.behaviorTypes.QUICK_SOLUTION, context);
    }
    
    /**
     * User versucht selbst zu lösen
     */
    async trackSelfSolveAttempt(userId, context) {
        return await this.logBehavior(userId, this.behaviorTypes.SELF_SOLVE_ATTEMPT, context);
    }
    
    /**
     * User wiederholt Aufgabe
     */
    async trackTaskRepeat(userId, context) {
        return await this.logBehavior(userId, this.behaviorTypes.TASK_REPEAT, context);
    }
    
    // ==================== Pattern Analysis ====================
    
    /**
     * Hole Verhaltensmuster
     * @param {string} userId - User ID
     * @param {number} days - Zeitraum
     * @returns {Object} Muster-Analyse
     */
    async getPatterns(userId, days = 30) {
        try {
            return await this.db.getBehaviorPatterns(userId, null, days);
        } catch (error) {
            console.error('[BehaviorTracker] getPatterns error:', error);
            return {};
        }
    }
    
    /**
     * Analysiere aktuelle Session
     */
    analyzeSessionBehavior() {
        const now = Date.now();
        const recentWindow = 600000; // 10 Minuten
        
        const recentBehaviors = this.sessionBehaviors.filter(b => 
            now - b.timestamp < recentWindow
        );
        
        const analysis = {
            totalBehaviors: this.sessionBehaviors.length,
            recentBehaviors: recentBehaviors.length,
            solutionRequests: this._countBehaviorType(recentBehaviors, this.behaviorTypes.SOLUTION_REQUEST),
            hintRequests: this._countBehaviorType(recentBehaviors, this.behaviorTypes.HINT_REQUEST),
            taskAbandons: this._countBehaviorType(recentBehaviors, this.behaviorTypes.TASK_ABANDON),
            selfSolveAttempts: this._countBehaviorType(recentBehaviors, this.behaviorTypes.SELF_SOLVE_ATTEMPT)
        };
        
        // Berechne Help-Seeking-Ratio
        const helpRequests = analysis.solutionRequests + analysis.hintRequests;
        const totalActions = analysis.selfSolveAttempts + helpRequests;
        analysis.helpSeekingRatio = totalActions > 0 ? helpRequests / totalActions : 0;
        
        return analysis;
    }
    
    /**
     * Identifiziere problematische Muster
     */
    async identifyProblematicPatterns(userId, days = 14) {
        try {
            const patterns = await this.getPatterns(userId, days);
            const problems = [];
            
            // Muster 1: Zu viele Musterlösungen
            const solutionRequests = patterns[this.behaviorTypes.SOLUTION_REQUEST];
            if (solutionRequests && solutionRequests.count > 15) {
                problems.push({
                    type: 'excessive_solution_requests',
                    severity: 'high',
                    count: solutionRequests.count,
                    message: 'Du zeigst sehr oft die Musterlösung statt selbst zu probieren.'
                });
            }
            
            // Muster 2: Viele Abbrüche
            const taskAbandons = patterns[this.behaviorTypes.TASK_ABANDON];
            if (taskAbandons && taskAbandons.count > 10) {
                problems.push({
                    type: 'frequent_abandons',
                    severity: 'medium',
                    count: taskAbandons.count,
                    message: 'Du brichst häufig Aufgaben ab. Vielleicht sind sie zu schwer?'
                });
            }
            
            // Muster 3: Wenig eigenständige Versuche
            const selfSolve = patterns[this.behaviorTypes.SELF_SOLVE_ATTEMPT];
            const totalActions = Object.values(patterns).reduce((sum, p) => sum + (p.count || 0), 0);
            const selfSolveRatio = selfSolve ? selfSolve.count / totalActions : 0;
            
            if (selfSolveRatio < 0.3 && totalActions > 10) {
                problems.push({
                    type: 'low_self_solve',
                    severity: 'medium',
                    ratio: selfSolveRatio,
                    message: 'Du verlässt dich stark auf Hilfe. Versuche mehr selbstständig zu lösen!'
                });
            }
            
            return problems;
        } catch (error) {
            console.error('[BehaviorTracker] identifyProblematicPatterns error:', error);
            return [];
        }
    }
    
    // ==================== Auto-Interventionen ====================
    
    /**
     * Prüfe ob Intervention nötig ist
     * @private
     */
    async _checkForIntervention(userId, behaviorType, context) {
        const sessionAnalysis = this.analyzeSessionBehavior();
        
        // Intervention 1: Zu viele Musterlösungen (jetzt via Prompt statt Popup)
        if (behaviorType === this.behaviorTypes.SOLUTION_REQUEST && 
            sessionAnalysis.solutionRequests >= this.thresholds.solutionRequest) {
            return this._createIntervention('prompt_advice', 
                'Musterlösungs-Intervention',
                'KI soll proaktiv auf Schwierigkeiten eingehen',
                ['ask_about_difficulties', 'explain_extra_detailed', 'encourage_questions']
            );
        }
        
        // Intervention 2: Schnelle Musterlösungen ohne Versuch
        if (behaviorType === this.behaviorTypes.QUICK_SOLUTION && 
            sessionAnalysis.solutionRequests >= this.thresholds.quickSolution) {
            return this._createIntervention('warning',
                'Versuche mehr selbst!',
                'Du zeigst oft direkt die Lösung. Versuch doch, die Aufgabe erst selbst anzugehen – auch wenn sie schwierig erscheint!',
                ['encourage_attempt', 'motivate']
            );
        }
        
        // Intervention 3: Viele Abbrüche
        if (behaviorType === this.behaviorTypes.TASK_ABANDON && 
            sessionAnalysis.taskAbandons >= this.thresholds.taskAbandon) {
            return this._createIntervention('suggestion',
                'Aufgaben zu schwierig?',
                'Du brichst öfter Aufgaben ab. Sollen wir den Schwierigkeitsgrad anpassen?',
                ['lower_difficulty', 'suggest_break']
            );
        }
        
        // Intervention 4: Niedrige Self-Solve-Rate
        if (sessionAnalysis.helpSeekingRatio > 0.8 && sessionAnalysis.totalBehaviors > 5) {
            return this._createIntervention('encouragement',
                'Du schaffst das!',
                'Ich sehe, dass du viel Hilfe nutzt. Das ist okay! Aber versuch auch mal, eine Aufgabe komplett allein zu lösen. Du wirst überrascht sein!',
                ['motivate', 'build_confidence']
            );
        }
        
        return null;
    }
    
    _createIntervention(type, title, message, suggestedActions) {
        return {
            type,
            title,
            message,
            suggestedActions,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Generiere Verhaltens-basierte Empfehlungen
     */
    async generateBehaviorRecommendations(userId, days = 14) {
        try {
            const patterns = await this.getPatterns(userId, days);
            const problems = await this.identifyProblematicPatterns(userId, days);
            const recommendations = [];
            
            // Empfehlung basierend auf Problemen
            problems.forEach(problem => {
                switch (problem.type) {
                    case 'excessive_solution_requests':
                        recommendations.push({
                            priority: 'high',
                            message: 'Nutze mehr Tipps statt direkt Musterlösungen anzusehen.',
                            action: 'encourage_hints'
                        });
                        break;
                    case 'frequent_abandons':
                        recommendations.push({
                            priority: 'medium',
                            message: 'Versuche leichtere Aufgaben oder mache öfter Pausen.',
                            action: 'adjust_difficulty_or_break'
                        });
                        break;
                    case 'low_self_solve':
                        recommendations.push({
                            priority: 'medium',
                            message: 'Baue Selbstvertrauen durch eigenständiges Lösen auf.',
                            action: 'encourage_independence'
                        });
                        break;
                }
            });
            
            // Positive Verstärkung
            const selfSolve = patterns[this.behaviorTypes.SELF_SOLVE_ATTEMPT];
            if (selfSolve && selfSolve.count > 10) {
                recommendations.push({
                    priority: 'low',
                    message: 'Super! Du arbeitest sehr selbstständig. Weiter so!',
                    action: 'positive_feedback'
                });
            }
            
            return recommendations;
        } catch (error) {
            console.error('[BehaviorTracker] generateBehaviorRecommendations error:', error);
            return [];
        }
    }
    
    // ==================== Helper Methods ====================
    
    _countBehaviorType(behaviors, type) {
        return behaviors.filter(b => b.type === type).length;
    }
    
    /**
     * Reset Session (z.B. bei Logout)
     */
    resetSession() {
        this.sessionBehaviors = [];
    }
    
    /**
     * Export Verhaltens-Daten (für Reporting)
     */
    async exportData(userId, days = 30) {
        try {
            const patterns = await this.getPatterns(userId, days);
            const problems = await this.identifyProblematicPatterns(userId, days);
            const sessionAnalysis = this.analyzeSessionBehavior();
            
            return {
                userId,
                exportDate: this.schemas.generateTimestamp(),
                timeRange: days,
                patterns,
                problems,
                sessionAnalysis,
                summary: {
                    totalBehaviors: Object.values(patterns).reduce((sum, p) => sum + (p.count || 0), 0),
                    problemCount: problems.length,
                    helpSeekingRatio: sessionAnalysis.helpSeekingRatio
                }
            };
        } catch (error) {
            console.error('[BehaviorTracker] exportData error:', error);
            throw error;
        }
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BehaviorTracker;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.BehaviorTracker = BehaviorTracker;
}

