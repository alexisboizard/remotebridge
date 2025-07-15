const saved_sessions_file = "../config/session.json";

let global_data = { sessions: [], folders: [] };
let selected_element = [null, null];
let hoveredElement = null;
const terminals = {}; // pour gérer plusieurs onglets si nécessaire
let currentSftpSession = null;
let currentRemotePath = "/"; // par défaut

async function loadData() {
  global_data = await window.api.loadData();
  refreshStructure(global_data);
}

function refreshStructure() {
  const tree = buildTree();
  const structureDiv = document.getElementById("tree");
  structureDiv.innerHTML = "";
  const structureHTML = buildStructureHTML(tree);
  if (structureHTML) {
    structureDiv.appendChild(structureHTML);
  }

  // Ajouter les gestionnaires de collapse ICI
  document
    .querySelectorAll(".folder:not(.no-toggle) .toggle")
    .forEach((toggleEl) => {
      toggleEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const folderEl = e.currentTarget.closest("li");
        const childrenEl = folderEl.querySelector(":scope > .children");

        if (childrenEl) {
          childrenEl.classList.toggle("collapsed");
          e.currentTarget.closest(".folder").classList.toggle("collapsed");
          if (e.currentTarget.className == "toggle fa-solid fa-folder") {
            e.currentTarget.className = "toggle fa-solid fa-folder-open";
          } else {
            e.currentTarget.className = "toggle fa-solid fa-folder";
          }
        }
      });
    });
}

function saveData() {
  window.api.saveData(global_data);
}

function buildTree() {
  const folders = global_data.folders || [];
  const sessions = global_data.sessions || [];

  // Créer une map des dossiers pour accès rapide
  const folderMap = {};
  folders.forEach((folder) => {
    folderMap[folder.folder_id] = {
      ...folder,
      children: [],
      sessions: [],
    };
  });

  // Associer les dossiers enfants à leur parent
  folders.forEach((folder) => {
    if (folder.parent && folder.parent !== null && folderMap[folder.parent]) {
      folderMap[folder.parent].children.push(folderMap[folder.folder_id]);
    }
  });

  // Associer les sessions à leur dossier
  sessions.forEach((session) => {
    const folderId = session.folder_id;
    if (folderMap[folderId]) {
      folderMap[folderId].sessions.push(session);
    }
  });

  // Retourner la racine
  return folderMap["root"];
}

function buildStructureHTML(node) {
  const li = document.createElement("li");

  // Création de l'en-tête du dossier
  const folderHeader = document.createElement("span");
  folderHeader.draggable = true;
  folderHeader.className = "folder";
  folderHeader.id = node.folder_id;
  folderHeader.textContent = node.folder_name;

  folderHeader.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("type", "folder");
    e.dataTransfer.setData("id", node.folder_id);
  });

  folderHeader.addEventListener("dragover", (e) => {
    e.preventDefault(); // autorise le drop
  });

  folderHeader.addEventListener("dragenter", (e) => {
    e.preventDefault();
    folderHeader.classList.add("drag-over");
  });

  folderHeader.addEventListener("dragleave", () => {
    folderHeader.classList.remove("drag-over");
  });

  folderHeader.addEventListener("drop", (e) => {
    e.preventDefault();
    const draggedType = e.dataTransfer.getData("type");
    const draggedId = e.dataTransfer.getData("id");
    const targetFolderId = node.folder_id;
    console.log(draggedType);

    if (draggedType === "session") {
      console.log(e.dataTransfer);
      const session = global_data.sessions.find(
        (s) => s.session_id === draggedId
      );
      if (session) {
        session.folder_id = targetFolderId;
      }
    } else if (draggedType === "folder") {
      const folder = global_data.folders.find((f) => f.folder_id === draggedId);
      if (
        folder &&
        folder.folder_id !== targetFolderId &&
        folder.folder_id !== "root"
      ) {
        folder.parent = targetFolderId;
      }
    }

    saveData();
    refreshStructure();
  });

  const childrenUl = document.createElement("ul");
  childrenUl.className = "children";

  // Dossiers enfants
  (node.children || []).forEach((child) => {
    childrenUl.appendChild(buildStructureHTML(child));
  });

  // Sessions
  (node.sessions || []).forEach((session) => {
    const sessionLi = document.createElement("li");
    const sessionSpan = document.createElement("span");
    sessionSpan.draggable = true;
    sessionSpan.className = "session";
    sessionSpan.id = session.session_id;
    sessionSpan.textContent =
      session.session_name.length > 15
        ? session.session_name.substring(0, 12) + "..."
        : session.session_name;

    sessionSpan.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("type", "session");
      e.dataTransfer.setData("id", session.session_id);
    });
    sessionLi.appendChild(sessionSpan);
    childrenUl.appendChild(sessionLi);
  });

  // Ajouter le toggle uniquement si le dossier a du contenu
  if (childrenUl.childNodes.length > 0) {
    const toggle = document.createElement("i");
    toggle.className = "toggle fa-solid fa-folder-open";
    folderHeader.prepend(toggle); // Ajoute la flèche
    li.appendChild(folderHeader);
    li.appendChild(childrenUl);
  } else {
    // Dossier vide
    const toggle = document.createElement("i");
    toggle.className = "toggle fa-solid fa-folder";
    folderHeader.prepend(toggle); // Ajoute la flèche
    folderHeader.classList.add("no-toggle");
    li.appendChild(folderHeader);
  }

  return li;
}

function showFolderDetails(folderId, folderName) {
  console.log(`Dossier cliqué: ${folderName} (ID: ${folderId})`);
  // Ajoutez ici le code pour gérer l'affichage ou d'autres actions pour les dossiers
}

function showSessionDetails(sessionId, sessionName, sessionType) {
  console.log(
    `Session cliquée: ${sessionName} (Type: ${sessionType}, ID: ${sessionId})`
  );
  // Ajoutez ici le code pour gérer l'affichage ou d'autres actions pour les sessions
}

function createNewFolder() {
  const newFolderId = `F${Date.now()}`; // Generate a unique ID
  const newFolder = {
    folder_id: newFolderId,
    folder_name: "Nouveau Dossier",
    parent: selected_element[1] === "folder" ? selected_element[0].id : "root",
  };
  global_data.folders.push(newFolder);
  saveData();
  refreshStructure(global_data);
  enableRename(document.getElementById(newFolderId), newFolderId);
}

function enableRename(spanElement, id) {
  const currentName = spanElement.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentName;
  input.onblur = function () {
    const newName = input.value.trim();
    if (newName) {
      spanElement.textContent = newName;
      updateName(id, newName);
      saveData();
    } else {
      spanElement.textContent = currentName;
    }
  };
  spanElement.textContent = "";
  spanElement.appendChild(input);
  input.focus();
}

function updateName(id, newName) {
  if (id[0] === "F") {
    const folder = global_data.folders.find(
      (folder) => folder.folder_id === id
    );
    if (folder) {
      folder.folder_name = newName;
    }
  } else if (id[0] === "S") {
    const session = global_data.sessions.find(
      (session) => session.session_id === id
    );
    if (session) {
      session.session_name = newName;
    }
  }
}

function openPopup() {
  const selectedId =
    selected_element[0] == null
      ? document.getElementById("root").id
      : selected_element[0].id;
  window.api.openPopup(selectedId);
}

if (document.getElementById("newSessionForm")) {
  element_id = null;
  ipcRenderer.on("selected-element", (event, selected_element_id) => {
    console.log("Selected element for new session:", selected_element_id);
    element_id = selected_element_id;
  });
  document
    .getElementById("newSessionForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();

      session = {
        session_id: `S${Date.now()}`.substring(0, 10),
        session_name: document.getElementById("sessionName").value,
        session_type: document.getElementById("sessionType").value,
        host: document.getElementById("host").value,
        port: document.getElementById("port").value,
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
        folder_id: element_id[0] === "F" ? element_id : "root",
      };
      global_data.sessions.push(session);
      saveData();
      window.close();
    });
}

// Gestion des actions du menu contextuel

window.api.onContextAction((args) => {
  // Actions pour les dossiers
  if (args.action === "add-session") {
    openPopup();
  }
  if (args.action === "rename-folder") {
    enableRename(document.getElementById(args.folder_id), args.folder_id);
  }
  if (args.action === "delete-folder") {
    deleteFolder(args.folder_id);
  }
  // Actions pour les sessions
  if (args.action === "delete-session") {
    deleteSession(args.session_id);
  }
  if (args.action === "rename-session") {
    enableRename(document.getElementById(args.session_id), args.session_id);
  }
  if (args.action === "open-session") {
    global_data.sessions.forEach((session) => {
      if (session.session_id === args.session_id) {
        openTab(session);
      }
    });
  }
  if (args.action === "edit-session") {
    const session = global_data.sessions.find(
      (session) => session.session_id === args.session_id
    );
    if (session) {
    }
    // Ouvrir une fenêtre de modification de session
    ipcRenderer.invoke("open-edit-session-popup", session);
  }

  // Ajoute ici d’autres cas si besoin
});

// Supprime la sélection précédente
function clearSelection() {
  document
    .querySelectorAll(".selected")
    .forEach((el) => el.classList.remove("selected"));
}

document.addEventListener("contextmenu", function (e) {
  const folderEl = e.target.closest(".folder");
  const sessionEl = e.target.closest(".session");

  if (folderEl) {
    e.preventDefault();

    const folderId =
      selected_element[0] == null && hoveredElement != null
        ? hoveredElement.id
        : selected_element[0].id;

    window.api.showContextMenu("folder", { folder_id: folderId });
  }

  if (sessionEl) {
    e.preventDefault();

    // Appliquer la sélection
    sessionEl.classList.add("selected");

    const sessionId =
      selected_element[0] == null && hoveredElement != null
        ? hoveredElement.id
        : selected_element[0].id;

    window.api.showContextMenu("session", { session_id: sessionId });
  }
});

document.addEventListener("click", function (e) {
  selected_element = [null, null];
  if (e.target.closest(".folder") || e.target.closest(".session")) {
    clearSelection();
    e.target.classList.add("selected");
    selected_element = [
      e.target,
      e.target.classList.contains("folder") ? "folder" : "session",
    ];
  }
  // Si on clique en dehors des éléments de dossier ou de session, on nettoie la sélection
  if (
    !e.target.closest(".folder") &&
    !e.target.closest(".session") &&
    !e.target.closest(".menu_button")
  ) {
    clearSelection();
    selected_element = [null, null];
  }
});

document.addEventListener("mouseover", function (e) {
  if (e.target.closest(".folder") || e.target.closest(".session")) {
    hoveredElement = e.target.closest(".folder, .session");
  }
});

window.api.onRefreshStructure(() => {
  console.log("Refreshing structure in all windows");
  loadData();
});

// Fonction pour menu contextuel

function deleteSession(sessionId) {
  console.log("Deleting session:", sessionId);
  global_data.sessions = global_data.sessions.filter(
    (session) => session.session_id !== sessionId
  );
  saveData();
  loadData();
}

function deleteFolder(folderId) {
  console.log("Deleting folder:", folderId);
  global_data.folders = global_data.folders.filter(
    (folder) => folder.folder_id !== folderId
  );
  global_data.sessions = global_data.sessions.filter(
    (session) => session.folder_id !== folderId
  );
  saveData();
  loadData();
}

loadData();

document.addEventListener("dblclick", (e) => {
  const sessionEl = e.target.closest(".session");

  if (sessionEl) {
    const sessionId =
      selected_element[0] == null && hoveredElement != null
        ? hoveredElement.id
        : selected_element[0].id;

    global_data.sessions.forEach((session) => {
      if (session.session_id === sessionId) {
        openTab(session);
      }
    });
  }
});

function openTab(session) {
  const tabId = `tab-${session.session_id}`;
  const existingTab = document.getElementById(tabId);

  if (existingTab) {
    // Si déjà ouvert, on l'affiche
    activateTab(tabId);
    return;
  }

  // Créer le contenu terminal
  const terminalDiv = document.createElement("div");
  terminalDiv.id = tabId;
  terminalDiv.style.width = "100%";
  terminalDiv.style.height = "100%";
  terminalDiv.className = "terminal-tab";
  document.getElementById("tabs-container").appendChild(terminalDiv);

  // Créer l'onglet
  const tabButton = document.createElement("div");
  tabButton.className = "tab";
  tabButton.textContent = session.session_name;

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  closeBtn.className = "close-btn";
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    terminalDiv.remove();
    tabButton.remove();
    // Si l'onglet actif est supprimé, activer le dernier
    const remainingTabs = document.querySelectorAll(".tab");
    if (remainingTabs.length > 0) {
      activateTab(remainingTabs[remainingTabs.length - 1].dataset.tabId);
    }
  });

  tabButton.appendChild(closeBtn);
  tabButton.dataset.tabId = tabId;
  tabButton.addEventListener("click", () => {
    activateTab(tabId);
  });

  document.getElementById("tabs-bar").appendChild(tabButton);
  document.getElementById("tabs-bar").style.display = "flex";

  // Terminal
  const termWrapper = window.api.createTerminal({
    cols: 80,
    rows: 24,
    cursorBlink: true,
  });
  termWrapper.open(terminalDiv);
  termWrapper.write("Bienvenue dans xterm.js\r\n");

  terminals[tabId] = termWrapper;

  openSshTerminal(session, termWrapper);
  initSftp(session);

  activateTab(tabId);
}

function activateTab(tabId) {
  // Masquer tous les terminaux
  document.querySelectorAll(".terminal-tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Afficher celui sélectionné
  document.getElementById(tabId)?.classList.add("active");
  document
    .querySelector(`.tab[data-tab-id="${tabId}"]`)
    ?.classList.add("active");
}

async function openSshTerminal(session, terminal) {
  const sessionId = await window.api.startSshSession(session);

  window.api.on(`ssh-data-${sessionId}`, (data) => {
    terminal.write(data);
  });

  window.api.on(`ssh-end-${sessionId}`, () => {
    terminal.write("\r\n*** Connexion terminée ***\r\n");
  });
  let command = "";
  terminal.onData((data) => {
    window.api.send(`ssh-input-${sessionId}`, data);
    if (data === "\r") {
      console.log(command);
      let cmd = command.trim().split(" ")[0];
      let path = command.trim().split(" ")[1];
      path;
      if (cmd == "cd") {
        if (path == "..") {
          console.log(currentRemotePath.split("/"));
        }
        loadRemoteDir(command.trim().split(" ")[1]);
      }
      command = "";
    }
    command += data;
  });
}

async function browseSftp(session) {
  const sessionId = await window.api.startSftpSession(session);
  const remotePath = "/home"; // ou autre

  const list = await window.api.readDir(sessionId, remotePath);

  list.forEach((item) => {
    console.log(item.filename, item.longname);
    // Tu peux les afficher dans une UI de type "explorateur"
  });
}

async function initSftp(session) {
  currentSftpSession = await window.api.startSftpSession(session);
  loadRemoteDir(currentRemotePath);
}

async function loadRemoteDir(remotePath) {
  currentRemotePath = remotePath;
  const list = await window.api.readDir(currentSftpSession, remotePath);
  const ul = document.getElementById("sftp-list");
  ul.innerHTML = "";

  list.forEach((item) => {
    const li = document.createElement("li");
    li.style.cursor = "default";

    const icon = document.createElement("span");
    icon.style.marginRight = "8px";

    const isDir = item.longname && item.longname[0] === "d";
    if (isDir) {
      icon.textContent = "📁";
      li.style.fontWeight = "bold";
      li.style.cursor = "pointer";
      li.onclick = () => {
        const newPath = remotePath.endsWith("/")
          ? remotePath + item.filename
          : remotePath + "/" + item.filename;
        loadRemoteDir(newPath);
      };
    } else {
      icon.textContent = "📄";
    }

    li.appendChild(icon);
    li.appendChild(document.createTextNode(item.filename));
    ul.appendChild(li);
  });
  updateBreadcrumb(currentRemotePath);
}

function triggerUpload() {
  document.getElementById("sftp-upload").click();
}

document.getElementById("sftp-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const localPath = file.path;
  const remotePath = `${currentRemotePath}/${file.name}`;

  await window.api.upload(currentSftpSession, localPath, remotePath);
  await loadRemoteDir(currentRemotePath);
});

function updateBreadcrumb(path) {
  const breadcrumb = document.getElementById("breadcrumb");
  breadcrumb.innerHTML = "";

  const parts = path.split("/").filter((p) => p.length > 0);
  let accumulatedPath = "";

  const rootSpan = document.createElement("span");
  rootSpan.textContent = "/";
  rootSpan.style.cursor = "pointer";
  rootSpan.onclick = () => loadRemoteDir("/");
  breadcrumb.appendChild(rootSpan);

  parts.forEach((part, index) => {
    breadcrumb.appendChild(document.createTextNode(" / "));
    accumulatedPath += "/" + part;
    const partSpan = document.createElement("span");
    partSpan.textContent = part;
    partSpan.style.cursor = "pointer";
    partSpan.onclick = () => loadRemoteDir(accumulatedPath);
    breadcrumb.appendChild(partSpan);
  });
}
