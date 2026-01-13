// Test-Datenpool für Fehleranalyse Unit Tests
// 10 Mathematik-Aufgaben mit korrekten und fehlerhaften Lösungswegen

const TEST_TASKS = [
    {
        id: 'linear-eq-1',
        task: 'Löse die Gleichung: 2x + 6 = 14',
        topic: 'algebra',
        difficulty: 'easy',
        correctSolution: `2x + 6 = 14
2x = 14 - 6
2x = 8
x = 4`,
        incorrectSolution: `2x + 6 = 14
2x = 14 + 6
2x = 20
x = 10`,
        expectedErrors: [
            { step: 2, type: 'calc', description: 'Vorzeichenfehler: -6 statt +6' }
        ]
    },
    {
        id: 'linear-eq-2',
        task: 'Löse die Gleichung: 3x - 9 = 12',
        topic: 'algebra',
        difficulty: 'easy',
        correctSolution: `3x - 9 = 12
3x = 12 + 9
3x = 21
x = 7`,
        incorrectSolution: `3x - 9 = 12
3x = 12 - 9
3x = 3
x = 1`,
        expectedErrors: [
            { step: 2, type: 'calc', description: 'Vorzeichenfehler beim Umstellen' }
        ]
    },
    {
        id: 'quadratic-eq-1',
        task: 'Löse die Gleichung: x² - 5x + 6 = 0',
        topic: 'algebra',
        difficulty: 'medium',
        correctSolution: `x² - 5x + 6 = 0
(x - 2)(x - 3) = 0
x₁ = 2
x₂ = 3`,
        incorrectSolution: `x² - 5x + 6 = 0
(x - 2)(x + 3) = 0
x₁ = 2
x₂ = -3`,
        expectedErrors: [
            { step: 2, type: 'calc', description: 'Falsches Vorzeichen bei Faktorisierung' }
        ]
    },
    {
        id: 'fraction-calc-1',
        task: 'Berechne: 2/3 + 1/4',
        topic: 'algebra',
        difficulty: 'easy',
        correctSolution: `2/3 + 1/4
= 8/12 + 3/12
= 11/12`,
        incorrectSolution: `2/3 + 1/4
= 3/7`,
        expectedErrors: [
            { step: 2, type: 'logic', description: 'Zähler und Nenner direkt addiert' }
        ]
    },
    {
        id: 'fraction-calc-2',
        task: 'Berechne: 5/6 - 1/3',
        topic: 'algebra',
        difficulty: 'easy',
        correctSolution: `5/6 - 1/3
= 5/6 - 2/6
= 3/6
= 1/2`,
        incorrectSolution: `5/6 - 1/3
= 5/6 - 1/6
= 4/6
= 2/3`,
        expectedErrors: [
            { step: 2, type: 'calc', description: 'Falsches Erweitern von 1/3' }
        ]
    },
    {
        id: 'power-calc-1',
        task: 'Vereinfache: x³ · x⁴',
        topic: 'algebra',
        difficulty: 'easy',
        correctSolution: `x³ · x⁴
= x^(3+4)
= x⁷`,
        incorrectSolution: `x³ · x⁴
= x^(3·4)
= x¹²`,
        expectedErrors: [
            { step: 2, type: 'logic', description: 'Exponenten multipliziert statt addiert' }
        ]
    },
    {
        id: 'linear-system-1',
        task: 'Löse das Gleichungssystem:\n2x + y = 7\nx - y = 2',
        topic: 'algebra',
        difficulty: 'medium',
        correctSolution: `2x + y = 7
x - y = 2
---
Addition: 3x = 9
x = 3
y = 7 - 2·3 = 1`,
        incorrectSolution: `2x + y = 7
x - y = 2
---
Addition: 3x = 9
x = 3
y = 7 - 3 = 4`,
        expectedErrors: [
            { step: 5, type: 'calc', description: 'Vergessen mit 2 zu multiplizieren' }
        ]
    },
    {
        id: 'percentage-1',
        task: 'Berechne 15% von 240',
        topic: 'algebra',
        difficulty: 'easy',
        correctSolution: `15% von 240
= 0,15 · 240
= 36`,
        incorrectSolution: `15% von 240
= 240 / 15
= 16`,
        expectedErrors: [
            { step: 2, type: 'logic', description: 'Division statt Multiplikation mit Prozentsatz' }
        ]
    },
    {
        id: 'sqrt-calc-1',
        task: 'Vereinfache: √50',
        topic: 'algebra',
        difficulty: 'medium',
        correctSolution: `√50
= √(25 · 2)
= √25 · √2
= 5√2`,
        incorrectSolution: `√50
= √(25 + 25)
= √25 + √25
= 10`,
        expectedErrors: [
            { step: 2, type: 'logic', description: 'Wurzel einer Summe falsch aufgeteilt' },
            { step: 3, type: 'followup', description: 'Folgefehler aus falschem Ansatz' }
        ]
    },
    {
        id: 'derivative-1',
        task: 'Bestimme die Ableitung von f(x) = 3x² + 2x - 5',
        topic: 'functions',
        difficulty: 'medium',
        correctSolution: `f(x) = 3x² + 2x - 5
f'(x) = 3 · 2x^(2-1) + 2 · 1 - 0
f'(x) = 6x + 2`,
        incorrectSolution: `f(x) = 3x² + 2x - 5
f'(x) = 3x + 2 - 5
f'(x) = 3x - 3`,
        expectedErrors: [
            { step: 2, type: 'calc', description: 'Potenzregel falsch angewendet' },
            { step: 3, type: 'followup', description: 'Folgefehler' }
        ]
    }
];

/**
 * Wählt eine zufällige Aufgabe aus dem Pool
 * @returns {Object} Zufällige Testaufgabe
 */
function getRandomTestTask() {
    const index = Math.floor(Math.random() * TEST_TASKS.length);
    return TEST_TASKS[index];
}

/**
 * Wählt zufällig den korrekten oder fehlerhaften Lösungsweg
 * @param {Object} task - Die Testaufgabe
 * @param {boolean} [forceIncorrect=null] - null=zufällig, true=fehlerhaft, false=korrekt
 * @returns {Object} { solution, isCorrect, expectedErrors }
 */
function getRandomSolution(task, forceIncorrect = null) {
    const useIncorrect = forceIncorrect !== null 
        ? forceIncorrect 
        : Math.random() < 0.5;
    
    return {
        solution: useIncorrect ? task.incorrectSolution : task.correctSolution,
        isCorrect: !useIncorrect,
        expectedErrors: useIncorrect ? task.expectedErrors : []
    };
}

/**
 * Holt eine Aufgabe nach ID
 * @param {string} id - Die Aufgaben-ID
 * @returns {Object|null} Die Aufgabe oder null
 */
function getTestTaskById(id) {
    return TEST_TASKS.find(t => t.id === id) || null;
}

/**
 * Gibt alle verfügbaren Aufgaben zurück
 * @returns {Array} Alle Testaufgaben
 */
function getAllTestTasks() {
    return [...TEST_TASKS];
}

/**
 * Validiert das Analyseergebnis gegen erwartete Fehler
 * @param {Object} analysisResult - Das Ergebnis der Fehleranalyse
 * @param {Array} expectedErrors - Die erwarteten Fehler
 * @returns {Object} { passed, details }
 */
function validateAnalysisResult(analysisResult, expectedErrors) {
    if (!analysisResult || !analysisResult.steps) {
        return {
            passed: false,
            details: 'Keine gültige Analyse erhalten'
        };
    }

    const foundErrors = analysisResult.steps
        .filter(s => s.errorType !== 'none')
        .map(s => ({ step: s.index, type: s.errorType }));

    // Prüfe ob erwartete Fehler gefunden wurden
    const matchedErrors = [];
    const missedErrors = [];
    const unexpectedErrors = [];

    for (const expected of expectedErrors) {
        const found = foundErrors.find(f => 
            f.step === expected.step && f.type === expected.type
        );
        if (found) {
            matchedErrors.push(expected);
        } else {
            missedErrors.push(expected);
        }
    }

    for (const found of foundErrors) {
        const wasExpected = expectedErrors.find(e => 
            e.step === found.step && e.type === found.type
        );
        if (!wasExpected) {
            unexpectedErrors.push(found);
        }
    }

    const passed = missedErrors.length === 0;

    return {
        passed,
        details: {
            matchedErrors,
            missedErrors,
            unexpectedErrors,
            totalExpected: expectedErrors.length,
            totalFound: foundErrors.length
        }
    };
}

// Export für Browser-Nutzung
if (typeof window !== 'undefined') {
    window.TestData = {
        TEST_TASKS,
        getRandomTestTask,
        getRandomSolution,
        getTestTaskById,
        getAllTestTasks,
        validateAnalysisResult
    };
}

