/* =========================================================================
 *  AS Learning — LMS  ·  app.js
 *  Bootstrap, authentification, navigation, routeur (hash-based).
 * ========================================================================= */
window.App = window.App || {};
App.views = App.views || {};

(function () {
  "use strict";
  const U = App.utils;

  // Définition de la navigation par rôle
  const NAV = [
    { key: "dashboard", label: "Tableau de bord", icon: "▦", roles: ["admin", "formateur", "stagiaire"] },
    { key: "processus", label: "Processus formation", icon: "🛤", roles: ["admin"] },
    { key: "stagiaires", label: "Stagiaires", icon: "🎓", roles: ["admin", "formateur"] },
    { key: "formateurs", label: "Formateurs", icon: "👩‍🏫", roles: ["admin"] },
    { key: "entreprises", label: "Entreprises clientes", icon: "🏢", roles: ["admin"] },
    { key: "calendrier", label: "Calendrier", icon: "📅", roles: ["admin", "formateur", "stagiaire"] },
    { key: "emargement", label: "Émargement", icon: "✍", roles: ["admin", "formateur", "stagiaire"] },
    { key: "suivi", label: "Cahier d'animation", icon: "📔", roles: ["admin", "formateur"] },
    { key: "programmes", label: "Programmes", icon: "📋", roles: ["admin", "formateur", "stagiaire"] },
    { key: "autoeval", label: "Auto-évaluations", icon: "📝", roles: ["admin", "formateur", "stagiaire"] },
    { key: "supports", label: "Supports", icon: "📎", roles: ["admin", "formateur", "stagiaire"] },
    { key: "drive", label: "Drive", icon: "🗂", roles: ["admin", "formateur", "stagiaire"] },
    { key: "reporting", label: "Reporting QUALIOPI", icon: "📊", roles: ["admin"] },
    { key: "journal", label: "Journal d'activité", icon: "🕘", roles: ["admin"] },
  ];

  function navForRole(role) { return NAV.filter((n) => n.roles.includes(role)); }

  /* ---- Routage --------------------------------------------------------- */
  function parseHash() {
    const h = (location.hash || "#/dashboard").replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean);
    return { key: parts[0] || "dashboard", params: parts.slice(1) };
  }

  function go(route) { location.hash = "#/" + route; }
  App.go = go;

  /* ---- Rendu de l'application ------------------------------------------ */
  function render() {
    const user = App.auth.current();
    if (!user) { renderLogin(); return; }

    const { key, params } = parseHash();
    const nav = navForRole(user.role);
    const allowed = nav.some((n) => n.key === key) || ["stagiaire-detail", "formateur-detail"].includes(key);
    const viewKey = allowed && App.views[key] ? key : "dashboard";

    let result;
    try {
      result = App.views[viewKey](params);
    } catch (e) {
      console.error(e);
      result = { title: "Erreur", html: `<div class="card">Une erreur est survenue : ${U.escapeHtml(e.message)}</div>` };
    }

    document.getElementById("app").innerHTML = shell(user, nav, viewKey, result);

    // Liaisons globales
    bindShell();
    if (result.onMount) result.onMount(document.getElementById("view-root"));
  }
  App.render = render;

  function shell(user, nav, activeKey, result) {
    const navHtml = nav.map((n) =>
      `<a href="#/${n.key}" class="nav__item ${n.key === activeKey ? "is-active" : ""}">
         <span class="nav__ico">${n.icon}</span><span class="nav__lbl">${n.label}</span></a>`
    ).join("");

    const roleLabel = { admin: "Administratrice", formateur: "Formateur", stagiaire: "Stagiaire" }[user.role];
    const actionsHtml = result.actions || "";

    return `
      <div class="layout">
        <aside class="sidebar" id="sidebar">
          <div class="brand">
            <div class="brand__logo">AS</div>
            <div><div class="brand__name">AS Learning</div><div class="brand__sub">LMS · QUALIOPI</div></div>
          </div>
          <nav class="nav">${navHtml}</nav>
          <div class="sidebar__foot">
            <div class="userbox">
              ${App.ui.avatar(user.name)}
              <div class="userbox__info"><div class="userbox__name">${U.escapeHtml(user.name)}</div><div class="userbox__role">${roleLabel}</div></div>
            </div>
            <button class="btn btn--ghost btn--sm" id="btn-logout">Déconnexion</button>
          </div>
        </aside>
        <main class="main">
          <header class="topbar">
            <button class="topbar__burger" id="btn-burger">☰</button>
            <div class="topbar__title">
              <h1>${U.escapeHtml(result.title || "")}</h1>
              ${result.subtitle ? `<p>${U.escapeHtml(result.subtitle)}</p>` : ""}
            </div>
            <div class="topbar__actions">${actionsHtml}</div>
          </header>
          <div class="view" id="view-root">${result.html || ""}</div>
        </main>
      </div>`;
  }

  function bindShell() {
    const lo = document.getElementById("btn-logout");
    if (lo) lo.onclick = () => { App.auth.logout(); render(); };
    const burger = document.getElementById("btn-burger");
    if (burger) burger.onclick = () => document.getElementById("sidebar").classList.toggle("open");
    // ferme le menu mobile après navigation
    document.querySelectorAll(".nav__item").forEach((a) =>
      a.addEventListener("click", () => document.getElementById("sidebar").classList.remove("open")));
  }

  /* ---- Écran de connexion ---------------------------------------------- */
  function renderLogin() {
    document.getElementById("app").innerHTML = `
      <div class="login">
        <div class="login__panel">
          <div class="login__brand"><div class="brand__logo brand__logo--lg">AS</div>
            <h1>AS Learning</h1><p>Plateforme de gestion de formation linguistique</p></div>
          <form id="login-form" class="login__form">
            <label>Adresse e-mail<input type="email" id="login-email" autocomplete="username" required placeholder="admin@aslearning.fr"></label>
            <label>Mot de passe<input type="password" id="login-pwd" autocomplete="current-password" required placeholder="••••••"></label>
            <button class="btn btn--primary btn--block" type="submit">Se connecter</button>
            <div id="login-err" class="login__err"></div>
          </form>
          <div class="login__demo">
            <p class="login__demo-title">Comptes de démonstration</p>
            <button class="login__chip" data-demo="admin@aslearning.fr|admin">👩‍💼 Gérante (admin)</button>
            <button class="login__chip" data-demo="DEMO_FORMATEUR">👩‍🏫 Formateur</button>
            <button class="login__chip" data-demo="DEMO_STAGIAIRE">🎓 Stagiaire</button>
          </div>
        </div>
        <div class="login__aside">
          <h2>Centraliser. Tracer. Simplifier.</h2>
          <ul>
            <li>Pilotage des stagiaires, formateurs et entreprises clientes</li>
            <li>Émargement électronique horodaté (preuve QUALIOPI)</li>
            <li>Calendrier d'assignation des interventions formateurs</li>
            <li>Suivi du processus complet : de la demande à l'archivage</li>
            <li>Reporting & documents d'audit (PDF / Excel)</li>
          </ul>
          <p class="login__note">Prototype · données stockées localement dans le navigateur.</p>
        </div>
      </div>`;

    const form = document.getElementById("login-form");
    const err = document.getElementById("login-err");
    form.onsubmit = (e) => {
      e.preventDefault();
      const r = App.auth.login(document.getElementById("login-email").value, document.getElementById("login-pwd").value);
      if (r.ok) { location.hash = "#/dashboard"; render(); }
      else { err.textContent = r.error; }
    };
    document.querySelectorAll(".login__chip").forEach((c) => {
      c.onclick = () => {
        let val = c.getAttribute("data-demo");
        if (val === "DEMO_FORMATEUR") {
          const u = App.store.all("users").find((x) => x.role === "formateur");
          val = u.email + "|" + u.password;
        } else if (val === "DEMO_STAGIAIRE") {
          const u = App.store.all("users").find((x) => x.role === "stagiaire");
          val = u.email + "|" + u.password;
        }
        const [email, pwd] = val.split("|");
        document.getElementById("login-email").value = email;
        document.getElementById("login-pwd").value = pwd;
      };
    });
  }

  /* ---- Démarrage ------------------------------------------------------- */
  function boot() {
    App.store.load();
    App.auth.restore();
    if (!location.hash) location.hash = "#/dashboard";
    window.addEventListener("hashchange", render);
    render();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
