/* =========================================================================
 *  AS Learning — LMS  ·  views_sessions.js
 *  Vues : calendrier (assignation des interventions), émargement, cahier
 *  d'animation (suivi de séance).
 * ========================================================================= */
window.App = window.App || {};
App.views = App.views || {};

(function () {
  "use strict";
  const U = App.utils, ui = App.ui, store = App.store, auth = App.auth;

  const formateur = (id) => store.find("formateurs", id);
  const stagiaire = (id) => store.find("stagiaires", id);
  const forName = (id) => { const f = formateur(id); return f ? f.name : "—"; };
  const staName = (id) => { const s = stagiaire(id); return s ? s.nom : "—"; };

  // Couleur stable par formateur (pour les pastilles du calendrier)
  const PALETTE = ["#1d3a8a", "#0d9488", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#4d7c0f", "#9d174d"];
  function colorFor(formateurId) {
    const ids = store.all("formateurs").map((f) => f.id);
    return PALETTE[Math.max(0, ids.indexOf(formateurId)) % PALETTE.length];
  }

  /* =====================================================================
   *  CALENDRIER — assignation des interventions des formateurs
   * ===================================================================== */
  App.views.calendrier = function () {
    const st = App.views.calendrier._state || (App.views.calendrier._state = (() => {
      const d = new Date(); return { y: d.getFullYear(), m: d.getMonth(), formateurId: "" };
    })());

    const canPlan = auth.is("admin") || auth.is("formateur");
    let seances = auth.scopeSeances(store.all("seances"));
    if (st.formateurId) seances = seances.filter((s) => s.formateurId === st.formateurId);

    // Construction de la grille du mois
    const first = new Date(st.y, st.m, 1);
    const startDay = (first.getDay() + 6) % 7; // lundi = 0
    const daysInMonth = new Date(st.y, st.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    const byDate = U.groupBy(seances, (s) => s.date);
    const todayIso = U.todayISO();

    const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const grid = cells.map((d) => {
      if (!d) return `<div class="cal__cell cal__cell--empty"></div>`;
      const iso = `${st.y}-${String(st.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const items = (byDate[iso] || []).sort((a, b) => a.debut.localeCompare(b.debut));
      const chips = items.map((s) =>
        `<div class="cal__chip ${s.statut === "annulee" ? "is-cancel" : ""}" data-sea="${s.id}" style="--c:${colorFor(s.formateurId)}" title="${U.escapeHtml(staName(s.stagiaireId) + " · " + forName(s.formateurId))}">
          <span class="cal__chip-time">${s.debut}</span> ${U.escapeHtml(staName(s.stagiaireId).split(" ")[0])}</div>`).join("");
      return `<div class="cal__cell ${iso === todayIso ? "is-today" : ""}" data-day="${iso}">
        <div class="cal__date">${d}</div><div class="cal__items">${chips}</div></div>`;
    }).join("");

    const formateurs = store.all("formateurs");
    const filter = auth.is("admin") ? `<select class="input input--sm" id="cal-formateur"><option value="">Tous les formateurs</option>${formateurs.map((f) => `<option value="${f.id}" ${st.formateurId === f.id ? "selected" : ""}>${U.escapeHtml(f.name)}</option>`).join("")}</select>` : "";

    const legend = formateurs.filter((f) => !st.formateurId || f.id === st.formateurId).map((f) =>
      `<span class="legend__item"><span class="legend__dot" style="background:${colorFor(f.id)}"></span>${U.escapeHtml(f.name)}</span>`).join("");

    const html = `
      <div class="cal-toolbar">
        <div class="cal-nav">
          <button class="btn btn--ghost btn--sm" id="cal-prev">‹</button>
          <button class="btn btn--ghost btn--sm" id="cal-today">Aujourd'hui</button>
          <button class="btn btn--ghost btn--sm" id="cal-next">›</button>
          <h3 class="cal-month">${U.MOIS[st.m]} ${st.y}</h3>
        </div>
        <div class="inline">${filter}</div>
      </div>
      <div class="cal">
        <div class="cal__head">${weekDays.map((w) => `<div>${w}</div>`).join("")}</div>
        <div class="cal__grid">${grid}</div>
      </div>
      <div class="legend">${legend}</div>`;

    return {
      title: "Calendrier des interventions",
      subtitle: "Planification et assignation des formateurs",
      actions: canPlan ? `<button class="btn btn--primary" id="btn-plan">+ Planifier une intervention</button>` : "",
      html,
      onMount(root) {
        document.getElementById("cal-prev").onclick = () => { st.m--; if (st.m < 0) { st.m = 11; st.y--; } App.render(); };
        document.getElementById("cal-next").onclick = () => { st.m++; if (st.m > 11) { st.m = 0; st.y++; } App.render(); };
        document.getElementById("cal-today").onclick = () => { const d = new Date(); st.y = d.getFullYear(); st.m = d.getMonth(); App.render(); };
        const cf = document.getElementById("cal-formateur");
        if (cf) cf.onchange = (e) => { st.formateurId = e.target.value; App.render(); };
        const plan = document.getElementById("btn-plan");
        if (plan) plan.onclick = () => seanceModal(null, null);
        root.querySelectorAll("[data-sea]").forEach((c) => c.onclick = (e) => { e.stopPropagation(); seanceModal(c.getAttribute("data-sea")); });
        if (canPlan) root.querySelectorAll("[data-day]").forEach((c) => c.onclick = () => seanceModal(null, c.getAttribute("data-day")));
      },
    };
  };

  // Détection de conflit : même formateur, même jour, créneaux qui se chevauchent
  function conflictFor(formateurId, date, debut, fin, ignoreId) {
    return store.where("seances", (s) => s.formateurId === formateurId && s.date === date && s.id !== ignoreId && s.statut !== "annulee")
      .find((s) => U.overlaps(debut, fin, s.debut, s.fin));
  }

  function seanceModal(seanceId, presetDate) {
    const editing = !!seanceId;
    const s = editing ? store.find("seances", seanceId) : { date: presetDate || U.todayISO(), debut: "09:00", fin: "11:00", modalite: "Visioconférence", statut: "planifiee" };
    const stagiaires = auth.scopeStagiaires(store.all("stagiaires")).filter((x) => x.statut === "en_cours");
    const formateurs = store.all("formateurs");
    const restrictFormateur = auth.is("formateur");

    ui.modal({
      title: editing ? "Séance / intervention" : "Planifier une intervention", size: "md",
      body: `<form id="frm" class="form-grid">
        <label class="full">Stagiaire<select class="input" name="stagiaireId" id="sea-sta">${stagiaires.map((x) => `<option value="${x.id}" data-for="${x.formateurId}" ${s.stagiaireId === x.id ? "selected" : ""}>${U.escapeHtml(x.nom)} — ${x.langue}</option>`).join("")}</select></label>
        <label class="full">Formateur assigné<select class="input" name="formateurId" id="sea-for" ${restrictFormateur ? "disabled" : ""}>${formateurs.map((f) => `<option value="${f.id}" data-dispo="${(f.disponibilites || []).join(",")}" ${s.formateurId === f.id ? "selected" : ""}>${U.escapeHtml(f.name)} (${f.langue})</option>`).join("")}</select></label>
        <label>Date<input class="input" type="date" name="date" value="${s.date}"></label>
        <label>Modalité<select class="input" name="modalite"><option ${s.modalite === "Visioconférence" ? "selected" : ""}>Visioconférence</option><option ${s.modalite === "Présentiel" ? "selected" : ""}>Présentiel</option></select></label>
        <label>Début<input class="input" type="time" name="debut" value="${s.debut}"></label>
        <label>Fin<input class="input" type="time" name="fin" value="${s.fin}"></label>
        <label class="full">Lieu / lien<input class="input" name="lieu" value="${U.escapeHtml(s.lieu || "")}" placeholder="Visio (Teams) ou adresse"></label>
        <label class="full">Thème de la séance<input class="input" name="theme" value="${U.escapeHtml(s.theme || "")}"></label>
        ${editing ? `<label class="full">Statut<select class="input" name="statut"><option value="planifiee" ${s.statut === "planifiee" ? "selected" : ""}>Planifiée</option><option value="realisee" ${s.statut === "realisee" ? "selected" : ""}>Réalisée</option><option value="annulee" ${s.statut === "annulee" ? "selected" : ""}>Annulée</option></select></label>` : ""}
        <div class="full" id="sea-warn"></div>
      </form>`,
      onMount: (root) => {
        const staSel = root.querySelector("#sea-sta");
        const forSel = root.querySelector("#sea-for");
        const warn = root.querySelector("#sea-warn");
        const checkAvail = () => {
          if (restrictFormateur) { forSel.value = auth.current().linkId; }
          const date = root.querySelector('[name="date"]').value;
          const debut = root.querySelector('[name="debut"]').value;
          const fin = root.querySelector('[name="fin"]').value;
          const fId = forSel.value;
          let msgs = [];
          // disponibilité du formateur
          const opt = forSel.selectedOptions[0];
          const dispo = (opt.getAttribute("data-dispo") || "").split(",");
          const jourAbbr = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][new Date(date + "T00:00:00").getDay()];
          if (dispo.length && dispo[0] && !dispo.includes(jourAbbr)) msgs.push(`⚠ ${forName(fId)} n'est habituellement pas disponible le ${U.dayLabel(date).toLowerCase()}.`);
          // conflit d'horaire
          const c = conflictFor(fId, date, debut, fin, seanceId);
          if (c) msgs.push(`⛔ Conflit : ${forName(fId)} a déjà une séance ${c.debut}–${c.fin} avec ${staName(c.stagiaireId)}.`);
          warn.innerHTML = msgs.map((m) => `<div class="alert ${m.startsWith("⛔") ? "alert--err" : "alert--warn"}">${m}</div>`).join("");
        };
        // sync formateur quand on choisit un stagiaire
        if (!restrictFormateur) staSel.onchange = () => { const opt = staSel.selectedOptions[0]; const f = opt.getAttribute("data-for"); if (f) forSel.value = f; checkAvail(); };
        ["change"].forEach((ev) => root.querySelectorAll('[name="date"],[name="debut"],[name="fin"],#sea-for').forEach((el) => el.addEventListener(ev, checkAvail)));
        checkAvail();
      },
      actions: [
        editing ? { label: "Supprimer", kind: "danger", onClick: () => { ui.confirm("Supprimer cette séance ?").then((ok) => { if (ok) { store.remove("seances", seanceId); store.log("Suppression séance", staName(s.stagiaireId)); ui.toast("Séance supprimée."); App.render(); } }); return false; } } : null,
        { label: "Annuler", kind: "ghost" },
        { label: editing ? "Enregistrer" : "Planifier", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          const fId = restrictFormateur ? auth.current().linkId : f.formateurId.value;
          const date = f.date.value, debut = f.debut.value, fin = f.fin.value;
          if (U.hoursBetween(debut, fin) <= 0) { ui.toast("L'heure de fin doit suivre l'heure de début.", "error"); return false; }
          const c = conflictFor(fId, date, debut, fin, seanceId);
          if (c) { ui.toast("Conflit d'horaire : intervention impossible.", "error"); return false; }
          const data = {
            stagiaireId: f.stagiaireId.value, formateurId: fId, date, debut, fin,
            modalite: f.modalite.value, lieu: f.lieu.value, theme: f.theme.value,
            statut: editing ? f.statut.value : "planifiee",
          };
          if (editing) { store.update("seances", seanceId, data); store.log("Modification séance", staName(data.stagiaireId)); }
          else { store.insert("seances", data); store.log("Planification séance", `${staName(data.stagiaireId)} avec ${forName(fId)} le ${U.fmtDateShort(date)}`); }
          ui.toast("Intervention enregistrée."); App.render();
        } },
      ].filter(Boolean),
    });
  }
  App.views._seanceModal = seanceModal;

  /* =====================================================================
   *  ÉMARGEMENT ÉLECTRONIQUE
   * ===================================================================== */
  App.views.emargement = function () {
    let seances = auth.scopeSeances(store.all("seances")).filter((s) => s.statut !== "annulee");
    seances.sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
    const emargs = store.all("emargements");
    const getEma = (id) => emargs.find((e) => e.seanceId === id);

    const filterStag = [...new Map(seances.map((s) => [s.stagiaireId, staName(s.stagiaireId)])).entries()];
    const fstate = App.views.emargement._f || (App.views.emargement._f = { stagiaireId: "" });
    if (fstate.stagiaireId) seances = seances.filter((s) => s.stagiaireId === fstate.stagiaireId);

    const table = ui.table([
      { label: "Date", render: (s) => `${U.dayLabel(s.date)} ${U.fmtDateShort(s.date)}` },
      { label: "Horaire", render: (s) => `${s.debut}–${s.fin}` },
      { label: "Stagiaire", render: (s) => U.escapeHtml(staName(s.stagiaireId)) },
      { label: "Formateur", render: (s) => U.escapeHtml(forName(s.formateurId)) },
      { label: "Signatures", render: (s) => {
          const e = getEma(s.id);
          const ss = e && e.signeStagiaire, sf = e && e.signeFormateur;
          return `<span class="sig-pill ${ss ? "ok" : ""}">Stagiaire ${ss ? "✓" : "○"}</span> <span class="sig-pill ${sf ? "ok" : ""}">Formateur ${sf ? "✓" : "○"}</span>`;
        } },
      { label: "", render: (s) => `<button class="btn btn--ghost btn--sm" data-ema="${s.id}">${s.statut === "realisee" ? "Émarger" : "Émarger"}</button>` },
    ], seances, { empty: "Aucune séance à émarger." });

    return {
      title: "Émargement électronique",
      subtitle: "Signatures horodatées — preuve d'assiduité QUALIOPI",
      actions: `<button class="btn btn--ghost" id="btn-export-ema">Exporter feuille (PDF)</button>`,
      html: `<div class="filters">
        <select class="input" id="ema-stag"><option value="">Tous les stagiaires</option>${filterStag.map((e) => `<option value="${e[0]}" ${fstate.stagiaireId === e[0] ? "selected" : ""}>${U.escapeHtml(e[1])}</option>`).join("")}</select>
      </div>${table}`,
      onMount(root) {
        root.querySelector("#ema-stag").onchange = (e) => { fstate.stagiaireId = e.target.value; App.render(); };
        root.querySelectorAll("[data-ema]").forEach((b) => b.onclick = () => emargementModal(b.getAttribute("data-ema")));
        document.getElementById("btn-export-ema").onclick = () => {
          if (!fstate.stagiaireId) { ui.toast("Sélectionnez un stagiaire pour générer sa feuille d'émargement.", "warn"); return; }
          App.docs.generate("emargement", stagiaire(fstate.stagiaireId));
        };
      },
    };
  };

  function emargementModal(seanceId) {
    const s = store.find("seances", seanceId);
    let e = store.where("emargements", (x) => x.seanceId === seanceId)[0];
    const role = auth.role();
    const canStag = role === "admin" || role === "stagiaire";
    const canFor = role === "admin" || role === "formateur";

    ui.modal({
      title: "Émargement de séance", size: "md",
      body: `<div class="ema">
        <div class="ema__info">
          <div><b>${U.escapeHtml(staName(s.stagiaireId))}</b> · ${U.escapeHtml(forName(s.formateurId))}</div>
          <div class="muted">${U.dayLabel(s.date)} ${U.fmtDate(s.date)} · ${s.debut}–${s.fin} · ${U.escapeHtml(s.modalite)}</div>
        </div>
        <div class="sign-grid">
          <div class="sign-col">
            <label>Signature du stagiaire</label>
            ${e && e.sigStagiaire ? `<img class="sign-existing" src="${e.sigStagiaire}"><div class="muted small">Signé le ${e.tsStagiaire ? U.fmtDateTime(e.tsStagiaire.slice(0, 10), e.tsStagiaire.slice(11, 16)) : ""}</div>`
              : canStag ? `<canvas class="sign-pad" id="pad-stag" width="320" height="120"></canvas><button class="btn btn--ghost btn--sm" id="clr-stag">Effacer</button>` : `<div class="muted">En attente</div>`}
          </div>
          <div class="sign-col">
            <label>Signature du formateur</label>
            ${e && e.sigFormateur ? `<img class="sign-existing" src="${e.sigFormateur}"><div class="muted small">Signé le ${e.tsFormateur ? U.fmtDateTime(e.tsFormateur.slice(0, 10), e.tsFormateur.slice(11, 16)) : ""}</div>`
              : canFor ? `<canvas class="sign-pad" id="pad-for" width="320" height="120"></canvas><button class="btn btn--ghost btn--sm" id="clr-for">Effacer</button>` : `<div class="muted">En attente</div>`}
          </div>
        </div>
        <p class="muted small">L'horodatage est enregistré automatiquement à la validation (traçabilité QUALIOPI).</p>
      </div>`,
      onMount: (root) => {
        const padStagEl = root.querySelector("#pad-stag");
        const padForEl = root.querySelector("#pad-for");
        root._padStag = padStagEl ? ui.attachSignaturePad(padStagEl) : null;
        root._padFor = padForEl ? ui.attachSignaturePad(padForEl) : null;
        const cs = root.querySelector("#clr-stag"); if (cs) cs.onclick = () => root._padStag.clear();
        const cf = root.querySelector("#clr-for"); if (cf) cf.onclick = () => root._padFor.clear();
      },
      actions: [
        { label: "Fermer", kind: "ghost" },
        { label: "Valider la signature", kind: "primary", onClick: (root) => {
          const now = new Date().toISOString();
          if (!e) e = store.insert("emargements", { seanceId, stagiaireId: s.stagiaireId, formateurId: s.formateurId, date: s.date, signeStagiaire: false, signeFormateur: false });
          const patch = {};
          if (root._padStag && !root._padStag.isEmpty()) { patch.sigStagiaire = root._padStag.dataURL(); patch.signeStagiaire = true; patch.tsStagiaire = now; }
          if (root._padFor && !root._padFor.isEmpty()) { patch.sigFormateur = root._padFor.dataURL(); patch.signeFormateur = true; patch.tsFormateur = now; }
          if (!Object.keys(patch).length) { ui.toast("Veuillez signer dans au moins un cadre.", "warn"); return false; }
          store.update("emargements", e.id, patch);
          // si les deux signatures sont présentes, la séance est réalisée
          const fresh = store.find("emargements", e.id);
          if (fresh.signeStagiaire && fresh.signeFormateur && s.statut === "planifiee") store.update("seances", s.id, { statut: "realisee" });
          store.log("Émargement", `${staName(s.stagiaireId)} — ${U.fmtDateShort(s.date)}`);
          ui.toast("Émargement enregistré et horodaté."); App.render();
        } },
      ],
    });
  }

  /* =====================================================================
   *  CAHIER D'ANIMATION (suivi de séance)
   * ===================================================================== */
  App.views.suivi = function () {
    let seances = auth.scopeSeances(store.all("seances")).filter((s) => s.statut === "realisee" || s.date <= U.todayISO());
    seances.sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
    const suivis = store.all("suivis");
    const getSuivi = (id) => suivis.find((x) => x.seanceId === id);

    const table = ui.table([
      { label: "Date", render: (s) => U.fmtDateShort(s.date) },
      { label: "Stagiaire", render: (s) => U.escapeHtml(staName(s.stagiaireId)) },
      { label: "Thème", render: (s) => U.escapeHtml(s.theme || "—") },
      { label: "Suivi", render: (s) => getSuivi(s.id) ? ui.badge("Complété", "green") : ui.badge("À renseigner", "amber") },
      { label: "Progression", render: (s) => { const su = getSuivi(s.id); return su ? ui.badge(su.progression, "blue") : "—"; } },
      { label: "", render: (s) => `<button class="btn btn--ghost btn--sm" data-sui="${s.id}">${getSuivi(s.id) ? "Consulter" : "Renseigner"}</button>` },
    ], seances, { empty: "Aucune séance à suivre." });

    return {
      title: "Cahier d'animation",
      subtitle: "Suivi pédagogique de chaque séance (guide d'animation)",
      html: table,
      onMount(root) {
        root.querySelectorAll("[data-sui]").forEach((b) => b.onclick = () => suiviModal(b.getAttribute("data-sui")));
      },
    };
  };

  function suiviModal(seanceId) {
    const s = store.find("seances", seanceId);
    const existing = store.where("suivis", (x) => x.seanceId === seanceId)[0];
    const su = existing || {};
    const canEdit = auth.is("admin") || (auth.is("formateur") && s.formateurId === auth.current().linkId);
    const progressions = ["Très bonne progression", "Bonne progression", "Progression régulière", "À consolider", "Difficultés"];

    ui.modal({
      title: "Guide d'animation — " + staName(s.stagiaireId), size: "md",
      body: `<form id="frm">
        <p class="muted">${U.dayLabel(s.date)} ${U.fmtDate(s.date)} · ${s.debut}–${s.fin}</p>
        <label class="block">Objectifs travaillés<textarea class="input" name="objectifs" rows="2" ${canEdit ? "" : "readonly"}>${U.escapeHtml(su.objectifs || "")}</textarea></label>
        <label class="block">Ressources / supports utilisés<textarea class="input" name="ressources" rows="2" ${canEdit ? "" : "readonly"}>${U.escapeHtml(su.ressources || "")}</textarea></label>
        <label class="block">Progression<select class="input" name="progression" ${canEdit ? "" : "disabled"}>${progressions.map((p) => `<option ${su.progression === p ? "selected" : ""}>${p}</option>`).join("")}</select></label>
        <label class="block">Commentaires<textarea class="input" name="commentaire" rows="3" ${canEdit ? "" : "readonly"}>${U.escapeHtml(su.commentaire || "")}</textarea></label>
      </form>`,
      actions: canEdit ? [
        { label: "Annuler", kind: "ghost" },
        { label: "Enregistrer", kind: "primary", onClick: (root) => {
          const f = root.querySelector("#frm");
          const data = { seanceId, stagiaireId: s.stagiaireId, formateurId: s.formateurId, date: s.date, objectifs: f.objectifs.value, ressources: f.ressources.value, progression: f.progression.value, commentaire: f.commentaire.value };
          if (existing) store.update("suivis", existing.id, data); else store.insert("suivis", data);
          store.log("Suivi de séance", staName(s.stagiaireId)); ui.toast("Cahier d'animation enregistré."); App.render();
        } },
      ] : [{ label: "Fermer", kind: "primary" }],
    });
  }
})();
