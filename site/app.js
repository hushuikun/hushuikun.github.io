const list = document.querySelector("#timeline-list");
const filters = document.querySelector("#year-filters");
const count = document.querySelector("#entry-count");
const dialog = document.querySelector("#memory-dialog");
const dialogImage = dialog.querySelector(".dialog-image");
const dialogImageWrap = dialog.querySelector(".dialog-image-wrap");
const dialogDate = dialog.querySelector(".dialog-date");
const dialogLocation = dialog.querySelector(".dialog-location");
const dialogTitle = dialog.querySelector("#dialog-title");
const dialogText = dialog.querySelector(".dialog-text");
const memories = Array.isArray(window.MEMORIES) ? window.MEMORIES : [];
const memoirList = document.querySelector("#memoir-list");
const memoirs = Array.isArray(window.MEMOIRS) ? window.MEMOIRS : [];
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

const spotlight = document.querySelector("#spotlight");
const spotlightKicker = document.querySelector("#spotlight-kicker");
const spotlightCard = document.querySelector("#spotlight-card");
const spotlightDate = document.querySelector("#spotlight-date");
const spotlightText = document.querySelector("#spotlight-text");
const spotlightShuffle = document.querySelector("#spotlight-shuffle");

const searchInput = document.querySelector("#search-input");
const searchClear = document.querySelector("#search-clear");
const tagFilters = document.querySelector("#tag-filters");

const state = {
  year: "all",
  tag: "all",
  query: "",
  spotlightDate: null,
};

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

const parseDate = (date) => new Date(`${date}T12:00:00`);

const daysAgo = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = parseDate(date);
  then.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today - then) / 86400000));
};

const tagsOf = (memory) => (Array.isArray(memory.tags) ? memory.tags : []);

const textLength = (memory) => (memory.text || "").replace(/\s/g, "").length;

const allTags = () => {
  const counts = new Map();
  memories.forEach((memory) => {
    tagsOf(memory).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  const pinnedLast = new Set(["游戏"]);
  return [...counts.entries()].sort((a, b) => {
    const pa = pinnedLast.has(a[0]) ? 1 : 0;
    const pb = pinnedLast.has(b[0]) ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return b[1] - a[1] || a[0].localeCompare(b[0], "zh");
  });
};

function openMemory(memory) {
  if (memory.image) {
    dialogImage.src = memory.image;
    dialogImage.alt = memory.alt || memory.title || "时间线照片";
    dialogImageWrap.hidden = false;
  } else {
    dialogImage.removeAttribute("src");
    dialogImage.alt = "";
    dialogImageWrap.hidden = true;
  }
  dialogDate.textContent = [formatDate(memory.date), memory.time].filter(Boolean).join(" ");
  dialogLocation.textContent = memory.location || "";
  dialogLocation.hidden = !memory.location;
  dialogTitle.textContent = memory.title || (memory.image ? "照片" : "那天的记录");
  dialogText.textContent = memory.text || "";
  dialogText.hidden = !memory.text;
  dialog.showModal();
}

/* ---------------------------------------------------------------- spotlight */

function pickSpotlight() {
  if (!memories.length) return null;
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const md = `${month}-${day}`;

  const sameDay = memories.filter(
    (memory) => memory.date.slice(5) === md && parseDate(memory.date).getFullYear() !== today.getFullYear()
  );

  if (sameDay.length) {
    const memory = sameDay[Math.floor(Math.random() * sameDay.length)];
    const years = today.getFullYear() - parseDate(memory.date).getFullYear();
    return { memory, kicker: `${years} 年前的今天` };
  }

  const pool = memories.filter((memory) => daysAgo(memory.date) >= 1 && memory.date !== state.spotlightDate);
  const candidates = pool.length ? pool : memories;
  const memory = candidates[Math.floor(Math.random() * candidates.length)];
  const days = daysAgo(memory.date);
  const kicker = days === 0 ? "今天" : days === 1 ? "昨天" : `${days} 天前`;
  return { memory, kicker };
}

function renderSpotlight(force) {
  if (!memories.length || state.query || state.tag !== "all") {
    spotlight.hidden = true;
    return;
  }
  if (!force && state.spotlightMemory === undefined) {
    state.spotlightMemory = pickSpotlight();
  } else if (force) {
    state.spotlightMemory = pickSpotlight();
  }
  const picked = state.spotlightMemory;
  if (!picked) {
    spotlight.hidden = true;
    return;
  }
  spotlight.hidden = false;
  spotlightKicker.textContent = picked.kicker;
  spotlightDate.textContent = formatDate(picked.memory.date);
  const text = (picked.memory.text || "").replace(/\s+/g, " ").trim();
  spotlightText.textContent = text.length > 96 ? `${text.slice(0, 96)}…` : text;
  state.spotlightDate = picked.memory.date;
  spotlightCard.onclick = () => openMemory(picked.memory);
}

/* ---------------------------------------------------------------- filters */

function createFilter(label, value, active, onClick) {
  const button = make("button", "filter-button", label);
  button.type = "button";
  button.dataset.value = value;
  button.setAttribute("aria-pressed", String(active));
  button.addEventListener("click", onClick);
  return button;
}

function renderFilters() {
  filters.replaceChildren();
  filters.append(
    createFilter("全部", "all", state.year === "all", () => {
      state.year = "all";
      renderFilters();
      renderMemories();
    })
  );
  const years = [...new Set(memories.map((memory) => getDateParts(memory.date).year))].sort().reverse();
  years.forEach((year) =>
    filters.append(
      createFilter(year, year, state.year === year, () => {
        state.year = year;
        renderFilters();
        renderMemories();
      })
    )
  );
}

function renderTagFilters() {
  const tags = allTags();
  tagFilters.replaceChildren();
  if (!tags.length) {
    tagFilters.hidden = true;
    return;
  }
  tagFilters.hidden = false;
  tagFilters.append(
    createFilter("全部", "all", state.tag === "all", () => {
      state.tag = "all";
      renderTagFilters();
      renderMemories();
      renderSpotlight();
    })
  );
  tags.forEach(([tag, n]) => {
    const chip = createFilter(`${tag}`, "tag", state.tag === tag, () => {
      state.tag = state.tag === tag ? "all" : tag;
      renderTagFilters();
      renderMemories();
      renderSpotlight();
    });
    chip.classList.add("tag-button");
    chip.append(make("span", "tag-count", String(n)));
    tagFilters.append(chip);
  });
}

function matchesQuery(memory) {
  if (!state.query) return true;
  const q = state.query.toLowerCase();
  const haystack = [
    memory.text || "",
    memory.title || "",
    memory.alt || "",
    memory.location || "",
    ...tagsOf(memory),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function appendHighlighted(element, text, query) {
  if (!query) {
    element.textContent = text;
    return;
  }
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let cursor = 0;
  let index = lower.indexOf(q);
  while (index !== -1) {
    if (index > cursor) element.append(document.createTextNode(text.slice(cursor, index)));
    const mark = make("mark", "search-hit", text.slice(index, index + q.length));
    element.append(mark);
    cursor = index + q.length;
    index = lower.indexOf(q, cursor);
  }
  if (cursor < text.length) element.append(document.createTextNode(text.slice(cursor)));
}

/* ---------------------------------------------------------------- timeline */

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
  if (memory.title) {
    const title = make("h3", "memory-title");
    appendHighlighted(title, memory.title, state.query);
    copy.append(title);
  }
  if (memory.text) {
    const text = make("p", "memory-text");
    appendHighlighted(text, memory.text, state.query);
    copy.append(text);
  }
  if (memory.location) copy.append(make("p", "memory-location", memory.location));

  const tags = tagsOf(memory);
  if (tags.length) {
    const tagRow = make("div", "memory-tags");
    tags.forEach((tag) => {
      const chip = make("button", "memory-tag", tag);
      chip.type = "button";
      chip.addEventListener("click", () => {
        state.tag = state.tag === tag ? "all" : tag;
        renderTagFilters();
        renderMemories();
        renderSpotlight();
        document.querySelector("#timeline-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      tagRow.append(chip);
    });
    copy.append(tagRow);
  }

  article.append(copy);
  row.append(date, article);
  return row;
}

function currentMemories() {
  return memories
    .filter((memory) => state.year === "all" || getDateParts(memory.date).year === state.year)
    .filter((memory) => state.tag === "all" || tagsOf(memory).includes(state.tag))
    .filter(matchesQuery)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderMemories() {
  const visible = currentMemories();
  list.replaceChildren();
  list.classList.toggle("is-empty", visible.length === 0);
  visible.forEach((memory, index) => list.append(createMemory(memory, index)));
  if (visible.length === 0) list.append(make("p", "empty-state", "没有找到匹配的记录"));
  count.textContent = String(visible.length).padStart(2, "0");
}

/* ---------------------------------------------------------------- memoirs */

function renderMemoirs() {
  const visible = [...memoirs].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    return (b.order || 0) - (a.order || 0);
  });
  memoirList.replaceChildren();
  visible.forEach((memoir) => {
    const article = make("article", "memoir-entry");
    if (memoir.date) {
      const date = make("time", "memoir-date", formatDate(memoir.date));
      date.dateTime = memoir.date;
      article.append(date);
    } else {
      article.classList.add("is-plain");
    }
    const body = make("div", "memoir-body");
    if (memoir.title) body.append(make("h2", "memoir-title", memoir.title));
    if (memoir.text) body.append(make("p", "memoir-text", memoir.text));
    article.append(body);
    memoirList.append(article);
  });
}

/* ---------------------------------------------------------------- stats */

let statsRendered = false;
let heatmapYear = null;

function uniqueDays() {
  const counts = new Map();
  memories.forEach((memory) => {
    counts.set(memory.date, (counts.get(memory.date) || 0) + 1);
  });
  return counts;
}

function streakInfo() {
  const days = [...uniqueDays().keys()].sort();
  if (!days.length) return { current: 0, longest: 0 };
  const daySet = new Set(days);
  let longest = 1;
  let run = 1;
  const ms = 86400000;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((parseDate(days[i]) - parseDate(days[i - 1])) / ms);
    run = diff === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  let current = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!daySet.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(fmt(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}

function renderStatsCards() {
  const grid = document.querySelector("#stats-grid");
  const totalChars = memories.reduce((sum, memory) => sum + textLength(memory), 0);
  const days = uniqueDays().size;
  const streak = streakInfo();
  const avg = days ? Math.round(totalChars / memories.length) : 0;

  const cards = [
    { value: String(memories.length), label: "条记录", note: `${days} 天有记录` },
    { value: totalChars.toLocaleString("zh-CN"), label: "总字数", note: `平均每条 ${avg} 字` },
    { value: `${streak.current}`, label: "当前连续", note: `最长 ${streak.longest} 天` },
    { value: `${memories.filter((m) => m.image).length}`, label: "张照片", note: "时间线里的画面" },
  ];

  grid.replaceChildren();
  cards.forEach((card) => {
    const item = make("div", "stat-card");
    item.append(make("strong", "stat-value", card.value));
    item.append(make("span", "stat-label", card.label));
    item.append(make("span", "stat-note", card.note));
    grid.append(item);
  });
}

function renderHeatmap(year) {
  heatmapYear = year;
  const grid = document.querySelector("#heatmap-grid");
  const monthsRow = document.querySelector("#heatmap-months");
  const yearsWrap = document.querySelector("#heatmap-years");
  const ms = 86400000;

  const counts = new Map();
  memories.forEach((memory) => {
    const y = parseDate(memory.date).getFullYear();
    if (y !== year) return;
    counts.set(memory.date, (counts.get(memory.date) || 0) + textLength(memory));
  });

  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const start = new Date(jan1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const totalDays = Math.round((dec31 - start) / ms) + 1;
  const weeks = Math.ceil(totalDays / 7);

  grid.replaceChildren();
  grid.style.setProperty("--weeks", String(weeks));
  monthsRow.style.setProperty("--weeks", String(weeks));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
    const cell = make("i", "heat-cell");
    if (date.getFullYear() !== year) {
      cell.classList.add("is-outside");
      cell.setAttribute("aria-hidden", "true");
    } else {
      const chars = counts.get(key) || 0;
      const level = chars === 0 ? 0 : chars <= 30 ? 1 : chars <= 80 ? 2 : chars <= 160 ? 3 : 4;
      cell.classList.add(`lvl-${level}`);
      if (key === todayKey) cell.classList.add("is-today");
      const [y, m, d] = key.split("-").map(Number);
      cell.title = `${y} 年 ${m} 月 ${d} 日 · ${chars} 字`;
    }
    grid.append(cell);
  }

  monthsRow.replaceChildren();
  for (let m = 0; m < 12; m++) {
    const first = new Date(year, m, 1);
    const week = Math.floor(Math.round((first - start) / ms) / 7);
    const label = make("span", "heat-month", String(m + 1));
    label.style.gridColumn = String(week + 1);
    monthsRow.append(label);
  }

  yearsWrap.replaceChildren();
  const years = [...new Set(memories.map((memory) => parseDate(memory.date).getFullYear()))].sort((a, b) => b - a);
  if (!years.includes(year)) years.unshift(year);
  years.forEach((y) => {
    const button = make("button", "stats-year", String(y));
    button.type = "button";
    button.setAttribute("aria-pressed", String(y === year));
    button.addEventListener("click", () => renderHeatmap(y));
    yearsWrap.append(button);
  });

  renderMonthBars(year);
}

function renderMonthBars(year) {
  const wrap = document.querySelector("#month-bars");
  const sums = new Array(12).fill(0);
  memories.forEach((memory) => {
    const d = parseDate(memory.date);
    if (d.getFullYear() === year) sums[d.getMonth()] += textLength(memory);
  });
  const max = Math.max(1, ...sums);
  wrap.replaceChildren();
  sums.forEach((sum, index) => {
    const bar = make("div", "month-bar");
    const fill = make("i", "month-bar-fill");
    fill.style.height = `${Math.round((sum / max) * 100)}%`;
    bar.append(fill);
    bar.append(make("span", "month-bar-label", `${index + 1}`));
    bar.title = `${year} 年 ${index + 1} 月 · ${sum} 字`;
    wrap.append(bar);
  });
}

const STOP_WORDS = new Set([
  "今天", "昨天", "明天", "晚上", "早上", "上午", "中午", "下午", "时候", "现在", "已经", "还是",
  "就是", "没有", "什么", "因为", "所以", "但是", "然后", "而且", "不过", "还有", "一起", "自己",
  "我们", "你们", "他们", "她们", "一个", "一下", "一点", "有点", "真的", "特别", "比较", "觉得",
  "知道", "这个", "那个", "这么", "那么", "可以", "可能", "应该", "需要", "开始", "最后", "之后",
  "之前", "起来", "出来", "下来", "回来", "回去", "到家", "回家", "上班", "下班", "公司", "一天",
  "两天", "几天", "东西", "事情", "地方", "时间", "一直", "不是", "就是", "也是", "都是", "我要",
  "我就", "我又", "她还", "我就", "让我", "给我", "跟他", "和她", "于是", "结果", "发现", "看到",
  "看见", "买了", "去了", "吃了", "玩了", "晚上", "今天", "因为", "所以", "两个", "一下", "真的",
]);

function topWords(limit = 18) {
  const counts = new Map();
  const text = memories.map((memory) => memory.text || "").join("\n");
  const accept = (word) => {
    const w = word.trim();
    if (w.length < 2 || w.length > 6) return null;
    if (STOP_WORDS.has(w)) return null;
    if (/^[0-9a-zA-Z]+$/.test(w) && w.length < 2) return null;
    if (/^[0-9]+$/.test(w)) return null;
    return w;
  };

  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    for (const part of segmenter.segment(text)) {
      if (!part.isWordLike) continue;
      const word = accept(part.segment);
      if (word) counts.set(word, (counts.get(word) || 0) + 1);
    }
  } else {
    for (const chunk of text.replace(/[^\u4e00-\u9fa5]/g, " ").split(/\s+/)) {
      for (let i = 0; i < chunk.length - 1; i++) {
        const word = accept(chunk.slice(i, i + 2));
        if (word) counts.set(word, (counts.get(word) || 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
    .slice(0, limit);
}

function renderWordCloud() {
  const wrap = document.querySelector("#word-cloud");
  const words = topWords();
  wrap.replaceChildren();
  if (!words.length) {
    wrap.append(make("p", "empty-state", "记录再多一些，这里会有词云"));
    return;
  }
  const max = words[0][1];
  const min = words[words.length - 1][1];
  words.forEach(([word, n], index) => {
    const ratio = max === min ? 0.6 : (n - min) / (max - min);
    const chip = make("span", "word-chip", word);
    chip.style.fontSize = `${13 + ratio * 15}px`;
    chip.style.opacity = String(0.62 + ratio * 0.38);
    chip.classList.add(["c1", "c2", "c3"][index % 3]);
    chip.title = `${n} 次`;
    chip.append(make("sup", "word-count", String(n)));
    wrap.append(chip);
  });
}

function renderStats() {
  renderStatsCards();
  const years = [...new Set(memories.map((memory) => parseDate(memory.date).getFullYear()))].sort((a, b) => b - a);
  const year = heatmapYear || years[0] || new Date().getFullYear();
  renderHeatmap(year);
  renderWordCloud();
  statsRendered = true;
}

/* ---------------------------------------------------------------- tabs */

function selectTab(selectedTab, updateHash = true) {
  tabs.forEach((tab, index) => {
    const active = tab === selectedTab;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    panels[index].hidden = !active;
  });
  if (selectedTab.id === "stats-tab" && !statsRendered) renderStats();
  if (updateHash) {
    const panel = selectedTab.getAttribute("aria-controls");
    history.replaceState(null, "", `#${panel.replace("-panel", "")}`);
  }
}

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value.trim();
  searchClear.hidden = !state.query;
  renderMemories();
  renderSpotlight();
});

searchClear.addEventListener("click", () => {
  searchInput.value = "";
  state.query = "";
  searchClear.hidden = true;
  renderMemories();
  renderSpotlight();
  searchInput.focus();
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    state.query = "";
    searchClear.hidden = true;
    renderMemories();
    renderSpotlight();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    const panel = document.querySelector("#timeline-panel");
    if (!panel.hidden) {
      event.preventDefault();
      searchInput.focus();
    }
  }
});

spotlightShuffle.addEventListener("click", () => renderSpotlight(true));

renderFilters();
renderTagFilters();
renderSpotlight();
renderMemories();
renderMemoirs();

(() => {
  const id = location.hash.replace("#", "");
  if (!id) return;
  const panelId = id.endsWith("-panel") ? id : `${id}-panel`;
  const tab = tabs.find((item) => item.getAttribute("aria-controls") === panelId);
  if (tab) selectTab(tab, false);
})();

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
