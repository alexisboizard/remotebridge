const saved_sessions_file = "../config/session.json";
const { ipcRenderer } = require("electron");
const { glob } = require("original-fs");
let global_data = { sessions: [], folders: [] };

async function loadData() {
  global_data = await ipcRenderer.invoke("load-data");
  refreshStructure(global_data);
}

function refreshStructure() {
  const tree = buildTree();
  const structureDiv = document.getElementById("tree");
  // Vider le contenu avant d'ajouter la nouvelle structure
  structureDiv.innerHTML = "";
  let structureHTML = buildStructureHTML(tree);
  if (
    structureHTML !== "" ||
    structureHTML !== null ||
    structureDiv !== undefined
  ) {
    structureDiv.appendChild(structureHTML);
  }
}

function saveData() {
  ipcRenderer.send("save-data", global_data);
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
  const ul = document.createElement("ul");
  const li = document.createElement("li");

  // Affichage du dossier
  const span = document.createElement("span");
  span.className = "folder";
  span.textContent = node.folder_name;
  span.setAttribute("ondblclick", `enableRename(this, '${node.folder_id}')`);
  li.appendChild(span);

  // Affichage des enfants (dossiers et sessions)
  const childrenOl = document.createElement("ul");

  // Sous-dossiers
  (node.children || []).forEach((child) => {
    childrenOl.appendChild(buildStructureHTML(child));
  });

  // Sessions
  (node.sessions || []).forEach((session) => {
    const sessionLi = document.createElement("li");
    sessionLi.className = "session";
    const displayName =
      session.session_name.length > 15
        ? session.session_name.substring(0, 12) + "..."
        : session.session_name;
    sessionLi.setAttribute(
      "onclick",
      `showSessionDetails('${session.session_id}', '${displayName}', '${session.session_type}')`
    );
    const sessionSpan = document.createElement("span");
    sessionSpan.textContent = displayName;
    sessionLi.appendChild(sessionSpan);
    childrenOl.appendChild(sessionLi);
  });

  // Ajouter la liste des enfants si elle n'est pas vide
  if (childrenOl.childNodes.length > 0) {
    li.appendChild(childrenOl);
  }
  ul.appendChild(li);
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
  const newFolderId = `F${Date.now()}`.substring(0, 10); // Generate a unique ID
  const newFolder = {
    folder_id: newFolderId,
    folder_name: "Nouveau Dossier",
    parent: "root",
  };
  global_data.folders.push(newFolder);
  saveData();
  refreshStructure(global_data);
  enableRename(document.getElementById(newFolderId), newFolderId);
}

function enableRename(spanElement, folderId) {
  const currentName = spanElement.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentName;
  input.onblur = function () {
    const newName = input.value.trim();
    if (newName) {
      spanElement.textContent = newName;
      updateFolderName(folderId, newName);
      saveData();
    } else {
      spanElement.textContent = currentName;
    }
  };
  spanElement.textContent = "";
  spanElement.appendChild(input);
  input.focus();
}

function updateFolderName(folderId, newName) {
  const folder = global_data.folders.find(
    (folder) => folder.folder_id === folderId
  );
  if (folder) {
    folder.folder_name = newName;
  }
}

function openPopup() {
  ipcRenderer.send("open-popup");
}

function createNewSession(session) {
  const newSession = {
    session_id: session.session_id,
    session_name: session.session_name,
    session_type: session.session_type,
    host: session.host,
    port: session.port,
    username: session.username,
    password: session.password,
    folder_id: "root",
  };
  console.log("Creating new session:", newSession);
  global_data.sessions.push(newSession);
  saveData();
}

if (document.getElementById("newSessionForm")) {
  document
    .getElementById("newSessionForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();

      session = {
        session_id: `S${Date.now()}`.substring(0, 10),
        session_type: document.getElementById("sessionType").value,
        session_name: document.getElementById("sessionName").value,
        host: document.getElementById("host").value,
        port: document.getElementById("port").value,
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      };
      createNewSession(session);
      window.close();
    });
}

loadData();
