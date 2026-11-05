// Global State
let allTopics = [];
let filteredTopics = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 4;

// DOM Nodes
const searchInput = document.getElementById("searchInput");
const subjectInput = document.getElementById("subjectInput");
const priorityFilter = document.getElementById("priorityFilter");
const resetBtn = document.getElementById("resetBtn");
const cardsContainer = document.getElementById("cardsContainer");
const resultsCount = document.getElementById("resultsCount");
const paginationInfo = document.getElementById("paginationInfo");

const firstBtn = document.getElementById("firstBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const lastBtn = document.getElementById("lastBtn");

/**
 * Splits passages cleanly into individual bullet sentences
 */
function passageToBullets(passage) {
  if (!passage) return [];
  
  // Protect abbreviations, titles, and decimal points
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
 * Filter Engine:
 * - General search tests topic, passage, or ID
 * - Subject search is strictly scoped to the subject property
 * - Priority checks exact match
 */
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const subjectQuery = subjectInput.value.toLowerCase().trim();
  const selectedPriority = priorityFilter.value;

  filteredTopics = allTopics.filter(item => {
    const matchGeneral = 
      !query || 
      item.topic.toLowerCase().includes(query) || 
      item.passage.toLowerCase().includes(query) ||
      String(item.id).includes(query);

    const matchSubject = 
      !subjectQuery || 
      (item.subject && item.subject.toLowerCase().includes(subjectQuery));

    const matchPriority = 
      selectedPriority === "ALL" || 
      (item.imp_level && item.imp_level.toLowerCase() === selectedPriority.toLowerCase());

    return matchGeneral && matchSubject && matchPriority;
  });

  currentPage = 1;
  renderView();
}

/**
 * Render Cards in the scrollable main container
 */
function renderCards() {
  cardsContainer.innerHTML = "";

  if (filteredTopics.length === 0) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p>No matching topics found for the active criteria.</p>
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
          <span class="badge ${priorityClass}">${item.imp_level || 'Normal'}</span>
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
 * Render Header Navigation Pagination State
 */
function renderPagination() {
  const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE) || 1;

  resultsCount.textContent = `${filteredTopics.length} items`;
  paginationInfo.textContent = `${currentPage} / ${totalPages}`;

  firstBtn.disabled = currentPage === 1;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  lastBtn.disabled = currentPage === totalPages;
}

function renderView() {
  renderCards();
  renderPagination();
}

// Event Listeners
searchInput.addEventListener("input", applyFilters);
subjectInput.addEventListener("input", applyFilters);
priorityFilter.addEventListener("change", applyFilters);

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  subjectInput.value = "";
  priorityFilter.value = "ALL";
  applyFilters();
});

firstBtn.addEventListener("click", () => { 
  currentPage = 1; 
  renderView(); 
  cardsContainer.scrollTop = 0; 
});

lastBtn.addEventListener("click", () => { 
  currentPage = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE) || 1; 
  renderView(); 
  cardsContainer.scrollTop = 0; 
});

prevBtn.addEventListener("click", () => { 
  if (currentPage > 1) { 
    currentPage--; 
    renderView(); 
    cardsContainer.scrollTop = 0; 
  } 
});

nextBtn.addEventListener("click", () => { 
  const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE) || 1;
  if (currentPage < totalPages) { 
    currentPage++; 
    renderView(); 
    cardsContainer.scrollTop = 0; 
  } 
});

// Initialization
async function initApp() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Network response error");
    allTopics = await res.json();
    applyFilters();
  } catch (err) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p><strong>Failed to load data.json.</strong> Place your data file in the same repository directory.</p>
      </div>`;
    resultsCount.textContent = "0 items";
  }
}

initApp();

// Keyboard Navigation for Pagination (Left/Right Arrows)
document.addEventListener("keydown", (e) => {
  // Ignore navigation when typing inside search/filter inputs
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    return;
  }

  const totalPages = Math.ceil(filteredTopics.length / ITEMS_PER_PAGE) || 1;

  if (e.key === "ArrowLeft") {
    if (currentPage > 1) {
      currentPage--;
      renderView();
      cardsContainer.scrollTop = 0;
    }
  } else if (e.key === "ArrowRight") {
    if (currentPage < totalPages) {
      currentPage++;
      renderView();
      cardsContainer.scrollTop = 0;
    }
  }
});
