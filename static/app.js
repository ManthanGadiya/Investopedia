const state = {
  token: localStorage.getItem("token") || "",
  categories: [],
};

const API_BASE = window.location.port === "8000" ? "" : "http://127.0.0.1:8000";

const views = ["home", "categories", "articles", "featured", "contact", "auth", "articleDetail"];
const statusBar = document.getElementById("statusBar");
const topbar = document.getElementById("topbar");
const categoriesList = document.getElementById("categoriesList");
const categoryFilter = document.getElementById("categoryFilter");
const articlesList = document.getElementById("articlesList");
const featuredList = document.getElementById("featuredList");
const articleDetail = document.getElementById("articleDetail");
const categoryIntro = document.getElementById("categoryIntro");
const articleCategoryIntro = document.getElementById("articleCategoryIntro");
const articleDetailBody = document.getElementById("articleDetailBody");

function setStatus(text, isError = false) {
  statusBar.textContent = text;
  statusBar.style.borderColor = isError ? "#ef4444" : "#dde3ee";
}

function updateAuthLayout() {
  if (!topbar) return;
  if (state.token) {
    topbar.classList.remove("hidden");
  } else {
    topbar.classList.add("hidden");
  }
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
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (Array.isArray(body.detail)) {
      message = body.detail
        .map((item) => item.msg || item.message || JSON.stringify(item))
        .join(" | ");
    } else if (body.message) {
      message = body.message;
    }
    throw new Error(message);
  }
  return body;
}

function articleCard(item) {
  const img = item.cover_image_url || `https://picsum.photos/seed/${item.slug}/860/460`;
  return `
    <div class="article">
      <img class="thumb" src="${img}" alt="${item.title}">
      <h3>${item.title}</h3>
      <small>
        <button class="link-btn category-link" data-category="${item.category.slug}">${item.category.name}</button>
        | ${new Date(item.published_at).toLocaleString()}
      </small>
      <p>${item.summary || ""}</p>
      <button data-slug="${item.slug}" class="read-btn">Read</button>
    </div>
  `;
}

async function loadCategories() {
  const data = await api("/api/categories");
  state.categories = data;
  categoriesList.innerHTML = data
    .map(
      (c) => `
      <div class="chip category-chip" data-category="${c.slug}">
        <img class="thumb" src="${c.icon || `https://picsum.photos/seed/${c.slug}-cat/480/280`}" alt="${c.name}">
        <strong>${c.name}</strong>
        <div>${c.article_count} articles</div>
      </div>`
    )
    .join("");
  categoryFilter.innerHTML =
    `<option value="">All categories</option>` +
    data.map((c) => `<option value="${c.slug}">${c.name}</option>`).join("");
  bindCategoryChips();
}

async function loadArticles() {
  const category = categoryFilter.value;
  const search = document.getElementById("searchInput").value.trim();
  const qs = new URLSearchParams({ page: "1", page_size: "10", randomize: "true" });
  if (category) qs.set("category", category);
  if (search) qs.set("search", search);
  const data = await api(`/api/articles?${qs.toString()}`);
  articlesList.innerHTML = data.items.map(articleCard).join("") || "<p>No articles found.</p>";
  renderCategoryIntro(category);
  bindArticleActions();
}

async function loadFeatured() {
  const data = await api("/api/featured?limit=10&randomize=true");
  featuredList.innerHTML = data.map(articleCard).join("") || "<p>No featured articles yet.</p>";
  bindArticleActions();
}

async function openArticle(slug) {
  const data = await api(`/api/articles/${slug}`);
  const img = data.cover_image_url || `https://picsum.photos/seed/${data.slug}/860/460`;
  articleDetailBody.innerHTML = `
    <img class="thumb" src="${img}" alt="${data.title}">
    <h2>${data.title}</h2>
    <small>
      <button class="link-btn category-link" data-category="${data.category.slug}">${data.category.name}</button>
      | ${new Date(data.published_at).toLocaleString()}
    </small>
    <p><strong>Summary:</strong> ${data.summary || "N/A"}</p>
    <p>${data.content}</p>
  `;
  renderArticleCategoryIntro(data.category.slug);
  showView("articleDetail");
  bindArticleActions();
}

function bindArticleActions() {
  document.querySelectorAll(".read-btn").forEach((btn) => {
    btn.onclick = () => openArticle(btn.dataset.slug);
  });
  document.querySelectorAll(".category-link").forEach((btn) => {
    btn.onclick = () => filterByCategory(btn.dataset.category);
  });
}

function bindCategoryChips() {
  document.querySelectorAll(".category-chip").forEach((chip) => {
    chip.onclick = () => filterByCategory(chip.dataset.category);
  });
}

async function filterByCategory(slug) {
  categoryFilter.value = slug;
  showView("articles");
  await loadArticles();
  const category = state.categories.find((c) => c.slug === slug);
  if (category) {
    setStatus(`Showing random 10 articles for category: ${category.name}`);
  }
}

function renderCategoryIntro(slug) {
  if (!slug) {
    categoryIntro.classList.add("hidden");
    categoryIntro.innerHTML = "";
    return;
  }
  const category = state.categories.find((c) => c.slug === slug);
  if (!category) return;
  const sections = parseGuideSections(category.description || "Guidance coming soon.");
  const paragraphBlocks = sections
    .map((s, i) => {
      const sizeClass = i % 3 === 0 ? "size-lg" : i % 3 === 1 ? "size-md" : "size-sm";
      const body = formatGuideBody(s.body, sizeClass);
      return `
        <details class="guide-drop" ${i === 0 ? "open" : ""}>
          <summary>${s.title}</summary>
          ${body}
        </details>
      `;
    })
    .join("");
  const title = `${category.name} - Quick Guidance`;
  const image = category.icon || "/static/website.jpeg";
  const insights = sections
    .slice(0, 3)
    .map((s) => s.title.replace(/^\d+\)\s*/, "").trim())
    .filter((p) => p)
    .map((p) => `<div class="guide-chip">${p}.</div>`)
    .join("");
  categoryIntro.classList.remove("hidden");
  categoryIntro.innerHTML = `
    <div class="guide-hero">
      <img src="${image}" alt="${category.name}">
      <div class="guide-hero-body">
        <h3>${title}</h3>
        <div class="guide-chip-wrap">${insights}</div>
      </div>
    </div>
    <div class="guide-drop-wrap">${paragraphBlocks}</div>
  `;
}

function renderArticleCategoryIntro(slug) {
  const category = state.categories.find((c) => c.slug === slug);
  if (!category) {
    articleCategoryIntro.classList.add("hidden");
    articleCategoryIntro.innerHTML = "";
    return;
  }
  const sections = parseGuideSections(category.description || "Guidance coming soon.");
  const paragraphBlocks = sections
    .map((s, i) => {
      const sizeClass = i % 3 === 0 ? "size-lg" : i % 3 === 1 ? "size-md" : "size-sm";
      const body = formatGuideBody(s.body, sizeClass);
      return `
        <details class="guide-drop" ${i === 0 ? "open" : ""}>
          <summary>${s.title}</summary>
          ${body}
        </details>
      `;
    })
    .join("");
  articleCategoryIntro.classList.remove("hidden");
  articleCategoryIntro.innerHTML = `
    <div class="guide-hero compact">
      <img src="${category.icon || "/static/website.jpeg"}" alt="${category.name}">
      <div class="guide-hero-body">
        <h3>${category.name} - How To Approach</h3>
      </div>
    </div>
    <div class="guide-drop-wrap">${paragraphBlocks}</div>
  `;
}

function parseGuideSections(text) {
  const raw = text
    .split("\n\n---\n\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!raw.length) return [{ title: "Guidance", body: text }];

  return raw.map((block, idx) => {
    const lines = block.split("\n").filter((l) => l.trim());
    let title = `Section ${idx + 1}`;
    if (lines[0] && lines[0].startsWith("##")) {
      title = lines[0].replace(/^##\s*/, "").trim();
      lines.shift();
    }
    return { title, body: lines.join("\n") };
  });
}

function formatGuideBody(body, sizeClass) {
  const pieces = body
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);
  return pieces
    .map((piece) => {
      const lines = piece.split("\n").map((l) => l.trim()).filter(Boolean);
      const bulletLines = lines.filter((l) => l.startsWith("- "));
      if (bulletLines.length && bulletLines.length === lines.length) {
        return `<ul class=\"guide-list ${sizeClass}\">${bulletLines
          .map((b) => `<li>${b.replace(/^-\\s*/, "")}</li>`)
          .join("")}</ul>`;
      }
      return `<p class=\"guide-paragraph ${sizeClass}\">${lines.join(" ")}</p>`;
    })
    .join("");
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
    if (!state.token && btn.dataset.view !== "auth") {
      showView("auth");
      setStatus("Please login or signup to continue.");
      return;
    }
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

document.getElementById("refreshArticlesBtn").onclick = async () => {
  try {
    await loadArticles();
  } catch (e) {
    setStatus(e.message, true);
  }
};

document.getElementById("refreshFeaturedBtn").onclick = async () => {
  try {
    await loadFeatured();
  } catch (e) {
    setStatus(e.message, true);
  }
};

document.getElementById("homeExploreArticles").onclick = async () => {
  if (!state.token) {
    showView("auth");
    setStatus("Please login or signup to continue.");
    return;
  }
  showView("articles");
  await loadArticles();
};

document.getElementById("homeExploreFeatured").onclick = async () => {
  if (!state.token) {
    showView("auth");
    setStatus("Please login or signup to continue.");
    return;
  }
  showView("featured");
  await loadFeatured();
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
    updateAuthLayout();
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
    updateAuthLayout();
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
  updateAuthLayout();
  showView("auth");
  setStatus("Logged out.");
};

initSession().then(async () => {
  updateAuthLayout();
  try {
    await loadCategories();
    await loadFeatured();
    if (!state.token) {
      showView("auth");
      setStatus("Welcome. Please login or signup to start.");
    } else {
      showView("home");
    }
  } catch (e) {
    setStatus(e.message, true);
  }
});
