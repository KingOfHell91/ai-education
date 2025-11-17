// Prompt Advisor - Konvertiert User-Daten in strukturierte KI-Anweisungen
// Generiert kontextuelle Ratschläge für optimale KI-Interaktion

class PromptAdvisor {
    constructor(dataAggregator) {
        this.dataAggregator = dataAggregator;
    }
    
    // ==================== Main Advice Generation ====================
    
    /**
     * Generiere vollständigen Advice für KI-Prompt
     * @param {string} userId - User ID
     * @param {string} currentTopic - Aktuelles Thema
     * @param {string} context - Kontext (analyze, generate, hint, etc.)
     * @param {Object} intervention - Optional: Aktive Intervention vom BehaviorTracker
     * @returns {string} Strukturierter Advice-Text
     */
    async generateAdvice(userId, currentTopic = null, context = 'general', intervention = null) {
        try {
            const userContext = await this.dataAggregator.getUserContext(userId, currentTopic);
            
            let advice = this._buildAdviceStructure(userContext, context);
            
            // Spezielle Intervention-Advice hinzufügen
            if (intervention && intervention.type === 'prompt_advice') {
                advice += this._buildInterventionAdvice(intervention);
            }
            
            return advice;
        } catch (error) {
            console.error('[PromptAdvisor] generateAdvice error:', error);
            return this._getDefaultAdvice();
        }
    }
    
    /**
     * Generiere spezifischen Task-Advice
     */
    async generateTaskAdvice(userId, topic, difficulty) {
        try {
            const topicContext = await this.dataAggregator.getTopicContext(userId, topic);
            
            return this._buildTaskAdvice(topicContext, difficulty);
        } catch (error) {
            console.error('[PromptAdvisor] generateTaskAdvice error:', error);
            return '';
        }
    }
    
    // ==================== Advice Building ====================
    
    _buildAdviceStructure(userContext, context) {
        let advice = '';
        
        // Abschnitt 1: NUTZER-KONTEXT
        advice += this._buildUserContextSection(userContext);
        
        // Abschnitt 2: LERNSTAND
        advice += this._buildLearningStatusSection(userContext);
        
        // Abschnitt 3: VERHALTEN & MOTIVATION
        advice += this._buildBehaviorSection(userContext);
        
        // Abschnitt 4: EMPFEHLUNGEN FÜR INTERAKTION
        advice += this._buildInteractionRecommendations(userContext, context);
        
        return advice;
    }
    
    _buildUserContextSection(userContext) {
        let section = '\n\n=== NUTZER-KONTEXT ===\n';
        
        // Overall Status
        section += `Status: ${this._translateStatus(userContext.summary.overallStatus)}\n`;
        section += `Durchschnittsniveau: ${userContext.summary.averageLevel.toFixed(1)}/5\n`;
        section += `Erfolgsrate (30 Tage): ${userContext.summary.successRate.toFixed(0)}%\n`;
        section += `Motivationslevel: ${userContext.motivation.level}/10 (${userContext.motivation.interpretation})\n`;
        section += `Trend: ${this._translateTrend(userContext.summary.trend)}\n`;
        
        return section;
    }
    
    _buildLearningStatusSection(userContext) {
        let section = '\n=== KOMPETENZ-LEVEL ===\n';
        
        // Stärken
        if (userContext.strongAreas.topics.length > 0) {
            section += 'Stärken:\n';
            userContext.strongAreas.topics.forEach(topic => {
                section += `  - ${topic.topic}: ${topic.level}/5 (${topic.successRate.toFixed(0)}% Erfolgsrate)\n`;
            });
        }
        
        // Schwächen
        if (userContext.weakAreas.topics.length > 0) {
            section += 'Schwächen/Lernbedarf:\n';
            userContext.weakAreas.topics.forEach(topic => {
                section += `  - ${topic.topic}: ${topic.level}/5`;
                if (topic.successRate !== undefined) {
                    section += ` (${topic.successRate.toFixed(0)}% Erfolgsrate)`;
                }
                section += '\n';
            });
        }
        
        // Sub-Topic Details für aktuelle Schwächen
        if (userContext.weakAreas.subTopics.length > 0) {
            section += 'Spezifische Schwachstellen:\n';
            userContext.weakAreas.subTopics.slice(0, 5).forEach(sub => {
                section += `  - ${sub.topic} > ${sub.subTopic}: ${sub.level}/5\n`;
            });
        }
        
        return section;
    }
    
    _buildBehaviorSection(userContext) {
        let section = '\n=== VERHALTEN & GEWOHNHEITEN ===\n';
        
        // Performance Stats
        section += `Aufgaben abgeschlossen: ${userContext.performance.tasksCompleted}\n`;
        section += `Tipps pro Aufgabe: ${userContext.performance.hintsUsedAvg.toFixed(1)}\n`;
        section += `Musterlösungen gezeigt: ${userContext.performance.solutionShownRate.toFixed(0)}%\n`;
        
        // Verhaltens-Muster
        const significantBehaviors = this._filterSignificantBehaviors(userContext.behavior);
        if (significantBehaviors.length > 0) {
            section += 'Auffällige Verhaltens-Muster:\n';
            significantBehaviors.forEach(behavior => {
                section += `  - ${this._translateBehavior(behavior.type)}: ${behavior.count}x\n`;
            });
        }
        
        // Motivations-Faktoren
        if (userContext.motivation.factors.length > 0) {
            section += 'Motivations-Faktoren:\n';
            userContext.motivation.factors.forEach(factor => {
                section += `  - ${factor}\n`;
            });
        }
        
        return section;
    }
    
    _buildInteractionRecommendations(userContext, context) {
        let section = '\n=== EMPFEHLUNGEN FÜR INTERAKTION ===\n';
        
        const recommendations = [];
        
        // 1. Basierend auf Kompetenz-Level
        if (userContext.summary.averageLevel < 3) {
            recommendations.push('Nutze einfache Sprache und erkläre Grundkonzepte ausführlich');
            recommendations.push('Gib kleinere Zwischenschritte und mehr Beispiele');
        } else if (userContext.summary.averageLevel >= 4) {
            recommendations.push('Fordere den Nutzer heraus mit fortgeschritteneren Konzepten');
            recommendations.push('Erwarte mehr selbstständiges Denken');
        }
        
        // 2. Basierend auf Schwächen
        if (userContext.weakAreas.topics.length > 0 && userContext.strongAreas.topics.length > 0) {
            const weakTopic = userContext.weakAreas.topics[0].topic;
            const strongTopic = userContext.strongAreas.topics[0].topic;
            recommendations.push(`Wenn ${weakTopic} erklärt wird, verbinde es mit Stärken in ${strongTopic}`);
        }
        
        // 3. Basierend auf Motivation
        if (userContext.motivation.level < 4) {
            recommendations.push('Biete besonders viel Ermutigung und positive Verstärkung');
            recommendations.push('Halte Erklärungen kurz und fokussiert');
            recommendations.push('Schlage bei Frustration Pausen oder Themenwechsel vor');
        } else if (userContext.motivation.level >= 7) {
            recommendations.push('Nutzer ist hoch motiviert - biete anspruchsvolle Herausforderungen');
        }
        
        // 4. Basierend auf Verhalten
        if (userContext.performance.solutionShownRate > 50) {
            recommendations.push('Ermutige mehr eigenständiges Probieren bevor Lösungen gezeigt werden');
            recommendations.push('Weise subtil darauf hin, dass Tipps hilfreicher sind als direkte Lösungen');
        }
        
        if (userContext.performance.hintsUsedAvg < 0.5) {
            recommendations.push('Nutzer arbeitet sehr selbstständig - gib Raum für eigene Lösungswege');
        }
        
        // 5. Basierend auf Trend
        if (userContext.summary.trend === 'declining') {
            recommendations.push('Performance nimmt ab - sei besonders ermutigend');
            recommendations.push('Prüfe ob Aufgaben zu schwer sind und passe an');
            recommendations.push('Schlage Wiederholung von Grundlagen vor');
        } else if (userContext.summary.trend === 'improving') {
            recommendations.push('Lobe den sichtbaren Fortschritt ausdrücklich');
            recommendations.push('Steigere graduell die Schwierigkeit');
        }
        
        // 6. Kontext-spezifisch
        if (context === 'hint') {
            recommendations.push('Gib Tipps die zum Denken anregen, nicht direkte Lösungen');
        } else if (context === 'solution') {
            recommendations.push('Erkläre nicht nur die Lösung, sondern auch den Denkprozess');
        }
        
        // Formatiere Empfehlungen
        recommendations.forEach((rec, index) => {
            section += `${index + 1}. ${rec}\n`;
        });
        
        return section;
    }
    
    _buildTaskAdvice(topicContext, difficulty) {
        if (!topicContext || !topicContext.competency) {
            return '';
        }
        
        let advice = '\n\n=== AUFGABEN-KONTEXT ===\n';
        
        const comp = topicContext.competency;
        advice += `Thema: ${topicContext.topic}\n`;
        advice += `Nutzer-Level: ${comp.overallLevel}/5\n`;
        advice += `Erfolgsrate: ${comp.successRate.toFixed(0)}%\n`;
        advice += `Aufgaben abgeschlossen: ${comp.tasksCompleted}\n`;
        
        // Schwierigkeit-Anpassung
        const userLevel = comp.overallLevel;
        if (difficulty === 'hard' && userLevel < 3) {
            advice += '\nHINWEIS: Schwere Aufgabe für niedrigen Level - biete extra Unterstützung!\n';
        } else if (difficulty === 'easy' && userLevel >= 4) {
            advice += '\nHINWEIS: Leichte Aufgabe für hohen Level - könnte langweilig sein, bleibe trotzdem engagiert.\n';
        }
        
        // Analyse
        if (topicContext.analysis.needsReview) {
            advice += 'EMPFEHLUNG: Nutzer braucht Grundlagen-Wiederholung in diesem Thema.\n';
        } else if (topicContext.analysis.readyForAdvanced) {
            advice += 'EMPFEHLUNG: Nutzer ist bereit für fortgeschrittene Konzepte.\n';
        }
        
        return advice;
    }
    
    // ==================== Helper Methods ====================
    
    _filterSignificantBehaviors(behaviorPatterns) {
        const significant = [];
        const threshold = 5; // Min 5 Vorkommen
        
        for (const [type, data] of Object.entries(behaviorPatterns)) {
            if (data.count >= threshold) {
                significant.push({ type, count: data.count });
            }
        }
        
        return significant.sort((a, b) => b.count - a.count);
    }
    
    _translateStatus(status) {
        const translations = {
            'excellent': 'Ausgezeichnet',
            'good': 'Gut',
            'needs_attention': 'Benötigt Aufmerksamkeit',
            'unknown': 'Unbekannt'
        };
        return translations[status] || status;
    }
    
    _translateTrend(trend) {
        const translations = {
            'improving': 'Verbessernd 📈',
            'stable': 'Stabil',
            'declining': 'Abnehmend 📉',
            'insufficient_data': 'Noch zu wenig Daten'
        };
        return translations[trend] || trend;
    }
    
    _translateBehavior(behaviorType) {
        const translations = {
            'solution_request': 'Musterlösung angefordert',
            'hint_request': 'Tipp angefordert',
            'task_abandon': 'Aufgabe abgebrochen',
            'quick_solution': 'Schnelle Musterlösung ohne Versuch',
            'self_solve_attempt': 'Eigenständiger Lösungsversuch',
            'task_repeat': 'Aufgabe wiederholt'
        };
        return translations[behaviorType] || behaviorType;
    }
    
    _getDefaultAdvice() {
        return '\n\n=== NUTZER-KONTEXT ===\nKeine Nutzerdaten verfügbar. Nutze Standard-Ansatz.\n';
    }
    
    _buildInterventionAdvice(intervention) {
        let advice = '\n\n=== 🚨 SPEZIELLE INTERVENTION ERFORDERLICH 🚨 ===\n';
        
        if (intervention.suggestedActions.includes('ask_about_difficulties')) {
            advice += '\n⚠️ WICHTIG: Der Schüler hat nun bereits 4 Mal die Musterlösung angefordert.\n';
            advice += 'Dies deutet auf Schwierigkeiten oder Frustration hin.\n\n';
            advice += '**DEINE AUFGABE:**\n';
            advice += '1. Zeige die Musterlösung NICHT sofort\n';
            advice += '2. Frage ZUERST freundlich: "Ich sehe, dass du schon mehrere Musterlösungen angefordert hast. Wo genau hakt es denn? Was bereitet dir Schwierigkeiten?"\n';
            advice += '3. Warte auf die Antwort des Schülers\n';
            advice += '4. Gehe dann EXTRA DETAILLIERT auf seine spezifischen Schwierigkeiten ein\n';
            advice += '5. Erkläre jeden Schritt der Lösung sehr ausführlich und mit Zwischenschritten\n';
            advice += '6. Nutze Analogien und praktische Beispiele\n';
            advice += '7. Biete am Ende an: "Hast du noch Fragen zu dieser Lösung?"\n\n';
            advice += '**TON:**\n';
            advice += '- Ermutigend und unterstützend (nicht vorwurfsvoll!)\n';
            advice += '- Geduldig und verständnisvoll\n';
            advice += '- Motivierend ("Das ist ein schwieriges Thema, aber wir kriegen das hin!")\n\n';
        }
        
        return advice;
    }
    
    // ==================== Quick Advice Snippets ====================
    
    /**
     * Kurze Advice-Snippets für spezifische Situationen
     */
    getQuickAdvice(situation, userContext) {
        const adviceMap = {
            'low_motivation': 'Nutzer hat niedrige Motivation. Sei besonders ermutigend und schlage bei Bedarf Pausen vor.',
            'high_performer': 'Nutzer ist sehr erfolgreich. Fordere ihn mit anspruchsvollen Aufgaben heraus.',
            'struggling': 'Nutzer hat Schwierigkeiten. Gib kleinere Schritte und mehr Beispiele.',
            'solution_dependent': 'Nutzer nutzt zu oft Musterlösungen. Ermutige mehr eigenständiges Probieren.',
            'improving': 'Nutzer macht sichtbare Fortschritte. Lobe dies ausdrücklich!'
        };
        
        return adviceMap[situation] || '';
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptAdvisor;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.PromptAdvisor = PromptAdvisor;
}

