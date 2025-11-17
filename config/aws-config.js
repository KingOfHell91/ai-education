// AWS Amplify Configuration
// Schaltet zwischen Mock-Modus (lokale Entwicklung) und Production (echte AWS-Services)

const AWS_CONFIG = {
    // Mock-Modus für lokale Entwicklung (keine AWS-Services erforderlich)
    USE_MOCK: true, // Auf false setzen für echte AWS-Integration
    
    // AWS Amplify Konfiguration (wird nur verwendet wenn USE_MOCK = false)
    amplify: {
        Auth: {
            // Amazon Cognito Region
            region: 'eu-central-1', // Frankfurt
            
            // Amazon Cognito User Pool ID
            userPoolId: 'eu-central-1_XXXXXXXXX', // Später mit echtem Wert ersetzen
            
            // Amazon Cognito Web Client ID
            userPoolWebClientId: 'XXXXXXXXXXXXXXXXXXXXXXXXXX', // Später mit echtem Wert ersetzen
            
            // Cookie-Storage für Session Management
            cookieStorage: {
                domain: window.location.hostname,
                path: '/',
                expires: 30, // Cookie läuft nach 30 Tagen ab
                sameSite: "strict",
                secure: true // Nur über HTTPS (im Production-Modus)
            },
            
            // OAuth-Einstellungen (optional für später)
            oauth: {
                domain: 'your-domain.auth.eu-central-1.amazoncognito.com',
                scope: ['email', 'profile', 'openid'],
                redirectSignIn: window.location.origin + '/index.html',
                redirectSignOut: window.location.origin + '/login.html',
                responseType: 'code'
            }
        },
        
        // AWS AppSync / API Gateway (für später)
        API: {
            endpoints: [
                {
                    name: "MathTutorAPI",
                    endpoint: "https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod",
                    region: "eu-central-1"
                }
            ]
        }
    },
    
    // DynamoDB Konfiguration
    dynamodb: {
        region: 'eu-central-1',
        
        // Tabellennamen
        tables: {
            userProfiles: 'MathTutor-UserProfiles',
            competencyTracking: 'MathTutor-CompetencyTracking',
            performanceMetrics: 'MathTutor-PerformanceMetrics',
            behaviorAnalytics: 'MathTutor-BehaviorAnalytics'
        },
        
        // Endpoint für lokale DynamoDB-Entwicklung (optional)
        endpoint: null // z.B. 'http://localhost:8000' für lokales DynamoDB
    },
    
    // Session-Management-Einstellungen
    session: {
        // Token-Gültigkeit in Tagen
        tokenExpiryDays: 30,
        
        // Automatisches Token-Refresh aktivieren
        autoRefresh: true,
        
        // Refresh-Intervall in Minuten
        refreshIntervalMinutes: 60
    },
    
    // Logging und Debugging
    debug: {
        // Detailliertes Logging aktivieren
        verbose: true,
        
        // Auth-Events loggen
        logAuthEvents: true,
        
        // API-Calls loggen
        logApiCalls: true
    }
};

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AWS_CONFIG;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.AWS_CONFIG = AWS_CONFIG;
}

