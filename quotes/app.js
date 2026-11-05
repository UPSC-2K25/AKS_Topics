// Global State
let allQuotes = [];
let filteredQuotes = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 4;

// DOM Nodes
const searchInput = document.getElementById("searchInput");
const personalityInput = document.getElementById("personalityInput");
const resetBtn = document.getElementById("resetBtn");
const cardsContainer = document.getElementById("cardsContainer");
const resultsCount = document.getElementById("resultsCount");
const paginationInfo = document.getElementById("paginationInfo");

const firstBtn = document.getElementById("firstBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const lastBtn = document.getElementById("lastBtn");

/**
 * Filter Engine:
 * - searchInput scans quote/statement, context/backstory, Meaning, and ID
 * - personalityInput filters specifically by personality field
 */
function applyFilters() {
  const query = searchInput.value.toLowerCase().trim();
  const personalityQuery = personalityInput.value.toLowerCase().trim();

  filteredQuotes = allQuotes.filter(item => {
    const quoteText = item["quote/statement"] || "";
    const contextText = item["context/backstory"] || "";
    const meaningText = item["Meaning"] || "";
    const idText = String(item.id || "");

    const matchGeneral = 
      !query ||
      quoteText.toLowerCase().includes(query) ||
      contextText.toLowerCase().includes(query) ||
      meaningText.toLowerCase().includes(query) ||
      idText.includes(query);

    const matchPersonality = 
      !personalityQuery || 
      (item.personality && item.personality.toLowerCase().includes(personalityQuery));

    return matchGeneral && matchPersonality;
  });

  currentPage = 1;
  renderView();
}

/**
 * Render Cards in order: Personality, Quote, Meaning, Context
 */
function renderCards() {
  cardsContainer.innerHTML = "";

  if (filteredQuotes.length === 0) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p>No matching quotes found for the active criteria.</p>
      </div>`;
    return;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredQuotes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  pageItems.forEach(item => {
    const card = document.createElement("article");
    card.className = "topic-card";

    const personality = item.personality || "Unknown";
    const quote = item["quote/statement"] || "N/A";
    const meaning = item["Meaning"] || "N/A";
    const context = item["context/backstory"] || "N/A";

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-wrap">
          <span class="topic-id">#${item.id}</span>
          <h2 class="topic-name">${personality}</h2>
        </div>
        <div class="badges-wrap">
          <span class="badge badge-subject">Quote & Ethics</span>
        </div>
      </div>
      <ul class="passage-bullets">
        <li><span class="bullet-label">Personality:</span> ${personality}</li>
        <li><span class="bullet-label">Quote:</span> "${quote}"</li>
        <li><span class="bullet-label">Meaning:</span> ${meaning}</li>
        <li><span class="bullet-label">Context:</span> ${context}</li>
      </ul>
    `;
    cardsContainer.appendChild(card);
  });
}

/**
 * Render Header Navigation Pagination State
 */
function renderPagination() {
  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1;

  resultsCount.textContent = `${filteredQuotes.length} items`;
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
personalityInput.addEventListener("input", applyFilters);

resetBtn.addEventListener("click", () => {
  searchInput.value = "";
  personalityInput.value = "";
  applyFilters();
});

firstBtn.addEventListener("click", () => { 
  currentPage = 1; 
  renderView(); 
  cardsContainer.scrollTop = 0; 
});

lastBtn.addEventListener("click", () => { 
  currentPage = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1; 
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
  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1;
  if (currentPage < totalPages) { 
    currentPage++; 
    renderView(); 
    cardsContainer.scrollTop = 0; 
  } 
});

// Keyboard Navigation for Pagination
document.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    return;
  }

  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE) || 1;

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

// Initialization
async function initApp() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Network response error");
    allQuotes = await res.json();
    applyFilters();
  } catch (err) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <p><strong>Failed to load data.json.</strong> Ensure quotes data file is placed in this folder.</p>
      </div>`;
    resultsCount.textContent = "0 items";
  }
}

initApp();