const list = document.querySelector("#timeline-list");
const filters = document.querySelector("#year-filters");
const count = document.querySelector("#entry-count");
const dialog = document.querySelector("#memory-dialog");
const dialogImage = dialog.querySelector(".dialog-image");
const dialogDate = dialog.querySelector(".dialog-date");
const dialogLocation = dialog.querySelector(".dialog-location");
const dialogTitle = dialog.querySelector("#dialog-title");
const dialogText = dialog.querySelector(".dialog-text");
const memories = Array.isArray(window.MEMORIES) ? window.MEMORIES : [];
const memoirList = document.querySelector("#memoir-list");
const memoirs = Array.isArray(window.MEMOIRS) ? window.MEMOIRS : [];
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
let selectedYear = "all";

const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

const getDateParts = (date) => {
  const [year, month, day] = date.split("-");
  return { year, month, day };
};

const formatDate = (date) => {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
};

function openMemory(memory) {
  dialogImage.src = memory.image;
  dialogImage.alt = memory.alt || memory.title || "时间线照片";
  dialogDate.textContent = [formatDate(memory.date), memory.time].filter(Boolean).join(" ");
  dialogLocation.textContent = memory.location || "";
  dialogLocation.hidden = !memory.location;
  dialogTitle.textContent = memory.title || "照片";
  dialogText.textContent = memory.text || "";
  dialogText.hidden = !memory.text;
  dialog.showModal();
}

function createFilter(label, value, active) {
  const button = make("button", "filter-button", label);
  button.type = "button";
  button.dataset.year = value;
  button.setAttribute("aria-pressed", String(active));
  button.addEventListener("click", () => {
    selectedYear = value;
    renderFilters();
    renderMemories();
  });
  return button;
}

function renderFilters() {
  filters.replaceChildren();
  filters.append(createFilter("全部", "all", selectedYear === "all"));
  const years = [...new Set(memories.map((memory) => getDateParts(memory.date).year))].sort().reverse();
  years.forEach((year) => filters.append(createFilter(year, year, selectedYear === year)));
}

function createMemory(memory, index) {
  const { year, month, day } = getDateParts(memory.date);
  const row = make("div", "timeline-row");
  const date = make("div", "timeline-date");
  date.append(make("span", "timeline-year", year));
  date.append(make("span", "timeline-day", `${month}.${day}`));
  if (memory.time) date.append(make("span", "timeline-time", memory.time));

  const hasImage = Boolean(memory.image);
  const article = make("article", "memory-card");
  article.classList.toggle("is-text-only", !hasImage);
  article.classList.toggle("is-reversed", hasImage && index % 2 === 1);
  if (hasImage) {
    const frame = make("button", "memory-frame");
    frame.type = "button";
    frame.setAttribute("aria-label", `打开 ${memory.title || "照片"}`);
    const image = document.createElement("img");
    image.src = memory.image;
    image.alt = memory.alt || memory.title || "时间线照片";
    image.loading = "lazy";
    frame.append(image);
    const indicator = make("span", "frame-open");
    indicator.setAttribute("aria-hidden", "true");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M7 17 17 7M7 7h10v10");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    icon.append(path);
    indicator.append(icon);
    frame.append(indicator);
    frame.addEventListener("click", () => openMemory(memory));
    article.append(frame);
  }

  const copy = make("div", "memory-copy");
  if (memory.title) copy.append(make("h3", "memory-title", memory.title));
  if (memory.text) copy.append(make("p", "memory-text", memory.text));
  if (memory.location) copy.append(make("p", "memory-location", memory.location));
  article.append(copy);
  row.append(date, article);
  return row;
}

function renderMemories() {
  const visible = memories
    .filter((memory) => selectedYear === "all" || getDateParts(memory.date).year === selectedYear)
    .sort((a, b) => b.date.localeCompare(a.date));
  list.replaceChildren();
  list.classList.toggle("is-empty", visible.length === 0);
  visible.forEach((memory, index) => list.append(createMemory(memory, index)));
  if (visible.length === 0) list.append(make("p", "empty-state", "暂无记录"));
  count.textContent = String(visible.length).padStart(2, "0");
}

function renderMemoirs() {
  const visible = [...memoirs].sort((a, b) => b.date.localeCompare(a.date));
  memoirList.replaceChildren();
  visible.forEach((memoir) => {
    const article = make("article", "memoir-entry");
    const date = make("time", "memoir-date", formatDate(memoir.date));
    date.dateTime = memoir.date;
    article.append(date);
    const body = make("div", "memoir-body");
    if (memoir.title) body.append(make("h2", "memoir-title", memoir.title));
    if (memoir.text) body.append(make("p", "memoir-text", memoir.text));
    article.append(body);
    memoirList.append(article);
  });
}

function selectTab(selectedTab) {
  tabs.forEach((tab, index) => {
    const active = tab === selectedTab;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    panels[index].hidden = !active;
  });
}

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

renderFilters();
renderMemories();
renderMemoirs();
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    selectTab(next);
    next.focus();
  });
});
