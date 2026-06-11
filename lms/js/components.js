/* =========================================================================
 *  AS Learning — LMS  ·  components.js
 *  Composants d'interface réutilisables (modale, toast, signature, badges...).
 * ========================================================================= */
window.App = window.App || {};

App.ui = (function () {
  "use strict";
  const U = App.utils;

  /* --- Toast ------------------------------------------------------------- */
  function toast(message, type) {
    let host = document.getElementById("toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      document.body.appendChild(host);
    }
    const t = document.createElement("div");
    t.className = "toast toast--" + (type || "info");
    t.innerHTML = `<span class="toast__ico">${type === "error" ? "⚠" : type === "warn" ? "!" : "✓"}</span><span>${U.escapeHtml(message)}</span>`;
    host.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3200);
  }

  /* --- Modale ------------------------------------------------------------ */
  // opts: { title, body(HTML string), size, onMount(rootEl), actions:[{label,kind,onClick(rootEl) -> return false to keep open}] }
  function modal(opts) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "modal-overlay";
    const actions = (opts.actions || []).map((a, i) =>
      `<button class="btn ${a.kind ? "btn--" + a.kind : "btn--ghost"}" data-act="${i}">${U.escapeHtml(a.label)}</button>`
    ).join("");
    overlay.innerHTML = `
      <div class="modal ${opts.size ? "modal--" + opts.size : ""}" role="dialog" aria-modal="true">
        <div class="modal__head">
          <h3>${U.escapeHtml(opts.title || "")}</h3>
          <button class="modal__close" data-close>&times;</button>
        </div>
        <div class="modal__body">${opts.body || ""}</div>
        ${actions ? `<div class="modal__foot">${actions}</div>` : ""}
      </div>`;
    document.body.appendChild(overlay);
    const root = overlay.querySelector(".modal");

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.hasAttribute("data-close")) closeModal();
    });
    (opts.actions || []).forEach((a, i) => {
      const btn = overlay.querySelector(`[data-act="${i}"]`);
      if (btn) btn.addEventListener("click", () => {
        const keep = a.onClick && a.onClick(root) === false;
        if (!keep) closeModal();
      });
    });
    if (opts.onMount) opts.onMount(root);
    return root;
  }

  function closeModal() {
    const ex = document.getElementById("modal-overlay");
    if (ex) ex.remove();
  }

  function confirm(message, title) {
    return new Promise((resolve) => {
      modal({
        title: title || "Confirmation", size: "sm",
        body: `<p>${U.escapeHtml(message)}</p>`,
        actions: [
          { label: "Annuler", kind: "ghost", onClick: () => resolve(false) },
          { label: "Confirmer", kind: "primary", onClick: () => resolve(true) },
        ],
      });
    });
  }

  /* --- Signature électronique (canvas) ----------------------------------- */
  // Renvoie une API { dataURL(), clear(), isEmpty() } attachée à un <canvas>.
  function attachSignaturePad(canvas) {
    const ctx = canvas.getContext("2d");
    let drawing = false, dirty = false, last = null;
    ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#1d3a8a";

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: (p.clientX - r.left) * (canvas.width / r.width), y: (p.clientY - r.top) * (canvas.height / r.height) };
    }
    function start(e) { drawing = true; dirty = true; last = pos(e); e.preventDefault(); }
    function move(e) {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p; e.preventDefault();
    }
    function end() { drawing = false; }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    return {
      dataURL: () => (dirty ? canvas.toDataURL("image/png") : null),
      isEmpty: () => !dirty,
      clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
    };
  }

  /* --- Petits helpers de rendu ------------------------------------------ */
  function avatar(name, cls) {
    return `<span class="avatar ${cls || ""}">${U.escapeHtml(U.initials(name))}</span>`;
  }

  const STATUS_MAP = {
    en_cours: ["En cours", "blue"], termine: ["Terminé", "green"], prospect: ["Prospect", "gray"],
    actif: ["Actif", "green"], clos: ["Clos", "gray"],
    planifiee: ["Planifiée", "blue"], realisee: ["Réalisée", "green"], annulee: ["Annulée", "red"],
    envoyee: ["Envoyée", "amber"], acceptee: ["Acceptée", "green"], refusee: ["Refusée", "red"],
    signee: ["Signée", "green"], deposee: ["Déposée", "green"],
  };
  function statut(key) {
    const m = STATUS_MAP[key] || [key, "gray"];
    return `<span class="badge badge--${m[1]}">${U.escapeHtml(m[0])}</span>`;
  }

  function badge(text, kind) {
    return `<span class="badge badge--${kind || "gray"}">${U.escapeHtml(text)}</span>`;
  }

  function emptyState(message, icon) {
    return `<div class="empty"><div class="empty__ico">${icon || "📭"}</div><p>${U.escapeHtml(message)}</p></div>`;
  }

  function levelChip(lvl) {
    const colors = { A1: "gray", A2: "gray", B1: "blue", B2: "blue", C1: "green", C2: "green" };
    return `<span class="chip chip--${colors[lvl] || "gray"}">${U.escapeHtml(lvl || "—")}</span>`;
  }

  // Barre de progression 0..1
  function progress(value, label) {
    const p = Math.round(U.clamp(value, 0, 1) * 100);
    return `<div class="progress" title="${p}%"><div class="progress__bar" style="width:${p}%"></div>${label ? `<span class="progress__lbl">${p}%</span>` : ""}</div>`;
  }

  // Tableau de données générique.
  // columns: [{ label, render(row), th, td }]  rows: [...]  opts: { onRowAttr(row), empty }
  function table(columns, rows, opts) {
    opts = opts || {};
    if (!rows.length) return emptyState(opts.empty || "Aucune donnée à afficher.");
    const head = columns.map((c) => `<th${c.th ? ' class="' + c.th + '"' : ""}>${U.escapeHtml(c.label)}</th>`).join("");
    const body = rows.map((row) => {
      const attr = opts.onRowAttr ? opts.onRowAttr(row) : "";
      const tds = columns.map((c) => `<td${c.td ? ' class="' + c.td + '"' : ""}>${c.render(row)}</td>`).join("");
      return `<tr ${attr}>${tds}</tr>`;
    }).join("");
    return `<div class="table-wrap"><table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  return { toast, modal, closeModal, confirm, attachSignaturePad, avatar, statut, badge, emptyState, levelChip, progress, table };
})();
