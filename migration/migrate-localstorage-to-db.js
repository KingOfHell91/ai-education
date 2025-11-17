// Migration Script - Migriert alte localStorage-Daten zu neuem DB-Schema
// Kann für Mock-DB oder echte DynamoDB verwendet werden

class DataMigrator {
    constructor() {
        this.dbService = null;
        this.schemas = window.DataSchemas;
        this.migrationLog = [];
    }
    
    // ==================== Main Migration ====================
    
    /**
     * Führe vollständige Migration durch
     * @param {boolean} dryRun - Wenn true, nur simulieren ohne zu speichern
     * @returns {Object} Migration-Report
     */
    async migrate(dryRun = false) {
        console.log('[DataMigrator] Starting migration...', { dryRun });
        
        if (!dryRun) {
            // Initialisiere DB Service
            this.dbService = new DBService();
        }
        
        const report = {
            startTime: new Date().toISOString(),
            dryRun,
            profiles: { migrated: 0, skipped: 0, errors: 0 },
            data: { exported: 0, imported: 0 },
            log: []
        };
        
        try {
            // Schritt 1: Migriere User-Profile
            await this.migrateUserProfiles(report, dryRun);
            
            // Schritt 2: Backup alte Daten
            if (!dryRun) {
                this.backupOldData();
            }
            
            // Schritt 3: Cleanup (optional)
            // await this.cleanupOldData(report, dryRun);
            
            report.success = true;
            report.endTime = new Date().toISOString();
            
            console.log('[DataMigrator] Migration completed successfully');
        } catch (error) {
            report.success = false;
            report.error = error.message;
            console.error('[DataMigrator] Migration failed:', error);
        }
        
        report.log = this.migrationLog;
        return report;
    }
    
    // ==================== User Profile Migration ====================
    
    async migrateUserProfiles(report, dryRun) {
        this.log('info', 'Starting user profile migration...');
        
        // Hole alte Profile
        const oldProfiles = this.getOldUserProfiles();
        
        if (oldProfiles.length === 0) {
            this.log('info', 'No old profiles found to migrate');
            return;
        }
        
        for (const oldProfile of oldProfiles) {
            try {
                // Konvertiere zu neuem Schema
                const newProfile = this.convertProfileToNewSchema(oldProfile);
                
                if (!dryRun) {
                    // Speichere in neue DB
                    await this.dbService.saveUserProfile(newProfile.userId, newProfile);
                    this.log('success', `Migrated profile: ${newProfile.email}`);
                    report.profiles.migrated++;
                } else {
                    this.log('info', `[DRY RUN] Would migrate: ${oldProfile.email}`);
                    report.profiles.migrated++;
                }
            } catch (error) {
                this.log('error', `Failed to migrate profile ${oldProfile.email}: ${error.message}`);
                report.profiles.errors++;
            }
        }
    }
    
    getOldUserProfiles() {
        const profiles = [];
        
        // Suche nach alten Profilen
        // Format 1: user_profile in localStorage
        const oldProfile = localStorage.getItem('user_profile');
        if (oldProfile) {
            try {
                const parsed = JSON.parse(oldProfile);
                profiles.push({
                    ...parsed,
                    source: 'user_profile'
                });
            } catch (error) {
                this.log('error', 'Failed to parse user_profile: ' + error.message);
            }
        }
        
        // Format 2: Durchsuche alle localStorage Keys nach Profil-artigen Daten
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('profile') || key.includes('user_data'))) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && typeof data === 'object') {
                        profiles.push({
                            ...data,
                            source: key
                        });
                    }
                } catch (error) {
                    // Nicht JSON, skip
                }
            }
        }
        
        return profiles;
    }
    
    convertProfileToNewSchema(oldProfile) {
        // Generiere User ID wenn nicht vorhanden
        const userId = oldProfile.userId || 
                      oldProfile.email || 
                      this.schemas.generateId('user');
        
        // Konvertiere zu neuem Schema
        const newProfile = {
            userId,
            email: oldProfile.email || `user_${userId}@migrated.local`,
            name: oldProfile.name || 'Migrierter User',
            grade: oldProfile.grade || '12',
            learningGoal: oldProfile.learningGoal || 'general-practice',
            learningStyle: oldProfile.learningStyle || 'step-by-step',
            sessionLength: oldProfile.sessionLength || 'medium',
            weakTopics: oldProfile.weakTopics || [],
            createdAt: oldProfile.createdAt || this.schemas.generateTimestamp(),
            lastUpdated: this.schemas.generateTimestamp(),
            lastLogin: null
        };
        
        return newProfile;
    }
    
    // ==================== Backup & Restore ====================
    
    backupOldData() {
        this.log('info', 'Creating backup of old data...');
        
        const backup = {
            timestamp: new Date().toISOString(),
            data: {}
        };
        
        // Backup alles in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !key.startsWith('mathtutor_db_')) { // Skip neue DB-Daten
                backup.data[key] = localStorage.getItem(key);
            }
        }
        
        // Speichere Backup
        const backupKey = `migration_backup_${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));
        
        this.log('success', `Backup created: ${backupKey}`);
        return backupKey;
    }
    
    restoreFromBackup(backupKey) {
        this.log('info', `Restoring from backup: ${backupKey}...`);
        
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                throw new Error('Backup not found');
            }
            
            const backup = JSON.parse(backupData);
            
            // Restore data
            for (const [key, value] of Object.entries(backup.data)) {
                localStorage.setItem(key, value);
            }
            
            this.log('success', 'Restore completed');
            return true;
        } catch (error) {
            this.log('error', `Restore failed: ${error.message}`);
            return false;
        }
    }
    
    // ==================== Cleanup ====================
    
    async cleanupOldData(report, dryRun) {
        this.log('info', 'Cleaning up old data...');
        
        const keysToRemove = [];
        
        // Identifiziere alte Keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key === 'user_profile' ||
                key === 'openai_api_key' ||
                key === 'api_provider' ||
                (key.includes('profile') && !key.startsWith('mathtutor_db_'))
            )) {
                keysToRemove.push(key);
            }
        }
        
        if (keysToRemove.length === 0) {
            this.log('info', 'No old data to clean up');
            return;
        }
        
        this.log('info', `Found ${keysToRemove.length} old keys to remove`);
        
        if (!dryRun) {
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                this.log('info', `Removed: ${key}`);
            });
        } else {
            this.log('info', `[DRY RUN] Would remove: ${keysToRemove.join(', ')}`);
        }
    }
    
    // ==================== Export & Import ====================
    
    /**
     * Exportiere alle Daten aus Mock-DB
     */
    exportData() {
        if (!this.dbService) {
            this.dbService = new DBService();
        }
        
        const dbMock = this.dbService.provider;
        if (!dbMock.exportAllData) {
            throw new Error('Export not supported by current DB provider');
        }
        
        const exportData = dbMock.exportAllData();
        
        // Füge Metadaten hinzu
        const exportPackage = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: exportData
        };
        
        return exportPackage;
    }
    
    /**
     * Importiere Daten in Mock-DB
     */
    importData(exportPackage) {
        if (!this.dbService) {
            this.dbService = new DBService();
        }
        
        const dbMock = this.dbService.provider;
        if (!dbMock.importData) {
            throw new Error('Import not supported by current DB provider');
        }
        
        return dbMock.importData(exportPackage.data);
    }
    
    /**
     * Speichere Export als Datei
     */
    downloadExport() {
        const exportData = this.exportData();
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mathtutor-export-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        this.log('success', 'Export downloaded');
    }
    
    // ==================== Utility Methods ====================
    
    log(level, message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };
        
        this.migrationLog.push(logEntry);
        
        const consoleMethod = level === 'error' ? console.error : 
                             level === 'warning' ? console.warn : 
                             console.log;
        consoleMethod(`[DataMigrator] ${message}`);
    }
    
    /**
     * Erstelle Migrations-Report als HTML
     */
    generateReportHTML(report) {
        return `
<div class="migration-report">
    <h2>Migration Report</h2>
    <p><strong>Status:</strong> ${report.success ? '✓ Success' : '✗ Failed'}</p>
    <p><strong>Dry Run:</strong> ${report.dryRun ? 'Yes' : 'No'}</p>
    <p><strong>Time:</strong> ${report.startTime} - ${report.endTime || 'In Progress'}</p>
    
    <h3>Profiles</h3>
    <ul>
        <li>Migrated: ${report.profiles.migrated}</li>
        <li>Skipped: ${report.profiles.skipped}</li>
        <li>Errors: ${report.profiles.errors}</li>
    </ul>
    
    <h3>Log</h3>
    <div class="migration-log">
        ${report.log.map(entry => `
            <div class="log-entry log-${entry.level}">
                <span class="log-time">${entry.timestamp}</span>
                <span class="log-message">${entry.message}</span>
            </div>
        `).join('')}
    </div>
</div>
        `;
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataMigrator;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.DataMigrator = DataMigrator;
}

// ==================== CLI Usage ====================

/**
 * Beispiel-Nutzung via Browser-Console:
 * 
 * // Dry Run (nur simulieren)
 * const migrator = new DataMigrator();
 * const report = await migrator.migrate(true);
 * console.log(report);
 * 
 * // Echte Migration
 * const report = await migrator.migrate(false);
 * 
 * // Export
 * migrator.downloadExport();
 * 
 * // Backup wiederherstellen
 * migrator.restoreFromBackup('migration_backup_1234567890');
 */

