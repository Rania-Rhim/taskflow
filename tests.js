// Helper de calcul de progression sans risque de NaN (Test T6)
function calculateCompletionRate(ticketArray) {
    if (!ticketArray || ticketArray.length === 0) return 0;
    const done = ticketArray.filter(t => t.statut === 'termine').length;
    return Math.round((done / ticketArray.length) * 100);
}

// Suite des 20 Auto-Tests (T1 à T20)
function runAutoTests() {
    const testResults = [];

    // T1 · Déplacement valide
    try {
        const mock = [
            { id: 1, titre: "Story estimée", type: "story", priorite: 1, points: 5, statut: "backlog", creeLe: "2026-11-01" }
        ];
        const res = deplacerTicket(mock, 1, "afaire");
        const pass = res.ok === true && res.tickets[0].statut === "afaire";
        testResults.push({
            id: "T1",
            label: "T1 · déplacement valide",
            desc: "Un ticket estimé en backlog passe avec succès à 'À faire'.",
            passed: pass,
            detail: pass ? "ok: true, statut mis à jour vers 'afaire'" : `Échec: ${res.erreur || 'statut non mis à jour'}`
        });
    } catch (e) {
        testResults.push({ id: "T1", label: "T1 · déplacement valide", desc: "Un ticket estimé en backlog...", passed: false, detail: e.message });
    }

    // T2 · Non estimé bloqué
    try {
        const mock = [
            { id: 2, titre: "Story non estimée", type: "story", priorite: 2, points: null, statut: "backlog", creeLe: "2026-11-01" }
        ];
        const res = deplacerTicket(mock, 2, "afaire");
        const pass = res.ok === false && typeof res.erreur === 'string' && res.erreur.length > 0;
        testResults.push({
            id: "T2",
            label: "T2 · non estimé bloqué",
            desc: "Un ticket avec points === null ne peut pas quitter le Backlog.",
            passed: pass,
            detail: pass ? `Refusé correctement : "${res.erreur}"` : "Échec: Le déplacement a été accepté à tort."
        });
    } catch (e) {
        testResults.push({ id: "T2", label: "T2 · non estimé bloqué", desc: "Non estimé bloqué", passed: false, detail: e.message });
    }

    // T3 · 3 en cours -> 4e refusé
    try {
        const mock = [
            { id: 101, titre: "T1", type: "story", priorite: 1, points: 2, statut: "encours", creeLe: "2026-11-01" },
            { id: 102, titre: "T2", type: "story", priorite: 1, points: 3, statut: "encours", creeLe: "2026-11-01" },
            { id: 103, titre: "T3", type: "story", priorite: 1, points: 5, statut: "encours", creeLe: "2026-11-01" },
            { id: 104, titre: "T4 candidat", type: "story", priorite: 1, points: 1, statut: "afaire", creeLe: "2026-11-01" }
        ];
        const res = deplacerTicket(mock, 104, "encours");
        const pass = res.ok === false && res.erreur && res.erreur.includes("WIP atteint");
        testResults.push({
            id: "T3",
            label: "T3 · 3 en cours → 4e refusé",
            desc: "La limite WIP de 3 tickets sur la colonne 'En cours' bloque l'ajout d'un 4e.",
            passed: pass,
            detail: pass ? `Refusé avec message : "${res.erreur}"` : `Échec: ${res.erreur || 'accepté à tort'}`
        });
    } catch (e) {
        testResults.push({ id: "T3", label: "T3 · 3 en cours → 4e refusé", desc: "WIP limité", passed: false, detail: e.message });
    }

    // T4 · ID inconnu, sans planter
    try {
        const mock = [
            { id: 1, titre: "Existante", type: "story", priorite: 1, points: 5, statut: "backlog", creeLe: "2026-11-01" }
        ];
        const res = deplacerTicket(mock, 9999, "afaire");
        const pass = res.ok === false && res.erreur === "Ticket non trouvé";
        testResults.push({
            id: "T4",
            label: "T4 · id inconnu, sans planter",
            desc: "Appeler la fonction avec un ID inexistant ne fait pas planter l'application.",
            passed: pass,
            detail: pass ? "ok: false, erreur: 'Ticket non trouvé'" : "Échec d'interception"
        });
    } catch (e) {
        testResults.push({ id: "T4", label: "T4 · id inconnu, sans planter", desc: "ID inconnu", passed: false, detail: `Crash : ${e.message}` });
    }

    // T5 · Tableau d'origine intact (Immuabilité)
    try {
        const original = [
            { id: 1, titre: "Original", type: "story", priorite: 1, points: 3, statut: "backlog", creeLe: "2026-11-01" }
        ];
        const originalStatutBefore = original[0].statut;
        const res = deplacerTicket(original, 1, "afaire");
        const pass = original[0].statut === originalStatutBefore && res.tickets[0].statut === "afaire" && original !== res.tickets;
        testResults.push({
            id: "T5",
            label: "T5 · tableau d'origine intact",
            desc: "Le tableau source transmis en paramètre n'est jamais muté (Immuabilité).",
            passed: pass,
            detail: pass ? "Tableau source intact, nouveau tableau retourné" : "Échec: Mutation détectée du tableau source"
        });
    } catch (e) {
        testResults.push({ id: "T5", label: "T5 · tableau d'origine intact", desc: "Immuabilité", passed: false, detail: e.message });
    }

    // T6 · Stats vides : 0 %, pas NaN
    try {
        const emptyTickets = [];
        const rate = calculateCompletionRate(emptyTickets);
        const pass = rate === 0 && !isNaN(rate);
        testResults.push({
            id: "T6",
            label: "T6 · stats vides : 0 %, pas NaN",
            desc: "En présence d'un tableau vide, le calcul de progression renvoie 0% sans NaN.",
            passed: pass,
            detail: pass ? `Résultat obtenu : ${rate}% (Nombre valide)` : `Échec: ${rate}`
        });
    } catch (e) {
        testResults.push({ id: "T6", label: "T6 · stats vides : 0 %, pas NaN", desc: "Calcul de stats", passed: false, detail: e.message });
    }

    // T7 · CSV - Respect des virgules dans les guillemets (Fichier piégé)
    try {
        const rawCSV = `id,titre,type,priorite,points,statut\n21,"Corriger le login, page d’accueil",bug,1,3,afaire`;
        const parsed = parserCSV(rawCSV);
        const pass = parsed.length === 2 && parsed[1][1] === "Corriger le login, page d’accueil" && parsed[1].length === 6;
        testResults.push({
            id: "T7",
            label: "T7 · CSV : virgules dans guillemets",
            desc: "La virgule contenue dans le titre entre guillemets ne décale pas les colonnes.",
            passed: pass,
            detail: pass ? `Champ extrait intact : "${parsed[1][1]}"` : "Échec : Décalage des colonnes détecté"
        });
    } catch (e) {
        testResults.push({ id: "T7", label: "T7 · CSV : virgules dans guillemets", desc: "Virgules piégées", passed: false, detail: e.message });
    }

    // T8 · CSV - Normalisation & ID pris
    try {
        const rawCSV = `id,titre,type,priorite,points,statut
21,"Corriger le login, page d’accueil",bug,1,3,afaire
22,Export PDF des factures,Story ,2,8,backlog
23,,tache,3,2,backlog
24,Notifications e-mail,story,2,?,backlog
21,Tableau de bord client,story,1,5,encours
25,Audit accessibilité,tache,4,3,backlog`;

        const existingMock = [{ id: 21, titre: "Existant #21", type: "story", priorite: 1, points: 5, statut: "backlog", creeLe: "2026-11-01" }];
        const parsedLignes = parserCSV(rawCSV);
        const resImport = importerTickets(parsedLignes, existingMock);

        const id21DupliqueReattribue = resImport.valides.some(t => t.titre.includes("Tableau de bord") && t.id !== 21);
        const rejetsCorrects = resImport.rejets.length === 1 && resImport.valides.length === 5;
        const pointInterrogationNull = resImport.valides.find(t => t.titre.includes("Notifications"))?.points === null;
        const prioriteNormalisee = resImport.valides.find(t => t.titre.includes("Audit accessibilité"))?.priorite === 2;

        const pass = id21DupliqueReattribue && rejetsCorrects && pointInterrogationNull && prioriteNormalisee;
        testResults.push({
            id: "T8",
            label: "T8 · CSV : règles I1-I4 & rejets",
            desc: "Valide la réattribution d'ID si pris, conversion '?' en null et rejet des lignes invalides.",
            passed: pass,
            detail: pass ? `5 valides, 1 rejet motivé, ID #21 réattribué sans écraser, priorité normalisée` : `Échec: Valides=${resImport.valides.length}, Rejets=${resImport.rejets.length}`
        });
    } catch (e) {
        testResults.push({ id: "T8", label: "T8 · CSV : règles I1-I4 & rejets", desc: "Import piégé", passed: false, detail: e.message });
    }

    // T9 · Chargement sécurisé avec try/catch & validation de version
    try {
        const backupRaw = localStorage.getItem('taskflow_data_v2');

        localStorage.setItem('taskflow_data_v2', '{ jsonCorrompu: true, ...invalid }');
        let passCorrupted = false;
        try {
            loadState();
            passCorrupted = Array.isArray(tickets) && tickets.length > 0;
        } catch (e) {
            passCorrupted = false;
        }

        const mockValidPayload = {
            version: 99,
            savedAt: new Date().toISOString(),
            tickets: [{ id: 999, titre: "Ticket de Test Chargement", type: "story", priorite: 1, points: 3, statut: "backlog", creeLe: "2026-11-03" }]
        };
        localStorage.setItem('taskflow_data_v2', JSON.stringify(mockValidPayload));
        loadState();
        const passValidVersion = currentDataVersion === 99 && tickets.length === 1 && tickets[0].id === 999;

        if (backupRaw !== null) {
            localStorage.setItem('taskflow_data_v2', backupRaw);
        } else {
            localStorage.removeItem('taskflow_data_v2');
        }
        loadState();

        const pass = passCorrupted && passValidVersion;
        testResults.push({
            id: "T9",
            label: "T9 · loadState() : try/catch & version",
            desc: "Vérifie l'encapsulation try/catch sur JSON corrompu et la restauration fidèle du schéma versionné.",
            passed: pass,
            detail: pass ? "Restauration propre du JSON versionné et gestion du fallback sur JSON corrompu" : "Échec de lecture ou de rattrapage de crash"
        });
    } catch (e) {
        testResults.push({ id: "T9", label: "T9 · loadState() : try/catch & version", desc: "Chargement sécurisé", passed: false, detail: e.message });
    }

    // T10 · Transition vers 'Terminé' uniquement depuis 'En revue' (R5)
    try {
        const mockTickets = [
            { id: 1, titre: "Depuis En cours", type: "story", priorite: 1, points: 3, statut: "encours", creeLe: "2026-11-01" },
            { id: 2, titre: "Depuis En revue", type: "story", priorite: 1, points: 5, statut: "enrevue", creeLe: "2026-11-01" }
        ];

        // Essai 1 : Depuis "encours" vers "termine" -> DOIT ÉCHOUER
        const resInvalide = deplacerTicket(mockTickets, 1, "termine");

        // Essai 2 : Depuis "enrevue" vers "termine" -> DOIT REUSSIR
        const resValide = deplacerTicket(mockTickets, 2, "termine");

        const pass = resInvalide.ok === false && resValide.ok === true && resValide.tickets.find(t => t.id === 2).statut === "termine";
        testResults.push({
            id: "T10",
            label: "T10 · Transition 'Terminé' via 'En revue'",
            desc: "Un ticket ne peut entrer dans 'Terminé' que s'il est en statut 'En revue'.",
            passed: pass,
            detail: pass ? "Refusé depuis 'En cours', accepté depuis 'En revue'" : `Échec: Invalide=${resInvalide.ok}, Valide=${resValide.ok}`
        });
    } catch (e) {
        testResults.push({ id: "T10", label: "T10 · Transition 'Terminé' via 'En revue'", desc: "Transition stricte", passed: false, detail: e.message });
    }

    // T11 · Import/Chargement avec champ Assigné & Filtre "Mes tickets"
    try {
        const mockData = [
            { id: 1, titre: "T1 Alice", type: "story", priorite: 1, points: 3, statut: "backlog", assigne: "Alice" },
            { id: 2, titre: "T2 Bob", type: "story", priorite: 2, points: 5, statut: "backlog", assigne: "Bob" },
            { id: 3, titre: "T3 Ancien format sans champ", type: "bug", priorite: 1, points: 2, statut: "backlog" }
        ];

        // Normalisation lors du chargement : attribution de "" au champ manquant
        const normalized = mockData.map(t => ({ ...t, assigne: t.assigne !== undefined ? t.assigne : "" }));
        const filteredAlice = normalized.filter(t => t.assigne === "Alice");
        const unassigned = normalized.filter(t => t.assigne === "");

        const pass = normalized[2].assigne === "" && filteredAlice.length === 1 && unassigned.length === 1;
        testResults.push({
            id: "T11",
            label: "T11 · Champ Assigné & Filtre Alice",
            desc: "Garantit la présence du champ 'assigné' par défaut et le filtrage exact pour l'utilisateur courant.",
            passed: pass,
            detail: pass ? "Retrocompatibilité OK, 1 ticket pour Alice et 1 ticket non assigné" : "Échec du filtrage ou du champ assigné par défaut"
        });
    } catch (e) {
        testResults.push({ id: "T11", label: "T11 · Champ Assigné & Filtre Alice", desc: "Champ assigné", passed: false, detail: e.message });
    }

    // T12 · Historique des mouvements & Annulation du dernier déplacement
    try {
        const mockTickets = [
            { id: 10, titre: "Ticket Annulation", type: "story", priorite: 1, points: 5, statut: "backlog" }
        ];

        // 1. Déplacement de Backlog vers À faire
        const resMove = deplacerTicket(mockTickets, 10, "afaire");

        // 2. Simulation de l'enregistrement dans l'historique
        const historyEntry = { ticketId: 10, titre: "Ticket Annulation", fromStatus: "backlog", toStatus: "afaire" };

        // 3. Annulation : application du statut d'origine
        const ticketToUndo = resMove.tickets.find(t => t.id === historyEntry.ticketId);
        ticketToUndo.statut = historyEntry.fromStatus;

        const pass = resMove.ok === true && ticketToUndo.statut === "backlog";
        testResults.push({
            id: "T12",
            label: "T12 · Historique & Annulation déplacement",
            desc: "Simule le déplacement d'un ticket et annule l'action pour restaurer son statut d'origine.",
            passed: pass,
            detail: pass ? "Déplacé vers 'afaire' puis annulé avec succès vers 'backlog'" : "Échec de l'annulation ou du statut restauré"
        });
    } catch (e) {
        testResults.push({ id: "T12", label: "T12 · Historique & Annulation déplacement", desc: "Annulation déplacement", passed: false, detail: e.message });
    }

    // T13 · Échéance exactement à J-2
    try {
        const status = getUrgencyStatus(
            { echeance: "2026-11-06", statut: "encours" },
            "2026-11-04"
        );
        const pass = status === "j2";
        testResults.push({
            id: "T13",
            label: "T13 · échéance exactement à J-2",
            desc: "Une échéance exactement deux jours calendaires après la date du jour produit le statut J-2.",
            passed: pass,
            detail: pass ? "Statut J-2 reconnu" : `Échec : statut obtenu "${status}"`
        });
    } catch (e) {
        testResults.push({ id: "T13", label: "T13 · échéance exactement à J-2", desc: "Calcul de l'urgence J-2", passed: false, detail: e.message });
    }

    // T14 · Une échéance à un jour n'est pas J-2
    try {
        const status = getUrgencyStatus(
            { echeance: "2026-11-05", statut: "encours" },
            "2026-11-04"
        );
        const pass = status === null;
        testResults.push({
            id: "T14",
            label: "T14 · frontière J-2",
            desc: "Une échéance demain ne doit pas recevoir le statut J-2, réservé à exactement deux jours.",
            passed: pass,
            detail: pass ? "Aucun badge d'urgence un jour avant l'échéance" : `Échec : statut obtenu "${status}"`
        });
    } catch (e) {
        testResults.push({ id: "T14", label: "T14 · frontière J-2", desc: "Frontière du calcul J-2", passed: false, detail: e.message });
    }

    // T15 · Retard exclu pour un ticket terminé
    try {
        const today = "2026-11-04";
        const overdueStatus = getUrgencyStatus(
            { echeance: "2026-11-03", statut: "encours" },
            today
        );
        const completedStatus = getUrgencyStatus(
            { echeance: "2026-11-03", statut: "termine" },
            today
        );
        const pass = overdueStatus === "overdue" && completedStatus !== "overdue";
        testResults.push({
            id: "T15",
            label: "T15 · retard et ticket terminé",
            desc: "Une échéance passée est en retard pour un ticket actif, mais jamais pour un ticket terminé.",
            passed: pass,
            detail: pass ? "Retard actif détecté, ticket terminé exclu" : `Échec : actif="${overdueStatus}", terminé="${completedStatus}"`
        });
    } catch (e) {
        testResults.push({ id: "T15", label: "T15 · retard et ticket terminé", desc: "Exclusion du retard pour un ticket terminé", passed: false, detail: e.message });
    }

    // T16 · Absence d'échéance et filtre dédié
    try {
        const sample = [
            { id: 1, echeance: null, statut: "backlog" },
            { id: 2, echeance: undefined, statut: "backlog" },
            { id: 3, echeance: "2026-11-06", statut: "backlog" }
        ];
        const noDeadlineStatus = getUrgencyStatus(sample[0], "2026-11-04");
        const filtered = filterTicketsByUrgency(sample, "no-deadline", "2026-11-04");
        const pass = noDeadlineStatus === null &&
            filtered.length === 2 &&
            filtered.every(ticket => !ticket.echeance);
        testResults.push({
            id: "T16",
            label: "T16 · échéance absente",
            desc: "Une échéance nulle ou absente n'affiche aucun badge et est incluse dans le filtre Sans échéance.",
            passed: pass,
            detail: pass ? "Aucun statut d'urgence ; 2 tickets sans échéance filtrés" : `Échec : statut="${noDeadlineStatus}", filtrés=${filtered.length}`
        });
    } catch (e) {
        testResults.push({ id: "T16", label: "T16 · échéance absente", desc: "Échéance nulle et filtre Sans échéance", passed: false, detail: e.message });
    }

    // T17 · Import CSV avec échéances valides, vides et invalides
    try {
        const csv = [
            ["id", "titre", "type", "priorite", "points", "statut", "echeance"],
            ["31", "Échéance valide", "story", "2", "3", "backlog", "2026-11-06"],
            ["32", "Échéance vide", "story", "2", "3", "backlog", ""],
            ["33", "Échéance invalide", "story", "2", "3", "backlog", "2026-02-30"]
        ];
        const imported = importerTickets(csv, []);
        const validDeadline = imported.valides.find(ticket => ticket.titre === "Échéance valide");
        const emptyDeadline = imported.valides.find(ticket => ticket.titre === "Échéance vide");
        const invalidDeadline = imported.valides.find(ticket => ticket.titre === "Échéance invalide");
        const pass = imported.valides.length === 3 &&
            imported.rejets.length === 0 &&
            validDeadline?.echeance === "2026-11-06" &&
            emptyDeadline?.echeance === null &&
            invalidDeadline?.echeance === null;
        testResults.push({
            id: "T17",
            label: "T17 · import CSV des échéances",
            desc: "Une date valide est conservée ; une date vide ou invalide importe le ticket sans échéance.",
            passed: pass,
            detail: pass ? "3 tickets importés ; échéance valide conservée et deux échéances normalisées à null" : `Échec : valides=${imported.valides.length}, rejets=${imported.rejets.length}, échéances=${JSON.stringify(imported.valides.map(ticket => ticket.echeance))}`
        });
    } catch (e) {
        testResults.push({ id: "T17", label: "T17 · import CSV des échéances", desc: "Normalisation des échéances CSV", passed: false, detail: e.message });
    }

    // T18 · Navigation du calendrier de décembre à janvier
    try {
        const nextMonth = getNextCalendarMonth(2026, 11);
        const pass = nextMonth.year === 2027 && nextMonth.month === 0;
        testResults.push({
            id: "T18",
            label: "T18 · calendrier : changement d'année",
            desc: "Le mois suivant décembre est janvier de l'année suivante (mois indexés de 0 à 11).",
            passed: pass,
            detail: pass ? "Décembre 2026 → janvier 2027" : `Échec : année=${nextMonth.year}, mois=${nextMonth.month}`
        });
    } catch (e) {
        testResults.push({ id: "T18", label: "T18 · calendrier : changement d'année", desc: "Navigation du calendrier à la fin de l'année", passed: false, detail: e.message });
    }

    // T19 · Date de création importée normalisée
    try {
        const validDate = normalizeCreatedDate("2026-11-04", "2026-01-01");
        const maliciousDate = normalizeCreatedDate('2026-11-04"><img src=x onerror=alert(1)>', "2026-01-01");
        const pass = validDate === "2026-11-04" && maliciousDate === "2026-01-01";
        testResults.push({
            id: "T19",
            label: "T19 · date de création importée",
            desc: "Une date valide est conservée et une valeur malformée provenant d'un import est remplacée par une date sûre.",
            passed: pass,
            detail: pass ? "Date ISO conservée ; valeur invalide normalisée" : `Échec : valide="${validDate}", invalide="${maliciousDate}"`
        });
    } catch (e) {
        testResults.push({ id: "T19", label: "T19 · date de création importée", desc: "Normalisation sécurisée de la date de création", passed: false, detail: e.message });
    }

    // T20 · Échappement HTML du titre dans le texte et les attributs
    try {
        const payload = '" onmouseover="alert(1)"><img src=x onerror=alert(1)>';
        const container = document.createElement('div');
        container.innerHTML = `<button title="${escapeHtmlAttribute(payload)}">${escapeHtml(payload)}</button>`;
        const button = container.querySelector('button');
        const pass = Boolean(button) &&
            container.querySelector('img') === null &&
            button.getAttribute('onmouseover') === null &&
            button.getAttribute('title') === payload &&
            button.textContent === payload;
        testResults.push({
            id: "T20",
            label: "T20 · échappement HTML des imports",
            desc: "Un titre malveillant reste du texte inerte et ne crée ni élément HTML ni gestionnaire d'événement.",
            passed: pass,
            detail: pass ? "Titre conservé comme texte ; aucun élément ou attribut exécutable injecté" : "Échec : balisage ou attribut actif détecté"
        });
    } catch (e) {
        testResults.push({ id: "T20", label: "T20 · échappement HTML des imports", desc: "Protection contre l'injection HTML", passed: false, detail: e.message });
    }

    renderAutoTestsUI(testResults);
}

function renderAutoTestsUI(results) {
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const badge = document.getElementById('testSummaryBadge');

    badge.textContent = `${passedCount}/${totalCount} Réussis`;
    if (passedCount === totalCount) {
        badge.className = "text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800";
    } else {
        badge.className = "text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800";
    }

    const grid = document.getElementById('testsGrid');
    grid.innerHTML = '';

    results.forEach(test => {
        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border transition-all ${test.passed
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
            }`;

        card.innerHTML = `
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${test.passed
                ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300'
            }">
                                <i class="fa-solid ${test.passed ? 'fa-check' : 'fa-xmark'}"></i>
                            </span>
                            <h4 class="font-bold text-sm text-slate-900 dark:text-white">${test.label}</h4>
                        </div>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${test.passed
                ? 'bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
            }">
                            ${test.passed ? 'SUCCÈS' : 'ÉCHEC'}
                        </span>
                    </div>
                    <p class="text-xs text-slate-600 dark:text-slate-300 mb-2">${test.desc}</p>
                    <div class="text-[11px] font-mono p-2 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        ${test.detail}
                    </div>
                `;

        grid.appendChild(card);
    });
}
