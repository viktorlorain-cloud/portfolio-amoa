/* =========================================================================
 *  AS Learning — LMS  ·  views_drive.js
 *  Espace « Drive » : bibliothèque de documents organisée en dossiers
 *  (Entreprise → Stagiaire → documents) centralisant toutes les données.
 * ========================================================================= */
window.App = window.App || {};
App.views = App.views || {};

(function () {
  "use strict";
  const U = App.utils, ui = App.ui, store = App.store, auth = App.auth;

  const ent = (id) => store.find("entreprises", id);
  const stagiaire = (id) => store.find("stagiaires", id);
  const forName = (id) => { const f = store.find("formateurs", id); return f ? f.name : "—"; };

  // Documents "vivants" disponibles pour un stagiaire (générés à la demande)
  function docEntriesFor(s) {
    const has = (coll) => store.where(coll, (x) => x.stagiaireId === s.id).length > 0;
    const list = [];
    if (has("programmes")) list.push({ kind: "doc", docType: "programme", name: "Programme de formation.pdf", icon: "📄" });
    if (has("autoEvaluations")) list.push({ kind: "doc", docType: "autoeval", name: "Fiche d'auto-évaluation.pdf", icon: "📝" });
    list.push({ kind: "doc", docType: "convocation", name: "Convocation.pdf", icon: "📄" });
    list.push({ kind: "doc", docType: "emargement", name: "Feuille d'émargement.pdf", icon: "✍" });
    if (has("certificats")) list.push({ kind: "doc", docType: "certificat", name: "Certificat de réalisation.pdf", icon: "🎖" });
    list.push({ kind: "doc", docType: "attestation", name: "Attestation de fin.pdf", icon: "📄" });
    return list;
  }

  function fileIcon(type) {
    return { PDF: "📄", Audio: "🎵", Vidéo: "🎬", Fichier: "📎" }[type] || "📎";
  }

  // Nombre de documents (vivants + déposés) pour un stagiaire
  function docCount(s) {
    return docEntriesFor(s).length + store.where("supports", (x) => x.stagiaireId === s.id).length;
  }

  App.views.drive = function () {
    const st = App.views.drive._state || (App.views.drive._state = { path: [], q: "" });
    const isStag = auth.is("stagiaire");
    const scopedStag = auth.scopeStagiaires(store.all("stagiaires"));

    // Le stagiaire reste cantonné à son propre dossier
    if (isStag) st.path = [{ type: "sta", id: auth.current().linkId }];

    let level = "root", body = "", titlePath = ["Drive"];

    // ---- Construction du contenu selon le chemin courant ----
    let folders = [], files = [], stagiaireCtx = null, uploadFor = null, isExports = false;

    if (st.path.length === 0) {
      // Racine : dossiers Entreprises (qui ont des stagiaires dans le périmètre) + Exports
      const byEnt = U.groupBy(scopedStag, (s) => s.entrepriseId);
      folders = Object.keys(byEnt).map((entId) => {
        const e = ent(entId);
        return { type: "ent", id: entId, label: e ? e.nom : "Sans entreprise", sub: byEnt[entId].length + " stagiaire(s)", icon: "🏢" };
      }).sort((a, b) => a.label.localeCompare(b.label));
      if (auth.is("admin")) folders.push({ type: "exports", id: "_exports", label: "Exports & rapports", sub: "Registres QUALIOPI", icon: "📊" });
    } else if (st.path[0].type === "exports") {
      isExports = true;
      titlePath.push("Exports & rapports");
    } else if (st.path[0].type === "ent" && st.path.length === 1) {
      const e = ent(st.path[0].id);
      titlePath.push(e ? e.nom : "Entreprise");
      folders = scopedStag.filter((s) => s.entrepriseId === st.path[0].id).map((s) => ({
        type: "sta", id: s.id, label: s.nom, sub: s.langue + " · " + docCount(s) + " doc.", icon: "👤",
      }));
    } else {
      // Dossier stagiaire (depuis entreprise ou accès direct stagiaire)
      const sid = st.path[st.path.length - 1].id;
      stagiaireCtx = stagiaire(sid);
      if (stagiaireCtx) {
        if (!isStag) { const e = ent(stagiaireCtx.entrepriseId); titlePath.push(e ? e.nom : "Entreprise"); }
        titlePath.push(stagiaireCtx.nom);
        uploadFor = stagiaireCtx.id;
        files = docEntriesFor(stagiaireCtx)
          .concat(store.where("supports", (x) => x.stagiaireId === stagiaireCtx.id).map((sp) => ({ kind: "support", id: sp.id, name: sp.nom, icon: fileIcon(sp.type), sub: "déposé par " + sp.ajoutePar })));
      }
    }

    // ---- Filtre recherche ----
    const q = (st.q || "").toLowerCase();
    if (q) {
      folders = folders.filter((f) => f.label.toLowerCase().includes(q));
      files = files.filter((f) => f.name.toLowerCase().includes(q));
    }

    // ---- Fil d'Ariane ----
    const crumbs = ['<span class="crumb" data-go="0">🗂 Drive</span>'];
    st.path.forEach((p, i) => {
      let lbl = p.label;
      if (p.type === "ent") { const e = ent(p.id); lbl = e ? e.nom : "Entreprise"; }
      if (p.type === "sta") { const s = stagiaire(p.id); lbl = s ? s.nom : "Stagiaire"; }
      if (p.type === "exports") lbl = "Exports & rapports";
      crumbs.push(`<span class="crumb__sep">›</span><span class="crumb" data-go="${i + 1}">${U.escapeHtml(lbl)}</span>`);
    });
    const breadcrumb = isStag ? `<div class="drive-crumbs"><span class="crumb">🗂 Mes documents</span></div>` :
      `<div class="drive-crumbs">${crumbs.join("")}</div>`;

    // ---- Grille des éléments ----
    let grid;
    if (isExports) {
      const exports = [
        { id: "stag", name: "Liste des stagiaires.csv", icon: "📊", sub: "Export Excel" },
        { id: "ema", name: "Registre des émargements.csv", icon: "📊", sub: "Preuve d'assiduité" },
        { id: "seances", name: "Planning des séances.csv", icon: "📊", sub: "Toutes les séances" },
        { id: "autoeval", name: "Récap auto-évaluations.csv", icon: "📊", sub: "Toutes les fiches" },
        { id: "bilan", name: "Bilan d'activité.pdf", icon: "📄", sub: "Synthèse QUALIOPI" },
      ];
      grid = `<div class="drive-grid">${exports.map((e) =>
        `<div class="drive-item" data-export="${e.id}"><div class="drive-item__ico">${e.icon}</div><div class="drive-item__name">${U.escapeHtml(e.name)}</div><div class="drive-item__sub">${e.sub}</div></div>`).join("")}</div>`;
    } else {
      const folderCards = folders.map((f) =>
        `<div class="drive-item drive-item--folder" data-folder="${f.type}:${f.id}"><div class="drive-item__ico">${f.icon || "📁"}</div><div class="drive-item__name">${U.escapeHtml(f.label)}</div><div class="drive-item__sub">${U.escapeHtml(f.sub || "")}</div></div>`).join("");
      const fileCards = files.map((f) => {
        const attr = f.kind === "support" ? `data-support="${f.id}"` : `data-doc="${f.docType}"`;
        return `<div class="drive-item" ${attr}><div class="drive-item__ico">${f.icon}</div><div class="drive-item__name">${U.escapeHtml(f.name)}</div><div class="drive-item__sub">${U.escapeHtml(f.sub || "Ouvrir / générer")}</div></div>`;
      }).join("");
      const inner = folderCards + fileCards;
      grid = inner ? `<div class="drive-grid">${inner}</div>` : ui.emptyState(q ? "Aucun résultat." : "Dossier vide.", "🗂");
    }

    // ---- KPIs racine ----
    const totalDocs = scopedStag.reduce((a, s) => a + docCount(s), 0);
    const kpiBar = st.path.length === 0 && !isStag ?
      `<div class="drive-stats"><span>🏢 ${new Set(scopedStag.map((s) => s.entrepriseId)).size} entreprise(s)</span><span>👤 ${scopedStag.length} stagiaire(s)</span><span>📄 ${totalDocs} document(s)</span></div>` : "";

    const toolbar = `<div class="drive-toolbar">
      ${breadcrumb}
      <div class="drive-toolbar__actions">
        <input class="input input--sm" id="drive-search" placeholder="Rechercher…" value="${U.escapeHtml(st.q || "")}">
        ${uploadFor && (auth.is("admin") || auth.is("formateur")) ? `<button class="btn btn--primary btn--sm" id="drive-upload">⬆ Téléverser</button>` : ""}
      </div>
    </div>`;

    return {
      title: "Drive — Espace documents",
      subtitle: "Tous les documents et données, organisés et centralisés",
      html: kpiBar + toolbar + grid,
      onMount(root) {
        // navigation dossiers
        root.querySelectorAll("[data-folder]").forEach((c) => c.onclick = () => {
          const [type, id] = c.getAttribute("data-folder").split(":");
          st.path.push({ type, id }); st.q = ""; App.render();
        });
        // fil d'Ariane
        root.querySelectorAll("[data-go]").forEach((c) => c.onclick = () => {
          st.path = st.path.slice(0, Number(c.getAttribute("data-go"))); st.q = ""; App.render();
        });
        // documents générés
        root.querySelectorAll("[data-doc]").forEach((c) => c.onclick = () => App.docs.generate(c.getAttribute("data-doc"), stagiaireCtx));
        // supports déposés
        root.querySelectorAll("[data-support]").forEach((c) => c.onclick = () => openSupport(c.getAttribute("data-support")));
        // exports
        root.querySelectorAll("[data-export]").forEach((c) => c.onclick = () => runExport(c.getAttribute("data-export")));
        // recherche
        const s = root.querySelector("#drive-search");
        if (s) { s.oninput = (e) => { st.q = e.target.value; App.render(); }; if (st.q) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }
        // téléversement
        const up = root.querySelector("#drive-upload");
        if (up) up.onclick = () => driveUpload(uploadFor);
      },
    };
  };

  function openSupport(id) {
    const sp = store.find("supports", id);
    if (!sp) return;
    if (sp.dataUrl) { U.download(sp.nom, dataURLtoBlob(sp.dataUrl)); ui.toast("Téléchargement du fichier."); }
    else ui.modal({ title: sp.nom, size: "sm", body: `<p class="muted">${U.escapeHtml(sp.note || "Aucun aperçu disponible (fichier de démonstration).")}</p><p>Type : ${sp.type}<br>Déposé par : ${U.escapeHtml(sp.ajoutePar)}<br>Date : ${U.fmtDate(sp.date)}</p>`, actions: [{ label: "Fermer", kind: "primary" }] });
  }

  function dataURLtoBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(",");
    const mime = (meta.match(/:(.*?);/) || [])[1] || "application/octet-stream";
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function driveUpload(stagiaireId) {
    const s = stagiaire(stagiaireId);
    ui.modal({
      title: "Téléverser dans le dossier de " + (s ? s.nom : ""), size: "md",
      body: `<form id="frm" class="form-grid">
        <label class="full">Fichier (PDF, audio, vidéo…)<input class="input" type="file" name="file"></label>
        <label class="full">Note / catégorie<input class="input" name="note" placeholder="Ex : support de cours, justificatif…"></label>
        <p class="muted full">Les fichiers de plus de ~600 Ko ne sont pas stockés intégralement (limite navigateur du prototype).</p>
      </form>`,
      actions: [
        { label: "Annuler", kind: "ghost" },
        { label: "Téléverser", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          const file = f.file.files[0];
          if (!file) { ui.toast("Sélectionnez un fichier.", "error"); return false; }
          const ext = file.name.split(".").pop().toLowerCase();
          const type = ["mp3", "wav", "m4a"].includes(ext) ? "Audio" : ["mp4", "mov"].includes(ext) ? "Vidéo" : ext === "pdf" ? "PDF" : "Fichier";
          const finalize = (dataUrl) => {
            store.insert("supports", { stagiaireId, nom: file.name, type, ajoutePar: auth.current().name, date: U.todayISO(), note: f.note.value, dataUrl });
            store.log("Dépôt fichier (Drive)", file.name); ui.toast("Fichier ajouté au Drive."); App.render();
          };
          if (file.size < 600000) { const r = new FileReader(); r.onload = () => finalize(r.result); r.readAsDataURL(file); }
          else finalize(null);
        } },
      ],
    });
  }

  function runExport(id) {
    const sname = (sid) => { const s = stagiaire(sid); return s ? s.nom : ""; };
    const entName = (eid) => { const e = ent(eid); return e ? e.nom : ""; };
    if (id === "stag") {
      const data = [["Nom", "Entreprise", "Langue", "Niveau initial", "Niveau visé", "Formateur", "Heures réalisées", "Volume", "Statut"]];
      store.all("stagiaires").forEach((s) => data.push([s.nom, entName(s.entrepriseId), s.langue, s.niveauInitial, s.niveauVise, forName(s.formateurId), s.heuresRealisees, s.volumeHeures, s.statut]));
      U.exportCSV("qualiopi_stagiaires.csv", data);
    } else if (id === "ema") {
      const data = [["Date", "Stagiaire", "Formateur", "Signé stagiaire", "Signé formateur", "Horodatage"]];
      store.all("emargements").forEach((e) => data.push([e.date, sname(e.stagiaireId), forName(e.formateurId), e.signeStagiaire ? "Oui" : "Non", e.signeFormateur ? "Oui" : "Non", e.tsStagiaire || ""]));
      U.exportCSV("qualiopi_emargements.csv", data);
    } else if (id === "seances") {
      const data = [["Date", "Début", "Fin", "Stagiaire", "Formateur", "Modalité", "Thème", "Statut"]];
      store.all("seances").forEach((s) => data.push([s.date, s.debut, s.fin, sname(s.stagiaireId), forName(s.formateurId), s.modalite, s.theme, s.statut]));
      U.exportCSV("planning_seances.csv", data);
    } else if (id === "autoeval") {
      const comps = [["comprehensionOrale", "Compréhension orale"], ["expressionOrale", "Expression orale"], ["comprehensionEcrite", "Compréhension écrite"], ["expressionEcrite", "Expression écrite"]];
      const data = [["Stagiaire", "Langue", "Date", "Niveau perçu", ...comps.map((c) => c[1]), "Fréquence", "Besoins", "Objectifs"]];
      store.all("stagiaires").forEach((s) => { const a = store.where("autoEvaluations", (x) => x.stagiaireId === s.id)[0]; const rep = (a && a.reponses) || {}; data.push([s.nom, s.langue, a ? U.fmtDateShort(a.date) : "", a ? a.niveauPercu : "", ...comps.map((c) => a ? (rep[c[0]] || "") : ""), a ? (rep.frequenceUsage || "") : "", a ? a.besoins : "", a ? a.objectifs : ""]); });
      U.exportCSV("auto_evaluations.csv", data);
    } else if (id === "bilan") {
      const stagiaires = store.all("stagiaires");
      const body = `<div class="doc-head"><div><span class="brand">AS Learning</span><div class="muted">QUALIOPI</div></div><div class="muted">${U.fmtDate(U.todayISO())}</div></div>
        <h1>Bilan d'activité</h1>
        <table><tr><th>Nom</th><th>Entreprise</th><th>Langue</th><th>Heures</th><th>Statut</th></tr>
        ${stagiaires.map((s) => `<tr><td>${U.escapeHtml(s.nom)}</td><td>${U.escapeHtml(entName(s.entrepriseId))}</td><td>${s.langue}</td><td>${s.heuresRealisees}/${s.volumeHeures}h</td><td>${s.statut}</td></tr>`).join("")}</table>`;
      U.printDocument("Bilan d'activité — AS Learning", body);
      store.log("Export depuis Drive", "Bilan d'activité"); return;
    }
    store.log("Export depuis Drive", id);
    ui.toast("Export généré.");
  }
})();
