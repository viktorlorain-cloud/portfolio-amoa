/* =========================================================================
 *  AS Learning — LMS  ·  utils.js
 *  Fonctions utilitaires partagées (namespace global App.utils)
 * ========================================================================= */
window.App = window.App || {};

App.utils = (function () {
  "use strict";

  /* --- Identifiants ------------------------------------------------------ */
  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  /* --- Dates ------------------------------------------------------------- */
  const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d)) return iso;
    return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function fmtDateTime(isoDate, hhmm) {
    return `${fmtDate(isoDate)}${hhmm ? " · " + hhmm : ""}`;
  }

  function fmtDateShort(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  function dayLabel(iso) {
    const d = new Date(iso + "T00:00:00");
    return JOURS[d.getDay()];
  }

  // Durée en heures entre deux "HH:MM"
  function hoursBetween(start, end) {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
  }

  // Chevauchement de deux créneaux le même jour
  function overlaps(s1, e1, s2, e2) {
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
  }

  /* --- Formatage --------------------------------------------------------- */
  function eur(n) {
    return (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  }

  function pct(n) {
    return (Math.round((Number(n) || 0) * 10) / 10).toString().replace(".", ",") + " %";
  }

  function initials(name) {
    return (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join("");
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* --- Exports ----------------------------------------------------------- */
  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // Export CSV (séparateur ; pour Excel FR), BOM pour les accents
  function exportCSV(filename, rows) {
    const esc = (v) => {
      const s = String(v == null ? "" : v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = rows.map((r) => r.map(esc).join(";")).join("\r\n");
    download(filename, "﻿" + csv, "text/csv;charset=utf-8");
  }

  // Impression d'un document HTML dans une fenêtre dédiée (=> PDF via navigateur)
  function printDocument(title, bodyHtml) {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) { alert("Veuillez autoriser les fenêtres pop-up pour générer le document."); return; }
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>
        @page { margin: 20mm; }
        body { font-family: Arial, Helvetica, sans-serif; color:#1a1f36; line-height:1.5; font-size:13px; }
        h1 { font-size:20px; color:#1d3a8a; margin:0 0 4px; }
        h2 { font-size:15px; color:#1d3a8a; border-bottom:2px solid #1d3a8a; padding-bottom:4px; margin-top:24px; }
        .doc-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1d3a8a; padding-bottom:12px; margin-bottom:20px; }
        .brand { font-weight:800; font-size:18px; color:#1d3a8a; }
        .muted { color:#6b7280; }
        table { width:100%; border-collapse:collapse; margin:12px 0; }
        th,td { border:1px solid #cbd5e1; padding:8px 10px; text-align:left; font-size:12px; }
        th { background:#eef2ff; }
        .sign-grid { display:flex; gap:40px; margin-top:36px; }
        .sign-box { flex:1; }
        .sign-box .line { border-top:1px solid #475569; margin-top:48px; padding-top:4px; font-size:11px; }
        .sign-box img { max-height:70px; }
        .badge { display:inline-block; background:#1d3a8a; color:#fff; padding:2px 8px; border-radius:4px; font-size:11px; }
        .footer { margin-top:40px; font-size:10px; color:#9aa0c8; border-top:1px solid #e5e7eb; padding-top:8px; }
        ul { margin:6px 0; padding-left:20px; }
      </style></head><body>${bodyHtml}
      <div class="footer">AS Learning — Organisme de formation certifié QUALIOPI · Document généré le ${fmtDate(todayISO())} via le LMS AS Learning.</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
      </body></html>`);
    w.document.close();
  }

  /* --- Divers ------------------------------------------------------------ */
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function groupBy(arr, fn) {
    return arr.reduce((acc, item) => {
      const k = fn(item);
      (acc[k] = acc[k] || []).push(item);
      return acc;
    }, {});
  }

  return {
    uid, todayISO, fmtDate, fmtDateTime, fmtDateShort, dayLabel, hoursBetween, overlaps,
    eur, pct, initials, escapeHtml, download, exportCSV, printDocument, clamp, groupBy,
    JOURS, MOIS,
  };
})();
