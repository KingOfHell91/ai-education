// topic-data.js - Umfangreiche Themendaten für die Aufgabengenerierung
// Hierarchische Struktur mit Hauptthemen und Unterthemen

const MATH_TOPICS = {
    // ==================== ANALYSIS ====================
    analysis: {
        name: 'Analysis',
        icon: 'fa-chart-line',
        subtopics: {
            differentialrechnung: 'Differentialrechnung',
            integralrechnung: 'Integralrechnung',
            grenzwerte: 'Grenzwerte',
            kurvendiskussion: 'Kurvendiskussion',
            taylorentwicklung: 'Taylorentwicklung',
            extremwertaufgaben: 'Extremwertaufgaben',
            mittelwertsaetze: 'Mittelwertsätze',
            uneigentliche_integrale: 'Uneigentliche Integrale',
            parameterintegrale: 'Parameterintegrale'
        }
    },

    // ==================== FUNKTIONEN ====================
    funktionen: {
        name: 'Funktionen',
        icon: 'fa-wave-square',
        subtopics: {
            linear: 'Lineare Funktionen',
            quadratisch: 'Quadratische Funktionen',
            polynome: 'Polynomfunktionen',
            gebrochen_rational: 'Gebrochen-rationale Funktionen',
            exponential: 'Exponentialfunktionen',
            logarithmus: 'Logarithmusfunktionen',
            trigonometrisch: 'Trigonometrische Funktionen',
            wurzelfunktionen: 'Wurzelfunktionen',
            betragsfunktionen: 'Betragsfunktionen',
            zusammengesetzte: 'Zusammengesetzte Funktionen',
            umkehrfunktionen: 'Umkehrfunktionen',
            parameterdarstellung: 'Parameterdarstellung'
        }
    },

    // ==================== ALGEBRA ====================
    algebra: {
        name: 'Algebra',
        icon: 'fa-superscript',
        subtopics: {
            lineare_gleichungen: 'Lineare Gleichungen',
            quadratische_gleichungen: 'Quadratische Gleichungen',
            polynomgleichungen: 'Polynomgleichungen',
            bruchgleichungen: 'Bruchgleichungen',
            wurzelgleichungen: 'Wurzelgleichungen',
            exponentialgleichungen: 'Exponentialgleichungen',
            logarithmusgleichungen: 'Logarithmusgleichungen',
            ungleichungen: 'Ungleichungen',
            betragsgleichungen: 'Betragsgleichungen',
            terme_vereinfachen: 'Terme vereinfachen',
            bruchrechnung: 'Bruchrechnung',
            potenzgesetze: 'Potenzgesetze',
            wurzelgesetze: 'Wurzelgesetze',
            logarithmengesetze: 'Logarithmengesetze',
            binomische_formeln: 'Binomische Formeln',
            faktorisieren: 'Faktorisieren',
            polynomdivision: 'Polynomdivision'
        }
    },

    // ==================== LINEARE GLEICHUNGSSYSTEME ====================
    gleichungssysteme: {
        name: 'Gleichungssysteme',
        icon: 'fa-th',
        subtopics: {
            lgs_2x2: '2x2 Gleichungssysteme',
            lgs_3x3: '3x3 Gleichungssysteme',
            gaussverfahren: 'Gauß-Verfahren',
            einsetzungsverfahren: 'Einsetzungsverfahren',
            gleichsetzungsverfahren: 'Gleichsetzungsverfahren',
            additionsverfahren: 'Additionsverfahren',
            unterbestimmt: 'Unterbestimmte Systeme',
            ueberbestimmt: 'Überbestimmte Systeme'
        }
    },

    // ==================== GEOMETRIE ====================
    geometrie: {
        name: 'Geometrie',
        icon: 'fa-shapes',
        subtopics: {
            dreiecke: 'Dreiecke',
            vierecke: 'Vierecke',
            kreise: 'Kreise',
            polygone: 'Polygone',
            aehnlichkeit: 'Ähnlichkeit',
            kongruenz: 'Kongruenz',
            flaechenberechnung: 'Flächenberechnung',
            umfang: 'Umfangsberechnung',
            winkel: 'Winkelberechnung',
            strahlensaetze: 'Strahlensätze',
            pythagoras: 'Satz des Pythagoras',
            thaleskreis: 'Thaleskreis',
            hoehensatz: 'Höhensatz',
            kathetensatz: 'Kathetensatz'
        }
    },

    // ==================== STEREOMETRIE ====================
    stereometrie: {
        name: 'Stereometrie',
        icon: 'fa-cube',
        subtopics: {
            wuerfel: 'Würfel',
            quader: 'Quader',
            prisma: 'Prisma',
            zylinder: 'Zylinder',
            pyramide: 'Pyramide',
            kegel: 'Kegel',
            kugel: 'Kugel',
            zusammengesetzte_koerper: 'Zusammengesetzte Körper',
            volumenberechnung: 'Volumenberechnung',
            oberflaechenberechnung: 'Oberflächenberechnung',
            schnittflaechen: 'Schnittflächen',
            cavalieri: 'Prinzip von Cavalieri'
        }
    },

    // ==================== TRIGONOMETRIE ====================
    trigonometrie: {
        name: 'Trigonometrie',
        icon: 'fa-drafting-compass',
        subtopics: {
            sin_cos_tan: 'Sinus, Kosinus, Tangens',
            einheitskreis: 'Einheitskreis',
            bogenmas: 'Bogenmaß',
            additionstheoreme: 'Additionstheoreme',
            sinussatz: 'Sinussatz',
            kosinussatz: 'Kosinussatz',
            trigonometrische_gleichungen: 'Trigonometrische Gleichungen',
            arkusfunktionen: 'Arkusfunktionen',
            polarkoordinaten: 'Polarkoordinaten'
        }
    },

    // ==================== VEKTORRECHNUNG ====================
    vektoren: {
        name: 'Vektorrechnung',
        icon: 'fa-arrows-alt',
        subtopics: {
            vektoraddition: 'Vektoraddition',
            skalarmultiplikation: 'Skalarmultiplikation',
            skalarprodukt: 'Skalarprodukt',
            kreuzprodukt: 'Kreuzprodukt',
            spatprodukt: 'Spatprodukt',
            laenge_winkel: 'Länge und Winkel',
            linearkombination: 'Linearkombination',
            lineare_abhaengigkeit: 'Lineare Abhängigkeit',
            orthogonalitaet: 'Orthogonalität',
            projektion: 'Projektion'
        }
    },

    // ==================== ANALYTISCHE GEOMETRIE ====================
    analytische_geometrie: {
        name: 'Analytische Geometrie',
        icon: 'fa-vector-square',
        subtopics: {
            geraden_2d: 'Geraden in der Ebene',
            geraden_3d: 'Geraden im Raum',
            ebenen: 'Ebenen',
            lagebeziehungen: 'Lagebeziehungen',
            abstaende: 'Abstandsberechnungen',
            schnittmengen: 'Schnittmengen',
            spiegelungen: 'Spiegelungen',
            lotfusspunkt: 'Lotfußpunkt',
            hessesche_normalform: 'Hessesche Normalform'
        }
    },

    // ==================== LINEARE ALGEBRA ====================
    lineare_algebra: {
        name: 'Lineare Algebra',
        icon: 'fa-border-all',
        subtopics: {
            matrizen_grundlagen: 'Matrizen Grundlagen',
            matrixoperationen: 'Matrixoperationen',
            determinanten: 'Determinanten',
            inverse_matrix: 'Inverse Matrix',
            eigenwerte: 'Eigenwerte',
            eigenvektoren: 'Eigenvektoren',
            diagonalisierung: 'Diagonalisierung',
            vektorraeume: 'Vektorräume',
            basis_dimension: 'Basis und Dimension',
            lineare_abbildungen: 'Lineare Abbildungen'
        }
    },

    // ==================== STOCHASTIK ====================
    stochastik: {
        name: 'Stochastik',
        icon: 'fa-dice',
        subtopics: {
            grundbegriffe: 'Grundbegriffe',
            laplace: 'Laplace-Wahrscheinlichkeit',
            bedingte_wahrscheinlichkeit: 'Bedingte Wahrscheinlichkeit',
            unabhaengigkeit: 'Unabhängigkeit',
            baumdiagramme: 'Baumdiagramme',
            vierfeldertafel: 'Vierfeldertafel',
            satz_von_bayes: 'Satz von Bayes',
            zufallsvariablen: 'Zufallsvariablen',
            erwartungswert: 'Erwartungswert',
            varianz_standardabweichung: 'Varianz und Standardabweichung'
        }
    },

    // ==================== WAHRSCHEINLICHKEITSVERTEILUNGEN ====================
    verteilungen: {
        name: 'Wahrscheinlichkeitsverteilungen',
        icon: 'fa-chart-bar',
        subtopics: {
            binomialverteilung: 'Binomialverteilung',
            normalverteilung: 'Normalverteilung',
            poissonverteilung: 'Poissonverteilung',
            hypergeometrisch: 'Hypergeometrische Verteilung',
            geometrische_verteilung: 'Geometrische Verteilung',
            exponentialverteilung: 'Exponentialverteilung',
            standardnormalverteilung: 'Standardnormalverteilung',
            sigma_regeln: 'Sigma-Regeln'
        }
    },

    // ==================== KOMBINATORIK ====================
    kombinatorik: {
        name: 'Kombinatorik',
        icon: 'fa-sitemap',
        subtopics: {
            permutationen: 'Permutationen',
            variationen: 'Variationen',
            kombinationen: 'Kombinationen',
            mit_wiederholung: 'Mit Wiederholung',
            ohne_wiederholung: 'Ohne Wiederholung',
            binomialkoeffizient: 'Binomialkoeffizient',
            pascalsches_dreieck: 'Pascalsches Dreieck',
            abzaehlprobleme: 'Abzählprobleme'
        }
    },

    // ==================== STATISTIK ====================
    statistik: {
        name: 'Statistik',
        icon: 'fa-chart-pie',
        subtopics: {
            datenerhebung: 'Datenerhebung',
            haeufigkeiten: 'Häufigkeiten',
            mittelwerte: 'Mittelwerte',
            streuungsmas: 'Streuungsmaße',
            boxplot: 'Boxplot',
            histogramm: 'Histogramm',
            korrelation: 'Korrelation',
            regression: 'Regression',
            konfidenzintervalle: 'Konfidenzintervalle'
        }
    },

    // ==================== HYPOTHESENTESTS ====================
    hypothesentests: {
        name: 'Hypothesentests',
        icon: 'fa-balance-scale',
        subtopics: {
            signifikanztest: 'Signifikanztest',
            einseitiger_test: 'Einseitiger Test',
            zweiseitiger_test: 'Zweiseitiger Test',
            fehler_1_art: 'Fehler 1. Art',
            fehler_2_art: 'Fehler 2. Art',
            teststaerke: 'Teststärke',
            chi_quadrat_test: 'Chi-Quadrat-Test'
        }
    },

    // ==================== FOLGEN UND REIHEN ====================
    folgen_reihen: {
        name: 'Folgen und Reihen',
        icon: 'fa-ellipsis-h',
        subtopics: {
            arithmetische_folgen: 'Arithmetische Folgen',
            geometrische_folgen: 'Geometrische Folgen',
            rekursive_folgen: 'Rekursive Folgen',
            konvergenz: 'Konvergenz',
            grenzwert_folgen: 'Grenzwert von Folgen',
            arithmetische_reihen: 'Arithmetische Reihen',
            geometrische_reihen: 'Geometrische Reihen',
            summenformeln: 'Summenformeln',
            potenzreihen: 'Potenzreihen'
        }
    },

    // ==================== ZAHLENTHEORIE ====================
    zahlentheorie: {
        name: 'Zahlentheorie',
        icon: 'fa-hashtag',
        subtopics: {
            teilbarkeit: 'Teilbarkeit',
            primzahlen: 'Primzahlen',
            primfaktorzerlegung: 'Primfaktorzerlegung',
            ggt_kgv: 'ggT und kgV',
            euklidischer_algorithmus: 'Euklidischer Algorithmus',
            modulo_rechnung: 'Modulo-Rechnung',
            kongruenzen: 'Kongruenzen',
            diophantische_gleichungen: 'Diophantische Gleichungen'
        }
    },

    // ==================== KOMPLEXE ZAHLEN ====================
    komplexe_zahlen: {
        name: 'Komplexe Zahlen',
        icon: 'fa-infinity',
        subtopics: {
            grundrechenarten: 'Grundrechenarten',
            gauss_ebene: 'Gaußsche Zahlenebene',
            polarform: 'Polarform',
            exponentialform: 'Exponentialform',
            euler_formel: 'Eulersche Formel',
            potenzieren: 'Potenzieren',
            wurzelziehen: 'Wurzelziehen',
            de_moivre: 'Satz von de Moivre'
        }
    },

    // ==================== DIFFERENTIALGLEICHUNGEN ====================
    differentialgleichungen: {
        name: 'Differentialgleichungen',
        icon: 'fa-bezier-curve',
        subtopics: {
            dgl_1_ordnung: 'DGL 1. Ordnung',
            dgl_2_ordnung: 'DGL 2. Ordnung',
            lineare_dgl: 'Lineare DGL',
            trennung_variablen: 'Trennung der Variablen',
            variation_konstanten: 'Variation der Konstanten',
            homogene_dgl: 'Homogene DGL',
            inhomogene_dgl: 'Inhomogene DGL',
            anfangswertprobleme: 'Anfangswertprobleme'
        }
    },

    // ==================== FINANZMATHEMATIK ====================
    finanzmathematik: {
        name: 'Finanzmathematik',
        icon: 'fa-euro-sign',
        subtopics: {
            prozentrechnung: 'Prozentrechnung',
            zinsrechnung: 'Zinsrechnung',
            zinseszins: 'Zinseszins',
            rentenrechnung: 'Rentenrechnung',
            tilgungsrechnung: 'Tilgungsrechnung',
            barwert: 'Barwertberechnung',
            abschreibung: 'Abschreibung',
            investitionsrechnung: 'Investitionsrechnung'
        }
    },

    // ==================== LOGIK ====================
    logik: {
        name: 'Logik',
        icon: 'fa-project-diagram',
        subtopics: {
            aussagenlogik: 'Aussagenlogik',
            wahrheitstafeln: 'Wahrheitstafeln',
            logische_operatoren: 'Logische Operatoren',
            implikation: 'Implikation',
            aequivalenz: 'Äquivalenz',
            quantoren: 'Quantoren',
            beweisverfahren: 'Beweisverfahren',
            vollstaendige_induktion: 'Vollständige Induktion'
        }
    },

    // ==================== MENGENLEHRE ====================
    mengenlehre: {
        name: 'Mengenlehre',
        icon: 'fa-circle-notch',
        subtopics: {
            grundbegriffe_mengen: 'Grundbegriffe',
            mengenoperationen: 'Mengenoperationen',
            vereinigung: 'Vereinigung',
            schnittmenge: 'Schnittmenge',
            differenz: 'Differenzmenge',
            komplement: 'Komplement',
            kartesisches_produkt: 'Kartesisches Produkt',
            maechtigkeit: 'Mächtigkeit',
            venn_diagramme: 'Venn-Diagramme'
        }
    },

    // ==================== OPTIMIERUNG ====================
    optimierung: {
        name: 'Optimierung',
        icon: 'fa-bullseye',
        subtopics: {
            lineare_optimierung: 'Lineare Optimierung',
            simplex: 'Simplex-Verfahren',
            graphische_loesung: 'Graphische Lösung',
            nebenbedingungen: 'Nebenbedingungen',
            zielfunktion: 'Zielfunktion',
            extremwertprobleme_opt: 'Extremwertprobleme'
        }
    },

    // ==================== NÄHERUNGSVERFAHREN ====================
    naeherungsverfahren: {
        name: 'Näherungsverfahren',
        icon: 'fa-crosshairs',
        subtopics: {
            newton_verfahren: 'Newton-Verfahren',
            halbierungsverfahren: 'Halbierungsverfahren (Bisektion)',
            fixpunktiteration: 'Fixpunktiteration',
            regula_falsi: 'Regula Falsi',
            numerische_integration: 'Numerische Integration',
            trapezregel: 'Trapezregel',
            simpsonregel: 'Simpsonregel'
        }
    },

    // ==================== WACHSTUM ====================
    wachstum: {
        name: 'Wachstumsprozesse',
        icon: 'fa-seedling',
        subtopics: {
            lineares_wachstum: 'Lineares Wachstum',
            exponentielles_wachstum: 'Exponentielles Wachstum',
            begrenztes_wachstum: 'Begrenztes Wachstum',
            logistisches_wachstum: 'Logistisches Wachstum',
            zerfall: 'Zerfallsprozesse',
            halbwertszeit: 'Halbwertszeit',
            verdopplungszeit: 'Verdopplungszeit'
        }
    }
};

// ==================== SCHWIERIGKEITSSTUFEN ====================
const DIFFICULTY_LEVELS = {
    einsteiger: {
        name: 'Einsteiger',
        description: 'Grundlagen, einfache Zahlen, wenige Schritte',
        icon: 'fa-seedling',
        color: '#10b981'
    },
    fortgeschritten: {
        name: 'Fortgeschritten',
        description: 'Standard-Schulaufgaben, mittlere Komplexität',
        icon: 'fa-graduation-cap',
        color: '#3b82f6'
    },
    anspruchsvoll: {
        name: 'Anspruchsvoll',
        description: 'Komplexere Zusammenhänge, mehrere Konzepte',
        icon: 'fa-brain',
        color: '#f59e0b'
    },
    experte: {
        name: 'Experte',
        description: 'Abitur-Niveau, anspruchsvolle Transferaufgaben',
        icon: 'fa-award',
        color: '#ef4444'
    },
    olympiade: {
        name: 'Olympiade',
        description: 'Wettbewerbsaufgaben, kreative Problemlösung',
        icon: 'fa-trophy',
        color: '#8b5cf6'
    }
};

// ==================== AUFGABENTYPEN ====================
const TASK_TYPES = {
    berechnung: {
        name: 'Reine Berechnung',
        description: 'Mathematische Aufgabe ohne Textkontext',
        icon: 'fa-calculator'
    },
    theorie: {
        name: 'Theorie/Definitionen',
        description: 'Erkläre, beweise oder definiere',
        icon: 'fa-book'
    },
    sachaufgabe: {
        name: 'Sachaufgabe',
        description: 'Textaufgabe mit realem Kontext',
        icon: 'fa-scroll'
    }
};

// ==================== HILFSFUNKTIONEN ====================

/**
 * Gibt alle Hauptthemen als Array zurück
 */
function getTopicList() {
    return Object.entries(MATH_TOPICS).map(([id, topic]) => ({
        id,
        name: topic.name,
        icon: topic.icon
    }));
}

/**
 * Gibt die Unterthemen eines Hauptthemas zurück
 */
function getSubtopics(topicId) {
    const topic = MATH_TOPICS[topicId];
    if (!topic || !topic.subtopics) return [];
    return Object.entries(topic.subtopics).map(([id, name]) => ({
        id,
        name
    }));
}

/**
 * Wählt ein zufälliges Thema aus
 */
function getRandomTopic() {
    const topics = Object.keys(MATH_TOPICS);
    return topics[Math.floor(Math.random() * topics.length)];
}

/**
 * Wählt ein zufälliges Unterthema aus
 */
function getRandomSubtopic(topicId) {
    const subtopics = getSubtopics(topicId);
    if (subtopics.length === 0) return null;
    return subtopics[Math.floor(Math.random() * subtopics.length)].id;
}

/**
 * Wählt eine zufällige Schwierigkeit aus
 */
function getRandomDifficulty() {
    const difficulties = Object.keys(DIFFICULTY_LEVELS);
    return difficulties[Math.floor(Math.random() * difficulties.length)];
}

/**
 * Wählt einen zufälligen Aufgabentyp aus
 */
function getRandomTaskType() {
    const types = Object.keys(TASK_TYPES);
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Generiert vollständig zufällige Parameter
 */
function getRandomTaskParams() {
    const topicId = getRandomTopic();
    const subtopicId = Math.random() > 0.3 ? getRandomSubtopic(topicId) : null; // 70% Chance auf Unterthema
    
    return {
        topic: topicId,
        topicName: MATH_TOPICS[topicId].name,
        subtopic: subtopicId,
        subtopicName: subtopicId ? MATH_TOPICS[topicId].subtopics[subtopicId] : null,
        difficulty: getRandomDifficulty(),
        taskType: getRandomTaskType()
    };
}

// Export für Browser
if (typeof window !== 'undefined') {
    window.MATH_TOPICS = MATH_TOPICS;
    window.DIFFICULTY_LEVELS = DIFFICULTY_LEVELS;
    window.TASK_TYPES = TASK_TYPES;
    window.getTopicList = getTopicList;
    window.getSubtopics = getSubtopics;
    window.getRandomTopic = getRandomTopic;
    window.getRandomSubtopic = getRandomSubtopic;
    window.getRandomDifficulty = getRandomDifficulty;
    window.getRandomTaskType = getRandomTaskType;
    window.getRandomTaskParams = getRandomTaskParams;
}
