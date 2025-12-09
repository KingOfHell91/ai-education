// Math Tutor AI - JavaScript für KI-Integration und Interaktivität

class MathTutorAI {
    constructor() {
        // Auth Service
        this.authService = new AuthService();
        this.currentUser = null;
        this.userId = null;
        
        // Legacy API Keys (für Backward-Compatibility)
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.apiProvider = localStorage.getItem('api_provider') || 'openai';
        this.userProfile = this.loadUserProfile();
        this.uploadedImages = [];
        this.abiTasks = [];
        this.currentAbiSource = null;
        this.solutionState = this.getDefaultSolutionState();
        const origin = window.location.origin && window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:4000';
        this.backendApiBase = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL) || origin.replace(/\/$/, '');
        
        // Initialisiere mit Auth-Check
        this.initWithAuth();
    }
    
    async initWithAuth() {
        try {
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
            lastWasCorrect: null,
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
            model = 'gpt-5.1';
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
        
        if (!userSolution && canvasImages.length === 0) {
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
            
            const prompt = this.buildEvaluationPrompt({
                userSolution,
                drawingInfo,
                hasDrawings: canvasImages.length > 0
            });
            
            const response = await this.callAIAPI(prompt, 'analyze', null, this.currentTaskContext?.topic);
            
            const STATUS_TOKEN = '__SOLUTION_STATUS:OK__';
            const success = response.includes(STATUS_TOKEN);
            const cleanedResponse = success
                ? response.replace(STATUS_TOKEN, '').trim()
                : response.trim();

            Object.assign(this.solutionState, {
                lastUserSolution: userSolution,
                lastCanvasImages: canvasImages,
                lastCheckResponse: cleanedResponse,
                lastWasCorrect: success,
                hilfestellungEligible: !success && !!userSolution,
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
            
            this.displayFeedback(cleanedResponse, canvasImages);
            this.updateSolutionActionButtons();
        } catch (error) {
            console.error('Fehler beim Überprüfen der Lösung:', error);
            this.showNotification('Fehler beim Überprüfen der Lösung: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
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
