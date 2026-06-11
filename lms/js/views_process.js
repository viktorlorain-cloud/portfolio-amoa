/* =========================================================================
 *  AS Learning — LMS  ·  views_process.js
 *  Vues : processus de formation (6 étapes), programmes, auto-évaluations.
 *  Le processus suit la "Cartographie du processus administratif".
 * ========================================================================= */
window.App = window.App || {};
App.views = App.views || {};

(function () {
  "use strict";
  const U = App.utils, ui = App.ui, store = App.store, auth = App.auth;

  const ent = (id) => store.find("entreprises", id);
  const formateur = (id) => store.find("formateurs", id);
  const stagiaire = (id) => store.find("stagiaires", id);
  const entName = (id) => { const e = ent(id); return e ? e.nom : "—"; };
  const staName = (id) => { const s = stagiaire(id); return s ? s.nom : "—"; };

  // Les 6 étapes de la cartographie + actions associées
  const ETAPES = [
    { n: 1, titre: "Prise de contact & Audit", intervenant: "Gérante",
      actions: ["Réception de la demande de formation", "Audit linguistique (grille CECRL)", "Auto-évaluation du stagiaire", "Définition des objectifs"] },
    { n: 2, titre: "Construction de l'offre", intervenant: "Gérante + équipe pédagogique",
      actions: ["Choix de la formule", "Rédaction du programme de formation", "Élaboration de l'offre de prix", "Envoi de la proposition au client"] },
    { n: 3, titre: "Mise en place administrative", intervenant: "Gérante",
      actions: ["Confirmation d'acceptation", "Rédaction des conventions", "Désignation du formateur", "Organisation de l'emploi du temps", "Envoi des convocations", "Envoi du protocole"] },
    { n: 4, titre: "Déroulement de la formation", intervenant: "Formateur + Gérante",
      actions: ["Guide d'animation à chaque séance", "Émargement (signatures)", "Suivi et relances", "Mise à jour du tableau de bord"] },
    { n: 5, titre: "Clôture & Certification", intervenant: "Formateur + Gérante",
      actions: ["Passage de la certification", "Certificat de réalisation", "Guide d'animation final", "Questionnaires de satisfaction"] },
    { n: 6, titre: "Facturation & Archivage", intervenant: "Gérante",
      actions: ["Envoi des factures + feuilles de présence", "Dépôt sur plateforme (OPCO/CPF)", "Archivage des documents"] },
  ];

  /* =====================================================================
   *  PROCESSUS — vue pipeline (Kanban des dossiers)
   * ===================================================================== */
  App.views.processus = function () {
    const demandes = store.all("demandes").sort((a, b) => b.date.localeCompare(a.date));
    const byEtape = U.groupBy(demandes, (d) => d.etape);

    const columns = ETAPES.map((e) => {
      const cards = (byEtape[e.n] || []).map((d) => {
        const s = stagiaire(d.stagiaireId);
        return `<div class="kanban__card" data-dem="${d.id}">
          <div class="kanban__card-top">${ui.avatar(s ? s.nom : "?")}<b>${U.escapeHtml(s ? s.nom : "—")}</b></div>
          <div class="muted">${U.escapeHtml(entName(d.entrepriseId))}</div>
          <div class="tags">${ui.badge(d.langue, "blue")}${s ? ui.badge(s.profil, "gray") : ""}</div>
        </div>`;
      }).join("");
      return `<div class="kanban__col">
        <div class="kanban__head"><span class="kanban__num">${e.n}</span><span>${U.escapeHtml(e.titre)}</span><span class="kanban__count">${(byEtape[e.n] || []).length}</span></div>
        <div class="kanban__intervenant">${U.escapeHtml(e.intervenant)}</div>
        <div class="kanban__cards">${cards || '<div class="kanban__empty">—</div>'}</div>
      </div>`;
    }).join("");

    return {
      title: "Processus de formation",
      subtitle: "De la demande à l'archivage — pilotage des 6 étapes",
      actions: `<button class="btn btn--primary" id="btn-new-demande">+ Nouvelle demande</button>`,
      html: `<p class="hint">Cliquez sur un dossier pour consulter les actions de l'étape et le faire avancer.</p>
        <div class="kanban">${columns}</div>`,
      onMount(root) {
        document.getElementById("btn-new-demande").onclick = () => newDemandeModal();
        root.querySelectorAll("[data-dem]").forEach((c) => c.onclick = () => dossierModal(c.getAttribute("data-dem")));
      },
    };
  };

  function dossierModal(demId) {
    const d = store.find("demandes", demId);
    const s = stagiaire(d.stagiaireId);
    const etape = ETAPES[d.etape - 1];
    const last = d.etape >= 6;
    const actionsList = etape.actions.map((a) => `<li>${U.escapeHtml(a)}</li>`).join("");

    ui.modal({
      title: `Dossier — ${s ? s.nom : ""}`, size: "md",
      body: `<div class="dossier">
        <div class="dossier__head">
          <div><b>${U.escapeHtml(s ? s.nom : "—")}</b><div class="muted">${U.escapeHtml(entName(d.entrepriseId))} · ${U.escapeHtml(d.langue)}</div></div>
          <div class="tags">${ui.badge("Étape " + d.etape + "/6", "blue")}${ui.statut(d.statut)}</div>
        </div>
        <div class="stepper">${ETAPES.map((e) => `<div class="stepper__dot ${e.n < d.etape ? "done" : e.n === d.etape ? "current" : ""}" title="${U.escapeHtml(e.titre)}">${e.n}</div>`).join("")}</div>
        <h4>${etape.n}. ${U.escapeHtml(etape.titre)}</h4>
        <p class="muted">Intervenant : ${U.escapeHtml(etape.intervenant)}</p>
        <ul class="dossier__actions">${actionsList}</ul>
        <p class="muted">Origine : ${U.escapeHtml(d.origine || "—")} · Demande du ${U.fmtDate(d.date)}</p>
      </div>`,
      actions: [
        { label: "Voir la fiche stagiaire", kind: "ghost", onClick: () => { if (s) App.go("stagiaire-detail/" + s.id); } },
        d.etape > 1 ? { label: "← Étape précédente", kind: "ghost", onClick: () => { store.update("demandes", demId, { etape: d.etape - 1 }); store.log("Recul étape", `${s ? s.nom : ""} → étape ${d.etape - 1}`); App.render(); } } : null,
        !last ? { label: "Valider → étape suivante", kind: "primary", onClick: () => advanceDossier(demId) }
              : { label: "Clôturer le dossier", kind: "primary", onClick: () => { store.update("demandes", demId, { statut: "clos" }); if (s) store.update("stagiaires", s.id, { statut: "termine" }); store.log("Clôture dossier", s ? s.nom : ""); ui.toast("Dossier clôturé et archivé."); App.render(); } },
      ].filter(Boolean),
    });
  }

  function advanceDossier(demId) {
    const d = store.find("demandes", demId);
    const next = d.etape + 1;
    const s = stagiaire(d.stagiaireId);
    store.update("demandes", demId, { etape: next });
    // Effets de bord cohérents avec l'étape atteinte
    if (next === 3 && s) {
      // création d'une convention si absente
      if (!store.where("conventions", (c) => c.stagiaireId === s.id).length) {
        store.insert("conventions", { stagiaireId: s.id, formateurId: s.formateurId, entrepriseId: s.entrepriseId, dateDebut: U.todayISO(), dateFin: U.todayISO(), heures: s.volumeHeures, financement: "OPCO", statut: "signee", date: U.todayISO() });
      }
    }
    store.log("Avancement étape", `${s ? s.nom : ""} → étape ${next} (${ETAPES[next - 1].titre})`);
    ui.toast(`Dossier passé à l'étape ${next} : ${ETAPES[next - 1].titre}.`);
    App.render();
  }

  function newDemandeModal() {
    const entreprises = store.all("entreprises");
    const formateurs = store.all("formateurs");
    const langues = ["Anglais", "Allemand", "Espagnol", "Italien", "Français (FLE)"];
    ui.modal({
      title: "Nouvelle demande de formation", size: "md",
      body: `<form id="frm" class="form-grid">
        <label>Nom du stagiaire<input class="input" name="nom" required></label>
        <label>Entreprise<select class="input" name="entrepriseId">${entreprises.map((e) => `<option value="${e.id}">${U.escapeHtml(e.nom)}</option>`).join("")}</select></label>
        <label>Langue<select class="input" name="langue">${langues.map((l) => `<option>${l}</option>`).join("")}</select></label>
        <label>Profil<select class="input" name="profil"><option>Technicien / Opérateur</option><option selected>Cadre</option><option>Dirigeant</option></select></label>
        <label>Formateur pressenti<select class="input" name="formateurId">${formateurs.map((f) => `<option value="${f.id}">${U.escapeHtml(f.name)} (${f.langue})</option>`).join("")}</select></label>
        <label>Origine<select class="input" name="origine"><option>Recommandation</option><option>Site web</option><option>Salon RH</option><option>Client existant</option></select></label>
        <label class="full">Objectif exprimé<textarea class="input" name="objectif" rows="2"></textarea></label>
      </form>`,
      actions: [
        { label: "Annuler", kind: "ghost" },
        { label: "Créer la demande", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          if (!f.nom.value.trim()) { ui.toast("Le nom est requis.", "error"); return false; }
          const sta = store.insert("stagiaires", {
            nom: f.nom.value.trim(), entrepriseId: f.entrepriseId.value, langue: f.langue.value,
            profil: f.profil.value, formateurId: f.formateurId.value, objectif: f.objectif.value,
            niveauInitial: "A1", niveauVise: "B1", volumeHeures: 40, heuresRealisees: 0,
            modalite: "Visioconférence", statut: "en_cours", rgpdConsent: true,
          });
          store.insert("demandes", { stagiaireId: sta.id, entrepriseId: f.entrepriseId.value, langue: f.langue.value, date: U.todayISO(), origine: f.origine.value, etape: 1, statut: "actif", auditRealise: false });
          store.log("Nouvelle demande", sta.nom);
          ui.toast("Demande créée à l'étape 1."); App.render();
        } },
      ],
    });
  }

  /* =====================================================================
   *  PROGRAMMES
   * ===================================================================== */
  App.views.programmes = function () {
    const stagiaires = auth.scopeStagiaires(store.all("stagiaires"));
    const canEdit = auth.is("admin") || auth.is("formateur");

    const rows = stagiaires.map((s) => {
      const p = store.where("programmes", (x) => x.stagiaireId === s.id)[0];
      const done = p ? p.modules.filter((m) => m.fait).length : 0;
      const total = p ? p.modules.length : 0;
      return { s, p, done, total };
    });

    const table = ui.table([
      { label: "Stagiaire", render: (r) => `<b>${U.escapeHtml(r.s.nom)}</b><div class="muted">${U.escapeHtml(r.s.langue)} · ${U.escapeHtml(r.s.profil)}</div>` },
      { label: "Programme", render: (r) => r.p ? U.escapeHtml(r.p.titre) : `<span class="muted">à créer</span>` },
      { label: "Modules", render: (r) => r.total ? `${r.done}/${r.total}` : "—" },
      { label: "Avancement", render: (r) => r.total ? ui.progress(r.done / r.total) : "—" },
      { label: "", render: (r) => canEdit ? `<button class="btn btn--ghost btn--sm" data-prog="${r.s.id}">${r.p ? "Éditer" : "Créer"}</button>` : "" },
    ], rows, { empty: "Aucun stagiaire." });

    return {
      title: "Programmes de formation",
      subtitle: "Parcours personnalisés par stagiaire",
      actions: canEdit ? `<button class="btn btn--ghost" id="btn-templates">📚 Modèles</button>` : "",
      html: table,
      onMount(root) {
        const t = document.getElementById("btn-templates");
        if (t) t.onclick = () => templatesModal();
        root.querySelectorAll("[data-prog]").forEach((b) => b.onclick = () => editProgrammeModal(b.getAttribute("data-prog")));
      },
    };
  };

  function templatesModal() {
    const modeles = store.all("modeles");
    ui.modal({
      title: "Modèles de programme réutilisables", size: "lg",
      body: modeles.map((m) => `<div class="card card--flat">
        <b>${U.escapeHtml(m.nom)}</b> <span class="muted">· ${m.duree}h</span>
        <ul class="checklist checklist--plain">${m.modules.map((x) => `<li>${U.escapeHtml(x)}</li>`).join("")}</ul>
      </div>`).join(""),
      actions: [{ label: "Fermer", kind: "primary" }],
    });
  }

  function editProgrammeModal(stagiaireId) {
    const s = stagiaire(stagiaireId);
    let p = store.where("programmes", (x) => x.stagiaireId === stagiaireId)[0];
    const ae = store.where("autoEvaluations", (a) => a.stagiaireId === stagiaireId)[0];
    const modeles = store.all("modeles");

    if (!p) {
      p = store.insert("programmes", { stagiaireId, titre: `Parcours ${s.langue} — ${s.profil}`, objectifs: s.objectif || "", dureeHeures: s.volumeHeures, modules: [], cree: U.todayISO() });
    }
    const render = (root) => {
      root.querySelector("#mods").innerHTML = p.modules.length ? p.modules.map((m, i) =>
        `<li><label class="check"><input type="checkbox" data-done="${i}" ${m.fait ? "checked" : ""}> <span>${U.escapeHtml(m.titre)}</span></label><span class="muted">${m.heures}h</span><button class="icon-btn" data-del="${i}">×</button></li>`).join("") : `<li class="muted">Aucun module. Ajoutez-en ou générez depuis un modèle.</li>`;
      root.querySelectorAll("[data-done]").forEach((c) => c.onchange = () => { p.modules[c.getAttribute("data-done")].fait = c.checked; store.update("programmes", p.id, { modules: p.modules }); recalcHours(s, p); });
      root.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => { p.modules.splice(b.getAttribute("data-del"), 1); store.update("programmes", p.id, { modules: p.modules }); render(root); });
    };

    ui.modal({
      title: "Programme — " + s.nom, size: "lg",
      body: `<div class="form-grid">
        <label class="full">Intitulé<input class="input" id="p-titre" value="${U.escapeHtml(p.titre)}"></label>
        <label class="full">Objectifs<textarea class="input" id="p-obj" rows="2">${U.escapeHtml(p.objectifs || "")}</textarea></label>
      </div>
      <div class="row-between"><h4>Modules</h4>
        <div class="inline">
          <select class="input input--sm" id="p-modele"><option value="">Générer depuis un modèle…</option>${modeles.map((m) => `<option value="${m.id}">${U.escapeHtml(m.nom)}</option>`).join("")}</select>
          ${ae ? `<button class="btn btn--ghost btn--sm" id="p-fromae">⚙ Depuis l'auto-éval</button>` : ""}
        </div>
      </div>
      <ul class="checklist" id="mods"></ul>
      <div class="inline"><input class="input input--sm" id="p-newmod" placeholder="Nouveau module…"><input class="input input--sm" id="p-newh" type="number" placeholder="h" style="max-width:70px" value="5"><button class="btn btn--ghost btn--sm" id="p-add">+ Ajouter</button></div>`,
      onMount: (root) => {
        render(root);
        root.querySelector("#p-add").onclick = () => {
          const t = root.querySelector("#p-newmod").value.trim();
          if (!t) return;
          p.modules.push({ titre: t, heures: Number(root.querySelector("#p-newh").value) || 5, fait: false });
          store.update("programmes", p.id, { modules: p.modules });
          root.querySelector("#p-newmod").value = ""; render(root);
        };
        root.querySelector("#p-modele").onchange = (e) => {
          const m = store.find("modeles", e.target.value); if (!m) return;
          p.modules = m.modules.map((x) => ({ titre: x, heures: Math.round(m.duree / m.modules.length), fait: false }));
          store.update("programmes", p.id, { modules: p.modules }); render(root); ui.toast("Modules générés depuis le modèle.");
        };
        const fa = root.querySelector("#p-fromae");
        if (fa) fa.onclick = () => {
          p.modules = [
            { titre: "Renforcement compréhension orale", heures: 10, fait: false },
            { titre: "Expression orale ciblée : " + (ae.besoins || s.objectif || ""), heures: 12, fait: false },
            { titre: "Vocabulaire métier (" + s.profil + ")", heures: 8, fait: false },
            { titre: "Mise en situation professionnelle", heures: 10, fait: false },
          ];
          store.update("programmes", p.id, { modules: p.modules }); render(root); ui.toast("Programme généré à partir de l'auto-évaluation.");
        };
      },
      actions: [
        { label: "Fermer", kind: "ghost" },
        { label: "Enregistrer", kind: "primary", onClick: (root) => {
          store.update("programmes", p.id, { titre: root.querySelector("#p-titre").value, objectifs: root.querySelector("#p-obj").value });
          recalcHours(s, p);
          store.log("Programme mis à jour", s.nom); ui.toast("Programme enregistré."); App.render();
        } },
      ],
    });
  }

  // Met à jour les heures réalisées du stagiaire d'après les modules faits
  function recalcHours(s, p) {
    const done = p.modules.filter((m) => m.fait).reduce((a, m) => a + (m.heures || 0), 0);
    store.update("stagiaires", s.id, { heuresRealisees: Math.min(s.volumeHeures, done) });
  }

  /* =====================================================================
   *  AUTO-ÉVALUATIONS
   * ===================================================================== */
  App.views.autoeval = function () {
    const stagiaires = auth.scopeStagiaires(store.all("stagiaires"));
    const isStagiaire = auth.is("stagiaire");

    const rows = stagiaires.map((s) => ({ s, ae: store.where("autoEvaluations", (a) => a.stagiaireId === s.id)[0] }));

    const table = ui.table([
      { label: "Stagiaire", render: (r) => `<b>${U.escapeHtml(r.s.nom)}</b>` },
      { label: "Langue", render: (r) => U.escapeHtml(r.s.langue) },
      { label: "Niveau perçu", render: (r) => r.ae ? ui.levelChip(r.ae.niveauPercu) : `<span class="muted">—</span>` },
      { label: "Statut", render: (r) => r.ae ? ui.badge("Complétée " + U.fmtDateShort(r.ae.date), "green") : ui.badge("À faire", "amber") },
      { label: "", render: (r) => `<button class="btn btn--ghost btn--sm" data-ae="${r.s.id}">${r.ae ? "Consulter" : "Remplir"}</button>` },
    ], rows, { empty: "Aucun stagiaire." });

    const remplies = rows.filter((r) => r.ae).length;
    const actions = isStagiaire ? "" :
      `<button class="btn btn--ghost" id="ae-csv">⬇ Exporter (Excel/CSV)</button>
       <button class="btn btn--ghost" id="ae-pdf">📄 Récapitulatif (PDF)</button>`;

    return {
      title: "Auto-évaluations",
      subtitle: isStagiaire ? "Évaluez votre niveau et vos besoins" : `Base de construction des programmes — ${remplies}/${rows.length} fiche(s) remplie(s)`,
      actions,
      html: table,
      onMount(root) {
        root.querySelectorAll("[data-ae]").forEach((b) => b.onclick = () => autoEvalModal(b.getAttribute("data-ae")));
        const csv = document.getElementById("ae-csv");
        if (csv) csv.onclick = () => exportAutoEvalsCSV(rows);
        const pdf = document.getElementById("ae-pdf");
        if (pdf) pdf.onclick = () => autoEvalsRecapPDF(rows);
      },
    };
  };

  // Libellés des compétences notées dans l'auto-évaluation
  const AE_COMPETENCES = [
    ["comprehensionOrale", "Compréhension orale"], ["expressionOrale", "Expression orale"],
    ["comprehensionEcrite", "Compréhension écrite"], ["expressionEcrite", "Expression écrite"],
  ];

  // Export tableur (CSV/Excel) de toutes les fiches d'auto-évaluation
  function exportAutoEvalsCSV(rows) {
    const header = ["Stagiaire", "Langue", "Profil", "Date", "Niveau perçu",
      ...AE_COMPETENCES.map((c) => c[1] + " (/5)"), "Fréquence d'usage", "Besoins", "Objectifs", "Statut"];
    const data = [header];
    rows.forEach(({ s, ae }) => {
      const rep = (ae && ae.reponses) || {};
      data.push([
        s.nom, s.langue, s.profil, ae ? U.fmtDateShort(ae.date) : "", ae ? ae.niveauPercu : "",
        ...AE_COMPETENCES.map((c) => (ae ? (rep[c[0]] || "") : "")),
        ae ? (rep.frequenceUsage || "") : "", ae ? ae.besoins : "", ae ? ae.objectifs : "",
        ae ? "Remplie" : "Non remplie",
      ]);
    });
    U.exportCSV("auto_evaluations_aslearning.csv", data);
    store.log("Export auto-évaluations", `${rows.filter((r) => r.ae).length} fiche(s)`);
    ui.toast("Récapitulatif exporté (CSV/Excel).");
  }

  // Récapitulatif PDF de toutes les fiches d'auto-évaluation (archivage / audit)
  function autoEvalsRecapPDF(rows) {
    const remplies = rows.filter((r) => r.ae);
    const head = `<div class="doc-head"><div><span class="brand">AS Learning</span><div class="muted">Organisme de formation — QUALIOPI</div></div><div class="muted">Édité le ${U.fmtDate(U.todayISO())}</div></div>`;
    const synthese = `<h1>Récapitulatif des auto-évaluations</h1>
      <p>${remplies.length} fiche(s) remplie(s) sur ${rows.length} stagiaire(s).</p>
      <table><tr><th>Stagiaire</th><th>Langue</th><th>Niveau perçu</th>${AE_COMPETENCES.map((c) => `<th>${c[1]}</th>`).join("")}<th>Date</th></tr>
        ${rows.map(({ s, ae }) => { const rep = (ae && ae.reponses) || {}; return `<tr><td>${U.escapeHtml(s.nom)}</td><td>${s.langue}</td><td>${ae ? ae.niveauPercu : "—"}</td>${AE_COMPETENCES.map((c) => `<td>${ae ? (rep[c[0]] || "—") : "—"}</td>`).join("")}<td>${ae ? U.fmtDateShort(ae.date) : "non remplie"}</td></tr>`; }).join("")}
      </table>`;
    const details = remplies.map(({ s, ae }) => `
      <h2>${U.escapeHtml(s.nom)} — ${s.langue}</h2>
      <p><b>Niveau perçu :</b> ${ae.niveauPercu} · <b>Fréquence d'usage :</b> ${U.escapeHtml((ae.reponses && ae.reponses.frequenceUsage) || "—")} · <b>Date :</b> ${U.fmtDate(ae.date)}</p>
      <p><b>Besoins :</b> ${U.escapeHtml(ae.besoins || "—")}</p>
      <p><b>Objectifs :</b> ${U.escapeHtml(ae.objectifs || "—")}</p>`).join("");
    U.printDocument("Récapitulatif des auto-évaluations — AS Learning", head + synthese + details);
    store.log("Récapitulatif auto-évaluations (PDF)", `${remplies.length} fiche(s)`);
  }

  function autoEvalModal(stagiaireId) {
    const s = stagiaire(stagiaireId);
    const existing = store.where("autoEvaluations", (a) => a.stagiaireId === stagiaireId)[0];
    const canEdit = auth.is("stagiaire") || auth.is("admin");
    const niveaux = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const ae = existing || { reponses: {} };
    const competences = [
      ["comprehensionOrale", "Compréhension orale"], ["expressionOrale", "Expression orale"],
      ["comprehensionEcrite", "Compréhension écrite"], ["expressionEcrite", "Expression écrite"],
    ];

    const ratingRow = (key, label) => {
      const val = (ae.reponses && ae.reponses[key]) || 0;
      return `<div class="rating"><span>${label}</span><div class="rating__dots">${[1, 2, 3, 4, 5].map((n) =>
        `<label class="rating__dot"><input type="radio" name="${key}" value="${n}" ${val == n ? "checked" : ""} ${canEdit ? "" : "disabled"}><span>${n}</span></label>`).join("")}</div></div>`;
    };

    ui.modal({
      title: "Auto-évaluation — " + s.nom, size: "md",
      body: `<form id="frm">
        <p class="muted">Notez votre niveau actuel pour chaque compétence (1 = débutant, 5 = autonome).</p>
        ${competences.map((c) => ratingRow(c[0], c[1])).join("")}
        <label class="block">Niveau global perçu (CECRL)<select class="input" name="niveauPercu" ${canEdit ? "" : "disabled"}>${niveaux.map((n) => `<option ${ae.niveauPercu === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="block">Fréquence d'utilisation de la langue<select class="input" name="frequenceUsage" ${canEdit ? "" : "disabled"}><option>Rarement</option><option>Parfois</option><option>Souvent</option><option>Quotidiennement</option></select></label>
        <label class="block">Vos besoins / situations professionnelles<textarea class="input" name="besoins" rows="2" ${canEdit ? "" : "readonly"}>${U.escapeHtml(ae.besoins || "")}</textarea></label>
        <label class="block">Vos objectifs<textarea class="input" name="objectifs" rows="2" ${canEdit ? "" : "readonly"}>${U.escapeHtml(ae.objectifs || "")}</textarea></label>
      </form>`,
      actions: canEdit ? [
        { label: "Annuler", kind: "ghost" },
        { label: "Enregistrer", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          const reponses = {};
          competences.forEach((c) => { const r = f.querySelector(`[name="${c[0]}"]:checked`); reponses[c[0]] = r ? Number(r.value) : 0; });
          reponses.frequenceUsage = f.frequenceUsage.value;
          const data = { stagiaireId, date: existing ? existing.date : U.todayISO(), niveauPercu: f.niveauPercu.value, besoins: f.besoins.value, objectifs: f.objectifs.value, reponses };
          if (existing) store.update("autoEvaluations", existing.id, data); else store.insert("autoEvaluations", data);
          store.log("Auto-évaluation", s.nom); ui.toast("Auto-évaluation enregistrée."); App.render();
        } },
      ] : [{ label: "Fermer", kind: "primary" }],
    });
  }
})();
