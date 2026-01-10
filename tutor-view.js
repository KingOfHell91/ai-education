/**
 * tutor-view.js
 * UI-Komponenten für TutorResponse Visualisierung
 * Rendert Schritte, UI-Elemente und Feedback
 */

// ==================== Renderer Map ====================

/**
 * Zentrale Map für UiElement-Renderer
 * Erweiterbar: Neue Typen einfach hier registrieren
 */
const UiElementRenderers = {
    info_box: renderInfoBox,
    hint_chip: renderHintChip,
    link_marker: renderLinkMarker
};

// ==================== Step Rendering ====================

/**
 * CSS-Klasse für ErrorType
 * @param {string} errorType
 * @returns {string}
 */
function getErrorTypeClass(errorType) {
    const classMap = {
        'none': '',
        'logic': 'step-error-logic',
        'calc': 'step-error-calc',
        'followup': 'step-error-followup',
        'formal': 'step-error-formal'
    };
    return classMap[errorType] || '';
}

/**
 * Rendert einen einzelnen Step
 * @param {Step} step
 * @param {UiElement[]} attachedElements - UI-Elemente die zu diesem Step gehören
 * @returns {HTMLElement}
 */
function renderStep(step, attachedElements = []) {
    const stepEl = document.createElement('div');
    stepEl.className = `tutor-step ${getErrorTypeClass(step.errorType)}`.trim();
    stepEl.dataset.stepIndex = step.index;

    // Step-Nummer
    const numEl = document.createElement('span');
    numEl.className = 'tutor-step-num';
    numEl.textContent = `${step.index + 1}.`;
    stepEl.appendChild(numEl);

    // Inhalt-Container
    const contentEl = document.createElement('div');
    contentEl.className = 'tutor-step-content';

    // LaTeX-Darstellung
    if (step.latex) {
        const latexEl = document.createElement('div');
        latexEl.className = 'tutor-step-latex';
        // Wrapping für MathJax: Display-Mode für mehrzeilige Formeln
        if (step.latex.includes('\\\\') || step.latex.includes('\\begin')) {
            latexEl.innerHTML = `\\[${step.latex}\\]`;
        } else {
            latexEl.innerHTML = `\\(${step.latex}\\)`;
        }
        contentEl.appendChild(latexEl);
    }

    // Originaltext (falls vorhanden und anders als LaTeX)
    if (step.rawText && step.rawText !== step.latex) {
        const rawEl = document.createElement('div');
        rawEl.className = 'tutor-step-raw';
        rawEl.textContent = step.rawText;
        contentEl.appendChild(rawEl);
    }

    // Kommentar (falls vorhanden)
    if (step.comment) {
        const commentEl = document.createElement('div');
        commentEl.className = 'tutor-step-comment';
        commentEl.textContent = step.comment;
        contentEl.appendChild(commentEl);
    }

    stepEl.appendChild(contentEl);

    // Angehängte UI-Elemente rendern
    if (attachedElements.length > 0) {
        const elementsContainer = document.createElement('div');
        elementsContainer.className = 'tutor-step-elements';

        attachedElements.forEach(elem => {
            const renderer = UiElementRenderers[elem.type];
            if (renderer) {
                const elemEl = renderer(elem);
                if (elemEl) {
                    elementsContainer.appendChild(elemEl);
                }
            } else {
                // Fallback für unbekannte Typen: als Info-Box rendern
                console.warn(`[TutorView] Unknown UiElement type: ${elem.type}`);
                const fallbackEl = renderInfoBox({ ...elem, type: 'info_box' });
                if (fallbackEl) {
                    elementsContainer.appendChild(fallbackEl);
                }
            }
        });

        stepEl.appendChild(elementsContainer);
    }

    return stepEl;
}

/**
 * Rendert die gesamte Step-Liste
 * @param {HTMLElement} container - Ziel-Container
 * @param {Step[]} steps
 * @param {UiElement[]} uiElements
 */
function renderStepList(container, steps, uiElements = []) {
    if (!container) {
        console.error('[TutorView] No container provided for renderStepList');
        return;
    }

    // Container leeren
    container.innerHTML = '';
    container.className = 'tutor-step-list';

    // UI-Elemente nach stepIndex gruppieren
    const elementsByStep = {};
    uiElements.forEach(elem => {
        const idx = elem.stepIndex;
        if (!elementsByStep[idx]) {
            elementsByStep[idx] = [];
        }
        elementsByStep[idx].push(elem);
    });

    // Schritte rendern
    steps.forEach(step => {
        const attachedElements = elementsByStep[step.index] || [];
        const stepEl = renderStep(step, attachedElements);
        container.appendChild(stepEl);
    });

    // MathJax neu rendern falls verfügbar
    triggerMathJax(container);
}

// ==================== UI Element Rendering ====================

/**
 * Rendert eine InfoBox
 * @param {UiElement} elem
 * @returns {HTMLElement}
 */
function renderInfoBox(elem) {
    const box = document.createElement('div');
    box.className = `tutor-info-box info-box-${elem.color || 'blue'}`;

    if (elem.title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'tutor-info-box-title';
        titleEl.textContent = elem.title;
        box.appendChild(titleEl);
    }

    const textEl = document.createElement('div');
    textEl.className = 'tutor-info-box-text';
    textEl.innerHTML = formatTextWithLatex(elem.text);
    box.appendChild(textEl);

    // Verknüpfungen anzeigen (falls vorhanden)
    if (elem.relatedStepIndices && elem.relatedStepIndices.length > 0) {
        const linksEl = document.createElement('div');
        linksEl.className = 'tutor-info-box-links';
        linksEl.innerHTML = `<small>→ Bezug auf Schritt(e): ${elem.relatedStepIndices.map(i => i + 1).join(', ')}</small>`;
        box.appendChild(linksEl);
    }

    return box;
}

/**
 * Rendert einen HintChip
 * @param {UiElement} elem
 * @returns {HTMLElement}
 */
function renderHintChip(elem) {
    const chip = document.createElement('span');
    chip.className = `tutor-hint-chip hint-chip-${elem.color || 'blue'}`;

    // Icon basierend auf kind oder default
    const icon = getHintChipIcon(elem.kind);
    if (icon) {
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        chip.appendChild(iconEl);
    }

    const textEl = document.createElement('span');
    textEl.className = 'tutor-hint-chip-text';
    textEl.textContent = elem.text;
    chip.appendChild(textEl);

    if (elem.title) {
        chip.title = elem.title;
    }

    return chip;
}

/**
 * Rendert einen LinkMarker (Platzhalter für grafische Verknüpfungen)
 * Aktuell: Text-Hinweis mit Icon
 * Später: Echte SVG-Linien/Pfeile zwischen Schritten
 * @param {UiElement} elem
 * @returns {HTMLElement}
 */
function renderLinkMarker(elem) {
    const marker = document.createElement('div');
    marker.className = `tutor-link-marker link-marker-${elem.color || 'orange'}`;

    const iconEl = document.createElement('i');
    iconEl.className = 'fas fa-link';
    marker.appendChild(iconEl);

    const textEl = document.createElement('span');
    textEl.className = 'tutor-link-marker-text';
    textEl.textContent = elem.text;
    marker.appendChild(textEl);

    // Verknüpfte Schritte markieren
    if (elem.relatedStepIndices && elem.relatedStepIndices.length > 0) {
        marker.dataset.linkedSteps = elem.relatedStepIndices.join(',');
        const linksEl = document.createElement('small');
        linksEl.className = 'tutor-link-marker-refs';
        linksEl.textContent = ` (→ Schritt ${elem.relatedStepIndices.map(i => i + 1).join(', ')})`;
        marker.appendChild(linksEl);
    }

    return marker;
}

/**
 * Icon-Mapping für HintChip kinds
 * @param {string} kind
 * @returns {string|null}
 */
function getHintChipIcon(kind) {
    const iconMap = {
        'logic_hint': 'fas fa-lightbulb',
        'calc_label': 'fas fa-calculator',
        'warning': 'fas fa-exclamation-triangle',
        'tip': 'fas fa-info-circle',
        'success': 'fas fa-check-circle',
        'error': 'fas fa-times-circle'
    };
    return iconMap[kind] || 'fas fa-tag';
}

// ==================== Feedback Panel ====================

/**
 * Rendert das Feedback-Panel
 * @param {HTMLElement} container - Ziel-Container
 * @param {FeedbackSummary} feedback
 */
function renderFeedbackPanel(container, feedback) {
    if (!container || !feedback) {
        return;
    }

    container.innerHTML = '';
    container.className = 'tutor-feedback-panel';

    // Zusammenfassung
    if (feedback.summarySentence) {
        const summaryEl = document.createElement('div');
        summaryEl.className = 'tutor-feedback-summary';
        summaryEl.innerHTML = formatTextWithLatex(feedback.summarySentence);
        container.appendChild(summaryEl);
    }

    // Stärken
    if (feedback.strengths && feedback.strengths.length > 0) {
        const strengthsEl = createFeedbackSection('Stärken', feedback.strengths, 'success', 'fas fa-check-circle');
        container.appendChild(strengthsEl);
    }

    // Fehlerquellen
    if (feedback.errorSources && feedback.errorSources.length > 0) {
        const errorsEl = createFeedbackSection('Fehlerquellen', feedback.errorSources, 'error', 'fas fa-exclamation-triangle');
        container.appendChild(errorsEl);
    }

    // Nächster Lernfokus
    if (feedback.nextFocus && feedback.nextFocus.length > 0) {
        const focusEl = createFeedbackSection('Nächste Schritte', feedback.nextFocus, 'info', 'fas fa-arrow-right');
        container.appendChild(focusEl);
    }

    // MathJax rendern
    triggerMathJax(container);
}

/**
 * Erstellt eine Feedback-Sektion (Stärken, Fehlerquellen, etc.)
 * @param {string} title
 * @param {string[]} items
 * @param {string} type - 'success', 'error', 'info'
 * @param {string} iconClass
 * @returns {HTMLElement}
 */
function createFeedbackSection(title, items, type, iconClass) {
    const section = document.createElement('div');
    section.className = `tutor-feedback-section tutor-feedback-${type}`;

    const headerEl = document.createElement('div');
    headerEl.className = 'tutor-feedback-section-header';
    headerEl.innerHTML = `<i class="${iconClass}"></i> <strong>${title}</strong>`;
    section.appendChild(headerEl);

    const listEl = document.createElement('ul');
    listEl.className = 'tutor-feedback-list';
    items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = formatTextWithLatex(item);
        listEl.appendChild(li);
    });
    section.appendChild(listEl);

    return section;
}

// ==================== Main Render Function ====================

/**
 * Rendert eine vollständige TutorResponse
 * @param {HTMLElement} container - Ziel-Container
 * @param {TutorResponse} response
 * @param {Object} options - Optionen
 * @param {boolean} options.showFeedback - Feedback anzeigen (default: true)
 * @param {boolean} options.showSteps - Steps anzeigen (default: true)
 */
function renderTutorResponse(container, response, options = {}) {
    const { showFeedback = true, showSteps = true } = options;

    if (!container) {
        console.error('[TutorView] No container provided');
        return;
    }

    if (!response) {
        console.warn('[TutorView] No response to render');
        return;
    }

    container.innerHTML = '';
    container.className = 'tutor-response-container';

    // Steps rendern
    if (showSteps && response.steps && response.steps.length > 0) {
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'tutor-steps-wrapper';

        const stepsHeader = document.createElement('h4');
        stepsHeader.className = 'tutor-section-header';
        stepsHeader.innerHTML = '<i class="fas fa-list-ol"></i> Lösungsweg';
        stepsContainer.appendChild(stepsHeader);

        const stepsList = document.createElement('div');
        renderStepList(stepsList, response.steps, response.uiElements || []);
        stepsContainer.appendChild(stepsList);

        container.appendChild(stepsContainer);
    }

    // Feedback rendern
    if (showFeedback && response.feedback) {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'tutor-feedback-wrapper';

        const feedbackHeader = document.createElement('h4');
        feedbackHeader.className = 'tutor-section-header';
        feedbackHeader.innerHTML = '<i class="fas fa-comment-dots"></i> Feedback';
        feedbackContainer.appendChild(feedbackHeader);

        const feedbackPanel = document.createElement('div');
        renderFeedbackPanel(feedbackPanel, response.feedback);
        feedbackContainer.appendChild(feedbackPanel);

        container.appendChild(feedbackContainer);
    }
}

// ==================== Utility Functions ====================

/**
 * Formatiert Text mit eingebettetem LaTeX
 * @param {string} text
 * @returns {string}
 */
function formatTextWithLatex(text) {
    if (!text) return '';

    // Escape HTML first (außer bereits vorhandene LaTeX-Delimiter)
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Konvertiere $...$ zu \(...\) für inline math
    formatted = formatted.replace(/\$([^\$]+)\$/g, '\\($1\\)');

    // Konvertiere $$...$$ zu \[...\] für display math
    formatted = formatted.replace(/\$\$([^\$]+)\$\$/g, '\\[$1\\]');

    // Zeilenumbrüche
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

/**
 * Triggert MathJax-Rendering für ein Element
 * @param {HTMLElement} element
 */
function triggerMathJax(element) {
    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([element]).catch(err => {
            console.warn('[TutorView] MathJax rendering error:', err);
        });
    }
}

/**
 * Versucht Text als TutorResponse zu parsen und zu rendern
 * Falls kein gültiges TutorResponse: gibt false zurück
 * @param {HTMLElement} container
 * @param {string|Object} data
 * @param {Object} options
 * @returns {boolean} - true wenn erfolgreich gerendert
 */
function tryRenderTutorResponse(container, data, options = {}) {
    if (!window.TutorModel) {
        console.warn('[TutorView] TutorModel not loaded');
        return false;
    }

    // Schnelle Prüfung ob es ein TutorResponse sein könnte
    if (!window.TutorModel.isTutorResponse(data)) {
        return false;
    }

    // Vollständig parsen und sanitieren
    const response = window.TutorModel.createTutorResponse(data);
    if (!response) {
        return false;
    }

    // Rendern
    renderTutorResponse(container, response, options);
    return true;
}

// ==================== Demo Data ====================

/**
 * Beispiel-TutorResponse für Demo und Tests
 */
const EXAMPLE_TUTOR_RESPONSE = {
    version: 'v1',
    steps: [
        {
            index: 0,
            latex: 'f(x) = x^2 + 2x - 3',
            rawText: 'f(x) = x² + 2x - 3',
            errorType: 'none',
            comment: 'Ausgangsfunktion korrekt notiert'
        },
        {
            index: 1,
            latex: "f'(x) = 2x + 2",
            errorType: 'none'
        },
        {
            index: 2,
            latex: '2x + 2 = 0',
            errorType: 'none',
            comment: 'Ableitung gleich Null setzen'
        },
        {
            index: 3,
            latex: 'x = 1',
            rawText: 'x = 1',
            errorType: 'calc',
            comment: 'Rechenfehler: sollte x = -1 sein'
        },
        {
            index: 4,
            latex: 'f(1) = 1 + 2 - 3 = 0',
            errorType: 'followup',
            comment: 'Folgefehler durch falschen x-Wert'
        }
    ],
    uiElements: [
        {
            type: 'info_box',
            stepIndex: 3,
            color: 'red',
            title: 'Rechenfehler',
            text: 'Beim Auflösen von $2x + 2 = 0$ wurde falsch umgeformt. Korrekt: $x = -1$'
        },
        {
            type: 'hint_chip',
            stepIndex: 3,
            color: 'orange',
            text: 'Vorzeichen beachten!',
            kind: 'tip'
        },
        {
            type: 'link_marker',
            stepIndex: 4,
            color: 'orange',
            text: 'Folgefehler aus Schritt 4',
            relatedStepIndices: [3]
        },
        {
            type: 'info_box',
            stepIndex: 0,
            color: 'green',
            title: 'Gut gemacht!',
            text: 'Funktionsgleichung korrekt aufgeschrieben.'
        }
    ],
    feedback: {
        summarySentence: 'Der Lösungsansatz ist grundsätzlich richtig, aber ein Vorzeichenfehler bei der Nullstellenberechnung führt zu einem falschen Ergebnis.',
        strengths: [
            'Ableitungsregel korrekt angewandt',
            'Lösungsstrategie (Ableitung = 0) richtig gewählt',
            'Schritte nachvollziehbar dokumentiert'
        ],
        errorSources: [
            'Vorzeichenfehler beim Lösen der linearen Gleichung',
            'Folgefehler bei der Berechnung des Funktionswerts'
        ],
        nextFocus: [
            'Lineare Gleichungen systematisch lösen',
            'Probe durchführen zur Kontrolle'
        ]
    }
};

/**
 * Initialisiert die Demo-Ansicht
 * @param {string} containerId - ID des Demo-Containers
 */
function initTutorViewDemo(containerId = 'tutor-view-demo') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`[TutorView] Demo container #${containerId} not found`);
        return;
    }

    console.log('[TutorView] Initializing demo view...');

    // Beispiel-Response rendern
    const response = window.TutorModel 
        ? window.TutorModel.createTutorResponse(EXAMPLE_TUTOR_RESPONSE)
        : EXAMPLE_TUTOR_RESPONSE;

    renderTutorResponse(container, response);
}

// ==================== Exports ====================

if (typeof window !== 'undefined') {
    window.TutorView = {
        // Renderers
        renderStep,
        renderStepList,
        renderInfoBox,
        renderHintChip,
        renderLinkMarker,
        renderFeedbackPanel,
        renderTutorResponse,
        tryRenderTutorResponse,

        // Utilities
        getErrorTypeClass,
        formatTextWithLatex,
        triggerMathJax,

        // Demo
        EXAMPLE_TUTOR_RESPONSE,
        initTutorViewDemo,

        // Extensibility
        UiElementRenderers
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderStep,
        renderStepList,
        renderInfoBox,
        renderHintChip,
        renderLinkMarker,
        renderFeedbackPanel,
        renderTutorResponse,
        tryRenderTutorResponse,
        getErrorTypeClass,
        formatTextWithLatex,
        EXAMPLE_TUTOR_RESPONSE,
        initTutorViewDemo,
        UiElementRenderers
    };
}

