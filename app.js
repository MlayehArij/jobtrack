// ---------- Constantes et état ----------
const KEY = "jobtrack.apps", THEME_KEY = "jobtrack.theme", VIEW_KEY = "jobtrack.view";
const STATUSES = ["Applied", "Interview", "Accepted", "Rejected"];
const COLORS = { Applied: "#7da2ff", Interview: "#f5b942", Accepted: "#3ddc97", Rejected: "#ff7b8f" };
const FIELDS = ["company", "link", "city", "position", "date", "status", "notes", "offer_text"];
const VIEWS = {
  dashboard: ["Dashboard", "Overview of your applications."],
  applications: ["Applications", "Click a column title to sort. ✏️ edits, 🗑️ deletes. Change a status with its dropdown."],
  kanban: ["Kanban", "Drag a card into another column to change its status."],
  ai: ["AI Assistant", "Write emails and prepare for interviews for one of your applications."],
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
  $("filters").hidden = view !== "applications" && view !== "kanban";

  if (view === "dashboard") renderDashboard();
  else if (view === "applications") renderTable(getList());
  else if (view === "kanban") renderBoard(getList());
  else renderAi();
}

function getList() {
  const q = $("search").value.trim().toLowerCase(), f = $("filter").value;
  const list = apps.filter((a) => a.company.toLowerCase().includes(q) && (f === "All" || a.status === f));
  if (sortKey) list.sort((x, y) => String(x[sortKey]).localeCompare(String(y[sortKey])) * sortDir);
  return list;
}

// ---------- Dashboard : cartes, graphique, récents ----------
const TIPS = [
  "Follow up 7 to 10 days after applying if you have not heard back.",
  "Tailor your CV to each offer: put the most relevant project first.",
  "Prepare a 30-second introduction about yourself and your projects.",
  "Save the text of the job offer: postings are often removed later.",
  "Practice interview questions out loud, not only in your head.",
  "Keep your GitHub clean: a good README helps recruiters understand your project.",
  "Send a short thank-you email after every interview.",
  "Research the company before an interview: what they do and what they build.",
  "Apply to a few places every week: small and regular beats one big burst.",
  "Ask a friend or a teacher to proofread your emails before you send them.",
];
let tipIndex = Math.floor(Date.now() / 86400000); // un conseil différent chaque jour
const count = (s) => apps.filter((a) => a.status === s).length;

function renderDashboard() {
  const hour = new Date().getHours();
  $("welcome-title").textContent = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"} 👋`;
  const waiting = count("Applied");
  $("welcome-sub").textContent = apps.length === 0
    ? "Add your first application to get started."
    : `${waiting} application${waiting === 1 ? " is" : "s are"} still waiting for a reply.`;
  $("tip-text").textContent = `💡 ${TIPS[tipIndex % TIPS.length]}`;
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
  if (a.match_score != null) tdP.appendChild(el("div", "note", `🎯 CV match ${a.match_score}%`));

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
$("tip-next").addEventListener("click", () => { tipIndex++; renderDashboard(); });
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

// ---------- Page "AI Assistant" (messages + préparation d'entretien) ----------
// Le site n'a JAMAIS la clé de l'IA : il appelle la fonction cloud "ai-assistant" de Supabase.
let aiApp = null;
$("ai-about").value = localStorage.getItem("jobtrack.about") || "";
$("ai-about").addEventListener("input", () => localStorage.setItem("jobtrack.about", $("ai-about").value));
const aiStatus = (t, isError) => { $("ai-status").textContent = t; $("ai-status").classList.toggle("error", !!isError); };

function aiClear() {
  $("ai-msg-out").hidden = true;
  $("ai-copy").hidden = true;
  $("ai-questions").replaceChildren();
  $("ai-cv-out").hidden = true;
  aiStatus("");
}
function aiSelect() {
  aiApp = apps.find((x) => String(x.id) === $("ai-app").value) || null;
  $("ai-offer-note").textContent = !aiApp ? "" : aiApp.offer_text
    ? "✅ Job offer text found: the AI will use it."
    : "💡 Tip: paste the job offer in this application (✏️ Edit) for better results.";
}
function renderAi() {
  const sel = $("ai-app"), keep = sel.value;
  sel.replaceChildren(...apps.map((a) => new Option(`${a.company} — ${a.position}`, a.id)));
  if (apps.some((a) => String(a.id) === keep)) sel.value = keep;
  $("ai-layout").hidden = apps.length === 0;
  $("ai-empty").hidden = apps.length > 0;
  aiSelect();
}
function aiTab(t) {
  $("ai-tab-msg").classList.toggle("active", t === "msg");
  $("ai-tab-int").classList.toggle("active", t === "int");
  $("ai-pane-msg").hidden = t !== "msg";
  $("ai-pane-int").hidden = t !== "int";
  $("ai-tab-cv").classList.toggle("active", t === "cv");
  $("ai-pane-cv").hidden = t !== "cv";
}

async function aiCall(payload) {
  if (!sb) throw new Error("The AI needs an account: connect Supabase first (see SETUP_AI.md).");
  if (!aiApp) throw new Error("Choose an application first.");
  const { data: { session } } = await sb.auth.getSession();
  const { data, error } = await sb.functions.invoke("ai-assistant", {
    body: { company: aiApp.company, position: aiApp.position, city: aiApp.city, notes: aiApp.notes,
            offer: aiApp.offer_text, about: $("ai-about").value, cv: $("ai-cv").value, language: $("ai-lang").value, ...payload },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return data;
}
async function aiRun(btn, fn) {
  btn.disabled = true; // évite les doubles clics
  aiStatus("Thinking...");
  try { await fn(); aiStatus(""); } catch (e) { aiStatus(e.message, true); }
  btn.disabled = false;
}

function buildQuestion(q) {
  const li = el("li", "qcard");
  li.append(el("strong", "", q.q), el("div", "note", `💡 ${q.tip}`));
  const ta = el("textarea"), fb = el("div", "feedback");
  const practice = el("button", "btn-ghost", "Practice"), send = el("button", "btn", "Get feedback");
  ta.rows = 3; ta.placeholder = "Type your answer to practice...";
  ta.hidden = send.hidden = fb.hidden = true;
  practice.addEventListener("click", () => { ta.hidden = send.hidden = false; practice.hidden = true; ta.focus(); });
  send.addEventListener("click", () => aiRun(send, async () => {
    const { text } = await aiCall({ action: "feedback", question: q.q, answer: ta.value });
    fb.textContent = text; fb.hidden = false;  // textContent : jamais de HTML venant de l'IA
  }));
  li.append(practice, ta, send, fb);
  return li;
}

// Résultat de l'analyse de CV : score, barre, points forts, compétences manquantes, conseil
function showCv(r) {
  const out = $("ai-cv-out"), bar = el("div", "score-bar"), fill = el("i");
  fill.style.width = `${r.score}%`;
  bar.appendChild(fill);
  const block = (title, items, icon) => {
    const box = el("div"), ul = el("ul");
    (items.length ? items : ["None"]).forEach((i) => ul.appendChild(el("li", "", `${icon} ${i}`))); // textContent : sûr
    box.append(el("strong", "", title), ul);
    return box;
  };
  out.replaceChildren(el("div", "cv-score", `${r.score}% match`), bar, block("Strengths", r.strengths, "✅"),
    block("Missing", r.missing, "❌"), el("p", "", `💡 ${r.advice}`));
  out.hidden = false;
}

$("ai-cv").value = localStorage.getItem("jobtrack.cv") || "";
$("ai-cv").addEventListener("input", () => localStorage.setItem("jobtrack.cv", $("ai-cv").value));
$("ai-tab-cv").addEventListener("click", () => aiTab("cv"));
$("ai-gen-cv").addEventListener("click", (e) => aiRun(e.currentTarget, async () => {
  if (!aiApp?.offer_text) throw new Error("Add the job offer text to this application first (✏️ Edit), then try again.");
  if ($("ai-cv").value.trim().length < 50) throw new Error("Paste the text of your CV first.");
  const { result } = await aiCall({ action: "cvmatch" });
  showCv(result);
  await dbUpdate(aiApp, { match_score: result.score }); // le score est gardé dans la candidature
}));

$("ai-app").addEventListener("change", () => { aiSelect(); aiClear(); });
$("ai-tab-msg").addEventListener("click", () => aiTab("msg"));
$("ai-tab-int").addEventListener("click", () => aiTab("int"));
$("ai-gen-msg").addEventListener("click", (e) => aiRun(e.currentTarget, async () => {
  const { text } = await aiCall({ action: "message", kind: $("ai-kind").value });
  $("ai-msg-out").value = text;
  $("ai-msg-out").hidden = false;
  $("ai-copy").hidden = false;
}));
$("ai-gen-int").addEventListener("click", (e) => aiRun(e.currentTarget, async () => {
  const { questions } = await aiCall({ action: "interview" });
  if (!Array.isArray(questions)) throw new Error("Unexpected answer. Please try again.");
  $("ai-questions").replaceChildren(...questions.map(buildQuestion));
}));
$("ai-copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("ai-msg-out").value);
  $("ai-copy").textContent = "Copied ✓";
  setTimeout(() => { $("ai-copy").textContent = "Copy"; }, 1500);
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
  $("tab-login").classList.toggle("active", login);
  $("tab-signup").classList.toggle("active", !login);
  $("auth-title").textContent = login ? "Welcome back" : "Create your account";
  $("auth-sub").textContent = login ? "Log in to see your applications." : "It takes less than a minute.";
  $("auth-submit").textContent = login ? "Log in" : "Create account";
  $("confirm-wrap").hidden = login;     // le champ de confirmation n'existe que pour l'inscription
  $("confirm").required = !login;
  $("password").autocomplete = login ? "current-password" : "new-password";
  authMsg("");
}
function enter(session) {
  if (currentUserId === session.user.id) return; // évite de recharger à chaque renouvellement du jeton
  currentUserId = session.user.id;
  $("auth").hidden = true;
  $("landing").hidden = true;
  $("app").hidden = false;
  $("who").textContent = session.user.email;
  $("logout-btn").hidden = false;
  refresh();
}
function leave() {
  currentUserId = null;
  apps = [];
  $("app").hidden = true;
  showLanding();
}
// Un visiteur non connecté voit d'abord la page d'accueil, puis choisit "Log in" ou "Sign up"
function showLanding() {
  $("landing").hidden = false;
  $("auth").hidden = true;
  window.scrollTo(0, 0);
}
function showAuth(mode) {
  $("landing").hidden = true;
  $("auth").hidden = false;
  setAuthMode(mode);
}

if (sb) {
  $("app").hidden = true;
  // setTimeout : on n'appelle pas la base directement dans ce rappel (conseillé par Supabase)
  sb.auth.onAuthStateChange((event, session) => setTimeout(() => (session ? enter(session) : leave()), 0));
  $("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (authMode === "signup" && $("password").value !== $("confirm").value) {
      authMsg("Passwords do not match.", true);
      return;
    }
    authMsg("Please wait...");
    const creds = { email: $("email").value.trim(), password: $("password").value };
    const { data, error } = authMode === "login" ? await sb.auth.signInWithPassword(creds) : await sb.auth.signUp(creds);
    if (error) authMsg(error.message, true);
    else if (!data.session) authMsg("Check your email to confirm your account, then log in.");
    else authMsg("");
  });
  document.querySelectorAll("[data-auth]").forEach((b) => b.addEventListener("click", () => showAuth(b.dataset.auth)));
  $("auth-back").addEventListener("click", showLanding);
  $("google-btn").hidden = $("google-divider").hidden = !cfg.GOOGLE_ENABLED; // caché tant que Google n'est pas configuré
  $("tab-login").addEventListener("click", () => setAuthMode("login"));
  $("tab-signup").addEventListener("click", () => setAuthMode("signup"));
  document.querySelectorAll(".pw-toggle").forEach((b) => b.addEventListener("click", () => {
    const input = $(b.dataset.target);
    input.type = input.type === "password" ? "text" : "password"; // afficher / cacher le mot de passe
  }));
  $("google-btn").addEventListener("click", async () => {
    if (!cfg.GOOGLE_ENABLED) { authMsg("Google sign-in is not set up yet.", true); return; }
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) authMsg(error.message, true);
  });
  $("logout-btn").addEventListener("click", () => sb.auth.signOut());
} else {
  $("who").textContent = "Local mode (this browser only)";
  refresh();
}
