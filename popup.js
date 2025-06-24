let groups = {}; // Stockage local en mémoire
let selectedGroupId = null;
let alertTimeoutId = null; // Timeout global pour showAlert

// Génère un ID unique pour chaque groupe
function generateId() {
  return 'g_' + Math.random().toString(36).substr(2, 9);
}

// Sauvegarde les groupes dans chrome.storage
function saveGroups() {
  chrome.storage.local.set({ tabGroups: groups });
}

// Charge les groupes depuis chrome.storage
function loadGroups() {
  chrome.storage.local.get(['tabGroups'], (result) => {
    groups = result.tabGroups || {};
    renderGroups();
    updateControlsVisibility();
  });
}

// Fonction d'affichage d'une boîte de confirmation personnalisée
function showConfirm(message, callback) {
    const confirmBox = document.getElementById('customConfirm');
    const confirmMsg = document.getElementById('customConfirmMessage');
    const yesBtn = document.getElementById('customConfirmYes');
    const noBtn = document.getElementById('customConfirmNo');

    console.log("Affichage de la boîte de confirmation"); // Log pour vérifier si la fonction est appelée
    confirmMsg.textContent = message;
    confirmBox.classList.add('show');
    confirmBox.classList.remove('hidden');

    yesBtn.onclick = () => {
        console.log("Bouton Oui cliqué"); // Log pour vérifier si le bouton Oui est cliqué
        confirmBox.classList.remove('show');
        confirmBox.classList.add('hidden');
        callback(true);
    };

    noBtn.onclick = () => {
        console.log("Bouton Non cliqué"); // Log pour vérifier si le bouton Non est cliqué
        confirmBox.classList.remove('show');
        confirmBox.classList.add('hidden');
        callback(false);
    };
}


// Affiche une alerte custom avec message et durée
function showAlert(message, duration = 3500) {
  const alertBox = document.getElementById('customAlert');
  const alertMsg = document.getElementById('customAlertMessage');
  const closeBtn = document.getElementById('customAlertCloseBtn');

  alertMsg.textContent = message;
  alertBox.classList.add('show');
  alertBox.classList.remove('hidden');

  if (alertTimeoutId) {
    clearTimeout(alertTimeoutId);
  }

  alertTimeoutId = setTimeout(() => {
    alertBox.classList.remove('show');
    alertBox.classList.add('hidden');
  }, duration);

  closeBtn.onclick = () => {
    clearTimeout(alertTimeoutId);
    alertBox.classList.remove('show');
    alertBox.classList.add('hidden');
  };
}

function renderGroups() {
  const groupsContainer = document.getElementById('groupsContainer');
  const list = document.getElementById('groupsList');
  const selectedGroupName = document.getElementById('selectedGroupName');

  if (selectedGroupId) {
    groupsContainer.style.display = 'none';
    selectedGroupName.textContent = groups[selectedGroupId].name;
    selectedGroupName.style.display = 'block';
    return;
  }

  groupsContainer.style.display = 'block';
  selectedGroupName.style.display = 'none';
  selectedGroupName.textContent = '';

  list.innerHTML = '';

  for (const [groupId, group] of Object.entries(groups)) {
    const item = document.createElement('div');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = group.name;
    nameSpan.style.cursor = 'pointer';

    nameSpan.addEventListener('click', () => {
      selectedGroupId = groupId;
      updateControlsVisibility();
      renderGroups();
      renderTabs();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Supprimer ce groupe';
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      showConfirm(`Supprimer le groupe "${group.name}" ?`, (confirmed) => {
        if (confirmed) {
          delete groups[groupId];

          if (groupId === selectedGroupId) {
            selectedGroupId = null;
            updateControlsVisibility();
            renderTabs();
          }

          saveGroups();
          renderGroups();
        }
      });
    });

    item.appendChild(nameSpan);
    item.appendChild(deleteBtn);
    list.appendChild(item);
  }
}

function renderTabs() {
  const tabsContainer = document.getElementById('tabsContainer');
  const tabsList = document.getElementById('tabsList');

  if (!selectedGroupId || !groups[selectedGroupId]) {
    tabsContainer.style.display = 'none';
    return;
  }

  tabsContainer.style.display = 'block';
  tabsList.innerHTML = '';

  const group = groups[selectedGroupId];

  if (!group.tabs || group.tabs.length === 0) {
    tabsList.textContent = 'Aucun onglet dans ce groupe.';
    return;
  }

  group.tabs.forEach((tab, index) => {
    const item = document.createElement('div');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';

    const tabInfo = document.createElement('span');
    tabInfo.textContent = tab.title || tab.url;
    tabInfo.style.cursor = 'pointer';
    tabInfo.title = tab.url;

    tabInfo.addEventListener('click', () => {
      chrome.tabs.create({ url: tab.url });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = 'Supprimer cet onglet du groupe';
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      showConfirm(`Supprimer l’onglet "${tab.title || tab.url}" du groupe ?`, (confirmed) => {
        if (confirmed) {
          group.tabs.splice(index, 1);
          saveGroups();
          renderTabs();
        }
      });
    });

    item.appendChild(tabInfo);
    item.appendChild(deleteBtn);
    tabsList.appendChild(item);
  });
}

// Ajouter un onglet actif au groupe sélectionné
document.getElementById('addSingleTabBtn').addEventListener('click', () => {
  if (!selectedGroupId) {
    showAlert("Veuillez d'abord sélectionner un groupe.");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      showAlert("Aucun onglet trouvé");
      return;
    }
    const activeTab = tabs[0];
    const group = groups[selectedGroupId];
    if (!group.tabs) group.tabs = [];

    if (group.tabs.some(t => t.url === activeTab.url)) {
      showAlert("Cet onglet est déjà dans le groupe.");
      return;
    }

    group.tabs.push({ title: activeTab.title, url: activeTab.url });
    saveGroups();
    renderTabs();
    showAlert(`Onglet "${activeTab.title}" ajouté au groupe "${group.name}".`);
  });
});

// Ajouter tous les onglets ouverts au groupe sélectionné
document.getElementById('addAllTabsBtn').addEventListener('click', () => {
  if (!selectedGroupId) {
    showAlert("Veuillez d'abord sélectionner un groupe.");
    return;
  }

  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      showAlert("Aucun onglet ouvert trouvé");
      return;
    }

    const group = groups[selectedGroupId];
    if (!group.tabs) group.tabs = [];

    let addedCount = 0;

    tabs.forEach(tab => {
      if (!group.tabs.some(t => t.url === tab.url)) {
        group.tabs.push({ title: tab.title, url: tab.url });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      saveGroups();
      showAlert(`${addedCount} onglet(s) ajouté(s) au groupe "${group.name}".`);
      renderTabs();
    } else {
      showAlert("Tous les onglets ouverts sont déjà dans ce groupe.");
    }
  });
});

// Ajouter un nouveau groupe
document.getElementById('addGroupBtn').addEventListener('click', () => {
  const input = document.getElementById('newGroupName');
  const name = input.value.trim();
  if (!name) {
    showAlert('Veuillez entrer un nom de groupe.');
    return;
  }

  const id = generateId();
  groups[id] = { name: name, tabs: [] };
  input.value = '';
  saveGroups();
  renderGroups();
});

// Ouvrir tous les onglets du groupe sélectionné
document.getElementById('openGroupBtn').addEventListener('click', () => {
  if (!selectedGroupId) {
    showAlert("Veuillez d'abord sélectionner un groupe.");
    return;
  }

  const group = groups[selectedGroupId];
  if (!group.tabs || group.tabs.length === 0) {
    showAlert("Le groupe sélectionné ne contient aucun onglet.");
    return;
  }

  group.tabs.forEach(tab => {
    chrome.tabs.create({ url: tab.url });
  });
});

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addSingleTabBtn').style.display = 'none';
  document.getElementById('addAllTabsBtn').style.display = 'none';
  document.getElementById('openGroupBtn').style.display = 'none';
  document.getElementById('backToGroupsBtn').style.display = 'none';
  loadGroups();
});

document.getElementById('backToGroupsBtn').addEventListener('click', () => {
  selectedGroupId = null;
  updateControlsVisibility(); // met à jour tous les boutons
  renderGroups(); // revient à la liste des groupes
  renderTabs(); // cache les onglets
});


function updateControlsVisibility() {
  const show = selectedGroupId !== null;

  document.getElementById('addSingleTabBtn').style.display = show ? 'inline-block' : 'none';
  document.getElementById('addAllTabsBtn').style.display = show ? 'inline-block' : 'none';
  document.getElementById('openGroupBtn').style.display = show ? 'block' : 'none';
  document.getElementById('backToGroupsBtn').style.display = show ? 'inline-block' : 'none';
}
