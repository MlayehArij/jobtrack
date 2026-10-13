// ---------- Constantes et état ----------
const KEY = "jobtrack.apps", THEME_KEY = "jobtrack.theme", VIEW_KEY = "jobtrack.view";
const STATUSES = ["Applied", "Interview", "Accepted", "Rejected"];
const COLORS = { Applied: "#7da2ff", Interview: "#f5b942", Accepted: "#3ddc97", Rejected: "#ff7b8f" };
const FIELDS = ["company", "link", "city", "position", "date", "status", "notes"];
const VIEWS = {
  dashboard: ["Dashboard", "Overview of your applications."],
  applications: ["Applications", "Click a column title to sort. ✏️ edits, 🗑️ deletes. Change a status with its dropdown."],
  kanban: ["Kanban", "Drag a card into another column to change its status."],
};
const $ = (id) => document.getElementById(id);
// Petit outil pour créer un élément HTML (textContent = pas d'injection de code)
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
let apps = [];
const save = () => localStorage.setItem(KEY, JSON.stringify(apps)); // mode local seulement

// ---------- Backend : Supabase (cloud) ou LocalStorage (si config.js est vide) ----------
const cfg = window.JOBTRACK_CONFIG || {};
const sb = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase
  ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
let currentUserId = null;

async function refresh() {
  if (sb) {
    // La sécurité (RLS) ne renvoie que les candidatures de l'utilisateur connecté
    const { data, error } = await sb.from("applications").select("*").order("created_at", { ascending: false });
    if (error) alert(error.message);
    apps = data || [];
  } else apps = load();
  render();
}
async function dbAdd(data) {
  if (!sb) { apps.unshift({ id: Date.now(), ...data }); save(); return; }
  const { data: row, error } = await sb.from("applications").insert(data).select().single();
  if (error) alert(error.message); else apps.unshift(row);
}
async function dbUpdate(a, changes) {
  if (sb) {
    const { error } = await sb.from("applications").update(changes).eq("id", a.id);
    if (error) { alert(error.message); return; }
  }
  Object.assign(a, changes);
  if (!sb) save();
}
async function dbDelete(a) {
  if (sb) {
    const { error } = await sb.from("applications").delete().eq("id", a.id);
    if (error) { alert(error.message); return; }
  }
  apps = apps.filter((x) => x.id !== a.id);
  if (!sb) save();
}
let view = localStorage.getItem(VIEW_KEY);
if (!VIEWS[view]) view = "dashboard";
let editingId = null, sortKey = null, sortDir = 1;

// Accepte uniquement http(s) : bloque les liens "javascript:" dangereux
function safeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch { return ""; }
}

// ---------- Affichage général ----------
function render() {
  $("title").textContent = VIEWS[view][0];
  $("subtitle").textContent = VIEWS[view][1];
  document.querySelectorAll(".nav-btn[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  Object.keys(VIEWS).forEach((v) => { $("view-" + v).hidden = v !== view; });
  $("filters").hidden = view === "dashboard";

  if (view === "dashboard") renderDashboard();
  else if (view === "applications") renderTable(getList());
  else renderBoard(getList());
}

function getList() {
  const q = $("search").value.trim().toLowerCase(), f = $("filter").value;
  const list = apps.filter((a) => a.company.toLowerCase().includes(q) && (f === "All" || a.status === f));
  if (sortKey) list.sort((x, y) => String(x[sortKey]).localeCompare(String(y[sortKey])) * sortDir);
  return list;
}

// ---------- Dashboard : cartes, graphique, récents ----------
const count = (s) => apps.filter((a) => a.status === s).length;

function renderDashboard() {
  $("stat-total").textContent = apps.length;
  $("stat-interviews").textContent = count("Interview");
  $("stat-offers").textContent = count("Accepted");
  $("stat-rejected").textContent = count("Rejected");

  // Graphique en anneau : un dégradé conique découpé selon les pourcentages
  let acc = 0;
  const parts = [], legend = $("legend");
  legend.replaceChildren();
  STATUSES.forEach((s) => {
    const n = count(s), pct = apps.length ? (n / apps.length) * 100 : 0;
    if (n) parts.push(`${COLORS[s]} ${acc}% ${acc + pct}%`);
    acc += pct;
    const li = el("li"), dot = el("i");
    dot.style.background = COLORS[s];
    li.append(dot, `${s}: ${n} (${Math.round(pct)}%)`);
    legend.appendChild(li);
  });
  $("donut").style.background = parts.length ? `conic-gradient(${parts.join(",")})` : "var(--line)";
  $("donut-total").textContent = apps.length;

  const recent = $("recent");
  recent.replaceChildren();
  apps.slice(0, 5).forEach((a) => {
    const li = el("li"), left = el("div");
    left.append(el("strong", "", a.company), el("small", "note", a.position));
    li.append(left, el("span", `badge s-${a.status}`, a.status));
    recent.appendChild(li);
  });
  if (!apps.length) recent.appendChild(el("li", "empty", "No application yet."));
}

// ---------- Tableau ----------
function renderTable(list) {
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.dataset.label ||= th.textContent;
    th.textContent = th.dataset.label + (th.dataset.sort === sortKey ? (sortDir === 1 ? " ▲" : " ▼") : "");
  });
  const tbody = $("job-list");
  tbody.replaceChildren();
  list.forEach((a) => tbody.appendChild(buildRow(a)));
  $("empty").hidden = list.length > 0;
}

function buildRow(a) {
  const tr = el("tr"), tdC = el("td");
  if (a.link) {
    const l = el("a", "", a.company);
    l.href = a.link; l.target = "_blank"; l.rel = "noopener noreferrer";
    tdC.appendChild(l);
  } else tdC.textContent = a.company;
  if (a.city) tdC.appendChild(el("div", "note", `📍 ${a.city}`));

  const tdP = el("td", "", a.position);
  if (a.notes) tdP.appendChild(el("div", "note", a.notes));

  const tdS = el("td"), sel = el("select", `status-select s-${a.status}`);
  STATUSES.forEach((s) => sel.add(new Option(s, s, false, s === a.status)));
  sel.addEventListener("change", async () => { await dbUpdate(a, { status: sel.value }); render(); });
  tdS.appendChild(sel);

  const tdA = el("td", "actions-cell"), edit = el("button", "icon", "✏️"), del = el("button", "icon", "🗑️");
  edit.setAttribute("aria-label", `Edit ${a.company}`);
  del.setAttribute("aria-label", `Delete ${a.company}`);
  edit.addEventListener("click", () => openModal(a));
  del.addEventListener("click", async () => {
    if (confirm(`Delete ${a.company}?`)) { await dbDelete(a); render(); }
  });
  tdA.append(edit, del);

  tr.append(tdC, tdP, el("td", "", a.date), tdS, tdA);
  return tr;
}

// ---------- Kanban (glisser-déposer) ----------
function renderBoard(list) {
  const board = $("board");
  board.replaceChildren();
  STATUSES.forEach((s) => {
    const col = el("div", "col"), items = list.filter((a) => a.status === s);
    col.appendChild(el("h3", `s-${s}`, `${s} (${items.length})`));
    items.forEach((a) => {
      const card = el("div", "kcard");
      card.draggable = true;
      card.append(el("strong", "", a.company), el("span", "", a.position));
      if (a.city) card.appendChild(el("small", "note", `📍 ${a.city}`));
      card.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", a.id));
      col.appendChild(card);
    });
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); }); // obligatoire pour "drop"
    col.addEventListener("dragleave", () => col.classList.remove("over"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault();
      const app = apps.find((x) => String(x.id) === e.dataTransfer.getData("text/plain"));
      if (app) await dbUpdate(app, { status: s });
      render();
    });
    board.appendChild(col);
  });
}

// ---------- Fenêtre : ajouter / modifier ----------
function openModal(a) {
  editingId = a ? a.id : null;
  $("job-form").reset();
  $("date").valueAsDate = new Date();
  if (a) FIELDS.forEach((k) => { $(k).value = a[k] || ""; });
  $("modal-title").textContent = a ? "✏️ Edit application" : "➕ Add application";
  $("submit-btn").textContent = a ? "Save changes" : "Add application";
  $("modal").showModal();
}

$("job-form").addEventListener("submit", async (e) => {
  e.preventDefault(); // empêche le rechargement de la page
  const data = {};
  FIELDS.forEach((k) => { data[k] = $(k).value.trim(); });
  data.link = safeUrl(data.link);
  const app = editingId && apps.find((x) => x.id === editingId);
  if (app) await dbUpdate(app, data); // modification
  else await dbAdd(data);             // nouvelle candidature
  $("modal").close();
  render();
});
$("add-btn").addEventListener("click", () => openModal());
$("cancel-edit").addEventListener("click", () => $("modal").close());

// ---------- Navigation, recherche, tri ----------
document.querySelectorAll(".nav-btn[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    view = b.dataset.view;
    localStorage.setItem(VIEW_KEY, view);
    render();
    window.scrollTo(0, 0);
  }));
$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);

document.querySelectorAll("th[data-sort]").forEach((th) => {
  th.tabIndex = 0;
  const sortBy = () => {
    sortDir = sortKey === th.dataset.sort ? -sortDir : 1;
    sortKey = th.dataset.sort;
    render();
  };
  th.addEventListener("click", sortBy);
  th.addEventListener("keydown", (e) => { if (e.key === "Enter") sortBy(); });
});

// ---------- Thème (sombre par défaut) ----------
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $("theme-toggle").firstChild.textContent = t === "dark" ? "☀️ " : "🌙 ";
  localStorage.setItem(THEME_KEY, t);
}
$("theme-toggle").addEventListener("click", () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
setTheme(localStorage.getItem(THEME_KEY) || "dark");

// ---------- Connexion / inscription ----------
let authMode = "login";
function authMsg(text, isError) {
  $("auth-msg").textContent = text;
  $("auth-msg").classList.toggle("error", !!isError);
}
function setAuthMode(m) {
  authMode = m;
  const login = m === "login";
  $("auth-title").textContent = login ? "Log in" : "Create your account";
  $("auth-submit").textContent = login ? "Log in" : "Sign up";
  $("auth-switch").textContent = login ? "No account yet? Sign up" : "Already have an account? Log in";
  $("password").autocomplete = login ? "current-password" : "new-password";
  authMsg("");
}
function enter(session) {
  if (currentUserId === session.user.id) return; // évite de recharger à chaque renouvellement du jeton
  currentUserId = session.user.id;
  $("auth").hidden = true;
  $("app").hidden = false;
  $("who").textContent = session.user.email;
  $("logout-btn").hidden = false;
  refresh();
}
function leave() {
  currentUserId = null;
  apps = [];
  $("app").hidden = true;
  $("auth").hidden = false;
}

if (sb) {
  $("app").hidden = true;
  // setTimeout : on n'appelle pas la base directement dans ce rappel (conseillé par Supabase)
  sb.auth.onAuthStateChange((event, session) => setTimeout(() => (session ? enter(session) : leave()), 0));
  $("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    authMsg("Please wait...");
    const creds = { email: $("email").value.trim(), password: $("password").value };
    const { data, error } = authMode === "login" ? await sb.auth.signInWithPassword(creds) : await sb.auth.signUp(creds);
    if (error) authMsg(error.message, true);
    else if (!data.session) authMsg("Check your email to confirm your account, then log in.");
    else authMsg("");
  });
  $("auth-switch").addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
  $("logout-btn").addEventListener("click", () => sb.auth.signOut());
} else {
  $("who").textContent = "Local mode (this browser only)";
  refresh();
}
