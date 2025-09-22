// Math Tutor AI - JavaScript für KI-Integration und Interaktivität

class MathTutorAI {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.apiProvider = localStorage.getItem('api_provider') || 'openai';
        this.userProfile = this.loadUserProfile();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkApiConfiguration();
        this.setupTabSwitching();
        this.setupImageUpload();
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

        // Generate Task Button
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateTask();
        });

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

        // Enter key for text input
        document.getElementById('math-input').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.analyzeTextInput();
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
            });
        });
    }

    setupImageUpload() {
        const uploadZone = document.getElementById('upload-zone');
        const imageInput = document.getElementById('image-input');
        const imagePreview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        const removeImageBtn = document.getElementById('remove-image');

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
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });

        // File input change
        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // Remove image
        removeImageBtn.addEventListener('click', () => {
            this.removeImage();
        });
    }

    handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Bitte wähle eine gültige Bilddatei aus.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('preview-img');
            const imagePreview = document.getElementById('image-preview');
            const uploadZone = document.getElementById('upload-zone');

            previewImg.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadZone.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        const imagePreview = document.getElementById('image-preview');
        const uploadZone = document.getElementById('upload-zone');
        const imageInput = document.getElementById('image-input');

        imagePreview.style.display = 'none';
        uploadZone.style.display = 'block';
        imageInput.value = '';
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
            this.showApiModal();
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

    async generateTask() {
        // DEBUG: Ignoriere alle Benutzereinstellungen und sende IMMER die Debug-Anfrage
        console.log('=== DEBUG MODE: Force Debug Request ===');

        if (!this.apiKey) {
            this.showApiModal();
            return;
        }

        this.showLoading(true);

        // DEBUG: Feste Debug-Anfrage mit allen mathematischen Zeichen
        const prompt = `Erstelle eine Mathematik-Aufgabe mit vielen verschiedenen mathematischen Symbolen wie Integralen, Summen, Produkten, Wurzeln, Brüchen, Potenzen, griechischen Buchstaben, trigonometrischen Funktionen, Logarithmen, Exponentialfunktionen, Ungleichungen, Mengenoperatoren, Unendlichkeit und Limites.`;

        console.log('Debug prompt:', prompt);

        try {
            const response = await this.callAIAPI(prompt, 'generate');
            
            // Validierung: Verhindere, dass der Prompt selbst angezeigt wird
            if (response.includes('Erstelle eine Mathematik-Aufgabe') || 
                response.includes('mathematischen Symbolen') ||
                response.length < 50) {
                console.warn('KI hat möglicherweise den Prompt selbst ausgegeben, versuche erneut...');
                // Kurz warten und nochmal versuchen
                setTimeout(async () => {
                    try {
                        const retryResponse = await this.callAIAPI(prompt, 'generate');
                        this.displayResults(retryResponse);
                    } catch (retryError) {
                        console.error('Auch der Retry-Versuch fehlgeschlagen:', retryError);
                        this.showNotification('Fehler bei der Aufgaben-Generierung. Bitte versuche es erneut.', 'error');
                    }
                }, 1000);
                return;
            }
            
            this.displayResults(response);
        } catch (error) {
            console.error('Fehler bei der Aufgaben-Generierung:', error);
            this.showNotification('Fehler bei der Aufgaben-Generierung. Bitte versuche es erneut.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async callAIAPI(prompt, type) {
        const baseSystemPrompt = type === 'analyze' 
            ? `Du bist ein erfahrener Mathematik-Tutor mit Spezialisierung auf deutsche Schulmathematik. 

WICHTIGE RICHTLINIEN für deine Antworten:
1. Verwende korrekte LaTeX-Notation für alle mathematischen Ausdrücke
2. Für Integrale: Schreibe \\int_{a}^{b} f(x) \\, dx (nicht int_{a}^{b} f(x) dx)
3. Für Potenzen: Schreibe x^{2} oder x^2 (nicht x^2 ohne Klammern bei komplexen Ausdrücken)
4. Für Brüche: Verwende \\frac{a}{b} für komplexe Brüche
5. Für Wurzeln: Verwende \\sqrt{x} oder \\sqrt[n]{x}
6. Gib immer Schritt-für-Schritt-Lösungen mit Erklärungen
7. Verwende deutsche mathematische Terminologie
8. Erkläre jeden Schritt verständlich für Schüler
9. Gib am Ende eine Zusammenfassung der wichtigsten Punkte

Analysiere die gegebene Mathematik-Aufgabe oder -Frage und gib eine hilfreiche Antwort mit detaillierter Schritt-für-Schritt-Lösung.`
            : `Du bist ein erfahrener Mathematik-Lehrer mit Spezialisierung auf deutsche Schulmathematik.

WICHTIGE RICHTLINIEN für Aufgaben-Generierung:
1. Erstelle Aufgaben, die dem deutschen Lehrplan entsprechen
2. Verwende korrekte LaTeX-Notation für alle mathematischen Ausdrücke
3. Strukturiere die Aufgabe klar mit einer klaren Aufgabenstellung
4. Berücksichtige das angegebene Schwierigkeitsniveau
5. Verwende deutsche mathematische Terminologie
6. Gib KEINE Lösung an - nur die Aufgabenstellung!

WICHTIG: Gib nur die Aufgabenstellung aus, keine Lösung, keine Lösungshinweise, keine Erklärungen. Der Schüler soll die Aufgabe selbst lösen.

Erstelle eine passende Mathematik-Aufgabe basierend auf den gegebenen Parametern.`;
        
        const systemPrompt = this.getPersonalizedPrompt(baseSystemPrompt, type);

        const requestBody = {
            model: this.apiProvider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-sonnet-20240229',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        };

        const apiUrl = this.apiProvider === 'openai' 
            ? 'https://api.openai.com/v1/chat/completions'
            : 'https://api.anthropic.com/v1/messages';

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        if (this.apiProvider === 'anthropic') {
            headers['x-api-key'] = this.apiKey;
            delete headers['Authorization'];
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API-Fehler: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (this.apiProvider === 'openai') {
            return data.choices[0].message.content;
        } else {
            return data.content[0].text;
        }
    }

    displayResults(content) {
        const resultsSection = document.getElementById('results-section');
        const resultsContent = document.getElementById('results-content');
        
        resultsContent.innerHTML = `
            <div class="ai-response">
                <div class="response-header">
                    <i class="fas fa-robot"></i>
                    <span>KI-Antwort</span>
                </div>
                <div class="response-content">
                    ${this.formatResponse(content)}
                </div>
            </div>
        `;
        
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // MathJax nach dem Einfügen des Inhalts aktualisieren
        this.renderMathJax(resultsContent);
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
        // Bereinige den Inhalt von störenden Zeichen
        let cleaned = content;
        
        // Entferne einzelne Backslashes, die nicht zu LaTeX-Befehlen gehören
        // VORSICHT: Sehr konservativ, um keine mathematischen Ausdrücke zu beschädigen
        cleaned = cleaned.replace(/\\(?![\w{}()\[\]\\])/g, '');
        
        // Entferne isolierte Klammern, die nicht zu Formeln gehören
        // VORSICHT: Diese Zeile könnte auch Probleme verursachen!
        // cleaned = cleaned.replace(/\\(?![()])/g, '');
        
        return cleaned;
    }

    convertMathNotation(content) {
        // DEBUG: LaTeX-Konvertierung temporär deaktiviert für Tests
        // Konvertiere nur explizite LaTeX-Notationen, nicht normale Wörter
        let converted = content;
        
        // VORSICHT: Diese Zeile könnte Teile von Funktionen entfernen!
        // converted = converted.replace(/\$([^$]+)\$/g, '$1');
        
        // Nur LaTeX-Befehle mit Backslash konvertieren (sicherer)
        // Wurzeln: \sqrt{x} -> \(\sqrt{x}\)
        converted = converted.replace(/\\sqrt\{([^}]+)\}/g, '\\(\\sqrt{$1}\\)');
        
        // Brüche: \frac{a}{b} -> \(\frac{a}{b}\)
        converted = converted.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '\\(\\frac{$1}{$2}\\)');
        
        // Potenzen: sowohl x^{2} als auch x^2
        converted = converted.replace(/([a-zA-Z0-9]+)\^\{([^}]+)\}/g, '\\($1^{$2}\\)');
        converted = converted.replace(/([a-zA-Z0-9]+)\^([0-9]+)/g, '\\($1^{$2}\\)');
        
        // Indizes: nur wenn explizit LaTeX-Format x_{2}
        converted = converted.replace(/([a-zA-Z0-9]+)_\{([^}]+)\}/g, '\\($1_{$2}\\)');
        
        // Nur explizite LaTeX-Befehle konvertieren
        converted = converted.replace(/\\int/g, '\\(\\int\\)');
        converted = converted.replace(/\\sum/g, '\\(\\sum\\)');
        converted = converted.replace(/\\prod/g, '\\(\\prod\\)');
        converted = converted.replace(/\\lim/g, '\\(\\lim\\)');
        
        // Griechische Buchstaben nur mit Backslash
        converted = converted.replace(/\\alpha/g, '\\(\\alpha\\)');
        converted = converted.replace(/\\beta/g, '\\(\\beta\\)');
        converted = converted.replace(/\\gamma/g, '\\(\\gamma\\)');
        converted = converted.replace(/\\delta/g, '\\(\\delta\\)');
        converted = converted.replace(/\\epsilon/g, '\\(\\epsilon\\)');
        converted = converted.replace(/\\pi/g, '\\(\\pi\\)');
        converted = converted.replace(/\\sigma/g, '\\(\\sigma\\)');
        converted = converted.replace(/\\omega/g, '\\(\\omega\\)');
        
        // Unendlichkeit: nur mit Backslash
        converted = converted.replace(/\\infty/g, '\\(\\infty\\)');
        
        // Plusminus: nur mit Backslash
        converted = converted.replace(/\\pm/g, '\\(\\pm\\)');
        
        // Ungleichungen: nur mit Backslash
        converted = converted.replace(/\\leq/g, '\\(\\leq\\)');
        converted = converted.replace(/\\geq/g, '\\(\\geq\\)');
        
        // Nicht gleich: nur mit Backslash
        converted = converted.replace(/\\neq/g, '\\(\\neq\\)');
        
        // Teilmenge: nur mit Backslash
        converted = converted.replace(/\\subset/g, '\\(\\subset\\)');
        converted = converted.replace(/\\supset/g, '\\(\\supset\\)');
        
        // Element von: nur mit Backslash (NICHT das Wort "in")
        converted = converted.replace(/\\in/g, '\\(\\in\\)');
        
        // Entferne störende Klammern, die nicht zu mathematischen Formeln gehören
        // VORSICHT: Diese Zeilen könnten rote Klammern verursachen!
        // converted = converted.replace(/\\\(/g, '');
        // converted = converted.replace(/\\\)/g, '');
        
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
            grade: '12',
            learningGoal: 'abitur-prep',
            weakTopics: [],
            learningStyle: 'step-by-step',
            sessionLength: 'medium',
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }

    populateProfileForm(profile) {
        document.getElementById('user-name').value = profile.name || '';
        document.getElementById('user-grade').value = profile.grade || '12';
        document.getElementById('learning-goal').value = profile.learningGoal || 'abitur-prep';
        document.getElementById('learning-style').value = profile.learningStyle || 'step-by-step';
        document.getElementById('session-length').value = profile.sessionLength || 'medium';

        // Setze Checkboxen für schwache Themen
        const weakTopicCheckboxes = document.querySelectorAll('#weak-topics input[type="checkbox"]');
        console.log('Gefundene Checkboxen:', weakTopicCheckboxes.length);
        console.log('Profil schwache Themen:', profile.weakTopics);
        
        weakTopicCheckboxes.forEach(checkbox => {
            const isChecked = profile.weakTopics && profile.weakTopics.includes(checkbox.value);
            checkbox.checked = isChecked;
            console.log(`Checkbox ${checkbox.value}: ${isChecked}`);
        });
    }

    saveUserProfile() {
        const profile = {
            name: document.getElementById('user-name').value.trim(),
            grade: document.getElementById('user-grade').value,
            learningGoal: document.getElementById('learning-goal').value,
            weakTopics: this.getSelectedWeakTopics(),
            learningStyle: document.getElementById('learning-style').value,
            sessionLength: document.getElementById('session-length').value,
            createdAt: this.userProfile.createdAt || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // Debugging
        console.log('Speichere Profil:', profile);
        console.log('Ausgewählte schwache Themen:', profile.weakTopics);

        // Validierung
        if (!profile.name) {
            this.showNotification('Bitte gib deinen Namen ein.', 'warning');
            return;
        }

        this.userProfile = profile;
        localStorage.setItem('user_profile', JSON.stringify(profile));
        this.showNotification('Profil erfolgreich gespeichert!', 'success');
        
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

    getPersonalizedPrompt(basePrompt, type) {
        // Erstelle personalisierte Prompts basierend auf dem Benutzerprofil
        const profile = this.userProfile;
        
        let personalizedPrompt = basePrompt;
        
        if (profile.learningStyle === 'visual') {
            personalizedPrompt += ' Verwende visuelle Elemente wie Diagramme oder Grafiken in deiner Erklärung.';
        } else if (profile.learningStyle === 'step-by-step') {
            personalizedPrompt += ' Erkläre jeden Schritt detailliert und strukturiert.';
        } else if (profile.learningStyle === 'conceptual') {
            personalizedPrompt += ' Fokussiere auf das konzeptuelle Verständnis und die Zusammenhänge.';
        } else if (profile.learningStyle === 'practical') {
            personalizedPrompt += ' Verwende viele praktische Beispiele und Anwendungen.';
        }

        if (profile.weakTopics && profile.weakTopics.length > 0) {
            personalizedPrompt += ` Der Benutzer hat Schwierigkeiten mit: ${profile.weakTopics.join(', ')}. Berücksichtige das bei der Erklärung.`;
        }

        if (profile.grade) {
            personalizedPrompt += ` Das Lernniveau entspricht Klasse ${profile.grade}.`;
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
