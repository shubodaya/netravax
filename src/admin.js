// Owner content admin for netravax.shubodaya.dev, matching the structure of
// network.shubodaya.dev's admin console: a sidebar listing editable
// sections (here, content categories), a top bar with Save/Reset actions,
// and a single content panel that swaps based on the active section.
// Talks to functions/api/[[path]].js (session cookie + CSRF token).
let csrfToken = "";
let signedInEmail = "";
let state = { categories: [] };
let savedSnapshot = { categories: [] };
let activeSectionId = null;

const NEW_CATEGORY_SECTION = "__new-category__";
const REARRANGE_SECTION = "__rearrange__";

const els = {
  status: document.getElementById("adminStatus"),
  setupSection: document.getElementById("setupSection"),
  setupForm: document.getElementById("setupForm"),
  loginSection: document.getElementById("loginSection"),
  loginForm: document.getElementById("loginForm"),
  dashboardLayout: document.getElementById("dashboardLayout"),
  sidebar: document.getElementById("adminSidebar"),
  sectionNav: document.getElementById("sectionNav"),
  sectionPanel: document.getElementById("sectionPanel"),
  saveButton: document.getElementById("saveButton"),
  resetButton: document.getElementById("resetButton"),
  saveStatus: document.getElementById("saveStatus"),
  signedInEmail: document.getElementById("signedInEmail"),
  logoutButton: document.getElementById("logoutButton"),
  sectionsToggle: document.getElementById("sectionsToggle")
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("is-error", isError);
}

function showAuthSection(section) {
  [els.setupSection, els.loginSection].forEach((el) => {
    el.hidden = el !== section;
  });
  els.dashboardLayout.hidden = true;
  els.logoutButton.hidden = true;
  els.sectionsToggle.hidden = true;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (csrfToken) headers["x-csrf-token"] = csrfToken;
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Request failed (${response.status})`);
  }
  return data;
}

async function init() {
  try {
    const me = await api("/api/admin/me");
    if (me.authenticated) {
      csrfToken = me.csrfToken || "";
      signedInEmail = me.email || "";
      await loadDashboard();
      return;
    }
    setStatus("");
    showAuthSection(me.setupRequired ? els.setupSection : els.loginSection);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadDashboard() {
  els.setupSection.hidden = true;
  els.loginSection.hidden = true;
  els.dashboardLayout.hidden = false;
  els.logoutButton.hidden = false;
  els.sectionsToggle.hidden = false;
  els.signedInEmail.textContent = signedInEmail;
  setStatus("");

  const data = await api("/api/admin/content");
  const content = data.content && Array.isArray(data.content.categories) ? data.content : { categories: [] };
  state = clone(content);
  savedSnapshot = clone(content);
  activeSectionId = state.categories[0]?.id ?? NEW_CATEGORY_SECTION;
  renderSidebar();
  renderPanel();
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
    signedInEmail = result.email || "";
    await loadDashboard();
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
    signedInEmail = result.email || "";
    await loadDashboard();
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
  els.sidebar.classList.remove("is-open");
  showAuthSection(els.loginSection);
  setStatus("Logged out.");
});

els.sectionsToggle.addEventListener("click", () => {
  els.sidebar.classList.toggle("is-open");
});

els.saveButton.addEventListener("click", async () => {
  els.saveButton.disabled = true;
  els.saveStatus.textContent = "Saving...";
  els.saveStatus.classList.remove("is-error");
  try {
    await api("/api/admin/content", { method: "PUT", body: JSON.stringify({ content: state }) });
    savedSnapshot = clone(state);
    els.saveStatus.textContent = "Saved. Syncing to GitHub in the background.";
  } catch (error) {
    els.saveStatus.textContent = error.message;
    els.saveStatus.classList.add("is-error");
  } finally {
    els.saveButton.disabled = false;
  }
});

els.resetButton.addEventListener("click", () => {
  state = clone(savedSnapshot);
  if (!state.categories.some((category) => category.id === activeSectionId)) {
    activeSectionId = state.categories[0]?.id ?? NEW_CATEGORY_SECTION;
  }
  els.saveStatus.textContent = "Reverted to last saved content.";
  els.saveStatus.classList.remove("is-error");
  renderSidebar();
  renderPanel();
});

function selectSection(id) {
  activeSectionId = id;
  els.sidebar.classList.remove("is-open");
  renderSidebar();
  renderPanel();
}

function renderSidebar() {
  els.sectionNav.innerHTML = "";

  state.categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-section-nav-item";
    button.classList.toggle("is-active", category.id === activeSectionId);
    button.textContent = category.title || category.id;
    button.addEventListener("click", () => selectSection(category.id));
    els.sectionNav.appendChild(button);
  });

  const newCategoryButton = document.createElement("button");
  newCategoryButton.type = "button";
  newCategoryButton.className = "admin-section-nav-item admin-section-nav-item--action";
  newCategoryButton.classList.toggle("is-active", activeSectionId === NEW_CATEGORY_SECTION);
  newCategoryButton.textContent = "+ New category";
  newCategoryButton.addEventListener("click", () => selectSection(NEW_CATEGORY_SECTION));
  els.sectionNav.appendChild(newCategoryButton);

  const rearrangeButton = document.createElement("button");
  rearrangeButton.type = "button";
  rearrangeButton.className = "admin-section-nav-item admin-section-nav-item--action";
  rearrangeButton.classList.toggle("is-active", activeSectionId === REARRANGE_SECTION);
  rearrangeButton.textContent = "Re-arrange";
  rearrangeButton.addEventListener("click", () => selectSection(REARRANGE_SECTION));
  els.sectionNav.appendChild(rearrangeButton);
}

function renderPanel() {
  if (activeSectionId === NEW_CATEGORY_SECTION) {
    renderNewCategoryPanel();
    return;
  }
  if (activeSectionId === REARRANGE_SECTION) {
    renderRearrangePanel();
    return;
  }
  const category = state.categories.find((item) => item.id === activeSectionId);
  if (!category) {
    renderNewCategoryPanel();
    return;
  }
  renderCategoryPanel(category);
}

function renderNewCategoryPanel() {
  els.sectionPanel.innerHTML = `
    <h2>Create new category</h2>
    <p>Categories appear as sections on work.html or cloud-automation.html, grouping related project cards.</p>
    <form id="newCategoryForm" class="admin-form admin-form--inline">
      <label>Title<input type="text" name="title" placeholder="e.g. Cloud tooling" required /></label>
      <label>Page<input type="text" name="page" placeholder="work or cloud-automation" required /></label>
      <label>Slug<input type="text" name="id" placeholder="e.g. cloud-tooling" required /></label>
      <button class="button button-primary" type="submit">Create category</button>
    </form>
  `;

  document.getElementById("newCategoryForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const id = String(formData.get("id") || "").trim();
    if (!id || state.categories.some((category) => category.id === id)) {
      els.saveStatus.textContent = "Choose a unique, non-empty slug.";
      els.saveStatus.classList.add("is-error");
      return;
    }
    state.categories.push({
      id,
      page: String(formData.get("page") || "work").trim(),
      title: String(formData.get("title") || "New category").trim(),
      cards: []
    });
    els.saveStatus.textContent = "";
    els.saveStatus.classList.remove("is-error");
    selectSection(id);
  });
}

function renderRearrangePanel() {
  els.sectionPanel.innerHTML = `
    <h2>Re-arrange categories</h2>
    <p>Move categories up or down, then click Save content. Order controls display order on their page.</p>
    <div id="rearrangeList" class="admin-rearrange-list"></div>
  `;

  const list = document.getElementById("rearrangeList");
  state.categories.forEach((category, index) => {
    const row = document.createElement("div");
    row.className = "admin-rearrange-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(category.title || category.id)}</strong>
        <span class="admin-rearrange-meta">${escapeHtml(category.page)} / ${escapeHtml(category.id)}</span>
      </div>
      <div class="admin-rearrange-buttons">
        <button type="button" class="button button-secondary" data-action="up" ${index === 0 ? "disabled" : ""}>Up</button>
        <button type="button" class="button button-secondary" data-action="down" ${index === state.categories.length - 1 ? "disabled" : ""}>Down</button>
      </div>
    `;
    row.querySelector('[data-action="up"]').addEventListener("click", () => {
      [state.categories[index - 1], state.categories[index]] = [state.categories[index], state.categories[index - 1]];
      renderSidebar();
      renderRearrangePanel();
    });
    row.querySelector('[data-action="down"]').addEventListener("click", () => {
      [state.categories[index + 1], state.categories[index]] = [state.categories[index], state.categories[index + 1]];
      renderSidebar();
      renderRearrangePanel();
    });
    list.appendChild(row);
  });
}

function renderCategoryPanel(category) {
  els.sectionPanel.innerHTML = `
    <div class="admin-category-head">
      <label>Title<input type="text" class="admin-input" data-field="title" value="${escapeHtml(category.title)}" /></label>
      <label>Page<input type="text" class="admin-input" data-field="page" value="${escapeHtml(category.page)}" /></label>
      <label>Slug<input type="text" class="admin-input" data-field="id" value="${escapeHtml(category.id)}" /></label>
      <button type="button" class="admin-link-button" data-action="remove-category">Remove category</button>
    </div>
    <div class="admin-cards"></div>
    <button type="button" class="button button-secondary" data-action="add-card">Add card</button>
  `;

  els.sectionPanel.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const field = input.dataset.field;
      const previousId = category.id;
      category[field] = input.value;
      if (field === "id") {
        activeSectionId = input.value;
        renderSidebar();
      }
      void previousId;
    });
  });

  els.sectionPanel.querySelector('[data-action="remove-category"]').addEventListener("click", () => {
    if (!confirm(`Remove "${category.title}" and all its cards?`)) return;
    state.categories = state.categories.filter((item) => item !== category);
    activeSectionId = state.categories[0]?.id ?? NEW_CATEGORY_SECTION;
    renderSidebar();
    renderPanel();
  });

  els.sectionPanel.querySelector('[data-action="add-card"]').addEventListener("click", () => {
    category.cards.push({ title: "New project", description: "", image: "", url: "", linkLabel: "View live" });
    renderCategoryPanel(category);
  });

  const cardsContainer = els.sectionPanel.querySelector(".admin-cards");
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
      renderCategoryPanel(category);
    });
    cardsContainer.appendChild(cardEl);
  });
}

init();
