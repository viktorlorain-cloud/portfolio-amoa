# AS Learning — LMS (prototype)

Plateforme web de gestion de formation pour **AS Learning**, organisme de
formation linguistique B2B certifié QUALIOPI (Grand-Est). L'application
centralise le suivi des stagiaires, des formateurs et des séances, dématérialise
le processus administratif et ajoute un **calendrier d'assignation des
interventions formateurs**.

Ce prototype répond à trois besoins issus des documents d'analyse :

1. **Centraliser les données** (stagiaires, formateurs, programmes, séances,
   supports) à la place de la gestion manuelle Excel / Drive / email.
2. **Exécuter tout le processus administratif** en 6 étapes, de la demande de
   formation à la facturation et l'archivage (cf. cartographie).
3. **Planifier et assigner les interventions** des formateurs via un calendrier
   partagé, avec détection des conflits d'horaire.

## Lancer l'application

Aucune installation, aucun backend. C'est un fichier autonome :

```bash
# ouvrir directement
open lms/index.html        # macOS
xdg-open lms/index.html    # Linux

# ou servir en statique
python3 -m http.server 8000   # puis http://localhost:8000/lms/
```

Les données sont persistées dans le `localStorage` du navigateur et
pré-remplies avec un **jeu de démonstration** (8 formateurs, 12 stagiaires,
séances réparties autour de la date du jour, dossiers répartis dans les 6
étapes). Le bouton **« Démo »** en haut à droite réinitialise les données.

## Rôles

Sélecteur en bas de la barre latérale : **Administrateur** (gérante, accès
total), **Formateur** (ses stagiaires, suivi, émargement), **Stagiaire**
(parcours, calendrier, supports). La navigation s'adapte au rôle.

## Modules (MVP du cahier des charges)

| Module | Fonction |
|---|---|
| **Tableau de bord** | KPI QUALIOPI : stagiaires actifs, heures réalisées, taux d'assiduité, séances du jour, pipeline |
| **Processus formation** | Kanban des 6 étapes de la cartographie ; création de dossiers, avancement d'étape, montant, notes |
| **Stagiaires** | Fiches filtrables (langue), parcours, progression, financement, fiche détaillée |
| **Formateurs** | Équipe pédagogique, charge (stagiaires / actifs / séances), ajout |
| **Calendrier** | Vue mensuelle, planification de séances, assignation au formateur, **détection de conflits**, filtre par formateur, code couleur |
| **Émargement** | Signature électronique (pad tactile) stagiaire + formateur, **horodatage**, archivage, export CSV |
| **Suivi de séance** | Cahier d'animation : objectifs, ressources, progression (★), commentaires |
| **Programmes & Auto-éval.** | Auto-évaluation stagiaire → **génération de programme** pré-rempli par profil (technicien / cadre / dirigeant) |
| **Supports** | Dépôt de ressources (PDF / audio / vidéo) rattachées à un stagiaire |
| **Reporting QUALIOPI** | Indicateurs, assiduité par stagiaire, exports CSV (émargement, attestations, assiduité, registre) |

## Processus administratif (cartographie en 6 étapes)

1. Prise de contact & Audit (demande, audit CECR, auto-évaluation, objectifs)
2. Construction de l'offre (formule, programme, devis)
3. Mise en place administrative (conventions, formateur, planning, convocations)
4. Déroulement de la formation (guide d'animation, émargement, relances)
5. Clôture & Certification (certificat de réalisation, satisfaction)
6. Facturation & Archivage (factures + feuilles de présence, dépôt OPCO/CPF)

## Stack & choix

- **Mono-fichier HTML + CSS + JavaScript vanilla** (aucune dépendance, aucun
  build) — choisi pour un prototype immédiatement déployable et démontrable.
- Persistance `localStorage` (remplaçable par une API + PostgreSQL pour la prod).
- Police Inter, interface FR épurée, responsive.

### Pistes pour une mise en production

Conformément au cahier des charges : backend Node/Express ou Python/FastAPI,
PostgreSQL, authentification e-mail + mot de passe avec rôles, hébergement
cloud souverain européen, chiffrement des données stagiaires (RGPD), upload de
fichiers réel et génération PDF des documents d'audit.

## Hors périmètre (MVP)

Facturation (conservée sur EBP), e-commerce / paiement en ligne, contenus
SCORM interactifs.
