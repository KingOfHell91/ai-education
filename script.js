// Math Tutor AI - JavaScript für KI-Integration und Interaktivität

// ==================== Error Analysis Schema für Structured Outputs ====================

/**
 * JSON-Schema für die strukturierte Fehleranalyse-Antwort
 * Wird für OpenAI Structured Outputs und Anthropic verwendet
 */
const ERROR_ANALYSIS_SCHEMA = {
    name: "error_analysis_response",
    strict: true,
    schema: {
        type: "object",
        properties: {
            steps: {
                type: "array",
                description: "Nummerierte Teilschritte des Schüler-Rechenwegs",
                items: {
                    type: "object",
                    properties: {
                        index: { 
                            type: "number",
                            description: "Schritt-Index (beginnend bei 1)"
                        },
                        rawText: { 
                            type: "string",
                            description: "Originaltext des Schülers"
                        },
                        latex: { 
                            type: "string",
                            description: "Normalisierte LaTeX-Darstellung OHNE Delimiter (kein \\( \\) oder $ - nur der reine LaTeX-Inhalt)"
                        },
                        errorType: { 
                            type: "string",
                            enum: ["none", "logic", "calc", "followup", "formal"],
                            description: "Fehlertyp: none=korrekt, logic=Logikfehler, calc=Rechenfehler, followup=Folgefehler, formal=Formfehler"
                        },
                        operation: {
                            type: "string",
                            description: "Rechenoperation die zum NÄCHSTEN Schritt führt, z.B. ':2x' (durch 2x teilen), 'zgf.' (zusammengefasst), '+3', '-5', '·2'. Leer lassen beim letzten Schritt."
                        }
                    },
                    required: ["index", "rawText", "latex", "errorType"],
                    additionalProperties: false
                }
            },
            uiElements: {
                type: "array",
                description: "UI-Elemente für visuelle Markierungen (in Stufe 1 meist leer oder nur kurze Labels)",
                items: {
                    type: "object",
                    properties: {
                        type: { 
                            type: "string",
                            enum: ["info_box", "hint_chip", "link_marker"],
                            description: "Typ des UI-Elements"
                        },
                        stepIndex: { 
                            type: "number",
                            description: "Bezug auf einen Schritt (index)"
                        },
                        color: { 
                            type: "string",
                            enum: ["red", "green", "orange", "blue", "yellow"],
                            description: "Farbe: red=Logikfehler, green=Rechenfehler, orange=Folgefehler, blue=formal"
                        },
                        title: { 
                            type: "string",
                            description: "Kurzer Titel (z.B. 'Logikfehler')"
                        },
                        text: { 
                            type: "string",
                            description: "Kurzer Text ohne Lösungshinweise"
                        }
                    },
                    required: ["type", "stepIndex", "color", "title", "text"],
                    additionalProperties: false
                }
            },
            feedback: {
                type: "object",
                description: "Kurzes Feedback zur Lösung (1-2 Sätze)",
                properties: {
                    summarySentence: {
                        type: "string",
                        description: "Kurze Rückmeldung (1-2 Sätze): Was war gut, wo gibt es Probleme - OHNE Details zu verraten"
                    }
                },
                required: ["summarySentence"],
                additionalProperties: false
            }
        },
        required: ["steps", "uiElements", "feedback", "hints"],
        additionalProperties: false
    }
};

// Hint-Struktur für integrierte Hint-Stufe 1 und 2
ERROR_ANALYSIS_SCHEMA.schema.properties.hints = {
    type: "object",
    description: "Vorbereitete Hints, die erst im Frontend sichtbar gemacht werden",
    properties: {
        level1: {
            type: "array",
            description: "Stufe-1-Hints: 1-3 Schlagwörter, global sichtbar",
            items: {
                type: "object",
                properties: {
                    hintLevel: { type: "number", enum: [1] },
                    category: { type: "string", enum: ["wrong_method", "missing_step"] },
                    label: { type: "string", description: "1-3 prägnante Schlagwörter" },
                    color: { type: "string", enum: ["orange", "yellow"] }
                },
                required: ["hintLevel", "category", "label", "color"],
                additionalProperties: false
            }
        },
        level2: {
            type: "array",
            description: "Stufe-2-Hints: Schrittbezogene Hinweise/Formeln",
            items: {
                type: "object",
                properties: {
                    hintLevel: { type: "number", enum: [2] },
                    category: { type: "string", enum: ["formula_hint", "step_sequence"] },
                    stepIndex: { type: "number", description: "Bezug auf steps[index]" },
                    title: { type: "string", description: "2-4 Wörter, z.B. 'Kardano-Formel'" },
                    latex: { type: "string", description: "LaTeX ohne Delimiter" },
                    color: { type: "string", enum: ["blue", "green"] }
                },
                required: ["hintLevel", "category", "stepIndex", "title", "latex", "color"],
                additionalProperties: false
            }
        }
    },
    required: ["level1", "level2"],
    additionalProperties: false
};

// Erweiterte Felder für korrekte Lösungen und Vergleichsmodus
ERROR_ANALYSIS_SCHEMA.schema.properties.isCorrect = {
    type: "boolean",
    description: "true wenn alle Schritte errorType 'none' haben"
};

ERROR_ANALYSIS_SCHEMA.schema.properties.feedbackLevel = {
    type: "string",
    enum: ["minimal", "detailed"],
    description: "minimal = 1-2 Sätze bei sofort korrekt, detailed = ausführlich bei Korrektur nach Fehlern"
};

ERROR_ANALYSIS_SCHEMA.schema.properties.comparison = {
    type: "object",
    description: "Vergleichsansicht zwischen falschem und korrektem Lösungsweg (nur bei Korrektur nach Fehlern oder Level 3)",
    properties: {
        mappings: {
            type: "array",
            description: "Semantische Zuordnung der Schritte",
            items: {
                type: "object",
                properties: {
                    wrongStepIndex: { type: "number", description: "Index des fehlerhaften Schritts" },
                    correctStepIndex: { type: "number", description: "Index des korrekten Schritts" },
                    explanation: { type: "string", description: "Erklärung des Unterschieds" }
                },
                required: ["wrongStepIndex", "correctStepIndex", "explanation"],
                additionalProperties: false
            }
        },
        correctSteps: {
            type: "array",
            description: "Die korrekten Schritte (Musterlösung)",
            items: {
                type: "object",
                properties: {
                    index: { type: "number" },
                    latex: { type: "string", description: "LaTeX ohne Delimiter" },
                    operation: { type: "string" }
                },
                required: ["index", "latex"],
                additionalProperties: false
            }
        }
    },
    required: ["mappings", "correctSteps"],
    additionalProperties: false
};

ERROR_ANALYSIS_SCHEMA.schema.properties.detailedFeedback = {
    type: "object",
    description: "Ausführliches Feedback bei Korrektur nach Fehlern oder Level 3",
    properties: {
        strengths: {
            type: "array",
            description: "Was gut war am Lösungsweg",
            items: { type: "string" }
        },
        weaknesses: {
            type: "array",
            description: "Identifizierte Schwächen/Fehlerquellen",
            items: { type: "string" }
        },
        tips: {
            type: "array",
            description: "Merksätze und Empfehlungen für die Zukunft",
            items: { type: "string" }
        },
        encouragement: {
            type: "string",
            description: "Motivierender Abschluss"
        }
    },
    required: ["strengths", "weaknesses", "tips", "encouragement"],
    additionalProperties: false
};

// Mapping von errorType zu Farben für uiElements
const ERROR_TYPE_COLOR_MAP = {
    'logic': 'red',
    'calc': 'green', 
    'followup': 'orange',
    'formal': 'blue',
    'none': 'blue'
};

// ==================== LaTeX Sanitizer ====================

/**
 * Bekannte LaTeX-Befehle mit ihrer erwarteten Struktur
 */
const LATEX_COMMANDS = {
    // Brüche
    'frac': { args: 2, optArgs: 0 },
    'dfrac': { args: 2, optArgs: 0 },
    'tfrac': { args: 2, optArgs: 0 },
    // Wurzeln
    'sqrt': { args: 1, optArgs: 1 },
    // Summen und Produkte
    'sum': { args: 0, optArgs: 0, hasLimits: true },
    'prod': { args: 0, optArgs: 0, hasLimits: true },
    'int': { args: 0, optArgs: 0, hasLimits: true },
    'lim': { args: 0, optArgs: 0, hasLimits: true },
    // Text in Mathe
    'text': { args: 1, optArgs: 0 },
    'mathrm': { args: 1, optArgs: 0 },
    'mathbf': { args: 1, optArgs: 0 },
    'mathit': { args: 1, optArgs: 0 },
    // Überstreichungen
    'overline': { args: 1, optArgs: 0 },
    'underline': { args: 1, optArgs: 0 },
    'hat': { args: 1, optArgs: 0 },
    'vec': { args: 1, optArgs: 0 },
    // Klammern
    'left': { args: 0, optArgs: 0, needsPair: 'right' },
    'right': { args: 0, optArgs: 0, needsPair: 'left' },
    // Trigonometrische Funktionen
    'sin': { args: 0, optArgs: 0 },
    'cos': { args: 0, optArgs: 0 },
    'tan': { args: 0, optArgs: 0 },
    'cot': { args: 0, optArgs: 0 },
    'arcsin': { args: 0, optArgs: 0 },
    'arccos': { args: 0, optArgs: 0 },
    'arctan': { args: 0, optArgs: 0 },
    // Logarithmen
    'log': { args: 0, optArgs: 0 },
    'ln': { args: 0, optArgs: 0 },
    'lg': { args: 0, optArgs: 0 },
    // Andere
    'cdot': { args: 0, optArgs: 0 },
    'times': { args: 0, optArgs: 0 },
    'div': { args: 0, optArgs: 0 },
    'pm': { args: 0, optArgs: 0 },
    'mp': { args: 0, optArgs: 0 },
    'to': { args: 0, optArgs: 0 },
    'infty': { args: 0, optArgs: 0 },
    'alpha': { args: 0, optArgs: 0 },
    'beta': { args: 0, optArgs: 0 },
    'gamma': { args: 0, optArgs: 0 },
    'delta': { args: 0, optArgs: 0 },
    'pi': { args: 0, optArgs: 0 },
    'neq': { args: 0, optArgs: 0 },
    'leq': { args: 0, optArgs: 0 },
    'geq': { args: 0, optArgs: 0 },
    'approx': { args: 0, optArgs: 0 },
    // Farbbefehle (werden entfernt)
    'textcolor': { args: 2, optArgs: 0, remove: true },
    'color': { args: 1, optArgs: 0, remove: true }
};

/**
 * Entfernt LaTeX-Delimiter aus einem String
 * @param {string} latex - LaTeX mit möglichen Delimitern
 * @returns {string} - Reiner LaTeX-Inhalt ohne Delimiter
 */
function stripLatexDelimiters(latex) {
    if (!latex || typeof latex !== 'string') return latex;
    
    let result = latex.trim();
    
    // Entferne \( ... \)
    result = result.replace(/^\\\(|\\\)$/g, '');
    // Entferne \[ ... \]
    result = result.replace(/^\\\[|\\\]$/g, '');
    // Entferne $ ... $ (aber nicht $$)
    if (result.startsWith('$') && !result.startsWith('$$')) {
        result = result.slice(1);
    }
    if (result.endsWith('$') && !result.endsWith('$$')) {
        result = result.slice(0, -1);
    }
    // Entferne $$ ... $$
    result = result.replace(/^\$\$|\$\$$/g, '');
    
    return result.trim();
}

/**
 * Entfernt Color-Befehle aus LaTeX und behält nur den Inhalt
 * z.B. \textcolor{red}{x+1} -> x+1
 * z.B. \color{blue} wird komplett entfernt
 */
function removeColorCommands(latex) {
    if (!latex || typeof latex !== 'string') return latex;
    
    let result = latex;
    
    // Entferne \textcolor{farbe}{inhalt} -> inhalt
    result = result.replace(/\\textcolor\{[^}]*\}\{([^}]*)\}/g, '$1');
    
    // Entferne \color{farbe} komplett
    result = result.replace(/\\color\{[^}]*\}/g, '');
    
    // Entferne auch {\color{farbe} inhalt} -> inhalt
    result = result.replace(/\{\\color\{[^}]*\}\s*([^}]*)\}/g, '$1');
    
    return result;
}

/**
 * Sanitiert LaTeX-Inhalt und korrigiert häufige Fehler
 * @param {string} content - Der zu sanitierende Inhalt
 * @returns {string} - Sanitierter Inhalt
 */
function sanitizeLatex(content) {
    if (!content || typeof content !== 'string') {
        return content;
    }

    let sanitized = content;

    // 0. Entferne Delimiter falls vorhanden
    sanitized = stripLatexDelimiters(sanitized);
    
    // 1. Entferne Color-Befehle
    sanitized = removeColorCommands(sanitized);

    // 2. Entferne lose Backslashes (Backslash ohne folgenden Befehl)
    sanitized = sanitized.replace(/\\(?![a-zA-Z{}\[\]()$])/g, '');

    // 3. Korrigiere Klammern in bekannten Befehlen
    sanitized = fixBracesInCommands(sanitized);

    // 4. Balanciere allgemeine Klammern
    sanitized = balanceBrackets(sanitized, '{', '}');
    sanitized = balanceBrackets(sanitized, '(', ')');
    sanitized = balanceBrackets(sanitized, '[', ']');

    // 5. Korrigiere \left ohne \right und umgekehrt
    sanitized = fixLeftRightPairs(sanitized);

    // 6. Entferne doppelte Leerzeichen
    sanitized = sanitized.replace(/  +/g, ' ');

    // 7. Korrigiere häufige Tippfehler
    sanitized = fixCommonTypos(sanitized);

    return sanitized.trim();
}

/**
 * Korrigiert Klammern in bekannten LaTeX-Befehlen
 */
function fixBracesInCommands(content) {
    let result = content;

    // \frac mit fehlenden Klammern korrigieren
    result = result.replace(/\\frac\s*{([^{}]*)}\s*([^{])/g, (match, num, afterNum) => {
        if (afterNum === '{') {
            return match;
        }
        if (/[a-zA-Z0-9]/.test(afterNum)) {
            return `\\frac{${num}}{${afterNum}}`;
        }
        return match;
    });

    // \frac ohne Klammern: \frac ab -> \frac{a}{b}
    result = result.replace(/\\frac\s+([a-zA-Z0-9])\s*([a-zA-Z0-9])(?![{])/g, '\\frac{$1}{$2}');

    // \sqrt mit fehlendem Argument
    result = result.replace(/\\sqrt\s+([a-zA-Z0-9])(?![{\[])/g, '\\sqrt{$1}');

    // Potenzen: x^10 -> x^{10} (wenn mehr als ein Zeichen)
    result = result.replace(/\^([0-9]{2,})/g, '^{$1}');
    result = result.replace(/\^([a-zA-Z]{2,})/g, '^{$1}');

    // Indizes: x_10 -> x_{10} (wenn mehr als ein Zeichen)
    result = result.replace(/_([0-9]{2,})/g, '_{$1}');
    result = result.replace(/_([a-zA-Z]{2,})/g, '_{$1}');

    // \text, \mathrm etc. mit fehlendem Argument
    ['text', 'mathrm', 'mathbf', 'mathit'].forEach(cmd => {
        const pattern = new RegExp(`\\\\${cmd}\\s+([a-zA-Z0-9]+)(?![{])`, 'g');
        result = result.replace(pattern, `\\${cmd}{$1}`);
    });

    return result;
}

/**
 * Balanciert öffnende und schließende Klammern
 */
function balanceBrackets(content, openBracket, closeBracket) {
    let result = content;
    let openCount = 0;
    let closeCount = 0;

    for (const char of result) {
        if (char === openBracket) openCount++;
        if (char === closeBracket) closeCount++;
    }

    while (closeCount < openCount) {
        result += closeBracket;
        closeCount++;
    }

    while (openCount < closeCount) {
        result = openBracket + result;
        openCount++;
    }

    return result;
}

/**
 * Korrigiert \left ohne \right und umgekehrt
 */
function fixLeftRightPairs(content) {
    let result = content;

    const leftMatches = result.match(/\\left/g) || [];
    const rightMatches = result.match(/\\right/g) || [];

    const leftCount = leftMatches.length;
    const rightCount = rightMatches.length;

    for (let i = rightCount; i < leftCount; i++) {
        result += '\\right.';
    }

    for (let i = leftCount; i < rightCount; i++) {
        const firstRight = result.indexOf('\\right');
        if (firstRight > 0) {
            result = result.slice(0, firstRight) + '\\left.' + result.slice(firstRight);
        } else {
            result = '\\left.' + result;
        }
    }

    return result;
}

/**
 * Korrigiert häufige LaTeX-Tippfehler
 */
function fixCommonTypos(content) {
    let result = content;

    // Doppelte Backslashes vor Befehlen
    result = result.replace(/\\\\([a-zA-Z])/g, '\\$1');

    // Fehlende Leerzeichen nach bestimmten Befehlen
    result = result.replace(/\\(sin|cos|tan|log|ln|lim)([a-zA-Z])/g, '\\$1 $2');

    // Leere Klammern entfernen
    result = result.replace(/\{\s*\}/g, '');

    // Doppelte Klammern reduzieren
    result = result.replace(/\{\{([^{}]*)\}\}/g, '{$1}');

    return result;
}

/**
 * Sanitiert einen einzelnen Step aus der API-Response
 */
function sanitizeStepLatex(step) {
    if (!step) return step;
    
    return {
        ...step,
        latex: step.latex ? sanitizeLatex(step.latex) : ''
    };
}

// ==================== Mathematische Validierung ====================

/**
 * Konvertiert LaTeX in einen auswertbaren mathematischen Ausdruck
 * @param {string} latex - LaTeX-Ausdruck
 * @returns {string} - JavaScript/Math.js kompatibler Ausdruck
 */
function latexToMathExpression(latex) {
    if (!latex || typeof latex !== 'string') return null;
    
    let expr = latex.trim();
    
    // Entferne LaTeX-Delimiter
    expr = stripLatexDelimiters(expr);
    
    // Konvertiere LaTeX zu Math.js Format
    expr = expr
        // Brüche: \frac{a}{b} -> (a)/(b)
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))')
        // Wurzeln: \sqrt{x} -> sqrt(x)
        .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
        // n-te Wurzel: \sqrt[n]{x} -> nthRoot(x, n)
        .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'nthRoot($2, $1)')
        // Potenzen: ^{n} -> ^(n)
        .replace(/\^{([^}]+)}/g, '^($1)')
        // Multiplikation: \cdot, \times -> *
        .replace(/\\cdot|\\times/g, '*')
        // Division: \div -> /
        .replace(/\\div/g, '/')
        // Implizite Multiplikation: 2x -> 2*x
        .replace(/(\d)([a-zA-Z])/g, '$1*$2')
        // Klammern vor Variablen: )x -> )*x
        .replace(/\)([a-zA-Z])/g, ')*$1')
        // Variable vor Klammer: x( -> x*(
        .replace(/([a-zA-Z])\(/g, '$1*(')
        // Trigonometrische Funktionen
        .replace(/\\sin/g, 'sin')
        .replace(/\\cos/g, 'cos')
        .replace(/\\tan/g, 'tan')
        // Logarithmen
        .replace(/\\ln/g, 'log')
        .replace(/\\log/g, 'log10')
        // Konstanten
        .replace(/\\pi/g, 'pi')
        .replace(/\\e(?![a-z])/g, 'e')
        // Entferne verbleibende Backslashes
        .replace(/\\/g, '')
        // Entferne geschweifte Klammern
        .replace(/[{}]/g, '')
        // Bereinige Leerzeichen
        .replace(/\s+/g, '')
        .trim();
    
    return expr;
}

/**
 * Extrahiert Gleichungsseiten aus einem Ausdruck
 * @param {string} expr - Mathematischer Ausdruck (z.B. "2x + 3 = 7")
 * @returns {Object|null} - { left, right } oder null
 */
function extractEquationSides(expr) {
    if (!expr || typeof expr !== 'string') return null;
    
    // Suche nach = (aber nicht <= oder >= oder !=)
    const match = expr.match(/^([^=<>!]+)=([^=]+)$/);
    if (match) {
        return {
            left: match[1].trim(),
            right: match[2].trim()
        };
    }
    return null;
}

/**
 * Prüft ob zwei mathematische Ausdrücke äquivalent sind
 * @param {string} expr1 - Erster Ausdruck
 * @param {string} expr2 - Zweiter Ausdruck
 * @param {string} variable - Variable (default: 'x')
 * @returns {boolean} - true wenn äquivalent
 */
function areExpressionsEquivalent(expr1, expr2, variable = 'x') {
    if (!expr1 || !expr2) return false;
    if (!window.math) {
        console.warn('[MathValidator] math.js not loaded');
        return false;
    }
    
    try {
        // Teste mit mehreren Werten
        const testValues = [-2, -1, -0.5, 0, 0.5, 1, 2, 3, 5, 10];
        let matchCount = 0;
        let validCount = 0;
        
        for (const val of testValues) {
            try {
                const scope = { [variable]: val };
                const result1 = window.math.evaluate(expr1, scope);
                const result2 = window.math.evaluate(expr2, scope);
                
                // Ignoriere NaN, Infinity
                if (!isFinite(result1) || !isFinite(result2)) continue;
                
                validCount++;
                
                // Toleranz für Rundungsfehler
                const tolerance = Math.max(Math.abs(result1), Math.abs(result2)) * 0.0001;
                if (Math.abs(result1 - result2) <= tolerance + 0.0001) {
                    matchCount++;
                }
            } catch (e) {
                // Ignoriere Fehler bei einzelnen Werten (z.B. Division durch 0)
            }
        }
        
        // Mindestens 3 gültige Tests und alle müssen übereinstimmen
        return validCount >= 3 && matchCount === validCount;
    } catch (e) {
        console.warn('[MathValidator] Evaluation error:', e.message);
        return false;
    }
}

/**
 * Prüft ob eine Gleichungsumformung mathematisch korrekt ist
 * @param {string} step1Latex - Vorheriger Schritt (LaTeX)
 * @param {string} step2Latex - Aktueller Schritt (LaTeX)
 * @returns {Object} - { isValid, reason }
 */
function validateStepTransformation(step1Latex, step2Latex) {
    if (!step1Latex || !step2Latex) {
        return { isValid: null, reason: 'Missing step' };
    }
    
    const expr1 = latexToMathExpression(step1Latex);
    const expr2 = latexToMathExpression(step2Latex);
    
    if (!expr1 || !expr2) {
        return { isValid: null, reason: 'Could not parse LaTeX' };
    }
    
    // Fall 1: Beide sind Gleichungen -> prüfe ob die Lösungsmenge gleich ist
    const eq1 = extractEquationSides(expr1);
    const eq2 = extractEquationSides(expr2);
    
    if (eq1 && eq2) {
        // Forme beide Gleichungen um zu: left - right = 0
        const diff1 = `(${eq1.left})-(${eq1.right})`;
        const diff2 = `(${eq2.left})-(${eq2.right})`;
        
        // Prüfe ob die Nullstellen gleich sind (äquivalente Gleichungen)
        if (areExpressionsEquivalent(diff1, diff2)) {
            return { isValid: true, reason: 'Equivalent equations' };
        }
        
        // Prüfe auch ob eine skalierte Version ist (z.B. 2x=4 und x=2)
        // durch Testen ob die Gleichungen für gleiche x-Werte erfüllt sind
        return { isValid: null, reason: 'Could not verify equivalence' };
    }
    
    // Fall 2: Ausdrücke (keine Gleichungen) -> prüfe direkte Äquivalenz
    if (!eq1 && !eq2) {
        const equivalent = areExpressionsEquivalent(expr1, expr2);
        return { 
            isValid: equivalent ? true : null, 
            reason: equivalent ? 'Equivalent expressions' : 'Expressions differ'
        };
    }
    
    return { isValid: null, reason: 'Mixed equation/expression' };
}

/**
 * Extrahiert Variablenzuweisungen aus einem Schritt (z.B. "x = 3" -> {x: 3})
 * @param {string} latex - LaTeX-Ausdruck
 * @returns {Object|null} - {variable, value} oder null
 */
function extractVariableAssignment(latex) {
    if (!latex || typeof latex !== 'string') return null;
    
    const expr = latexToMathExpression(latex);
    if (!expr) return null;
    
    // Prüfe auf einfache Zuweisung: variable = wert
    // Unterstützt auch Ketten wie "y = 7 - 3 = 4" (nimmt letzten Wert)
    const parts = expr.split('=');
    if (parts.length < 2) return null;
    
    const variable = parts[0].trim();
    // Variable muss ein einzelner Buchstabe sein
    if (!/^[a-zA-Z]$/.test(variable)) return null;
    
    // Nimm den letzten Teil als Wert (für Ketten wie "y = 7 - 3 = 4")
    const valueStr = parts[parts.length - 1].trim();
    
    try {
        const value = window.math.evaluate(valueStr);
        if (typeof value === 'number' && isFinite(value)) {
            return { variable, value };
        }
    } catch (e) {
        // Ignoriere Fehler
    }
    
    return null;
}

/**
 * Extrahiert Gleichungen mit zwei Variablen aus den Schritten
 * @param {Array} steps - Schritte der Analyse
 * @returns {Array} - Array von {left, right, originalLatex}
 */
function extractOriginalEquations(steps) {
    const equations = [];
    
    for (const step of steps) {
        const latex = step.latex || step.rawText || '';
        const expr = latexToMathExpression(latex);
        if (!expr) continue;
        
        const eq = extractEquationSides(expr);
        if (!eq) continue;
        
        // Prüfe ob es eine Gleichung mit zwei Variablen ist
        const fullExpr = eq.left + '+' + eq.right;
        const hasX = /\bx\b/i.test(fullExpr);
        const hasY = /\by\b/i.test(fullExpr);
        
        if (hasX && hasY) {
            equations.push({
                left: eq.left,
                right: eq.right,
                originalLatex: latex
            });
        }
    }
    
    return equations;
}

/**
 * Prüft Rücksubstitution: Ob die gefundenen Variablenwerte die Originalgleichungen erfüllen
 * @param {Array} steps - Schritte der Analyse
 * @returns {Object|null} - {stepIndex, expectedValue, actualValue} bei Fehler, sonst null
 */
function validateBackSubstitution(steps) {
    if (!window.math) return null;
    
    // Extrahiere Originalgleichungen (mit x und y)
    const originalEquations = extractOriginalEquations(steps);
    if (originalEquations.length === 0) return null;
    
    // Extrahiere gefundene Variablenwerte
    const foundValues = {};
    const stepIndices = {};
    
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const latex = step.latex || step.rawText || '';
        const assignment = extractVariableAssignment(latex);
        
        if (assignment) {
            foundValues[assignment.variable.toLowerCase()] = assignment.value;
            stepIndices[assignment.variable.toLowerCase()] = step.index || (i + 1);
        }
    }
    
    // Brauchen mindestens x und y
    if (!('x' in foundValues) || !('y' in foundValues)) return null;
    
    // Prüfe ob die Werte die Originalgleichungen erfüllen
    for (const eq of originalEquations) {
        try {
            const leftValue = window.math.evaluate(eq.left, foundValues);
            const rightValue = window.math.evaluate(eq.right, foundValues);
            
            if (!isFinite(leftValue) || !isFinite(rightValue)) continue;
            
            // Toleranz für Rundungsfehler
            const tolerance = Math.max(Math.abs(leftValue), Math.abs(rightValue)) * 0.01 + 0.01;
            
            if (Math.abs(leftValue - rightValue) > tolerance) {
                console.log(`[MathValidator] Back-substitution check failed:`, {
                    equation: eq.originalLatex,
                    foundValues,
                    leftValue,
                    rightValue,
                    difference: Math.abs(leftValue - rightValue)
                });
                
                // Finde den Schritt mit dem falschen y-Wert (häufigster Fehler)
                // Bei Gleichungssystemen ist es meist der letzte berechnete Wert
                const lastVarStep = Math.max(stepIndices['x'] || 0, stepIndices['y'] || 0);
                
                return {
                    stepIndex: lastVarStep,
                    equation: eq.originalLatex,
                    foundValues,
                    leftValue,
                    rightValue
                };
            }
        } catch (e) {
            // Ignoriere Fehler bei der Evaluation
        }
    }
    
    return null;
}

/**
 * Validiert die Fehlermarkierungen in einer Analyse
 * Entfernt falsche Fehlermarkierungen wenn der Schritt mathematisch korrekt ist
 * Fügt fehlende Fehlermarkierungen hinzu bei Rücksubstitutionsfehlern
 * @param {Object} analysis - Die Analyse mit steps
 * @returns {Object} - Die korrigierte Analyse
 */
function validateErrorMarkings(analysis) {
    if (!analysis || !analysis.steps || analysis.steps.length < 2) {
        return analysis;
    }
    
    if (!window.math) {
        console.warn('[MathValidator] math.js not loaded, skipping validation');
        return analysis;
    }
    
    const correctedSteps = [...analysis.steps];
    let correctionsMade = 0;
    let errorsAdded = 0;
    
    // Phase 1: Entferne falsche Fehlermarkierungen
    for (let i = 1; i < correctedSteps.length; i++) {
        const currentStep = correctedSteps[i];
        const previousStep = correctedSteps[i - 1];
        
        // Nur prüfen wenn als Fehler markiert (außer Folgefehler)
        if (currentStep.errorType && currentStep.errorType !== 'none' && currentStep.errorType !== 'followup') {
            const validation = validateStepTransformation(previousStep.latex, currentStep.latex);
            
            if (validation.isValid === true) {
                console.log(`[MathValidator] Step ${i + 1} marked as ${currentStep.errorType} but is mathematically correct. Removing error marking.`);
                correctedSteps[i] = {
                    ...currentStep,
                    errorType: 'none',
                    _validationNote: `Originally marked as ${currentStep.errorType}, but validated as correct`
                };
                correctionsMade++;
            }
        }
    }
    
    // Phase 2: Prüfe auf fehlende Fehler bei Rücksubstitution
    const hasErrors = correctedSteps.some(s => s.errorType && s.errorType !== 'none');
    
    if (!hasErrors) {
        const backSubError = validateBackSubstitution(correctedSteps);
        
        if (backSubError) {
            // Finde den Schritt und markiere ihn als Rechenfehler
            const stepArrayIndex = correctedSteps.findIndex(s => 
                (s.index || 0) === backSubError.stepIndex
            );
            
            if (stepArrayIndex >= 0) {
                console.log(`[MathValidator] Back-substitution error detected at step ${backSubError.stepIndex}:`, backSubError);
                correctedSteps[stepArrayIndex] = {
                    ...correctedSteps[stepArrayIndex],
                    errorType: 'calc',
                    _validationNote: `Back-substitution check failed: ${backSubError.equation} not satisfied with x=${backSubError.foundValues.x}, y=${backSubError.foundValues.y}`
                };
                errorsAdded++;
                
                // Update Feedback
                if (analysis.feedback) {
                    analysis.feedback.summarySentence = 'Bei der Rücksubstitution ist ein Rechenfehler aufgetreten.';
                }
            }
        }
    }
    
    if (correctionsMade > 0) {
        console.log(`[MathValidator] Corrected ${correctionsMade} false error marking(s)`);
        
        // Update Feedback wenn alle Fehler entfernt wurden
        const hasRemainingErrors = correctedSteps.some(s => s.errorType && s.errorType !== 'none');
        if (!hasRemainingErrors && analysis.feedback) {
            analysis.feedback.summarySentence = 'Nach Validierung: Alle Schritte sind mathematisch korrekt!';
        }
    }
    
    if (errorsAdded > 0) {
        console.log(`[MathValidator] Added ${errorsAdded} missing error marking(s)`);
    }
    
    return {
        ...analysis,
        steps: correctedSteps,
        _validationApplied: true,
        _correctionsMade: correctionsMade,
        _errorsAdded: errorsAdded
    };
}

// Exportiere für globalen Zugriff
if (typeof window !== 'undefined') {
    window.LatexSanitizer = {
        sanitizeLatex,
        stripLatexDelimiters,
        removeColorCommands,
        sanitizeStepLatex,
        LATEX_COMMANDS
    };
    
    window.MathValidator = {
        latexToMathExpression,
        extractEquationSides,
        areExpressionsEquivalent,
        validateStepTransformation,
        validateErrorMarkings,
        extractVariableAssignment,
        extractOriginalEquations,
        validateBackSubstitution
    };
}

// ==================== Main Class ====================

// ==================== TestManager für Unit Tests ====================

/**
 * TestManager - Verwaltet Unit Tests für die Fehleranalyse-Funktionalität
 * Ermöglicht das Testen von Features ohne manuelle Aufgabenlösung
 */
class TestManager {
    constructor(tutorInstance) {
        this.tutor = tutorInstance;
        this.testHooks = new Map();
        this.batchResults = [];
        this.isRunning = false;
        
        // Standard-Hooks registrieren
        this.registerDefaultHooks();
    }
    
    /**
     * Registriert Standard-Test-Hooks
     */
    registerDefaultHooks() {
        // Basis-Validierung der Analyse
        this.registerTestHook('analysis_validation', async (task, solution, analysis) => {
            if (!window.TestData) return { passed: false, error: 'TestData nicht geladen' };
            
            const validation = window.TestData.validateAnalysisResult(
                analysis, 
                solution.expectedErrors
            );
            return validation;
        });
        
        // Feedback-Check
        this.registerTestHook('feedback_check', async (task, solution, analysis) => {
            const hasFeedback = analysis?.feedback?.summarySentence?.length > 0;
            return {
                passed: hasFeedback,
                details: hasFeedback 
                    ? `Feedback: "${analysis.feedback.summarySentence}"`
                    : 'Kein Feedback erhalten'
            };
        });
    }
    
    /**
     * Registriert einen neuen Test-Hook für Erweiterbarkeit
     * @param {string} name - Name des Hooks
     * @param {Function} fn - Async Funktion (task, solution, analysis) => { passed, details }
     */
    registerTestHook(name, fn) {
        this.testHooks.set(name, fn);
        console.log(`[TestManager] Hook registriert: ${name}`);
    }
    
    /**
     * Entfernt einen Test-Hook
     * @param {string} name - Name des Hooks
     */
    unregisterTestHook(name) {
        this.testHooks.delete(name);
    }
    
    /**
     * Führt einen einzelnen Test mit zufälliger Aufgabe aus
     * Liest die Lösungsart aus dem UI-Dropdown
     * @returns {Promise<Object>} Test-Ergebnis
     */
    async runSingleTest() {
        if (this.isRunning) {
            console.warn('[TestManager] Test läuft bereits');
            return null;
        }
        
        if (!window.TestData) {
            this.tutor.showNotification('Test-Daten nicht geladen. Bitte test-data.js einbinden.', 'error');
            return null;
        }
        
        if (!this.tutor.apiKey) {
            this.tutor.showNotification('API-Schlüssel fehlt. Bitte im Profil konfigurieren.', 'warning');
            return null;
        }
        
        // Lösungsart aus UI-Dropdown lesen
        const solutionTypeSelect = document.getElementById('test-solution-type');
        let forceIncorrect = null; // zufällig
        if (solutionTypeSelect) {
            if (solutionTypeSelect.value === 'incorrect') forceIncorrect = true;
            else if (solutionTypeSelect.value === 'correct') forceIncorrect = false;
            // 'random' bleibt null
        }
        
        this.isRunning = true;
        this.tutor.isTestMode = true;  // Test-Modus aktivieren
        this.tutor.showLoading(true);
        
        try {
            // Zufällige Aufgabe und Lösung wählen
            const task = window.TestData.getRandomTestTask();
            const solution = window.TestData.getRandomSolution(task, forceIncorrect);
            
            console.log('[TestManager] Starte Test:', {
                taskId: task.id,
                isCorrect: solution.isCorrect,
                expectedErrors: solution.expectedErrors,
                solutionType: forceIncorrect === true ? 'fehlerhaft' : forceIncorrect === false ? 'korrekt' : 'zufällig'
            });
            
            // Aufgabe in den Tutor laden
            this.tutor.currentTask = task.task;
            this.tutor.solutionState = this.tutor.getDefaultSolutionState();
            this.tutor.stepCorrections = {};
            
            // Fehleranalyse durchführen
            const prompts = this.tutor.buildErrorAnalysisPrompt({
                userSolution: solution.solution,
                drawingInfo: '',
                hasDrawings: false,
                attemptNumber: 1
            });
            
            const analysis = await this.tutor.callErrorAnalysisAPI(prompts);
            const hasErrors = analysis.steps && analysis.steps.some(s => s.errorType && s.errorType !== 'none');
            const success = !hasErrors;

            // State für Hint-/Feedback-Nutzung im Test-Modus setzen
            this.tutor.solutionState = {
                lastUserSolution: solution.solution,
                lastCanvasImages: [],
                lastCheckResponse: analysis,
                lastAnalysis: analysis,
                lastWasCorrect: success,
                attemptCount: 1,
                previousAnalyses: [],
                hilfestellungEligible: !success && !!solution.solution,
                hilfestellungProvided: false,
                correctedProvided: false,
                canRequestOptimal: success,
                optimalDelivered: false,
                hilfestellungContent: '',
                correctedContent: '',
                optimalContent: '',
                hintState: {
                    prepared: analysis.hints || { level1: [], level2: [] },
                    unlockedLevel: 0,
                    popupOpen: false
                }
            };
            
            // Ergebnis zusammenstellen
            const result = {
                task: task,
                solution: solution,
                analysis: analysis,
                timestamp: new Date().toISOString()
            };
            
            // KI-Analyse direkt anzeigen (ohne Hook-Validierung)
            this.displayAnalysisResult(task, solution, analysis);
            
            return result;
            
        } catch (error) {
            console.error('[TestManager] Test-Fehler:', error);
            this.tutor.showNotification(`Test-Fehler: ${error.message}`, 'error');
            return { error: error.message };
        } finally {
            this.isRunning = false;
            this.tutor.showLoading(false);
        }
    }
    
    /**
     * Führt alle Tests im Batch-Modus aus
     * @returns {Promise<Array>} Array mit allen Ergebnissen
     */
    async runBatchTests() {
        if (this.isRunning) {
            console.warn('[TestManager] Test läuft bereits');
            return null;
        }
        
        if (!window.TestData) {
            this.tutor.showNotification('Test-Daten nicht geladen.', 'error');
            return null;
        }
        
        if (!this.tutor.apiKey) {
            this.tutor.showNotification('API-Schlüssel fehlt.', 'warning');
            return null;
        }
        
        this.isRunning = true;
        this.batchResults = [];
        
        const allTasks = window.TestData.getAllTestTasks();
        const progressEl = document.getElementById('batch-progress');
        
        try {
            for (let i = 0; i < allTasks.length; i++) {
                const task = allTasks[i];
                
                // Fortschritt anzeigen
                if (progressEl) {
                    progressEl.innerHTML = `
                        <div class="batch-progress-bar">
                            <div class="progress-fill" style="width: ${((i + 1) / allTasks.length) * 100}%"></div>
                        </div>
                        <div class="batch-progress-text">
                            Test ${i + 1}/${allTasks.length}: ${task.id}
                        </div>
                    `;
                }
                
                // Teste mit fehlerhafter Lösung (interessanter für Fehleranalyse)
                const solution = window.TestData.getRandomSolution(task, true);
                
                console.log(`[TestManager] Batch ${i + 1}/${allTasks.length}: ${task.id}`);
                
                this.tutor.currentTask = task.task;
                this.tutor.solutionState = this.tutor.getDefaultSolutionState();
                
                const prompts = this.tutor.buildErrorAnalysisPrompt({
                    userSolution: solution.solution,
                    drawingInfo: '',
                    hasDrawings: false,
                    attemptNumber: 1
                });
                
                const analysis = await this.tutor.callErrorAnalysisAPI(prompts);
                const hookResults = await this.runTestHooks(task, solution, analysis);
                
                const result = {
                    task: task,
                    solution: solution,
                    analysis: analysis,
                    hookResults: hookResults,
                    timestamp: new Date().toISOString(),
                    allPassed: hookResults.every(h => h.passed)
                };
                
                this.batchResults.push(result);
                
                // Kurze Pause zwischen Tests um Rate-Limits zu vermeiden
                if (i < allTasks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Batch-Zusammenfassung anzeigen
            this.displayBatchSummary();
            
            return this.batchResults;
            
        } catch (error) {
            console.error('[TestManager] Batch-Fehler:', error);
            this.tutor.showNotification(`Batch-Fehler: ${error.message}`, 'error');
            return this.batchResults;
        } finally {
            this.isRunning = false;
            if (progressEl) {
                progressEl.innerHTML = '';
            }
        }
    }
    
    /**
     * Führt alle registrierten Test-Hooks aus
     */
    async runTestHooks(task, solution, analysis) {
        const results = [];
        
        for (const [name, fn] of this.testHooks) {
            try {
                const result = await fn(task, solution, analysis);
                results.push({
                    hook: name,
                    ...result
                });
            } catch (error) {
                results.push({
                    hook: name,
                    passed: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * Zeigt das Test-Ergebnis im normalen Ergebnis-Bereich an
     */
    displayTestResult(result) {
        const resultsSection = document.getElementById('results-section');
        const resultsContent = document.getElementById('results-content');
        
        if (!resultsSection || !resultsContent) return;
        
        // Test-Info Header erstellen
        const testInfoHtml = `
            <div class="test-result-header ${result.allPassed ? 'test-passed' : 'test-failed'}">
                <div class="test-badge">
                    <i class="fas fa-flask"></i> TEST-MODUS
                </div>
                <div class="test-info">
                    <strong>Aufgabe:</strong> ${result.task.id} (${result.task.topic})
                    <br>
                    <strong>Lösungsweg:</strong> ${result.solution.isCorrect ? 'Korrekt' : 'Mit Fehlern'}
                    ${!result.solution.isCorrect ? `<br><strong>Erwartete Fehler:</strong> ${result.solution.expectedErrors.map(e => `Schritt ${e.step}: ${e.type}`).join(', ')}` : ''}
                </div>
                <div class="test-status">
                    ${result.allPassed 
                        ? '<i class="fas fa-check-circle"></i> Alle Tests bestanden' 
                        : '<i class="fas fa-times-circle"></i> Tests fehlgeschlagen'}
                </div>
            </div>
            <div class="test-hooks-results">
                ${result.hookResults.map(h => `
                    <div class="hook-result ${h.passed ? 'hook-passed' : 'hook-failed'}">
                        <strong>${h.hook}:</strong> 
                        ${h.passed ? '✓' : '✗'} 
                        ${h.details ? (typeof h.details === 'string' ? h.details : JSON.stringify(h.details)) : ''}
                        ${h.error ? `<span class="error">${h.error}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Falls eine strukturierte Analyse vorhanden ist, diese auch anzeigen
        if (result.analysis && result.analysis.steps) {
            // Nutze die vorhandene displayStructuredFeedback Funktion
            this.tutor.displayStructuredFeedback(result.analysis);
            
            // Test-Info oben einfügen
            const existingContent = resultsContent.innerHTML;
            resultsContent.innerHTML = testInfoHtml + existingContent;
        } else {
            resultsContent.innerHTML = testInfoHtml + `
                <div class="test-raw-response">
                    <strong>Rohe Antwort:</strong>
                    <pre>${JSON.stringify(result.analysis, null, 2)}</pre>
                </div>
            `;
        }
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Zeigt die KI-Fehleranalyse übersichtlich an (für manuelles Review)
     * @param {Object} task - Die Testaufgabe
     * @param {Object} solution - Die gewählte Lösung
     * @param {Object} analysis - Die KI-Analyse
     */
    displayAnalysisResult(task, solution, analysis) {
        const resultsSection = document.getElementById('results-section');
        const resultsContent = document.getElementById('results-content');
        
        if (!resultsSection || !resultsContent) return;
        
        // Header mit Aufgaben-Info
        let html = `
            <div class="test-analysis-header">
                <div class="test-badge">
                    <i class="fas fa-flask"></i> KI-ANALYSE TEST
                </div>
                <div class="test-task-info">
                    <div><strong>Aufgabe:</strong> ${task.id}</div>
                    <div><strong>Thema:</strong> ${task.topic}</div>
                    <div><strong>Schwierigkeit:</strong> ${task.difficulty}</div>
                    <div><strong>Lösungsart:</strong> ${solution.isCorrect ? '<span class="solution-correct">Korrekte Lösung</span>' : '<span class="solution-incorrect">Fehlerhafte Lösung</span>'}</div>
                </div>
            </div>
        `;
        
        // Aufgabenstellung
        html += `
            <div class="test-section-box">
                <h4><i class="fas fa-question-circle"></i> Aufgabenstellung</h4>
                <div class="test-task-text">${task.task.replace(/\n/g, '<br>')}</div>
            </div>
        `;
        
        // Analysierte Lösung (die an die KI geschickt wurde)
        html += `
            <div class="test-section-box">
                <h4><i class="fas fa-pencil-alt"></i> Analysierte Schüler-Lösung</h4>
                <pre class="test-solution-text">${solution.solution}</pre>
            </div>
        `;
        
        // Bei fehlerhafter Lösung: Erwartete Fehler anzeigen
        if (!solution.isCorrect && solution.expectedErrors && solution.expectedErrors.length > 0) {
            html += `
                <div class="test-section-box test-expected-errors">
                    <h4><i class="fas fa-exclamation-triangle"></i> Erwartete Fehler (zur manuellen Verifikation)</h4>
                    <ul>
                        ${solution.expectedErrors.map(e => `
                            <li>
                                <strong>Schritt ${e.step}:</strong> 
                                <span class="error-type error-type-${e.type}">${e.type}</span>
                                - ${e.description}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Hint-Button Label basierend auf Level
        const unlockedLevel = this.tutor.solutionState?.hintState?.unlockedLevel || 0;
        let hintBtnLabel = 'Hint Stufe 1';
        let hintBtnIcon = 'fa-lightbulb';
        if (unlockedLevel === 1) {
            hintBtnLabel = 'Hint Stufe 2';
        } else if (unlockedLevel === 2) {
            hintBtnLabel = 'Lösung anzeigen';
            hintBtnIcon = 'fa-eye';
        }
        // Bei Level >= 3 wird der Button nicht mehr angezeigt (Lösung bereits sichtbar)
        const showHintButton = !solution.isCorrect && unlockedLevel < 3;

        // KI-Analyse Ergebnis
        html += `
            <div class="test-section-box test-ai-analysis">
                <h4><i class="fas fa-robot"></i> KI-Fehleranalyse</h4>
                ${showHintButton ? `
                <div class="test-hint-actions">
                    <button class="btn btn-secondary" id="test-hint-btn">
                        <i class="fas ${hintBtnIcon}"></i>
                        ${hintBtnLabel}
                    </button>
                </div>
                ` : ''}
        `;
        
        // Prüfe auf Vergleichsansicht
        const hasComparison = analysis.comparison && analysis.comparison.correctSteps && analysis.comparison.correctSteps.length > 0;
        
        if (hasComparison) {
            // Vergleichsansicht rendern
            html += `<div class="test-comparison-placeholder" id="test-comparison-container"></div>`;
        } else if (analysis && analysis.steps && analysis.steps.length > 0) {
            html += `<div class="test-analysis-steps">`;
            analysis.steps.forEach((step, idx) => {
                const errorClass = step.errorType !== 'none' ? `step-error step-error-${step.errorType}` : 'step-correct';
                html += `
                    <div class="test-step ${errorClass}">
                        <div class="step-header">
                            <span class="step-number">Schritt ${step.index || idx + 1}</span>
                            <span class="step-error-type ${step.errorType !== 'none' ? 'has-error' : ''}">${step.errorType}</span>
                        </div>
                        <div class="step-content">
                            <div class="step-raw">${step.rawText || ''}</div>
                            ${step.latex ? `<div class="step-latex">\\(${step.latex}\\)</div>` : ''}
                        </div>
                        ${step.operation ? `<div class="step-operation">→ ${step.operation}</div>` : ''}
                    </div>
                `;
            });
            html += `</div>`;
        } else {
            html += `
                <div class="test-raw-response">
                    <strong>Rohe Antwort:</strong>
                    <pre>${JSON.stringify(analysis, null, 2)}</pre>
                </div>
            `;
        }
            
        // Feedback
        if (analysis.feedback) {
            html += `
                <div class="test-feedback">
                    <h5><i class="fas fa-comment"></i> KI-Feedback</h5>
                    <p class="feedback-summary">${analysis.feedback.summarySentence || 'Kein Feedback'}</p>
                </div>
            `;
        }
        
        // Detailed Feedback anzeigen (Level 3)
        if (analysis.detailedFeedback) {
            const df = analysis.detailedFeedback;
            html += `<div class="test-detailed-feedback">`;
            
            if (df.strengths && df.strengths.length > 0) {
                html += `
                    <div class="feedback-section feedback-strengths">
                        <h5><i class="fas fa-check-circle"></i> Was gut war</h5>
                        <ul>${df.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                    </div>
                `;
            }
            
            if (df.weaknesses && df.weaknesses.length > 0) {
                html += `
                    <div class="feedback-section feedback-weaknesses">
                        <h5><i class="fas fa-exclamation-triangle"></i> Verbesserungspotential</h5>
                        <ul>${df.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
                    </div>
                `;
            }
            
            if (df.tips && df.tips.length > 0) {
                html += `
                    <div class="feedback-section feedback-tips">
                        <h5><i class="fas fa-lightbulb"></i> Merksätze</h5>
                        <ul>${df.tips.map(t => `<li>${t}</li>`).join('')}</ul>
                    </div>
                `;
            }
            
            if (df.encouragement) {
                html += `
                    <div class="feedback-section feedback-encouragement">
                        <p><i class="fas fa-heart"></i> ${df.encouragement}</p>
                    </div>
                `;
            }
            
            html += `</div>`;
        }
        
        html += `</div>`; // Ende test-ai-analysis
        
        // Gefundene Fehler Zusammenfassung
        if (analysis && analysis.steps) {
            const foundErrors = analysis.steps.filter(s => s.errorType !== 'none');
            html += `
                <div class="test-section-box test-summary">
                    <h4><i class="fas fa-chart-bar"></i> Zusammenfassung</h4>
                    <div class="summary-stats">
                        <div class="stat">
                            <span class="stat-value">${analysis.steps.length}</span>
                            <span class="stat-label">Schritte erkannt</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${foundErrors.length}</span>
                            <span class="stat-label">Fehler gefunden</span>
                        </div>
                        ${!solution.isCorrect ? `
                        <div class="stat">
                            <span class="stat-value">${solution.expectedErrors.length}</span>
                            <span class="stat-label">Fehler erwartet</span>
                        </div>
                        ` : ''}
                    </div>
                    ${foundErrors.length > 0 ? `
                    <div class="found-errors-list">
                        <strong>Gefundene Fehler:</strong>
                        <ul>
                            ${foundErrors.map(s => `<li>Schritt ${s.index}: <span class="error-type-${s.errorType}">${s.errorType}</span></li>`).join('')}
                        </ul>
                    </div>
                    ` : '<p>Keine Fehler gefunden.</p>'}
                </div>
            `;
        }
        
        resultsContent.innerHTML = html;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        // Vergleichsansicht rendern falls Container vorhanden
        const comparisonContainer = document.getElementById('test-comparison-container');
        if (comparisonContainer && analysis.comparison && analysis.comparison.correctSteps) {
            const wrongSteps = this.tutor.solutionState?.lastAnalysis?.steps || analysis.steps || [];
            const comparisonView = this.tutor.renderComparisonView(
                wrongSteps,
                analysis.comparison.correctSteps,
                analysis.comparison.mappings || []
            );
            comparisonContainer.appendChild(comparisonView);
        }

        // Hint-Button im Testmodus verdrahten
        const testHintBtn = document.getElementById('test-hint-btn');
        if (testHintBtn) {
            testHintBtn.addEventListener('click', async () => {
                await this.tutor.toggleHints();
                
                // Aktuelles Level nach toggleHints abrufen
                const currentLevel = this.tutor.solutionState?.hintState?.unlockedLevel || 0;
                
                if (currentLevel < 3) {
                    // Stufe 1 oder 2: Button-Label aktualisieren und Popup anzeigen
                    this.updateTestHintButton(testHintBtn, currentLevel);
                    this.tutor.showGlobalHintPopup();
                } else {
                    // Bei Level 3: Button verstecken und Analyse mit Comparison neuzeichnen
                    testHintBtn.closest('.test-hint-actions')?.remove();
                    
                    if (this.tutor.solutionState.level3Data) {
                        this.displayAnalysisResult(task, solution, this.tutor.solutionState.level3Data);
                    }
                    this.tutor.showGlobalHintPopup();
                }
            });
        }
        
        // MathJax neu rendern falls vorhanden
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([resultsContent]).catch(err => console.warn('MathJax error:', err));
        }
    }
    
    /**
     * Aktualisiert das Label des Hint-Buttons im Test-Modus basierend auf dem aktuellen Level
     * @param {HTMLElement} btn - Der Hint-Button
     * @param {number} level - Das aktuelle Hint-Level (0-3)
     */
    updateTestHintButton(btn, level) {
        if (!btn) return;
        
        let label = 'Hint Stufe 1';
        let icon = 'fa-lightbulb';
        
        if (level === 1) {
            label = 'Hint Stufe 2';
        } else if (level === 2) {
            label = 'Lösung anzeigen';
            icon = 'fa-eye';
        } else if (level >= 3) {
            label = 'Lösung ansehen';
            icon = 'fa-check-circle';
        }
        
        btn.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
    }
    
    /**
     * Zeigt die Batch-Zusammenfassung an
     */
    displayBatchSummary() {
        const resultsSection = document.getElementById('results-section');
        const resultsContent = document.getElementById('results-content');
        
        if (!resultsSection || !resultsContent) return;
        
        const passed = this.batchResults.filter(r => r.allPassed).length;
        const failed = this.batchResults.length - passed;
        
        let summaryHtml = `
            <div class="batch-summary">
                <h3><i class="fas fa-flask"></i> Batch-Test Zusammenfassung</h3>
                <div class="batch-stats">
                    <div class="stat stat-total">
                        <span class="stat-value">${this.batchResults.length}</span>
                        <span class="stat-label">Gesamt</span>
                    </div>
                    <div class="stat stat-passed">
                        <span class="stat-value">${passed}</span>
                        <span class="stat-label">Bestanden</span>
                    </div>
                    <div class="stat stat-failed">
                        <span class="stat-value">${failed}</span>
                        <span class="stat-label">Fehlgeschlagen</span>
                    </div>
                </div>
                <div class="batch-results-list">
                    ${this.batchResults.map((r, i) => `
                        <div class="batch-result-item ${r.allPassed ? 'passed' : 'failed'}" data-index="${i}">
                            <span class="result-icon">${r.allPassed ? '✓' : '✗'}</span>
                            <span class="result-task">${r.task.id}</span>
                            <span class="result-details">
                                ${r.hookResults.filter(h => !h.passed).length > 0 
                                    ? `${r.hookResults.filter(h => !h.passed).length} Hook(s) fehlgeschlagen` 
                                    : 'Alle Hooks bestanden'}
                            </span>
                            <button class="btn btn-sm btn-secondary view-details" onclick="window.testManager?.showBatchResultDetails(${i})">
                                Details
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        resultsContent.innerHTML = summaryHtml;
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Zeigt Details eines einzelnen Batch-Ergebnisses
     */
    showBatchResultDetails(index) {
        if (index >= 0 && index < this.batchResults.length) {
            this.displayTestResult(this.batchResults[index]);
        }
    }
}

class MathTutorAI {
    constructor() {
        // Auth Service (deaktiviert im Guest-Modus)
        // GUEST-MODUS: AuthService nur erstellen wenn nicht im Guest-Modus
        this.authService = window.authService || null; // null im Guest-Modus
        this.currentUser = window.currentUser || null;
        this.userId = window.currentUser?.userId || null;
        
        // Legacy API Keys (für Backward-Compatibility)
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.apiProvider = localStorage.getItem('api_provider') || 'openai';
        this.userProfile = this.loadUserProfile();
        this.uploadedImages = [];
        this.abiTasks = [];
        this.currentAbiSource = null;
        this.solutionState = this.getDefaultSolutionState();
        this.stepCorrections = {};  // User-Korrekturen für einzelne Schritte
        this.isTestMode = false;    // Flag für Test-Modus (wird vom TestManager gesetzt)
        const origin = window.location.origin && window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:4000';
        this.backendApiBase = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || origin.replace(/\/$/, '');
        
        // TestManager für Unit Tests
        this.testManager = new TestManager(this);
        window.testManager = this.testManager; // Global für Button-Callbacks
        
        // Initialisiere mit Auth-Check
        this.initWithAuth();
    }
    
    async initWithAuth() {
        try {
            // =====================================================
            // GUEST-MODUS: Nutze window.currentUser wenn vorhanden
            // =====================================================
            if (window.currentUser && !window.authService) {
                // Guest-Modus aktiv
                this.currentUser = window.currentUser;
                this.userId = this.currentUser.userId || 'guest_user';
                if (this.userProfile) {
                    this.userProfile.email = this.currentUser.email;
                }
                console.log('[MathTutorAI] GUEST MODE - Initialized with guest user:', this.userId);
                this.init();
                return;
            }
            
            /* AUSKOMMENTIERT - Auth-basierte Initialisierung
            // Hole aktuellen User
            this.currentUser = await this.authService.getCurrentUser();
            if (this.currentUser) {
                this.userId = this.currentUser.userId;
                if (this.userProfile) {
                    this.userProfile.email = this.currentUser.email;
                }
                console.log('[MathTutorAI] Initialized with user:', this.userId);
                
                // Initialisiere Tracking-System
                await this.initializeTracking();
            } else {
                console.warn('[MathTutorAI] No authenticated user');
            }
            */
            
            // Reguläre Initialisierung
            this.init();
        } catch (error) {
            console.error('[MathTutorAI] Init error:', error);
            this.init(); // Fallback zur regulären Init
        }
    }
    
    async initializeTracking() {
        try {
            // Initialisiere DB Service
            this.dbService = new DBService();
            
            // Initialisiere Tracker
            this.competencyTracker = new CompetencyTracker(this.dbService);
            this.performanceTracker = new PerformanceTracker(this.dbService);
            this.behaviorTracker = new BehaviorTracker(this.dbService);
            
            // Initialisiere AI Services
            this.dataAggregator = new DataAggregator(
                this.competencyTracker,
                this.performanceTracker,
                this.behaviorTracker
            );
            this.promptAdvisor = new PromptAdvisor(this.dataAggregator);
            
            console.log('[MathTutorAI] Tracking system initialized');
        } catch (error) {
            console.error('[MathTutorAI] Tracking initialization error:', error);
            // Continue without tracking
        }
    }

    init() {
        this.setupEventListeners();
        this.setupTabSwitching();
        this.setupImageUpload();
        this.setupAbiAdminForm();
        this.setupAbiGenerator();
        // API-Konfiguration wird jetzt im Profil-Tab verwaltet
    }

    setupEventListeners() {
        // Text Input Analysis
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeTextInput();
        });

        // Clear Button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearTextInput();
        });

        // Image Analysis
        document.getElementById('analyze-image-btn').addEventListener('click', () => {
            this.analyzeImageInput();
        });

        // Generate Task Button
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateTask();
        });
        
        // Random Generate Button
        const randomGenBtn = document.getElementById('random-generate-btn');
        if (randomGenBtn) {
            randomGenBtn.addEventListener('click', () => {
                this.generateRandomTask();
            });
        }
        
        // Reset Selection Button
        const resetBtn = document.getElementById('reset-selection-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetTaskSelection();
            });
        }
        
        // Setup der erweiterten Task-Generierungs-UI
        this.setupTaskGenerationUI();

        // Test Buttons
        const singleTestBtn = document.getElementById('run-single-test');
        if (singleTestBtn) {
            singleTestBtn.addEventListener('click', () => {
                this.testManager.runSingleTest();
            });
        }
        
        const batchTestBtn = document.getElementById('run-batch-tests');
        if (batchTestBtn) {
            batchTestBtn.addEventListener('click', () => {
                this.testManager.runBatchTests();
            });
        }

        // API Configuration
        document.getElementById('save-api-config').addEventListener('click', () => {
            this.saveApiConfiguration();
        });

        document.getElementById('cancel-api-config').addEventListener('click', () => {
            this.closeApiModal();
        });

        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeApiModal();
        });

        // Results
        document.getElementById('close-results').addEventListener('click', () => {
            this.closeResults();
        });

        // Profile Management
        document.getElementById('save-profile').addEventListener('click', () => {
            this.saveUserProfile();
        });

        document.getElementById('reset-profile').addEventListener('click', () => {
            this.resetUserProfile();
        });

        // API Key Toggle in Profile
        document.getElementById('toggle-api-key').addEventListener('click', () => {
            this.toggleApiKeyVisibility();
        });

        // Enter key for text input
        document.getElementById('math-input').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.analyzeTextInput();
            }
        });

        // Enter key for image description
        document.getElementById('image-description').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.analyzeImageInput();
            }
        });
    }

    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
                
                // Lade Profil neu, wenn Profil-Tab geöffnet wird
                if (targetTab === 'user-profile' && this.userProfile) {
                    this.populateProfileForm(this.userProfile);
                }
            });
        });
    }

    setupImageUpload() {
        const uploadZone = document.getElementById('upload-zone');
        const imageInput = document.getElementById('image-input');
        const previewWrapper = document.getElementById('image-preview');
        const removeAllBtn = document.getElementById('remove-all-images');
        const addMoreBtn = document.getElementById('add-more-images');

        if (!uploadZone || !imageInput || !previewWrapper || !removeAllBtn) {
            console.warn('[Image Upload] Elemente nicht gefunden');
            return;
        }

        // Click to upload
        uploadZone.addEventListener('click', () => {
            imageInput.click();
        });

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.handleImageUpload(Array.from(e.dataTransfer.files));
            }
        });

        // File input change
        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(Array.from(e.target.files));
            }
        });

        // Add more images button
        if (addMoreBtn) {
            addMoreBtn.addEventListener('click', () => {
                imageInput.click();
            });
        }

        // Remove all images
        removeAllBtn.addEventListener('click', () => {
            this.clearAllImages();
        });
    }

    handleImageUpload(files) {
        const descriptionArea = document.getElementById('image-description-area');
        const imageInput = document.getElementById('image-input');
        const uploadZone = document.getElementById('upload-zone');

        const fileArray = Array.isArray(files) ? files : [files];
        const validFiles = fileArray.filter((file) => file.type.startsWith('image/'));
        
        if (validFiles.length === 0) {
            this.showNotification('Bitte wähle gültige Bilddateien aus.', 'warning');
            return;
        }

        const invalidCount = fileArray.length - validFiles.length;
        if (invalidCount > 0) {
            this.showNotification(`${invalidCount} Datei(en) wurden übersprungen, da sie keine Bilder sind.`, 'warning');
        }

        validFiles.forEach((file) => {
        const reader = new FileReader();
            reader.onload = (event) => {
                this.uploadedImages.push({
                    name: file.name,
                    type: file.type,
                    dataUrl: event.target.result
                });
                this.renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });

        if (descriptionArea) {
            descriptionArea.style.display = 'block';
        }
        if (imageInput) {
            imageInput.value = '';
        }
    }

    renderImagePreviews() {
        const previewWrapper = document.getElementById('image-preview');
        const previewList = document.getElementById('image-preview-list');
        const previewCount = document.getElementById('preview-count');
        const uploadZone = document.getElementById('upload-zone');
        const descriptionArea = document.getElementById('image-description-area');

        if (!previewWrapper || !previewList || !uploadZone || !descriptionArea) {
            return;
        }

        previewList.innerHTML = '';

        // Update preview count
        if (previewCount) {
            const count = this.uploadedImages.length;
            previewCount.textContent = count === 1 ? '1 Bild' : `${count} Bilder`;
        }

        const uploadHint = uploadZone.querySelector('.upload-hint');
        if (uploadHint) {
            uploadHint.textContent = this.uploadedImages.length > 0
                ? 'Weitere Bilder hinzufügen oder hierher ziehen'
                : 'Klicke hier oder ziehe Bilder hierher';
        }

        if (this.uploadedImages.length === 0) {
            previewWrapper.style.display = 'none';
            descriptionArea.style.display = 'none';
            uploadZone.style.display = 'block';
            return;
        }

        this.uploadedImages.forEach((image, index) => {
            const item = document.createElement('div');
            item.className = 'preview-item';

            const img = document.createElement('img');
            img.src = image.dataUrl;
            img.alt = image.name || `Bild ${index + 1}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'preview-remove-btn';
            removeBtn.type = 'button';
            removeBtn.title = 'Bild entfernen';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImageByIndex(index);
            });

            const caption = document.createElement('p');
            caption.className = 'preview-name';
            caption.textContent = image.name || `Bild ${index + 1}`;

            item.appendChild(img);
            item.appendChild(removeBtn);
            item.appendChild(caption);
            previewList.appendChild(item);
        });

        previewWrapper.style.display = 'block';
        descriptionArea.style.display = 'block';
        uploadZone.style.display = 'none'; // Verstecke Upload-Zone wenn Bilder vorhanden
    }

    removeImageByIndex(index) {
        if (index < 0 || index >= this.uploadedImages.length) {
            return;
        }
        this.uploadedImages.splice(index, 1);
        this.renderImagePreviews();
    }

    clearAllImages() {
        this.uploadedImages = [];
        this.renderImagePreviews();
        const imageInput = document.getElementById('image-input');
        const descriptionInput = document.getElementById('image-description');
        if (imageInput) {
        imageInput.value = '';
        }
        if (descriptionInput) {
        descriptionInput.value = '';
        }
    }

    getDefaultSolutionState() {
        return {
            lastUserSolution: '',
            lastCanvasImages: [],
            lastCheckResponse: '',
            lastAnalysis: null,
            lastWasCorrect: null,
            attemptCount: 0,
            previousAnalyses: [],  // Alle vorherigen Analysen für Kontext
            hilfestellungEligible: false,
            hilfestellungProvided: false,
            correctedProvided: false,
            canRequestOptimal: false,
            optimalDelivered: false,
            hilfestellungContent: '',
            correctedContent: '',
            optimalContent: '',
            hintState: {
                prepared: { level1: [], level2: [] },
                unlockedLevel: 0,
                popupOpen: false
            }
        };
    }

    resetSolutionStateForNewTask() {
        this.solutionState = this.getDefaultSolutionState();
        this.stepCorrections = {};  // Reset step corrections
        this.updateSolutionActionButtons();
    }

    getSolutionActionNote() {
        const unlockedLevel = this.solutionState.hintState?.unlockedLevel || 0;
        if (!this.solutionState.lastUserSolution) {
            return 'Reiche eine Lösung ein, um Hinweise zu erhalten.';
        }
        if (this.solutionState.lastWasCorrect === true) {
            return 'Deine Lösung ist korrekt! Optional kannst du dir einen optimalen Lösungsweg anzeigen lassen.';
        }
        if (this.solutionState.lastWasCorrect === false) {
            if (unlockedLevel === 0) {
                return 'Hints verfügbar: Öffne Stufe 1, um Schlagwörter zu sehen.';
            }
            if (unlockedLevel === 1) {
                return 'Stufe 2 bereit: Zeige nun die schrittbezogenen Hinweise an.';
            }
            return 'Hints aktiv. Nutze sie, um deine Schritte zu verbessern.';
        }
        return 'Reiche erneut eine Lösung ein, damit wir gezielt helfen können.';
    }

    updateSolutionActionButtons() {
        const hintBtn = document.getElementById('request-hint');
        const optimalBtn = document.getElementById('request-optimal');
        const noteElement = document.getElementById('solution-action-note');

        if (hintBtn) {
            const unlockedLevel = this.solutionState.hintState?.unlockedLevel || 0;
            const hasAnalysis = !!this.solutionState.lastAnalysis;
            const canShow = hasAnalysis && this.solutionState.lastWasCorrect === false;
            hintBtn.disabled = !canShow;

            let label = 'Hints anzeigen';
            let icon = 'fa-lightbulb';
            if (unlockedLevel === 0) {
                label = 'Hint Stufe 1';
                icon = 'fa-lightbulb';
            } else if (unlockedLevel === 1) {
                label = 'Hint Stufe 2';
                icon = 'fa-lightbulb';
            } else if (unlockedLevel === 2) {
                label = 'Lösung anzeigen';
                icon = 'fa-eye';
            } else {
                label = 'Lösung ansehen';
                icon = 'fa-check-circle';
                hintBtn.disabled = false; // Immer verfügbar um Popup erneut zu öffnen
            }
            hintBtn.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
        }

        if (optimalBtn) {
            const canOptimal = this.solutionState.canRequestOptimal && !this.solutionState.optimalDelivered;
            optimalBtn.disabled = !canOptimal;
        }

        if (noteElement) {
            noteElement.textContent = this.getSolutionActionNote();
        }
    }

    setupAbiAdminForm() {
        const form = document.getElementById('abi-upload-form');
        const fileInput = document.getElementById('abi-pdf-input');
        if (!form || !fileInput) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleAbiUploadSubmit();
        });

        this.loadAbiTaskList();
    }

    async handleAbiUploadSubmit() {
        const fileInput = document.getElementById('abi-pdf-input');
        const titleInput = document.getElementById('abi-title-input');
        const yearInput = document.getElementById('abi-year-input');
        const subjectInput = document.getElementById('abi-subject-input');
        const tagsInput = document.getElementById('abi-tags-input');

        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            this.showNotification('Bitte wähle eine PDF-Datei aus.', 'warning');
            return;
        }

        const pdfFile = fileInput.files[0];
        if (pdfFile.type !== 'application/pdf') {
            this.showNotification('Nur PDF-Dateien sind erlaubt.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('pdf', pdfFile);
        if (titleInput && titleInput.value.trim()) {
            formData.append('title', titleInput.value.trim());
        }
        if (yearInput && yearInput.value) {
            formData.append('year', yearInput.value);
        }
        if (subjectInput && subjectInput.value.trim()) {
            formData.append('subject', subjectInput.value.trim());
        }
        if (tagsInput && tagsInput.value.trim()) {
            formData.append('tags', tagsInput.value.trim());
        }

        this.showAbiUploadStatus('Aufgabe wird hochgeladen...', 'info');

        try {
            const response = await fetch(this.getBackendUrl('/api/abi-tasks'), {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMessage = `Upload fehlgeschlagen (${response.status})`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch {
                    // ignore JSON parse errors
                }
                throw new Error(errorMessage);
            }

            await response.json();
            this.showNotification('Abitur-Aufgabe erfolgreich gespeichert!', 'success');
            this.showAbiUploadStatus('Aufgabe wurde gespeichert.', 'success');

            const form = document.getElementById('abi-upload-form');
            if (form) {
                form.reset();
            }
            fileInput.value = '';

            await this.loadAbiTaskList(true);
        } catch (error) {
            console.error('[ABI Upload] Fehler beim Hochladen:', error);
            this.showAbiUploadStatus(error.message || 'Upload fehlgeschlagen.', 'error');
            this.showNotification(error.message || 'Upload fehlgeschlagen.', 'error');
        }
    }

    showAbiUploadStatus(message, type = 'info') {
        const statusElement = document.getElementById('abi-upload-status');
        if (!statusElement) {
            return;
        }
        statusElement.textContent = message;
        if (type === 'success') {
            statusElement.style.color = 'var(--success-color)';
        } else if (type === 'error') {
            statusElement.style.color = 'var(--error-color)';
        } else {
            statusElement.style.color = 'var(--text-secondary)';
        }
    }

    setupAbiGenerator() {
        const generateBtn = document.getElementById('abi-generate-btn');
        if (!generateBtn) {
            return;
        }

        generateBtn.addEventListener('click', () => {
            this.generateAbiTask();
        });
    }

    async generateAbiTask() {
        if (!this.apiKey) {
            this.showNotification('Bitte konfiguriere zuerst deinen API-Schlüssel im Profil-Tab.', 'warning');
            document.querySelector('[data-tab="user-profile"]').click();
            return;
        }

        const statusElement = document.getElementById('abi-generator-status');
        if (statusElement) {
            statusElement.textContent = 'Hole zufällige Abitur-Aufgabe...';
            statusElement.style.color = 'var(--text-secondary)';
        }

        this.showLoading(true);

        try {
            const response = await fetch(this.getBackendUrl('/api/abi-tasks/random?includePdfText=true'));
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Es sind noch keine Abitur-Aufgaben im Pool.');
                }
                throw new Error(`Fehler beim Laden der Abitur-Aufgabe (${response.status}).`);
            }

            const abiTask = await response.json();
            this.currentAbiSource = abiTask;

            if (statusElement) {
                statusElement.textContent = 'Generiere neue Variante...';
                statusElement.style.color = 'var(--text-secondary)';
            }

            const prompt = this.buildAbiPrompt(abiTask);
            const result = await this.callAIAPI(prompt, 'abi-generate', null, 'abitur');

            this.displayResults(result, true);
            this.currentTaskContext = {
                topic: 'abitur',
                difficulty: 'abitur',
                taskType: 'exam',
                origin: 'abi',
                hintRewriteDone: false,
                hintsRequested: 0
            };

            if (statusElement) {
                statusElement.textContent = 'Neue Abitur-Aufgabe wurde erstellt.';
                statusElement.style.color = 'var(--success-color)';
            }
        } catch (error) {
            console.error('[ABI Generator] Fehler:', error);
            if (statusElement) {
                statusElement.textContent = error.message || 'Fehler bei der Generierung.';
                statusElement.style.color = 'var(--error-color)';
            }
            this.showNotification(error.message || 'Fehler bei der Generierung.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    buildAbiPrompt(task) {
        // Programmatische Variation aus task-variations.js
        const variation = typeof window.generateTaskVariation === 'function' 
            ? window.generateTaskVariation() 
            : { instructions: this.getAbiVariationInstruction() };
        
        const extractedText = task.pdfText
            ? this.truncateText(task.pdfText.trim(), 7000)
            : 'Keine Textextraktion verfügbar.';

        // ULTRA-KOMPAKTER PROMPT - Variationen werden programmatisch generiert
        return `Variiere diese Abitur-Aufgabe:
ORIGINAL: ${extractedText}
ÄNDERUNGEN: ${variation.instructions}
Bewahre mathematische Struktur. Gib NUR die neue Aufgabe aus, keine Lösung.`;
    }

    buildEvaluationPrompt({ userSolution, drawingInfo, hasDrawings }) {
        return `
Aufgabe:
${this.currentTask}

Lösung des Schülers:
${userSolution || '(Keine schriftliche Lösung, nur Zeichnung)'}
${drawingInfo}

ANWEISUNGEN:
1. Prüfe ausschließlich, ob der Lösungsweg in allen Schritten fachlich korrekt und vollständig ist.
2. Gib KEINE Erklärungen, Korrekturen, Tipps oder Zusatztexte aus.
3. Wenn der Lösungsweg vollständig korrekt ist, antworte exakt mit zwei Zeilen:
   GELÖST
   __SOLUTION_STATUS:OK__
4. Wenn der Lösungsweg nicht vollständig korrekt ist oder du unsicher bist, antworte ausschließlich mit:
   NICHT GELÖST
5. Verwende keine weiteren Wörter, Satzzeichen, Emojis oder Formatierungen.
`;
    }

    /**
     * Erzeugt Hints basierend auf der Analyse (delegiert an globale Funktion aus feedback-templates.js)
     * @param {Array} steps - Die analysierten Schritte
     * @returns {Object} - { level1: [], level2: [] }
     */
    generateFallbackHints(steps) {
        // Nutze die umfangreiche Template-basierte Hint-Generierung
        if (typeof window.generateHintsFromAnalysis === 'function') {
            return window.generateHintsFromAnalysis({ steps });
        }
        // Minimaler Fallback wenn Templates nicht geladen
        return { level1: [], level2: [] };
    }

    /**
     * Baut den Prompt für die strukturierte Fehleranalyse
     * @param {Object} params - Parameter
     * @returns {Object} - { systemPrompt, userPrompt }
     */
    buildErrorAnalysisPrompt({ userSolution, drawingInfo, hasDrawings, attemptNumber = 1, previousAnalysis = null, studentContext = null }) {
        // Dynamische Kontextdaten
        const taskType = this.currentTaskContext?.topic || 'Mathematik';
        const taskSubType = this.currentTaskContext?.subTopic || '';
        const difficulty = this.currentTaskContext?.difficulty || 'mittel';
        
        // Stärken und Schwächen aus studentContext
        let strengthsText = '';
        let weaknessesText = '';
        
        if (studentContext) {
            if (studentContext.strongAreas && studentContext.strongAreas.topics && studentContext.strongAreas.topics.length > 0) {
                strengthsText = studentContext.strongAreas.topics
                    .map(t => `${t.topic} (Level ${t.level}/5)`)
                    .join(', ');
            }
            if (studentContext.weakAreas && studentContext.weakAreas.topics && studentContext.weakAreas.topics.length > 0) {
                weaknessesText = studentContext.weakAreas.topics
                    .map(t => `${t.topic} (Level ${t.level}/5)`)
                    .join(', ');
            }
        }

        // Kontext für zweiten Versuch
        let previousFeedbackSection = '';
        if (attemptNumber > 1 && previousAnalysis) {
            previousFeedbackSection = `
=== VORHERIGER LÖSUNGSVERSUCH ===
Dies ist der ${attemptNumber}. Lösungsversuch des Schülers.
Vorherige Analyse (JSON):
${JSON.stringify(previousAnalysis, null, 2)}

Beachte:
- Der Schüler hat versucht, seine Fehler zu korrigieren
- Prüfe ob die vorherigen Fehler behoben wurden
- Identifiziere neue oder fortbestehende Fehler
`;
        }

        // Schülerkontext-Sektion
        let studentContextSection = '';
        if (strengthsText || weaknessesText) {
            studentContextSection = `
=== SCHÜLERKONTEXT ===
${strengthsText ? `Stärken: ${strengthsText}` : ''}
${weaknessesText ? `Schwächen/Lernbedarf: ${weaknessesText}` : ''}
Aufgabentyp: ${taskType}${taskSubType ? ` > ${taskSubType}` : ''}
Schwierigkeit: ${difficulty}
`;
        }

        // ULTRA-KOMPAKTER PROMPT - Hints + Feedback werden programmatisch generiert
        const systemPrompt = `Mathe-Fehleranalyse. Gib JSON zurück.

KERNREGEL: Schülertext 1:1 in LaTeX (Fehler beibehalten, NICHT korrigieren!)

AUFGABEN:
1. Schritte zerlegen (je Schritt eine Umformung)
2. operation pro Schritt (außer letztem): z.B. ":2", "+3", "zgf."
3. errorType: logic (P1) > calc (P2) > followup (P3) > formal > none

OUTPUT: {"steps":[{"index":1,"rawText":"...","latex":"...","errorType":"...","operation":"..."}],"isCorrect":true/false,"feedback":{"summarySentence":"1-2 Sätze"}}
Nur reiner LaTeX (keine Delimiter).
${studentContextSection}${previousFeedbackSection}`;

        const userPrompt = `Aufgabe:
${this.currentTask}

Lösung des Schülers (Lösungsversuch ${attemptNumber}):
${userSolution || '(Keine schriftliche Lösung, nur Zeichnung)'}
${drawingInfo}

Analysiere den Lösungsweg und gib das Ergebnis als JSON im vorgegebenen Schema zurück.
Achte darauf, bei jedem Schritt (außer dem letzten) das "operation"-Feld anzugeben.`;

        return { systemPrompt, userPrompt };
    }

    /**
     * Spezialisierter API-Aufruf für die Fehleranalyse mit Structured Outputs
     * @param {Object} prompts - { systemPrompt, userPrompt }
     * @returns {Promise<Object>} - Geparstes TutorResponse JSON
     */
    async callErrorAnalysisAPI(prompts) {
        const { systemPrompt, userPrompt } = prompts;
        
        let model;
        if (this.apiProvider === 'openai') {
            model = 'gpt-5.2'; // Besseres Modell für komplexe Fehleranalyse
        } else {
            model = 'claude-3-5-sonnet-20241022';
        }

        const userMessage = {
            role: 'user',
            content: userPrompt
        };

        let requestBody;
        let apiUrl;
        let headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiProvider === 'openai') {
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            
            // Minimale Schema-Referenz - Hints werden programmatisch generiert
            const schemaInstructions = ``;
            
            requestBody = {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt + schemaInstructions
                    },
                    userMessage
                ],
                max_completion_tokens: 4000,
                temperature: 0.3,
                response_format: {
                    type: 'json_object'
                }
            };
        } else {
            // Anthropic - Tool Use für strukturierte Ausgabe
            apiUrl = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = this.apiKey;
            headers['anthropic-version'] = '2023-06-01';
            
            const toolDefinition = {
                name: 'submit_error_analysis',
                description: 'Strukturierte Fehleranalyse des Schüler-Lösungswegs',
                input_schema: ERROR_ANALYSIS_SCHEMA.schema
            };
            
            requestBody = {
                model: model,
                system: systemPrompt,
                messages: [userMessage],
                max_tokens: 4000,
                temperature: 0.3,
                tools: [toolDefinition],
                tool_choice: { type: 'tool', name: 'submit_error_analysis' }
            };
        }

        console.log('[ErrorAnalysis] Sending API request:', { provider: this.apiProvider, model });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorData = await response.json();
                console.error('[ErrorAnalysis] API Error Details:', errorData);
                errorDetails = errorData.error?.message || JSON.stringify(errorData);
            } catch (e) {
                errorDetails = response.statusText;
            }
            throw new Error(`API-Fehler (${response.status}): ${errorDetails}`);
        }

        const data = await response.json();
        console.log('[ErrorAnalysis] API Response:', data);

        // Parse die strukturierte Antwort
        let parsedResponse;
        
        if (this.apiProvider === 'openai') {
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('[ErrorAnalysis] Invalid response structure:', data);
                throw new Error('Ungültige API-Antwort: ' + JSON.stringify(data));
            }
            
            const message = data.choices[0].message;
            const content = message.content;
            
            console.log('[ErrorAnalysis] Content:', content);
            
            if (data.choices[0].finish_reason === 'length') {
                console.warn('[ErrorAnalysis] Response was truncated');
                throw new Error('Die Analyse wurde abgeschnitten. Bitte versuche es erneut.');
            }
            
            if (!content || content === '' || content === 'null') {
                console.error('[ErrorAnalysis] Empty content received');
                throw new Error('Leere Antwort von der KI erhalten. Bitte versuche es erneut.');
            }
            
            try {
                parsedResponse = JSON.parse(content);
            } catch (parseError) {
                console.error('[ErrorAnalysis] JSON Parse Error:', parseError);
                throw new Error('Fehler beim Parsen der Fehleranalyse: ' + parseError.message);
            }
        } else {
            // Anthropic Tool Use Response
            if (!data.content) {
                throw new Error('Ungültige API-Antwort: ' + JSON.stringify(data));
            }
            
            const toolUseBlock = data.content.find(block => block.type === 'tool_use');
            if (!toolUseBlock || !toolUseBlock.input) {
                const textBlock = data.content.find(block => block.type === 'text');
                if (textBlock) {
                    try {
                        parsedResponse = JSON.parse(textBlock.text);
                    } catch (e) {
                        throw new Error('Keine strukturierte Antwort erhalten');
                    }
                } else {
                    throw new Error('Keine gültige Antwort erhalten');
                }
            } else {
                parsedResponse = toolUseBlock.input;
            }
        }

        // Sanitiere jeden Step
        if (parsedResponse.steps && Array.isArray(parsedResponse.steps)) {
            parsedResponse.steps = parsedResponse.steps.map(step => sanitizeStepLatex(step));
        }

        // Stelle sicher, dass Hints vorhanden und sanitisiert sind
        if (!parsedResponse.hints || typeof parsedResponse.hints !== 'object') {
            parsedResponse.hints = { level1: [], level2: [] };
        }
        parsedResponse.hints.level1 = Array.isArray(parsedResponse.hints.level1) ? parsedResponse.hints.level1 : [];
        parsedResponse.hints.level2 = Array.isArray(parsedResponse.hints.level2) ? parsedResponse.hints.level2 : [];
        parsedResponse.hints.level2 = parsedResponse.hints.level2.map(h => ({
            ...h,
            latex: h?.latex ? sanitizeLatex(h.latex) : ''
        }));

        // Fallback-Hints generieren, falls keine geliefert wurden (z.B. Testmodus)
        const hasNoHints = (!parsedResponse.hints.level1 || parsedResponse.hints.level1.length === 0)
            && (!parsedResponse.hints.level2 || parsedResponse.hints.level2.length === 0);
        if (hasNoHints && parsedResponse.steps && parsedResponse.steps.length > 0) {
            parsedResponse.hints = this.generateFallbackHints(parsedResponse.steps);
        }

        // Mathematische Validierung der Fehlermarkierungen
        // Entfernt falsche Fehlermarkierungen wenn der Schritt mathematisch korrekt ist
        if (typeof validateErrorMarkings === 'function') {
            parsedResponse = validateErrorMarkings(parsedResponse);
            console.log('[ErrorAnalysis] Validation applied, corrections made:', parsedResponse._correctionsMade || 0);
        }

        // Validiere mit TutorModel falls verfügbar
        if (window.TutorModel) {
            const sanitized = window.TutorModel.createTutorResponse(parsedResponse);
            if (sanitized) {
                // TutorModel kennt aktuell keine Hint-Struktur – merge deshalb zurück
                return {
                    ...sanitized,
                    hints: parsedResponse.hints || { level1: [], level2: [] }
                };
            }
        }

        return parsedResponse;
    }

    /**
     * Holt den Schülerkontext für den Prompts
     */
    async getStudentContextForPrompt() {
        if (!this.userId || !this.dataAggregator) {
            return null;
        }
        
        try {
            const topic = this.currentTaskContext?.topic || null;
            const userContext = await this.dataAggregator.getUserContext(this.userId, topic);
            return userContext;
        } catch (error) {
            console.warn('[MathTutorAI] Could not get student context:', error);
            return null;
        }
    }

    /**
     * Baut den Prompt für eine Folge-Analyse nach User-Korrekturen
     * GEKÜRZT: Hints werden programmatisch generiert
     * @param {Object} params - Parameter
     * @returns {Object} - { systemPrompt, userPrompt }
     */
    buildFollowUpAnalysisPrompt({ originalSteps, userCorrections, previousAnalyses, attemptNumber, studentContext, previousHints }) {
        // Formatiere den ursprünglichen Lösungsweg
        let originalSolutionText = 'ORIGINAL:\n';
        originalSteps.forEach(step => {
            const errorLabel = step.errorType && step.errorType !== 'none' ? ` [${step.errorType}]` : '';
            originalSolutionText += `${step.index}${errorLabel}: ${step.rawText || step.latex}\n`;
        });
        
        // Formatiere die User-Korrekturen
        let correctionsText = '\nKORREKTUREN:\n';
        const correctionEntries = Object.entries(userCorrections);
        if (correctionEntries.length > 0) {
            correctionEntries.forEach(([stepIndex, correction]) => {
                correctionsText += `Schritt ${stepIndex} NEU: ${correction}\n`;
            });
        }

        // ULTRA-KOMPAKTER PROMPT - Hints werden programmatisch generiert
        const systemPrompt = `Folge-Analyse (Versuch ${attemptNumber}). Schüler hat Korrekturen eingereicht.

KERNREGEL: Schülertext 1:1 in LaTeX (Fehler beibehalten, NICHT korrigieren!)

FOLGEFEHLER: Wenn korrigierter Schritt jetzt korrekt → Folgefehler werden "none" (wenn nur durch alten Fehler falsch).

OUTPUT: {"steps":[{"index":1,"rawText":"...","latex":"...","errorType":"...","operation":"..."}],"isCorrect":true/false,"feedback":{"summarySentence":"1-2 Sätze, ob Korrektur erfolgreich"}}
Nur reiner LaTeX (keine Delimiter).`;

        const userPrompt = `Aufgabe: ${this.currentTask}
${originalSolutionText}${correctionsText}
Analysiere den neuen Lösungsweg.`;

        return { systemPrompt, userPrompt };
    }

    /**
     * @deprecated - Hilfestellung wird jetzt programmatisch generiert, siehe generateHilfestellung()
     * Diese Funktion bleibt aus Kompatibilitätsgründen erhalten, wird aber nicht mehr verwendet.
     */
    buildHilfestellungPrompt() {
        console.warn('buildHilfestellungPrompt ist deprecated - nutze generateHilfestellung() stattdessen');
        return '';
    }

    buildCorrectedSolutionPrompt() {
        const evaluation = this.solutionState.lastCheckResponse || 'Es liegt noch kein detailliertes Feedback vor.';
        const userSolution = this.solutionState.lastUserSolution || '(Keine schriftliche Lösung eingereicht.)';
        return `
Aufgabe:
${this.currentTask}

Bisheriges Feedback der Bewertung:
${evaluation}

Aktueller Lösungsversuch des Schülers:
${userSolution}

ANWEISUNGEN:
1. Verwende ausschließlich den vom Schüler eingeschlagenen Lösungsweg (gleiche Reihenfolge, gleiche Methoden). Füge keine alternativen Verfahren hinzu.
2. Wenn der Lösungsweg aktuell NICHT vollständig korrekt ist oder du dir unsicher bist:
   - Teile knapp mit, dass Fehler vorhanden sind und der Schüler die Hilfestellung oder eigene Überarbeitung nutzen soll.
   - Gib KEINE korrigierte Lösung aus.
   - Setze KEINEN Status-Token.
3. Wenn der Lösungsweg vollständig korrigierbar ist:
   - Erstelle eine korrigierte Fassung in der selben Struktur und Methode.
   - Kennzeichne jede Änderung mit <span class="correction-highlight">[KORREKTUR] … </span> und erläutere unmittelbar danach kurz, was geändert wurde.
   - Belasse alle korrekten Teile unverändert.
   - Beende die Antwort mit einer eigenen Zeile \`__CORRECTION_STATUS:OK__\`.
4. Verwende überall korrekte LaTeX-Notation.
`;
    }

    buildOptimalSolutionPrompt() {
        const hasCorrectUserSolution = this.solutionState.lastWasCorrect === true && this.solutionState.lastUserSolution;
        const referenceSolution = this.solutionState.correctedContent
            || this.solutionState.lastUserSolution
            || '(Keine schriftliche Lösung eingereicht.)';
        const context = hasCorrectUserSolution
            ? 'Der Schüler hat die Aufgabe schließlich korrekt gelöst. Zeige einen effizienteren oder didaktisch klareren Ansatz.'
            : 'Der Schüler konnte die Aufgabe nicht selbst vollständig lösen. Nutze die korrigierte Fassung als Ausgangspunkt und zeige einen effizienteren Ansatz.';

        return `
Aufgabe:
${this.currentTask}

Kontext:
${context}

Referenzlösung:
${referenceSolution}

ANWEISUNGEN:
1. Stelle einen besonders übersichtlichen und effizienten Lösungsweg Schritt für Schritt dar.
2. Hebe besonders elegante oder zeitsparende Schritte mit <span class="optimal-highlight">[OPTIMIERUNG] … </span> hervor.
3. Begründe direkt nach jeder Markierung, warum dieser Ansatz gegenüber der Referenzlösung Vorteile bietet.
4. Schließe mit 2–3 Stichpunkten, was der Schüler aus dem optimierten Ansatz lernen sollte.
5. Verwende LaTeX für alle mathematischen Ausdrücke.
Wenn farbige Darstellung nicht möglich ist, behalte die Textlabels in eckigen Klammern bei.
`;
    }

    getAbiVariationInstruction() {
        // Fallback wenn task-variations.js nicht geladen
        if (typeof window.TASK_VARIATIONS !== 'undefined' && window.TASK_VARIATIONS.strategies) {
            return window.pickRandom(window.TASK_VARIATIONS.strategies);
        }
        // Minimaler Fallback
        return 'Ändere Kontext und Zahlen leicht.';
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return `${text.slice(0, maxLength)}\n[Text gekürzt]`;
    }

    getLearningStyleInstruction(style) {
        switch (style) {
            case 'visual':
                return 'Nutze bildhafte Sprache, verweise auf Skizzen oder Diagramme und strukturiere die Informationen so, dass visuelle Lernende leicht folgen können.';
            case 'conceptual':
                return 'Betone die zugrunde liegenden Konzepte, erläutere Zusammenhänge und fokussiere auf das Warum hinter den mathematischen Schritten.';
            case 'practical':
                return 'Stelle einen alltagsnahen oder praxisbezogenen Kontext her und zeige, welche reale Bedeutung die Aufgabe hat.';
            case 'step-by-step':
            default:
                return 'Teile die Aufgabenstellung in klar erkennbare Abschnitte und verwende eindeutige Formulierungen, die eine schrittweise Bearbeitung nahelegen.';
        }
    }

    async loadAbiTaskList(showNotificationOnEmpty = false) {
        const listElement = document.getElementById('abi-task-list');
        if (!listElement) {
            return;
        }

        listElement.innerHTML = '<li>Lade Aufgaben...</li>';

        try {
            const response = await fetch(this.getBackendUrl('/api/abi-tasks'));
            if (!response.ok) {
                throw new Error(`Konnte Aufgaben nicht laden (${response.status})`);
            }

            const tasks = await response.json();
            this.abiTasks = Array.isArray(tasks) ? tasks : [];
            this.renderAbiTaskList();

            if (showNotificationOnEmpty && this.abiTasks.length === 0) {
                this.showNotification('Aktuell sind keine Abitur-Aufgaben im Pool.', 'info');
            }
        } catch (error) {
            console.error('[ABI Upload] Fehler beim Laden der Aufgaben:', error);
            listElement.innerHTML = '<li>Fehler beim Laden der Aufgaben.</li>';
            this.showNotification(error.message || 'Fehler beim Laden der Aufgaben.', 'error');
        }
    }

    renderAbiTaskList() {
        const listElement = document.getElementById('abi-task-list');
        if (!listElement) {
            return;
        }

        listElement.innerHTML = '';

        if (!this.abiTasks || this.abiTasks.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = 'Noch keine Abitur-Aufgaben vorhanden.';
            listElement.appendChild(emptyItem);
            return;
        }

        this.abiTasks.forEach((task) => {
            const item = document.createElement('li');

            const title = document.createElement('div');
            title.textContent = task.title || task.original_filename || 'Ohne Titel';
            title.style.fontWeight = '600';
            title.style.color = 'var(--text-primary)';

            const meta = document.createElement('div');
            meta.style.fontSize = 'var(--font-size-sm)';
            meta.style.color = 'var(--text-secondary)';
            const metaParts = [];
            if (task.year) metaParts.push(`Jahr ${task.year}`);
            if (task.subject) metaParts.push(task.subject);
            if (task.tags && task.tags.length > 0) metaParts.push(`#${task.tags.join(' #')}`);
            meta.textContent = metaParts.join(' • ');

            const link = document.createElement('a');
            link.href = task.pdfUrl || '#';
            link.textContent = 'PDF öffnen';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'task-link';

            item.appendChild(title);
            if (metaParts.length > 0) {
                item.appendChild(meta);
            }
            if (task.pdfUrl) {
                item.appendChild(link);
            }

            listElement.appendChild(item);
        });
    }

    checkApiConfiguration() {
        if (!this.apiKey) {
            this.showApiModal();
        }
    }

    showApiModal() {
        document.getElementById('api-config-modal').style.display = 'flex';
    }

    closeApiModal() {
        document.getElementById('api-config-modal').style.display = 'none';
    }

    saveApiConfiguration() {
        const apiKey = document.getElementById('api-key').value.trim();
        const provider = document.getElementById('api-provider').value;

        if (!apiKey) {
            alert('Bitte gib einen gültigen API-Schlüssel ein.');
            return;
        }

        this.apiKey = apiKey;
        this.apiProvider = provider;
        
        localStorage.setItem('openai_api_key', apiKey);
        localStorage.setItem('api_provider', provider);

        this.closeApiModal();
        this.showNotification('API-Konfiguration gespeichert!', 'success');
    }

    async analyzeTextInput() {
        const textInput = document.getElementById('math-input').value.trim();
        
        if (!textInput) {
            this.showNotification('Bitte gib eine Mathematik-Aufgabe oder -Frage ein.', 'warning');
            return;
        }

        if (!this.apiKey) {
            this.showNotification('Bitte konfiguriere zuerst deinen API-Schlüssel im Profil-Tab.', 'warning');
            // Wechsle automatisch zum Profil-Tab
            document.querySelector('[data-tab="user-profile"]').click();
            return;
        }

        this.showLoading(true);
        
        try {
            const response = await this.callAIAPI(textInput, 'analyze');
            this.displayResults(response);
        } catch (error) {
            console.error('Fehler bei der KI-Analyse:', error);
            this.showNotification('Fehler bei der KI-Analyse. Bitte versuche es erneut.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async analyzeImageInput() {
        const descriptionInput = document.getElementById('image-description').value.trim();
        
        if (!this.uploadedImages || this.uploadedImages.length === 0) {
            this.showNotification('Bitte lade zuerst ein Bild hoch.', 'warning');
            return;
        }

        if (!this.apiKey) {
            this.showNotification('Bitte konfiguriere zuerst deinen API-Schlüssel im Profil-Tab.', 'warning');
            // Wechsle automatisch zum Profil-Tab
            document.querySelector('[data-tab="user-profile"]').click();
            return;
        }

        this.showLoading(true);
        
        try {
            const prompt = descriptionInput || 'Analysiere bitte diese Mathematik-Aufgabe und erkläre sie Schritt für Schritt.';
            const response = await this.callAIAPI(prompt, 'analyze', this.uploadedImages);
            this.displayResults(response);
            
            // Lösche das Bild und die Beschreibung nach erfolgreicher Analyse
            this.clearAllImages();
        } catch (error) {
            console.error('Fehler bei der KI-Analyse:', error);
            this.showNotification('Fehler bei der KI-Analyse. Bitte versuche es erneut.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== TASK GENERATION UI ====================
    
    /**
     * Initialisiert die erweiterte Aufgabengenerierungs-UI
     */
    setupTaskGenerationUI() {
        // Speichere die aktuelle Auswahl
        this.taskGenerationState = {
            topic: null,
            subtopic: null,
            taskType: null,
            difficulty: null,
            specialWishes: ''
        };
        
        // Befülle das Themen-Dropdown aus topic-data.js
        this.populateTopicDropdown();
        
        // Topic-Select Event
        const topicSelect = document.getElementById('topic-select');
        if (topicSelect) {
            topicSelect.addEventListener('change', (e) => {
                this.onTopicChange(e.target.value);
            });
        }
        
        // Subtopic-Select Event
        const subtopicSelect = document.getElementById('subtopic-select');
        if (subtopicSelect) {
            subtopicSelect.addEventListener('change', (e) => {
                this.taskGenerationState.subtopic = e.target.value || null;
                this.updateSelectionPreview();
            });
        }
        
        // Special Wishes Input
        const wishesInput = document.getElementById('special-wishes-input');
        if (wishesInput) {
            wishesInput.addEventListener('input', (e) => {
                this.taskGenerationState.specialWishes = e.target.value;
            });
        }
        
        // Task Type Buttons
        const typeButtons = document.querySelectorAll('.type-btn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Toggle Auswahl
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    this.taskGenerationState.taskType = null;
                } else {
                    typeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.taskGenerationState.taskType = btn.dataset.type;
                }
                this.updateSelectionPreview();
            });
        });
        
        // Difficulty Buttons
        const diffButtons = document.querySelectorAll('.difficulty-btn');
        diffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Toggle Auswahl
                if (btn.classList.contains('active')) {
                    btn.classList.remove('active');
                    this.taskGenerationState.difficulty = null;
                } else {
                    diffButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.taskGenerationState.difficulty = btn.dataset.difficulty;
                }
                this.updateSelectionPreview();
            });
        });
        
        // Initiale Preview
        this.updateSelectionPreview();
    }
    
    /**
     * Befüllt das Themen-Dropdown aus topic-data.js
     */
    populateTopicDropdown() {
        const topicSelect = document.getElementById('topic-select');
        if (!topicSelect || typeof window.MATH_TOPICS === 'undefined') return;
        
        // Behalte die erste "Auswahl"-Option
        const firstOption = topicSelect.querySelector('option');
        topicSelect.innerHTML = '';
        topicSelect.appendChild(firstOption);
        
        // Füge alle Themen hinzu
        Object.entries(window.MATH_TOPICS).forEach(([id, topic]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = topic.name;
            topicSelect.appendChild(option);
        });
    }
    
    /**
     * Handler für Themenänderung - zeigt Unterthemen an
     */
    onTopicChange(topicId) {
        this.taskGenerationState.topic = topicId || null;
        this.taskGenerationState.subtopic = null;
        
        const subtopicWrapper = document.getElementById('subtopic-wrapper');
        const subtopicSelect = document.getElementById('subtopic-select');
        
        if (!subtopicWrapper || !subtopicSelect) return;
        
        if (!topicId || typeof window.MATH_TOPICS === 'undefined') {
            // Verstecke Unterthemen
            subtopicWrapper.classList.remove('visible');
            return;
        }
        
        const topic = window.MATH_TOPICS[topicId];
        if (!topic || !topic.subtopics) {
            subtopicWrapper.classList.remove('visible');
            return;
        }
        
        // Befülle Unterthemen
        subtopicSelect.innerHTML = '<option value="">-- Optional: Unterthema wählen --</option>';
        Object.entries(topic.subtopics).forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            subtopicSelect.appendChild(option);
        });
        
        // Zeige Unterthemen mit Animation
        subtopicWrapper.classList.add('visible');
        this.updateSelectionPreview();
    }
    
    /**
     * Aktualisiert die Auswahl-Vorschau mit Chips
     */
    updateSelectionPreview() {
        const chipsContainer = document.getElementById('selection-chips');
        if (!chipsContainer) return;
        
        chipsContainer.innerHTML = '';
        const state = this.taskGenerationState;
        let hasSelection = false;
        
        // Thema Chip
        if (state.topic && window.MATH_TOPICS) {
            const topic = window.MATH_TOPICS[state.topic];
            if (topic) {
                const chip = this.createChip(topic.name, 'topic', topic.icon);
                chipsContainer.appendChild(chip);
                hasSelection = true;
                
                // Unterthema Chip
                if (state.subtopic && topic.subtopics[state.subtopic]) {
                    const subChip = this.createChip(topic.subtopics[state.subtopic], 'subtopic', 'fa-layer-group');
                    chipsContainer.appendChild(subChip);
                }
            }
        }
        
        // Aufgabentyp Chip
        if (state.taskType && window.TASK_TYPES) {
            const type = window.TASK_TYPES[state.taskType];
            if (type) {
                const chip = this.createChip(type.name, 'type', type.icon);
                chipsContainer.appendChild(chip);
                hasSelection = true;
            }
        }
        
        // Schwierigkeit Chip
        if (state.difficulty && window.DIFFICULTY_LEVELS) {
            const diff = window.DIFFICULTY_LEVELS[state.difficulty];
            if (diff) {
                const chip = this.createChip(diff.name, 'difficulty', diff.icon);
                chip.style.borderColor = diff.color;
                chipsContainer.appendChild(chip);
                hasSelection = true;
            }
        }
        
        // Placeholder wenn keine Auswahl
        if (!hasSelection) {
            const placeholder = document.createElement('span');
            placeholder.className = 'chip placeholder';
            placeholder.innerHTML = '<i class="fas fa-dice"></i> Keine Auswahl - Zufällige Parameter';
            chipsContainer.appendChild(placeholder);
        }
    }
    
    /**
     * Erstellt einen Auswahl-Chip
     */
    createChip(text, type, icon) {
        const chip = document.createElement('span');
        chip.className = `chip chip-${type}`;
        chip.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
        return chip;
    }
    
    /**
     * Setzt alle Auswahlen zurück
     */
    resetTaskSelection() {
        // State zurücksetzen
        this.taskGenerationState = {
            topic: null,
            subtopic: null,
            taskType: null,
            difficulty: null,
            specialWishes: ''
        };
        
        // UI zurücksetzen
        const topicSelect = document.getElementById('topic-select');
        if (topicSelect) topicSelect.value = '';
        
        const subtopicSelect = document.getElementById('subtopic-select');
        if (subtopicSelect) subtopicSelect.value = '';
        
        const subtopicWrapper = document.getElementById('subtopic-wrapper');
        if (subtopicWrapper) subtopicWrapper.classList.remove('visible');
        
        const wishesInput = document.getElementById('special-wishes-input');
        if (wishesInput) wishesInput.value = '';
        
        document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
        
        this.updateSelectionPreview();
    }
    
    /**
     * Generiert eine komplett zufällige Aufgabe
     */
    async generateRandomTask() {
        // Setze alle auf zufällig
        this.resetTaskSelection();
        
        // Generiere mit zufälligen Parametern
        await this.generateTask(true);
    }

    async generateTask(forceRandom = false) {
        if (!this.apiKey) {
            this.showNotification('Bitte konfiguriere zuerst deinen API-Schlüssel im Profil-Tab.', 'warning');
            document.querySelector('[data-tab="user-profile"]').click();
            return;
        }

        this.showLoading(true);

        // Hole Parameter aus State oder generiere zufällige
        let state = this.taskGenerationState || {};
        
        // Zufällige Parameter für leere Felder
        let topic = state.topic;
        let subtopic = state.subtopic;
        let taskType = state.taskType;
        let difficulty = state.difficulty;
        let specialWishes = state.specialWishes || '';
        
        // Nutze Zufallsfunktionen aus topic-data.js
        if (!topic && typeof window.getRandomTopic === 'function') {
            topic = window.getRandomTopic();
        }
        if (!subtopic && topic && typeof window.getRandomSubtopic === 'function') {
            // 70% Chance auf Unterthema
            if (Math.random() < 0.7) {
                subtopic = window.getRandomSubtopic(topic);
            }
        }
        if (!taskType && typeof window.getRandomTaskType === 'function') {
            taskType = window.getRandomTaskType();
        }
        if (!difficulty && typeof window.getRandomDifficulty === 'function') {
            difficulty = window.getRandomDifficulty();
        }
        
        // Fallbacks
        topic = topic || 'algebra';
        taskType = taskType || 'berechnung';
        difficulty = difficulty || 'fortgeschritten';
        
        // Namen für Prompt
        const topicName = window.MATH_TOPICS?.[topic]?.name || topic;
        const subtopicName = subtopic && window.MATH_TOPICS?.[topic]?.subtopics?.[subtopic] || null;
        const taskTypeName = window.TASK_TYPES?.[taskType]?.name || taskType;
        const difficultyName = window.DIFFICULTY_LEVELS?.[difficulty]?.name || difficulty;
        
        // Baue den Prompt
        let topicText = topicName;
        if (subtopicName) {
            topicText += ` (${subtopicName})`;
        }
        
        let prompt = `Erstelle eine Mathematik-Aufgabe mit folgenden Parametern:
- Thema: ${topicText}
- Schwierigkeit: ${difficultyName}
- Aufgabentyp: ${taskTypeName}`;
        
        if (specialWishes) {
            prompt += `\n- Spezielle Wünsche: ${specialWishes}`;
        }
        
        prompt += `\n\nFormuliere die Aufgabe klar und präzise auf Deutsch. Verwende LaTeX für mathematische Ausdrücke ($..$ für inline, $$...$$ für display).`;

        console.log('Generiere Aufgabe mit:', { topic, subtopic, taskType, difficulty, specialWishes });

        // Start Performance Tracking
        if (this.performanceTracker) {
            this.performanceTracker.startTask(topic, difficulty);
        }

        try {
            const response = await this.callAIAPI(prompt, 'generate', null, topic);
            this.displayResults(response, true);
            
            // Store current task context
            this.currentTaskContext = { topic, subtopic, taskType, difficulty };
        } catch (error) {
            console.error('Fehler bei der Aufgaben-Generierung:', error);
            
            let errorMessage = 'Fehler bei der Aufgaben-Generierung: ';
            errorMessage += error.message || 'Unbekannter Fehler. Bitte überprüfe deine API-Konfiguration.';
            
            this.showNotification(errorMessage, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async callAIAPI(prompt, type, imageData = null, topic = null, intervention = null) {
        let baseSystemPrompt;
        if (type === 'analyze') {
            baseSystemPrompt = `Du bist ein erfahrener Mathematik-Tutor mit Spezialisierung auf deutsche Schulmathematik. 

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
   Beispiel: Die Funktion $f(x) = x^2$ ist eine Parabel.
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$
   Beispiel: $$\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}$$
3. NIEMALS einzelne Symbole wrappen - nur komplette Formeln!
4. Korrekte LaTeX-Befehle:
   - Integrale: $\\int_{a}^{b} f(x) \\, dx$
   - Brüche: $\\frac{a}{b}$
   - Wurzeln: $\\sqrt{x}$ oder $\\sqrt[n]{x}$
   - Potenzen: $x^{2}$ oder $x^{n+1}$
   - Griechische Buchstaben: $\\alpha, \\beta, \\pi$
   - Summen: $\\sum_{i=1}^{n} i$
   - Limites: $\\lim_{x \\to \\infty} f(x)$

WICHTIGE RICHTLINIEN:
1. Gib immer Schritt-für-Schritt-Lösungen mit Erklärungen
2. Verwende deutsche mathematische Terminologie
3. Erkläre jeden Schritt verständlich für Schüler
4. Gib am Ende eine Zusammenfassung der wichtigsten Punkte

Analysiere die gegebene Mathematik-Aufgabe oder -Frage und gib eine hilfreiche Antwort mit detaillierter Schritt-für-Schritt-Lösung.`;
        } else if (type === 'abi-generate') {
            baseSystemPrompt = `Du bist ein erfahrener Mathematik-Lehrer für das sächsische Abitur.

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
   Beispiel: Berechne die Ableitung von $f(x) = x^3 + 2x$.
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$
   Beispiel: $$\\int_{0}^{\\pi} \\sin(x) \\, dx$$
3. NIEMALS einzelne Symbole wrappen - nur komplette Formeln!
4. Korrekte LaTeX-Befehle:
   - Integrale: $\\int_{a}^{b} f(x) \\, dx$
   - Brüche: $\\frac{a}{b}$
   - Wurzeln: $\\sqrt{x}$
   - Potenzen: $x^{2}$

WICHTIGE RICHTLINIEN:
1. Nutze die Original-Aufgabe als Grundlage und erstelle eine konsistente Variante im Abitur-Stil.
2. Bewahre den mathematischen Kern und die Schwierigkeit, variiere jedoch Kontextdetails und Formulierungen.
3. Falls Zahlenwerte angepasst werden, behalte die logische Konsistenz der Aufgabe bei.
4. Verwende eine klare Struktur mit sauberer deutscher Sprache.
5. Gib ausschließlich die neue Aufgabenstellung aus – KEINE Lösungen, KEINE Hinweise, KEINE Erklärungen.
6. Der Umfang muss dem Original entsprechen (ähnliche Anzahl an Teilaufgaben, Punkte, Anforderungen).`;
        } else if (type === 'hint') {
            baseSystemPrompt = `Du bist ein unterstützender Mathematik-Tutor.

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
   Beispiel: Die Funktion $f(x) = x^2$ ist eine Parabel.
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$
   Beispiel: $$\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}$$
3. NIEMALS einzelne Symbole wrappen - nur komplette Formeln!
4. Korrekte LaTeX-Befehle:
   - Integrale: $\\int_{a}^{b} f(x) \\, dx$
   - Brüche: $\\frac{a}{b}$
   - Wurzeln: $\\sqrt{x}$ oder $\\sqrt[n]{x}$
   - Potenzen: $x^{2}$ oder $x^{n+1}$
   - Griechische Buchstaben: $\\alpha, \\beta, \\pi$
   - Summen: $\\sum_{i=1}^{n} i$
   - Limites: $\\lim_{x \\to \\infty} f(x)$

WICHTIGE RICHTLINIEN:
1. Gib höchstens einen präzisen Hinweis, der dem Schüler hilft, den nächsten Schritt zu sehen.
2. Verrate niemals die vollständige Lösung und nenne auch nicht das Endergebnis.
3. Verwende eine ermutigende, klare Sprache.
4. Falls hilfreich, erinnere an relevante Formeln oder Konzepte, ohne sie vollständig auszurechnen.
5. Passe Tonfall und Detailtiefe an das Lernniveau an.`;
        } else if (type === 'solution') {
            baseSystemPrompt = `Du bist ein erfahrener Mathematik-Tutor mit Spezialisierung auf deutsche Schulmathematik.

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
   Beispiel: Die Funktion $f(x) = x^2$ ist eine Parabel.
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$
   Beispiel: $$\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}$$
3. NIEMALS einzelne Symbole wrappen - nur komplette Formeln!
4. Korrekte LaTeX-Befehle:
   - Integrale: $\\int_{a}^{b} f(x) \\, dx$
   - Brüche: $\\frac{a}{b}$
   - Wurzeln: $\\sqrt{x}$ oder $\\sqrt[n]{x}$
   - Potenzen: $x^{2}$ oder $x^{n+1}$
   - Griechische Buchstaben: $\\alpha, \\beta, \\pi$
   - Summen: $\\sum_{i=1}^{n} i$
   - Limites: $\\lim_{x \\to \\infty} f(x)$

WICHTIGE RICHTLINIEN:
1. Erstelle eine vollständige Lösung mit logisch aufgebauten Teilschritten.
2. Erkläre jeden Schritt so, dass ein Schüler den Gedankengang nachvollziehen kann.
3. Verwende deutsche mathematische Terminologie.
4. Fasse die Kernaussagen am Ende knapp zusammen.`;
        } else if (type === 'hilfestellung') {
            baseSystemPrompt = `Du bist ein unterstützender Mathematik-Coach. Du gibst den Lösungsweg des Schülers wieder und markierst Fehler farblich.

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$
3. Nur vollständige Ausdrücke markieren – keine einzelnen Zeichen.

MARKIERUNGEN:
- Grobe Fehler: <span class="error-grob">[GROBER FEHLER] … </span>
- Folgefehler: <span class="error-folge">[FOLGEFEHLER] … </span>
- Kombination aus grobem Fehler und Folgefehler: <span class="error-grobfolge">[GROBER FEHLER + FOLGEFEHLER] … </span>
- Formfehler/Falsches Aufschreiben: <span class="error-notation">[FORMFEHLER] … </span>
Wenn eine farbliche Darstellung nicht möglich ist, müssen die Textlabels in eckigen Klammern unbedingt erhalten bleiben.

WICHTIGE RICHTLINIEN:
1. Gib den Lösungsweg Schritt für Schritt wieder.
2. Erkläre nach jeder markierten Passage kurz, weshalb sie falsch ist und wie sie korrigiert wird.
3. Schließe mit konkreten Tipps, wie ähnliche Fehler vermieden werden können.`;
        } else if (type === 'corrected') {
            baseSystemPrompt = `Du bist ein Mathematik-Tutor und erstellst eine korrigierte Version des Schülerlösungswegs.

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$

MARKIERUNGEN:
- <span class="correction-highlight">[KORREKTUR] … </span> für jede geänderte oder ergänzte Passage.
- Erkläre unmittelbar nach jeder markierten Stelle, warum die Änderung nötig ist.
Wenn farbliche Darstellung nicht möglich ist, bleiben die Textlabels in eckigen Klammern bestehen.

WICHTIGE RICHTLINIEN:
1. Belasse korrekte Teile unverändert.
2. Bewahre die ursprüngliche Struktur des Lösungswegs.
3. Schließe mit einer kurzen Liste der wichtigsten Korrekturen.`;
        } else if (type === 'optimal') {
            baseSystemPrompt = `Du bist ein Mathematik-Coach, der effiziente Lösungswege präsentiert.

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$

MARKIERUNGEN:
- <span class="optimal-highlight">[OPTIMIERUNG] … </span> für Schritte, die besonders elegant oder zeitsparend sind.
Wenn farbliche Darstellung nicht möglich ist, behalte die Textlabels in eckigen Klammern bei.

WICHTIGE RICHTLINIEN:
1. Stelle einen klaren, strukturierten Lösungsweg vor.
2. Begründe jede markierte Optimierung.
3. Fasse zum Schluss die Vorteile des Ansatzes zusammen.`;
        } else {
            baseSystemPrompt = `Du bist ein erfahrener Mathematik-Lehrer mit Spezialisierung auf deutsche Schulmathematik.

KRITISCH WICHTIG - LaTeX-Formatierung:
1. Verwende für INLINE mathematische Ausdrücke: $...$
   Beispiel: Berechne die Ableitung von $f(x) = x^3 + 2x$.
2. Verwende für DISPLAY mathematische Ausdrücke: $$...$$
   Beispiel: $$\\int_{0}^{\\pi} \\sin(x) \\, dx$$
3. NIEMALS einzelne Symbole wrappen - nur komplette Formeln!
4. Korrekte LaTeX-Befehle:
   - Integrale: $\\int_{a}^{b} f(x) \\, dx$
   - Brüche: $\\frac{a}{b}$
   - Wurzeln: $\\sqrt{x}$
   - Potenzen: $x^{2}$

WICHTIGE RICHTLINIEN für Aufgaben-Generierung:
1. Erstelle Aufgaben, die dem deutschen Lehrplan entsprechen
2. Strukturiere die Aufgabe klar mit einer klaren Aufgabenstellung
3. Berücksichtige das angegebene Schwierigkeitsniveau
4. Verwende deutsche mathematische Terminologie
5. Gib KEINE Lösung an - nur die Aufgabenstellung!

WICHTIG: Gib nur die Aufgabenstellung aus, keine Lösung, keine Lösungshinweise, keine Erklärungen. Der Schüler soll die Aufgabe selbst lösen.

Erstelle eine passende Mathematik-Aufgabe basierend auf den gegebenen Parametern.`;
        }
        
        const shouldPersonalize = type !== 'abi-generate';
        const systemPrompt = shouldPersonalize
            ? await this.getPersonalizedPrompt(baseSystemPrompt, type, topic, intervention)
            : baseSystemPrompt;

        // Bestimme das richtige Modell basierend auf Bild-Upload
        let model;
        if (this.apiProvider === 'openai') {
            model = 'gpt-5.2';
        } else {
            model = 'claude-3-5-sonnet-20241022';
        }

        const imagePayloads = Array.isArray(imageData) ? imageData : (imageData ? [imageData] : []);
        const normalizedImages = imagePayloads
            .map((item) => {
                if (!item) return null;
                if (typeof item === 'string') {
                    return { dataUrl: item };
                }
                if (typeof item === 'object' && item.dataUrl) {
                    return item;
                }
                return null;
            })
            .filter(Boolean);

        const hasImages = normalizedImages.length > 0;

        // Erstelle die Nachrichten mit Bild-Unterstützung
        let userMessage;
        if (hasImages && this.apiProvider === 'openai') {
            // OpenAI Vision Format unterstützt mehrere Bilder
            const content = [
                    {
                        type: 'text',
                        text: prompt
                    },
                ...normalizedImages.map((image) => ({
                        type: 'image_url',
                        image_url: {
                        url: image.dataUrl
                    }
                }))
            ];
            userMessage = {
                role: 'user',
                content
            };
        } else if (hasImages && this.apiProvider === 'anthropic') {
            // Claude Vision Format
            const content = normalizedImages.map((image) => {
                const [header, base64Data] = image.dataUrl.split(',');
                const mimeMatch = header.match(/^data:(.*?);base64$/);
                return {
                        type: 'image',
                        source: {
                            type: 'base64',
                        media_type: mimeMatch ? mimeMatch[1] : 'image/png',
                            data: base64Data
                        }
                };
            });
            content.push({
                        type: 'text',
                        text: prompt
            });

            userMessage = {
                role: 'user',
                content
            };
        } else {
            // Kein Bild - Standard-Format
            userMessage = {
                role: 'user',
                content: prompt
            };
        }

        const requestBody = {
            model: model,
            messages: this.apiProvider === 'anthropic' ? [userMessage] : [
                {
                    role: 'system',
                    content: systemPrompt
                },
                userMessage
            ],
            temperature: 0.7
        };

        if (this.apiProvider === 'openai') {
            requestBody.max_completion_tokens = 2000;
        } else {
            requestBody.max_tokens = 2000;
        }

        // Anthropic-spezifische Parameter
        if (this.apiProvider === 'anthropic') {
            requestBody.system = systemPrompt;
        }

        const apiUrl = this.apiProvider === 'openai' 
            ? 'https://api.openai.com/v1/chat/completions'
            : 'https://api.anthropic.com/v1/messages';

        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.apiProvider === 'openai') {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        } else {
            headers['x-api-key'] = this.apiKey;
            headers['anthropic-version'] = '2023-06-01';
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            // Versuche, detaillierte Fehlerinformationen zu erhalten
            let errorDetails = '';
            try {
                const errorData = await response.json();
                console.error('API Error Details:', errorData);
                errorDetails = errorData.error?.message || JSON.stringify(errorData);
            } catch (e) {
                errorDetails = response.statusText;
            }
            
            throw new Error(`API-Fehler (${response.status}): ${errorDetails}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        if (this.apiProvider === 'openai') {
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Ungültige API-Antwort: ' + JSON.stringify(data));
            }
            return data.choices[0].message.content;
        } else {
            if (!data.content || !data.content[0]) {
                throw new Error('Ungültige API-Antwort: ' + JSON.stringify(data));
            }
            return data.content[0].text;
        }
    }

    displayResults(content, isTask = false) {
        const resultsSection = document.getElementById('results-section');
        const resultsContent = document.getElementById('results-content');
        
        // Speichere die aktuelle Aufgabe für spätere Referenz
        if (isTask) {
            this.currentTask = content;
        }
        
        let interactionHTML = '';
        
        // Füge Interaktionsbereich hinzu, wenn es eine generierte Aufgabe ist
        if (isTask) {
            interactionHTML = `
                <div class="solution-interaction">
                    <div class="interaction-header">
                        <i class="fas fa-pencil-alt"></i>
                        <h4>Deine Lösung</h4>
                    </div>
                    
                    <!-- Text Lösung -->
                    <div class="solution-section">
                        <label for="solution-input">Schriftliche Lösung:</label>
                        <textarea 
                            id="solution-input" 
                            placeholder="Gib hier deine Lösung ein oder beschreibe deinen Lösungsansatz..."
                            rows="6"
                        ></textarea>
                    </div>
                    
                    <!-- Bild-Upload für Lösung -->
                    <div class="solution-image-section">
                        <label>
                            <i class="fas fa-camera"></i>
                            Oder lade ein Foto deiner Lösung hoch:
                        </label>
                        <div class="solution-upload-zone" id="solution-upload-zone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Klicke hier oder ziehe ein Bild hierher</p>
                            <p class="upload-hint">JPG, PNG (max. 3 Bilder)</p>
                            <input type="file" id="solution-image-input" accept="image/*" hidden multiple>
                        </div>
                        <div class="solution-image-preview" id="solution-image-preview"></div>
                    </div>
                    
                    <!-- Toggle Button für Skizzen -->
                    <button class="btn btn-secondary sketch-toggle-btn" id="sketch-toggle-btn">
                        <i class="fas fa-pencil-ruler"></i>
                        <span>Skizze hinzufügen</span>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </button>
                    
                    <!-- Zeichenbereich (standardmäßig eingeklappt) -->
                    <div class="drawing-section collapsed" id="drawing-section">
                        <div class="drawing-header">
                            <label>Skizzen & Zeichnungen:</label>
                            <div class="drawing-tabs">
                                <button class="drawing-tab-btn" data-canvas="coordinate">
                                    <i class="fas fa-project-diagram"></i>
                                    Koordinatensystem
                                </button>
                                <button class="drawing-tab-btn active" data-canvas="grid">
                                    <i class="fas fa-th"></i>
                                    Kariertes Papier
                                </button>
                            </div>
                            <button class="btn btn-icon fullscreen-btn" id="canvas-fullscreen-btn" title="Vollbild">
                                <i class="fas fa-expand"></i>
                            </button>
                        </div>
                        
                        <!-- Canvas Container -->
                        <div class="canvas-container" id="canvas-container">
                            <canvas id="coordinate-canvas" class="drawing-canvas" width="800" height="600"></canvas>
                            <canvas id="grid-canvas" class="drawing-canvas active" width="800" height="600"></canvas>
                            <!-- Multi-Page Navigation -->
                            <div class="canvas-page-nav" id="canvas-page-nav">
                                <button class="btn btn-icon" id="prev-page-btn" title="Vorherige Seite" disabled>
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <span class="page-indicator" id="page-indicator">Seite 1/1</span>
                                <button class="btn btn-icon" id="next-page-btn" title="Nächste Seite">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                                <button class="btn btn-icon" id="add-page-btn" title="Neue Seite hinzufügen">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Zeichentools -->
                        <div class="drawing-tools">
                            <div class="tool-group">
                                <label>Werkzeug:</label>
                                <button class="tool-btn active" data-tool="pen" title="Stift">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="tool-btn" data-tool="eraser" title="Radiergummi">
                                    <i class="fas fa-eraser"></i>
                                </button>
                                <button class="tool-btn" data-tool="line" title="Linie">
                                    <i class="fas fa-minus"></i>
                                </button>
                            </div>
                            
                            <div class="tool-group">
                                <label>Farbe:</label>
                                <input type="color" id="pen-color" value="#000000" title="Stiftfarbe">
                                <button class="color-preset" data-color="#000000" style="background: #000000;" title="Schwarz"></button>
                                <button class="color-preset" data-color="#2563eb" style="background: #2563eb;" title="Blau"></button>
                                <button class="color-preset" data-color="#ef4444" style="background: #ef4444;" title="Rot"></button>
                                <button class="color-preset" data-color="#10b981" style="background: #10b981;" title="Grün"></button>
                            </div>
                            
                            <div class="tool-group">
                                <label>Stärke:</label>
                                <input type="range" id="pen-width" min="1" max="10" value="2" title="Strichstärke">
                                <span id="pen-width-display">2px</span>
                            </div>
                            
                            <div class="tool-group">
                                <button class="btn btn-secondary btn-sm" id="clear-canvas">
                                    <i class="fas fa-trash"></i>
                                    Löschen
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="interaction-actions">
                        <button class="btn btn-primary" id="submit-solution">
                            <i class="fas fa-check-circle"></i>
                            Lösung überprüfen
                        </button>
                        <button class="btn btn-secondary" id="request-hint">
                            <i class="fas fa-lightbulb"></i>
                            Hints anzeigen
                        </button>
                        <button class="btn btn-secondary" id="request-optimal" disabled>
                            <i class="fas fa-rocket"></i>
                            Optimaler Lösungsweg
                        </button>
                    </div>
                    <div class="interaction-note" id="solution-action-note"></div>
                </div>
                <div id="feedback-area" style="display: none;">
                    <div class="ai-response feedback-response">
                        <div class="response-header">
                            <i class="fas fa-comment-dots"></i>
                            <span>KI-Feedback</span>
                        </div>
                        <div class="response-content" id="feedback-content">
                        </div>
                    </div>
                </div>
            `;
        }
        
        resultsContent.innerHTML = `
            <div class="ai-response">
                <div class="response-header">
                    <i class="fas fa-robot"></i>
                    <span>${isTask ? 'Aufgabe' : 'KI-Antwort'}</span>
                </div>
                <div class="response-content">
                    ${this.formatResponse(content)}
                </div>
            </div>
            ${interactionHTML}
        `;
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // MathJax nach dem Einfügen des Inhalts aktualisieren
        this.renderMathJax(resultsContent);
        
        // Event Listener für Interaktions-Buttons hinzufügen
        if (isTask) {
            this.resetSolutionStateForNewTask();
            this.setupInteractionListeners();
            this.initializeCanvas();
            this.updateSolutionActionButtons();
        }
    }

    initializeCanvas() {
        // Initialisiere beide Canvas
        this.coordinateCanvas = document.getElementById('coordinate-canvas');
        this.gridCanvas = document.getElementById('grid-canvas');
        
        if (!this.coordinateCanvas || !this.gridCanvas) {
            console.error('Canvas-Elemente nicht gefunden');
            return;
        }
        
        // A4-Verhältnis für kariertes Papier (210:297 ≈ 700:990)
        this.gridCanvas.width = 700;
        this.gridCanvas.height = 990;
        
        // Koordinatensystem quadratisch
        this.coordinateCanvas.width = 600;
        this.coordinateCanvas.height = 600;
        
        this.coordinateCtx = this.coordinateCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        
        // Aktiver Canvas - Kariertes Papier als Standard
        this.activeCanvas = this.gridCanvas;
        this.activeCtx = this.gridCtx;
        
        // Zeichenzustand
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.lineWidth = 2;
        this.startX = 0;
        this.startY = 0;
        
        // Multi-Page Support für kariertes Papier
        this.gridPages = []; // Array von ImageData für jede Seite
        this.currentGridPage = 0;
        
        // Zeichne Hintergründe
        this.drawCoordinateSystem();
        this.drawGridPaper();
        
        // Speichere Original-Hintergründe
        this.coordinateBackground = this.coordinateCtx.getImageData(0, 0, this.coordinateCanvas.width, this.coordinateCanvas.height);
        this.gridBackground = this.gridCtx.getImageData(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        
        // Erste Seite speichern
        this.gridPages.push(this.gridCtx.getImageData(0, 0, this.gridCanvas.width, this.gridCanvas.height));
        
        // Canvas-Nutzung tracken
        this.coordinateCanvasUsed = false;
        this.gridCanvasUsed = false;
        
        // Setup Canvas Event Listeners
        this.setupCanvasListeners();
        
        // Update Page Navigation
        this.updatePageNavigation();
    }
    
    updatePageNavigation() {
        const pageIndicator = document.getElementById('page-indicator');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');
        const pageNav = document.getElementById('canvas-page-nav');
        
        if (!pageIndicator || !prevBtn || !nextBtn) return;
        
        // Nur bei kariertem Papier anzeigen
        if (pageNav) {
            pageNav.style.display = this.activeCanvas === this.gridCanvas ? 'flex' : 'none';
        }
        
        pageIndicator.textContent = `Seite ${this.currentGridPage + 1}/${this.gridPages.length}`;
        prevBtn.disabled = this.currentGridPage === 0;
        nextBtn.disabled = this.currentGridPage >= this.gridPages.length - 1;
    }
    
    saveCurrentGridPage() {
        if (this.activeCanvas === this.gridCanvas && this.gridPages.length > 0) {
            this.gridPages[this.currentGridPage] = this.gridCtx.getImageData(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        }
    }
    
    goToGridPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.gridPages.length) return;
        
        // Speichere aktuelle Seite
        this.saveCurrentGridPage();
        
        // Lade neue Seite
        this.currentGridPage = pageIndex;
        this.gridCtx.putImageData(this.gridPages[pageIndex], 0, 0);
        
        this.updatePageNavigation();
    }
    
    addNewGridPage() {
        // Speichere aktuelle Seite
        this.saveCurrentGridPage();
        
        // Neue leere Seite erstellen
        this.drawGridPaper();
        const newPage = this.gridCtx.getImageData(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        this.gridPages.push(newPage);
        
        // Zur neuen Seite wechseln
        this.currentGridPage = this.gridPages.length - 1;
        
        this.updatePageNavigation();
    }

    drawCoordinateSystem() {
        const canvas = this.coordinateCanvas;
        const ctx = this.coordinateCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // Koordinatensystem von 0-10 mit Ursprung unten links
        const padding = 50; // Rand für Beschriftung
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;
        const unitSize = graphWidth / 10; // Größe einer Einheit
        
        // Hintergrund
        ctx.fillStyle = '#fefefe';
        ctx.fillRect(0, 0, width, height);
        
        // Leichter Hintergrund für Zeichenbereich
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(padding, padding, graphWidth, graphHeight);
        
        // Kleine Gitterlinien (0.5er Schritte)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;
        
        for (let i = 0; i <= 20; i++) {
            const x = padding + (i * unitSize / 2);
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        
        for (let i = 0; i <= 20; i++) {
            const y = height - padding - (i * unitSize / 2);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Große Gitterlinien (1er Schritte)
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 10; i++) {
            const x = padding + (i * unitSize);
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
        
        for (let i = 0; i <= 10; i++) {
            const y = height - padding - (i * unitSize);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Achsen (dicker)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        
        // X-Achse
        ctx.beginPath();
        ctx.moveTo(padding - 10, height - padding);
        ctx.lineTo(width - padding + 20, height - padding);
        ctx.stroke();
        
        // Y-Achse
        ctx.beginPath();
        ctx.moveTo(padding, height - padding + 10);
        ctx.lineTo(padding, padding - 20);
        ctx.stroke();
        
        // Pfeile
        const arrowSize = 12;
        ctx.fillStyle = '#1e293b';
        
        // X-Achse Pfeil
        ctx.beginPath();
        ctx.moveTo(width - padding + 20, height - padding);
        ctx.lineTo(width - padding + 20 - arrowSize, height - padding - arrowSize/2);
        ctx.lineTo(width - padding + 20 - arrowSize, height - padding + arrowSize/2);
        ctx.closePath();
        ctx.fill();
        
        // Y-Achse Pfeil
        ctx.beginPath();
        ctx.moveTo(padding, padding - 20);
        ctx.lineTo(padding - arrowSize/2, padding - 20 + arrowSize);
        ctx.lineTo(padding + arrowSize/2, padding - 20 + arrowSize);
        ctx.closePath();
        ctx.fill();
        
        // Beschriftung der Achsen
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('x', width - padding + 25, height - padding + 5);
        ctx.fillText('y', padding - 5, padding - 25);
        
        // Zahlen auf den Achsen
        ctx.font = '13px Arial';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        
        // X-Achse Zahlen
        for (let i = 0; i <= 10; i++) {
            const x = padding + (i * unitSize);
            const y = height - padding + 20;
            ctx.fillText(i.toString(), x, y);
            
            // Kleine Striche auf der Achse
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, height - padding - 4);
            ctx.lineTo(x, height - padding + 4);
            ctx.stroke();
        }
        
        // Y-Achse Zahlen
        ctx.textAlign = 'right';
        for (let i = 0; i <= 10; i++) {
            const x = padding - 10;
            const y = height - padding - (i * unitSize) + 4;
            if (i > 0) { // 0 nur einmal anzeigen
                ctx.fillText(i.toString(), x, y);
            }
            
            // Kleine Striche auf der Achse
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(padding - 4, height - padding - (i * unitSize));
            ctx.lineTo(padding + 4, height - padding - (i * unitSize));
            ctx.stroke();
        }
        
        // Ursprung (0)
        ctx.textAlign = 'right';
        ctx.fillText('0', padding - 10, height - padding + 20);
    }

    drawGridPaper() {
        const canvas = this.gridCanvas;
        const ctx = this.gridCtx;
        const width = canvas.width;
        const height = canvas.height;
        const smallGrid = 20;
        const largeGrid = 100;
        
        // Hintergrund
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Kleine Kästchen
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= width; x += smallGrid) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= height; y += smallGrid) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Große Kästchen (dicker)
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        
        for (let x = 0; x <= width; x += largeGrid) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= height; y += largeGrid) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    setupCanvasListeners() {
        // Sketch Toggle Button
        const sketchToggleBtn = document.getElementById('sketch-toggle-btn');
        const drawingSection = document.getElementById('drawing-section');
        
        if (sketchToggleBtn && drawingSection) {
            sketchToggleBtn.addEventListener('click', () => {
                const isCollapsed = drawingSection.classList.contains('collapsed');
                
                if (isCollapsed) {
                    drawingSection.classList.remove('collapsed');
                    sketchToggleBtn.querySelector('span').textContent = 'Skizze ausblenden';
                    sketchToggleBtn.querySelector('.toggle-icon').classList.remove('fa-chevron-down');
                    sketchToggleBtn.querySelector('.toggle-icon').classList.add('fa-chevron-up');
                    sketchToggleBtn.classList.add('active');
                } else {
                    drawingSection.classList.add('collapsed');
                    sketchToggleBtn.querySelector('span').textContent = 'Skizze hinzufügen';
                    sketchToggleBtn.querySelector('.toggle-icon').classList.remove('fa-chevron-up');
                    sketchToggleBtn.querySelector('.toggle-icon').classList.add('fa-chevron-down');
                    sketchToggleBtn.classList.remove('active');
                }
            });
        }
        
        // Canvas Tab-Switching
        const tabButtons = document.querySelectorAll('.drawing-tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const canvasId = btn.getAttribute('data-canvas');
                this.switchCanvas(canvasId);
                
                // Update active tab
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Tool-Buttons
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentTool = btn.getAttribute('data-tool');
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Color Picker
        const colorPicker = document.getElementById('pen-color');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                this.currentColor = e.target.value;
            });
        }
        
        // Color Presets
        const colorPresets = document.querySelectorAll('.color-preset');
        colorPresets.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-color');
                this.currentColor = color;
                if (colorPicker) colorPicker.value = color;
            });
        });
        
        // Line Width
        const widthSlider = document.getElementById('pen-width');
        const widthDisplay = document.getElementById('pen-width-display');
        if (widthSlider && widthDisplay) {
            widthSlider.addEventListener('input', (e) => {
                this.lineWidth = parseInt(e.target.value);
                widthDisplay.textContent = this.lineWidth + 'px';
            });
        }
        
        // Clear Canvas
        const clearBtn = document.getElementById('clear-canvas');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearActiveCanvas();
            });
        }
        
        // Page Navigation Buttons
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        const addPageBtn = document.getElementById('add-page-btn');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                this.goToGridPage(this.currentGridPage - 1);
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.goToGridPage(this.currentGridPage + 1);
            });
        }
        
        if (addPageBtn) {
            addPageBtn.addEventListener('click', () => {
                this.addNewGridPage();
            });
        }
        
        // Fullscreen Button
        const fullscreenBtn = document.getElementById('canvas-fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                this.toggleCanvasFullscreen();
            });
        }
        
        // Drawing Events
        this.activeCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.activeCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.activeCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.activeCanvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch Events für mobile Geräte
        this.activeCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.activeCanvas.dispatchEvent(mouseEvent);
        });
        
        this.activeCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.activeCanvas.dispatchEvent(mouseEvent);
        });
        
        this.activeCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.activeCanvas.dispatchEvent(mouseEvent);
        });
    }

    switchCanvas(canvasId) {
        const canvases = document.querySelectorAll('.drawing-canvas');
        canvases.forEach(c => c.classList.remove('active'));
        
        if (canvasId === 'coordinate') {
            this.activeCanvas = this.coordinateCanvas;
            this.activeCtx = this.coordinateCtx;
            this.coordinateCanvas.classList.add('active');
        } else {
            this.activeCanvas = this.gridCanvas;
            this.activeCtx = this.gridCtx;
            this.gridCanvas.classList.add('active');
        }
        
        // Update Page Navigation visibility
        this.updatePageNavigation();
        
        // Update event listeners
        this.removeCanvasEventListeners();
        this.activeCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.activeCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.activeCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.activeCanvas.addEventListener('mouseout', () => this.stopDrawing());
    }

    removeCanvasEventListeners() {
        // Cleanup old listeners (simplified - in production you'd track these properly)
    }

    toggleCanvasFullscreen() {
        const canvasContainer = document.getElementById('canvas-container');
        const drawingSection = document.querySelector('.drawing-section');
        const fullscreenBtn = document.getElementById('canvas-fullscreen-btn');
        
        if (!canvasContainer || !drawingSection) return;
        
        const isFullscreen = drawingSection.classList.contains('fullscreen-mode');
        
        if (isFullscreen) {
            // Exit fullscreen
            drawingSection.classList.remove('fullscreen-mode');
            document.body.style.overflow = '';
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                fullscreenBtn.title = 'Vollbild';
            }
        } else {
            // Enter fullscreen
            drawingSection.classList.add('fullscreen-mode');
            document.body.style.overflow = 'hidden';
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                fullscreenBtn.title = 'Vollbild beenden';
            }
        }
        
        // ESC-Taste zum Beenden
        if (!isFullscreen) {
            const escHandler = (e) => {
                if (e.key === 'Escape' && drawingSection.classList.contains('fullscreen-mode')) {
                    this.toggleCanvasFullscreen();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    }

    getCanvasCoordinates(e) {
        const rect = this.activeCanvas.getBoundingClientRect();
        const scaleX = this.activeCanvas.width / rect.width;
        const scaleY = this.activeCanvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const coords = this.getCanvasCoordinates(e);
        this.startX = coords.x;
        this.startY = coords.y;
        
        // Markiere Canvas als benutzt
        if (this.activeCanvas === this.coordinateCanvas) {
            this.coordinateCanvasUsed = true;
        } else {
            this.gridCanvasUsed = true;
        }
        
        if (this.currentTool === 'pen') {
            this.activeCtx.beginPath();
            this.activeCtx.moveTo(coords.x, coords.y);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const coords = this.getCanvasCoordinates(e);
        
        if (this.currentTool === 'pen') {
            this.activeCtx.strokeStyle = this.currentColor;
            this.activeCtx.lineWidth = this.lineWidth;
            this.activeCtx.lineCap = 'round';
            this.activeCtx.lineJoin = 'round';
            
            this.activeCtx.lineTo(coords.x, coords.y);
            this.activeCtx.stroke();
        } else if (this.currentTool === 'eraser') {
            // Restore background for eraser
            const eraserSize = this.lineWidth * 5;
            const background = this.activeCanvas === this.coordinateCanvas 
                ? this.coordinateBackground 
                : this.gridBackground;
            
            this.activeCtx.putImageData(
                background,
                0, 0,
                coords.x - eraserSize/2,
                coords.y - eraserSize/2,
                eraserSize,
                eraserSize
            );
        }
    }

    stopDrawing() {
        if (this.isDrawing && this.currentTool === 'line') {
            // Draw line from start to current position
            const coords = this.getCanvasCoordinates(event);
            this.activeCtx.strokeStyle = this.currentColor;
            this.activeCtx.lineWidth = this.lineWidth;
            this.activeCtx.beginPath();
            this.activeCtx.moveTo(this.startX, this.startY);
            this.activeCtx.lineTo(coords.x, coords.y);
            this.activeCtx.stroke();
        }
        
        this.isDrawing = false;
    }

    clearActiveCanvas() {
        if (confirm('Möchtest du wirklich die Zeichnung löschen?')) {
            if (this.activeCanvas === this.coordinateCanvas) {
                this.activeCtx.putImageData(this.coordinateBackground, 0, 0);
                this.coordinateCanvasUsed = false;
            } else {
                this.activeCtx.putImageData(this.gridBackground, 0, 0);
                this.gridCanvasUsed = false;
            }
        }
    }

    getCanvasImages() {
        const images = [];
        
        if (this.coordinateCanvasUsed) {
            images.push({
                name: 'Koordinatensystem-Skizze',
                data: this.coordinateCanvas.toDataURL('image/png')
            });
        }
        
        if (this.gridCanvasUsed) {
            images.push({
                name: 'Karierte-Notizen',
                data: this.gridCanvas.toDataURL('image/png')
            });
        }
        
        return images;
    }

    setupInteractionListeners() {
        const submitBtn = document.getElementById('submit-solution');
        const hintBtn = document.getElementById('request-hint');
        const optimalBtn = document.getElementById('request-optimal');
        const solutionInput = document.getElementById('solution-input');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitSolution());
        }
        
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.toggleHints());
        }

        if (optimalBtn) {
            optimalBtn.addEventListener('click', () => this.requestOptimalSolution());
        }
        
        // Strg+Enter zum Absenden der Lösung
        if (solutionInput) {
            solutionInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.submitSolution();
                }
            });
        }
        
        // Solution Image Upload Setup
        this.setupSolutionImageUpload();

        this.updateSolutionActionButtons();
    }
    
    /**
     * Richtet den Bild-Upload für Lösungen ein
     */
    setupSolutionImageUpload() {
        const uploadZone = document.getElementById('solution-upload-zone');
        const imageInput = document.getElementById('solution-image-input');
        const previewContainer = document.getElementById('solution-image-preview');
        
        if (!uploadZone || !imageInput || !previewContainer) return;
        
        // Initialisiere Array für Lösungsbilder
        this.solutionImages = [];
        
        // Click to upload
        uploadZone.addEventListener('click', () => {
            imageInput.click();
        });
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                this.handleSolutionImageUpload(Array.from(e.dataTransfer.files));
            }
        });
        
        // File input change
        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleSolutionImageUpload(Array.from(e.target.files));
            }
        });
    }
    
    /**
     * Verarbeitet hochgeladene Lösungsbilder
     */
    handleSolutionImageUpload(files) {
        const previewContainer = document.getElementById('solution-image-preview');
        const maxImages = 3;
        
        if (!previewContainer) return;
        
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (validFiles.length === 0) {
            this.showNotification('Bitte wähle gültige Bilddateien aus.', 'warning');
            return;
        }
        
        // Prüfe Maximum
        if (this.solutionImages.length + validFiles.length > maxImages) {
            this.showNotification(`Maximal ${maxImages} Bilder erlaubt.`, 'warning');
            return;
        }
        
        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = {
                    name: file.name,
                    type: file.type,
                    dataUrl: e.target.result
                };
                
                this.solutionImages.push(imageData);
                this.renderSolutionImagePreview();
            };
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * Rendert die Vorschau der Lösungsbilder
     */
    renderSolutionImagePreview() {
        const previewContainer = document.getElementById('solution-image-preview');
        const uploadZone = document.getElementById('solution-upload-zone');
        
        if (!previewContainer) return;
        
        if (this.solutionImages.length === 0) {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
            if (uploadZone) uploadZone.style.display = 'flex';
            return;
        }
        
        previewContainer.style.display = 'flex';
        if (uploadZone && this.solutionImages.length >= 3) {
            uploadZone.style.display = 'none';
        }
        
        previewContainer.innerHTML = this.solutionImages.map((img, idx) => `
            <div class="solution-image-item">
                <img src="${img.dataUrl}" alt="${img.name}">
                <button class="remove-solution-image" data-index="${idx}" title="Bild entfernen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        // Remove Button Events
        previewContainer.querySelectorAll('.remove-solution-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                this.solutionImages.splice(idx, 1);
                this.renderSolutionImagePreview();
            });
        });
    }

    async submitSolution() {
        // Beende Test-Modus wenn aktiv (normaler Workflow)
        this.isTestMode = false;
        
        const solutionInput = document.getElementById('solution-input');
        const userSolution = solutionInput.value.trim();
        
        // Hole Zeichnungen
        const canvasImages = this.getCanvasImages();
        
        // Hole Lösungsbilder (hochgeladene Fotos)
        const solutionImages = this.solutionImages || [];
        const hasSolutionImages = solutionImages.length > 0;
        
        // Prüfe ob Korrekturen vorhanden sind
        const hasCorrections = this.stepCorrections && Object.keys(this.stepCorrections).length > 0;
        const hasLastAnalysis = this.solutionState.lastAnalysis && this.solutionState.lastAnalysis.steps;
        
        // Bei Korrekturen brauchen wir keine neue Lösung im Textfeld
        if (!hasCorrections && !userSolution && canvasImages.length === 0 && !hasSolutionImages) {
            this.showNotification('Bitte gib eine Lösung ein, erstelle eine Zeichnung oder lade ein Foto hoch.', 'warning');
            return;
        }
        
        this.showLoading(true);
        
        try {
            let drawingInfo = '';
            if (canvasImages.length > 0) {
                drawingInfo = '\n\nDer Schüler hat folgende Skizzen angefertigt:\n';
                canvasImages.forEach(img => {
                    drawingInfo += `- ${img.name}\n`;
                });
                drawingInfo += '\n(Hinweis: Die Skizzen können derzeit nicht direkt analysiert werden, aber du kannst basierend auf der Beschreibung des Schülers Feedback geben.)';
            }
            
            // Hole Schülerkontext
            const studentContext = await this.getStudentContextForPrompt();
            
            // Bestimme Versuchsnummer
            const attemptNumber = (this.solutionState.attemptCount || 0) + 1;
            this.solutionState.attemptCount = attemptNumber;
            
            let prompts;
            
            // Prüfe ob wir eine Folge-Analyse mit Korrekturen machen
            if (hasCorrections && hasLastAnalysis) {
                console.log('[submitSolution] Using follow-up analysis with corrections:', this.stepCorrections);
                
                // Speichere aktuelle Analyse in previousAnalyses
                if (!this.solutionState.previousAnalyses) {
                    this.solutionState.previousAnalyses = [];
                }
                this.solutionState.previousAnalyses.push(this.solutionState.lastAnalysis);
                
                // Verwende Folge-Analyse-Prompt
                prompts = this.buildFollowUpAnalysisPrompt({
                    originalSteps: this.solutionState.lastAnalysis.steps,
                    userCorrections: this.stepCorrections,
                    previousAnalyses: this.solutionState.previousAnalyses,
                    attemptNumber,
                    studentContext,
                    previousHints: this.solutionState.hintState?.prepared || null
                });
            } else {
                // Normale Erst-Analyse
                console.log('[submitSolution] Using initial analysis');
                
                prompts = this.buildErrorAnalysisPrompt({
                    userSolution,
                    drawingInfo,
                    hasDrawings: canvasImages.length > 0,
                    attemptNumber,
                    previousAnalysis: attemptNumber > 1 ? this.solutionState.lastAnalysis : null,
                    studentContext
                });
            }
            
            // API-Aufruf für strukturierte Analyse
            const analysisResponse = await this.callErrorAnalysisAPI(prompts);
            
            console.log('[submitSolution] Analysis response:', analysisResponse);
            
            // Bestimme Erfolg basierend auf Fehlertypen
            const hasErrors = analysisResponse.steps && analysisResponse.steps.some(
                step => step.errorType && step.errorType !== 'none'
            );
            const success = !hasErrors;
            const preparedHints = analysisResponse.hints || { level1: [], level2: [] };
            
            // Reset step corrections nach der Analyse
            this.stepCorrections = {};
            
            // Speichere Analyse-Ergebnis
            Object.assign(this.solutionState, {
                lastUserSolution: hasCorrections ? this.solutionState.lastUserSolution : userSolution,
                lastCanvasImages: canvasImages,
                lastAnalysis: analysisResponse,
                lastCheckResponse: analysisResponse,
                lastWasCorrect: success,
                hilfestellungEligible: !success && !!(hasCorrections ? this.solutionState.lastUserSolution : userSolution),
                hilfestellungProvided: false,
                correctedProvided: false,
                canRequestOptimal: success,
                optimalDelivered: false,
                hilfestellungContent: '',
                correctedContent: '',
                optimalContent: '',
                hintState: {
                    prepared: preparedHints,
                    unlockedLevel: 0,
                    popupOpen: false
                }
            });
            
            // Log Performance
            if (this.userId && this.performanceTracker && this.currentTaskContext) {
                await this.performanceTracker.logPerformance(this.userId, {
                    topic: this.currentTaskContext.topic,
                    taskType: 'solve',
                    success: success,
                    difficulty: this.currentTaskContext.difficulty,
                    showedSolution: false
                });
                
                // Update Competency
                if (this.competencyTracker) {
                    await this.competencyTracker.updateAfterTask(this.userId, this.currentTaskContext.topic, {
                        success,
                        timeSpent: this.performanceTracker.currentTaskStart?.timeSpent || 0
                    });
                }
                
                // Log Behavior
                if (this.behaviorTracker) {
                    await this.behaviorTracker.trackSelfSolveAttempt(this.userId, {
                        topic: this.currentTaskContext.topic,
                        success
                    });
                }
            }
            
            // Zeige strukturierte Feedback-Anzeige
            this.displayStructuredFeedback(analysisResponse, success);
            this.updateSolutionActionButtons();
        } catch (error) {
            console.error('Fehler beim Überprüfen der Lösung:', error);
            this.showNotification('Fehler beim Überprüfen der Lösung: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Zeigt die strukturierte Fehleranalyse an
     */
    displayStructuredFeedback(analysis, success) {
        const feedbackArea = document.getElementById('feedback-area');
        const feedbackContent = document.getElementById('feedback-content');
        
        if (!feedbackArea || !feedbackContent) {
            console.error('[displayStructuredFeedback] Feedback area not found');
            return;
        }
        
        feedbackArea.style.display = 'block';
        feedbackContent.innerHTML = '';
        
        // Status-Banner
        const statusBanner = document.createElement('div');
        statusBanner.className = success ? 'feedback-status success' : 'feedback-status error';
        statusBanner.innerHTML = success 
            ? '<i class="fas fa-check-circle"></i> <strong>Lösung korrekt!</strong> Alle Schritte sind richtig.'
            : '<i class="fas fa-exclamation-triangle"></i> <strong>Fehler gefunden</strong> - Prüfe die markierten Schritte.';
        feedbackContent.appendChild(statusBanner);

        const hintState = this.solutionState.hintState || { prepared: { level1: [], level2: [] }, unlockedLevel: 0, popupOpen: false };
        const preparedHints = hintState.prepared || { level1: [], level2: [] };

        // Hint-Popup (zentral) + Reopen-Button
        if (hintState.unlockedLevel >= 1 && preparedHints.level1 && preparedHints.level1.length > 0) {
            const reopenBtn = document.createElement('button');
            reopenBtn.className = 'btn btn-ghost btn-sm hint-reopen-btn';
            reopenBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Hint-Popup öffnen';
            reopenBtn.addEventListener('click', () => {
                this.showGlobalHintPopup();
            });
            feedbackContent.appendChild(reopenBtn);

            // Zeige Popup sofort, wenn popupOpen true ist
            if (hintState.popupOpen) {
                // Kurze Verzögerung, damit feedbackContent erst fertig gerendert wird
                setTimeout(() => this.showGlobalHintPopup(), 50);
            }
        }

        // Level-2-Hints nach StepIndex gruppieren (nur sichtbar, wenn freigeschaltet)
        const level2ByStep = {};
        if (hintState.unlockedLevel >= 2 && preparedHints.level2) {
            preparedHints.level2.forEach(h => {
                if (!level2ByStep[h.stepIndex]) {
                    level2ByStep[h.stepIndex] = [];
                }
                level2ByStep[h.stepIndex].push(h);
            });
        }
        
        // Prüfe ob Vergleichsansicht nötig ist (Level 3 oder korrekte Lösung nach Fehlern)
        const hasComparison = analysis.comparison && analysis.comparison.correctSteps && analysis.comparison.correctSteps.length > 0;
        const lastAnalysis = this.solutionState.lastAnalysis;
        const wrongSteps = hasComparison ? (lastAnalysis?.steps || analysis.steps) : null;

        // Steps rendern - entweder als Vergleich oder normal
        if (hasComparison && wrongSteps) {
            // Vergleichsansicht: Falsch vs. Korrekt nebeneinander
            const comparisonView = this.renderComparisonView(
                wrongSteps, 
                analysis.comparison.correctSteps, 
                analysis.comparison.mappings || []
            );
            feedbackContent.appendChild(comparisonView);
        } else if (analysis.steps && analysis.steps.length > 0) {
            // Normale Ansicht
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'tutor-steps-wrapper';
            
            const stepsHeader = document.createElement('h4');
            stepsHeader.className = 'tutor-section-header';
            stepsHeader.innerHTML = '<i class="fas fa-list-ol"></i> Dein Lösungsweg';
            stepsContainer.appendChild(stepsHeader);
            
            const stepsList = document.createElement('div');
            stepsList.className = 'tutor-step-list';
            
            analysis.steps.forEach((step, idx) => {
                const stepEl = this.renderAnalysisStep(step, idx, analysis.steps.length, level2ByStep[step.index || idx + 1] || []);
                stepsList.appendChild(stepEl);
            });
            
            stepsContainer.appendChild(stepsList);
            feedbackContent.appendChild(stepsContainer);
        }
        
        // Kurzes Feedback anzeigen (nach Steps)
        if (analysis.feedback && analysis.feedback.summarySentence) {
            const feedbackSummary = document.createElement('div');
            feedbackSummary.className = 'feedback-summary-box';
            feedbackSummary.innerHTML = `
                <i class="fas fa-comment-dots"></i>
                <span>${analysis.feedback.summarySentence}</span>
            `;
            feedbackContent.appendChild(feedbackSummary);
        }
        
        // Ausführliches Feedback anzeigen (bei feedbackLevel="detailed")
        if (analysis.detailedFeedback && analysis.feedbackLevel === 'detailed') {
            const detailedFB = this.renderDetailedFeedbackBox(analysis.detailedFeedback);
            feedbackContent.appendChild(detailedFB);
        }
        
        // UI-Elemente rendern (falls vorhanden)
        if (analysis.uiElements && analysis.uiElements.length > 0) {
            const uiContainer = document.createElement('div');
            uiContainer.className = 'tutor-ui-elements';
            
            analysis.uiElements.forEach(elem => {
                const elemEl = this.renderUiElement(elem);
                if (elemEl) {
                    uiContainer.appendChild(elemEl);
                }
            });
            
            feedbackContent.appendChild(uiContainer);
        }
        
        // Zusammenfassung der Fehler (am Ende)
        if (!success) {
            const errorSummary = this.createErrorSummary(analysis.steps);
            feedbackContent.appendChild(errorSummary);
        }
        
        // MathJax rendern und dann Formeln klickbar machen
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([feedbackContent])
                .then(() => {
                    // Mache Funktionsformeln klickbar für Graph-Anzeige
                    if (window.GraphRenderer && window.GraphRenderer.makeFormulasClickable) {
                        window.GraphRenderer.makeFormulasClickable(feedbackContent);
                    }
                })
                .catch(err => {
                    console.error('[MathJax] Rendering error:', err);
                });
        } else {
            // Fallback ohne MathJax
            if (window.GraphRenderer && window.GraphRenderer.makeFormulasClickable) {
                window.GraphRenderer.makeFormulasClickable(feedbackContent);
            }
        }
    }

    /**
     * Rendert einen einzelnen Analyse-Step (Test-Format)
     */
    renderAnalysisStep(step, idx, totalSteps, level2Hints = []) {
        const stepEl = document.createElement('div');
        const hasError = step.errorType && step.errorType !== 'none';
        const stepIndex = step.index || idx + 1;
        const hasLevel2Hints = Array.isArray(level2Hints) && level2Hints.length > 0;
        
        // Fehlertyp-Klasse
        const errorClass = {
            'none': 'step-correct',
            'logic': 'step-error-logic',
            'calc': 'step-error-calc',
            'followup': 'step-error-followup',
            'formal': 'step-error-formal'
        }[step.errorType] || 'step-correct';
        
        stepEl.className = `tutor-step ${errorClass} ${hasError ? 'has-error' : ''} ${hasLevel2Hints ? 'has-level2-hint' : ''}`.trim();
        stepEl.dataset.stepIndex = stepIndex;
        
        // Header mit Schritt-Nummer und errorType-Badge
        const headerEl = document.createElement('div');
        headerEl.className = 'step-header';
        
        const stepNumEl = document.createElement('span');
        stepNumEl.className = 'step-number';
        stepNumEl.textContent = `Schritt ${stepIndex}`;
        headerEl.appendChild(stepNumEl);
        
        // errorType Badge (immer anzeigen)
        const errorTypeEl = document.createElement('span');
        errorTypeEl.className = `step-error-type ${hasError ? 'has-error' : ''}`;
        errorTypeEl.textContent = step.errorType || 'none';
        headerEl.appendChild(errorTypeEl);
        
        stepEl.appendChild(headerEl);
        
        // Content-Bereich
        const contentEl = document.createElement('div');
        contentEl.className = 'step-content';
        
        // rawText zuerst anzeigen
        if (step.rawText) {
            const rawEl = document.createElement('div');
            rawEl.className = 'step-raw';
            rawEl.textContent = step.rawText;
            contentEl.appendChild(rawEl);
        }
        
        // LaTeX-Darstellung
        if (step.latex) {
            const latexEl = document.createElement('div');
            latexEl.className = 'step-latex';
            
            // Bereinige das LaTeX (entferne eventuell noch vorhandene Delimiter)
            let cleanLatex = step.latex;
            if (typeof stripLatexDelimiters === 'function') {
                cleanLatex = stripLatexDelimiters(cleanLatex);
            }
            
            // Füge passende Delimiter hinzu
            if (cleanLatex.includes('\\\\') || cleanLatex.includes('\\begin')) {
                latexEl.innerHTML = `\\[${cleanLatex}\\]`;
            } else {
                latexEl.innerHTML = `\\(${cleanLatex}\\)`;
            }
            contentEl.appendChild(latexEl);
        }
        
        stepEl.appendChild(contentEl);
        
        // Stufe-2-Hinweise inline anzeigen (falls freigeschaltet)
        if (hasLevel2Hints) {
            const annotations = document.createElement('div');
            annotations.className = 'step-hint-annotations';
            level2Hints.forEach(hint => {
                const box = document.createElement('div');
                const colorClass = hint.color ? `hint-annotation-${hint.color}` : 'hint-annotation-blue';
                box.className = `hint-annotation ${colorClass}`;

                const title = document.createElement('div');
                title.className = 'hint-annotation-title';
                title.textContent = hint.title || 'Hint';
                box.appendChild(title);

                if (hint.latex) {
                    const latexEl = document.createElement('div');
                    latexEl.className = 'hint-annotation-latex';
                    let cleanLatex = hint.latex;
                    if (typeof stripLatexDelimiters === 'function') {
                        cleanLatex = stripLatexDelimiters(cleanLatex);
                    }
                    latexEl.innerHTML = `\\(${cleanLatex}\\)`;
                    box.appendChild(latexEl);
                }

                annotations.appendChild(box);
            });
            stepEl.appendChild(annotations);
        }

        // Operation zum nächsten Schritt
        if (step.operation) {
            const opEl = document.createElement('div');
            opEl.className = 'step-operation';
            opEl.innerHTML = `→ ${step.operation}`;
            stepEl.appendChild(opEl);
        }
        
        // Korrektur-Bereich für Fehler
        if (hasError) {
            // Korrektur-Badge (falls vorhanden)
            if (this.stepCorrections && this.stepCorrections[stepIndex]) {
                const corrBadge = document.createElement('span');
                corrBadge.className = 'step-has-correction';
                corrBadge.innerHTML = '<i class="fas fa-edit"></i> Korrigiert';
                stepEl.appendChild(corrBadge);
            }
            
            // Eingabefeld-Container für Korrekturen
            const correctionContainer = document.createElement('div');
            correctionContainer.className = 'step-correction-container';
            correctionContainer.innerHTML = `
                <label class="step-correction-label">
                    <i class="fas fa-pencil-alt"></i>
                    Deine Korrektur für Schritt ${stepIndex}:
                </label>
                <textarea 
                    class="step-correction-input" 
                    data-step-index="${stepIndex}"
                    placeholder="Gib hier deine korrigierte Version ein..."
                    rows="2"
                >${this.stepCorrections && this.stepCorrections[stepIndex] ? this.stepCorrections[stepIndex] : ''}</textarea>
            `;
            stepEl.appendChild(correctionContainer);
            
            // Click-Handler zum Auf-/Zuklappen
            stepEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('step-correction-input')) {
                    return;
                }
                stepEl.classList.toggle('expanded');
            });
            
            // Input-Handler für Korrekturen
            const textarea = correctionContainer.querySelector('.step-correction-input');
            textarea.addEventListener('input', (e) => {
                this.updateStepCorrection(stepIndex, e.target.value);
            });
            
            textarea.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        return stepEl;
    }

    /**
     * Rendert die Vergleichsansicht: Fehlerhafter Weg vs. Korrekter Weg nebeneinander
     */
    renderComparisonView(wrongSteps, correctSteps, mappings) {
        const container = document.createElement('div');
        container.className = 'comparison-container';

        // Header mit Trennlinie
        const headerRow = document.createElement('div');
        headerRow.className = 'comparison-header';
        headerRow.innerHTML = `
            <div class="comparison-col comparison-wrong-header">
                <i class="fas fa-times-circle"></i> Dein Weg
            </div>
            <div class="comparison-divider"></div>
            <div class="comparison-col comparison-correct-header">
                <i class="fas fa-check-circle"></i> Korrekt
            </div>
        `;
        container.appendChild(headerRow);

        // Erstelle Mapping-Lookup
        const mappingByWrongIndex = {};
        const mappingByCorrectIndex = {};
        (mappings || []).forEach(m => {
            mappingByWrongIndex[m.wrongStepIndex] = m;
            mappingByCorrectIndex[m.correctStepIndex] = m;
        });

        // Bestimme die maximale Anzahl an Schritten
        const maxSteps = Math.max(wrongSteps?.length || 0, correctSteps?.length || 0);

        for (let i = 0; i < maxSteps; i++) {
            const wrongStep = wrongSteps?.[i];
            const correctStep = correctSteps?.[i];
            const mapping = wrongStep ? mappingByWrongIndex[wrongStep.index || i + 1] : 
                           (correctStep ? mappingByCorrectIndex[correctStep.index || i + 1] : null);

            const row = document.createElement('div');
            row.className = 'comparison-row';

            // Linke Spalte: Falscher Schritt
            const wrongCol = document.createElement('div');
            wrongCol.className = 'comparison-col comparison-wrong';
            if (wrongStep) {
                const hasError = wrongStep.errorType && wrongStep.errorType !== 'none';
                wrongCol.innerHTML = `
                    <div class="comparison-step ${hasError ? 'has-error' : ''}">
                        <span class="comparison-step-num">${wrongStep.index || i + 1}.</span>
                        <span class="comparison-step-latex">\\(${stripLatexDelimiters(wrongStep.latex || '')}\\)</span>
                        ${hasError ? `<span class="comparison-error-badge">${wrongStep.errorType}</span>` : ''}
                    </div>
                `;
            } else {
                wrongCol.innerHTML = `<div class="comparison-step comparison-empty">—</div>`;
            }
            row.appendChild(wrongCol);

            // Trennlinie
            const divider = document.createElement('div');
            divider.className = 'comparison-divider';
            row.appendChild(divider);

            // Rechte Spalte: Korrekter Schritt
            const correctCol = document.createElement('div');
            correctCol.className = 'comparison-col comparison-correct';
            if (correctStep) {
                correctCol.innerHTML = `
                    <div class="comparison-step correct">
                        <span class="comparison-step-num">${correctStep.index || i + 1}.</span>
                        <span class="comparison-step-latex">\\(${stripLatexDelimiters(correctStep.latex || '')}\\)</span>
                        <span class="comparison-correct-badge"><i class="fas fa-check"></i></span>
                    </div>
                `;
            } else {
                correctCol.innerHTML = `<div class="comparison-step comparison-empty">—</div>`;
            }
            row.appendChild(correctCol);

            container.appendChild(row);

            // Erklärung falls Mapping vorhanden
            if (mapping && mapping.explanation) {
                const explanationRow = document.createElement('div');
                explanationRow.className = 'comparison-explanation';
                explanationRow.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <span>${mapping.explanation}</span>
                `;
                container.appendChild(explanationRow);
            }
        }

        return container;
    }

    /**
     * Rendert das ausführliche Feedback als Box in der Hauptansicht
     */
    renderDetailedFeedbackBox(detailedFeedback) {
        const container = document.createElement('div');
        container.className = 'detailed-feedback-box';

        const header = document.createElement('div');
        header.className = 'detailed-feedback-header';
        header.innerHTML = '<i class="fas fa-graduation-cap"></i> Ausführliches Feedback';
        container.appendChild(header);

        const content = document.createElement('div');
        content.className = 'detailed-feedback-content';

        // Stärken
        if (detailedFeedback.strengths && detailedFeedback.strengths.length > 0) {
            const section = document.createElement('div');
            section.className = 'feedback-section feedback-strengths';
            section.innerHTML = `
                <h5><i class="fas fa-check-circle"></i> Was gut war</h5>
                <ul>${detailedFeedback.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
            `;
            content.appendChild(section);
        }

        // Schwächen
        if (detailedFeedback.weaknesses && detailedFeedback.weaknesses.length > 0) {
            const section = document.createElement('div');
            section.className = 'feedback-section feedback-weaknesses';
            section.innerHTML = `
                <h5><i class="fas fa-exclamation-triangle"></i> Verbesserungspotential</h5>
                <ul>${detailedFeedback.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
            `;
            content.appendChild(section);
        }

        // Merksätze
        if (detailedFeedback.tips && detailedFeedback.tips.length > 0) {
            const section = document.createElement('div');
            section.className = 'feedback-section feedback-tips';
            section.innerHTML = `
                <h5><i class="fas fa-lightbulb"></i> Merksätze</h5>
                <ul>${detailedFeedback.tips.map(t => `<li>${t}</li>`).join('')}</ul>
            `;
            content.appendChild(section);
        }

        // Ermutigung
        if (detailedFeedback.encouragement) {
            const section = document.createElement('div');
            section.className = 'feedback-section feedback-encouragement';
            section.innerHTML = `<p><i class="fas fa-heart"></i> ${detailedFeedback.encouragement}</p>`;
            content.appendChild(section);
        }

        container.appendChild(content);
        return container;
    }

    /**
     * Aktualisiert eine Step-Korrektur
     */
    updateStepCorrection(stepIndex, value) {
        if (!this.stepCorrections) {
            this.stepCorrections = {};
        }
        
        if (value.trim()) {
            this.stepCorrections[stepIndex] = value.trim();
        } else {
            delete this.stepCorrections[stepIndex];
        }
        
        // Zeige Hinweis wenn Korrekturen vorhanden
        this.updateCorrectionHint();
    }

    /**
     * Zeigt/versteckt den Hinweis für erneutes Prüfen
     */
    updateCorrectionHint() {
        const feedbackContent = document.getElementById('feedback-content');
        if (!feedbackContent) return;
        
        // Entferne existierenden Hinweis
        const existingHint = feedbackContent.querySelector('.correction-hint');
        if (existingHint) {
            existingHint.remove();
        }
        
        // Zeige Hinweis wenn Korrekturen vorhanden
        if (this.stepCorrections && Object.keys(this.stepCorrections).length > 0) {
            const hint = document.createElement('div');
            hint.className = 'correction-hint';
            hint.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>Du hast ${Object.keys(this.stepCorrections).length} Korrektur(en) eingegeben. 
                Klicke auf "Lösung überprüfen" um deine Änderungen zu prüfen.</span>
            `;
            feedbackContent.appendChild(hint);
        }
    }

    /**
     * Rendert ein UI-Element
     */
    renderUiElement(elem) {
        const container = document.createElement('div');
        container.className = `tutor-ui-element ui-${elem.type} ui-color-${elem.color || 'blue'}`;
        
        if (elem.title) {
            const titleEl = document.createElement('strong');
            titleEl.textContent = elem.title;
            container.appendChild(titleEl);
        }
        
        if (elem.text) {
            const textEl = document.createElement('span');
            textEl.textContent = elem.text;
            container.appendChild(textEl);
        }
        
        return container;
    }

    /**
     * Erstellt eine Zusammenfassung der Fehler
     */
    createErrorSummary(steps) {
        const summary = document.createElement('div');
        summary.className = 'error-summary';
        
        const counts = {
            logic: 0,
            calc: 0,
            followup: 0,
            formal: 0
        };
        
        steps.forEach(step => {
            if (step.errorType && counts.hasOwnProperty(step.errorType)) {
                counts[step.errorType]++;
            }
        });
        
        const summaryItems = [];
        if (counts.logic > 0) summaryItems.push(`${counts.logic} Logikfehler`);
        if (counts.calc > 0) summaryItems.push(`${counts.calc} Rechenfehler`);
        if (counts.followup > 0) summaryItems.push(`${counts.followup} Folgefehler`);
        if (counts.formal > 0) summaryItems.push(`${counts.formal} Formfehler`);
        
        if (summaryItems.length > 0) {
            summary.innerHTML = `
                <h5><i class="fas fa-chart-bar"></i> Fehlerübersicht</h5>
                <p>${summaryItems.join(' • ')}</p>
                <p class="hint">Nutze "Hints anzeigen", um fokussierte Hinweise zu erhalten.</p>
            `;
        }
        
        return summary;
    }

    async toggleHints() {
        if (!this.solutionState.lastAnalysis) {
            return;
        }

        if (this.solutionState.lastWasCorrect === true) {
            return;
        }

        const hintState = this.solutionState.hintState || { prepared: { level1: [], level2: [] }, unlockedLevel: 0, popupOpen: false };
        const prepared = hintState.prepared || { level1: [], level2: [] };
        const hasHints = (prepared.level1 && prepared.level1.length > 0) || (prepared.level2 && prepared.level2.length > 0);

        // Wenn keine Hints vorhanden sind, aber die Lösung fehlerhaft ist,
        // erlaube direktes Springen zu Level 2 (dann Level 3 = Lösung anzeigen)
        let unlockedLevel = hintState.unlockedLevel || 0;
        
        if (!hasHints && unlockedLevel < 2) {
            // Keine Hints verfügbar - direkt zu Level 2 springen
            unlockedLevel = 2;
            this.solutionState.hintState = {
                prepared,
                unlockedLevel,
                popupOpen: false
            };
            // Nächster Klick zeigt dann Lösung (Level 3)
            return;
        }

        if (unlockedLevel === 0) {
            unlockedLevel = 1;
            hintState.popupOpen = true;
        } else if (unlockedLevel === 1) {
            unlockedLevel = 2;
            hintState.popupOpen = true; // Popup erneut öffnen und Level2 anzeigen
        } else if (unlockedLevel === 2) {
            // Level 3: Lösung mit Erklärungen anfordern
            unlockedLevel = 3;
            this.solutionState.hintState = {
                prepared,
                unlockedLevel,
                popupOpen: false // Popup erst nach Laden der Lösung öffnen
            };
            await this.requestSolutionWithExplanation();
            return; // requestSolutionWithExplanation ruft displayStructuredFeedback selbst auf
        } else {
            hintState.popupOpen = true; // Erlaubt erneutes Öffnen des Popups bei Level 3
        }

        this.solutionState.hintState = {
            prepared,
            unlockedLevel,
            popupOpen: hintState.popupOpen
        };

        // Track hint usage
        try {
            if (this.performanceTracker) {
                this.performanceTracker.recordHintUsed();
            }
            if (this.userId && this.behaviorTracker) {
                await this.behaviorTracker.trackHintRequest(this.userId, {
                    topic: this.currentTaskContext?.topic
                });
            }
        } catch (logError) {
            console.warn('[Hints] Tracking failed:', logError);
        }

        // Im Test-Modus kein displayStructuredFeedback aufrufen (TestManager zeigt eigene UI)
        if (!this.isTestMode) {
            this.displayStructuredFeedback(this.solutionState.lastAnalysis, this.solutionState.lastWasCorrect);
        }
        this.updateSolutionActionButtons();
    }

    /**
     * Level 3: Lösung mit ausführlicher Erklärung und Vergleich anfordern
     */
    async requestSolutionWithExplanation() {
        this.showLoading(true);

        try {
            const lastAnalysis = this.solutionState.lastAnalysis;
            const previousAnalyses = this.solutionState.previousAnalyses || [];
            
            // Formatiere vorherige Versuche für Kontext
            let previousAttemptsText = '';
            if (previousAnalyses.length > 0) {
                previousAttemptsText = '\n=== VORHERIGE LÖSUNGSVERSUCHE ===\n';
                previousAnalyses.forEach((analysis, idx) => {
                    previousAttemptsText += `Versuch ${idx + 1}:\n`;
                    if (analysis.steps) {
                        analysis.steps.forEach(step => {
                            const errorLabel = step.errorType && step.errorType !== 'none' 
                                ? ` [${step.errorType}]` 
                                : ' [korrekt]';
                            previousAttemptsText += `  Schritt ${step.index}: ${step.latex}${errorLabel}\n`;
                        });
                    }
                    previousAttemptsText += '\n';
                });
            }

            // Formatiere letzten (aktuellen) Versuch
            let currentAttemptText = '=== AKTUELLER LÖSUNGSVERSUCH (FEHLERHAFT) ===\n';
            if (lastAnalysis && lastAnalysis.steps) {
                lastAnalysis.steps.forEach(step => {
                    const errorLabel = step.errorType && step.errorType !== 'none' 
                        ? ` [${step.errorType}]` 
                        : ' [korrekt]';
                    currentAttemptText += `Schritt ${step.index}: ${step.rawText || step.latex}${errorLabel}\n`;
                });
            }

            // GEKÜRZTER PROMPT - Feedback wird programmatisch aus Templates generiert
            const systemPrompt = `Erstelle Musterlösung für diese Mathe-Aufgabe als JSON:
{"steps":[{"index":1,"latex":"...","operation":"..."}],"comparison":{"mappings":[{"wrongStepIndex":1,"correctStepIndex":1,"explanation":"..."}],"correctSteps":[...]},"feedback":{"summarySentence":"..."},"isCorrect":false}
Nur reiner LaTeX-Inhalt (keine Delimiter). Vergleiche mit dem fehlerhaften Lösungsweg.`;

            const userPrompt = `Aufgabe: ${this.currentTask}
${currentAttemptText}
Erstelle die Musterlösung.`;

            // Verwende callErrorAnalysisAPI für strukturierte JSON-Ausgabe
            const prompts = { systemPrompt, userPrompt };
            const solutionData = await this.callErrorAnalysisAPI(prompts);

            // Sanitiere LaTeX in den Schritten
            if (solutionData.steps && Array.isArray(solutionData.steps)) {
                solutionData.steps = solutionData.steps.map(step => sanitizeStepLatex(step));
            }
            if (solutionData.comparison && solutionData.comparison.correctSteps) {
                solutionData.comparison.correctSteps = solutionData.comparison.correctSteps.map(step => sanitizeStepLatex(step));
            }
            
            // Generiere detailedFeedback programmatisch aus Templates
            const topic = this.currentTaskContext?.topic || 'algebra';
            if (typeof window.generateDetailedFeedback === 'function') {
                solutionData.detailedFeedback = window.generateDetailedFeedback(lastAnalysis, topic);
            }
            solutionData.feedbackLevel = 'detailed';
            solutionData.isCorrect = false;
            solutionData.hints = { level1: [], level2: [] };
            solutionData.uiElements = [];

            // Speichere die Level-3-Daten
            this.solutionState.level3Data = solutionData;
            this.solutionState.hintState = {
                ...this.solutionState.hintState,
                unlockedLevel: 3,
                popupOpen: true
            };

            // Zeige das Ergebnis mit Vergleichsansicht (nur im normalen Modus)
            // Im Test-Modus kümmert sich der TestManager um die Anzeige
            if (!this.isTestMode) {
                this.displayStructuredFeedback(solutionData, false);
            }
            this.updateSolutionActionButtons();

        } catch (error) {
            console.error('[Level3] Fehler bei Lösungsanfrage:', error);
            this.showNotification('Fehler beim Laden der Lösung: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Zeigt das Hint-Popup global an (unabhängig vom Feedback-Container)
     * Wird sowohl im normalen Modus als auch im Test-Modus verwendet
     */
    showGlobalHintPopup() {
        const hintState = this.solutionState.hintState || { prepared: { level1: [], level2: [] }, unlockedLevel: 0, popupOpen: false };
        const preparedHints = hintState.prepared || { level1: [], level2: [] };
        const level3Data = this.solutionState.level3Data;

        // Level 3: Zeige detailliertes Feedback-Popup
        if (hintState.unlockedLevel >= 3 && level3Data) {
            this.showLevel3Popup(level3Data);
            return;
        }

        if (hintState.unlockedLevel < 1 || !preparedHints.level1 || preparedHints.level1.length === 0) {
            return;
        }

        // Entferne vorhandenes Popup falls vorhanden
        const existingOverlay = document.getElementById('global-hint-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'global-hint-overlay';
        overlay.className = 'hint-modal-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        const modal = document.createElement('div');
        modal.className = 'hint-modal';

        const header = document.createElement('div');
        header.className = 'hint-modal-header';
        const titleText = hintState.unlockedLevel >= 2 ? 'Hints (Stufe 1 & 2)' : 'Hint Stufe 1';
        header.innerHTML = `<div class="hint-level1-title"><i class="fas fa-lightbulb"></i> ${titleText}</div>`;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'hint-modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Level 1 Chips
        const chipList = document.createElement('div');
        chipList.className = 'hint-chip-list';
        preparedHints.level1.forEach(h => {
            const chip = document.createElement('span');
            const colorClass = h.color === 'yellow' ? 'hint-chip-yellow' : `hint-chip-${h.color || 'orange'}`;
            chip.className = `tutor-hint-chip ${colorClass}`;
            chip.innerHTML = `<i class="fas fa-bolt"></i> ${h.label}`;
            chipList.appendChild(chip);
        });
        modal.appendChild(chipList);

        // Level 2 falls freigeschaltet
        if (hintState.unlockedLevel >= 2 && preparedHints.level2 && preparedHints.level2.length > 0) {
            const l2Container = document.createElement('div');
            l2Container.className = 'hint-level2-popup';
            l2Container.innerHTML = `<div class="hint-level2-title"><i class="fas fa-tools"></i> Stufe 2 Hinweise</div>`;
            preparedHints.level2.forEach(h => {
                const row = document.createElement('div');
                row.className = 'hint-level2-row';
                row.innerHTML = `
                    <span class="hint-level2-step">Schritt ${h.stepIndex}</span>
                    <span class="hint-level2-text">${h.title || 'Hint'}</span>
                    ${h.latex ? `<span class="hint-level2-formula">\\(${stripLatexDelimiters(h.latex)}\\)</span>` : ''}
                `;
                l2Container.appendChild(row);
            });
            modal.appendChild(l2Container);
        }

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // MathJax rendern falls vorhanden
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([modal]).catch(err => console.warn('MathJax error:', err));
        }
    }

    /**
     * Zeigt das Level-3-Popup mit detailliertem Feedback und Merksätzen
     */
    showLevel3Popup(level3Data) {
        // Entferne vorhandenes Popup
        const existingOverlay = document.getElementById('global-hint-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'global-hint-overlay';
        overlay.className = 'hint-modal-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        const modal = document.createElement('div');
        modal.className = 'hint-modal hint-modal-large';

        // Header
        const header = document.createElement('div');
        header.className = 'hint-modal-header';
        header.innerHTML = `<div class="hint-level1-title"><i class="fas fa-graduation-cap"></i> Lösung & Feedback</div>`;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'hint-modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Detailed Feedback Content
        const detailedFB = level3Data.detailedFeedback;
        if (detailedFB) {
            const feedbackContainer = document.createElement('div');
            feedbackContainer.className = 'detailed-feedback-popup';

            // Stärken
            if (detailedFB.strengths && detailedFB.strengths.length > 0) {
                const strengthsDiv = document.createElement('div');
                strengthsDiv.className = 'feedback-section feedback-strengths';
                strengthsDiv.innerHTML = `
                    <h5><i class="fas fa-check-circle"></i> Was gut war</h5>
                    <ul>${detailedFB.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                `;
                feedbackContainer.appendChild(strengthsDiv);
            }

            // Schwächen
            if (detailedFB.weaknesses && detailedFB.weaknesses.length > 0) {
                const weaknessesDiv = document.createElement('div');
                weaknessesDiv.className = 'feedback-section feedback-weaknesses';
                weaknessesDiv.innerHTML = `
                    <h5><i class="fas fa-exclamation-triangle"></i> Verbesserungspotential</h5>
                    <ul>${detailedFB.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
                `;
                feedbackContainer.appendChild(weaknessesDiv);
            }

            // Merksätze/Tips
            if (detailedFB.tips && detailedFB.tips.length > 0) {
                const tipsDiv = document.createElement('div');
                tipsDiv.className = 'feedback-section feedback-tips';
                tipsDiv.innerHTML = `
                    <h5><i class="fas fa-lightbulb"></i> Merksätze</h5>
                    <ul>${detailedFB.tips.map(t => `<li>${t}</li>`).join('')}</ul>
                `;
                feedbackContainer.appendChild(tipsDiv);
            }

            // Ermutigung
            if (detailedFB.encouragement) {
                const encouragementDiv = document.createElement('div');
                encouragementDiv.className = 'feedback-section feedback-encouragement';
                encouragementDiv.innerHTML = `
                    <p><i class="fas fa-heart"></i> ${detailedFB.encouragement}</p>
                `;
                feedbackContainer.appendChild(encouragementDiv);
            }

            modal.appendChild(feedbackContainer);
        }

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // MathJax rendern falls vorhanden
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([modal]).catch(err => console.warn('MathJax error:', err));
        }
    }

    /**
     * Generiert die Hilfestellung programmatisch - KEIN API-CALL mehr!
     * Die Markierung erfolgt basierend auf der letzten Analyse.
     */
    async requestHilfestellung() {
        if (this.solutionState.lastWasCorrect === null) {
            this.showNotification('Bitte reiche zuerst eine Lösung ein, damit Hilfestellungen erzeugt werden können.', 'info');
            return;
        }

        if (this.solutionState.lastWasCorrect === true) {
            this.showNotification('Hilfestellung ist nur nötig, wenn die Lösung noch fehlerhaft ist.', 'info');
            return;
        }

        if (!this.solutionState.lastAnalysis || !this.solutionState.lastAnalysis.steps) {
            this.showNotification('Keine Analyse verfügbar. Prüfe zuerst deine Lösung.', 'info');
            return;
        }

        // PROGRAMMATISCHE HILFESTELLUNG - KEIN API-CALL!
        const markedSteps = this.generateHilfestellung(this.solutionState.lastAnalysis);
        
        // Formatiere als LaTeX mit Farbmarkierungen
        let response = markedSteps.map(step => {
            const latex = step.latex || step.rawText || '';
            if (step.marked && step.displayClass) {
                // Farbe basierend auf errorType
                const colorMap = {
                    'error-logic': 'red',
                    'error-calc': 'orange', 
                    'error-followup': 'yellow',
                    'error-formal': 'blue'
                };
                const color = colorMap[step.displayClass] || 'red';
                return `\\color{${color}}{${latex}}`;
            }
            return latex;
        }).join(' \\\\ ');
        
        this.solutionState.hilfestellungProvided = true;
        this.solutionState.hilfestellungContent = response;
        this.solutionState.correctedProvided = false;
        this.displayFeedback(response);
        this.updateSolutionActionButtons();
    }
    
    /**
     * Generiert Hilfestellung (Markierung) programmatisch aus der Analyse
     * @param {Object} analysis - Die letzte Analyse
     * @returns {Array} - Schritte mit Markierungsinformation
     */
    generateHilfestellung(analysis) {
        if (!analysis || !analysis.steps) return [];
        
        return analysis.steps.map(step => {
            const colorClass = {
                'logic': 'error-logic',
                'calc': 'error-calc',
                'followup': 'error-followup',
                'formal': 'error-formal',
                'none': ''
            }[step.errorType || 'none'];
            
            return {
                ...step,
                displayClass: colorClass,
                marked: step.errorType && step.errorType !== 'none'
            };
        });
    }

    async requestCorrectedSolution() {
        if (!this.solutionState.hilfestellungProvided) {
            this.showNotification('Fordere zuerst eine Hilfestellung an, bevor du eine korrigierte Fassung abrufst.', 'info');
            return;
        }

        if (this.solutionState.lastWasCorrect === true) {
            this.showNotification('Deine Lösung ist bereits korrekt. Du kannst stattdessen den optimalen Lösungsweg abrufen.', 'info');
            return;
        }

        if (!this.solutionState.lastUserSolution) {
            this.showNotification('Bitte gib deinen Lösungsweg schriftlich ein, damit wir ihn korrigieren können.', 'warning');
            return;
        }

        if (this.solutionState.correctedProvided) {
            this.showNotification('Eine korrigierte Version wurde bereits erzeugt.', 'info');
            return;
        }

        this.showLoading(true);

        try {
            const prompt = this.buildCorrectedSolutionPrompt();
            const response = await this.callAIAPI(prompt, 'corrected', null, this.currentTaskContext?.topic);
            const STATUS_TOKEN = '__CORRECTION_STATUS:OK__';
            const success = response.includes(STATUS_TOKEN);
            const cleanedResponse = success
                ? response.replace(STATUS_TOKEN, '').trim()
                : response.trim();

            if (success) {
                Object.assign(this.solutionState, {
                    correctedProvided: true,
                    correctedContent: cleanedResponse,
                    hilfestellungEligible: false,
                    canRequestOptimal: true,
                    lastWasCorrect: true
                });
                this.displayFeedback(cleanedResponse);
            } else {
                this.solutionState.correctedProvided = false;
                this.solutionState.correctedContent = '';
                this.solutionState.hilfestellungEligible = true;
                this.solutionState.canRequestOptimal = false;
                this.displayFeedback(cleanedResponse);
                this.showNotification('Deine Lösung ist noch nicht vollständig korrekt. Schau sie dir erneut an oder fordere eine Hilfestellung an.', 'info');
            }
        } catch (error) {
            console.error('Fehler bei der korrigierten Lösung:', error);
            this.showNotification('Korrigierte Lösung konnte nicht erstellt werden: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.updateSolutionActionButtons();
        }
    }

    async requestOptimalSolution() {
        if (!this.solutionState.canRequestOptimal) {
            this.showNotification('Der optimale Lösungsweg wird erst nach einer korrekten oder korrigierten Lösung freigeschaltet.', 'info');
            return;
        }

        if (this.solutionState.optimalDelivered) {
            this.showNotification('Der optimale Lösungsweg wurde bereits angezeigt.', 'info');
            return;
        }

        this.showLoading(true);

        try {
            const prompt = this.buildOptimalSolutionPrompt();
            const response = await this.callAIAPI(prompt, 'optimal', null, this.currentTaskContext?.topic);
            this.solutionState.optimalDelivered = true;
            this.solutionState.optimalContent = response;
            this.displayFeedback(response);
        } catch (error) {
            console.error('Fehler beim optimalen Lösungsweg:', error);
            this.showNotification('Optimaler Lösungsweg konnte nicht erstellt werden: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.updateSolutionActionButtons();
        }
    }

    async showSolution() {
        // Bestätige, dass der Benutzer die Lösung sehen möchte
        if (!confirm('Möchtest du wirklich die Musterlösung sehen? Versuche es am besten erst selbst oder fordere einen Tipp an.')) {
            return;
        }
        
        // Log Behavior und prüfe auf Intervention
        let intervention = null;
        if (this.userId && this.behaviorTracker) {
            const result = await this.behaviorTracker.trackSolutionRequest(this.userId, {
                topic: this.currentTaskContext?.topic
            });
            
            // Speichere Intervention für Prompt-Anpassung (kein Alert mehr!)
            if (result.intervention && result.intervention.type === 'prompt_advice') {
                intervention = result.intervention;
                console.log('[MathTutorAI] Intervention aktiv:', intervention);
            }
        }
        
        this.showLoading(true);
        
        try {
            const prompt = `
Aufgabe:
${this.currentTask}

Bitte erstelle eine vollständige und detaillierte Musterlösung mit:
1. Schritt-für-Schritt-Erklärung
2. Allen notwendigen Zwischenschritten
3. Mathematisch korrekter Notation
4. Erklärungen zu jedem wichtigen Schritt
5. Dem finalen Ergebnis

Verwende eine klare Struktur und deutsche mathematische Terminologie.
`;
            
            const response = await this.callAIAPI(prompt, 'solution', null, this.currentTaskContext?.topic, intervention);
            
            // Log Performance (failed task - showed solution)
            if (this.userId && this.performanceTracker && this.currentTaskContext) {
                await this.performanceTracker.logPerformance(this.userId, {
                    topic: this.currentTaskContext.topic,
                    taskType: 'solve',
                    success: false,
                    difficulty: this.currentTaskContext.difficulty,
                    showedSolution: true
                });
            }
            
            this.displayFeedback(response);
            Object.assign(this.solutionState, {
                hilfestellungEligible: false,
                hilfestellungProvided: false,
                correctedProvided: false,
                canRequestOptimal: true
            });
            this.updateSolutionActionButtons();
            
            // Aktiviere Follow-up Chat nach Musterlösung
            this.enableFollowUpChat();
        } catch (error) {
            console.error('Fehler beim Abrufen der Lösung:', error);
            this.showNotification('Fehler beim Abrufen der Lösung: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayFeedback(content, canvasImages = []) {
        const feedbackArea = document.getElementById('feedback-area');
        const feedbackContent = document.getElementById('feedback-content');
        
        if (feedbackArea && feedbackContent) {
            let imagesHTML = '';
            if (canvasImages.length > 0) {
                imagesHTML = '<div class="submitted-drawings"><h5>Deine Zeichnungen:</h5><div class="drawing-previews">';
                canvasImages.forEach(img => {
                    imagesHTML += `
                        <div class="drawing-preview">
                            <img src="${img.data}" alt="${img.name}">
                            <p>${img.name}</p>
                        </div>
                    `;
                });
                imagesHTML += '</div></div>';
            }
            
            feedbackContent.innerHTML = imagesHTML + this.formatResponse(content);
            feedbackArea.style.display = 'block';
            
            // Scrolle zum Feedback
            feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // MathJax rendern
            this.renderMathJax(feedbackContent);
        }
    }

    formatResponse(content) {
        // DEBUG: Erweitere Formatierung für Mathematik-Inhalte mit LaTeX-Unterstützung
        let formattedContent = content;
        
        console.log('=== DEBUG MATH FORMATTING ===');
        console.log('1. Original content:', content);
        
        // Bereinige den Inhalt vor der Konvertierung
        formattedContent = this.cleanMathContent(formattedContent);
        console.log('2. After cleaning:', formattedContent);
        
        // Konvertiere nur explizite mathematische Notationen zu LaTeX
        formattedContent = this.convertMathNotation(formattedContent);
        console.log('3. After conversion:', formattedContent);
        
        // Standard-Formatierung
        formattedContent = formattedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/, '<p>$1</p>');
        
        console.log('4. Final formatted:', formattedContent);
        console.log('=== END DEBUG ===');
        
        return formattedContent;
    }

    cleanMathContent(content) {
        // Bereinige den Inhalt, ohne mathematische Ausdrücke zu beschädigen
        let cleaned = content;
        
        // Entferne nur offensichtlich falsche Escapes, nicht mathematische
        // Keine aggressive Bereinigung mehr - lasse LaTeX-Befehle intakt
        
        return cleaned;
    }

    convertMathNotation(content) {
        // Intelligente LaTeX-Konvertierung - nur wenn noch nicht konvertiert
        let converted = content;
        
        // Prüfe ob bereits MathJax-Delimiter vorhanden sind
        const hasDelimiters = /\\\(.*?\\\)|\\\[.*?\\\]/.test(content);
        
        if (hasDelimiters) {
            // Inhalt hat bereits MathJax-Delimiter, keine weitere Konvertierung nötig
            console.log('Content already has MathJax delimiters, skipping conversion');
            return converted;
        }
        
        // Konvertiere $...$ zu \(...\) für inline math
        converted = converted.replace(/\$([^\$]+)\$/g, '\\($1\\)');
        
        // Konvertiere $$...$$ zu \[...\] für display math
        converted = converted.replace(/\$\$([^\$]+)\$\$/g, '\\[$1\\]');
        
        // Schütze bereits korrekte LaTeX-Ausdrücke vor doppelter Konvertierung
        // Wrappen komplexer mathematischer Ausdrücke nur wenn sie noch nicht gewrappt sind
        // und NICHT einzelne Befehle wrappen
        
        return converted;
    }

    renderMathJax(element) {
        // Verbesserte MathJax-Rendering-Funktion mit besserer Fehlerbehandlung
        if (!window.MathJax) {
            console.warn('MathJax ist nicht verfügbar');
            return;
        }

        // Warten bis MathJax vollständig geladen ist
        if (MathJax.startup && MathJax.startup.promise) {
            MathJax.startup.promise.then(() => {
                this.performMathJaxRendering(element);
            }).catch((err) => {
                console.error('MathJax Startup Fehler:', err);
                this.fallbackMathJaxRendering(element);
            });
        } else {
            // Fallback für ältere MathJax-Versionen
            this.fallbackMathJaxRendering(element);
        }
    }

    performMathJaxRendering(element) {
        try {
            // Verwende die neueste MathJax API
            if (MathJax.typesetPromise) {
                MathJax.typesetPromise([element]).then(() => {
                    console.log('MathJax erfolgreich gerendert');
                }).catch((err) => {
                    console.error('MathJax Rendering Fehler:', err);
                    this.handleMathJaxError(element, err);
                });
            } else if (MathJax.Hub && MathJax.Hub.Queue) {
                // Fallback für MathJax 2.x
                MathJax.Hub.Queue(["Typeset", MathJax.Hub, element]);
            }
        } catch (err) {
            console.error('MathJax Rendering Exception:', err);
            this.handleMathJaxError(element, err);
        }
    }

    fallbackMathJaxRendering(element) {
        // Fallback mit verzögertem Rendering
        setTimeout(() => {
            if (window.MathJax) {
                this.performMathJaxRendering(element);
            } else {
                console.warn('MathJax nach Verzögerung immer noch nicht verfügbar');
            }
        }, 1000);
    }

    handleMathJaxError(element, error) {
        // Zeige eine benutzerfreundliche Fehlermeldung
        const errorDiv = document.createElement('div');
        errorDiv.className = 'math-error';
        errorDiv.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 1rem; margin: 1rem 0;">
                <p style="color: #dc2626; margin: 0;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Mathematische Formeln konnten nicht korrekt angezeigt werden. 
                    Bitte versuche es erneut oder verwende eine andere Formulierung.
                </p>
            </div>
        `;
        
        // Füge die Fehlermeldung vor dem Element ein
        element.parentNode.insertBefore(errorDiv, element);
        
        // Entferne die Fehlermeldung nach 10 Sekunden
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }

    clearTextInput() {
        document.getElementById('math-input').value = '';
        this.closeResults();
    }

    closeResults() {
        document.getElementById('results-section').style.display = 'none';
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loading-indicator');
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    showNotification(message, type = 'info') {
        // Einfache Benachrichtigung - kann später durch ein Toast-System ersetzt werden
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getBackendUrl(path = '') {
        if (!path) {
            return this.backendApiBase;
        }
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.backendApiBase}${normalizedPath}`;
    }

    // User Profile Management
    loadUserProfile() {
        const savedProfile = localStorage.getItem('user_profile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            this.populateProfileForm(profile);
            return profile;
        }
        return this.getDefaultProfile();
    }

    getDefaultProfile() {
        return {
            name: '',
            email: '',
            grade: 'abitur',
            learningGoal: 'abitur-prep',
            weakTopics: [],
            learningStyle: 'step-by-step',
            sessionLength: 'long',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }

    populateProfileForm(profile) {
        // Warte kurz, um sicherzustellen, dass alle DOM-Elemente verfügbar sind
        setTimeout(() => {
            const userNameEl = document.getElementById('user-name');
            const userEmailEl = document.getElementById('user-email');
            const learningStyleEl = document.getElementById('learning-style');
            
            if (userNameEl) userNameEl.value = profile.name || '';
            if (userEmailEl) {
                const emailValue = (this.currentUser && this.currentUser.email) || profile.email || '';
                userEmailEl.value = emailValue;
                profile.email = emailValue;
            }
            if (learningStyleEl) learningStyleEl.value = profile.learningStyle || 'step-by-step';

            // Setze Checkboxen für schwache Themen
            const weakTopicCheckboxes = document.querySelectorAll('#weak-topics input[type="checkbox"]');
            console.log('Gefundene Checkboxen:', weakTopicCheckboxes.length);
            console.log('Profil schwache Themen:', profile.weakTopics);
            
            if (weakTopicCheckboxes.length > 0 && profile.weakTopics) {
                weakTopicCheckboxes.forEach(checkbox => {
                    const isChecked = profile.weakTopics.includes(checkbox.value);
                    checkbox.checked = isChecked;
                    console.log(`Checkbox ${checkbox.value}: ${isChecked}`);
                });
            } else {
                console.warn('Checkboxen noch nicht verfügbar oder keine weakTopics im Profil');
            }

            // Lade API-Einstellungen
            this.loadApiSettings();
        }, 100);
    }

    loadApiSettings() {
        // Lade aktuelle API-Einstellungen
        const apiKey = localStorage.getItem('openai_api_key') || '';
        const provider = localStorage.getItem('api_provider') || 'openai';

        const apiKeyInput = document.getElementById('profile-api-key');
        const providerSelect = document.getElementById('profile-api-provider');

        if (apiKeyInput) apiKeyInput.value = apiKey;
        if (providerSelect) providerSelect.value = provider;

        // Aktualisiere Status
        this.updateApiKeyStatus();
    }

    updateApiKeyStatus() {
        const apiKey = localStorage.getItem('openai_api_key') || '';
        const statusElement = document.getElementById('api-key-status');
        
        if (statusElement) {
            if (apiKey && apiKey.length > 0) {
                statusElement.textContent = 'Konfiguriert ✓';
                statusElement.style.color = 'var(--success-color)';
            } else {
                statusElement.textContent = 'Nicht konfiguriert';
                statusElement.style.color = 'var(--error-color)';
            }
        }
    }

    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('profile-api-key');
        const toggleButton = document.getElementById('toggle-api-key');
        const icon = toggleButton.querySelector('i');
        
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            apiKeyInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    saveUserProfile() {
        const profile = {
            name: document.getElementById('user-name').value.trim(),
            email: (document.getElementById('user-email')?.value || this.currentUser?.email || '').trim(),
            grade: 'abitur',
            learningGoal: 'abitur-prep',
            weakTopics: this.getSelectedWeakTopics(),
            learningStyle: document.getElementById('learning-style').value,
            sessionLength: 'long',
            createdAt: this.userProfile.createdAt || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // Speichere API-Einstellungen
        const apiKey = document.getElementById('profile-api-key').value.trim();
        const apiProvider = document.getElementById('profile-api-provider').value;

        // Debugging
        console.log('Speichere Profil:', profile);
        console.log('Ausgewählte schwache Themen:', profile.weakTopics);
        console.log('API Provider:', apiProvider);

        // Validierung
        if (!profile.name) {
            this.showNotification('Bitte gib deinen Namen ein.', 'warning');
            return;
        }

        // Speichere Profil
        this.userProfile = profile;
        localStorage.setItem('user_profile', JSON.stringify(profile));

        // Speichere API-Einstellungen
        if (apiKey) {
            this.apiKey = apiKey;
            localStorage.setItem('openai_api_key', apiKey);
        }
        
        this.apiProvider = apiProvider;
        localStorage.setItem('api_provider', apiProvider);

        // Aktualisiere Status
        this.updateApiKeyStatus();
        
        this.showNotification('Profil und API-Einstellungen erfolgreich gespeichert!', 'success');
        
        // Aktualisiere KI-Prompts basierend auf dem Profil
        this.updateAIPrompts();
    }

    getSelectedWeakTopics() {
        const checkboxes = document.querySelectorAll('#weak-topics input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    resetUserProfile() {
        if (confirm('Möchtest du wirklich dein Profil zurücksetzen? Alle Daten gehen verloren.')) {
            const defaultProfile = this.getDefaultProfile();
            this.populateProfileForm(defaultProfile);
            this.userProfile = defaultProfile;
            localStorage.removeItem('user_profile');
            this.showNotification('Profil wurde zurückgesetzt.', 'info');
        }
    }

    updateAIPrompts() {
        // Aktualisiere die System-Prompts basierend auf dem Benutzerprofil
        console.log('KI-Prompts wurden basierend auf dem Profil aktualisiert:', this.userProfile);
    }

    enableFollowUpChat() {
        // Füge Chat-Bereich nach der Musterlösung hinzu
        const feedbackArea = document.getElementById('feedback-area');
        if (!feedbackArea) return;
        
        // Prüfe ob Chat-Bereich schon existiert
        let followUpSection = document.getElementById('followup-chat-section');
        if (followUpSection) {
            followUpSection.style.display = 'block';
            return;
        }
        
        // Erstelle neuen Chat-Bereich
        followUpSection = document.createElement('div');
        followUpSection.id = 'followup-chat-section';
        followUpSection.className = 'followup-chat-section';
        followUpSection.innerHTML = `
            <div class="followup-header">
                <i class="fas fa-comments"></i>
                <h4>Hast du noch Fragen zur Lösung?</h4>
            </div>
            <div class="followup-messages" id="followup-messages"></div>
            <div class="followup-input-area">
                <textarea 
                    id="followup-input" 
                    placeholder="Stelle hier deine Frage zur Lösung..."
                    rows="3"
                ></textarea>
                <button id="followup-send-btn" class="btn btn-primary">
                    <i class="fas fa-paper-plane"></i>
                    Frage senden
                </button>
            </div>
        `;
        
        // Füge nach feedback-area ein
        feedbackArea.parentNode.insertBefore(followUpSection, feedbackArea.nextSibling);
        
        // Event Listener für Send-Button
        const sendBtn = document.getElementById('followup-send-btn');
        const input = document.getElementById('followup-input');
        
        if (sendBtn && input) {
            const sendFollowUp = async () => {
                const question = input.value.trim();
                if (!question) return;
                
                // Zeige User-Frage
                this.addFollowUpMessage(question, 'user');
                input.value = '';
                
                // Sende an KI
                try {
                    this.showLoading(true);
                    const prompt = `
Kontext: Der Schüler hat sich gerade die Musterlösung für folgende Aufgabe angesehen:

${this.currentTask}

Er hat nun eine Folgefrage:
${question}

Beantworte die Frage verständlich und gehe gezielt auf seine Unsicherheit ein. Beziehe dich auf die Musterlösung und erkläre die relevanten Konzepte noch einmal.
`;
                    const response = await this.callAIAPI(prompt, 'analyze', null, this.currentTaskContext?.topic);
                    this.addFollowUpMessage(response, 'ai');
                } catch (error) {
                    console.error('Fehler bei Follow-up Frage:', error);
                    this.showNotification('Fehler: ' + error.message, 'error');
                } finally {
                    this.showLoading(false);
                }
            };
            
            sendBtn.addEventListener('click', sendFollowUp);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    sendFollowUp();
                }
            });
        }
    }
    
    addFollowUpMessage(content, sender) {
        const messagesContainer = document.getElementById('followup-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `followup-message followup-message-${sender}`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-header">
                    <i class="fas fa-user"></i>
                    <span>Du</span>
                </div>
                <div class="message-content">${this.escapeHtml(content)}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-header">
                    <i class="fas fa-robot"></i>
                    <span>KI-Tutor</span>
                </div>
                <div class="message-content">${this.formatResponse(content)}</div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        
        // Scrolle zu neuer Nachricht
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Rendere MathJax für KI-Antworten
        if (sender === 'ai') {
            this.renderMathJax(messageDiv);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async getPersonalizedPrompt(basePrompt, type, topic = null, intervention = null) {
        // Erweiterte Personalisierung mit AI-Advice-System
        let personalizedPrompt = basePrompt;
        
        // Legacy Profil-Personalisierung (Backward Compatibility)
        const profile = this.userProfile;
        if (profile) {
            if (profile.learningStyle === 'visual') {
                personalizedPrompt += '\nVerwende visuelle Elemente wie Diagramme oder Grafiken in deiner Erklärung.';
            } else if (profile.learningStyle === 'step-by-step') {
                personalizedPrompt += '\nErkläre jeden Schritt detailliert und strukturiert.';
            } else if (profile.learningStyle === 'conceptual') {
                personalizedPrompt += '\nFokussiere auf das konzeptuelle Verständnis und die Zusammenhänge.';
            } else if (profile.learningStyle === 'practical') {
                personalizedPrompt += '\nVerwende viele praktische Beispiele und Anwendungen.';
            }

            if (profile.grade) {
                personalizedPrompt += `\nDas Lernniveau entspricht Klasse ${profile.grade}.`;
            }
        }
        
        // Neues AI-Advice-System
        if (this.userId && this.promptAdvisor) {
            try {
                const advice = await this.promptAdvisor.generateAdvice(this.userId, topic, type, intervention);
                personalizedPrompt += advice;
            } catch (error) {
                console.error('[MathTutorAI] Failed to generate AI advice:', error);
                // Continue with basic personalization
            }
        }
        
        return personalizedPrompt;
    }
}

// Initialisierung der Anwendung
document.addEventListener('DOMContentLoaded', () => {
    new MathTutorAI();
});

// Service Worker für Offline-Funktionalität (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
