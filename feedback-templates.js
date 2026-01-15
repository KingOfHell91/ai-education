// feedback-templates.js - Templates für Feedback-Generierung
// Ersetzt KI-generiertes Feedback durch programmatische Auswahl

const FEEDBACK_TEMPLATES = {
    // ==================== FEHLER-FEEDBACK PRO TYP ====================
    errorFeedback: {
        logic: [
            'Der gewählte Ansatz führt nicht zum Ziel.',
            'Überlege, welche Methode hier besser passt.',
            'Der Lösungsweg ist nicht zielführend.',
            'Prüfe den grundsätzlichen Ansatz nochmal.',
            'Die Strategie muss überdacht werden.',
            'Dieser Weg führt nicht zur Lösung.',
            'Der Ansatz ist leider nicht korrekt.',
            'Hier ist ein Denkfehler passiert.',
            'Die Vorgehensweise ist nicht richtig.',
            'Das Konzept stimmt noch nicht ganz.'
        ],
        calc: [
            'Achte auf die Vorzeichen!',
            'Prüfe die Rechnung nochmal genau.',
            'Ein kleiner Rechenfehler hat sich eingeschlichen.',
            'Die Umformung ist nicht ganz korrekt.',
            'Bei der Berechnung ist etwas schiefgegangen.',
            'Kontrolliere die Zahlen nochmal.',
            'Hier stimmt eine Rechnung nicht.',
            'Überprüfe die mathematische Operation.',
            'Die Zahlen stimmen nicht ganz.',
            'Rechne diesen Schritt nochmal nach.'
        ],
        followup: [
            'Dieser Fehler folgt aus einem früheren.',
            'Korrigiere erst den vorherigen Schritt.',
            'Folgefehler – der ursprüngliche Fehler wirkt sich aus.',
            'Das Ergebnis ist falsch wegen eines früheren Fehlers.',
            'Hier zeigt sich ein vorheriger Fehler.',
            'Die Basis für diesen Schritt war schon falsch.',
            'Dieser Fehler ist eine Konsequenz.',
            'Geh zurück und korrigiere den Ursprungsfehler.'
        ],
        formal: [
            'Die Schreibweise ist nicht ganz sauber.',
            'Achte auf die mathematische Notation.',
            'Die Darstellung könnte präziser sein.',
            'Formale Ungenauigkeit in der Schreibweise.',
            'Die Notation ist nicht ganz korrekt.',
            'Achte auf die korrekte Schreibweise.',
            'Mathematisch korrekt, aber unsauber notiert.'
        ],
        none: [
            'Dieser Schritt ist korrekt!',
            'Richtig gerechnet!',
            'Stimmt so!',
            'Korrekte Umformung!',
            'Gut gemacht!'
        ]
    },

    // ==================== MOTIVATIONS-SÄTZE ====================
    encouragement: [
        'Du bist auf dem richtigen Weg!',
        'Guter Ansatz, weiter so!',
        'Das wird schon, bleib dran!',
        'Fehler sind Lernchancen!',
        'Beim nächsten Mal klappt es bestimmt!',
        'Du hast das Prinzip verstanden!',
        'Nur noch ein kleiner Schritt!',
        'Du machst Fortschritte!',
        'Lass dich nicht entmutigen!',
        'Das Verständnis ist da, nur die Ausführung hapert.',
        'Mit etwas Übung wird das perfekt!',
        'Du bist näher an der Lösung als du denkst!',
        'Jeder Fehler bringt dich der Lösung näher!',
        'Kopf hoch, das schaffst du!',
        'Der Weg ist das Ziel – und du bist unterwegs!',
        'Gut analysiert, jetzt noch korrekt rechnen!',
        'Fast geschafft, nur noch Details korrigieren!',
        'Du zeigst gutes mathematisches Denken!',
        'Die Grundidee stimmt, nur die Umsetzung braucht Feinschliff.',
        'Bleib dran, du entwickelst dich super!'
    ],

    // ==================== LOB-SÄTZE ====================
    praise: [
        'Perfekt gelöst!',
        'Sehr gut, alles richtig!',
        'Exzellente Arbeit!',
        'Mathematisch einwandfrei!',
        'Sauber durchgerechnet!',
        'Hervorragend!',
        'Tadellos!',
        'Großartig gemacht!',
        'Vorbildlich gelöst!',
        'Ausgezeichnet!',
        'Brillant!',
        'Sehr präzise gearbeitet!',
        'Korrekt und elegant!',
        'Top Leistung!',
        'Das sitzt!',
        'Genau so macht man das!',
        'Musterlösung!',
        'Fehlerfreie Arbeit!',
        'Das hast du drauf!',
        'Makellos!'
    ],

    // ==================== HINT-LABELS PRO FEHLERTYP ====================
    hintLabels: {
        logic: {
            level1: [
                'Falscher Ansatz',
                'Methode prüfen',
                'Neu ansetzen',
                'Formel?',
                'Strategie ändern',
                'Denkfehler!',
                'Andere Methode!',
                'Konzept prüfen'
            ],
            level2: [
                'Welche Formel passt hier?',
                'Skizziere das Problem',
                'Was ist gegeben, was gesucht?',
                'Lies die Aufgabe nochmal',
                'Überlege den Lösungsweg',
                'Welches Verfahren ist geeignet?',
                'Strukturiere das Problem',
                'Zerlege in Teilprobleme'
            ]
        },
        calc: {
            level1: [
                'Vorzeichen!',
                'Rechenfehler',
                'Nochmal rechnen',
                'Prüfe Schritt',
                'Zahlendreher?',
                'Rechenregel!',
                'Kontrolle!',
                'Taschenrechner!'
            ],
            level2: [
                'Terme vereinfachen',
                'Brüche kürzen',
                'Klammern auflösen',
                'Vorzeichen beachten',
                'Punkt vor Strich',
                'Division prüfen',
                'Multiplikation kontrollieren',
                'Zwischenergebnis prüfen'
            ]
        },
        followup: {
            level1: [
                'Folgefehler',
                'Vorher korrigieren',
                'Basis falsch',
                'Ursprung finden'
            ],
            level2: [
                'Früheren Fehler finden',
                'Von vorn prüfen',
                'Ersten Fehler korrigieren',
                'Kette unterbrechen'
            ]
        },
        formal: {
            level1: [
                'Notation!',
                'Schreibweise',
                'Form prüfen',
                'Präziser!'
            ],
            level2: [
                'Mathematische Schreibweise',
                'Korrekte Notation',
                'Formel sauber schreiben',
                'Einheiten angeben'
            ]
        }
    },

    // ==================== TIPPS PRO THEMA ====================
    tips: {
        algebra: [
            'Merke: Was du links machst, machst du auch rechts.',
            'Terme erst vereinfachen, dann lösen.',
            'Negative Zahlen in Klammern setzen.',
            'Beim Ausmultiplizieren: Jeder mit jedem!',
            'Brüche: Erst Hauptnenner finden.',
            'Potenzen: Bei Multiplikation Exponenten addieren.',
            'Wurzeln: Nur aus positiven Zahlen ziehen.',
            'Gleichungen: Immer Probe machen!',
            'Ungleichungen: Vorzeichen beim Multiplizieren beachten.',
            'Formeln: Erst umstellen, dann einsetzen.'
        ],
        geometrie: [
            'Immer eine Skizze anfertigen!',
            'Einheiten konsequent umrechnen.',
            'Formeln vor dem Einsetzen aufschreiben.',
            'Pythagoras: a² + b² = c² (nur im rechtwinkligen Dreieck!)',
            'Kreisumfang: U = 2πr',
            'Kreisfläche: A = πr²',
            'Dreiecksfläche: A = ½ · g · h',
            'Volumen Quader: V = a · b · c',
            'Oberfläche: Alle Seiten einzeln berechnen!',
            'Winkel im Dreieck: Summe immer 180°'
        ],
        analysis: [
            'Ableitung = Steigung der Tangente.',
            'Nullstellen: f(x) = 0 setzen.',
            'Extremstellen: f\'(x) = 0 und f\'\'(x) prüfen.',
            'Wendepunkte: f\'\'(x) = 0 und f\'\'\'(x) ≠ 0.',
            'Integral = Fläche unter der Kurve.',
            'Kettenregel: Äußere mal innere Ableitung.',
            'Produktregel: u\'v + uv\'',
            'Quotientenregel: (u\'v - uv\') / v²',
            'Stammfunktion: Exponent +1, dann durch neuen Exponenten teilen.',
            'Grenzwerte: L\'Hospital bei 0/0 oder ∞/∞.'
        ],
        stochastik: [
            'Wahrscheinlichkeit: Günstige durch mögliche Fälle.',
            'Baumdiagramm für mehrstufige Versuche.',
            'Pfadregeln: Multiplizieren entlang, Addieren parallel.',
            'Erwartungswert: Summe von (Wert × Wahrscheinlichkeit).',
            'Varianz: E(X²) - E(X)²',
            'Binomialverteilung: n über k · p^k · (1-p)^(n-k)',
            'Normalverteilung: z-Wert bestimmen, Tabelle nutzen.',
            'Unabhängigkeit: P(A∩B) = P(A)·P(B)',
            'Bedingte Wahrscheinlichkeit: P(A|B) = P(A∩B)/P(B)',
            'Kombinatorik: Mit/ohne Wiederholung, mit/ohne Reihenfolge.'
        ],
        lineare_algebra: [
            'Matrizen: Zeilen mal Spalten.',
            'Determinante 2x2: ad - bc',
            'Inverse Matrix: Nur wenn det ≠ 0',
            'Gauß-Algorithmus: Systematisch eliminieren.',
            'Eigenwerte: det(A - λI) = 0',
            'Vektoren: Komponentenweise rechnen.',
            'Skalarprodukt: a·b = |a|·|b|·cos(φ)',
            'Kreuzprodukt: Nur in 3D, Ergebnis steht senkrecht.',
            'Lineare Unabhängigkeit: Determinante ≠ 0',
            'Basiswechsel: Koordinaten transformieren.'
        ],
        trigonometrie: [
            'sin²(x) + cos²(x) = 1',
            'tan(x) = sin(x) / cos(x)',
            'Sinussatz: a/sin(α) = b/sin(β) = c/sin(γ)',
            'Kosinussatz: c² = a² + b² - 2ab·cos(γ)',
            'Einheitskreis: x = cos(φ), y = sin(φ)',
            'Periode: sin und cos haben 2π, tan hat π.',
            'Amplitude = Faktor vor sin/cos.',
            'Phasenverschiebung beachten.',
            'Bogenmaß: π entspricht 180°.',
            'Arcusfunktionen: Winkel aus Verhältnis.'
        ]
    },

    // ==================== STÄRKEN-TEMPLATES ====================
    strengths: {
        general: [
            'Gutes mathematisches Verständnis gezeigt',
            'Strukturierter Lösungsansatz',
            'Saubere Notation verwendet',
            'Korrekter Rechenweg erkannt',
            'Aufgabenstellung richtig erfasst',
            'Logischer Gedankengang',
            'Alle relevanten Formeln bekannt'
        ],
        correct_steps: [
            'Die ersten Schritte waren korrekt',
            'Der Ansatz war richtig',
            'Die Grundidee stimmt',
            'Guter Start in die Aufgabe',
            'Korrekte Vorüberlegungen'
        ],
        partial_success: [
            'Einige Schritte waren vollständig korrekt',
            'Das Konzept wurde verstanden',
            'Die Methode war richtig gewählt',
            'Gute Zwischenergebnisse erzielt'
        ]
    },

    // ==================== SCHWÄCHEN-TEMPLATES ====================
    weaknesses: {
        logic: [
            'Der gewählte Lösungsweg war nicht zielführend',
            'Die Methode passte nicht zur Aufgabe',
            'Konzeptioneller Fehler im Ansatz'
        ],
        calc: [
            'Rechenfehler bei der Umformung',
            'Vorzeichenfehler aufgetreten',
            'Zahlenwerte falsch übernommen'
        ],
        followup: [
            'Folgefehler durch früheren Fehler',
            'Fehlerhafte Zwischenergebnisse weiterverwendet'
        ],
        formal: [
            'Ungenaue mathematische Notation',
            'Fehlende Einheiten',
            'Schreibweise nicht korrekt'
        ]
    },

    // ==================== ZUSAMMENFASSUNGS-TEMPLATES ====================
    summary: {
        correct: [
            'Sehr gut! Alle Schritte sind mathematisch korrekt.',
            'Perfekt gelöst! Der Lösungsweg ist einwandfrei.',
            'Exzellent! Du hast die Aufgabe fehlerfrei bearbeitet.',
            'Hervorragend! Alles richtig gemacht.'
        ],
        partial: [
            'Guter Ansatz! Bei einigen Schritten sind kleine Fehler passiert.',
            'Die Grundidee stimmt, aber es gibt noch Verbesserungspotential.',
            'Fast richtig! Nur wenige Korrekturen nötig.',
            'Du bist auf dem richtigen Weg, aber prüfe die markierten Schritte.'
        ],
        major_errors: [
            'Der Lösungsweg enthält einige Fehler. Prüfe die markierten Stellen.',
            'Hier sind mehrere Korrekturen nötig. Schau dir die Hinweise an.',
            'Der Ansatz muss überdacht werden. Die Tipps helfen dir weiter.'
        ],
        wrong_approach: [
            'Der gewählte Ansatz führt nicht zum Ziel. Überlege eine andere Strategie.',
            'Die Methode passt nicht zur Aufgabe. Versuche einen anderen Weg.',
            'Hier ist ein grundsätzlicher Denkfehler. Lies die Aufgabe nochmal genau.'
        ]
    }
};

// ==================== FEEDBACK-GENERIERUNGS-FUNKTIONEN ====================

/**
 * Generiert Hints basierend auf der Analyse (ersetzt KI-Generierung)
 */
function generateHintsFromAnalysis(analysis) {
    const hints = { level1: [], level2: [] };
    
    if (!analysis || !analysis.steps) return hints;
    
    const errorSteps = analysis.steps.filter(s => s.errorType && s.errorType !== 'none');
    
    if (errorSteps.length === 0) return hints;
    
    // Level 1: Schlagwörter für den ersten Fehler
    const firstError = errorSteps[0];
    const labels = FEEDBACK_TEMPLATES.hintLabels[firstError.errorType]?.level1 || ['Prüfe nochmal'];
    hints.level1.push({
        hintLevel: 1,
        category: firstError.errorType === 'logic' ? 'wrong_method' : 'missing_step',
        label: pickRandom(labels),
        color: firstError.errorType === 'logic' ? 'orange' : 'yellow'
    });
    
    // Wenn mehrere verschiedene Fehlertypen, noch einen Hint hinzufügen
    const uniqueErrorTypes = [...new Set(errorSteps.map(s => s.errorType))];
    if (uniqueErrorTypes.length > 1) {
        const secondType = uniqueErrorTypes.find(t => t !== firstError.errorType);
        const secondLabels = FEEDBACK_TEMPLATES.hintLabels[secondType]?.level1 || [];
        if (secondLabels.length > 0) {
            hints.level1.push({
                hintLevel: 1,
                category: secondType === 'logic' ? 'wrong_method' : 'missing_step',
                label: pickRandom(secondLabels),
                color: secondType === 'calc' ? 'yellow' : 'orange'
            });
        }
    }
    
    // Level 2: Schrittbezogene Hinweise (max 3)
    errorSteps.slice(0, 3).forEach(step => {
        const titles = FEEDBACK_TEMPLATES.hintLabels[step.errorType]?.level2 || ['Prüfe diesen Schritt'];
        hints.level2.push({
            hintLevel: 2,
            category: step.errorType === 'calc' ? 'formula_hint' : 'step_sequence',
            stepIndex: step.index,
            title: pickRandom(titles),
            latex: step.latex || '',
            color: step.errorType === 'calc' ? 'green' : 'blue'
        });
    });
    
    return hints;
}

/**
 * Generiert detailliertes Feedback basierend auf der Analyse
 */
function generateDetailedFeedback(analysis, topic = 'algebra') {
    if (!analysis || !analysis.steps) {
        return {
            strengths: [pickRandom(FEEDBACK_TEMPLATES.strengths.general)],
            weaknesses: [],
            tips: pickRandomN(FEEDBACK_TEMPLATES.tips[topic] || FEEDBACK_TEMPLATES.tips.algebra, 2),
            encouragement: pickRandom(FEEDBACK_TEMPLATES.encouragement)
        };
    }
    
    const errorSteps = analysis.steps.filter(s => s.errorType && s.errorType !== 'none');
    const correctSteps = analysis.steps.filter(s => s.errorType === 'none');
    const errorTypes = [...new Set(errorSteps.map(s => s.errorType))];
    
    // Stärken ermitteln
    const strengths = [];
    if (correctSteps.length > 0) {
        strengths.push(pickRandom(FEEDBACK_TEMPLATES.strengths.correct_steps));
    }
    if (correctSteps.length >= analysis.steps.length / 2) {
        strengths.push(pickRandom(FEEDBACK_TEMPLATES.strengths.partial_success));
    }
    strengths.push(pickRandom(FEEDBACK_TEMPLATES.strengths.general));
    
    // Schwächen basierend auf Fehlertypen
    const weaknesses = errorTypes.map(type => 
        pickRandom(FEEDBACK_TEMPLATES.weaknesses[type] || FEEDBACK_TEMPLATES.errorFeedback[type])
    );
    
    // Tipps zum Thema
    const topicTips = FEEDBACK_TEMPLATES.tips[topic] || FEEDBACK_TEMPLATES.tips.algebra;
    const tips = pickRandomN(topicTips, 3);
    
    // Ermutigung
    const encouragement = pickRandom(FEEDBACK_TEMPLATES.encouragement);
    
    return {
        strengths: strengths.slice(0, 3),
        weaknesses: weaknesses.slice(0, 3),
        tips: tips,
        encouragement: encouragement
    };
}

/**
 * Generiert eine Zusammenfassung basierend auf der Analyse
 */
function generateSummary(analysis) {
    if (!analysis || !analysis.steps) {
        return pickRandom(FEEDBACK_TEMPLATES.summary.major_errors);
    }
    
    const errorSteps = analysis.steps.filter(s => s.errorType && s.errorType !== 'none');
    const errorRate = errorSteps.length / analysis.steps.length;
    const hasLogicError = errorSteps.some(s => s.errorType === 'logic');
    
    if (errorSteps.length === 0) {
        return pickRandom(FEEDBACK_TEMPLATES.summary.correct);
    } else if (hasLogicError) {
        return pickRandom(FEEDBACK_TEMPLATES.summary.wrong_approach);
    } else if (errorRate < 0.3) {
        return pickRandom(FEEDBACK_TEMPLATES.summary.partial);
    } else {
        return pickRandom(FEEDBACK_TEMPLATES.summary.major_errors);
    }
}

/**
 * Generiert Lob für korrekte Lösungen
 */
function generatePraise() {
    return pickRandom(FEEDBACK_TEMPLATES.praise);
}

/**
 * Generiert Ermutigung
 */
function generateEncouragement() {
    return pickRandom(FEEDBACK_TEMPLATES.encouragement);
}

/**
 * Hilfsfunktion: Wählt zufälliges Element (falls nicht aus task-variations importiert)
 */
if (typeof pickRandom === 'undefined') {
    function pickRandom(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }
}

if (typeof pickRandomN === 'undefined') {
    function pickRandomN(array, n) {
        if (!array || array.length === 0) return [];
        const shuffled = [...array].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(n, array.length));
    }
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.FEEDBACK_TEMPLATES = FEEDBACK_TEMPLATES;
    window.generateHintsFromAnalysis = generateHintsFromAnalysis;
    window.generateDetailedFeedback = generateDetailedFeedback;
    window.generateSummary = generateSummary;
    window.generatePraise = generatePraise;
    window.generateEncouragement = generateEncouragement;
}
