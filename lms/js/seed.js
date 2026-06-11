/* =========================================================================
 *  AS Learning — LMS  ·  seed.js
 *  Jeu de données de démonstration (stagiaires, formateurs, séances...).
 *  Contexte temporel de référence : juin 2026.
 * ========================================================================= */
window.App = window.App || {};

App.seed = (function () {
  "use strict";

  // Décalage de jours par rapport à "aujourd'hui" -> ISO
  function rel(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function populate(DB) {
    const id = App.utils.uid;

    /* ---- Administratrice (gérante) ---- */
    DB.users.push({ id: "u_admin", role: "admin", name: "Anne-Sophie Graingeot", email: "admin@aslearning.fr", password: "admin", linkRole: null });

    /* ---- Formateurs (intervenants externes, natifs) ---- */
    const formateursData = [
      ["James Carter", "Anglais", "anglais des affaires, négociation", ["Lun", "Mar", "Mer", "Jeu"]],
      ["Sophie Müller", "Allemand", "allemand technique, industrie", ["Mar", "Mer", "Ven"]],
      ["Carlos Ramírez", "Espagnol", "espagnol commercial", ["Lun", "Jeu", "Ven"]],
      ["Giulia Rossi", "Italien", "italien professionnel", ["Mer", "Jeu"]],
      ["Emily Brown", "Anglais", "anglais technique, sécurité", ["Lun", "Mar", "Ven"]],
      ["Hans Vogel", "Allemand", "allemand des affaires", ["Lun", "Mer", "Jeu"]],
      ["Marie Dupont", "Français (FLE)", "FLE, intégration salariés", ["Mar", "Jeu", "Ven"]],
      ["Laura Schmidt", "Allemand", "allemand cadres & dirigeants", ["Lun", "Mar", "Mer"]],
    ];
    const formateurs = formateursData.map((f) => {
      const fid = id("for");
      const obj = {
        id: fid, name: f[0], langue: f[1], specialite: f[2],
        email: f[0].toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") + "@aslearning.fr",
        disponibilites: f[3], natif: true, statut: "actif",
      };
      DB.formateurs.push(obj);
      DB.users.push({ id: id("u"), role: "formateur", name: f[0], email: obj.email, password: "demo", linkId: fid });
      return obj;
    });

    /* ---- Entreprises clientes (Grand-Est, profil industriel) ---- */
    const entreprisesData = [
      ["Daimler Truck France", "Molsheim (67)", "Industrie automobile", "rh@daimler-truck.fr", "Karine Weber"],
      ["Lohr Industrie", "Hangenbieten (67)", "Industrie ferroviaire", "formation@lohr.fr", "Thomas Klein"],
      ["Soprema", "Strasbourg (67)", "Matériaux / BTP", "rh@soprema.fr", "Nadia Lopez"],
      ["De Dietrich Process Systems", "Mertzwiller (67)", "Équipementier industriel", "rh@dedietrich.com", "Paul Meyer"],
      ["Hager Group", "Obernai (67)", "Solutions électriques", "talents@hager.fr", "Léa Fischer"],
      ["Mars Wrigley Haguenau", "Haguenau (67)", "Agroalimentaire", "rh@mars.fr", "Olivier Bauer"],
    ];
    const entreprises = entreprisesData.map((e) => {
      const obj = { id: id("ent"), nom: e[0], ville: e[1], secteur: e[2], email: e[3], contact: e[4], telephone: "03 88 " + Math.floor(10 + Math.random() * 89) + " " + Math.floor(10 + Math.random() * 89) + " " + Math.floor(10 + Math.random() * 89) };
      DB.entreprises.push(obj);
      return obj;
    });

    /* ---- Modèles de programme réutilisables (par secteur / profil) ---- */
    const modeles = [
      { profil: "Technicien / Opérateur", secteur: "Industrie", langue: "Anglais", duree: 30,
        modules: ["Vocabulaire métier & sécurité", "Lecture de consignes techniques", "Communication d'atelier", "Rapports d'incident simples"] },
      { profil: "Cadre", secteur: "Tertiaire", langue: "Anglais", duree: 40,
        modules: ["Réunions & conf-calls", "E-mails professionnels", "Négociation", "Présentations", "Interculturel"] },
      { profil: "Dirigeant", secteur: "Tous", langue: "Anglais", duree: 25,
        modules: ["Prise de parole en public", "Représentation & networking", "Contextes stratégiques", "Media training"] },
      { profil: "Cadre", secteur: "Industrie", langue: "Allemand", duree: 40,
        modules: ["Réunions techniques", "Correspondance professionnelle", "Visites client", "Négociation fournisseurs"] },
    ];
    modeles.forEach((m) => DB.modeles.push(Object.assign({ id: id("mod"), nom: `${m.langue} — ${m.profil} (${m.secteur})` }, m)));

    /* ---- Stagiaires + parcours complets ---- */
    const stagiairesData = [
      // [prénom nom, entrepriseIdx, langue, profil, niveauInitial, objectif, formateurIdx, volume, statut, avancement(0-1)]
      ["Julien Faure", 0, "Anglais", "Cadre", "B1", "Animer des réunions internationales en anglais", 0, 40, "en_cours", 0.6],
      ["Camille Petit", 0, "Allemand", "Cadre", "A2", "Échanger avec le siège allemand", 1, 40, "en_cours", 0.45],
      ["Mehdi Benali", 1, "Anglais", "Technicien / Opérateur", "A1", "Comprendre consignes de sécurité en anglais", 4, 30, "en_cours", 0.3],
      ["Sandrine Morel", 1, "Allemand", "Cadre", "B1", "Négocier avec fournisseurs allemands", 5, 40, "en_cours", 0.7],
      ["Antoine Girard", 2, "Anglais", "Dirigeant", "B2", "Prise de parole lors de salons internationaux", 0, 25, "en_cours", 0.5],
      ["Fatou Diallo", 2, "Espagnol", "Cadre", "A2", "Développer le marché espagnol", 2, 40, "en_cours", 0.25],
      ["Thomas Leroy", 3, "Allemand", "Technicien / Opérateur", "A1", "Lire la documentation technique allemande", 1, 30, "en_cours", 0.4],
      ["Inès Roussel", 3, "Anglais", "Cadre", "B1", "Rédiger des rapports techniques", 4, 40, "termine", 1],
      ["Lucas Bernard", 4, "Allemand", "Dirigeant", "B2", "Représenter Hager à l'international", 7, 25, "en_cours", 0.8],
      ["Nadia Cherif", 4, "Anglais", "Cadre", "A2", "Communication projet en anglais", 0, 40, "en_cours", 0.2],
      ["Paul Lefebvre", 5, "Anglais", "Cadre", "B1", "Échanges avec la maison-mère US", 4, 40, "termine", 1],
      ["Aurélie Marchand", 5, "Italien", "Cadre", "A1", "Relations avec sites italiens", 3, 30, "en_cours", 0.35],
      ["Karim Haddad", 1, "Anglais", "Technicien / Opérateur", "A2", "Communication d'atelier en anglais", 4, 30, "en_cours", 0.15],
      ["Élodie Garnier", 2, "Français (FLE)", "Cadre", "A2", "Intégration professionnelle (FLE)", 6, 40, "en_cours", 0.5],
    ];

    const stagiaires = [];
    stagiairesData.forEach((s, idx) => {
      const ent = entreprises[s[1]];
      const formateur = formateurs[s[6]];
      const sid = id("sta");
      const heuresRealisees = Math.round(s[7] * s[9]);
      const obj = {
        id: sid, nom: s[0], entrepriseId: ent.id, langue: s[2], profil: s[3],
        niveauInitial: s[4], niveauVise: bumpLevel(s[4], 2), objectif: s[5],
        formateurId: formateur.id, volumeHeures: s[7], heuresRealisees,
        statut: s[8], email: s[0].toLowerCase().replace(/[^a-z]+/g, ".") + "@stagiaire.fr",
        telephone: "06 " + Math.floor(10 + Math.random() * 89) + " " + Math.floor(10 + Math.random() * 89) + " " + Math.floor(10 + Math.random() * 89) + " " + Math.floor(10 + Math.random() * 89),
        modalite: Math.random() < 0.8 ? "Visioconférence" : "Présentiel",
        rgpdConsent: true,
      };
      DB.stagiaires.push(obj);
      stagiaires.push(obj);

      // Compte stagiaire pour les 3 premiers (démo connexion)
      if (idx < 3) DB.users.push({ id: id("u"), role: "stagiaire", name: s[0], email: obj.email, password: "demo", linkId: sid });

      // Auto-évaluation
      DB.autoEvaluations.push({
        id: id("ae"), stagiaireId: sid, date: rel(-90 + idx * 3),
        niveauPercu: s[4], besoins: s[5],
        reponses: {
          comprehensionOrale: 2 + (idx % 3), expressionOrale: 1 + (idx % 3),
          comprehensionEcrite: 2 + (idx % 2), expressionEcrite: 1 + (idx % 2),
          frequenceUsage: ["Rarement", "Parfois", "Souvent"][idx % 3],
        },
        objectifs: s[5], commentaire: "Souhaite progresser à l'oral en priorité.",
      });

      // Programme personnalisé
      const modele = modeles.find((m) => m.langue === s[2] && m.profil === s[3]) || modeles[1];
      DB.programmes.push({
        id: id("prog"), stagiaireId: sid, titre: `Parcours ${s[2]} — ${s[3]}`,
        objectifs: s[5], dureeHeures: s[7], modeleId: null,
        modules: (modele.modules || ["Module 1", "Module 2", "Module 3"]).map((m, i) => ({
          titre: m, heures: Math.round(s[7] / modele.modules.length),
          fait: i < Math.floor(modele.modules.length * s[9]),
        })),
        cree: rel(-85 + idx * 3),
      });

      // Demande / dossier (processus) — statut selon avancement
      const etape = s[8] === "termine" ? 6 : (s[9] < 0.2 ? 3 : 4);
      DB.demandes.push({
        id: id("dem"), stagiaireId: sid, entrepriseId: ent.id, langue: s[2],
        date: rel(-95 + idx * 2), origine: ["Recommandation", "Site web", "Salon RH", "Client existant"][idx % 4],
        etape, // 1..6 (cf. cartographie du processus)
        auditRealise: true, gridCECRL: s[4],
        statut: s[8] === "termine" ? "clos" : "actif",
      });

      // Offre
      DB.offres.push({
        id: id("off"), demandeId: DB.demandes[DB.demandes.length - 1].id, stagiaireId: sid,
        formule: obj.modalite + " — cours individuel", prixHeure: 65, heures: s[7],
        montant: 65 * s[7], statut: etape >= 3 ? "acceptee" : "envoyee", date: rel(-90 + idx * 2),
      });

      // Convention
      if (etape >= 3) {
        DB.conventions.push({
          id: id("conv"), stagiaireId: sid, formateurId: formateur.id, entrepriseId: ent.id,
          dateDebut: rel(-70 + idx), dateFin: rel(40 + idx), heures: s[7],
          financement: ["OPCO", "Plan de développement", "CPF", "OPCO"][idx % 4],
          statut: "signee", date: rel(-72 + idx),
        });
      }

      // Clôture : certificat + satisfaction
      if (s[8] === "termine") {
        DB.certificats.push({
          id: id("cert"), stagiaireId: sid, dateRealisation: rel(-5 - idx),
          heuresRealisees, certificationPassee: true, certificationNom: "Linguaskill",
          score: 160 + Math.floor(Math.random() * 20), niveauAtteint: obj.niveauVise,
        });
        DB.satisfactions.push({ id: id("sat"), stagiaireId: sid, type: "stagiaire", note: 4 + (idx % 2), date: rel(-4 - idx), commentaire: "Formation très adaptée à mon poste." });
        DB.satisfactions.push({ id: id("sat"), stagiaireId: sid, type: "client", note: 5, date: rel(-4 - idx), commentaire: "Montée en compétences visible." });
        DB.factures.push({ id: id("fac"), stagiaireId: sid, montant: 65 * s[7], statut: "deposee", plateforme: "EDOF / OPCO", date: rel(-2 - idx) });
      }
    });

    /* ---- Séances (calendrier) + émargements + suivis ---- */
    // On répartit des séances passées (émargées) et futures (planifiées) autour d'aujourd'hui.
    const creneaux = [["09:00", "11:00"], ["11:00", "13:00"], ["14:00", "16:00"], ["16:00", "18:00"]];
    stagiaires.forEach((sta, i) => {
      if (sta.statut === "termine") return;
      const formateur = formateurs.find((f) => f.id === sta.formateurId);
      // 4 séances passées + 3 futures, ~1 par semaine
      for (let k = -4; k <= 3; k++) {
        if (k === 0) continue;
        const day = rel(k * 7 + (i % 5)); // étale les jours de la semaine
        const cr = creneaux[(i + k + 4) % creneaux.length];
        const past = k < 0;
        const seanceId = id("sea");
        DB.seances.push({
          id: seanceId, stagiaireId: sta.id, formateurId: formateur.id,
          date: day, debut: cr[0], fin: cr[1],
          modalite: sta.modalite, lieu: sta.modalite === "Présentiel" ? "Locaux client" : "Visio (lien Teams)",
          theme: ["Mise en situation orale", "Vocabulaire métier", "Compréhension écrite", "Jeu de rôle"][(i + k + 4) % 4],
          statut: past ? "realisee" : "planifiee",
        });
        if (past) {
          DB.emargements.push({
            id: id("ema"), seanceId, stagiaireId: sta.id, formateurId: formateur.id,
            date: day, signeStagiaire: true, signeFormateur: true,
            tsStagiaire: day + "T" + cr[1] + ":12", tsFormateur: day + "T" + cr[1] + ":15",
            // signatures factices (tracé simple) pour la démo
            sigStagiaire: SIG_DEMO, sigFormateur: SIG_DEMO,
          });
          DB.suivis.push({
            id: id("sui"), seanceId, stagiaireId: sta.id, formateurId: formateur.id, date: day,
            objectifs: "Travail de l'aisance orale et du vocabulaire ciblé.",
            ressources: "Support PDF, audio, exercices interactifs.",
            progression: ["Bonne progression", "Progression régulière", "À consolider"][(i + k) % 3],
            commentaire: "Stagiaire impliqué, à poursuivre les mises en situation.",
          });
        }
      }
    });

    /* ---- Supports pédagogiques ---- */
    const supportTypes = [["Guide de conversation B1.pdf", "PDF"], ["Vocabulaire technique.pdf", "PDF"], ["Audio - dialogue réunion.mp3", "Audio"]];
    stagiaires.slice(0, 6).forEach((sta, i) => {
      DB.supports.push({
        id: id("sup"), stagiaireId: sta.id, nom: supportTypes[i % 3][0], type: supportTypes[i % 3][1],
        ajoutePar: formateurs.find((f) => f.id === sta.formateurId).name, date: rel(-20 + i),
        note: "Support associé au module en cours.", dataUrl: null,
      });
    });

    DB.journal.unshift({ id: id("log"), at: new Date().toISOString(), user: "système", action: "Initialisation", detail: "Jeu de données de démonstration chargé." });
  }

  // Monte un niveau CECRL de n crans
  function bumpLevel(level, n) {
    const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const i = order.indexOf(level);
    return order[Math.min(order.length - 1, i + n)];
  }

  // Petite signature SVG-like encodée (placeholder visuel pour la démo)
  const SIG_DEMO = "data:image/svg+xml;base64," + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M5 40 Q20 5 35 35 T70 30 Q90 50 110 20 T150 35" stroke="#1d3a8a" fill="none" stroke-width="2"/></svg>'
  );

  return { populate };
})();
