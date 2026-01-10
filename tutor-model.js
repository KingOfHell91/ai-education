/**
 * tutor-model.js
 * Zentrales Datenmodell für TutorResponse (3 Prompt-Stufen)
 * Erweiterbar durch optionale Felder und Index-Signatures
 */

// ==================== Type Constants ====================

/**
 * ErrorType - Fehlerklassifikation für Schritte
 * Erweiterbar: Neue Werte einfach hier hinzufügen
 * @type {Object.<string, string>}
 */
const ErrorType = Object.freeze({
    NONE: 'none',
    LOGIC: 'logic',
    CALC: 'calc',
    FOLLOWUP: 'followup',
    FORMAL: 'formal'
});

/**
 * UiElementType - Typen für grafische/verknüpfende Elemente
 * Erweiterbar: Neue Werte einfach hier hinzufügen
 * @type {Object.<string, string>}
 */
const UiElementType = Object.freeze({
    INFO_BOX: 'info_box',
    HINT_CHIP: 'hint_chip',
    LINK_MARKER: 'link_marker'
});

/**
 * UiElementColor - Verfügbare Farben für UI-Elemente
 * @type {Object.<string, string>}
 */
const UiElementColor = Object.freeze({
    RED: 'red',
    GREEN: 'green',
    ORANGE: 'orange',
    BLUE: 'blue'
});

// ==================== JSDoc Type Definitions ====================

/**
 * @typedef {Object} Step
 * @property {number} index - Eindeutige Schritt-ID (Pflicht)
 * @property {string} [rawText] - Originaltext des Schülers (optional)
 * @property {string} latex - Normalisierte LaTeX-Darstellung (Pflicht)
 * @property {string} errorType - Fehlertyp für Farbmarkierung (ErrorType)
 * @property {string} [comment] - Kommentar zum Schritt (optional)
 * @property {Object.<string, any>} [meta] - Erweiterbare Metadaten (optional)
 */

/**
 * @typedef {Object} UiElement
 * @property {string} type - UiElementType
 * @property {number} stepIndex - Bezug auf einen Schritt
 * @property {string} color - UiElementColor
 * @property {string} [title] - Titel des Elements (optional)
 * @property {string} text - Inhalt des Elements (Pflicht)
 * @property {number[]} [relatedStepIndices] - Verknüpfte Schritte (z.B. Folgefehler)
 * @property {string} [kind] - Feinerer Untertyp (z.B. "logic_hint")
 * @property {Object.<string, any>} [meta] - Erweiterbare Metadaten (optional)
 */

/**
 * @typedef {Object} FeedbackSummary
 * @property {string} summarySentence - Zusammenfassender Satz
 * @property {string[]} strengths - Stärken des Schülers
 * @property {string[]} errorSources - Fehlerquellen
 * @property {string[]} nextFocus - Nächste Lernziele
 * @property {Object.<string, any>} [meta] - Erweiterbare Metadaten (optional)
 */

/**
 * @typedef {Object} TutorResponse
 * @property {Step[]} steps - Schritte im Rechenweg
 * @property {UiElement[]} uiElements - Grafische/verknüpfende Elemente
 * @property {FeedbackSummary} [feedback] - Feedback-Zusammenfassung (optional)
 * @property {string} [version] - API-Version (z.B. "v1")
 * @property {Object.<string, any>} [meta] - Erweiterbare Metadaten (optional)
 */

// ==================== Validation Helpers ====================

/**
 * Prüft ob ein Wert ein gültiger ErrorType ist
 * @param {string} value
 * @returns {boolean}
 */
function isValidErrorType(value) {
    return Object.values(ErrorType).includes(value);
}

/**
 * Prüft ob ein Wert ein gültiger UiElementType ist
 * @param {string} value
 * @returns {boolean}
 */
function isValidUiElementType(value) {
    return Object.values(UiElementType).includes(value);
}

/**
 * Prüft ob ein Wert eine gültige UiElementColor ist
 * @param {string} value
 * @returns {boolean}
 */
function isValidUiElementColor(value) {
    return Object.values(UiElementColor).includes(value);
}

// ==================== Sanitization & Parsing ====================

/**
 * Sanitiert einen einzelnen Step
 * Toleriert fehlende optionale Felder, ignoriert unbekannte Felder
 * @param {Object} raw - Rohdaten des Steps
 * @param {number} fallbackIndex - Fallback-Index falls nicht vorhanden
 * @returns {Step|null} - Sanitierter Step oder null bei kritischem Fehler
 */
function sanitizeStep(raw, fallbackIndex = 0) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const step = {
        index: typeof raw.index === 'number' ? raw.index : fallbackIndex,
        latex: typeof raw.latex === 'string' ? raw.latex : '',
        errorType: isValidErrorType(raw.errorType) ? raw.errorType : ErrorType.NONE
    };

    // Optionale Felder
    if (typeof raw.rawText === 'string') {
        step.rawText = raw.rawText;
    }
    if (typeof raw.comment === 'string') {
        step.comment = raw.comment;
    }
    if (raw.meta && typeof raw.meta === 'object') {
        step.meta = raw.meta;
    }

    // Leerer Step ohne latex ist ungültig
    if (!step.latex && !step.rawText) {
        return null;
    }

    return step;
}

/**
 * Sanitiert ein einzelnes UiElement
 * @param {Object} raw - Rohdaten des Elements
 * @returns {UiElement|null} - Sanitiertes Element oder null bei kritischem Fehler
 */
function sanitizeUiElement(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    // Pflichtfelder prüfen
    if (!isValidUiElementType(raw.type)) {
        return null;
    }
    if (typeof raw.stepIndex !== 'number') {
        return null;
    }
    if (typeof raw.text !== 'string' || !raw.text.trim()) {
        return null;
    }

    const element = {
        type: raw.type,
        stepIndex: raw.stepIndex,
        color: isValidUiElementColor(raw.color) ? raw.color : UiElementColor.BLUE,
        text: raw.text.trim()
    };

    // Optionale Felder
    if (typeof raw.title === 'string') {
        element.title = raw.title;
    }
    if (Array.isArray(raw.relatedStepIndices)) {
        element.relatedStepIndices = raw.relatedStepIndices.filter(i => typeof i === 'number');
    }
    if (typeof raw.kind === 'string') {
        element.kind = raw.kind;
    }
    if (raw.meta && typeof raw.meta === 'object') {
        element.meta = raw.meta;
    }

    return element;
}

/**
 * Sanitiert ein FeedbackSummary
 * @param {Object} raw - Rohdaten
 * @returns {FeedbackSummary|null}
 */
function sanitizeFeedbackSummary(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const feedback = {
        summarySentence: typeof raw.summarySentence === 'string' ? raw.summarySentence : '',
        strengths: Array.isArray(raw.strengths) ? raw.strengths.filter(s => typeof s === 'string') : [],
        errorSources: Array.isArray(raw.errorSources) ? raw.errorSources.filter(s => typeof s === 'string') : [],
        nextFocus: Array.isArray(raw.nextFocus) ? raw.nextFocus.filter(s => typeof s === 'string') : []
    };

    if (raw.meta && typeof raw.meta === 'object') {
        feedback.meta = raw.meta;
    }

    // Feedback ohne Inhalt ist nutzlos
    if (!feedback.summarySentence && feedback.strengths.length === 0 && 
        feedback.errorSources.length === 0 && feedback.nextFocus.length === 0) {
        return null;
    }

    return feedback;
}

/**
 * Erstellt eine sanitierte TutorResponse aus Rohdaten
 * Toleriert fehlende optionale Felder und ignoriert unbekannte Felder
 * @param {Object|string} data - Rohdaten (Object oder JSON-String)
 * @returns {TutorResponse|null} - Sanitierte Response oder null bei kritischem Fehler
 */
function createTutorResponse(data) {
    let raw = data;

    // Falls JSON-String, parsen
    if (typeof data === 'string') {
        try {
            raw = JSON.parse(data);
        } catch (e) {
            console.warn('[TutorModel] Invalid JSON:', e.message);
            return null;
        }
    }

    if (!raw || typeof raw !== 'object') {
        return null;
    }

    // Steps sind Pflicht und müssen ein Array sein
    if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
        return null;
    }

    const response = {
        steps: [],
        uiElements: []
    };

    // Steps sanitieren
    raw.steps.forEach((stepRaw, idx) => {
        const step = sanitizeStep(stepRaw, idx);
        if (step) {
            response.steps.push(step);
        }
    });

    // Keine gültigen Steps = ungültige Response
    if (response.steps.length === 0) {
        return null;
    }

    // UiElements sanitieren (optional)
    if (Array.isArray(raw.uiElements)) {
        raw.uiElements.forEach(elemRaw => {
            const elem = sanitizeUiElement(elemRaw);
            if (elem) {
                response.uiElements.push(elem);
            }
        });
    }

    // Feedback sanitieren (optional)
    if (raw.feedback) {
        const feedback = sanitizeFeedbackSummary(raw.feedback);
        if (feedback) {
            response.feedback = feedback;
        }
    }

    // Version (optional)
    if (typeof raw.version === 'string') {
        response.version = raw.version;
    }

    // Meta (optional)
    if (raw.meta && typeof raw.meta === 'object') {
        response.meta = raw.meta;
    }

    return response;
}

/**
 * Prüft ob ein Objekt/String ein gültiges TutorResponse sein könnte
 * Schnelle Prüfung ohne vollständige Sanitierung
 * @param {any} data
 * @returns {boolean}
 */
function isTutorResponse(data) {
    if (typeof data === 'string') {
        // Schnelle Heuristik: enthält "steps" und sieht nach JSON aus
        if (!data.includes('"steps"') || !data.trim().startsWith('{')) {
            return false;
        }
        try {
            data = JSON.parse(data);
        } catch {
            return false;
        }
    }

    return data && typeof data === 'object' && Array.isArray(data.steps) && data.steps.length > 0;
}

// ==================== Mapping from Student Path ====================

/**
 * Mappt einen bestehenden Schüler-Rechenweg auf TutorResponse
 * Nutzt vorhandene Felder und setzt Defaults für fehlende
 * @param {Array<Object>} studentSteps - Bestehender Schüler-Rechenweg
 * @returns {TutorResponse}
 */
function mapStudentPathToTutorResponse(studentSteps) {
    if (!Array.isArray(studentSteps)) {
        studentSteps = [];
    }

    const steps = studentSteps.map((step, idx) => {
        // Flexibles Mapping: unterstützt verschiedene Feldnamen
        return {
            index: step.index ?? step.stepNumber ?? step.id ?? idx,
            latex: step.latex ?? step.formula ?? step.content ?? step.text ?? '',
            rawText: step.rawText ?? step.original ?? step.userInput ?? undefined,
            errorType: step.errorType ?? ErrorType.NONE,
            comment: step.comment ?? step.note ?? undefined,
            meta: step.meta ?? undefined
        };
    }).filter(s => s.latex || s.rawText); // Leere Steps entfernen

    return {
        steps,
        uiElements: [],
        version: 'v1'
    };
}

// ==================== Exports ====================

// Für Browser-Umgebung (globale Variablen)
if (typeof window !== 'undefined') {
    window.TutorModel = {
        // Constants
        ErrorType,
        UiElementType,
        UiElementColor,

        // Validation
        isValidErrorType,
        isValidUiElementType,
        isValidUiElementColor,

        // Parsing/Sanitization
        sanitizeStep,
        sanitizeUiElement,
        sanitizeFeedbackSummary,
        createTutorResponse,
        isTutorResponse,

        // Mapping
        mapStudentPathToTutorResponse
    };
}

// Für Node.js/CommonJS (falls benötigt)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ErrorType,
        UiElementType,
        UiElementColor,
        isValidErrorType,
        isValidUiElementType,
        isValidUiElementColor,
        sanitizeStep,
        sanitizeUiElement,
        sanitizeFeedbackSummary,
        createTutorResponse,
        isTutorResponse,
        mapStudentPathToTutorResponse
    };
}

