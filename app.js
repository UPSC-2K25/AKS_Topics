// State Management
let allTopics = [];
let filteredTopics = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 5;

// DOM Selectors
const searchInput = document.getElementById("searchInput");
const subjectFilter = document.getElementById("subjectFilter");
const priorityFilter = document.getElementById("priorityFilter");
const resetBtn = document.getElementById("resetBtn");
const cardsContainer = document.getElementById("cardsContainer");
const resultsCount = document.getElementById("resultsCount");
const paginationInfo = document.getElementById("paginationInfo");
const firstBtn = document.getElementById("firstBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const lastBtn = document.getElementById("lastBtn");
const pageNumberButtons = document.getElementById("pageNumberButtons");

/**
 * Splits a passage into clean bullet points based on full stops,
 * handling decimals and common abbreviations correctly.
 */
function passageToBullets(passage) {
  if (!passage) return [];
  
  // Protect common abbreviation dots and decimals before splitting
  const sanitized = passage
    .replace(/(?:\b(?:e\.g|i\.e|viz|vs|etc|no|fig|dr|mr|mrs|prof)\.)/gi, match => match.replace(/\./g, '__DOT__'))
    .replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');

  return sanitized
    .split(/\.\s+/)
    .map(sentence => sentence.replace(/__DOT__/g, '.').trim())
    .filter(sentence => sentence.length > 0)
    .map(sentence => sentence.endsWith('.') ? sentence : sentence + '.');
}

/**
 * Populates unique subjects into the Subject dropdown
 */
function populateSubjectDropdown(data) {
  const subjectSet = new Set();
  data.forEach(item => {
    if (!item.subject) return;
    // Splits grouped subjects if separated by slashes
    item.subject.split('/').forEach(sub => subjectSet.add(sub.trim()));
  });

  const sorted = Array.from(subjectSet).sort();
  sorted.forEach(subject => {
    const opt = document.createElement("option");
    opt.value = subject;
    opt.textContent = subject;
    subjectFilter.appendChild(opt);
  });
}

/**
 * Filter evaluation engine
 */
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedSubject = subjectFilter.value;
  const selectedPriority = priorityFilter.value;

  filteredTopics = allTopics.filter(item => {
    const matchSearch = 
      !query || 
      item.topic.toLowerCase().includes(query) || 
      item.passage.toLowerCase().includes(query) ||
      (item.subject && item.subject.toLowerCase().includes(query)) ||
      String(item.id).includes(query);

    const matchSubject = 
      selectedSubject === "ALL" || 
      (item.subject && item.subject.toLowerCase().includes(selectedSubject.toLowerCase()));

    const matchPriority = 
      selectedPriority === "ALL" || 
      (item.imp_level && item.imp_level.toLowerCase() === selectedPriority.toLowerCase());

    return matchSearch && matchSubject && matchPriority;
  });

  currentPage = 1;
  renderView();
}

/**
 * Render cards for current slice
 */
function renderCards() {
  cardsContainer.innerHTML = "";

  if (filteredTopics.length === 0) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p>No matching topics found. Adjust your search or reset filters.</p>
      </div>`;
    return;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredTopics.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  pageItems.forEach(item => {
    const card = document.createElement("article");
    card.className = "topic-card";

    const bullets = passageToBullets(item.passage);
    const bulletsHtml = bullets.map(b => `<li>${b}</li>`).join("");

    const priorityClass = `badge-${(item.imp_level || "medium").toLowerCase()}`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-wrap">
          <span class="topic-id">#${item.id}</span>
          <h2 class="topic-name">${item.topic}</h2>
        </div>
        <div class="badges-wrap">
          <span class="badge badge-subject">${item.subject || 'General'}</span>
          <span class="badge ${priorityClass}">${item.imp_level || 'Normal'} Priority</span>
        </div>
      </div>
      <ul class="passage-bullets">
        ${bulletsHtml}
      </ul>
    `;
    cardsContainer.appendChild(card);
  });
}

/**
 * Renders pagination controls and numerical buttons
 */
function renderPagination() {
  const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE) || 1;

  resultsCount.textContent = `Showing ${filteredTopics.length} total entries`;
  paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  firstBtn.disabled = currentPage === 1;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  lastBtn.disabled = currentPage === totalPages;

  pageNumberButtons.innerHTML = "";

  // Render a sliding window of max 5 page buttons
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.className = `page-num ${i === currentPage ? "active" : ""}`;
    btn.textContent = i;
    btn.addEventListener("click", () => {
      currentPage = i;
      renderView();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    pageNumberButtons.appendChild(btn);
  }
}

function renderView() {
  renderCards();
  renderPagination();
}

// Event Listeners
searchInput.addEventListener("input", applyFilters);
subjectFilter.addEventListener("change", applyFilters);
priorityFilter.addEventListener("change", applyFilters);

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  subjectFilter.value = "ALL";
  priorityFilter.value = "ALL";
  applyFilters();
});

firstBtn.addEventListener("click", () => { currentPage = 1; renderView(); window.scrollTo({ top: 0, behavior: "smooth" }); });
lastBtn.addEventListener("click", () => { 
  currentPage = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE) || 1; 
  renderView(); 
  window.scrollTo({ top: 0, behavior: "smooth" }); 
});
prevBtn.addEventListener("click", () => { 
  if (currentPage > 1) { 
    currentPage--; 
    renderView(); 
    window.scrollTo({ top: 0, behavior: "smooth" }); 
  } 
});
nextBtn.addEventListener("click", () => { 
  const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE) || 1;
  if (currentPage < totalPages) { 
    currentPage++; 
    renderView(); 
    window.scrollTo({ top: 0, behavior: "smooth" }); 
  } 
});

/**
 * Data Initialization
 */
async function initApp() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error("Failed to load data.json");
    allTopics = await response.json();
    populateSubjectDropdown(allTopics);
    applyFilters();
  } catch (err) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p><strong>Error loading database:</strong> Ensure <code>data.json</code> is placed in the root directory alongside index.html.</p>
      </div>`;
    resultsCount.textContent = "0 entries";
  }
}

initApp();