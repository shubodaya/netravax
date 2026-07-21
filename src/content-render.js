// Renders project cards from the admin-editable content API into the
// category sections already present in work.html/cloud-automation.html's
// static markup. The static HTML is the pre-JS/fallback state (good for
// SEO and if the API is unreachable); this only replaces a category's
// .work-grid contents once a successful response arrives, so a failed
// fetch just leaves today's last-known-good static cards in place.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

function cardHtml(card) {
  return `
    <a class="work-card" href="${escapeHtml(card.url)}" target="_blank" rel="noopener">
      <img src="${escapeHtml(card.image)}" alt="" loading="lazy" width="1280" height="800" />
      <div class="work-card-body">
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.description)}</p>
        <span class="work-card-link">${escapeHtml(card.linkLabel || "View live")} ↗</span>
      </div>
    </a>
  `;
}

export async function renderPageContent(pageId) {
  let response;
  try {
    response = await fetch("/api/site-content");
  } catch {
    return;
  }
  if (!response.ok) return;

  const { content } = await response.json().catch(() => ({ content: null }));
  const categories = Array.isArray(content?.categories) ? content.categories.filter((c) => c.page === pageId) : [];
  if (!categories.length) return;

  categories.forEach((category) => {
    const section = document.querySelector(`[data-category-id="${category.id}"]`);
    if (!section) return;

    const grid = section.querySelector(".work-grid");
    const empty = section.querySelector(".work-empty");
    const cards = Array.isArray(category.cards) ? category.cards : [];

    if (!cards.length) {
      if (grid) grid.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (grid) {
      grid.innerHTML = cards.map(cardHtml).join("");
      grid.hidden = false;
    }
    if (empty) empty.hidden = true;
  });
}
