// DynamoDB Adapter - Real AWS DynamoDB Integration
// STUB: Wird später implementiert wenn echte DynamoDB-Instanz verfügbar ist

/**
 * DynamoDB Adapter für echte AWS-Integration
 * 
 * Voraussetzungen für späteren Production-Einsatz:
 * 1. AWS SDK for JavaScript v3 einbinden:
 *    <script src="https://sdk.amazonaws.com/js/aws-sdk-2.1000.0.min.js"></script>
 * 
 * 2. DynamoDB-Tabellen in AWS erstellen mit folgenden Schemas:
 *    - MathTutor-UserProfiles (PK: userId)
 *    - MathTutor-CompetencyTracking (PK: userId, SK: topic)
 *    - MathTutor-PerformanceMetrics (PK: userId, SK: timestamp)
 *    - MathTutor-BehaviorAnalytics (PK: userId, SK: behaviorKey)
 *    - MathTutor-Sessions (PK: userId, SK: sessionId)
 *    - MathTutor-LearningGoals (PK: userId, SK: goalId)
 * 
 * 3. AWS Credentials konfigurieren (via Cognito Identity Pool oder IAM)
 * 
 * 4. USE_MOCK in aws-config.js auf false setzen
 */

class DynamoDBAdapter {
    constructor() {
        console.log('[DynamoDBAdapter] Initializing...');
        
        // Prüfe ob AWS SDK verfügbar ist
        if (typeof AWS === 'undefined') {
            throw new Error('AWS SDK not loaded. Please include AWS SDK script.');
        }
        
        // Lade AWS Config
        this.config = window.AWS_CONFIG || {};
        const dbConfig = this.config.dynamodb || {};
        
        // Configure AWS SDK
        AWS.config.region = dbConfig.region || 'eu-central-1';
        
        // DynamoDB Document Client (vereinfacht Item-Handling)
        this.docClient = new AWS.DynamoDB.DocumentClient({
            region: dbConfig.region,
            endpoint: dbConfig.endpoint // null für echte DynamoDB, URL für lokales DynamoDB
        });
        
        console.log('[DynamoDBAdapter] Initialized with region:', AWS.config.region);
    }
    
    // ==================== CRUD Operations ====================
    
    /**
     * Put Item (Erstellen oder Überschreiben)
     */
    async putItem(tableName, item) {
        try {
            const params = {
                TableName: tableName,
                Item: item
            };
            
            await this.docClient.put(params).promise();
            return { success: true, item };
        } catch (error) {
            console.error('[DynamoDBAdapter] putItem error:', error);
            throw this._normalizeError(error);
        }
    }
    
    /**
     * Get Item (Einzelnes Item abrufen)
     */
    async getItem(tableName, keys) {
        try {
            const params = {
                TableName: tableName,
                Key: keys
            };
            
            const result = await this.docClient.get(params).promise();
            return result.Item || null;
        } catch (error) {
            console.error('[DynamoDBAdapter] getItem error:', error);
            throw this._normalizeError(error);
        }
    }
    
    /**
     * Update Item (Teilweise aktualisieren)
     */
    async updateItem(tableName, keys, updates) {
        try {
            // Baue UpdateExpression
            const updateExpressionParts = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};
            
            let index = 0;
            for (const [key, value] of Object.entries(updates)) {
                const attrName = `#attr${index}`;
                const attrValue = `:val${index}`;
                
                updateExpressionParts.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = value;
                
                index++;
            }
            
            const params = {
                TableName: tableName,
                Key: keys,
                UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            };
            
            const result = await this.docClient.update(params).promise();
            return { success: true, item: result.Attributes };
        } catch (error) {
            console.error('[DynamoDBAdapter] updateItem error:', error);
            throw this._normalizeError(error);
        }
    }
    
    /**
     * Delete Item
     */
    async deleteItem(tableName, keys) {
        try {
            const params = {
                TableName: tableName,
                Key: keys
            };
            
            await this.docClient.delete(params).promise();
            return { success: true };
        } catch (error) {
            console.error('[DynamoDBAdapter] deleteItem error:', error);
            throw this._normalizeError(error);
        }
    }
    
    /**
     * Query (Abfrage mit Partition Key und optionalem Sort Key)
     */
    async query(tableName, keys, options = {}) {
        try {
            const { limit, sortDescending } = options;
            
            // Baue KeyConditionExpression
            const keyConditionParts = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};
            
            let index = 0;
            for (const [key, value] of Object.entries(keys)) {
                const attrName = `#key${index}`;
                const attrValue = `:keyval${index}`;
                
                keyConditionParts.push(`${attrName} = ${attrValue}`);
                expressionAttributeNames[attrName] = key;
                expressionAttributeValues[attrValue] = value;
                
                index++;
            }
            
            const params = {
                TableName: tableName,
                KeyConditionExpression: keyConditionParts.join(' AND '),
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ScanIndexForward: !sortDescending // false = descending
            };
            
            if (limit) {
                params.Limit = limit;
            }
            
            const result = await this.docClient.query(params).promise();
            return result.Items || [];
        } catch (error) {
            console.error('[DynamoDBAdapter] query error:', error);
            throw this._normalizeError(error);
        }
    }
    
    /**
     * Scan (Vollständiger Table Scan - teuer, nur für kleine Tabellen)
     */
    async scan(tableName, filter = {}) {
        try {
            const params = {
                TableName: tableName
            };
            
            // Optionaler Filter
            if (Object.keys(filter).length > 0) {
                const filterParts = [];
                const expressionAttributeNames = {};
                const expressionAttributeValues = {};
                
                let index = 0;
                for (const [key, value] of Object.entries(filter)) {
                    const attrName = `#filter${index}`;
                    const attrValue = `:filterval${index}`;
                    
                    filterParts.push(`${attrName} = ${attrValue}`);
                    expressionAttributeNames[attrName] = key;
                    expressionAttributeValues[attrValue] = value;
                    
                    index++;
                }
                
                params.FilterExpression = filterParts.join(' AND ');
                params.ExpressionAttributeNames = expressionAttributeNames;
                params.ExpressionAttributeValues = expressionAttributeValues;
            }
            
            const result = await this.docClient.scan(params).promise();
            return result.Items || [];
        } catch (error) {
            console.error('[DynamoDBAdapter] scan error:', error);
            throw this._normalizeError(error);
        }
    }
    
    // ==================== Batch Operations ====================
    
    /**
     * Batch Get Items (bis zu 100 Items)
     */
    async batchGetItems(tableName, keysArray) {
        try {
            // DynamoDB BatchGetItem unterstützt max 100 Items
            const chunks = this._chunkArray(keysArray, 100);
            const allResults = [];
            
            for (const chunk of chunks) {
                const params = {
                    RequestItems: {
                        [tableName]: {
                            Keys: chunk
                        }
                    }
                };
                
                const result = await this.docClient.batchGet(params).promise();
                if (result.Responses && result.Responses[tableName]) {
                    allResults.push(...result.Responses[tableName]);
                }
            }
            
            return allResults;
        } catch (error) {
            console.error('[DynamoDBAdapter] batchGetItems error:', error);
            throw this._normalizeError(error);
        }
    }
    
    /**
     * Batch Put Items (bis zu 25 Items)
     */
    async batchPutItems(tableName, items) {
        try {
            // DynamoDB BatchWriteItem unterstützt max 25 Items
            const chunks = this._chunkArray(items, 25);
            const results = [];
            
            for (const chunk of chunks) {
                const putRequests = chunk.map(item => ({
                    PutRequest: {
                        Item: item
                    }
                }));
                
                const params = {
                    RequestItems: {
                        [tableName]: putRequests
                    }
                };
                
                await this.docClient.batchWrite(params).promise();
                results.push(...chunk.map(item => ({ success: true, item })));
            }
            
            return results;
        } catch (error) {
            console.error('[DynamoDBAdapter] batchPutItems error:', error);
            throw this._normalizeError(error);
        }
    }
    
    // ==================== Helper Methods ====================
    
    _chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    _normalizeError(error) {
        // AWS DynamoDB Error Codes
        const errorCode = error.code || error.name;
        
        switch (errorCode) {
            case 'ResourceNotFoundException':
                return new Error('Tabelle nicht gefunden. Bitte erstelle die DynamoDB-Tabellen.');
            case 'ValidationException':
                return new Error('Ungültige Daten: ' + error.message);
            case 'ConditionalCheckFailedException':
                return new Error('Bedingung nicht erfüllt.');
            case 'ProvisionedThroughputExceededException':
                return new Error('DynamoDB Durchsatz überschritten. Bitte versuche es später erneut.');
            case 'ItemCollectionSizeLimitExceededException':
                return new Error('Item-Collection zu groß.');
            default:
                return new Error(`DynamoDB Fehler (${errorCode}): ${error.message}`);
        }
    }
}

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamoDBAdapter;
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.DynamoDBAdapter = DynamoDBAdapter;
}

/**
 * MIGRATION GUIDE: Mock zu DynamoDB
 * 
 * Schritt 1: AWS DynamoDB-Tabellen erstellen
 * ----------------------------------------
 * Nutze AWS Console oder AWS CLI:
 * 
 * aws dynamodb create-table \
 *   --table-name MathTutor-UserProfiles \
 *   --attribute-definitions AttributeName=userId,AttributeType=S \
 *   --key-schema AttributeName=userId,KeyType=HASH \
 *   --billing-mode PAY_PER_REQUEST
 * 
 * aws dynamodb create-table \
 *   --table-name MathTutor-CompetencyTracking \
 *   --attribute-definitions \
 *       AttributeName=userId,AttributeType=S \
 *       AttributeName=topic,AttributeType=S \
 *   --key-schema \
 *       AttributeName=userId,KeyType=HASH \
 *       AttributeName=topic,KeyType=RANGE \
 *   --billing-mode PAY_PER_REQUEST
 * 
 * (Wiederhole für andere Tabellen...)
 * 
 * Schritt 2: AWS Credentials konfigurieren
 * ----------------------------------------
 * Option A: Cognito Identity Pool (empfohlen für Web-Apps)
 *   - Erstelle Cognito Identity Pool
 *   - Verbinde mit Cognito User Pool
 *   - Konfiguriere IAM-Rollen mit DynamoDB-Zugriff
 * 
 * Option B: Temporäre Credentials (für Tests)
 *   AWS.config.credentials = new AWS.Credentials({
 *       accessKeyId: 'YOUR_ACCESS_KEY',
 *       secretAccessKey: 'YOUR_SECRET_KEY'
 *   });
 * 
 * Schritt 3: Konfiguration in aws-config.js
 * -----------------------------------------
 * Setze USE_MOCK = false
 * Stelle sicher, dass DynamoDB-Region korrekt ist
 * 
 * Schritt 4: Daten migrieren
 * --------------------------
 * Nutze migration/migrate-localstorage-to-db.js
 * um bestehende localStorage-Daten zu DynamoDB zu migrieren
 */

