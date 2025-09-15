// Math Tutor AI - JavaScript für KI-Integration und Interaktivität

class MathTutorAI {
    constructor() {
        this.apiKey = localStorage.getItem('openai_api_key') || '';
        this.apiProvider = localStorage.getItem('api_provider') || 'openai';
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
        const topic = document.getElementById('topic-select').value;
        const difficulty = document.getElementById('difficulty-select').value;
        const taskType = document.getElementById('task-type-select').value;

        if (!this.apiKey) {
            this.showApiModal();
            return;
        }

        this.showLoading(true);

        const prompt = `Erstelle eine Mathematik-Aufgabe für das Thema "${topic}" mit Schwierigkeit "${difficulty}" und Aufgabentyp "${taskType}". Die Aufgabe sollte für Abitur-Vorbereitung geeignet sein.`;

        try {
            const response = await this.callAIAPI(prompt, 'generate');
            this.displayResults(response);
        } catch (error) {
            console.error('Fehler bei der Aufgaben-Generierung:', error);
            this.showNotification('Fehler bei der Aufgaben-Generierung. Bitte versuche es erneut.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async callAIAPI(prompt, type) {
        const systemPrompt = type === 'analyze' 
            ? 'Du bist ein erfahrener Mathematik-Tutor. Analysiere die gegebene Mathematik-Aufgabe oder -Frage und gib eine hilfreiche Antwort mit Schritt-für-Schritt-Lösung.'
            : 'Du bist ein erfahrener Mathematik-Lehrer. Erstelle eine passende Mathematik-Aufgabe basierend auf den gegebenen Parametern.';

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
    }

    formatResponse(content) {
        // Einfache Formatierung für Mathematik-Inhalte
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/, '<p>$1</p>');
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
