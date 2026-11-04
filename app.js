
/* ==========================================================================
   ZONE 1 : Données & Colonnes (Pilote par les données)
   ========================================================================== */

// Structure de colonnes dynamiques avec "En revue" (WIP = 2)
const COLONNES = [
    { id: "backlog", titre: "Backlog", wip: null },
    { id: "afaire", titre: "À faire", wip: null },
    { id: "encours", titre: "En cours", wip: 3 },
    { id: "enrevue", titre: "En revue", wip: 2 },
    { id: "termine", titre: "Terminé", wip: null }
];

// 12 tickets fictifs imposés pour le projet "Refonte de l'espace client"
const initialTickets = [
    { id: 1, titre: "Connexion SSO via FranceConnect", type: "story", priorite: 1, points: 5, statut: "backlog", assigne: "Alice", creeLe: "2026-11-01" },
    { id: 2, titre: "Correction de fuite mémoire sur le tableau de bord", type: "bug", priorite: 1, points: 3, statut: "encours", assigne: "Bob", creeLe: "2026-10-28" },
    { id: 3, titre: "Export PDF des factures mensuelles", type: "story", priorite: 2, points: null, statut: "backlog", assigne: "", creeLe: "2026-11-02" },
    { id: 4, titre: "Mise à jour des dépendances de sécurité Node.js", type: "tache", priorite: 1, points: 2, statut: "enrevue", assigne: "Charlie", creeLe: "2026-10-30" },
    { id: 5, titre: "Refonte responsive du menu latéral mobile", type: "story", priorite: 2, points: 8, statut: "encours", assigne: "Alice", creeLe: "2026-10-25" },
    { id: 6, titre: "Optimisation SEO et balises OpenGraph", type: "tache", priorite: 3, points: null, statut: "backlog", assigne: "", creeLe: "2026-10-15" },
    { id: 7, titre: "Affichage erroné des montants en devises étrangères", type: "bug", priorite: 2, points: 2, statut: "afaire", assigne: "Bob", creeLe: "2026-11-03" },
    { id: 8, titre: "Intégration du thème sombre automatique (Dark Mode)", type: "story", priorite: 3, points: 5, statut: "termine", assigne: "Alice", creeLe: "2026-10-12" },
    { id: 9, titre: "Mise en place des tests E2E avec Playwright", type: "tache", priorite: 2, points: 8, statut: "backlog", assigne: "Charlie", creeLe: "2026-10-20" },
    { id: 10, titre: "Gestion du profil utilisateur et avatar", type: "story", priorite: 3, points: 3, statut: "termine", assigne: "Bob", creeLe: "2026-10-10" },
    { id: 11, titre: "Erreur 500 lors de la souscription d'une option", type: "bug", priorite: 1, points: 5, statut: "afaire", assigne: "Alice", creeLe: "2026-11-02" },
    { id: 12, titre: "Notification Push web pour les nouveaux messages", type: "story", priorite: 2, points: 13, statut: "backlog", assigne: "", creeLe: "2026-10-29" }
];

// Utilisateur courant connecté
const CURRENT_USER = "Alice";

// État global de l'application
let tickets = [];
let currentView = 'list';
let ticketToDeleteId = null;
const initialCalendarDate = new Date();
let calendarYear = initialCalendarDate.getFullYear();
let calendarMonth = initialCalendarDate.getMonth();

// Journal des 10 derniers déplacements pour l'annulation
let moveHistory = [];

/* ==========================================================================
   ZONE 2 : Métier & Fonction pure (Règles R1 à R5 + Import I1 à I4)
   ========================================================================== */

/**
 * Analyse un texte CSV en gérant les guillemets et virgules internes (Règle I1)
 * @param {string} texte 
 * @returns {Array<Array<string>>}
 */
function parserCSV(texte) {
    if (!texte || typeof texte !== 'string') return [];

    const lignes = [];
    let ligneCourante = [];
    let champCourant = '';
    let dansGuillemets = false;

    for (let i = 0; i < texte.length; i++) {
        const char = texte[i];
        const nextChar = texte[i + 1];

        if (char === '"') {
            if (dansGuillemets && nextChar === '"') {
                // Échappement de guillemet double ("")
                champCourant += '"';
                i++;
            } else {
                // Bascule de l'état guillemet
                dansGuillemets = !dansGuillemets;
            }
        } else if (char === ',' && !dansGuillemets) {
            // Séparateur de colonne en dehors des guillemets
            ligneCourante.push(champCourant.trim());
            champCourant = '';
        } else if ((char === '\r' || char === '\n') && !dansGuillemets) {
            // Fin de ligne
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            ligneCourante.push(champCourant.trim());
            if (ligneCourante.some(c => c.length > 0)) {
                lignes.push(ligneCourante);
            }
            ligneCourante = [];
            champCourant = '';
        } else {
            champCourant += char;
        }
    }

    // Dernier champ si le texte ne finit pas par un saut de ligne
    if (champCourant.length > 0 || ligneCourante.length > 0) {
        ligneCourante.push(champCourant.trim());
        if (ligneCourante.some(c => c.length > 0)) {
            lignes.push(ligneCourante);
        }
    }

    return lignes;
}

function isValidDateOnly(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeCreatedDate(value, fallback = getTodayDate()) {
    return isValidDateOnly(value) ? value : fallback;
}

function getTodayDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getUrgencyStatus(ticket, today = getTodayDate()) {
    if (!ticket || !isValidDateOnly(ticket.echeance) || !isValidDateOnly(today)) return null;
    if (ticket.statut !== 'termine' && ticket.echeance < today) return 'overdue';

    const [year, month, day] = today.split('-').map(Number);
    const twoDaysAhead = new Date(Date.UTC(year, month - 1, day + 2));
    const j2Date = `${twoDaysAhead.getUTCFullYear()}-${String(twoDaysAhead.getUTCMonth() + 1).padStart(2, '0')}-${String(twoDaysAhead.getUTCDate()).padStart(2, '0')}`;
    return ticket.echeance === j2Date ? 'j2' : null;
}

function filterTicketsByUrgency(ticketList, urgency, today = getTodayDate()) {
    if (urgency === 'all') return [...ticketList];
    if (urgency === 'no-deadline') return ticketList.filter(ticket => !isValidDateOnly(ticket.echeance));
    return ticketList.filter(ticket => getUrgencyStatus(ticket, today) === urgency);
}

function getNextCalendarMonth(year, month, offset = 1) {
    const date = new Date(Date.UTC(year, month + offset, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function getPreviousCalendarMonth(year, month) {
    return getNextCalendarMonth(year, month, -1);
}

function formatDateOnly(value) {
    if (!isValidDateOnly(value)) return '';
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}

function serializeTicketsJSON(ticketList) {
    const normalized = ticketList.map(ticket => ({
        ...ticket,
        echeance: isValidDateOnly(ticket.echeance) ? ticket.echeance : null
    }));
    return JSON.stringify(normalized, null, 2);
}

function serializeTicketsCSV(ticketList) {
    const headers = ['id', 'titre', 'type', 'priorite', 'points', 'statut', 'assigne', 'creeLe', 'echeance'];
    const rows = ticketList.map(ticket => headers.map(header => escapeCsvValue(header === 'echeance' && !isValidDateOnly(ticket[header]) ? null : ticket[header])).join(','));
    return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Importateur purement fonctionnel respectant les règles I1 à I4, préservant l'ordre des IDs et minimisant les rejets
 * @param {Array<Array<string>>} lignes 
 * @param {Array} existants 
 * @returns {{valides: Array, rejets: Array, nouveauxTickets: Array}}
 */
function importerTickets(lignes, existants) {
    if (!lignes || lignes.length <= 1) {
        return { valides: [], rejets: [], nouveauxTickets: existants };
    }

    const header = lignes[0].map(h => h.toLowerCase().trim());
    const indexId = header.indexOf('id');
    const indexTitre = header.indexOf('titre');
    const indexType = header.indexOf('type');
    const indexPriorite = header.indexOf('priorite');
    const indexPoints = header.indexOf('points');
    const indexStatut = header.indexOf('statut');
    const indexAssigne = header.indexOf('assigne');
    const indexEcheance = header.indexOf('echeance');

    const valides = [];
    const rejets = [];

    // Ensemble d'IDs déjà enregistrés dans le backlog existant + importés
    const takenIds = new Set(existants.map(t => t.id));
    let maxId = existants.reduce((m, t) => Math.max(m, t.id || 0), 0);

    // Compteur de WIP dynamique pour l'import
    const currentWipCounts = {};
    COLONNES.forEach(c => {
        currentWipCounts[c.id] = existants.filter(t => t.statut === c.id).length;
    });

    for (let i = 1; i < lignes.length; i++) {
        const row = lignes[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const rawId = indexId !== -1 ? row[indexId] : null;
        const rawTitre = indexTitre !== -1 ? row[indexTitre] : '';
        const rawType = indexType !== -1 ? row[indexType] : '';
        const rawPriorite = indexPriorite !== -1 ? row[indexPriorite] : '';
        const rawPoints = indexPoints !== -1 ? row[indexPoints] : '';
        const rawStatut = indexStatut !== -1 ? row[indexStatut] : 'backlog';
        const rawAssigne = indexAssigne !== -1 ? row[indexAssigne] : '';
        const rawEcheance = indexEcheance !== -1 ? row[indexEcheance] : '';

        // 1. Titre : Récupération et ajustement avec respect de la taille maximale (3 à 80 caractères)
        let titre = (rawTitre || '').trim();
        if (!titre) {
            rejets.push({ ligne: i + 1, contenu: row.join(','), motif: "Titre totalement vide" });
            continue;
        }
        if (titre.length < 3) {
            rejets.push({ ligne: i + 1, contenu: row.join(','), motif: `Titre trop court (< 3 caractères)` });
            continue;
        }
        // Respect strict de la règle maxlength="80" : tronqué à 80 caractères max
        if (titre.length > 80) {
            titre = titre.substring(0, 80);
        }

        // 2. Type : Normalisation avec secours vers "tache" si inconnu
        let typeNorm = (rawType || '').toLowerCase().trim();
        const typesValides = ['story', 'bug', 'tache'];
        if (!typesValides.includes(typeNorm)) {
            if (typeNorm === 'feature' || typeNorm === 'us') typeNorm = 'story';
            else if (typeNorm === 'issue' || typeNorm === 'erreur') typeNorm = 'bug';
            else typeNorm = 'tache'; // Tolérance pour éviter le rejet
        }

        // 3. Priorité : Tolérance 1 à 3 (sinon priorité moyenne par défaut = 2)
        let prio = parseInt(rawPriorite);
        if (isNaN(prio) || prio < 1 || prio > 3) {
            prio = 2; // repli sur P2 au lieu de rejeter
        }

        // 4. Normalisation des Points ('?' -> null)
        let points = null;
        const pointsStr = (rawPoints || '').trim();
        if (pointsStr !== '' && pointsStr !== '?') {
            const parsedPoints = parseInt(pointsStr);
            if (!isNaN(parsedPoints) && parsedPoints >= 0) points = parsedPoints;
        }

        // 5. Statut normalisé et vérification du WIP : l'excédent bascule automatiquement en Backlog
        const statutsValides = ['backlog', 'afaire', 'encours', 'enrevue', 'termine'];
        let statutNorm = statutsValides.includes((rawStatut || '').toLowerCase().trim())
            ? (rawStatut || '').toLowerCase().trim()
            : 'backlog';

        let noteAjustement = null;
        const colDef = COLONNES.find(c => c.id === statutNorm);

        // Si la colonne cible a une limite WIP et que cette limite est atteinte, rediriger l'excédent vers le Backlog
        if (colDef && colDef.wip !== null && (currentWipCounts[statutNorm] || 0) >= colDef.wip) {
            statutNorm = 'backlog';
            noteAjustement = `Excédent WIP (${colDef.titre}) → placé en Backlog`;
        }

        // 6. Gestion stricte des IDs : Empêcher les IDs démesurés ou trop longs
        let parsedId = parseInt(rawId);
        let targetId;
        let idReatribue = false;

        // Un ID est jugé valide s'il est numérique, positif et raisonnable (< 1000000 pour éviter les horodatages/IDs géants)
        if (!isNaN(parsedId) && parsedId > 0 && parsedId < 1000000) {
            if (takenIds.has(parsedId)) {
                maxId = Math.max(maxId, parsedId) + 1;
                targetId = maxId;
                idReatribue = true;
            } else {
                targetId = parsedId;
                maxId = Math.max(maxId, targetId);
            }
        } else {
            // Si l'ID d'origine est trop long ou invalide, attribution du prochain ID compact disponible
            maxId++;
            targetId = maxId;
            idReatribue = true;
        }

        takenIds.add(targetId);
        currentWipCounts[statutNorm] = (currentWipCounts[statutNorm] || 0) + 1;

        const notes = [];
        if (idReatribue && rawId) notes.push(`ID #${targetId}`);
        if (noteAjustement) notes.push(noteAjustement);

        const nouveauTicket = {
            id: targetId,
            titre: titre, // Taille garantie <= 80 chars
            type: typeNorm,
            priorite: prio,
            points: points,
            statut: statutNorm,
            assigne: (rawAssigne || '').trim(),
            echeance: isValidDateOnly((rawEcheance || '').trim()) ? rawEcheance.trim() : null,
            creeLe: new Date().toISOString().split('T')[0],
            ...(notes.length > 0 ? { noteId: notes.join(' | ') } : {})
        };

        valides.push(nouveauTicket);
    }

    return {
        valides,
        rejets,
        nouveauxTickets: [...existants, ...valides]
    };
}

/**
 * Fonction pure d'évolution de statut d'un ticket.
 * R1: Vérifie le WIP max de la colonne cible.
 * R2: Definition of Ready (les tickets non estimés ne quittent pas le backlog).
 * R3: Support du passage de statut via boutons.
 * R4: Immuabilité stricte (aucune modification du tableau reçu).
 * R5: Passage vers "Terminé" possible UNIQUEMENT depuis "En revue".
 * R6: Déplacement étape par étape uniquement (adjacence des colonnes).
 * 
 * @param {Array} ticketsState
 * @param {number} id
 * @param {string} versStatut
 * @returns {{ok: boolean, tickets?: Array, erreur?: string}}
 */
function deplacerTicket(ticketsState, id, versStatut) {
    const ticketIndex = ticketsState.findIndex(t => t.id === id);
    if (ticketIndex === -1) {
        return { ok: false, erreur: "Ticket non trouvé" };
    }

    const ticket = ticketsState[ticketIndex];

    // Ne rien faire si le statut cible est identique
    if (ticket.statut === versStatut) {
        return { ok: true, tickets: ticketsState };
    }

    // R6 - Règle de transition séquentielle : uniquement entre colonnes adjacentes (colonne suivante ou précédente)
    const indexActuel = COLONNES.findIndex(c => c.id === ticket.statut);
    const indexCible = COLONNES.findIndex(c => c.id === versStatut);

    if (indexActuel !== -1 && indexCible !== -1) {
        const distance = Math.abs(indexCible - indexActuel);
        if (distance > 1) {
            return { ok: false, erreur: `Déplacement direct interdit : Vous devez déplacer le ticket étape par étape (colonne suivante ou précédente).` };
        }
    }

    // R5 - Transition stricte vers "Terminé" : uniquement depuis "En revue" (enrevue)
    if (versStatut === 'termine' && ticket.statut !== 'enrevue') {
        return { ok: false, erreur: "Règle de transition : Un ticket doit être 'En revue' avant de passer 'Terminé'" };
    }

    // R2 - Definition of Ready : un ticket non estimé ne peut pas quitter le Backlog
    if (ticket.statut === 'backlog' && versStatut !== 'backlog' && ticket.points === null) {
        return { ok: false, erreur: "Definition of Ready : ticket non estimé" };
    }

    // R1 - WIP : Limite de tickets maximum par colonne
    const colonneCible = COLONNES.find(c => c.id === versStatut);
    if (colonneCible && colonneCible.wip !== null) {
        const countInCible = ticketsState.filter(t => t.statut === versStatut).length;
        if (countInCible >= colonneCible.wip) {
            return { ok: false, erreur: `WIP atteint (${colonneCible.wip}/${colonneCible.wip})` };
        }
    }

    // R4 - Immuabilité : Génération d'un nouveau tableau sans modifier l'original
    const nouveauxTickets = ticketsState.map(t => {
        if (t.id === id) {
            return { ...t, statut: versStatut };
        }
        return t;
    });

    return { ok: true, tickets: nouveauxTickets };
}

/* ==========================================================================
   ZONE 3 : Vue & Événements UI (Rendu, Filtres & Interactions)
   ========================================================================== */

let currentDataVersion = 1;

// Force l'exécution immédiate dès le chargement du DOM pour restaurer les données sauvegardées
document.addEventListener('DOMContentLoaded', function () {
    loadState();

    const formTitre = document.getElementById('formTitre');
    if (formTitre) {
        formTitre.addEventListener('input', function () {
            document.getElementById('charCounter').textContent = `${this.value.length}/80`;
        });
    }

    renderApp();
    runAutoTests();
});

// Chargement sécurisé avec validation de version et try/catch
function loadState() {
    try {
        const savedRaw = localStorage.getItem('taskflow_data_v2');
        if (savedRaw) {
            const parsedData = JSON.parse(savedRaw);
            if (parsedData && typeof parsedData.version === 'number' && Array.isArray(parsedData.tickets)) {
                // Garantir la présence du champ assigne sur tous les tickets (rétrocompatibilité)
                tickets = parsedData.tickets.map(t => ({
                    ...t,
                    assigne: t.assigne !== undefined ? t.assigne : "",
                    creeLe: normalizeCreatedDate(t.creeLe),
                    echeance: isValidDateOnly(t.echeance) ? t.echeance : null
                }));
                currentDataVersion = parsedData.version;
                updateVersionDisplay();
                return;
            }
        }
    } catch (err) {
        console.warn("Erreur lors de la lecture du stockage local :", err);
    }

    // Chargement des tickets par défaut uniquement s'il n'y a pas de données existantes enregistrées
    tickets = JSON.parse(JSON.stringify(initialTickets)).map(t => ({ ...t, echeance: null }));
    currentDataVersion = 1;
    saveState(false); // Premier enregistrement sans incrémenter
}

// Met à jour le badge de version dans le header
function updateVersionDisplay() {
    const badge = document.getElementById('versionBadge');
    if (badge) {
        badge.textContent = `v${currentDataVersion}`;
    }
}

// Sauvegarde immuable et versionnée dans localStorage avec auto-incrémentation
function saveState(shouldIncrementVersion = true) {
    try {
        if (shouldIncrementVersion) {
            currentDataVersion++;
        }
        const dataToSave = {
            version: currentDataVersion,
            savedAt: new Date().toISOString(),
            tickets: tickets
        };
        localStorage.setItem('taskflow_data_v2', JSON.stringify(dataToSave));
        updateVersionDisplay();
    } catch (err) {
        console.error("Erreur lors de la sauvegarde du state dans localStorage :", err);
    }
}

function resetToInitialTickets() {
    // Copie profonde explicite des 12 tickets initiaux
    tickets = JSON.parse(JSON.stringify(initialTickets)).map(t => ({ ...t, echeance: null }));
    saveState();
    renderApp();
    showToast(`Démo réinitialisée avec les 12 tickets initiaux (v${currentDataVersion})`);
}

function openResetModal() {
    const modal = document.getElementById('resetModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function closeResetModal() {
    const modal = document.getElementById('resetModal');
    modal.querySelector('div').classList.add('scale-95');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function confirmResetAll() {
    // Vider complètement le tableau de tickets
    tickets = [];
    saveState();
    renderApp();
    closeResetModal();
    showToast("Tous les tickets ont été supprimés", 'danger');
}

// Actionneurs de changement de statut via la fonction pure deplacerTicket
function changeStatus(id, newStatus) {
    const ticket = tickets.find(t => t.id === id);
    const oldStatus = ticket ? ticket.statut : null;

    const res = deplacerTicket(tickets, id, newStatus);
    if (res.ok) {
        if (oldStatus && oldStatus !== newStatus) {
            recordMoveInHistory(id, ticket.titre, oldStatus, newStatus);
        }
        tickets = res.tickets;
        saveState();
        renderApp();
        showToast(`Statut du ticket #${id} mis à jour`);

    } else {
        renderApp(); // réinitialise le selecteur visuel si refusé
        showToast(res.erreur, 'danger');
    }
}

function handleMoveTicket(id, targetStatus) {
    const ticket = tickets.find(t => t.id === id);
    const oldStatus = ticket ? ticket.statut : null;

    const res = deplacerTicket(tickets, id, targetStatus);
    if (res.ok) {
        if (oldStatus && oldStatus !== targetStatus) {
            recordMoveInHistory(id, ticket.titre, oldStatus, targetStatus);
        }
        tickets = res.tickets;
        saveState();
        renderApp();
        showToast(`Ticket #${id} déplacé vers ${getColTitle(targetStatus)}`);
    } else {
        showToast(res.erreur, 'danger');
    }
}

/* ==========================================================================
   HISTORIQUE ET ANNULATION DES DÉPLACEMENTS
   ========================================================================== */

function recordMoveInHistory(ticketId, titre, fromStatus, toStatus) {
    moveHistory.unshift({
        ticketId,
        titre,
        fromStatus,
        toStatus,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    // Limiter strictement l'historique aux 10 derniers déplacements
    if (moveHistory.length > 10) {
        moveHistory = moveHistory.slice(0, 10);
    }

    renderHistoryUI();
}

function toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    panel.classList.toggle('hidden');
}

function renderHistoryUI() {
    const badge = document.getElementById('historyBadge');
    const list = document.getElementById('historyList');
    const btnUndoLast = document.getElementById('btnUndoLast');
    const btnUndoAll = document.getElementById('btnUndoAll');

    if (moveHistory.length > 0) {
        badge.textContent = moveHistory.length;
        badge.classList.remove('hidden');
        btnUndoLast.disabled = false;
        btnUndoAll.disabled = false;
    } else {
        badge.classList.add('hidden');
        btnUndoLast.disabled = true;
        btnUndoAll.disabled = true;
    }

    if (!list) return;
    list.innerHTML = '';

    if (moveHistory.length === 0) {
        list.innerHTML = `
                    <div class="text-center py-4 text-slate-400 italic">
                        Aucun déplacement récent enregistré.
                    </div>
                `;
        return;
    }

    moveHistory.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60";
        row.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-purple-600 dark:text-purple-400">#${item.ticketId}</span>
                        <span class="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">${escapeHtml(item.titre)}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-1.5 text-[11px]">
                            <span class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-medium">${getColTitle(item.fromStatus)}</span>
                            <i class="fa-solid fa-arrow-right text-[9px] text-slate-400"></i>
                            <span class="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">${getColTitle(item.toStatus)}</span>
                        </div>
                        <span class="text-[10px] text-slate-400 font-mono">${item.timestamp}</span>
                        ${index === 0 ? '<span class="text-[9px] font-bold uppercase tracking-wider bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1.5 py-0.5 rounded">Dernier</span>' : ''}
                    </div>
                `;
        list.appendChild(row);
    });
}

function undoLastMove() {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory.shift();
    const ticket = tickets.find(t => t.id === lastMove.ticketId);

    if (!ticket) {
        showToast(`Impossible d'annuler : Le ticket #${lastMove.ticketId} n'existe plus.`, 'danger');
        renderHistoryUI();
        return;
    }

    // Remise du statut antérieur
    ticket.statut = lastMove.fromStatus;
    saveState();
    renderApp();
    renderHistoryUI();
    showToast(`Annulé : Ticket #${lastMove.ticketId} réintégré dans "${getColTitle(lastMove.fromStatus)}"`);
}

function undoAllMoves() {
    if (moveHistory.length === 0) return;

    const count = moveHistory.length;
    while (moveHistory.length > 0) {
        const move = moveHistory.shift();
        const ticket = tickets.find(t => t.id === move.ticketId);
        if (ticket) {
            ticket.statut = move.fromStatus;
        }
    }

    saveState();
    renderApp();
    renderHistoryUI();
    showToast(`Annulation complète : ${count} déplacement(s) annulé(s)`);
}

// Export JSON
function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(serializeTicketsJSON(tickets));
    const downloadAnchor = document.createElement('a');
    const fileName = `taskflow_backlog_${new Date().toISOString().split('T')[0]}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Backlog exporté (${tickets.length} tickets)`);
}

function escapeCsvValue(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function exportCSV() {
    const csv = serializeTicketsCSV(tickets);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = `data:text/csv;charset=utf-8,${encodeURIComponent('\uFEFF' + csv)}`;
    downloadAnchor.download = `taskflow_backlog_${getTodayDate()}.csv`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Backlog exporté (${tickets.length} tickets)`);
}

// Import JSON
function openImportJsonModal() {
    const modal = document.getElementById('importJsonModal');
    document.getElementById('jsonInput').value = '';
    document.getElementById('jsonFileInput').value = '';
    document.getElementById('jsonImportError').classList.add('hidden');

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function closeImportJsonModal() {
    const modal = document.getElementById('importJsonModal');
    modal.querySelector('div').classList.add('scale-95');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function handleJsonFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById('jsonInput').value = e.target.result;
    };
    reader.readAsText(file);
}

function executeJsonImport() {
    const errorDiv = document.getElementById('jsonImportError');
    errorDiv.classList.add('hidden');
    const text = document.getElementById('jsonInput').value.trim();

    if (!text) {
        errorDiv.textContent = "Veuillez sélectionner un fichier JSON ou coller du contenu JSON.";
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
            throw new Error("Le fichier JSON doit contenir un tableau de tickets.");
        }

        const takenIds = new Set();
        let maxId = 0;
        const rejets = [];
        const valides = [];

        const currentWipCounts = {};
        COLONNES.forEach(c => { currentWipCounts[c.id] = 0; });

        parsed.forEach((t, index) => {
            const lineNo = index + 1;
            if (!t || typeof t !== 'object') {
                rejets.push(`Item #${lineNo} : Format invalide.`);
                return;
            }

            let titre = (t.titre || '').trim();
            if (titre.length < 3) {
                rejets.push(`Item #${lineNo} : Le titre doit contenir au moins 3 caractères.`);
                return;
            }
            if (titre.length > 80) {
                titre = titre.substring(0, 80);
            }

            const type = (t.type || '').toLowerCase().trim();
            if (!['story', 'bug', 'tache'].includes(type)) {
                rejets.push(`Item #${lineNo} : Type "${t.type}" invalide.`);
                return;
            }

            const prio = parseInt(t.priorite);
            if (isNaN(prio) || prio < 1 || prio > 3) {
                rejets.push(`Item #${lineNo} : Priorité "${t.priorite}" invalide (1-3).`);
                return;
            }

            let statut = ['backlog', 'afaire', 'encours', 'enrevue', 'termine'].includes(t.statut) ? t.statut : 'backlog';

            // Si le quota WIP de la colonne est atteint, basculer automatiquement en Backlog
            const colDef = COLONNES.find(c => c.id === statut);
            if (colDef && colDef.wip !== null && (currentWipCounts[statut] || 0) >= colDef.wip) {
                statut = 'backlog';
            }

            let parsedId = parseInt(t.id);
            let id;
            if (isNaN(parsedId) || parsedId <= 0 || parsedId >= 1000000 || takenIds.has(parsedId)) {
                maxId++;
                id = maxId;
            } else {
                id = parsedId;
                if (id > maxId) maxId = id;
            }
            takenIds.add(id);

            currentWipCounts[statut] = (currentWipCounts[statut] || 0) + 1;

            valides.push({
                id: id,
                titre: titre,
                type: type,
                priorite: prio,
                points: t.points !== undefined && t.points !== null && !isNaN(parseInt(t.points)) ? parseInt(t.points) : null,
                statut: statut,
                assigne: t.assigne || "",
                creeLe: normalizeCreatedDate(t.creeLe),
                echeance: isValidDateOnly(t.echeance) ? t.echeance : null
            });
        });

        if (valides.length === 0) {
            throw new Error("Aucun ticket valide n'a pu être importé. Erreurs : " + rejets.join(" | "));
        }

        tickets = valides;
        saveState();
        renderApp();
        closeImportJsonModal();
        showToast(`${valides.length} tickets importés (${rejets.length} ignorés)`);
    } catch (err) {
        errorDiv.textContent = `Erreur d'import JSON : ${err.message}`;
        errorDiv.classList.remove('hidden');
    }
}

// Modale et Logique d'Import CSV
function openImportModal() {
    const modal = document.getElementById('importModal');
    document.getElementById('csvInput').value = '';
    document.getElementById('importReportContainer').classList.add('hidden');
    document.getElementById('confirmImportBtn').disabled = true;
    lastImportResult = null;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    modal.querySelector('div').classList.add('scale-95');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function loadSampleCSV() {
    const sample = `id,titre,type,priorite,points,statut,echeance
21,"Corriger le login, page d’accueil",bug,1,3,afaire,2026-11-06
22,Export PDF des factures,Story ,2,8,backlog,
23,,tache,3,2,backlog,
24,Notifications e-mail,story,2,?,backlog,2026-11-08
21,Tableau de bord client,story,1,5,encours,2026-11-10
25,Audit accessibilité,tache,4,3,backlog,invalide`;

    document.getElementById('csvInput').value = sample;
    analyseCSV();
}

function loadPiegeCSV() {
    const csvPiege = `id,titre,type,priorite,points,statut,echeance
21,"Corriger le login, page d’accueil",bug,1,3,afaire,2026-11-06
22,Export PDF des factures,Story ,2,8,backlog,
23,,tache,3,2,backlog,
24,Notifications e-mail,story,2,?,backlog,2026-11-08
21,Tableau de bord client,story,1,5,encours,2026-11-10
25,Audit accessibilité,tache,4,3,backlog,invalide`;

    document.getElementById('csvInput').value = csvPiege;
    analyseCSV();
}

function analyseCSV() {
    const txt = document.getElementById('csvInput').value;
    const lignes = parserCSV(txt);
    const res = importerTickets(lignes, tickets);
    lastImportResult = res;

    const container = document.getElementById('importReportContainer');
    const details = document.getElementById('reportDetails');
    const confirmBtn = document.getElementById('confirmImportBtn');

    if (lignes.length <= 1) {
        container.classList.add('hidden');
        confirmBtn.disabled = true;
        return;
    }

    container.classList.remove('hidden');
    document.getElementById('reportValidesCount').textContent = `${res.valides.length} valide(s)`;
    document.getElementById('reportRejetsCount').textContent = `${res.rejets.length} rejeté(s)`;

    details.innerHTML = '';

    // Rendu des tickets valides
    res.valides.forEach(t => {
        const item = document.createElement('div');
        item.className = "p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between";
        item.innerHTML = `
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>
                        <span class="font-bold text-slate-800 dark:text-slate-200">#${t.id}</span>
                        <span class="text-slate-700 dark:text-slate-300 font-medium">${escapeHtml(t.titre)}</span>
                    </div>
                    <div class="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>${t.type}</span> · <span>P${t.priorite}</span> · <span>${t.points !== null ? t.points + 'pts' : 'N/E'}</span>
                        ${t.noteId ? `<span class="text-amber-600 dark:text-amber-400 font-semibold">(${t.noteId})</span>` : ''}
                    </div>
                `;
        details.appendChild(item);
    });

    // Rendu des rejets avec motifs (I5)
    res.rejets.forEach(r => {
        const item = document.createElement('div');
        item.className = "p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between";
        item.innerHTML = `
                    <div class="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                        <i class="fa-solid fa-circle-xmark"></i>
                        <span class="font-bold">Ligne ${r.ligne}</span>
                        <span class="italic truncate max-w-[200px]">"${escapeHtml(r.contenu)}"</span>
                    </div>
                    <span class="font-semibold text-rose-600 dark:text-rose-400">${r.motif}</span>
                `;
        details.appendChild(item);
    });

    confirmBtn.disabled = res.valides.length === 0;
}

function executeImport() {
    if (!lastImportResult || lastImportResult.valides.length === 0) return;

    tickets = lastImportResult.nouveauxTickets;
    saveState();
    renderApp();
    closeImportModal();
    showToast(`${lastImportResult.valides.length} ticket(s) importé(s) avec succès`);
}

// Obtention des tickets filtrés selon les critères de la barre d'outils
function getFilteredTickets() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase().trim();
    const typeVal = document.getElementById('filterType').value;
    const priorityVal = document.getElementById('filterPriority').value;
    const statusVal = document.getElementById('filterStatus').value;
    const pointsVal = document.getElementById('filterPoints').value;
    const urgencyVal = document.getElementById('filterUrgency').value;
    const assigneVal = document.getElementById('filterAssigne') ? document.getElementById('filterAssigne').value : 'all';

    return tickets.filter(ticket => {
        // Recherche textuelle sur le titre ou l'ID
        const matchSearch = !searchVal ||
            ticket.titre.toLowerCase().includes(searchVal) ||
            ticket.id.toString().includes(searchVal);

        // Filtre par type
        const matchType = typeVal === 'all' || ticket.type === typeVal;

        // Filtre par priorité
        const matchPriority = priorityVal === 'all' || ticket.priorite === parseInt(priorityVal);

        // Filtre par statut
        const matchStatus = statusVal === 'all' || ticket.statut === statusVal;

        // Filtre par assigné / "Mes tickets"
        let matchAssigne = true;
        if (assigneVal === 'my_tickets') {
            matchAssigne = ticket.assigne === CURRENT_USER;
        } else if (assigneVal === 'unassigned') {
            matchAssigne = !ticket.assigne;
        } else if (assigneVal !== 'all') {
            matchAssigne = ticket.assigne === assigneVal;
        }

        // Filtre par estimation (points)
        let matchPoints = true;
        if (pointsVal === 'unestimated') {
            matchPoints = ticket.points === null;
        } else if (pointsVal === 'estimated') {
            matchPoints = ticket.points !== null;
        }

        const matchUrgency = urgencyVal === 'all' ||
            (urgencyVal === 'no-deadline' && !isValidDateOnly(ticket.echeance)) ||
            getUrgencyStatus(ticket) === urgencyVal;

        return matchSearch && matchType && matchPriority && matchStatus && matchAssigne && matchPoints && matchUrgency;
    });
}

function toggleMyTicketsFilter() {
    const select = document.getElementById('filterAssigne');
    const quickBtn = document.getElementById('myTicketsQuickBtn');

    if (select.value === 'my_tickets') {
        select.value = 'all';
        quickBtn.classList.remove('bg-blue-600', 'text-white');
        quickBtn.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-200');
    } else {
        select.value = 'my_tickets';
        quickBtn.classList.add('bg-blue-600', 'text-white');
        quickBtn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-200');
    }
    renderApp();
}

// Tri combiné : Priorité (1 -> 3) puis Points (croissant, null à la fin)
function sortTickets(list) {
    const urgencySort = document.getElementById('sortUrgency')?.value || 'default';
    return [...list].sort((a, b) => {
        if (urgencySort === 'urgent-first') {
            const urgencyRank = ticket => {
                const status = getUrgencyStatus(ticket);
                return status === 'overdue' ? 0 : status === 'j2' ? 1 : 2;
            };
            const rankDifference = urgencyRank(a) - urgencyRank(b);
            if (rankDifference !== 0) return rankDifference;
        } else if (urgencySort === 'deadline-asc') {
            const aHasDeadline = isValidDateOnly(a.echeance);
            const bHasDeadline = isValidDateOnly(b.echeance);
            if (aHasDeadline && bHasDeadline && a.echeance !== b.echeance) {
                return a.echeance.localeCompare(b.echeance);
            }
            if (aHasDeadline !== bHasDeadline) return aHasDeadline ? -1 : 1;
        }

        // 1. Tri par priorité
        if (a.priorite !== b.priorite) {
            return a.priorite - b.priorite;
        }

        // 2. Tri par points (null placé à la fin)
        if (a.points === null && b.points === null) return 0;
        if (a.points === null) return 1;
        if (b.points === null) return -1;

        return a.points - b.points;
    });
}

// Rendu central de l'application
function renderApp() {
    const filtered = sortTickets(getFilteredTickets());

    updateKPIs(filtered);
    renderListView(filtered);
    renderKanbanView(filtered);
    renderCalendarView(filtered);
}

// Mise à jour des compteurs KPI
function updateKPIs(filteredList) {
    document.getElementById('kpiTotal').textContent = tickets.length;
    document.getElementById('kpiFilteredCount').textContent = filteredList.length;

    const totalPoints = tickets.reduce((sum, t) => sum + (t.points || 0), 0);
    const unestimatedCount = tickets.filter(t => t.points === null).length;
    document.getElementById('kpiPoints').textContent = totalPoints;
    document.getElementById('kpiUnestimated').textContent = unestimatedCount;

    const activeWorkCount = tickets.filter(t => t.statut === 'encours' || t.statut === 'enrevue').length;
    const bugsP1 = tickets.filter(t => t.type === 'bug' && t.priorite === 1).length;
    document.getElementById('kpiEncours').textContent = activeWorkCount;
    document.getElementById('kpiBugsP1').textContent = bugsP1;
}

function renderUrgencyBadge(ticket) {
    const urgency = getUrgencyStatus(ticket);
    if (urgency === 'overdue') {
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">En retard</span>';
    }
    if (urgency === 'j2') {
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">J-2</span>';
    }
    return '';
}

function renderCalendarView(filteredTickets) {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('calendarMonthLabel');
    if (!grid || !monthLabel) return;

    const firstDay = new Date(Date.UTC(calendarYear, calendarMonth, 1));
    const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate();
    const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
    const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
    monthLabel.textContent = firstDay.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    const weekdays = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
    const cells = weekdays.map(day => `<div class="calendar-weekday">${day}</div>`);

    for (let cellIndex = 0; cellIndex < cellCount; cellIndex++) {
        const day = cellIndex - mondayOffset + 1;
        if (day < 1 || day > daysInMonth) {
            cells.push('<div class="calendar-day calendar-day-empty" aria-hidden="true"></div>');
            continue;
        }

        const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTickets = filteredTickets.filter(ticket => ticket.echeance === date);
        const cards = dayTickets.map(ticket => `
            <button type="button" class="calendar-ticket" onclick="openModal(${ticket.id})" title="${escapeHtmlAttribute(ticket.titre)}">
                <span class="font-bold">#${ticket.id}</span> ${escapeHtml(ticket.titre)}
                ${renderUrgencyBadge(ticket)}
            </button>
        `).join('');
        cells.push(`
            <div class="calendar-day" data-calendar-date="${date}">
                <span class="calendar-day-number">${day}</span>
                <div class="space-y-1">${cards}</div>
            </div>
        `);
    }

    grid.innerHTML = cells.join('');
}

function changeCalendarMonth(offset) {
    const month = getNextCalendarMonth(calendarYear, calendarMonth, offset);
    calendarYear = month.year;
    calendarMonth = month.month;
    renderApp();
}

// Rendu Vue Liste
function renderListView(list) {
    const container = document.getElementById('ticketsList');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `
                    <div class="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <i class="fa-solid fa-inbox text-4xl text-slate-300 dark:text-slate-600 mb-3"></i>
                        <p class="text-slate-500 dark:text-slate-400 font-medium text-sm">Aucun ticket ne correspond à vos critères de recherche.</p>
                    </div>
                `;
        return;
    }

    list.forEach(ticket => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4";

        card.innerHTML = `
                    <div class="flex items-start gap-3 flex-1">
                        <div class="flex flex-col items-center justify-center min-w-[60px] pt-0.5">
                            <span class="text-xs font-bold text-slate-400 dark:text-slate-500">#${ticket.id}</span>
                            <span class="mt-1">${getTypeBadge(ticket.type)}</span>
                        </div>

                        <div class="space-y-1.5 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <h4 class="font-semibold text-slate-900 dark:text-white text-base hover:text-blue-600 transition-colors cursor-pointer" onclick="openModal(${ticket.id})">
                                    ${escapeHtml(ticket.titre)}
                                </h4>
                            </div>

                            <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                ${getPriorityBadge(ticket.priorite)}
                                <span class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                                    <i class="fa-solid fa-bolt text-[10px] text-amber-500"></i>
                                    ${ticket.points !== null ? ticket.points + ' pts' : '<em class="text-amber-500">Non estimé</em>'}
                                </span>
                                ${getAssigneeBadge(ticket.assigne)}
                                <span class="flex items-center gap-1">
                                    <i class="fa-regular fa-calendar text-[11px]"></i> ${escapeHtml(ticket.creeLe)}
                                </span>
                                ${renderUrgencyBadge(ticket)}
                                ${isValidDateOnly(ticket.echeance) ? `<span class="text-xs text-slate-500 dark:text-slate-400">Échéance : ${formatDateOnly(ticket.echeance)}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/50">
                        <div>
                            ${getStatusSelectHtml(ticket.id, ticket.statut)}
                        </div>

                        <div class="flex items-center gap-1">
                            <button onclick="openModal(${ticket.id})" class="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Éditer">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="deleteTicket(${ticket.id})" class="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Supprimer">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;

        container.appendChild(card);
    });
}

// Rendu Vue Kanban (Générée entièrement depuis la constante COLONNES)
function renderKanbanView(list) {
    const container = document.getElementById('kanbanContainer');
    container.innerHTML = '';

    const totalKanbanTickets = list.length;

    COLONNES.forEach((col, colIndex) => {
        const columnTickets = list.filter(t => t.statut === col.id);
        const colPoints = columnTickets.reduce((sum, t) => sum + (t.points || 0), 0);
        const unestimatedColCount = columnTickets.filter(t => t.points === null).length;
        const overdueCount = columnTickets.filter(t => getUrgencyStatus(t) === 'overdue').length;
        const percentage = totalKanbanTickets > 0 ? Math.round((columnTickets.length / totalKanbanTickets) * 100) : 0;

        // Statut de la jauge WIP
        const isWipExceeded = col.wip !== null && columnTickets.length >= col.wip;
        const wipBadgeClass = isWipExceeded
            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';

        const colDiv = document.createElement('div');
        colDiv.className = "bg-slate-100/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-[450px] space-y-3 transition-colors duration-150";

        // Événements Drag and Drop sur le conteneur de colonne (surbrillance & drop)
        colDiv.ondragover = function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            this.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/30', 'border-blue-400');
        };

        colDiv.ondragleave = function (e) {
            // Éviter de retirer la surbrillance si le survol est sur un enfant
            if (!this.contains(e.relatedTarget)) {
                this.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/30', 'border-blue-400');
            }
        };

        colDiv.ondrop = function (e) {
            e.preventDefault();
            this.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/30', 'border-blue-400');
            const ticketIdStr = e.dataTransfer.getData('text/plain');
            if (ticketIdStr) {
                const ticketId = parseInt(ticketIdStr);
                handleMoveTicket(ticketId, col.id);
            }
        };

        colDiv.innerHTML = `
                    <!-- En-tête de colonne avec Barre de progression -->
                    <div class="space-y-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div class="flex items-center justify-between font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            <span class="flex items-center gap-2">
                                <span class="w-3 h-3 rounded-full ${getColBadgeColor(col.id)}"></span>
                                ${col.titre}
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold border ${wipBadgeClass}">
                                ${columnTickets.length}${col.wip !== null ? ` / ${col.wip} (WIP)` : ''}
                            </span>
                            ${overdueCount > 0 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">${overdueCount} en retard</span>` : ''}
                        </div>

                        <!-- Barre visuelle par colonne (% du total de tickets) -->
                        <div class="space-y-1">
                            <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div class="h-full ${getColProgressBarColor(col.id)} transition-all duration-300" style="width: ${percentage}%"></div>
                            </div>
                            <div class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                <span><i class="fa-solid fa-bolt text-amber-500 text-[9px]"></i> ${colPoints} pts ${unestimatedColCount > 0 ? `(${unestimatedColCount} N/E)` : ''}</span>
                                <span>${percentage}% du total</span>
                            </div>
                        </div>
                    </div>

                    <!-- Liste des cartes de la colonne -->
                    <div id="kanban-col-${col.id}" class="space-y-2.5 flex-1 overflow-y-auto"></div>
                `;

        container.appendChild(colDiv);

        const cardsContainer = colDiv.querySelector(`#kanban-col-${col.id}`);

        if (columnTickets.length === 0) {
            cardsContainer.innerHTML = `
                        <div class="h-28 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-400 text-xs">
                            <i class="fa-regular fa-folder-open text-lg mb-1"></i>
                            <span>Aucun ticket</span>
                        </div>
                    `;
        }

        columnTickets.forEach(ticket => {
            const prevCol = colIndex > 0 ? COLONNES[colIndex - 1] : null;
            const nextCol = colIndex < COLONNES.length - 1 ? COLONNES[colIndex + 1] : null;

            const card = document.createElement('div');
            card.draggable = true;
            card.className = "bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 hover:shadow transition-all cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-600";

            // Événement Drag Start
            card.ondragstart = function (e) {
                e.dataTransfer.setData('text/plain', ticket.id.toString());
                e.dataTransfer.effectAllowed = 'move';
                this.classList.add('opacity-50', 'scale-95');
            };

            card.ondragend = function () {
                this.classList.remove('opacity-50', 'scale-95');
            };

            card.innerHTML = `
                        <div class="flex items-center justify-between text-xs">
                            <span class="font-bold text-slate-400 flex items-center gap-1.5">
                                <i class="fa-solid fa-grip-vertical text-slate-300 dark:text-slate-600 text-[10px]"></i>
                                #${ticket.id}
                            </span>
                            ${getTypeBadge(ticket.type)}
                        </div>
                        
                        <p onclick="openModal(${ticket.id})" class="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 cursor-pointer hover:text-blue-500">
                            ${escapeHtml(ticket.titre)}
                        </p>

                        <div class="flex items-center justify-between pt-1 text-xs text-slate-500">
                            ${getPriorityBadge(ticket.priorite)}
                            <div class="flex items-center gap-2">
                                ${getAssigneeBadge(ticket.assigne)}
                                <span class="font-medium ${ticket.points === null ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'}">
                                    ${ticket.points !== null ? ticket.points + ' pts' : 'N/E'}
                                </span>
                            </div>
                            <div class="flex items-center justify-between text-xs">
                                ${renderUrgencyBadge(ticket)}
                                ${isValidDateOnly(ticket.echeance) ? `<span class="text-slate-500 dark:text-slate-400">${formatDateOnly(ticket.echeance)}</span>` : ''}
                            </div>
                        </div>

                        <!-- R3 : Boutons ◀ ▶ de déplacement -->
                        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                            ${prevCol ? `
                                <button onclick="handleMoveTicket(${ticket.id}, '${prevCol.id}')" class="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                                    <i class="fa-solid fa-chevron-left text-[10px]"></i> ${prevCol.titre}
                                </button>
                            ` : '<div></div>'}

                            ${nextCol ? `
                                <button onclick="handleMoveTicket(${ticket.id}, '${nextCol.id}')" class="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                                    ${nextCol.titre} <i class="fa-solid fa-chevron-right text-[10px]"></i>
                                </button>
                            ` : '<div></div>'}
                        </div>
                    `;

            cardsContainer.appendChild(card);
        });
    });
}

// Utilitaires de badges et labels
function getColTitle(colId) {
    const col = COLONNES.find(c => c.id === colId);
    return col ? col.titre : colId;
}

function getColBadgeColor(colId) {
    switch (colId) {
        case 'backlog': return 'bg-slate-400';
        case 'afaire': return 'bg-amber-500';
        case 'encours': return 'bg-blue-500';
        case 'enrevue': return 'bg-purple-500';
        case 'termine': return 'bg-emerald-500';
        default: return 'bg-slate-400';
    }
}

function getColProgressBarColor(colId) {
    switch (colId) {
        case 'backlog': return 'bg-slate-400 dark:bg-slate-500';
        case 'afaire': return 'bg-amber-500';
        case 'encours': return 'bg-blue-500';
        case 'enrevue': return 'bg-purple-500';
        case 'termine': return 'bg-emerald-500';
        default: return 'bg-slate-400';
    }
}

function getTypeBadge(type) {
    switch (type) {
        case 'story':
            return `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"><i class="fa-solid fa-bookmark text-[9px]"></i> Story</span>`;
        case 'bug':
            return `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1"><i class="fa-solid fa-bug text-[9px]"></i> Bug</span>`;
        case 'tache':
            return `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1"><i class="fa-solid fa-check-double text-[9px]"></i> Tâche</span>`;
        default: return '';
    }
}

function getPriorityBadge(priority) {
    switch (priority) {
        case 1:
            return `<span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 flex items-center gap-1"><i class="fa-solid fa-circle-exclamation text-[10px]"></i> P1</span>`;
        case 2:
            return `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1"><i class="fa-solid fa-minus text-[10px]"></i> P2</span>`;
        case 3:
            return `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600/50 flex items-center gap-1"><i class="fa-solid fa-arrow-down text-[10px]"></i> P3</span>`;
        default: return '';
    }
}

function getAssigneeBadge(assigne) {
    if (!assigne) {
        return `<span class="px-2 py-0.5 rounded text-[11px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50 italic"><i class="fa-regular fa-user text-[10px] mr-0.5"></i> Non assigné</span>`;
    }
    const isMe = assigne === CURRENT_USER;
    return `<span class="px-2 py-0.5 rounded text-[11px] font-medium ${isMe ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'} flex items-center gap-1"><i class="fa-solid fa-user-circle text-[10px]"></i> ${escapeHtml(assigne)}</span>`;
}

function getStatusSelectHtml(ticketId, currentStatus) {
    return `
                <select onchange="changeStatus(${ticketId}, this.value)" class="py-1 px-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200">
                    ${COLONNES.map(c => `<option value="${c.id}" ${currentStatus === c.id ? 'selected' : ''}>${c.titre}</option>`).join('')}
                </select>
            `;
}

// Modale de suppression
function deleteTicket(id) {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

    ticketToDeleteId = id;
    document.getElementById('deleteTicketId').textContent = ticket.id;
    document.getElementById('deleteTicketTitle').textContent = `"${ticket.titre}"`;

    const modal = document.getElementById('deleteModal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.querySelector('div').classList.add('scale-95');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        ticketToDeleteId = null;
    }, 200);
}

function confirmDeleteTicket() {
    if (ticketToDeleteId === null) return;
    tickets = tickets.filter(t => t.id !== ticketToDeleteId);
    saveState();
    renderApp();
    closeDeleteModal();
    showToast(`Ticket #${ticketToDeleteId} supprimé`);
}

function openModal(id = null) {
    const modal = document.getElementById('ticketModal');
    document.getElementById('modalError').classList.add('hidden');

    if (id) {
        const ticket = tickets.find(t => t.id === id);
        if (!ticket) return;

        document.getElementById('modalTitle').textContent = `Éditer le ticket #${ticket.id}`;
        document.getElementById('ticketId').value = ticket.id;
        document.getElementById('formTitre').value = ticket.titre;
        document.getElementById('formType').value = ticket.type;
        document.getElementById('formPriorite').value = ticket.priorite;
        if (document.getElementById('formPoints')) {
            document.getElementById('formPoints').value = ticket.points === null ? 'null' : ticket.points;
        }
        document.getElementById('formStatut').value = ticket.statut;
        document.getElementById('formAssigne').value = ticket.assigne || '';
        document.getElementById('formCreeLe').value = ticket.creeLe;
        document.getElementById('formEcheance').value = isValidDateOnly(ticket.echeance) ? ticket.echeance : '';
    } else {
        document.getElementById('modalTitle').textContent = "Créer un nouveau ticket";
        document.getElementById('ticketForm').reset();
        document.getElementById('ticketId').value = '';
        if (document.getElementById('formPoints')) {
            document.getElementById('formPoints').value = 'null';
        }
        document.getElementById('formAssigne').value = '';
        document.getElementById('formCreeLe').value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('charCounter').textContent = `${document.getElementById('formTitre').value.length}/80`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function closeModal() {
    const modal = document.getElementById('ticketModal');
    modal.querySelector('div').classList.add('scale-95');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function saveTicket(event) {
    event.preventDefault();

    const idVal = document.getElementById('ticketId').value;
    const titreVal = document.getElementById('formTitre').value.trim();
    const typeVal = document.getElementById('formType').value;
    const prioriteVal = parseInt(document.getElementById('formPriorite').value);
    const pointsRaw = document.getElementById('formPoints').value;
    const pointsVal = pointsRaw === 'null' ? null : parseInt(pointsRaw);
    const statutVal = document.getElementById('formStatut').value;
    const assigneVal = document.getElementById('formAssigne').value;
    const creeLeVal = document.getElementById('formCreeLe').value;
    const echeanceVal = isValidDateOnly(document.getElementById('formEcheance').value)
        ? document.getElementById('formEcheance').value
        : null;

    if (titreVal.length < 3 || titreVal.length > 80) {
        showModalError("Le titre doit contenir entre 3 et 80 caractères.");
        return;
    }

    if (idVal) {
        const numericId = parseInt(idVal);
        const ticketIndex = tickets.findIndex(t => t.id === numericId);
        if (ticketIndex !== -1) {
            const ticketExistant = tickets[ticketIndex];

            // Si le statut ou l'estimation change, valider d'abord via les règles métier (R1, R2, R5)
            if (ticketExistant.statut !== statutVal) {
                // Créer un état temporaire avec les points mis à jour si l'utilisateur les a édités
                const ticketsSimules = tickets.map(t => t.id === numericId ? { ...t, points: pointsVal } : t);
                const resRegles = deplacerTicket(ticketsSimules, numericId, statutVal);

                if (!resRegles.ok) {
                    showModalError(resRegles.erreur);
                    return;
                }

                // Enregistrer dans l'historique d'annulation
                recordMoveInHistory(numericId, titreVal, ticketExistant.statut, statutVal);
                tickets = resRegles.tickets;
            }

            // Appliquer l'ensemble des modifications validées
            const targetIndex = tickets.findIndex(t => t.id === numericId);
            if (targetIndex !== -1) {
                tickets[targetIndex] = {
                    ...tickets[targetIndex],
                    titre: titreVal,
                    type: typeVal,
                    priorite: prioriteVal,
                    points: pointsVal,
                    statut: statutVal,
                    assigne: assigneVal,
                    creeLe: creeLeVal,
                    echeance: echeanceVal
                };
            }
            showToast(`Ticket #${idVal} mis à jour`);
        }
    } else {
        // Création d'un nouveau ticket : vérifier la règle WIP si statut != backlog
        if (statutVal !== 'backlog') {
            const colCible = COLONNES.find(c => c.id === statutVal);
            if (colCible && colCible.wip !== null) {
                const countInCible = tickets.filter(t => t.statut === statutVal).length;
                if (countInCible >= colCible.wip) {
                    showModalError(`Impossible de créer directement en '${colCible.titre}' : WIP atteint (${colCible.wip}/${colCible.wip})`);
                    return;
                }
            }
            if (pointsVal === null) {
                showModalError("Definition of Ready : Un ticket créé hors du Backlog doit avoir une estimation (Story Points).");
                return;
            }
            if (statutVal === 'termine') {
                showModalError("Règle de transition : Un ticket ne peut pas être créé directement en 'Terminé'.");
                return;
            }
        }

        const newId = tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1;
        tickets.push({
            id: newId,
            titre: titreVal,
            type: typeVal,
            priorite: prioriteVal,
            points: pointsVal,
            statut: statutVal,
            assigne: assigneVal,
            creeLe: creeLeVal,
            echeance: echeanceVal
        });
        showToast(`Ticket #${newId} créé avec succès`);
    }

    saveState();
    renderApp();
    closeModal();
}

function showModalError(msg) {
    const errorDiv = document.getElementById('modalError');
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
}

function setViewMode(mode) {
    currentView = mode;
    const listView = document.getElementById('listView');
    const kanbanContainer = document.getElementById('kanbanContainer');
    const calendarView = document.getElementById('calendarView');
    const testsView = document.getElementById('testsView');

    const tabListBtn = document.getElementById('tabListBtn');
    const tabKanbanBtn = document.getElementById('tabKanbanBtn');
    const tabCalendarBtn = document.getElementById('tabCalendarBtn');
    const tabTestsBtn = document.getElementById('tabTestsBtn');

    listView.classList.add('hidden');
    kanbanContainer.classList.add('hidden');
    calendarView.classList.add('hidden');
    testsView.classList.add('hidden');

    const inactiveStyle = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all";
    const activeStyle = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm transition-all";

    tabListBtn.className = inactiveStyle;
    tabKanbanBtn.className = inactiveStyle;
    tabCalendarBtn.className = inactiveStyle;
    tabTestsBtn.className = inactiveStyle;

    if (mode === 'list') {
        listView.classList.remove('hidden');
        tabListBtn.className = activeStyle;
    } else if (mode === 'kanban') {
        kanbanContainer.classList.remove('hidden');
        tabKanbanBtn.className = activeStyle;
    } else if (mode === 'calendar') {
        calendarView.classList.remove('hidden');
        tabCalendarBtn.className = activeStyle;
    } else if (mode === 'tests') {
        testsView.classList.remove('hidden');
        tabTestsBtn.className = activeStyle;
        runAutoTests();
    }
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterPriority').value = 'all';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterPoints').value = 'all';
    document.getElementById('filterUrgency').value = 'all';
    document.getElementById('sortUrgency').value = 'default';
    if (document.getElementById('filterAssigne')) document.getElementById('filterAssigne').value = 'all';
    const quickBtn = document.getElementById('myTicketsQuickBtn');
    if (quickBtn) {
        quickBtn.classList.remove('bg-blue-600', 'text-white');
        quickBtn.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-200');
    }
    renderApp();
    showToast("Filtres réinitialisés");
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastMsg.textContent = message;

    if (type === 'danger') {
        toastIcon.className = "fa-solid fa-circle-exclamation text-rose-400";
    } else {
        toastIcon.className = "fa-solid fa-circle-check text-emerald-400 dark:text-emerald-600";
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeHtmlAttribute(text) {
    return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
