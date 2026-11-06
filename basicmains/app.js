// Global State
let categoriesConfig = [];
let currentCategory = null;
let currentTopic = null;
let activeDataset = [];
let filteredDataset = [];

const dataCache = {};
let searchDebounceTimer = null;

// Initialization
async function init() {
  try {
    const res = await fetch('./manifest.json?t=' + Date.now());
    if (!res.ok) throw new Error('Could not load manifest.json');
    categoriesConfig = await res.json();
    
    populateCategoryDropdown();
    
    if (categoriesConfig.length > 0) {
      selectCategory(categoriesConfig[0].categoryId);
    }
  } catch (err) {
    console.error("Initialization error:", err);
    renderReaderEmptyState("Error loading manifest.json. Ensure it is placed in the root folder.");
  }

  // Event Listeners
  document.getElementById('categorySelect').addEventListener('change', function(e) {
    selectCategory(e.target.value);
  });

  document.getElementById('sidebarSearch').addEventListener('input', function(e) {
    renderTopicSidebarList(e.target.value);
  });

  document.getElementById('contentSearch').addEventListener('input', function(e) {
    clearTimeout(searchDebounceTimer);
    const term = e.target.value;
    searchDebounceTimer = setTimeout(function() {
      filterDatasetContent(term);
    }, 100);
  });
}

function populateCategoryDropdown() {
  const select = document.getElementById('categorySelect');
  select.innerHTML = '';
  
  categoriesConfig.forEach(function(cat) {
    const opt = document.createElement('option');
    opt.value = cat.categoryId;
    opt.textContent = `${cat.categoryTitle} (${cat.topics.length})`;
    select.appendChild(opt);
  });
}

function selectCategory(categoryId) {
  currentCategory = categoriesConfig.find(function(c) { return c.categoryId === categoryId; });
  if (!currentCategory) return;

  document.getElementById('categorySelect').value = categoryId;
  document.getElementById('sidebarSearch').value = '';
  
  renderTopicSidebarList('');

  if (currentCategory.topics && currentCategory.topics.length > 0) {
    loadTopicDataset(currentCategory.topics[0].id);
  } else {
    currentTopic = null;
    activeDataset = [];
    filteredDataset = [];
    renderReaderEmptyState(`No topics available under "${currentCategory.categoryTitle}" yet.`);
  }
}

function renderTopicSidebarList(filterTerm) {
  const container = document.getElementById('topicListContainer');
  container.innerHTML = '';

  const topics = currentCategory.topics || [];
  const q = filterTerm.trim().toLowerCase();

  const matchedTopics = topics.filter(function(t) {
    return t.title.toLowerCase().indexOf(q) !== -1 || (t.description && t.description.toLowerCase().indexOf(q) !== -1);
  });

  if (matchedTopics.length === 0) {
    container.innerHTML = `<div class="p-3 text-center text-slate-400 text-xs italic">No matching topics found</div>`;
    return;
  }

  matchedTopics.forEach(function(topic) {
    const item = document.createElement('div');
    const isSelected = currentTopic && currentTopic.id === topic.id;
    
    item.className = `p-2 rounded cursor-pointer transition-all border ${
      isSelected 
        ? 'bg-indigo-50 border-indigo-200 text-indigo-950 shadow-2xs' 
        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
    }`;

    item.onclick = function() {
      loadTopicDataset(topic.id);
    };

    item.innerHTML = `
      <h4 class="font-semibold text-xs leading-tight mb-0.5 ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'}">${topic.title}</h4>
      <p class="text-[10px] text-slate-500 line-clamp-1">${topic.description || 'Study notes document.'}</p>
    `;
    container.appendChild(item);
  });
}

async function loadTopicDataset(topicId) {
  currentTopic = currentCategory.topics.find(function(t) { return t.id === topicId; });
  if (!currentTopic) return;

  renderTopicSidebarList(document.getElementById('sidebarSearch').value);
  document.getElementById('contentSearch').value = '';

  if (dataCache[topicId]) {
    activeDataset = dataCache[topicId];
    filteredDataset = activeDataset.slice();
    renderDocumentReader();
    return;
  }

  const filePath = currentTopic.file.startsWith('./') ? currentTopic.file : './' + currentTopic.file;
  try {
    const res = await fetch(filePath + '?t=' + Date.now());
    if (!res.ok) throw new Error('File not found');
    const rawData = await res.json();
    
    let normalized = [];
    if (Array.isArray(rawData)) {
      if (rawData.length === 1 && !rawData[0].label && !rawData[0].info) {
        const singleObj = rawData[0];
        normalized = Object.keys(singleObj).map(function(k) {
          return { label: k, info: singleObj[k] };
        });
      } else {
        normalized = rawData;
      }
    } else if (typeof rawData === 'object' && rawData !== null) {
      normalized = Object.keys(rawData).map(function(k) {
        return { label: k, info: rawData[k] };
      });
    }

    dataCache[topicId] = normalized;
    activeDataset = normalized;
    filteredDataset = activeDataset.slice();
    renderDocumentReader();
  } catch (err) {
    console.warn("Failed to load dataset file:", err);
    activeDataset = [];
    filteredDataset = [];
    renderReaderEmptyState(`Could not load dataset file: ${currentTopic.file}`);
  }
}

// Renders dense inline bullet rows using full width and zero card padding
function renderDocumentReader() {
  const badge = document.getElementById('readerBadge');
  badge.className = 'text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ' + (currentCategory.badge || 'bg-slate-100 text-slate-700');
  badge.textContent = currentCategory.categoryTitle;

  document.getElementById('readerTitle').textContent = currentTopic.title;
  document.getElementById('readerCount').textContent = `(${filteredDataset.length} of ${activeDataset.length} items)`;

  const contentContainer = document.getElementById('readerContent');
  contentContainer.innerHTML = '';

  if (filteredDataset.length === 0) {
    contentContainer.className = 'w-full py-8 text-center text-slate-400 italic text-xs';
    contentContainer.innerHTML = `No matching points found.`;
    return;
  }

  contentContainer.className = 'w-full divide-y divide-slate-100';

  const frag = document.createDocumentFragment();

  filteredDataset.forEach(function(item, idx) {
    const li = document.createElement('li');
    // Tight vertical padding, full horizontal utilization, subtle hover
    li.className = 'py-2 px-1 hover:bg-slate-50/80 transition-colors flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed';

    const labelClean = (item.label || 'Point').replace(/^\d+\.\s*/, '');
    const infoText = item.info || '';

    li.innerHTML = `
      <span class="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
      <div class="flex-1 text-slate-700">
        <strong class="font-semibold text-slate-900 mr-1.5 tracking-tight">${labelClean}:</strong>
        <span class="text-slate-700">${infoText}</span>
      </div>
    `;

    frag.appendChild(li);
  });

  contentContainer.appendChild(frag);
}

function filterDatasetContent(term) {
  const q = term.trim().toLowerCase();
  if (!q) {
    filteredDataset = activeDataset.slice();
  } else {
    filteredDataset = activeDataset.filter(function(item) {
      const matchLabel = item.label && item.label.toLowerCase().indexOf(q) !== -1;
      const matchInfo = item.info && item.info.toLowerCase().indexOf(q) !== -1;
      return matchLabel || matchInfo;
    });
  }
  renderDocumentReader();
}

function renderReaderEmptyState(msg) {
  document.getElementById('readerTitle').textContent = "Knowledge Vault";
  document.getElementById('readerBadge').className = 'hidden';
  document.getElementById('readerCount').textContent = '';
  const contentContainer = document.getElementById('readerContent');
  contentContainer.className = 'h-full flex flex-col items-center justify-center text-center p-6 text-slate-400';
  contentContainer.innerHTML = `
    <div class="text-3xl mb-1.5">📌</div>
    <p class="text-xs font-medium text-slate-600">${msg}</p>
  `;
}

window.addEventListener('DOMContentLoaded', init);
