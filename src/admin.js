// Minimal single-owner content admin for netravax.shubodaya.dev. Talks to
// functions/api/[[path]].js (session cookie + CSRF token, same pattern as
// network.shubodaya.dev's admin portal). State lives in memory and is
// re-rendered from scratch on every mutation -- content here is small
// (a couple dozen cards at most), so there's no need for anything fancier.
let csrfToken = "";
let state = { categories: [] };

const els = {
  status: document.getElementById("adminStatus"),
  setupSection: document.getElementById("setupSection"),
  setupForm: document.getElementById("setupForm"),
  loginSection: document.getElementById("loginSection"),
  loginForm: document.getElementById("loginForm"),
  editorSection: document.getElementById("editorSection"),
  categoryList: document.getElementById("categoryList"),
  addCategoryButton: document.getElementById("addCategoryButton"),
  saveButton: document.getElementById("saveButton"),
  saveStatus: document.getElementById("saveStatus"),
  logoutButton: document.getElementById("logoutButton")
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("is-error", isError);
}

function showSection(section) {
  [els.setupSection, els.loginSection, els.editorSection].forEach((el) => {
    el.hidden = el !== section;
  });
  els.logoutButton.hidden = section !== els.editorSection;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (csrfToken) headers["x-csrf-token"] = csrfToken;
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

async function init() {
  try {
    const me = await api("/api/admin/me");
    if (me.authenticated) {
      csrfToken = me.csrfToken || "";
      await loadEditor();
      return;
    }
    if (me.setupRequired) {
      showSection(els.setupSection);
      setStatus("");
    } else {
      showSection(els.loginSection);
      setStatus("");
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadEditor() {
  showSection(els.editorSection);
  setStatus("");
  const data = await api("/api/admin/content");
  state = data.content && Array.isArray(data.content.categories) ? data.content : { categories: [] };
  renderCategories();
}

els.setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(els.setupForm);
  try {
    const result = await api("/api/admin/register-first", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword")
      })
    });
    csrfToken = result.csrfToken || "";
    await loadEditor();
  } catch (error) {
    setStatus(error.message, true);
  }
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(els.loginForm);
  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") })
    });
    csrfToken = result.csrfToken || "";
    await loadEditor();
  } catch (error) {
    setStatus(error.message, true);
  }
});

els.logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
  } catch {
    // ignore -- we're navigating away from the authenticated state regardless
  }
  csrfToken = "";
  showSection(els.loginSection);
  setStatus("Logged out.");
});

els.addCategoryButton.addEventListener("click", () => {
  state.categories.push({ id: `category-${Date.now()}`, page: "work", title: "New category", cards: [] });
  renderCategories();
});

els.saveButton.addEventListener("click", async () => {
  els.saveButton.disabled = true;
  els.saveStatus.textContent = "Saving...";
  els.saveStatus.classList.remove("is-error");
  try {
    await api("/api/admin/content", { method: "PUT", body: JSON.stringify({ content: state }) });
    els.saveStatus.textContent = "Saved. Syncing to GitHub in the background.";
  } catch (error) {
    els.saveStatus.textContent = error.message;
    els.saveStatus.classList.add("is-error");
  } finally {
    els.saveButton.disabled = false;
  }
});

function renderCategories() {
  els.categoryList.innerHTML = "";
  state.categories.forEach((category, categoryIndex) => {
    const categoryEl = document.createElement("div");
    categoryEl.className = "admin-category";
    categoryEl.innerHTML = `
      <div class="admin-category-head">
        <label>Title<input type="text" class="admin-input" data-field="title" value="${escapeHtml(category.title)}" /></label>
        <label>Page<input type="text" class="admin-input" data-field="page" value="${escapeHtml(category.page)}" /></label>
        <label>Slug<input type="text" class="admin-input" data-field="id" value="${escapeHtml(category.id)}" /></label>
        <button type="button" class="admin-link-button" data-action="remove-category">Remove category</button>
      </div>
      <div class="admin-cards"></div>
      <button type="button" class="button button-secondary" data-action="add-card">Add card</button>
    `;

    categoryEl.querySelectorAll("input[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        category[input.dataset.field] = input.value;
      });
    });

    categoryEl.querySelector('[data-action="remove-category"]').addEventListener("click", () => {
      if (!confirm(`Remove "${category.title}" and all its cards?`)) return;
      state.categories.splice(categoryIndex, 1);
      renderCategories();
    });

    categoryEl.querySelector('[data-action="add-card"]').addEventListener("click", () => {
      category.cards.push({ title: "New project", description: "", image: "", url: "", linkLabel: "View live" });
      renderCategories();
    });

    const cardsContainer = categoryEl.querySelector(".admin-cards");
    category.cards.forEach((card, cardIndex) => {
      const cardEl = document.createElement("div");
      cardEl.className = "admin-card";
      cardEl.innerHTML = `
        <label>Title<input type="text" data-field="title" value="${escapeHtml(card.title)}" /></label>
        <label>Description<textarea data-field="description" rows="2">${escapeHtml(card.description)}</textarea></label>
        <label>Image path<input type="text" data-field="image" value="${escapeHtml(card.image)}" placeholder="/images/work/example.jpg" /></label>
        <label>Live URL<input type="text" data-field="url" value="${escapeHtml(card.url)}" placeholder="https://example.com/" /></label>
        <label>Link label<input type="text" data-field="linkLabel" value="${escapeHtml(card.linkLabel || "View live")}" /></label>
        <button type="button" class="admin-link-button" data-action="remove-card">Remove card</button>
      `;
      cardEl.querySelectorAll("input[data-field], textarea[data-field]").forEach((input) => {
        input.addEventListener("input", () => {
          card[input.dataset.field] = input.value;
        });
      });
      cardEl.querySelector('[data-action="remove-card"]').addEventListener("click", () => {
        category.cards.splice(cardIndex, 1);
        renderCategories();
      });
      cardsContainer.appendChild(cardEl);
    });

    els.categoryList.appendChild(categoryEl);
  });
}

init();
