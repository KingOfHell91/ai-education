/**
 * graph-renderer.js
 * Rendert mathematische Funktionsgraphen mit function-plot
 * Extrahiert Funktionen aus LaTeX und berechnet optimale Viewports
 */

// ==================== Function Parser ====================

/**
 * Extrahiert eine JavaScript-Funktion aus LaTeX
 * @param {string} latex - LaTeX-String wie "f(x) = x^2 + 2x - 3"
 * @returns {Object|null} - { fn: string, variable: string } oder null
 */
function extractFunctionFromLatex(latex) {
    if (!latex || typeof latex !== 'string') return null;
    
    // Bereinige LaTeX
    let clean = latex
        .replace(/\\left|\\right/g, '')
        .replace(/\\cdot/g, '*')
        .replace(/\\times/g, '*')
        .replace(/\\div/g, '/')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))')
        .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
        .replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'pow($2, 1/$1)')
        .replace(/\\sin/g, 'sin')
        .replace(/\\cos/g, 'cos')
        .replace(/\\tan/g, 'tan')
        .replace(/\\ln/g, 'log')
        .replace(/\\log/g, 'log10')
        .replace(/\\exp/g, 'exp')
        .replace(/\\pi/g, 'PI')
        .replace(/\\e/g, 'E')
        .replace(/\^/g, '**')
        .replace(/\{|\}/g, '')
        .trim();
    
    // Suche nach f(x) = ... oder y = ... oder direkter Ausdruck
    let match = clean.match(/(?:[a-zA-Z]\(([a-zA-Z])\)\s*=\s*)?(.+)/);
    if (!match) return null;
    
    const variable = match[1] || 'x';
    let expression = match[2] || clean;
    
    // Ersetze implizite Multiplikation: 2x -> 2*x, x2 nicht ändern (ist schon potenz)
    expression = expression.replace(/(\d)([a-zA-Z])/g, '$1*$2');
    expression = expression.replace(/([a-zA-Z])(\d)/g, (m, v, n) => {
        // x2 sollte x*2 sein, aber nur wenn es kein ** ist
        if (expression.includes(`${v}**${n}`)) return m;
        return `${v}*${n}`;
    });
    
    // Ersetze Variable mit x für function-plot
    expression = expression.replace(new RegExp(variable, 'g'), 'x');
    
    return {
        fn: expression,
        variable: variable
    };
}

/**
 * Prüft ob ein LaTeX-String eine Funktion enthält
 */
function containsFunction(latex) {
    if (!latex) return false;
    
    // Prüfe auf typische Funktionsmuster
    const patterns = [
        /[a-zA-Z]\([a-zA-Z]\)\s*=/,  // f(x) = 
        /y\s*=/,                      // y = 
        /x\^/,                        // x^
        /\\frac/,                     // Brüche
        /\\sqrt/,                     // Wurzeln
        /\\sin|\\cos|\\tan/,          // Trigonometrische
        /\\ln|\\log|\\exp/            // Logarithmen/Exponential
    ];
    
    return patterns.some(p => p.test(latex));
}

// ==================== Viewport Calculator ====================

/**
 * Berechnet einen optimalen Viewport für eine Funktion
 * @param {string} fnExpression - JavaScript-Funktionsausdruck
 * @returns {Object} - { xDomain: [min, max], yDomain: [min, max] }
 */
function calculateOptimalViewport(fnExpression) {
    // Standardbereich
    let xMin = -10, xMax = 10;
    let yMin = -10, yMax = 10;
    
    try {
        // Erstelle sichere Funktion
        const fn = new Function('x', `
            const PI = Math.PI;
            const E = Math.E;
            const sin = Math.sin;
            const cos = Math.cos;
            const tan = Math.tan;
            const sqrt = Math.sqrt;
            const log = Math.log;
            const log10 = Math.log10;
            const exp = Math.exp;
            const pow = Math.pow;
            const abs = Math.abs;
            return ${fnExpression};
        `);
        
        // Finde Nullstellen approximativ
        const zeros = [];
        const extrema = [];
        let prevY = null;
        let prevPrevY = null;
        
        // Sample die Funktion
        const samples = [];
        for (let x = -20; x <= 20; x += 0.1) {
            try {
                const y = fn(x);
                if (isFinite(y) && !isNaN(y)) {
                    samples.push({ x, y });
                    
                    // Nullstelle gefunden?
                    if (prevY !== null && prevY * y < 0) {
                        zeros.push(x);
                    }
                    
                    // Lokales Extremum?
                    if (prevY !== null && prevPrevY !== null) {
                        if ((prevY > y && prevY > prevPrevY) || (prevY < y && prevY < prevPrevY)) {
                            extrema.push({ x: x - 0.1, y: prevY });
                        }
                    }
                    
                    prevPrevY = prevY;
                    prevY = y;
                }
            } catch (e) {
                // Ignoriere Fehler bei einzelnen Punkten
            }
        }
        
        if (samples.length > 0) {
            // Berechne Y-Bereich aus Samples
            const yValues = samples.map(s => s.y).filter(y => Math.abs(y) < 1000);
            if (yValues.length > 0) {
                const minY = Math.min(...yValues);
                const maxY = Math.max(...yValues);
                
                // Füge etwas Padding hinzu
                const yPadding = (maxY - minY) * 0.1 || 2;
                yMin = Math.max(-100, minY - yPadding);
                yMax = Math.min(100, maxY + yPadding);
            }
            
            // Passe X-Bereich basierend auf interessanten Punkten an
            if (zeros.length > 0 || extrema.length > 0) {
                const interestingX = [...zeros, ...extrema.map(e => e.x)];
                const minX = Math.min(...interestingX);
                const maxX = Math.max(...interestingX);
                
                // Zentriere um interessante Punkte mit Padding
                const xPadding = Math.max(3, (maxX - minX) * 0.3);
                xMin = Math.max(-20, minX - xPadding);
                xMax = Math.min(20, maxX + xPadding);
            }
        }
    } catch (e) {
        console.warn('[GraphRenderer] Could not analyze function:', e);
    }
    
    // Runde auf schöne Werte
    xMin = Math.floor(xMin);
    xMax = Math.ceil(xMax);
    yMin = Math.floor(yMin);
    yMax = Math.ceil(yMax);
    
    return {
        xDomain: [xMin, xMax],
        yDomain: [yMin, yMax]
    };
}

// ==================== Graph Renderer ====================

/**
 * Rendert einen Funktionsgraph in einen Container
 * @param {HTMLElement} container - Ziel-Container
 * @param {string} latex - LaTeX-Funktionsausdruck
 * @param {Object} options - Zusätzliche Optionen
 */
function renderFunctionGraph(container, latex, options = {}) {
    if (!container) {
        console.error('[GraphRenderer] No container provided');
        return null;
    }
    
    // Prüfe ob function-plot verfügbar ist
    if (typeof functionPlot !== 'function') {
        console.error('[GraphRenderer] function-plot library not loaded');
        container.innerHTML = '<p style="color: #e53935; padding: 20px;">Graph-Bibliothek nicht geladen.</p>';
        return null;
    }
    
    // Extrahiere Funktion
    const parsed = extractFunctionFromLatex(latex);
    if (!parsed) {
        console.warn('[GraphRenderer] Could not parse function from:', latex);
        container.innerHTML = '<p style="color: #fb8c00; padding: 20px;">Konnte Funktion nicht parsen.</p>';
        return null;
    }
    
    // Berechne optimalen Viewport
    const viewport = calculateOptimalViewport(parsed.fn);
    
    // Merge mit Optionen
    const config = {
        target: container,
        width: options.width || container.clientWidth || 500,
        height: options.height || 350,
        xAxis: {
            domain: options.xDomain || viewport.xDomain,
            label: 'x'
        },
        yAxis: {
            domain: options.yDomain || viewport.yDomain,
            label: 'y'
        },
        grid: true,
        data: [{
            fn: parsed.fn,
            color: options.color || '#e63946'
        }],
        ...options
    };
    
    try {
        return functionPlot(config);
    } catch (e) {
        console.error('[GraphRenderer] Error rendering graph:', e);
        container.innerHTML = `<p style="color: #e53935; padding: 20px;">Fehler beim Rendern: ${e.message}</p>`;
        return null;
    }
}

// ==================== Modal Management ====================

let currentGraphModal = null;

/**
 * Zeigt einen Funktionsgraphen in einem Modal an
 * @param {string} latex - LaTeX-Funktionsausdruck
 * @param {string} title - Optionaler Titel
 */
function showFunctionGraphModal(latex, title = 'Funktionsgraph') {
    // Entferne existierendes Modal
    if (currentGraphModal) {
        currentGraphModal.remove();
    }
    
    // Erstelle Modal
    const modal = document.createElement('div');
    modal.className = 'graph-modal';
    modal.innerHTML = `
        <div class="graph-modal-content">
            <button class="graph-modal-close" title="Schließen">
                <i class="fas fa-times"></i>
            </button>
            <h3 style="margin-bottom: 16px; color: var(--text-primary);">${title}</h3>
            <div class="graph-formula" style="margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                \\(${latex}\\)
            </div>
            <div class="graph-container"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    currentGraphModal = modal;
    
    // Event Listeners
    const closeBtn = modal.querySelector('.graph-modal-close');
    closeBtn.addEventListener('click', () => closeGraphModal());
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeGraphModal();
        }
    });
    
    // ESC zum Schließen
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeGraphModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // Zeige Modal mit Animation
    requestAnimationFrame(() => {
        modal.classList.add('active');
        
        // Rendere Graph
        const graphContainer = modal.querySelector('.graph-container');
        renderFunctionGraph(graphContainer, latex, {
            width: 500,
            height: 350
        });
        
        // MathJax rendern
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([modal]);
        }
    });
}

/**
 * Schließt das aktuelle Graph-Modal
 */
function closeGraphModal() {
    if (currentGraphModal) {
        currentGraphModal.classList.remove('active');
        setTimeout(() => {
            if (currentGraphModal) {
                currentGraphModal.remove();
                currentGraphModal = null;
            }
        }, 300);
    }
}

/**
 * Macht Funktionsformeln klickbar für Graph-Anzeige
 * @param {HTMLElement} container - Container mit LaTeX-Formeln
 */
function makeFormulasClickable(container) {
    if (!container) return;
    
    // Finde alle LaTeX-Elemente
    const latexElements = container.querySelectorAll('.tutor-step-latex, .MathJax');
    
    latexElements.forEach(elem => {
        // Hole den LaTeX-Inhalt
        const latex = elem.textContent || elem.innerText;
        
        // Prüfe ob es eine Funktion ist
        if (containsFunction(latex)) {
            elem.classList.add('clickable-formula');
            elem.title = 'Klicken für Funktionsgraph';
            
            elem.addEventListener('click', () => {
                showFunctionGraphModal(latex, 'Funktionsgraph');
            });
        }
    });
}

// ==================== Exports ====================

if (typeof window !== 'undefined') {
    window.GraphRenderer = {
        extractFunctionFromLatex,
        containsFunction,
        calculateOptimalViewport,
        renderFunctionGraph,
        showFunctionGraphModal,
        closeGraphModal,
        makeFormulasClickable
    };
}

