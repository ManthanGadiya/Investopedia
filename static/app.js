const state = {
  token: localStorage.getItem("token") || "",
  categories: [],
};

const views = ["home", "categories", "articles", "featured", "contact", "auth", "articleDetail"];
const statusBar = document.getElementById("statusBar");
const categoriesList = document.getElementById("categoriesList");
const categoryFilter = document.getElementById("categoryFilter");
const articlesList = document.getElementById("articlesList");
const featuredList = document.getElementById("featuredList");
const articleDetail = document.getElementById("articleDetail");

function setStatus(text, isError = false) {
  statusBar.textContent = text;
  statusBar.style.borderColor = isError ? "#ef4444" : "#dde3ee";
}

function showView(viewId) {
  views.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle("hidden", id !== viewId);
    }
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
  if (activeBtn) activeBtn.classList.add("active");
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  const response = await fetch(path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || `Request failed: ${response.status}`);
  }
  return body;
}

function articleCard(item) {
  return `
    <div class="article">
      <h3>${item.title}</h3>
      <small>${item.category.name} | ${new Date(item.published_at).toLocaleString()}</small>
      <p>${item.summary || ""}</p>
      <button data-slug="${item.slug}" class="read-btn">Read</button>
    </div>
  `;
}

async function loadCategories() {
  const data = await api("/api/categories");
  state.categories = data;
  categoriesList.innerHTML = data
    .map((c) => `<div class="chip"><strong>${c.name}</strong><div>${c.article_count} articles</div></div>`)
    .join("");
  categoryFilter.innerHTML =
    `<option value="">All categories</option>` +
    data.map((c) => `<option value="${c.slug}">${c.name}</option>`).join("");
}

async function loadArticles() {
  const category = categoryFilter.value;
  const search = document.getElementById("searchInput").value.trim();
  const qs = new URLSearchParams({ page: "1", page_size: "15" });
  if (category) qs.set("category", category);
  if (search) qs.set("search", search);
  const data = await api(`/api/articles?${qs.toString()}`);
  articlesList.innerHTML = data.items.map(articleCard).join("") || "<p>No articles found.</p>";
  bindReadButtons();
}

async function loadFeatured() {
  const data = await api("/api/featured?limit=12");
  featuredList.innerHTML = data.map(articleCard).join("") || "<p>No featured articles yet.</p>";
  bindReadButtons();
}

async function openArticle(slug) {
  const data = await api(`/api/articles/${slug}`);
  articleDetail.innerHTML = `
    <h2>${data.title}</h2>
    <small>${data.category.name} | ${new Date(data.published_at).toLocaleString()}</small>
    <p><strong>Summary:</strong> ${data.summary || "N/A"}</p>
    <p>${data.content}</p>
  `;
  showView("articleDetail");
}

function bindReadButtons() {
  document.querySelectorAll(".read-btn").forEach((btn) => {
    btn.onclick = () => openArticle(btn.dataset.slug);
  });
}

async function initSession() {
  if (!state.token) {
    setStatus("Not logged in.");
    return;
  }
  try {
    const me = await api("/api/auth/me");
    setStatus(`Logged in as ${me.name} (${me.email})`);
  } catch {
    state.token = "";
    localStorage.removeItem("token");
    setStatus("Session expired. Please login again.", true);
  }
}

document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    showView(btn.dataset.view);
    try {
      if (btn.dataset.view === "categories") await loadCategories();
      if (btn.dataset.view === "articles") await loadArticles();
      if (btn.dataset.view === "featured") await loadFeatured();
    } catch (e) {
      setStatus(e.message, true);
    }
  });
});

document.getElementById("searchBtn").onclick = async () => {
  try {
    await loadArticles();
  } catch (e) {
    setStatus(e.message, true);
  }
};

document.getElementById("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    state.token = data.access_token;
    localStorage.setItem("token", state.token);
    setStatus(`Logged in as ${data.user.name}`);
    showView("home");
  } catch (err) {
    setStatus(err.message, true);
  }
};

document.getElementById("signupForm").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const data = await api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    state.token = data.access_token;
    localStorage.setItem("token", state.token);
    setStatus(`Account created for ${data.user.name}`);
    showView("home");
  } catch (err) {
    setStatus(err.message, true);
  }
};

document.getElementById("contactForm").onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        subject: fd.get("subject"),
        message: fd.get("message"),
      }),
    });
    e.target.reset();
    setStatus("Contact message sent.");
  } catch (err) {
    setStatus(err.message, true);
  }
};

document.getElementById("logoutBtn").onclick = async () => {
  if (!state.token) {
    setStatus("Already logged out.");
    return;
  }
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Continue local logout even if session already expired.
  }
  state.token = "";
  localStorage.removeItem("token");
  setStatus("Logged out.");
};

initSession().then(async () => {
  try {
    await loadFeatured();
  } catch (e) {
    setStatus(e.message, true);
  }
});
