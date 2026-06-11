/* =========================================================================
 *  AS Learning — LMS  ·  views_core.js
 *  Vues : tableau de bord, stagiaires, formateurs, entreprises, supports.
 * ========================================================================= */
window.App = window.App || {};
App.views = App.views || {};

(function () {
  "use strict";
  const U = App.utils, ui = App.ui, store = App.store, auth = App.auth;

  /* ---- Helpers d'accès ------------------------------------------------- */
  const ent = (id) => store.find("entreprises", id);
  const formateur = (id) => store.find("formateurs", id);
  const stagiaire = (id) => store.find("stagiaires", id);
  const entName = (id) => { const e = ent(id); return e ? e.nom : "—"; };
  const forName = (id) => { const f = formateur(id); return f ? f.name : "—"; };
  const staName = (id) => { const s = stagiaire(id); return s ? s.nom : "—"; };

  function actionBtn(id, label, kind) {
    return `<button class="btn btn--${kind || "primary"}" id="${id}">${label}</button>`;
  }

  /* =====================================================================
   *  TABLEAU DE BORD
   * ===================================================================== */
  App.views.dashboard = function () {
    const role = auth.role();
    const stagiaires = auth.scopeStagiaires(store.all("stagiaires"));
    const seances = auth.scopeSeances(store.all("seances"));
    const actifs = stagiaires.filter((s) => s.statut === "en_cours");
    const heuresRealisees = stagiaires.reduce((a, s) => a + (s.heuresRealisees || 0), 0);
    const heuresPrevues = stagiaires.reduce((a, s) => a + (s.volumeHeures || 0), 0);

    // Taux d'assiduité = séances réalisées avec double signature / séances réalisées
    const realisees = seances.filter((s) => s.statut === "realisee");
    const emargs = store.all("emargements");
    const signees = realisees.filter((s) => { const e = emargs.find((x) => x.seanceId === s.id); return e && e.signeStagiaire && e.signeFormateur; });
    const assiduite = realisees.length ? (signees.length / realisees.length) * 100 : 100;

    const upcoming = seances.filter((s) => s.statut === "planifiee" && s.date >= U.todayISO())
      .sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut)).slice(0, 6);

    let kpis;
    if (role === "stagiaire") {
      const s = auth.profile();
      kpis = [
        ["Heures réalisées", `${s.heuresRealisees} / ${s.volumeHeures}h`, "blue"],
        ["Niveau visé", s.niveauVise, "green"],
        ["Séances à venir", upcoming.length, "amber"],
        ["Formateur", forName(s.formateurId), "gray"],
      ];
    } else {
      kpis = [
        ["Stagiaires actifs", actifs.length, "blue"],
        ["Heures réalisées", Math.round(heuresRealisees) + "h", "green"],
        ["Taux d'assiduité", U.pct(assiduite), assiduite >= 90 ? "green" : "amber"],
        ["Séances planifiées", seances.filter((s) => s.statut === "planifiee").length, "amber"],
      ];
    }

    const kpiHtml = kpis.map((k) =>
      `<div class="kpi kpi--${k[2]}"><div class="kpi__val">${k[1]}</div><div class="kpi__lbl">${k[0]}</div></div>`).join("");

    const upcomingHtml = upcoming.length ? ui.table([
      { label: "Date", render: (s) => `${U.dayLabel(s.date)} ${U.fmtDateShort(s.date)}` },
      { label: "Horaire", render: (s) => `${s.debut}–${s.fin}` },
      { label: "Stagiaire", render: (s) => U.escapeHtml(staName(s.stagiaireId)) },
      { label: "Formateur", render: (s) => U.escapeHtml(forName(s.formateurId)) },
      { label: "Modalité", render: (s) => ui.badge(s.modalite, s.modalite === "Présentiel" ? "amber" : "blue") },
    ], upcoming) : ui.emptyState("Aucune séance planifiée.", "📅");

    // Répartition par langue (mini-stats admin)
    const byLangue = U.groupBy(actifs, (s) => s.langue);
    const langueHtml = Object.keys(byLangue).sort().map((l) =>
      `<div class="bar-row"><span>${U.escapeHtml(l)}</span><div class="bar"><div class="bar__fill" style="width:${(byLangue[l].length / Math.max(1, actifs.length)) * 100}%"></div></div><b>${byLangue[l].length}</b></div>`).join("");

    const adminExtra = role === "admin" ? `
      <div class="grid grid--2">
        <div class="card"><h3 class="card__title">Stagiaires actifs par langue</h3>${langueHtml || ui.emptyState("—")}</div>
        <div class="card"><h3 class="card__title">Avancement global</h3>
          <p class="muted">Heures réalisées sur l'ensemble des parcours</p>
          ${ui.progress(heuresPrevues ? heuresRealisees / heuresPrevues : 0, true)}
          <p class="muted" style="margin-top:10px">${Math.round(heuresRealisees)}h réalisées · ${heuresPrevues}h contractualisées</p>
        </div>
      </div>` : "";

    const html = `
      <div class="kpis">${kpiHtml}</div>
      ${adminExtra}
      <div class="card">
        <h3 class="card__title">Prochaines séances</h3>
        ${upcomingHtml}
      </div>`;

    return {
      title: "Tableau de bord",
      subtitle: `Bonjour ${auth.current().name.split(" ")[0]} — ${U.fmtDate(U.todayISO())}`,
      html,
    };
  };

  /* =====================================================================
   *  STAGIAIRES — liste
   * ===================================================================== */
  App.views.stagiaires = function () {
    const canEdit = auth.is("admin");
    const all = auth.scopeStagiaires(store.all("stagiaires"));

    const filters = App.views.stagiaires._filters || (App.views.stagiaires._filters = { q: "", langue: "", statut: "", formateurId: "" });
    let rows = all.filter((s) =>
      (!filters.q || (s.nom + " " + entName(s.entrepriseId)).toLowerCase().includes(filters.q.toLowerCase())) &&
      (!filters.langue || s.langue === filters.langue) &&
      (!filters.statut || s.statut === filters.statut) &&
      (!filters.formateurId || s.formateurId === filters.formateurId)
    );

    const langues = [...new Set(store.all("stagiaires").map((s) => s.langue))].sort();
    const formateurs = store.all("formateurs");

    const filtersHtml = `
      <div class="filters">
        <input class="input" id="f-q" placeholder="Rechercher un stagiaire ou une entreprise…" value="${U.escapeHtml(filters.q)}">
        <select class="input" id="f-langue"><option value="">Toutes langues</option>${langues.map((l) => `<option ${filters.langue === l ? "selected" : ""}>${l}</option>`).join("")}</select>
        <select class="input" id="f-statut"><option value="">Tous statuts</option><option value="en_cours" ${filters.statut === "en_cours" ? "selected" : ""}>En cours</option><option value="termine" ${filters.statut === "termine" ? "selected" : ""}>Terminé</option></select>
        ${auth.is("admin") ? `<select class="input" id="f-formateur"><option value="">Tous formateurs</option>${formateurs.map((f) => `<option value="${f.id}" ${filters.formateurId === f.id ? "selected" : ""}>${U.escapeHtml(f.name)}</option>`).join("")}</select>` : ""}
        <button class="btn btn--ghost" id="f-export">Exporter CSV</button>
      </div>`;

    const table = ui.table([
      { label: "Stagiaire", render: (s) => `<div class="cell-user">${ui.avatar(s.nom)}<div><b>${U.escapeHtml(s.nom)}</b><div class="muted">${U.escapeHtml(entName(s.entrepriseId))}</div></div></div>` },
      { label: "Langue", render: (s) => U.escapeHtml(s.langue) },
      { label: "Niveau", render: (s) => `${ui.levelChip(s.niveauInitial)} → ${ui.levelChip(s.niveauVise)}` },
      { label: "Formateur", render: (s) => U.escapeHtml(forName(s.formateurId)) },
      { label: "Avancement", render: (s) => ui.progress(s.volumeHeures ? s.heuresRealisees / s.volumeHeures : 0) },
      { label: "Statut", render: (s) => ui.statut(s.statut) },
    ], rows, { onRowAttr: (s) => `class="row-link" data-id="${s.id}"`, empty: "Aucun stagiaire trouvé." });

    return {
      title: "Stagiaires",
      subtitle: `${rows.length} stagiaire(s)`,
      actions: canEdit ? actionBtn("btn-add-stagiaire", "+ Nouveau stagiaire") : "",
      html: filtersHtml + table,
      onMount(root) {
        const apply = () => { App.render(); };
        const q = root.querySelector("#f-q");
        q.oninput = U.debounce ? U.debounce((e) => { filters.q = e.target.value; apply(); }, 250) : (e) => { filters.q = e.target.value; apply(); };
        // refocus après re-render
        if (filters.q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
        root.querySelector("#f-langue").onchange = (e) => { filters.langue = e.target.value; apply(); };
        root.querySelector("#f-statut").onchange = (e) => { filters.statut = e.target.value; apply(); };
        const ff = root.querySelector("#f-formateur"); if (ff) ff.onchange = (e) => { filters.formateurId = e.target.value; apply(); };
        root.querySelector("#f-export").onclick = () => exportStagiaires(rows);
        root.querySelectorAll(".row-link").forEach((tr) => tr.onclick = () => App.go("stagiaire-detail/" + tr.getAttribute("data-id")));
        const add = document.getElementById("btn-add-stagiaire");
        if (add) add.onclick = () => editStagiaireModal(null);
      },
    };
  };

  function exportStagiaires(rows) {
    const data = [["Nom", "Entreprise", "Langue", "Profil", "Niveau initial", "Niveau visé", "Formateur", "Heures réalisées", "Volume", "Statut"]];
    rows.forEach((s) => data.push([s.nom, entName(s.entrepriseId), s.langue, s.profil, s.niveauInitial, s.niveauVise, forName(s.formateurId), s.heuresRealisees, s.volumeHeures, s.statut]));
    U.exportCSV("stagiaires_aslearning.csv", data);
    ui.toast("Export CSV généré.");
  }

  function editStagiaireModal(id) {
    const s = id ? stagiaire(id) : {};
    const entreprises = store.all("entreprises");
    const formateurs = store.all("formateurs");
    const langues = ["Anglais", "Allemand", "Espagnol", "Italien", "Français (FLE)"];
    const niveaux = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const profils = ["Technicien / Opérateur", "Cadre", "Dirigeant"];
    const opt = (arr, val) => arr.map((x) => `<option ${x === val ? "selected" : ""}>${x}</option>`).join("");

    ui.modal({
      title: id ? "Modifier le stagiaire" : "Nouveau stagiaire", size: "lg",
      body: `<form id="frm" class="form-grid">
        <label>Nom complet<input class="input" name="nom" required value="${U.escapeHtml(s.nom || "")}"></label>
        <label>E-mail<input class="input" type="email" name="email" value="${U.escapeHtml(s.email || "")}"></label>
        <label>Entreprise<select class="input" name="entrepriseId">${entreprises.map((e) => `<option value="${e.id}" ${s.entrepriseId === e.id ? "selected" : ""}>${U.escapeHtml(e.nom)}</option>`).join("")}</select></label>
        <label>Téléphone<input class="input" name="telephone" value="${U.escapeHtml(s.telephone || "")}"></label>
        <label>Langue<select class="input" name="langue">${opt(langues, s.langue)}</select></label>
        <label>Profil<select class="input" name="profil">${opt(profils, s.profil)}</select></label>
        <label>Niveau initial<select class="input" name="niveauInitial">${opt(niveaux, s.niveauInitial || "A1")}</select></label>
        <label>Niveau visé<select class="input" name="niveauVise">${opt(niveaux, s.niveauVise || "B1")}</select></label>
        <label>Formateur assigné<select class="input" name="formateurId">${formateurs.map((f) => `<option value="${f.id}" ${s.formateurId === f.id ? "selected" : ""}>${U.escapeHtml(f.name)} (${f.langue})</option>`).join("")}</select></label>
        <label>Volume d'heures<input class="input" type="number" name="volumeHeures" min="1" value="${s.volumeHeures || 40}"></label>
        <label>Modalité<select class="input" name="modalite">${opt(["Visioconférence", "Présentiel"], s.modalite || "Visioconférence")}</select></label>
        <label>Statut<select class="input" name="statut"><option value="en_cours" ${s.statut === "en_cours" ? "selected" : ""}>En cours</option><option value="termine" ${s.statut === "termine" ? "selected" : ""}>Terminé</option></select></label>
        <label class="full">Objectif de formation<textarea class="input" name="objectif" rows="2">${U.escapeHtml(s.objectif || "")}</textarea></label>
        <label class="full checkbox"><input type="checkbox" name="rgpd" ${s.rgpdConsent !== false ? "checked" : ""}> Consentement RGPD recueilli (traitement des données personnelles)</label>
      </form>`,
      actions: [
        { label: "Annuler", kind: "ghost" },
        { label: id ? "Enregistrer" : "Créer", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          if (!f.nom.value.trim()) { ui.toast("Le nom est requis.", "error"); return false; }
          const data = {
            nom: f.nom.value.trim(), email: f.email.value.trim(), entrepriseId: f.entrepriseId.value,
            telephone: f.telephone.value, langue: f.langue.value, profil: f.profil.value,
            niveauInitial: f.niveauInitial.value, niveauVise: f.niveauVise.value,
            formateurId: f.formateurId.value, volumeHeures: Number(f.volumeHeures.value),
            modalite: f.modalite.value, statut: f.statut.value, objectif: f.objectif.value,
            rgpdConsent: f.rgpd.checked,
          };
          if (id) { store.update("stagiaires", id, data); store.log("Modification stagiaire", data.nom); }
          else { data.heuresRealisees = 0; store.insert("stagiaires", data); store.log("Création stagiaire", data.nom); }
          ui.toast("Stagiaire enregistré.");
          App.render();
        } },
      ],
    });
  }
  App.views._editStagiaire = editStagiaireModal;

  /* =====================================================================
   *  STAGIAIRE — détail
   * ===================================================================== */
  App.views["stagiaire-detail"] = function (params) {
    const id = params[0];
    const s = stagiaire(id);
    if (!s) return { title: "Stagiaire introuvable", html: ui.emptyState("Ce stagiaire n'existe pas.") };

    const prog = store.where("programmes", (p) => p.stagiaireId === id)[0];
    const ae = store.where("autoEvaluations", (a) => a.stagiaireId === id)[0];
    const seances = store.where("seances", (x) => x.stagiaireId === id).sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
    const suivis = store.where("suivis", (x) => x.stagiaireId === id).sort((a, b) => b.date.localeCompare(a.date));
    const supports = store.where("supports", (x) => x.stagiaireId === id);
    const cert = store.where("certificats", (c) => c.stagiaireId === id)[0];
    const canEdit = auth.is("admin") || (auth.is("formateur") && s.formateurId === auth.current().linkId);

    const modulesHtml = prog ? prog.modules.map((m) =>
      `<li class="${m.fait ? "done" : ""}"><span>${m.fait ? "✓" : "○"}</span> ${U.escapeHtml(m.titre)} <span class="muted">(${m.heures}h)</span></li>`).join("") : "";

    const seancesHtml = ui.table([
      { label: "Date", render: (x) => U.fmtDateShort(x.date) },
      { label: "Horaire", render: (x) => `${x.debut}–${x.fin}` },
      { label: "Thème", render: (x) => U.escapeHtml(x.theme || "—") },
      { label: "Statut", render: (x) => ui.statut(x.statut) },
    ], seances.slice(0, 8), { empty: "Aucune séance." });

    const suivisHtml = suivis.length ? suivis.slice(0, 5).map((su) =>
      `<div class="timeline__item"><div class="timeline__date">${U.fmtDateShort(su.date)}</div>
        <div class="timeline__body"><b>${U.escapeHtml(su.objectifs)}</b>
        <p class="muted">${U.escapeHtml(su.commentaire || "")}</p>
        ${ui.badge(su.progression, "blue")}</div></div>`).join("") : ui.emptyState("Aucun suivi de séance.");

    const html = `
      <div class="detail-head card">
        <div class="cell-user cell-user--lg">${ui.avatar(s.nom, "avatar--lg")}
          <div><h2>${U.escapeHtml(s.nom)}</h2>
            <div class="muted">${U.escapeHtml(entName(s.entrepriseId))} · ${U.escapeHtml(s.profil)}</div>
            <div class="tags">${ui.badge(s.langue, "blue")} ${ui.levelChip(s.niveauInitial)} → ${ui.levelChip(s.niveauVise)} ${ui.statut(s.statut)}</div>
          </div></div>
        <div class="detail-head__meta">
          <div><span class="muted">Formateur</span><br><b>${U.escapeHtml(forName(s.formateurId))}</b></div>
          <div><span class="muted">Heures</span><br><b>${s.heuresRealisees} / ${s.volumeHeures}h</b></div>
          <div><span class="muted">Modalité</span><br><b>${U.escapeHtml(s.modalite)}</b></div>
        </div>
      </div>

      <div class="grid grid--2">
        <div class="card"><h3 class="card__title">Programme de formation</h3>
          <p class="muted">${U.escapeHtml(s.objectif || "")}</p>
          ${prog ? `<ul class="checklist">${modulesHtml}</ul>${ui.progress(prog.modules.filter((m) => m.fait).length / Math.max(1, prog.modules.length), true)}` : ui.emptyState("Aucun programme défini.")}
        </div>
        <div class="card"><h3 class="card__title">Auto-évaluation</h3>
          ${ae ? `<p class="muted">Réalisée le ${U.fmtDate(ae.date)}</p>
            <p>Niveau perçu : ${ui.levelChip(ae.niveauPercu)}</p>
            <p><b>Besoins :</b> ${U.escapeHtml(ae.besoins)}</p>
            <p><b>Objectifs :</b> ${U.escapeHtml(ae.objectifs)}</p>` : ui.emptyState("Aucune auto-évaluation.")}
        </div>
      </div>

      <div class="grid grid--2">
        <div class="card"><h3 class="card__title">Séances</h3>${seancesHtml}</div>
        <div class="card"><h3 class="card__title">Cahier d'animation (derniers suivis)</h3><div class="timeline">${suivisHtml}</div></div>
      </div>

      <div class="card">
        <h3 class="card__title">Documents QUALIOPI</h3>
        <div class="doc-actions">
          <button class="btn btn--ghost" data-doc="convocation">📄 Convocation</button>
          <button class="btn btn--ghost" data-doc="emargement">📄 Feuille d'émargement</button>
          <button class="btn btn--ghost" data-doc="programme">📄 Programme de formation</button>
          ${cert ? `<button class="btn btn--ghost" data-doc="certificat">📄 Certificat de réalisation</button>` : ""}
          <button class="btn btn--ghost" data-doc="attestation">📄 Attestation de fin</button>
        </div>
      </div>`;

    return {
      title: "Fiche stagiaire",
      actions: `<button class="btn btn--ghost" id="btn-back">← Retour</button>${canEdit ? actionBtn("btn-edit", "Modifier") : ""}`,
      html,
      onMount(root) {
        document.getElementById("btn-back").onclick = () => App.go("stagiaires");
        const e = document.getElementById("btn-edit");
        if (e) e.onclick = () => editStagiaireModal(id);
        root.querySelectorAll("[data-doc]").forEach((b) => b.onclick = () => App.docs.generate(b.getAttribute("data-doc"), s));
      },
    };
  };

  /* =====================================================================
   *  FORMATEURS
   * ===================================================================== */
  App.views.formateurs = function () {
    const formateurs = store.all("formateurs");
    const stagiaires = store.all("stagiaires");
    const seances = store.all("seances");

    const rows = ui.table([
      { label: "Formateur", render: (f) => `<div class="cell-user">${ui.avatar(f.name)}<div><b>${U.escapeHtml(f.name)}</b><div class="muted">${U.escapeHtml(f.email)}</div></div></div>` },
      { label: "Langue", render: (f) => ui.badge(f.langue, "blue") },
      { label: "Spécialité", render: (f) => `<span class="muted">${U.escapeHtml(f.specialite)}</span>` },
      { label: "Disponibilités", render: (f) => (f.disponibilites || []).map((d) => ui.badge(d, "gray")).join(" ") },
      { label: "Stagiaires", render: (f) => stagiaires.filter((s) => s.formateurId === f.id && s.statut === "en_cours").length },
      { label: "Séances à venir", render: (f) => seances.filter((s) => s.formateurId === f.id && s.statut === "planifiee" && s.date >= U.todayISO()).length },
      { label: "", render: (f) => `<button class="btn btn--ghost btn--sm" data-edit="${f.id}">Modifier</button>` },
    ], formateurs, { empty: "Aucun formateur." });

    return {
      title: "Formateurs",
      subtitle: `${formateurs.length} intervenant(s)`,
      actions: actionBtn("btn-add-formateur", "+ Nouveau formateur"),
      html: rows,
      onMount(root) {
        document.getElementById("btn-add-formateur").onclick = () => editFormateurModal(null);
        root.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => editFormateurModal(b.getAttribute("data-edit")));
      },
    };
  };

  function editFormateurModal(id) {
    const f = id ? formateur(id) : {};
    const langues = ["Anglais", "Allemand", "Espagnol", "Italien", "Français (FLE)"];
    const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
    const dispo = f.disponibilites || [];
    ui.modal({
      title: id ? "Modifier le formateur" : "Nouveau formateur", size: "md",
      body: `<form id="frm" class="form-grid">
        <label>Nom complet<input class="input" name="name" required value="${U.escapeHtml(f.name || "")}"></label>
        <label>E-mail<input class="input" type="email" name="email" value="${U.escapeHtml(f.email || "")}"></label>
        <label>Langue enseignée<select class="input" name="langue">${langues.map((l) => `<option ${f.langue === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Spécialité<input class="input" name="specialite" value="${U.escapeHtml(f.specialite || "")}"></label>
        <label class="full">Disponibilités<div class="chips-input">${jours.map((j) => `<label class="chip-check"><input type="checkbox" name="jour" value="${j}" ${dispo.includes(j) ? "checked" : ""}> ${j}</label>`).join("")}</div></label>
      </form>`,
      actions: [
        { label: "Annuler", kind: "ghost" },
        { label: id ? "Enregistrer" : "Créer", kind: "primary", onClick: (root) => {
          const fm = root.querySelector("#frm");
          if (!fm.name.value.trim()) { ui.toast("Le nom est requis.", "error"); return false; }
          const data = {
            name: fm.name.value.trim(), email: fm.email.value.trim(), langue: fm.langue.value,
            specialite: fm.specialite.value, statut: "actif", natif: true,
            disponibilites: [...fm.querySelectorAll('[name="jour"]:checked')].map((c) => c.value),
          };
          if (id) { store.update("formateurs", id, data); }
          else { const nf = store.insert("formateurs", data); store.insert("users", { role: "formateur", name: data.name, email: data.email || U.uid("f") + "@aslearning.fr", password: "demo", linkId: nf.id }); }
          store.log(id ? "Modification formateur" : "Création formateur", data.name);
          ui.toast("Formateur enregistré."); App.render();
        } },
      ],
    });
  }

  /* =====================================================================
   *  ENTREPRISES CLIENTES
   * ===================================================================== */
  App.views.entreprises = function () {
    const entreprises = store.all("entreprises");
    const stagiaires = store.all("stagiaires");
    const rows = ui.table([
      { label: "Entreprise", render: (e) => `<b>${U.escapeHtml(e.nom)}</b>` },
      { label: "Ville", render: (e) => U.escapeHtml(e.ville || "—") },
      { label: "Secteur", render: (e) => U.escapeHtml(e.secteur || "—") },
      { label: "Contact", render: (e) => `${U.escapeHtml(e.contact || "—")}<div class="muted">${U.escapeHtml(e.email || "")}</div>` },
      { label: "Stagiaires", render: (e) => stagiaires.filter((s) => s.entrepriseId === e.id).length },
      { label: "", render: (e) => `<button class="btn btn--ghost btn--sm" data-edit="${e.id}">Modifier</button>` },
    ], entreprises, { empty: "Aucune entreprise." });

    return {
      title: "Entreprises clientes",
      subtitle: `${entreprises.length} client(s)`,
      actions: actionBtn("btn-add-ent", "+ Nouvelle entreprise"),
      html: rows,
      onMount(root) {
        document.getElementById("btn-add-ent").onclick = () => editEntrepriseModal(null);
        root.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => editEntrepriseModal(b.getAttribute("data-edit")));
      },
    };
  };

  function editEntrepriseModal(id) {
    const e = id ? ent(id) : {};
    ui.modal({
      title: id ? "Modifier l'entreprise" : "Nouvelle entreprise", size: "md",
      body: `<form id="frm" class="form-grid">
        <label class="full">Raison sociale<input class="input" name="nom" required value="${U.escapeHtml(e.nom || "")}"></label>
        <label>Ville<input class="input" name="ville" value="${U.escapeHtml(e.ville || "")}"></label>
        <label>Secteur<input class="input" name="secteur" value="${U.escapeHtml(e.secteur || "")}"></label>
        <label>Contact (nom)<input class="input" name="contact" value="${U.escapeHtml(e.contact || "")}"></label>
        <label>E-mail<input class="input" type="email" name="email" value="${U.escapeHtml(e.email || "")}"></label>
        <label>Téléphone<input class="input" name="telephone" value="${U.escapeHtml(e.telephone || "")}"></label>
      </form>`,
      actions: [
        { label: "Annuler", kind: "ghost" },
        { label: id ? "Enregistrer" : "Créer", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          if (!f.nom.value.trim()) { ui.toast("La raison sociale est requise.", "error"); return false; }
          const data = { nom: f.nom.value.trim(), ville: f.ville.value, secteur: f.secteur.value, contact: f.contact.value, email: f.email.value, telephone: f.telephone.value };
          if (id) store.update("entreprises", id, data); else store.insert("entreprises", data);
          store.log(id ? "Modification entreprise" : "Création entreprise", data.nom);
          ui.toast("Entreprise enregistrée."); App.render();
        } },
      ],
    });
  }

  /* =====================================================================
   *  SUPPORTS PÉDAGOGIQUES
   * ===================================================================== */
  App.views.supports = function () {
    let supports = store.all("supports");
    const scopedStag = auth.scopeStagiaires(store.all("stagiaires")).map((s) => s.id);
    if (!auth.is("admin")) supports = supports.filter((x) => scopedStag.includes(x.stagiaireId));
    const canUpload = auth.is("admin") || auth.is("formateur");

    const rows = ui.table([
      { label: "Fichier", render: (x) => `<b>${U.escapeHtml(x.nom)}</b>` },
      { label: "Type", render: (x) => ui.badge(x.type, "blue") },
      { label: "Stagiaire", render: (x) => U.escapeHtml(staName(x.stagiaireId)) },
      { label: "Ajouté par", render: (x) => U.escapeHtml(x.ajoutePar) },
      { label: "Date", render: (x) => U.fmtDateShort(x.date) },
      { label: "", render: (x) => x.dataUrl ? `<a class="btn btn--ghost btn--sm" href="${x.dataUrl}" download="${U.escapeHtml(x.nom)}">Télécharger</a>` : `<span class="muted">démo</span>` },
    ], supports, { empty: "Aucun support déposé." });

    return {
      title: "Supports pédagogiques",
      subtitle: `${supports.length} ressource(s)`,
      actions: canUpload ? actionBtn("btn-upload", "+ Déposer un support") : "",
      html: rows,
      onMount(root) {
        const b = document.getElementById("btn-upload");
        if (b) b.onclick = () => uploadSupportModal();
      },
    };
  };

  function uploadSupportModal() {
    const stagiaires = auth.scopeStagiaires(store.all("stagiaires"));
    ui.modal({
      title: "Déposer un support", size: "md",
      body: `<form id="frm" class="form-grid">
        <label class="full">Stagiaire concerné<select class="input" name="stagiaireId">${stagiaires.map((s) => `<option value="${s.id}">${U.escapeHtml(s.nom)} (${s.langue})</option>`).join("")}</select></label>
        <label class="full">Fichier (PDF, audio, vidéo…)<input class="input" type="file" name="file"></label>
        <label class="full">Note<input class="input" name="note" placeholder="Module associé, consignes…"></label>
        <p class="muted full">Les fichiers volumineux ne sont pas stockés intégralement dans ce prototype (limite navigateur).</p>
      </form>`,
      actions: [
        { label: "Annuler", kind: "ghost" },
        { label: "Déposer", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          const file = f.file.files[0];
          if (!file) { ui.toast("Sélectionnez un fichier.", "error"); return false; }
          const ext = file.name.split(".").pop().toLowerCase();
          const type = ["mp3", "wav", "m4a"].includes(ext) ? "Audio" : ["mp4", "mov"].includes(ext) ? "Vidéo" : ext === "pdf" ? "PDF" : "Fichier";
          const finalize = (dataUrl) => {
            store.insert("supports", { stagiaireId: f.stagiaireId.value, nom: file.name, type, ajoutePar: auth.current().name, date: U.todayISO(), note: f.note.value, dataUrl });
            store.log("Dépôt support", file.name); ui.toast("Support déposé."); App.render();
          };
          if (file.size < 600000) { const r = new FileReader(); r.onload = () => finalize(r.result); r.readAsDataURL(file); }
          else finalize(null);
        } },
      ],
    });
  }
})();
