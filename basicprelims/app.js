// Global State
let topicsConfig = [];
let currentTopic = null;
let currentDataset = [];
let filteredDataset = [];

// In-Memory Data Cache to avoid re-fetching on topic switch
const dataCache = {};

// Pagination Configuration updated to 12
const PAGE_SIZE = 16;
let currentPage = 1;

// Modal tracking state for record flipping
let currentModalIndex = -1;

// Debounce timer for smooth typing in search
let searchDebounceTimer = null;

// App Initialization
async function init() {
  try {
    const res = await fetch('./data/topics-config.json?t=' + Date.now());
    if (!res.ok) throw new Error('Could not load topics-config.json');
    topicsConfig = await res.json();
    
    populateTopicDropdown();
    
    if (topicsConfig.length > 0) {
      selectTopic(topicsConfig[0].id);
    }
  } catch (err) {
    console.error("Initialization error:", err);
    renderEmptyState("Unable to load data/topics-config.json. Ensure the file is present in data/.");
  }

  // Event Listeners
  document.getElementById('topicSelect').addEventListener('change', function(e) {
    selectTopic(e.target.value);
  });

  // Debounced Search Input (150ms delay)
  document.getElementById('searchInput').addEventListener('input', function(e) {
    clearTimeout(searchDebounceTimer);
    const term = e.target.value;
    searchDebounceTimer = setTimeout(function() {
      handleSearch(term);
    }, 150);
  });

  // Main Pagination Buttons
  document.getElementById('prevPageBtn').addEventListener('click', function() {
    if (currentPage > 1) {
      currentPage--;
      renderData();
    }
  });

  document.getElementById('nextPageBtn').addEventListener('click', function() {
    const totalPages = Math.ceil(filteredDataset.length / PAGE_SIZE);
    if (currentPage < totalPages) {
      currentPage++;
      renderData();
    }
  });

  // Modal Controls
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('modalPrevBtn').addEventListener('click', showPreviousRecord);
  document.getElementById('modalNextBtn').addEventListener('click', showNextRecord);

  document.getElementById('detailDrawer').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  
  // Keyboard Navigation: Escape to close, ArrowLeft / ArrowRight to flip records
  window.addEventListener('keydown', function(e) {
    const drawer = document.getElementById('detailDrawer');
    const isModalOpen = !drawer.classList.contains('hidden');

    if (!isModalOpen) return;

    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowLeft') {
      showPreviousRecord();
    } else if (e.key === 'ArrowRight') {
      showNextRecord();
    }
  });
}

function populateTopicDropdown() {
  const select = document.getElementById('topicSelect');
  select.innerHTML = '';
  
  topicsConfig.forEach(function(t) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
  });
}

async function selectTopic(topicId) {
  currentTopic = topicsConfig.find(function(t) { return t.id === topicId; });
  if (!currentTopic) return;

  document.getElementById('topicSelect').value = topicId;
  document.getElementById('searchInput').value = '';

  document.getElementById('topicTitle').textContent = currentTopic.title;
  const badge = document.getElementById('topicBadge');
  badge.className = 'text-[11px] px-2 py-0.5 rounded-full font-semibold ' + (currentTopic.badge || 'bg-slate-100 text-slate-700');
  badge.textContent = currentTopic.category;

  // Check In-Memory Cache First
  if (dataCache[topicId]) {
    currentDataset = dataCache[topicId];
    filteredDataset = currentDataset.slice();
    currentPage = 1;
    renderData();
    return;
  }

  // Fetch Dataset from network if not cached
  const filePath = currentTopic.file.startsWith('./') ? currentTopic.file : './' + currentTopic.file;
  try {
    const res = await fetch(filePath + '?t=' + Date.now());
    if (!res.ok) throw new Error('File not found');
    const data = await res.json();
    
    // Store in cache
    dataCache[topicId] = data;
    currentDataset = data;
    filteredDataset = currentDataset.slice();
    currentPage = 1;
    renderData();
  } catch (err) {
    console.warn("Dataset fetch failed:", err);
    currentDataset = [];
    filteredDataset = [];
    renderEmptyState('Dataset "' + currentTopic.file + '" is not available yet.');
  }
}

function renderData() {
  const totalRecords = filteredDataset.length;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRecords);
  const pageItems = filteredDataset.slice(startIndex, endIndex);

  document.getElementById('topicCount').textContent = `(${totalRecords} total)`;

  document.getElementById('paginationSummary').innerHTML = 
    totalRecords > 0 
      ? `Showing <span class="font-semibold text-slate-800">${startIndex + 1}–${endIndex}</span> of <span class="font-semibold text-slate-800">${totalRecords}</span> entries`
      : 'No records';

  document.getElementById('pageIndicator').textContent = `${currentPage} / ${totalPages}`;
  document.getElementById('prevPageBtn').disabled = (currentPage === 1);
  document.getElementById('nextPageBtn').disabled = (currentPage === totalPages || totalRecords === 0);

  if (totalRecords === 0) {
    renderEmptyState("No matching records found.");
    return;
  }

  // 1. Render Compact Table Header
  const thead = document.getElementById('tableHeader');
  const headerRow = document.createElement('tr');
  currentTopic.columns.forEach(function(col) {
    const th = document.createElement('th');
    th.className = 'px-3 py-2 font-semibold text-slate-600 text-[11px]';
    th.textContent = col.label;
    headerRow.appendChild(th);
  });
  thead.innerHTML = '';
  thead.appendChild(headerRow);

  // 2. Render Compact Table Rows (Single Line with Truncate)
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  pageItems.forEach(function(row, localIdx) {
    const globalIdx = startIndex + localIdx;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-indigo-50/50 cursor-pointer transition-colors border-b border-slate-100 group';
    tr.onclick = function() { openModal(globalIdx); };

    currentTopic.columns.forEach(function(col, cIdx) {
      const td = document.createElement('td');
      td.className = 'px-3 py-1.5 text-slate-700 font-normal text-xs';
      
      const val = row[col.key];
      const isFirstCol = (cIdx === 0 && col.key === 'sno');
      
      if (isFirstCol) {
        td.className += ' font-semibold text-slate-400 w-10';
        td.textContent = val !== undefined && val !== null ? String(val) : String(globalIdx + 1);
      } else {
        const span = document.createElement('div');
        span.className = 'truncate max-w-[180px] sm:max-w-[260px] lg:max-w-[340px]';
        span.title = val ? String(val) : '';
        span.textContent = val !== undefined && val !== null && val !== '' ? String(val) : '-';
        td.appendChild(span);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // 3. Render Mobile Cards
  const cardContainer = document.getElementById('cardContainer');
  cardContainer.innerHTML = '';
  pageItems.forEach(function(row, localIdx) {
    const globalIdx = startIndex + localIdx;
    const card = document.createElement('div');
    card.className = 'p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 transition-all cursor-pointer';
    card.onclick = function() { openModal(globalIdx); };

    const summaryVals = Object.values(row).slice(2, 5).filter(Boolean).join(' • ');
    card.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">#${row.sno || (globalIdx + 1)}</span>
        <span class="text-xs text-indigo-600 font-medium">Open note &rarr;</span>
      </div>
      <h4 class="font-bold text-slate-900 text-xs mb-0.5">${row[currentTopic.primaryKey] || 'Record Details'}</h4>
      <p class="text-xs text-slate-500 line-clamp-1">${summaryVals}</p>
    `;
    cardContainer.appendChild(card);
  });
}

function handleSearch(term) {
  const q = term.trim().toLowerCase();
  if (!q) {
    filteredDataset = currentDataset.slice();
  } else {
    filteredDataset = currentDataset.filter(function(item) {
      return Object.values(item).some(function(val) {
        return val !== null && val !== undefined && String(val).toLowerCase().indexOf(q) !== -1;
      });
    });
  }
  currentPage = 1;
  renderData();
}

function renderEmptyState(msg) {
  document.getElementById('tableHeader').innerHTML = '';
  document.getElementById('tableBody').innerHTML = `<tr><td class="p-6 text-center text-slate-400 italic text-xs">${msg}</td></tr>`;
  document.getElementById('cardContainer').innerHTML = `<div class="p-6 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200 text-xs">${msg}</div>`;
  document.getElementById('paginationSummary').innerHTML = '0 entries';
  document.getElementById('pageIndicator').textContent = '1 / 1';
  document.getElementById('prevPageBtn').disabled = true;
  document.getElementById('nextPageBtn').disabled = true;
  document.getElementById('topicCount').textContent = '(0)';
}

// Open and Render Modal for Record at filteredIndex
function openModal(filteredIndex) {
  if (filteredIndex < 0 || filteredIndex >= filteredDataset.length) return;
  currentModalIndex = filteredIndex;

  const item = filteredDataset[currentModalIndex];
  if (!item) return;

  document.getElementById('modalCategory').textContent = currentTopic.title;
  document.getElementById('modalTitle').textContent = item[currentTopic.primaryKey] || 'Record Overview';
  document.getElementById('modalRecordPos').textContent = `${currentModalIndex + 1} of ${filteredDataset.length}`;

  // Update Modal Nav Buttons State
  document.getElementById('modalPrevBtn').disabled = (currentModalIndex === 0);
  document.getElementById('modalNextBtn').disabled = (currentModalIndex === filteredDataset.length - 1);

  const content = document.getElementById('modalContent');
  content.innerHTML = '';

  const listContainer = document.createElement('ul');
  listContainer.className = 'w-full divide-y divide-slate-100 space-y-0';

  const keys = Object.keys(item);
  keys.forEach(function(key) {
    const val = item[key];
    const formattedKey = key.replace(/_/g, ' ').toUpperCase();

    const li = document.createElement('li');
    li.className = 'py-1.5 px-2 flex items-start gap-2 hover:bg-slate-50/80 rounded transition-colors text-xs leading-relaxed';

    li.innerHTML = `
      <span class="text-indigo-500 font-bold select-none leading-none mt-1 shrink-0 text-sm">•</span>
      <div class="flex-1 break-words">
        <span class="font-semibold text-slate-700 tracking-tight text-[11px] uppercase mr-1.5 text-indigo-950">${formattedKey}:</span>
        <span class="text-slate-800 font-normal text-xs selection:bg-indigo-100">${val !== null && val !== undefined && val !== '' ? String(val) : '<span class="text-slate-300 italic">None / Not Recorded</span>'}</span>
      </div>
    `;
    listContainer.appendChild(li);
  });

  content.appendChild(listContainer);
  document.getElementById('detailDrawer').classList.remove('hidden');
}

// Flip to previous record inside modal
function showPreviousRecord() {
  if (currentModalIndex > 0) {
    openModal(currentModalIndex - 1);
  }
}

// Flip to next record inside modal
function showNextRecord() {
  if (currentModalIndex < filteredDataset.length - 1) {
    openModal(currentModalIndex + 1);
  }
}

function closeModal() {
  document.getElementById('detailDrawer').classList.add('hidden');
  currentModalIndex = -1;
}

window.addEventListener('DOMContentLoaded', init);
