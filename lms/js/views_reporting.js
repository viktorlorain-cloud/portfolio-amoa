/* =========================================================================
 *  AS Learning — LMS  ·  views_reporting.js
 *  Vues : reporting QUALIOPI, journal d'activité + générateur de documents.
 * ========================================================================= */
window.App = window.App || {};
App.views = App.views || {};
App.docs = App.docs || {};

(function () {
  "use strict";
  const U = App.utils, ui = App.ui, store = App.store;

  const formateur = (id) => store.find("formateurs", id);
  const stagiaire = (id) => store.find("stagiaires", id);
  const ent = (id) => store.find("entreprises", id);
  const forName = (id) => { const f = formateur(id); return f ? f.name : "—"; };
  const entName = (id) => { const e = ent(id); return e ? e.nom : "—"; };

  /* =====================================================================
   *  REPORTING QUALIOPI
   * ===================================================================== */
  App.views.reporting = function () {
    const stagiaires = store.all("stagiaires");
    const seances = store.all("seances");
    const emargs = store.all("emargements");
    const satisfactions = store.all("satisfactions");
    const certificats = store.all("certificats");

    const actifs = stagiaires.filter((s) => s.statut === "en_cours");
    const heuresRealisees = stagiaires.reduce((a, s) => a + (s.heuresRealisees || 0), 0);
    const realisees = seances.filter((s) => s.statut === "realisee");
    const signees = realisees.filter((s) => { const e = emargs.find((x) => x.seanceId === s.id); return e && e.signeStagiaire && e.signeFormateur; });
    const assiduite = realisees.length ? (signees.length / realisees.length) * 100 : 100;
    const satNotes = satisfactions.map((s) => s.note);
    const satMoy = satNotes.length ? satNotes.reduce((a, b) => a + b, 0) / satNotes.length : 0;

    const kpis = [
      ["Stagiaires actifs", actifs.length, "blue"],
      ["Heures réalisées", Math.round(heuresRealisees) + "h", "green"],
      ["Taux d'assiduité", U.pct(assiduite), assiduite >= 90 ? "green" : "amber"],
      ["Satisfaction moyenne", satMoy ? satMoy.toFixed(1) + "/5" : "—", "amber"],
      ["Certifications obtenues", certificats.filter((c) => c.certificationPassee).length, "green"],
      ["Formateurs actifs", store.all("formateurs").length, "gray"],
    ];
    const kpiHtml = kpis.map((k) => `<div class="kpi kpi--${k[2]}"><div class="kpi__val">${k[1]}</div><div class="kpi__lbl">${k[0]}</div></div>`).join("");

    // Heures réalisées par formateur
    const byFor = U.groupBy(realisees, (s) => s.formateurId);
    const maxH = Math.max(1, ...Object.values(byFor).map((arr) => arr.reduce((a, s) => a + U.hoursBetween(s.debut, s.fin), 0)));
    const forBars = store.all("formateurs").map((f) => {
      const h = (byFor[f.id] || []).reduce((a, s) => a + U.hoursBetween(s.debut, s.fin), 0);
      return `<div class="bar-row"><span>${U.escapeHtml(f.name)}</span><div class="bar"><div class="bar__fill" style="width:${(h / maxH) * 100}%"></div></div><b>${h}h</b></div>`;
    }).join("");

    const html = `
      <div class="kpis kpis--6">${kpiHtml}</div>
      <div class="card card--accent">
        <h3 class="card__title">Conformité QUALIOPI — indicateurs clés</h3>
        <div class="compliance">
          <div class="compliance__item"><span class="dot ${assiduite >= 90 ? "ok" : "warn"}"></span> Assiduité tracée et horodatée : <b>${U.pct(assiduite)}</b></div>
          <div class="compliance__item"><span class="dot ok"></span> Émargements signés : <b>${signees.length}/${realisees.length}</b> séances</div>
          <div class="compliance__item"><span class="dot ok"></span> Auto-évaluations renseignées : <b>${store.all("autoEvaluations").length}</b></div>
          <div class="compliance__item"><span class="dot ok"></span> Programmes individualisés : <b>${store.all("programmes").length}</b></div>
        </div>
      </div>
      <div class="grid grid--2">
        <div class="card"><h3 class="card__title">Heures réalisées par formateur</h3>${forBars}</div>
        <div class="card"><h3 class="card__title">Documents & exports d'audit</h3>
          <p class="muted">Générez les pièces attendues en audit QUALIOPI.</p>
          <div class="doc-actions doc-actions--col">
            <button class="btn btn--ghost" id="exp-stag">⬇ Liste des stagiaires (Excel/CSV)</button>
            <button class="btn btn--ghost" id="exp-ema">⬇ Registre des émargements (CSV)</button>
            <button class="btn btn--ghost" id="exp-seances">⬇ Planning des séances (CSV)</button>
            <button class="btn btn--ghost" id="exp-bilan">📄 Bilan d'activité (PDF)</button>
          </div>
        </div>
      </div>`;

    return {
      title: "Reporting & conformité QUALIOPI",
      subtitle: "Pilotage de l'activité et preuves d'audit",
      html,
      onMount(root) {
        root.querySelector("#exp-stag").onclick = () => {
          const data = [["Nom", "Entreprise", "Langue", "Niveau initial", "Niveau visé", "Formateur", "Heures réalisées", "Volume", "Statut"]];
          stagiaires.forEach((s) => data.push([s.nom, entName(s.entrepriseId), s.langue, s.niveauInitial, s.niveauVise, forName(s.formateurId), s.heuresRealisees, s.volumeHeures, s.statut]));
          U.exportCSV("qualiopi_stagiaires.csv", data); ui.toast("Export généré.");
        };
        root.querySelector("#exp-ema").onclick = () => {
          const data = [["Date", "Stagiaire", "Formateur", "Horaire", "Signé stagiaire", "Signé formateur", "Horodatage"]];
          emargs.forEach((e) => { const s = store.find("seances", e.seanceId) || {}; data.push([e.date, stagiaire(e.stagiaireId) ? stagiaire(e.stagiaireId).nom : "", forName(e.formateurId), (s.debut || "") + "-" + (s.fin || ""), e.signeStagiaire ? "Oui" : "Non", e.signeFormateur ? "Oui" : "Non", e.tsStagiaire || ""]); });
          U.exportCSV("qualiopi_emargements.csv", data); ui.toast("Registre exporté.");
        };
        root.querySelector("#exp-seances").onclick = () => {
          const data = [["Date", "Début", "Fin", "Stagiaire", "Formateur", "Modalité", "Thème", "Statut"]];
          seances.forEach((s) => data.push([s.date, s.debut, s.fin, stagiaire(s.stagiaireId) ? stagiaire(s.stagiaireId).nom : "", forName(s.formateurId), s.modalite, s.theme, s.statut]));
          U.exportCSV("planning_seances.csv", data); ui.toast("Planning exporté.");
        };
        root.querySelector("#exp-bilan").onclick = () => bilanPDF({ actifs, heuresRealisees, assiduite, satMoy, certificats });
      },
    };
  };

  function bilanPDF(m) {
    const body = `
      <div class="doc-head"><div><span class="brand">AS Learning</span><div class="muted">Organisme de formation — QUALIOPI</div></div>
        <div class="muted">Édité le ${U.fmtDate(U.todayISO())}</div></div>
      <h1>Bilan d'activité de formation</h1>
      <table>
        <tr><th>Stagiaires actifs</th><td>${m.actifs.length}</td></tr>
        <tr><th>Heures de formation réalisées</th><td>${Math.round(m.heuresRealisees)} h</td></tr>
        <tr><th>Taux d'assiduité</th><td>${U.pct(m.assiduite)}</td></tr>
        <tr><th>Satisfaction moyenne</th><td>${m.satMoy ? m.satMoy.toFixed(1) + " / 5" : "—"}</td></tr>
        <tr><th>Certifications obtenues</th><td>${m.certificats.filter((c) => c.certificationPassee).length}</td></tr>
      </table>
      <h2>Stagiaires</h2>
      <table><tr><th>Nom</th><th>Entreprise</th><th>Langue</th><th>Heures</th><th>Statut</th></tr>
        ${store.all("stagiaires").map((s) => `<tr><td>${U.escapeHtml(s.nom)}</td><td>${U.escapeHtml(entName(s.entrepriseId))}</td><td>${s.langue}</td><td>${s.heuresRealisees}/${s.volumeHeures}h</td><td>${s.statut}</td></tr>`).join("")}
      </table>`;
    U.printDocument("Bilan d'activité — AS Learning", body);
  }

  /* =====================================================================
   *  JOURNAL D'ACTIVITÉ
   * ===================================================================== */
  App.views.journal = function () {
    const entries = store.all("journal");
    const table = ui.table([
      { label: "Date", render: (e) => U.fmtDateTime(e.at.slice(0, 10), e.at.slice(11, 16)) },
      { label: "Utilisateur", render: (e) => U.escapeHtml(e.user) },
      { label: "Action", render: (e) => ui.badge(e.action, "blue") },
      { label: "Détail", render: (e) => U.escapeHtml(e.detail) },
    ], entries.slice(0, 200), { empty: "Aucune activité enregistrée." });

    return {
      title: "Journal d'activité",
      subtitle: "Traçabilité des opérations (RGPD / QUALIOPI)",
      actions: `<button class="btn btn--danger" id="btn-reset">↻ Réinitialiser la démo</button>`,
      html: table,
      onMount() {
        document.getElementById("btn-reset").onclick = () => {
          ui.confirm("Réinitialiser toutes les données de démonstration ? Les modifications locales seront perdues.").then((ok) => {
            if (ok) { store.reset(); ui.toast("Données réinitialisées."); App.go("dashboard"); App.render(); }
          });
        };
      },
    };
  };

  /* =====================================================================
   *  GÉNÉRATEUR DE DOCUMENTS (PDF via impression navigateur)
   * ===================================================================== */
  App.docs.generate = function (type, s) {
    if (!s) { ui.toast("Stagiaire introuvable.", "error"); return; }
    const docHead = `<div class="doc-head"><div><span class="brand">AS Learning</span><div class="muted">Organisme de formation linguistique — Certifié QUALIOPI</div></div><div class="muted">Édité le ${U.fmtDate(U.todayISO())}</div></div>`;
    const f = formateur(s.formateurId);
    const e = ent(s.entrepriseId);
    let body, title;

    if (type === "convocation") {
      const next = store.where("seances", (x) => x.stagiaireId === s.id && x.statut === "planifiee" && x.date >= U.todayISO()).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut))[0];
      title = "Convocation à la formation";
      body = `${docHead}<h1>Convocation</h1>
        <p>Madame, Monsieur <b>${U.escapeHtml(s.nom)}</b>,</p>
        <p>Vous êtes convoqué(e) à votre formation en <b>${U.escapeHtml(s.langue)}</b> dispensée par AS Learning${e ? " dans le cadre de votre entreprise <b>" + U.escapeHtml(e.nom) + "</b>" : ""}.</p>
        <table>
          <tr><th>Formateur</th><td>${U.escapeHtml(f ? f.name : "—")}</td></tr>
          <tr><th>Modalité</th><td>${U.escapeHtml(s.modalite)}</td></tr>
          <tr><th>Volume horaire</th><td>${s.volumeHeures} heures</td></tr>
          ${next ? `<tr><th>Prochaine séance</th><td>${U.dayLabel(next.date)} ${U.fmtDate(next.date)} de ${next.debut} à ${next.fin}<br>${U.escapeHtml(next.lieu || next.modalite)}</td></tr>` : ""}
        </table>
        <p>Nous vous remercions de votre ponctualité et restons à votre disposition.</p>
        <div class="sign-grid"><div class="sign-box"><div class="line">Pour AS Learning</div></div></div>`;
    } else if (type === "emargement") {
      const seances = store.where("seances", (x) => x.stagiaireId === s.id).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
      const emargs = store.all("emargements");
      title = "Feuille d'émargement";
      body = `${docHead}<h1>Feuille d'émargement</h1>
        <p><b>Stagiaire :</b> ${U.escapeHtml(s.nom)} — <b>Langue :</b> ${U.escapeHtml(s.langue)} — <b>Formateur :</b> ${U.escapeHtml(f ? f.name : "—")}${e ? " — <b>Entreprise :</b> " + U.escapeHtml(e.nom) : ""}</p>
        <table><tr><th>Date</th><th>Horaire</th><th>Signature stagiaire</th><th>Signature formateur</th></tr>
          ${seances.map((x) => { const em = emargs.find((m) => m.seanceId === x.id); return `<tr><td>${U.fmtDateShort(x.date)}</td><td>${x.debut}–${x.fin}</td>
            <td>${em && em.sigStagiaire ? `<img src="${em.sigStagiaire}" style="max-height:38px">` : ""}</td>
            <td>${em && em.sigFormateur ? `<img src="${em.sigFormateur}" style="max-height:38px">` : ""}</td></tr>`; }).join("")}
        </table>
        <p class="muted">Document horodaté — preuve d'assiduité conforme aux exigences QUALIOPI.</p>`;
    } else if (type === "programme") {
      const p = store.where("programmes", (x) => x.stagiaireId === s.id)[0];
      title = "Programme de formation";
      body = `${docHead}<h1>Programme de formation</h1>
        <p><b>Stagiaire :</b> ${U.escapeHtml(s.nom)} — <b>Langue :</b> ${U.escapeHtml(s.langue)}</p>
        <p><b>Objectifs :</b> ${U.escapeHtml(s.objectif || (p && p.objectifs) || "")}</p>
        <p><b>Niveau initial :</b> ${s.niveauInitial} → <b>Niveau visé :</b> ${s.niveauVise} — <b>Durée :</b> ${s.volumeHeures} h</p>
        <h2>Modules</h2>
        <table><tr><th>Module</th><th>Heures</th></tr>${p ? p.modules.map((m) => `<tr><td>${U.escapeHtml(m.titre)}</td><td>${m.heures}h</td></tr>`).join("") : "<tr><td>—</td><td></td></tr>"}</table>`;
    } else if (type === "certificat") {
      const c = store.where("certificats", (x) => x.stagiaireId === s.id)[0] || {};
      title = "Certificat de réalisation";
      body = `${docHead}<h1>Certificat de réalisation de formation</h1>
        <p>Je soussignée, Anne-Sophie Graingeot, gérante d'AS Learning, certifie que :</p>
        <p style="font-size:16px"><b>${U.escapeHtml(s.nom)}</b>${e ? " (" + U.escapeHtml(e.nom) + ")" : ""}</p>
        <p>a suivi l'action de formation en <b>${U.escapeHtml(s.langue)}</b> d'une durée de <b>${c.heuresRealisees || s.heuresRealisees} heures</b>.</p>
        <table>
          <tr><th>Niveau atteint (CECRL)</th><td>${c.niveauAtteint || s.niveauVise}</td></tr>
          <tr><th>Certification</th><td>${c.certificationPassee ? (c.certificationNom || "Linguaskill") + (c.score ? " — score " + c.score : "") : "Non passée"}</td></tr>
          <tr><th>Date de réalisation</th><td>${U.fmtDate(c.dateRealisation || U.todayISO())}</td></tr>
        </table>
        <div class="sign-grid"><div class="sign-box"><div class="line">Fait à Strasbourg, le ${U.fmtDate(U.todayISO())}<br>Anne-Sophie Graingeot — Gérante</div></div></div>`;
    } else if (type === "attestation") {
      title = "Attestation de fin de formation";
      body = `${docHead}<h1>Attestation de fin de formation</h1>
        <p>AS Learning atteste que <b>${U.escapeHtml(s.nom)}</b>${e ? " (" + U.escapeHtml(e.nom) + ")" : ""} a participé à la formation linguistique en <b>${U.escapeHtml(s.langue)}</b>.</p>
        <table>
          <tr><th>Heures réalisées</th><td>${s.heuresRealisees} / ${s.volumeHeures} h</td></tr>
          <tr><th>Formateur</th><td>${U.escapeHtml(f ? f.name : "—")}</td></tr>
          <tr><th>Niveau initial → visé</th><td>${s.niveauInitial} → ${s.niveauVise}</td></tr>
        </table>
        <div class="sign-grid"><div class="sign-box"><div class="line">Pour AS Learning — ${U.fmtDate(U.todayISO())}</div></div></div>`;
    } else if (type === "autoeval") {
      const a = store.where("autoEvaluations", (x) => x.stagiaireId === s.id)[0];
      title = "Fiche d'auto-évaluation";
      const comps = [["comprehensionOrale", "Compréhension orale"], ["expressionOrale", "Expression orale"], ["comprehensionEcrite", "Compréhension écrite"], ["expressionEcrite", "Expression écrite"]];
      const rep = (a && a.reponses) || {};
      body = `${docHead}<h1>Fiche d'auto-évaluation</h1>
        <p><b>Stagiaire :</b> ${U.escapeHtml(s.nom)} — <b>Langue :</b> ${U.escapeHtml(s.langue)}${a ? " — <b>Date :</b> " + U.fmtDate(a.date) : ""}</p>
        ${a ? `<table><tr><th>Compétence</th><th>Niveau auto-évalué (/5)</th></tr>
          ${comps.map((c) => `<tr><td>${c[1]}</td><td>${rep[c[0]] || "—"}</td></tr>`).join("")}
          <tr><th>Niveau global perçu (CECRL)</th><td>${a.niveauPercu || "—"}</td></tr>
          <tr><th>Fréquence d'utilisation</th><td>${U.escapeHtml(rep.frequenceUsage || "—")}</td></tr></table>
          <p><b>Besoins :</b> ${U.escapeHtml(a.besoins || "—")}</p>
          <p><b>Objectifs :</b> ${U.escapeHtml(a.objectifs || "—")}</p>` : "<p>Auto-évaluation non encore renseignée.</p>"}`;
    } else { ui.toast("Type de document inconnu.", "error"); return; }

    U.printDocument(title + " — " + s.nom, body);
    store.log("Génération document", `${type} — ${s.nom}`);
  };
})();
