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
                            enum: ["red", "green", "orange", "blue"],
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
        required: ["steps", "uiElements", "feedback"],
        additionalProperties: false
    }
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
     * @param {boolean} forceIncorrect - null=zufällig, true=fehlerhaft, false=korrekt
     * @returns {Promise<Object>} Test-Ergebnis
     */
    async runSingleTest(forceIncorrect = null) {
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
        
        this.isRunning = true;
        this.tutor.showLoading(true);
        
        try {
            // Zufällige Aufgabe und Lösung wählen
            const task = window.TestData.getRandomTestTask();
            const solution = window.TestData.getRandomSolution(task, forceIncorrect);
            
            console.log('[TestManager] Starte Test:', {
                taskId: task.id,
                isCorrect: solution.isCorrect,
                expectedErrors: solution.expectedErrors
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
            
            // Test-Hooks ausführen
            const hookResults = await this.runTestHooks(task, solution, analysis);
            
            // Ergebnis zusammenstellen
            const result = {
                task: task,
                solution: solution,
                analysis: analysis,
                hookResults: hookResults,
                timestamp: new Date().toISOString(),
                allPassed: hookResults.every(h => h.passed)
            };
            
            // Ergebnis anzeigen
            this.displayTestResult(result);
            
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
            const uploadZone = document.getElementById('upload-zone');
            const descriptionArea = document.getElementById('image-description-area');

        if (!previewWrapper || !previewList || !uploadZone || !descriptionArea) {
            return;
        }

        previewList.innerHTML = '';

        const uploadHint = uploadZone.querySelector('.upload-hint');
        if (uploadHint) {
            uploadHint.textContent = this.uploadedImages.length > 0
                ? 'Weitere Bilder hinzufügen oder hierher ziehen'
                : 'Klicke hier oder ziehe ein Bild hierher';
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

            const caption = document.createElement('p');
            caption.className = 'preview-name';
            caption.textContent = image.name || `Bild ${index + 1}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'preview-remove-btn';
            removeBtn.type = 'button';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', () => this.removeImageByIndex(index));

            item.appendChild(img);
            item.appendChild(removeBtn);
            item.appendChild(caption);
            previewList.appendChild(item);
        });

        previewWrapper.style.display = 'block';
            descriptionArea.style.display = 'block';
        uploadZone.style.display = 'block';
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
            optimalContent: ''
        };
    }

    resetSolutionStateForNewTask() {
        this.solutionState = this.getDefaultSolutionState();
        this.stepCorrections = {};  // Reset step corrections
        this.updateSolutionActionButtons();
    }

    getSolutionActionNote() {
        if (!this.solutionState.lastUserSolution) {
            return 'Reiche eine Lösung ein, um Hilfestellungen freizuschalten.';
        }
        if (this.solutionState.lastWasCorrect === true) {
            return 'Deine Lösung ist korrekt! Optional kannst du dir einen optimalen Lösungsweg anzeigen lassen.';
        }
        if (this.solutionState.correctedProvided) {
            return 'Die korrigierte Version liegt vor. Schau dir jetzt den optimalen Lösungsweg an.';
        }
        if (this.solutionState.hilfestellungProvided) {
            return 'Korrigiere deine Lösung oder lass dir bei Bedarf eine korrigierte Fassung anzeigen.';
        }
        if (this.solutionState.hilfestellungEligible) {
            return 'Hilfestellung verfügbar: Lass dir deinen Lösungsweg mit Markierungen anzeigen.';
        }
        return 'Reiche erneut eine Lösung ein, damit wir gezielt helfen können.';
    }

    updateSolutionActionButtons() {
        const hilfestellungBtn = document.getElementById('request-hilfestellung');
        const correctedBtn = document.getElementById('request-corrected');
        const optimalBtn = document.getElementById('request-optimal');
        const noteElement = document.getElementById('solution-action-note');

        if (hilfestellungBtn) {
            const eligible = this.solutionState.hilfestellungEligible
                && !!this.solutionState.lastUserSolution
                && !this.solutionState.correctedProvided
                && this.solutionState.lastWasCorrect === false;
            hilfestellungBtn.disabled = !eligible;
        }

        if (correctedBtn) {
            const canCorrect = this.solutionState.hilfestellungProvided
                && this.solutionState.lastWasCorrect === false
                && !this.solutionState.correctedProvided
                && !!this.solutionState.lastUserSolution;
            correctedBtn.disabled = !canCorrect;
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
        const variationInstruction = this.getAbiVariationInstruction();
        const metadataParts = [];
        if (task.year) metadataParts.push(`Jahrgang: ${task.year}`);
        if (task.subject) metadataParts.push(`Schwerpunkt: ${task.subject}`);
        if (task.tags && task.tags.length > 0) metadataParts.push(`Tags: ${task.tags.join(', ')}`);

        const metadataSection = metadataParts.length > 0
            ? `Metadaten: ${metadataParts.join(' | ')}`
            : 'Metadaten: Keine zusätzlichen Angaben';

        const extractedText = task.pdfText
            ? this.truncateText(task.pdfText.trim(), 7000)
            : 'Hinweis: Für diese Aufgabe konnte kein Text automatisch extrahiert werden. Bitte erstelle dennoch eine passende Variation basierend auf den bekannten Metadaten.';

        const weakTopics = this.userProfile?.weakTopics || [];
        const instructions = [
            'Bewahre die mathematische Kernidee und den Schwierigkeitsgrad.',
            'Passe Kontextdetails an (z.B. beteiligte Personen, reale Gegenstände, Szenario, erzählerische Elemente).',
            'Du darfst Zahlenwerte geringfügig verändern (maximal ±15 %), sofern die Aufgabe konsistent bleibt.',
            'Formuliere die neue Aufgabe klar in deutscher Sprache und nutze LaTeX für mathematische Ausdrücke wie üblich.',
            'Gib ausschließlich die neue Aufgabenstellung aus – keine Lösungen, keine Hinweise, keine Erklärungen.',
            'Struktur und Umfang sollen dem Original entsprechen.',
            variationInstruction
        ];

        if (weakTopics.length > 0) {
            instructions.push(`Berücksichtige, dass der Schüler zusätzlich an folgenden Themen arbeiten möchte: ${weakTopics.join(', ')}.`);
        }

        const instructionBlock = instructions
            .map((instruction, index) => `${index + 1}. ${instruction}`)
            .join('\n');

        return `
Du erhältst eine originale Abitur-Aufgabe aus Sachsen. Erstelle darauf basierend eine leicht variierte Abitur-Aufgabe, die weiterhin den offiziellen Anforderungen entspricht.

WICHTIG:
${instructionBlock}

${metadataSection}

ORIGINALTEXT DER AUFGABE (nur zur Analyse, NICHT unverändert übernehmen):
---
${extractedText}
---
`;
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

        const systemPrompt = `Du agierst wie eine empathische, erfahrene Mathelehrerin.

Dein Ziel ist es, Schüler:innen dabei zu unterstützen, ihren eigenen Lösungsweg zu verstehen, Fehler selbst zu erkennen und gezielt zu korrigieren.

Deine Sprache ist präzise, fachlich korrekt und neutral-freundlich.

Lob erfolgt ausschließlich im abschließenden Feedback (nicht in Stufe 1).

Kontext
Dein Output wird von einem Programm automatisch verarbeitet und als visuelle Korrektur dargestellt.
Das Frontend erzeugt Farben/Markierungen ausschließlich aus JSON-Feldern (errorType, uiElements.color).
Deshalb ist ein exakt strukturiertes, sauber geordnetes Ergebnis zwingend.

STUFE 1: Fehlermarkierung (Analyse)
Führe nur Stufe 1 aus.

Deine Aufgaben
1. Rechenweg strukturieren
   - Nimm den Schüler-Rechenweg (roh, evtl. unübersichtlich) und zerlege ihn in nummerierte Teilschritte.
   - Jeder Teilschritt muss genau eine klare Aussage/Umformung/Rechnung enthalten.
   - WICHTIG: Übernimm den ORIGINAL-TEXT des Schülers EXAKT wie er ihn geschrieben hat!
   - Auch bei Fehlern: Zeige den FALSCHEN Schritt des Schülers, NICHT die korrigierte Version!
   - rawText = exakter Originaltext des Schülers
   - latex = LaTeX-Version des Originaltexts (auch wenn falsch!)
   - Gib bei jedem Schritt (außer dem letzten) das Feld "operation" an, das beschreibt, welche Rechenoperation zum NÄCHSTEN Schritt führt.
     Beispiele für operation: ":2x" (durch 2x teilen), "zgf." (zusammengefasst), "+3", "-5", "·2", "quadrieren", "Wurzel ziehen"

2. Logik prüfen (Priorität 1)
   - Prüfe, ob der Ansatz logisch nachvollziehbar und langfristig zielführend ist (nicht zwingend effizient).
   - Markiere die erste logisch nicht zielführende Stelle als errorType: "logic".
   - Markiere alle folgenden logisch unschlüssigen Schritte ebenfalls als "logic".

3. Rechnungen prüfen (Priorität 2)
   - Prüfe alle Rechnungen auf rechnerische Richtigkeit.
   - Markiere grobe Rechenfehler (inkl. Vorzeichenfehler) als errorType: "calc".
   - Rundung: maximal zwei Nachkommastellen; eine Rundungstoleranz von ±10% gilt als korrekt.

4. Folgefehler markieren (Priorität 3)
   - Wenn ein späterer Schritt nur falsch ist, weil ein früherer Rechenfehler übernommen wurde, markiere ihn als errorType: "followup".

5. Formales nur selten
   - errorType: "formal" nur verwenden, wenn Logik- und Rechenfehler selten sind.
   - formal bedeutet: Schreibweise formal unsauber, aber inhaltlich korrekt.

Was du in Stufe 1 NICHT tust
- Keine Hints (keine 2–3-Wort-Boxen mit „Weiterweg").
- Keine Erklärungen in ganzen Sätzen.
- Keine vollständige Musterlösung.
- Kein motivierendes Feedback.
- NIEMALS die richtige Lösung im latex-Feld zeigen!
- NIEMALS den fehlerhaften Schritt durch die Korrektur ersetzen!
- Der Schüler soll seinen EIGENEN Fehler sehen, nicht was richtig gewesen wäre!

⚠️ LaTeX-Formatierung (KRITISCH) ⚠️
Die Felder steps[].latex müssen REINEN LaTeX-Inhalt enthalten.

KEINE DELIMITER im latex-Feld:
- NIEMALS \\( oder \\) im latex-Feld verwenden!
- NIEMALS $ oder $$ im latex-Feld verwenden!
- NIEMALS \\[ oder \\] im latex-Feld verwenden!
- Das Frontend fügt die Delimiter automatisch hinzu!

RICHTIG: "latex": "x^2 + 2x - 3"
FALSCH:  "latex": "\\\\( x^2 + 2x - 3 \\\\)"
FALSCH:  "latex": "$x^2 + 2x - 3$"

Keine losen Zeichen:
- Keine losen Klammern: Jede ( hat ), jede [ hat ], jede { hat }.
- Keine losen Backslashes: jedes \\\\ gehört zu einem gültigen LaTeX-Befehl.
- Brüche immer als \\\\frac{...}{...}.

KEINE Farben in LaTeX:
- NIEMALS \\\\textcolor, \\\\color oder ähnliche Befehle im latex-Feld!
- Farben kommen ausschließlich über errorType und uiElements.color.

Output-Regeln
- Du gibst ausschließlich ein JSON-Objekt zurück, das genau dem vorgegebenen Schema entspricht.
- Keine Einleitung, keine Markdown-Blöcke, keine Kommentare, kein zusätzlicher Text.
- Keine zusätzlichen Felder außerhalb des Schemas.
- Reihenfolge: steps in natürlicher Reihenfolge des Schülerwegs (index 1..n).

Bedeutung der errorType-Werte (Mapping zur Visualisierung)
- "logic" = rot (Logikfehler / nicht zielführend)
- "calc" = grün (Rechenfehler)
- "followup" = orange (Folgefehler)
- "formal" = hellblau (formal, selten)
- "none" = korrekt (kein Fehler)

uiElements in Stufe 1
- In Stufe 1 ist uiElements normalerweise leer.
- Wenn du unbedingt UI-Elemente setzen musst, dann nur neutrale Markierungen ohne Hints.

Kurzes Feedback (PFLICHT)
- Gib im feedback.summarySentence eine kurze Rückmeldung (1-2 Sätze).
- Nenne was gut gelaufen ist und wo es Probleme gibt.
- KEINE Details über die Fehler oder deren Lösung verraten!
- Halte es motivierend und konstruktiv.
- Beispiele:
  - "Guter Ansatz! Bei einer Umformung ist ein kleiner Rechenfehler passiert."
  - "Die ersten Schritte sind korrekt, aber der Lösungsweg führt nicht zum Ziel."
  - "Sehr gut! Alle Schritte sind mathematisch korrekt."
  - "Der Rechenweg zeigt gutes Verständnis, aber achte auf die Vorzeichen."
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
            model = 'gpt-4o'; // Modell mit Structured Outputs Support
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
            
            // Schema-Anweisungen für bessere Kompatibilität
            const schemaInstructions = `

WICHTIG: Du MUSST deine Antwort als valides JSON-Objekt im folgenden Format ausgeben:
{
  "steps": [
    {
      "index": 1,
      "rawText": "Originaltext des Schülers",
      "latex": "x^2 + 2x - 3",
      "errorType": "none|logic|calc|followup|formal",
      "operation": ":2 oder zgf. oder +3 (optional, für alle außer letzten Schritt)"
    }
  ],
  "uiElements": [],
  "feedback": {
    "summarySentence": "Kurze Rückmeldung (1-2 Sätze) was gut war und wo es Probleme gibt"
  }
}

Gib NUR dieses JSON zurück, keine anderen Texte davor oder danach.`;
            
            requestBody = {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt + schemaInstructions
                    },
                    userMessage
                ],
                max_tokens: 4000,
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
                return sanitized;
            }
        }

        return parsedResponse;
    }

    /**
     * Holt den Schülerkontext für den Prompt
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
     * @param {Object} params - Parameter
     * @returns {Object} - { systemPrompt, userPrompt }
     */
    buildFollowUpAnalysisPrompt({ originalSteps, userCorrections, previousAnalyses, attemptNumber, studentContext }) {
        // Formatiere den ursprünglichen Lösungsweg
        let originalSolutionText = 'URSPRÜNGLICHER LÖSUNGSWEG:\n';
        originalSteps.forEach(step => {
            const stepNum = step.index || step.stepNumber || '?';
            const errorLabel = step.errorType && step.errorType !== 'none' 
                ? ` [${step.errorType.toUpperCase()}]` 
                : '';
            originalSolutionText += `Schritt ${stepNum}${errorLabel}: ${step.rawText || step.latex}\n`;
        });
        
        // Formatiere die User-Korrekturen
        let correctionsText = '\nKORREKTUREN DES SCHÜLERS:\n';
        const correctionEntries = Object.entries(userCorrections);
        if (correctionEntries.length > 0) {
            correctionEntries.forEach(([stepIndex, correction]) => {
                correctionsText += `Schritt ${stepIndex} NEU: ${correction}\n`;
            });
        } else {
            correctionsText += '(Keine Korrekturen eingegeben)\n';
        }
        
        // Formatiere vorherige Analysen als Kontext
        let previousAnalysesText = '';
        if (previousAnalyses && previousAnalyses.length > 0) {
            previousAnalysesText = '\n=== VORHERIGE LÖSUNGSVERSUCHE ===\n';
            previousAnalyses.forEach((analysis, idx) => {
                previousAnalysesText += `Versuch ${idx + 1}:\n`;
                if (analysis.steps) {
                    analysis.steps.forEach(step => {
                        const errorLabel = step.errorType && step.errorType !== 'none' 
                            ? ` [${step.errorType}]` 
                            : ' [korrekt]';
                        previousAnalysesText += `  ${step.index}. ${step.latex}${errorLabel}\n`;
                    });
                }
                if (analysis.feedback && analysis.feedback.summarySentence) {
                    previousAnalysesText += `  Feedback: ${analysis.feedback.summarySentence}\n`;
                }
                previousAnalysesText += '\n';
            });
        }
        
        // Schülerkontext
        let studentContextSection = '';
        if (studentContext) {
            let strengthsText = '';
            let weaknessesText = '';
            if (studentContext.strongAreas?.topics?.length > 0) {
                strengthsText = studentContext.strongAreas.topics.map(t => `${t.topic} (Level ${t.level}/5)`).join(', ');
            }
            if (studentContext.weakAreas?.topics?.length > 0) {
                weaknessesText = studentContext.weakAreas.topics.map(t => `${t.topic} (Level ${t.level}/5)`).join(', ');
            }
            if (strengthsText || weaknessesText) {
                studentContextSection = `\n=== SCHÜLERKONTEXT ===
${strengthsText ? `Stärken: ${strengthsText}` : ''}
${weaknessesText ? `Schwächen: ${weaknessesText}` : ''}
`;
            }
        }

        const systemPrompt = `Du agierst wie eine empathische, erfahrene Mathelehrerin.

Dies ist eine FOLGE-ANALYSE nach Korrekturen des Schülers (Versuch ${attemptNumber}).

Der Schüler hat seinen vorherigen Lösungsweg überarbeitet und bestimmte Schritte korrigiert.
Deine Aufgabe ist es:
1. Die korrigierten Schritte zu überprüfen
2. Folgefehler automatisch anzupassen, wenn der ursprüngliche Fehler behoben wurde
3. Den neuen, vollständigen Lösungsweg zu bewerten

WICHTIG - FOLGEFEHLER-BEHANDLUNG:
- Wenn ein Schritt korrigiert wurde, der vorher einen Fehler hatte, prüfe ob die Korrektur korrekt ist
- Wenn die Korrektur korrekt ist, passe alle FOLGEFEHLER automatisch an
- Ein Folgefehler wird zu "none" (korrekt), wenn er nur aufgrund des ursprünglichen Fehlers falsch war
- Wenn ein Folgefehler zusätzliche, unabhängige Fehler enthält, markiere diese entsprechend
- Nicht korrigierte Schritte mit Fehlern bleiben unverändert markiert

Deine Aufgaben (wie bei der Erst-Analyse):
1. Rechenweg strukturieren - Alle Schritte auflisten (mit Korrekturen eingebaut)
2. Logik prüfen (Priorität 1) - errorType: "logic"
3. Rechnungen prüfen (Priorität 2) - errorType: "calc"  
4. Folgefehler markieren (Priorität 3) - errorType: "followup"
5. Formales nur selten - errorType: "formal"
6. Gib bei jedem Schritt (außer dem letzten) das "operation"-Feld an

⚠️ LaTeX-Formatierung (KRITISCH) ⚠️
Die Felder steps[].latex müssen REINEN LaTeX-Inhalt enthalten.

KEINE DELIMITER im latex-Feld:
- NIEMALS \\( oder \\) im latex-Feld verwenden!
- NIEMALS $ oder $$ im latex-Feld verwenden!
- Das Frontend fügt die Delimiter automatisch hinzu!

RICHTIG: "latex": "x^2 + 2x - 3"
FALSCH:  "latex": "\\\\( x^2 + 2x - 3 \\\\)"

Keine losen Zeichen:
- Keine losen Klammern
- Brüche als \\\\frac{...}{...}

KEINE Farben in LaTeX:
- NIEMALS \\\\textcolor, \\\\color im latex-Feld!

Kurzes Feedback (PFLICHT)
- Gib im feedback.summarySentence eine kurze Rückmeldung (1-2 Sätze)
- Erwähne ob die Korrekturen erfolgreich waren
- Beispiele:
  - "Gut korrigiert! Der Rechenfehler ist behoben und die Folgefehler wurden angepasst."
  - "Die Korrektur in Schritt 2 ist richtig, aber in Schritt 4 ist noch ein unabhängiger Fehler."
  - "Leider ist die Korrektur noch nicht korrekt. Prüfe nochmal die Umformung."

Output-Format:
- Gib NUR ein JSON-Objekt zurück
- Keine Einleitung, keine Kommentare
${studentContextSection}${previousAnalysesText}`;

        const userPrompt = `Aufgabe:
${this.currentTask}

${originalSolutionText}
${correctionsText}

Analysiere den NEUEN Lösungsweg (mit eingebauten Korrekturen) und gib das Ergebnis als JSON zurück.
Beachte: Wenn ein Fehler korrigiert wurde, passe die Folgefehler entsprechend an!`;

        return { systemPrompt, userPrompt };
    }

    buildHilfestellungPrompt() {
        const evaluation = this.solutionState.lastCheckResponse || 'Es liegt noch kein detailliertes Feedback vor.';
        const userSolution = this.solutionState.lastUserSolution || '(Keine schriftliche Lösung eingereicht.)';
        return `
Aufgabe:
${this.currentTask}

Lösung des Schülers (Originaltext):
${userSolution}

ANWEISUNGEN:
1. Gib ausschließlich den Lösungsweg des Schülers erneut aus – gleiche Reihenfolge, identische Zeilenumbrüche.
2. Erzeuge KEINEN zusätzlichen Text, keine Einleitung, keine Erklärungen, keine Tipps.
3. Markiere nur die tatsächlich fehlerhaften Passagen. Korrekte Teile bleiben unverändert (keine \color-Anweisung).
4. Nutze für Markierungen den LaTeX-Befehl \color{FARBE}{…}. Verwende exakt folgende Farben und umfasse stets die gesamte betroffene Passage:
   - Grober Fehler (falsches Rechnen, Regelverstoß): \color{red}{…}
   - Folgefehler (aus einem vorherigen Fehler entstanden): \color{yellow}{…}
   - Grober Fehler mit Folgefehler kombiniert: \color{orange}{…}
   - Form- oder Notationsfehler (z.B. falsches oder fehlendes Symbol): \color{blue}{…}
   - Falsches Einsetzen oder ausgelassener notwendiger Zwischenschritt: \color{purple}{…}
5. Bei Umformungen von Gleichungen gib jeden Zwischenschritt auf einer Zeile aus und verbinde sie mit einem = (z.B. \color{red}{falscher\_Term} = korrekter\_Term).
6. Achte darauf, dass jede \color-Anweisung genau zwei geschweifte Klammern besitzt (keine leeren { }, keine offenen Klammern). Entferne überflüssige Backslashes.
7. Am Ende darf ausschließlich der neu formatierte Lösungsweg stehen – keine Schlussbemerkung oder Hinweis.`;
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
        const variations = [
            'Verändere die Alltagssituation und die beteiligten Personen, ohne den mathematischen Aufbau zu verändern.',
            'Passe die erzählte Geschichte an einen anderen Kontext (z.B. Naturwissenschaft, Wirtschaft, Sport) an, behalte jedoch die gleichen mathematischen Fragestellungen bei.',
            'Ersetze reale Gegenstände in der Aufgabe durch andere Objekte mit ähnlichen Eigenschaften und passe Beschreibungen entsprechend an.',
            'Ändere die Ausgangswerte minimal (höchstens um ±10 %) und schreibe die Texte so, dass die neuen Werte logisch zur Situation passen.',
            'Formuliere die Aufgabe so um, dass sie sich an eine andere reale Situation (z.B. Berufsausbildung, Studium, Alltag) richtet, lasse aber die mathematischen Anforderungen identisch.'
        ];
        const index = Math.floor(Math.random() * variations.length);
        return variations[index];
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

    async generateTask() {
        if (!this.apiKey) {
            this.showNotification('Bitte konfiguriere zuerst deinen API-Schlüssel im Profil-Tab.', 'warning');
            // Wechsle automatisch zum Profil-Tab
            document.querySelector('[data-tab="user-profile"]').click();
            return;
        }

        this.showLoading(true);

        // Hole die ausgewählten Parameter
        const topic = document.getElementById('topic-select').value;
        const difficulty = document.getElementById('difficulty-select').value;
        const taskType = document.getElementById('task-type-select').value;

        // Deutsche Übersetzungen für die Parameter
        const topicNames = {
            'functions': 'Funktionen',
            'integration': 'Integration',
            'geometry': 'Geometrie',
            'algebra': 'Algebra',
            'statistics': 'Statistik'
        };

        const difficultyNames = {
            'easy': 'einfach',
            'medium': 'mittel',
            'hard': 'schwer'
        };

        const taskTypeNames = {
            'conceptual': 'konzeptuelles Verständnis',
            'word-problem': 'Textaufgabe',
            'calculation': 'reine Berechnung'
        };

        const prompt = `Erstelle eine ${difficultyNames[difficulty]}e ${taskTypeNames[taskType]} zum Thema ${topicNames[topic]}.`;

        console.log('Generiere Aufgabe mit:', { topic, difficulty, taskType, prompt });

        // Start Performance Tracking
        if (this.performanceTracker) {
            this.performanceTracker.startTask(topic, difficulty);
        }

        try {
            const response = await this.callAIAPI(prompt, 'generate', null, topic);
            this.displayResults(response, true); // true = es ist eine Aufgabe
            
            // Store current task context
            this.currentTaskContext = { topic, difficulty, taskType };
        } catch (error) {
            console.error('Fehler bei der Aufgaben-Generierung:', error);
            
            // Detaillierte Fehlermeldung
            let errorMessage = 'Fehler bei der Aufgaben-Generierung: ';
            if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Unbekannter Fehler. Bitte überprüfe deine API-Konfiguration.';
            }
            
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
                    
                    <!-- Zeichenbereich -->
                    <div class="drawing-section">
                        <div class="drawing-header">
                            <label>Skizzen & Zeichnungen:</label>
                            <div class="drawing-tabs">
                                <button class="drawing-tab-btn active" data-canvas="coordinate">
                                    <i class="fas fa-project-diagram"></i>
                                    Koordinatensystem
                                </button>
                                <button class="drawing-tab-btn" data-canvas="grid">
                                    <i class="fas fa-th"></i>
                                    Kariertes Papier
                                </button>
                            </div>
                        </div>
                        
                        <!-- Canvas Container -->
                        <div class="canvas-container">
                            <canvas id="coordinate-canvas" class="drawing-canvas active" width="800" height="600"></canvas>
                            <canvas id="grid-canvas" class="drawing-canvas" width="800" height="600"></canvas>
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
                            Tipp anfordern
                        </button>
                        <button class="btn btn-secondary" id="request-hilfestellung" disabled>
                            <i class="fas fa-life-ring"></i>
                            Hilfestellung
                        </button>
                        <button class="btn btn-secondary" id="request-corrected" disabled>
                            <i class="fas fa-tools"></i>
                            Korrigierte Fassung
                        </button>
                        <button class="btn btn-secondary" id="show-solution">
                            <i class="fas fa-eye"></i>
                            Musterlösung anzeigen
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
        
        this.coordinateCtx = this.coordinateCanvas.getContext('2d');
        this.gridCtx = this.gridCanvas.getContext('2d');
        
        // Aktiver Canvas
        this.activeCanvas = this.coordinateCanvas;
        this.activeCtx = this.coordinateCtx;
        
        // Zeichenzustand
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.lineWidth = 2;
        this.startX = 0;
        this.startY = 0;
        
        // Zeichne Hintergründe
        this.drawCoordinateSystem();
        this.drawGridPaper();
        
        // Speichere Original-Hintergründe
        this.coordinateBackground = this.coordinateCtx.getImageData(0, 0, this.coordinateCanvas.width, this.coordinateCanvas.height);
        this.gridBackground = this.gridCtx.getImageData(0, 0, this.gridCanvas.width, this.gridCanvas.height);
        
        // Canvas-Nutzung tracken
        this.coordinateCanvasUsed = false;
        this.gridCanvasUsed = false;
        
        // Setup Canvas Event Listeners
        this.setupCanvasListeners();
    }

    drawCoordinateSystem() {
        const canvas = this.coordinateCanvas;
        const ctx = this.coordinateCtx;
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const gridSize = 40;
        
        // Hintergrund
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Gitterlinien
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        // Vertikale Linien
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontale Linien
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Achsen
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        // X-Achse
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        
        // Y-Achse
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();
        
        // Pfeile
        const arrowSize = 10;
        // X-Achse Pfeil
        ctx.beginPath();
        ctx.moveTo(width - arrowSize, centerY - arrowSize/2);
        ctx.lineTo(width, centerY);
        ctx.lineTo(width - arrowSize, centerY + arrowSize/2);
        ctx.stroke();
        
        // Y-Achse Pfeil
        ctx.beginPath();
        ctx.moveTo(centerX - arrowSize/2, arrowSize);
        ctx.lineTo(centerX, 0);
        ctx.lineTo(centerX + arrowSize/2, arrowSize);
        ctx.stroke();
        
        // Beschriftung
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.fillText('x', width - 20, centerY + 20);
        ctx.fillText('y', centerX + 10, 20);
        ctx.fillText('0', centerX + 5, centerY + 15);
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
        const solutionBtn = document.getElementById('show-solution');
        const hilfestellungBtn = document.getElementById('request-hilfestellung');
        const correctedBtn = document.getElementById('request-corrected');
        const optimalBtn = document.getElementById('request-optimal');
        const solutionInput = document.getElementById('solution-input');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitSolution());
        }
        
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.requestHint());
        }
        
        if (solutionBtn) {
            solutionBtn.addEventListener('click', () => this.showSolution());
        }

        if (hilfestellungBtn) {
            hilfestellungBtn.addEventListener('click', () => this.requestHilfestellung());
        }

        if (correctedBtn) {
            correctedBtn.addEventListener('click', () => this.requestCorrectedSolution());
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

        this.updateSolutionActionButtons();
    }

    async submitSolution() {
        const solutionInput = document.getElementById('solution-input');
        const userSolution = solutionInput.value.trim();
        
        // Hole Zeichnungen
        const canvasImages = this.getCanvasImages();
        
        // Prüfe ob Korrekturen vorhanden sind
        const hasCorrections = this.stepCorrections && Object.keys(this.stepCorrections).length > 0;
        const hasLastAnalysis = this.solutionState.lastAnalysis && this.solutionState.lastAnalysis.steps;
        
        // Bei Korrekturen brauchen wir keine neue Lösung im Textfeld
        if (!hasCorrections && !userSolution && canvasImages.length === 0) {
            this.showNotification('Bitte gib eine Lösung ein oder erstelle eine Zeichnung.', 'warning');
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
                    studentContext
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
                optimalContent: ''
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
        
        // Kurzes Feedback anzeigen
        if (analysis.feedback && analysis.feedback.summarySentence) {
            const feedbackSummary = document.createElement('div');
            feedbackSummary.className = 'feedback-summary-box';
            feedbackSummary.innerHTML = `
                <i class="fas fa-comment-dots"></i>
                <span>${analysis.feedback.summarySentence}</span>
            `;
            feedbackContent.appendChild(feedbackSummary);
        }
        
        // Steps rendern
        if (analysis.steps && analysis.steps.length > 0) {
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'tutor-steps-wrapper';
            
            const stepsHeader = document.createElement('h4');
            stepsHeader.className = 'tutor-section-header';
            stepsHeader.innerHTML = '<i class="fas fa-list-ol"></i> Dein Lösungsweg';
            stepsContainer.appendChild(stepsHeader);
            
            const stepsList = document.createElement('div');
            stepsList.className = 'tutor-step-list';
            
            analysis.steps.forEach((step, idx) => {
                const stepEl = this.renderAnalysisStep(step, idx, analysis.steps.length);
                stepsList.appendChild(stepEl);
            });
            
            stepsContainer.appendChild(stepsList);
            feedbackContent.appendChild(stepsContainer);
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
        
        // Zusammenfassung der Fehler
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
     * Rendert einen einzelnen Analyse-Step
     */
    renderAnalysisStep(step, idx, totalSteps) {
        const stepEl = document.createElement('div');
        const hasError = step.errorType && step.errorType !== 'none';
        const stepIndex = step.index || idx + 1;
        
        // Fehlertyp-Klasse
        const errorClass = {
            'none': '',
            'logic': 'step-error-logic',
            'calc': 'step-error-calc',
            'followup': 'step-error-followup',
            'formal': 'step-error-formal'
        }[step.errorType] || '';
        
        stepEl.className = `tutor-step ${errorClass} ${hasError ? 'has-error' : ''}`.trim();
        stepEl.dataset.stepIndex = stepIndex;
        stepEl.style.position = 'relative';
        
        // Step-Inhalt Container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'tutor-step-content-wrapper';
        
        // Step-Nummer
        const numEl = document.createElement('span');
        numEl.className = 'tutor-step-num';
        numEl.textContent = `${stepIndex}.`;
        contentWrapper.appendChild(numEl);
        
        // Inhalt-Container
        const contentEl = document.createElement('div');
        contentEl.className = 'tutor-step-content';
        
        // LaTeX-Darstellung (ohne Delimiter - wir fügen sie hier hinzu)
        if (step.latex) {
            const latexEl = document.createElement('div');
            latexEl.className = 'tutor-step-latex';
            
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
        
        // Originaltext (falls vorhanden)
        if (step.rawText && step.rawText !== step.latex) {
            const rawEl = document.createElement('div');
            rawEl.className = 'tutor-step-raw';
            rawEl.textContent = step.rawText;
            contentEl.appendChild(rawEl);
        }
        
        contentWrapper.appendChild(contentEl);
        
        // Operation zum nächsten Schritt (falls nicht letzter Schritt)
        if (step.operation && idx < totalSteps - 1) {
            const opEl = document.createElement('span');
            opEl.className = 'tutor-step-operation';
            opEl.textContent = `| ${step.operation}`;
            contentWrapper.appendChild(opEl);
        }
        
        stepEl.appendChild(contentWrapper);
        
        // Fehlertyp-Badge
        if (hasError) {
            const badge = document.createElement('span');
            badge.className = `tutor-error-badge error-${step.errorType}`;
            
            const badgeText = {
                'logic': 'Logikfehler',
                'calc': 'Rechenfehler',
                'followup': 'Folgefehler',
                'formal': 'Formfehler'
            }[step.errorType] || 'Fehler';
            
            badge.textContent = badgeText;
            stepEl.appendChild(badge);
            
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
                // Nicht klappen wenn ins Textfeld geklickt wird
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
            
            // Verhindern dass Klick auf Input das Zuklappen triggert
            textarea.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        return stepEl;
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
                <p class="hint">Klicke auf "Hilfestellung" für detaillierte Erklärungen.</p>
            `;
        }
        
        return summary;
    }

    async requestHint() {
        this.showLoading(true);
        
        // Track hint usage
        if (this.performanceTracker) {
            this.performanceTracker.recordHintUsed();
        }
        
        // Log Behavior
        if (this.userId && this.behaviorTracker) {
            await this.behaviorTracker.trackHintRequest(this.userId, {
                topic: this.currentTaskContext?.topic
            });
        }
        
        try {
            const isAbiRewrite = this.currentTaskContext?.origin === 'abi' && !this.currentTaskContext?.hintRewriteDone;
            if (this.currentTaskContext) {
                this.currentTaskContext.hintsRequested = (this.currentTaskContext.hintsRequested || 0) + 1;
            }

            let prompt;
            if (isAbiRewrite) {
                const learningStyle = this.userProfile?.learningStyle || 'step-by-step';
                const learningInstruction = this.getLearningStyleInstruction(learningStyle);
                prompt = `
Aufgabe (aktuelle Formulierung):
${this.currentTask}

Bitte formuliere die Aufgabenstellung so um, dass sie besser zu folgenden Lernpräferenzen passt:
- Lernstil: ${learningStyle}
- Anpassungshinweis: ${learningInstruction}

WICHTIG:
1. Ändere ausschließlich die Formulierung, nicht die mathematischen Anforderungen.
2. Nutze weiterhin korrekte LaTeX-Syntax für mathematische Elemente.
3. Gib keine Lösung, keinen Tipp und keine Hinweise auf den Lösungsweg.
4. Behalte den Abitur-Kontext bei, aber wähle Formulierungen, die dem Lernstil entgegenkommen.`;
            } else {
                prompt = `
Aufgabe:
${this.currentTask}

Der Schüler braucht einen Tipp zur Lösung dieser Aufgabe.
Bitte gib einen hilfreichen Hinweis, der:
1. NICHT die komplette Lösung verrät
2. Den Schüler in die richtige Richtung lenkt
3. Zum selbstständigen Denken anregt
4. Eventuell ein Beispiel oder eine verwandte Formel nennt
5. Kurz und prägnant ist
`;
            }
            
            const response = await this.callAIAPI(prompt, 'hint', null, this.currentTaskContext?.topic);
            this.displayFeedback(response);
            if (isAbiRewrite && this.currentTaskContext) {
                this.currentTaskContext.hintRewriteDone = true;
            }
        } catch (error) {
            console.error('Fehler beim Abrufen des Tipps:', error);
            this.showNotification('Fehler beim Abrufen des Tipps: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.updateSolutionActionButtons();
        }
    }

    async requestHilfestellung() {
        if (this.solutionState.lastWasCorrect === null) {
            this.showNotification('Bitte reiche zuerst eine Lösung ein, damit Hilfestellungen erzeugt werden können.', 'info');
            return;
        }

        if (this.solutionState.lastWasCorrect === true) {
            this.showNotification('Hilfestellung ist nur nötig, wenn die Lösung noch fehlerhaft ist.', 'info');
            return;
        }

        if (!this.solutionState.lastUserSolution) {
            this.showNotification('Bitte gib einen schriftlichen Lösungsweg ein, damit wir ihn markieren können.', 'warning');
            return;
        }

        if (!this.solutionState.hilfestellungEligible) {
            this.showNotification('Hilfestellung ist aktuell nicht verfügbar. Prüfe zuerst deine Lösung.', 'info');
            return;
        }

        this.showLoading(true);

        try {
            const prompt = this.buildHilfestellungPrompt();
            const response = await this.callAIAPI(prompt, 'hilfestellung', null, this.currentTaskContext?.topic);
            this.solutionState.hilfestellungProvided = true;
            this.solutionState.hilfestellungContent = response;
            this.solutionState.correctedProvided = false;
            this.displayFeedback(response);
        } catch (error) {
            console.error('Fehler bei der Hilfestellung:', error);
            this.showNotification('Hilfestellung konnte nicht erstellt werden: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
            this.updateSolutionActionButtons();
        }
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
