/* =========================================================================
 *  AS Learning — LMS  ·  store.js
 *  Couche de données : persistance localStorage + CRUD générique.
 *  (Remplaçable par une API REST / PostgreSQL côté production — cf. README)
 * ========================================================================= */
window.App = window.App || {};

App.store = (function () {
  "use strict";
  const KEY = "aslearning_lms_v1";

  // Collections gérées par le LMS (alignées sur la cartographie du processus)
  const COLLECTIONS = [
    "users", "entreprises", "formateurs", "stagiaires",
    "demandes", "autoEvaluations", "offres", "programmes", "modeles",
    "conventions", "seances", "emargements", "suivis",
    "supports", "certificats", "satisfactions", "factures", "journal",
  ];

  let DB = null;

  function blankDB() {
    const db = { _version: 1, _createdAt: App.utils.todayISO() };
    COLLECTIONS.forEach((c) => (db[c] = []));
    return db;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      DB = raw ? JSON.parse(raw) : null;
    } catch (e) { DB = null; }
    if (!DB) {
      DB = blankDB();
      if (App.seed) App.seed.populate(DB);
      persist();
    }
    // garantit que toute collection existe (migrations légères)
    COLLECTIONS.forEach((c) => { if (!DB[c]) DB[c] = []; });
    return DB;
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); }
    catch (e) { console.error("Échec de sauvegarde locale", e); }
  }

  function reset() {
    DB = blankDB();
    if (App.seed) App.seed.populate(DB);
    persist();
    return DB;
  }

  /* --- CRUD générique ---------------------------------------------------- */
  function all(coll) { return (DB[coll] || []).slice(); }

  function find(coll, id) { return (DB[coll] || []).find((x) => x.id === id) || null; }

  function where(coll, predicate) { return (DB[coll] || []).filter(predicate); }

  function insert(coll, obj) {
    obj.id = obj.id || App.utils.uid(coll.slice(0, 3));
    obj.createdAt = obj.createdAt || new Date().toISOString();
    DB[coll].push(obj);
    persist();
    return obj;
  }

  function update(coll, id, patch) {
    const item = find(coll, id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    persist();
    return item;
  }

  function remove(coll, id) {
    const i = (DB[coll] || []).findIndex((x) => x.id === id);
    if (i >= 0) { DB[coll].splice(i, 1); persist(); return true; }
    return false;
  }

  /* --- Journal d'activité (traçabilité QUALIOPI) ------------------------- */
  function log(action, detail) {
    DB.journal.unshift({
      id: App.utils.uid("log"),
      at: new Date().toISOString(),
      user: App.auth && App.auth.current() ? App.auth.current().name : "système",
      action, detail: detail || "",
    });
    DB.journal = DB.journal.slice(0, 500);
    persist();
  }

  return {
    load, persist, reset, raw: () => DB,
    all, find, where, insert, update, remove, log, COLLECTIONS,
  };
})();
