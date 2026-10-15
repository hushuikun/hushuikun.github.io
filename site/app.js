const list = document.querySelector("#timeline-list");
const filters = document.querySelector("#year-filters");
const count = document.querySelector("#entry-count");
const dialog = document.querySelector("#memory-dialog");
const dialogImage = dialog.querySelector(".dialog-image");
const dialogDate = dialog.querySelector(".dialog-date");
const dialogLocation = dialog.querySelector(".dialog-location");
const dialogTitle = dialog.querySelector("#dialog-title");
const memories = Array.isArray(window.MEMORIES) ? window.MEMORIES : [];
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
  dialogImage.alt = memory.alt || memory.title;
  dialogDate.textContent = formatDate(memory.date);
  dialogLocation.textContent = memory.location || "";
  dialogLocation.hidden = !memory.location;
  dialogTitle.textContent = memory.title;
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

  const article = make("article", `memory-card${index % 2 ? " is-reversed" : ""}`);
  const frame = make("button", "memory-frame");
  frame.type = "button";
  frame.setAttribute("aria-label", `打开 ${memory.title}`);
  const image = document.createElement("img");
  image.src = memory.image;
  image.alt = memory.alt || memory.title;
  image.loading = "lazy";
  frame.append(image);
  frame.append(make("span", "frame-open", "↗"));
  frame.addEventListener("click", () => openMemory(memory));

  const copy = make("div", "memory-copy");
  copy.append(make("h3", "memory-title", memory.title));
  if (memory.location) copy.append(make("p", "memory-location", memory.location));
  article.append(frame, copy);
  row.append(date, article);
  return row;
}

function renderMemories() {
  const visible = memories
    .filter((memory) => selectedYear === "all" || getDateParts(memory.date).year === selectedYear)
    .sort((a, b) => b.date.localeCompare(a.date));
  list.replaceChildren();
  visible.forEach((memory, index) => list.append(createMemory(memory, index)));
  count.textContent = String(visible.length).padStart(2, "0");
}

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

renderFilters();
renderMemories();
