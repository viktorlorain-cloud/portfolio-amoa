/* =========================================================================
 *  AS Learning — LMS  ·  auth.js
 *  Authentification email + mot de passe, 3 rôles (admin/formateur/stagiaire).
 *  Démo uniquement : mots de passe en clair, session en sessionStorage.
 * ========================================================================= */
window.App = window.App || {};

App.auth = (function () {
  "use strict";
  const SKEY = "aslearning_lms_session";
  let user = null;

  function restore() {
    try {
      const id = sessionStorage.getItem(SKEY);
      if (id) user = App.store.find("users", id);
    } catch (e) { user = null; }
    return user;
  }

  function login(email, password) {
    const u = App.store.all("users").find(
      (x) => x.email.toLowerCase() === String(email).toLowerCase().trim() && x.password === password
    );
    if (!u) return { ok: false, error: "Identifiants incorrects." };
    user = u;
    sessionStorage.setItem(SKEY, u.id);
    App.store.log("Connexion", `${u.name} (${u.role})`);
    return { ok: true, user: u };
  }

  function logout() {
    if (user) App.store.log("Déconnexion", user.name);
    user = null;
    sessionStorage.removeItem(SKEY);
  }

  function current() { return user; }
  function role() { return user ? user.role : null; }
  function is(r) { return role() === r; }

  // Renvoie l'enregistrement métier lié (formateur / stagiaire)
  function profile() {
    if (!user) return null;
    if (user.role === "formateur") return App.store.find("formateurs", user.linkId);
    if (user.role === "stagiaire") return App.store.find("stagiaires", user.linkId);
    return null;
  }

  // Filtre une liste de séances/stagiaires selon le périmètre du rôle
  function scopeStagiaires(list) {
    if (is("admin")) return list;
    if (is("formateur")) return list.filter((s) => s.formateurId === user.linkId);
    if (is("stagiaire")) return list.filter((s) => s.id === user.linkId);
    return [];
  }

  function scopeSeances(list) {
    if (is("admin")) return list;
    if (is("formateur")) return list.filter((s) => s.formateurId === user.linkId);
    if (is("stagiaire")) return list.filter((s) => s.stagiaireId === user.linkId);
    return [];
  }

  return { restore, login, logout, current, role, is, profile, scopeStagiaires, scopeSeances };
})();
