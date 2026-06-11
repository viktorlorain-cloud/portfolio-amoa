# LMS AS Learning

Plateforme web de gestion de formation linguistique (LMS léger) pour **AS Learning**,
organisme de formation B2B certifié QUALIOPI (Grand-Est).

L'application **centralise** le suivi des stagiaires, des formateurs et des entreprises
clientes, **outille l'intégralité du processus administratif** (de la demande de formation
à l'archivage) et fournit un **calendrier d'assignation des interventions** des formateurs.

> Ce dossier `lms/` est indépendant du portfolio AMOA présent à la racine du dépôt.

---

## 🚀 Démarrage

L'application est **100 % front-end, sans build ni installation** (HTML/CSS/JS natif).

**Option A — ouvrir directement**
Ouvrez `lms/index.html` dans un navigateur récent.

**Option B — serveur local (recommandé)**
```bash
cd lms
python3 -m http.server 8080
# puis ouvrir http://localhost:8080
```

**En ligne (GitHub Pages)** : accessible sous `/lms/` une fois les Pages activées.

### Comptes de démonstration
| Rôle | E-mail | Mot de passe |
|------|--------|--------------|
| Administratrice (gérante) | `admin@aslearning.fr` | `admin` |
| Formateur | (bouton « Formateur » sur l'écran de connexion) | `demo` |
| Stagiaire | (bouton « Stagiaire » sur l'écran de connexion) | `demo` |

Les données de démonstration sont chargées automatiquement au premier lancement.
Le bouton **« Réinitialiser la démo »** (menu *Journal d'activité*, admin) restaure le jeu initial.

---

## 🧩 Fonctionnalités (MVP du cahier des charges)

1. **Gestion des stagiaires** — fiche complète, filtres (formateur/entreprise/langue/statut), export CSV.
2. **Gestion des programmes** — parcours personnalisé, génération depuis l'auto-évaluation, modèles réutilisables par profil/secteur.
3. **Auto-évaluation** — formulaire en ligne (compétences CECRL, besoins, objectifs), base de construction du programme.
4. **Émargement électronique** — signature manuscrite stagiaire + formateur, **horodatage automatique**, export de la feuille d'émargement (PDF). *Critique QUALIOPI.*
5. **Cahier d'animation (suivi de séance)** — objectifs travaillés, ressources, progression, commentaires, historique.
6. **Calendrier partagé** — vue mensuelle, assignation des interventions, **détection des conflits d'horaire** et contrôle des disponibilités formateur.
7. **Dépôt de supports** — fichiers (PDF/audio/vidéo) rattachés à un stagiaire, accès selon le rôle.
8. **Reporting & conformité QUALIOPI** — tableau de bord (stagiaires actifs, heures réalisées, taux d'assiduité, satisfaction), exports CSV/PDF et génération des documents d'audit.

### 🛤 Processus administratif (cartographie)
Le menu **« Processus formation »** matérialise les 6 étapes de la cartographie sous forme de
pipeline (Kanban). Chaque dossier avance étape par étape, avec la liste des actions et
l'intervenant responsable :

1. Prise de contact & Audit — 2. Construction de l'offre — 3. Mise en place administrative —
4. Déroulement de la formation — 5. Clôture & Certification — 6. Facturation & Archivage.

### 📄 Documents générés (PDF via le navigateur)
Convocation · Feuille d'émargement · Programme de formation · Certificat de réalisation ·
Attestation de fin · Bilan d'activité.

---

## 👥 Rôles & permissions
- **Administrateur (gérante)** : accès total (comptes, stagiaires, formateurs, entreprises, processus, reporting, exports).
- **Formateur** : ses propres stagiaires, calendrier, émargement, cahier d'animation, dépôt de supports.
- **Stagiaire** : son parcours, ses supports, son auto-évaluation, sa signature d'émargement.

---

## 🏗 Architecture

```
lms/
├── index.html              # point d'entrée
├── css/styles.css          # design system
└── js/
    ├── utils.js            # helpers (dates, formats, exports CSV/PDF)
    ├── store.js            # couche de données + persistance (localStorage)
    ├── seed.js             # jeu de données de démonstration
    ├── auth.js             # authentification + rôles + périmètre
    ├── components.js       # UI réutilisable (modale, toast, signature, table)
    ├── views_core.js       # dashboard, stagiaires, formateurs, entreprises, supports
    ├── views_process.js    # processus (6 étapes), programmes, auto-évaluations
    ├── views_sessions.js   # calendrier, émargement, cahier d'animation
    ├── views_reporting.js  # reporting QUALIOPI, journal, générateur de documents
    └── app.js              # bootstrap, navigation, routeur
```

### Modèle de données (collections)
`users, entreprises, formateurs, stagiaires, demandes, autoEvaluations, offres,
programmes, modeles, conventions, seances, emargements, suivis, supports,
certificats, satisfactions, factures, journal`.

### Persistance
Ce prototype stocke les données dans le **`localStorage`** du navigateur. La couche d'accès
(`store.js`) est volontairement isolée : pour une mise en production, elle peut être
remplacée par des appels à une **API REST** sans toucher aux vues.

---

## 🔭 Vers la production
Stack cible recommandée par le cahier des charges :
- **Frontend** : React + Tailwind CSS
- **Backend** : Node.js (Express) ou Python (FastAPI)
- **Base de données** : PostgreSQL (SQLite pour un MVP)
- **Hébergement** : cloud souverain européen (RGPD), données stagiaires chiffrées

Points d'attention conformité : RGPD (consentement, chiffrement, droit à l'effacement) et
QUALIOPI (traçabilité, preuves horodatées — assurées ici par le journal d'activité et
l'émargement).

> ⚠️ Prototype de démonstration : mots de passe en clair, signatures et journal stockés
> localement. Ne pas utiliser tel quel avec des données personnelles réelles.
