// task-variations.js - Umfangreiche Datenlisten für Aufgaben-Variationen
// Ermöglicht programmatische Variabilität ohne KI-Generierung

const TASK_VARIATIONS = {
    // ==================== 50+ KONTEXTE ====================
    contexts: [
        // Sport & Freizeit
        { id: 'fussball', name: 'Fußball', category: 'sport', examples: ['Spielfeld', 'Torschuss', 'Ballgeschwindigkeit', 'Spielerposition'] },
        { id: 'basketball', name: 'Basketball', category: 'sport', examples: ['Korbhöhe', 'Wurfparabel', 'Spielfeldmaße'] },
        { id: 'schwimmen', name: 'Schwimmen', category: 'sport', examples: ['Bahnlänge', 'Geschwindigkeit', 'Zeitmessung'] },
        { id: 'leichtathletik', name: 'Leichtathletik', category: 'sport', examples: ['Weitsprung', 'Hochsprung', 'Laufstrecke', 'Wurfweite'] },
        { id: 'radfahren', name: 'Radfahren', category: 'sport', examples: ['Strecke', 'Steigung', 'Geschwindigkeit', 'Übersetzung'] },
        { id: 'skifahren', name: 'Skifahren', category: 'sport', examples: ['Hangneigung', 'Abfahrtszeit', 'Geschwindigkeit'] },
        { id: 'tennis', name: 'Tennis', category: 'sport', examples: ['Aufschlaggeschwindigkeit', 'Spielfeldmaße', 'Ballflugbahn'] },
        
        // Wirtschaft & Finanzen
        { id: 'aktien', name: 'Aktienhandel', category: 'wirtschaft', examples: ['Kursgewinn', 'Rendite', 'Dividende', 'Portfolio'] },
        { id: 'zinsen', name: 'Zinsrechnung', category: 'wirtschaft', examples: ['Sparzinsen', 'Kreditzinsen', 'Zinseszins'] },
        { id: 'rabatte', name: 'Rabattaktionen', category: 'wirtschaft', examples: ['Prozentrabatt', 'Mengenrabatt', 'Sonderangebot'] },
        { id: 'gehaelter', name: 'Gehaltsberechnung', category: 'wirtschaft', examples: ['Brutto', 'Netto', 'Steuern', 'Überstunden'] },
        { id: 'miete', name: 'Mietkosten', category: 'wirtschaft', examples: ['Kaltmiete', 'Nebenkosten', 'Quadratmeterpreis'] },
        { id: 'versicherung', name: 'Versicherungen', category: 'wirtschaft', examples: ['Beitrag', 'Selbstbeteiligung', 'Schadenssumme'] },
        { id: 'kredit', name: 'Kreditfinanzierung', category: 'wirtschaft', examples: ['Tilgung', 'Laufzeit', 'Restschuld'] },
        
        // Naturwissenschaft
        { id: 'physik_mechanik', name: 'Mechanik', category: 'natur', examples: ['Geschwindigkeit', 'Beschleunigung', 'Kraft', 'Energie'] },
        { id: 'physik_optik', name: 'Optik', category: 'natur', examples: ['Brechung', 'Reflexion', 'Brennweite', 'Linsen'] },
        { id: 'physik_elektro', name: 'Elektrizität', category: 'natur', examples: ['Spannung', 'Stromstärke', 'Widerstand', 'Leistung'] },
        { id: 'chemie', name: 'Chemie', category: 'natur', examples: ['Konzentration', 'Mischungsverhältnis', 'Reaktionsgleichung'] },
        { id: 'biologie', name: 'Biologie', category: 'natur', examples: ['Populationswachstum', 'Vererbung', 'Zellteilung'] },
        { id: 'astronomie', name: 'Astronomie', category: 'natur', examples: ['Planetenbahn', 'Lichtjahre', 'Umlaufzeit', 'Gravitation'] },
        { id: 'geologie', name: 'Geologie', category: 'natur', examples: ['Erdbebenstärke', 'Gesteinsschichten', 'Erosion'] },
        { id: 'meteorologie', name: 'Wetterkunde', category: 'natur', examples: ['Temperatur', 'Niederschlag', 'Luftdruck', 'Windgeschwindigkeit'] },
        
        // Alltag
        { id: 'einkaufen', name: 'Einkaufen', category: 'alltag', examples: ['Preisvergleich', 'Mengenberechnung', 'Gesamtkosten'] },
        { id: 'kochen', name: 'Kochen & Backen', category: 'alltag', examples: ['Rezeptumrechnung', 'Mengenangaben', 'Portionen'] },
        { id: 'reisen', name: 'Reisen', category: 'alltag', examples: ['Fahrtzeit', 'Entfernung', 'Kraftstoffverbrauch', 'Kosten'] },
        { id: 'heimwerken', name: 'Heimwerken', category: 'alltag', examples: ['Materialbedarf', 'Fläche', 'Zuschnitt'] },
        { id: 'garten', name: 'Gartenarbeit', category: 'alltag', examples: ['Beetfläche', 'Saatgutmenge', 'Bewässerung'] },
        { id: 'haushalt', name: 'Haushalt', category: 'alltag', examples: ['Stromverbrauch', 'Wasserkosten', 'Reinigungsmittel'] },
        { id: 'party', name: 'Feier planen', category: 'alltag', examples: ['Gästezahl', 'Getränkemenge', 'Buffet', 'Kosten pro Person'] },
        
        // Technik
        { id: 'elektronik', name: 'Elektronik', category: 'technik', examples: ['Schaltkreise', 'Bauteile', 'Messungen'] },
        { id: 'mechanik', name: 'Maschinenbau', category: 'technik', examples: ['Zahnräder', 'Übersetzung', 'Drehmoment'] },
        { id: 'it', name: 'Informatik', category: 'technik', examples: ['Datenübertragung', 'Speicherplatz', 'Algorithmen'] },
        { id: 'automobil', name: 'Automobiltechnik', category: 'technik', examples: ['Motorleistung', 'Verbrauch', 'Reichweite'] },
        { id: 'energie', name: 'Energietechnik', category: 'technik', examples: ['Solaranlage', 'Windkraft', 'Wirkungsgrad'] },
        { id: 'robotik', name: 'Robotik', category: 'technik', examples: ['Bewegungsabläufe', 'Sensorik', 'Programmierung'] },
        
        // Architektur & Bauwesen
        { id: 'hausbau', name: 'Hausbau', category: 'architektur', examples: ['Grundfläche', 'Raumvolumen', 'Wandfläche'] },
        { id: 'stadtplanung', name: 'Stadtplanung', category: 'architektur', examples: ['Bebauungsdichte', 'Verkehrsflächen', 'Grünflächen'] },
        { id: 'brueckenbau', name: 'Brückenbau', category: 'architektur', examples: ['Spannweite', 'Tragfähigkeit', 'Statik'] },
        { id: 'innenarchitektur', name: 'Innenarchitektur', category: 'architektur', examples: ['Raumaufteilung', 'Möblierung', 'Beleuchtung'] },
        
        // Medizin & Gesundheit
        { id: 'medikamente', name: 'Medikamentendosierung', category: 'medizin', examples: ['Dosierung', 'Wirkstoffmenge', 'Einnahmeintervall'] },
        { id: 'ernaehrung', name: 'Ernährung', category: 'medizin', examples: ['Kalorien', 'Nährstoffe', 'BMI'] },
        { id: 'fitness', name: 'Fitness', category: 'medizin', examples: ['Pulsfrequenz', 'Kalorienverbrauch', 'Trainingsintensität'] },
        { id: 'statistik_medizin', name: 'Medizinische Statistik', category: 'medizin', examples: ['Inzidenz', 'Prävalenz', 'Wirksamkeit'] },
        
        // Kunst & Musik
        { id: 'musik', name: 'Musik', category: 'kunst', examples: ['Frequenzen', 'Taktart', 'Intervalle', 'Notenwerte'] },
        { id: 'fotografie', name: 'Fotografie', category: 'kunst', examples: ['Belichtung', 'Brennweite', 'Blende', 'ISO'] },
        { id: 'design', name: 'Design', category: 'kunst', examples: ['Proportionen', 'Goldener Schnitt', 'Skalierung'] },
        { id: 'film', name: 'Film & Video', category: 'kunst', examples: ['Bildrate', 'Auflösung', 'Datenmenge'] },
        
        // Umwelt
        { id: 'recycling', name: 'Recycling', category: 'umwelt', examples: ['Recyclingquote', 'Müllmenge', 'CO2-Einsparung'] },
        { id: 'klimaschutz', name: 'Klimaschutz', category: 'umwelt', examples: ['Emissionen', 'Energieverbrauch', 'Einsparungen'] },
        { id: 'wasserwirtschaft', name: 'Wasserwirtschaft', category: 'umwelt', examples: ['Wasserverbrauch', 'Kläranlage', 'Grundwasser'] }
    ],

    // ==================== PERSONEN-NAMEN ====================
    names: {
        female: [
            'Anna', 'Maria', 'Sophie', 'Laura', 'Emma', 'Mia', 'Lea', 'Lena', 'Julia', 'Sarah',
            'Lisa', 'Hannah', 'Johanna', 'Katharina', 'Christina', 'Melanie', 'Nina', 'Petra',
            'Sandra', 'Claudia', 'Stefanie', 'Martina', 'Monika', 'Sabine', 'Susanne', 'Andrea',
            'Birgit', 'Heike', 'Karin', 'Renate', 'Gisela', 'Ursula', 'Helga', 'Erika', 'Gertrud'
        ],
        male: [
            'Max', 'Paul', 'Felix', 'Leon', 'Tim', 'Jonas', 'Lukas', 'Ben', 'Finn', 'Noah',
            'Elias', 'David', 'Jan', 'Niklas', 'Tom', 'Moritz', 'Erik', 'Florian', 'Sebastian',
            'Tobias', 'Markus', 'Michael', 'Thomas', 'Andreas', 'Stefan', 'Christian', 'Daniel',
            'Martin', 'Peter', 'Klaus', 'Hans', 'Werner', 'Heinrich', 'Karl', 'Friedrich'
        ],
        neutral: [
            'Alex', 'Kim', 'Robin', 'Sam', 'Chris', 'Jo', 'Toni', 'Sascha', 'Nicola', 'Luca',
            'Mika', 'Jona', 'Charlie', 'Maxime', 'Andrea', 'Dominique', 'Gabriele', 'René'
        ]
    },

    // ==================== OBJEKTE PRO KATEGORIE ====================
    objects: {
        geometrie: [
            'Rechteck', 'Quadrat', 'Dreieck', 'Kreis', 'Ellipse', 'Trapez', 'Parallelogramm', 'Raute',
            'Würfel', 'Quader', 'Kugel', 'Zylinder', 'Kegel', 'Pyramide', 'Prisma', 'Tetraeder',
            'Oktaeder', 'Dodekaeder', 'Ikosaeder', 'Torus', 'Halbkugel', 'Kegelstumpf', 'Kugelschicht'
        ],
        physik: [
            'Ball', 'Auto', 'Zug', 'Rakete', 'Pendel', 'Feder', 'Rad', 'Schlitten', 'Flugzeug',
            'Schiff', 'Aufzug', 'Kran', 'Seilbahn', 'Katapult', 'Waage', 'Thermometer', 'Barometer'
        ],
        wirtschaft: [
            'Konto', 'Kredit', 'Aktie', 'Immobilie', 'Versicherung', 'Sparbrief', 'Anleihe',
            'Fonds', 'Derivat', 'Hypothek', 'Leasing', 'Factoring', 'Bürgschaft'
        ],
        alltag: [
            'Fahrrad', 'Pool', 'Garten', 'Zimmer', 'Tank', 'Behälter', 'Regal', 'Tisch', 'Schrank',
            'Bett', 'Fenster', 'Tür', 'Treppe', 'Terrasse', 'Balkon', 'Garage', 'Carport'
        ],
        technik: [
            'Motor', 'Getriebe', 'Pumpe', 'Kompressor', 'Generator', 'Transformator', 'Batterie',
            'Kondensator', 'Spule', 'Sensor', 'Aktuator', 'Ventil', 'Filter', 'Regler'
        ],
        natur: [
            'Baum', 'See', 'Berg', 'Fluss', 'Wald', 'Wiese', 'Feld', 'Teich', 'Quelle',
            'Höhle', 'Insel', 'Strand', 'Klippe', 'Gletscher', 'Vulkan', 'Schlucht'
        ]
    },

    // ==================== SCHWIERIGKEITSSTUFEN ====================
    difficulty: {
        easy: {
            numberRange: [1, 20],
            decimalPlaces: 0,
            steps: 3,
            operations: ['+', '-', '*'],
            description: 'Einfache Ganzzahlen, wenige Schritte'
        },
        medium: {
            numberRange: [1, 100],
            decimalPlaces: 1,
            steps: 5,
            operations: ['+', '-', '*', '/', 'sqrt'],
            description: 'Dezimalzahlen, moderate Komplexität'
        },
        hard: {
            numberRange: [1, 1000],
            decimalPlaces: 2,
            steps: 7,
            operations: ['+', '-', '*', '/', 'sqrt', '^', 'log'],
            description: 'Komplexe Berechnungen'
        },
        abitur: {
            numberRange: [1, 10000],
            decimalPlaces: 2,
            steps: 10,
            operations: ['+', '-', '*', '/', 'sqrt', '^', 'log', 'sin', 'cos', 'tan', 'integral'],
            description: 'Abitur-Niveau mit Analysis'
        }
    },

    // ==================== VARIATIONS-STRATEGIEN (25+) ====================
    strategies: [
        // Zahlen-Änderungen
        'Ändere alle Zahlen um +10% bis +20%',
        'Ändere alle Zahlen um -10% bis -20%',
        'Verwende nur ganze Zahlen statt Dezimalzahlen',
        'Verwende Brüche statt Dezimalzahlen',
        'Verdopple alle Werte',
        'Halbiere alle Werte',
        
        // Kontext-Änderungen
        'Ändere den Kontext komplett (z.B. Sport statt Wirtschaft)',
        'Behalte die Struktur, ändere das Thema',
        'Versetze die Aufgabe in einen anderen Lebensbereich',
        'Mache aus einer abstrakten eine anwendungsbezogene Aufgabe',
        'Mache aus einer Textaufgabe eine reine Rechenaufgabe',
        
        // Struktur-Änderungen
        'Füge einen zusätzlichen Teilschritt hinzu',
        'Entferne überflüssige Informationen',
        'Ändere die Reihenfolge der gegebenen Informationen',
        'Vertausche gegebene und gesuchte Größen',
        'Füge eine Nebenbedingung hinzu',
        'Teile die Aufgabe in Teilaufgaben a), b), c)',
        
        // Einheiten-Änderungen
        'Ändere die Einheiten (m → cm, kg → g, etc.)',
        'Verwende unübliche Einheiten (Meilen, Fuß, etc.)',
        'Mische verschiedene Einheitensysteme',
        
        // Fragestellung-Änderungen
        'Ändere nur die Fragestellung',
        'Frage nach einem Zwischenergebnis statt dem Endergebnis',
        'Erweitere die Fragestellung um "Begründe deine Antwort"',
        'Formuliere als Ja/Nein-Frage mit Begründung',
        'Frage nach dem Rechenweg statt dem Ergebnis'
    ],

    // ==================== MATHEMATISCHE THEMEN ====================
    topics: {
        algebra: ['Gleichungen', 'Ungleichungen', 'Terme', 'Brüche', 'Potenzen', 'Wurzeln', 'Logarithmen'],
        geometrie: ['Flächen', 'Körper', 'Winkel', 'Trigonometrie', 'Vektoren', 'Koordinaten'],
        analysis: ['Ableitungen', 'Integrale', 'Grenzwerte', 'Funktionen', 'Extremwerte', 'Wendepunkte'],
        stochastik: ['Wahrscheinlichkeit', 'Kombinatorik', 'Statistik', 'Verteilungen', 'Erwartungswert'],
        lineare_algebra: ['Matrizen', 'Gleichungssysteme', 'Determinanten', 'Eigenwerte']
    },

    // ==================== EINHEITEN ====================
    units: {
        laenge: ['mm', 'cm', 'dm', 'm', 'km', 'Zoll', 'Fuß', 'Yard', 'Meile'],
        flaeche: ['mm²', 'cm²', 'dm²', 'm²', 'a', 'ha', 'km²'],
        volumen: ['ml', 'cl', 'dl', 'l', 'cm³', 'dm³', 'm³'],
        masse: ['mg', 'g', 'kg', 't', 'Unze', 'Pfund'],
        zeit: ['s', 'min', 'h', 'd', 'Woche', 'Monat', 'Jahr'],
        geschwindigkeit: ['m/s', 'km/h', 'mph', 'Knoten'],
        waehrung: ['€', '$', '£', 'CHF', '¥']
    }
};

// ==================== HILFSFUNKTIONEN ====================

/**
 * Wählt ein zufälliges Element aus einem Array
 */
function pickRandom(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Wählt n zufällige Elemente aus einem Array (ohne Wiederholung)
 */
function pickRandomN(array, n) {
    if (!array || array.length === 0) return [];
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, array.length));
}

/**
 * Generiert eine zufällige Zahl in einem Bereich
 */
function randomInRange(min, max, decimals = 0) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
}

/**
 * Variiert eine Zahl um einen Prozentsatz
 */
function varyNumber(num, percentRange = 15) {
    const factor = 1 + (Math.random() * 2 - 1) * (percentRange / 100);
    return num * factor;
}

/**
 * Generiert eine vollständige Aufgaben-Variation
 */
function generateTaskVariation(options = {}) {
    const context = options.context || pickRandom(TASK_VARIATIONS.contexts);
    const nameGender = options.gender || pickRandom(['female', 'male', 'neutral']);
    const name = pickRandom(TASK_VARIATIONS.names[nameGender]);
    const strategy = options.strategy || pickRandom(TASK_VARIATIONS.strategies);
    const difficulty = options.difficulty || 'medium';
    const diffSettings = TASK_VARIATIONS.difficulty[difficulty];
    
    const numberChange = randomInRange(-15, 15, 0);
    
    return {
        context: context,
        name: name,
        strategy: strategy,
        difficulty: difficulty,
        numberModifier: numberChange,
        instructions: `Kontext: ${context.name} (${context.category}). ` +
                     `Person: ${name}. ` +
                     `Strategie: ${strategy}. ` +
                     `Zahlen: ${numberChange >= 0 ? '+' : ''}${numberChange}%.`,
        examples: context.examples || []
    };
}

/**
 * Generiert einen zufälligen Kontext für eine Aufgabe
 */
function generateRandomContext(category = null) {
    let contexts = TASK_VARIATIONS.contexts;
    if (category) {
        contexts = contexts.filter(c => c.category === category);
    }
    return pickRandom(contexts);
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.TASK_VARIATIONS = TASK_VARIATIONS;
    window.pickRandom = pickRandom;
    window.pickRandomN = pickRandomN;
    window.randomInRange = randomInRange;
    window.varyNumber = varyNumber;
    window.generateTaskVariation = generateTaskVariation;
    window.generateRandomContext = generateRandomContext;
}
