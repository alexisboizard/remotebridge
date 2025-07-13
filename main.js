const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
let mainWindow;

ipcMain.on("save-data", (event, data) => {
  const dataPath = path.join(__dirname, "config/session.json");
  console.log("Saving data to", dataPath);
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    console.log("Data saved successfully");
  } catch (err) {
    console.error("Error saving data:", err);
  }
});

ipcMain.handle("load-data", async (event) => {
  const dataPath = path.join(__dirname, "config/session.json");
  console.log("Loading data from", dataPath);
  try {
    const data = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading file:", err);
    return { sessions: [], folders: [] };
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "ui/index.html"));
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function createPopupWindow(selectedElement) {
  const popupWindow = new BrowserWindow({
    width: 900,
    height: 420,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  popupWindow.webContents.on("did-finish-load", () => {
    popupWindow.webContents.send("selected-element", selectedElement);
  });
  console.log("Opening popup for element:", selectedElement);
  popupWindow.loadFile("ui/create_session.html");
  // Fermer la popup si l'utilisateur clique en dehors ou presse Échap
  popupWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape" || input.type === "mouseDownOutside") {
      popupWindow.close();
    }
  });
  // À la fermeture de la popup, notifier la fenêtre principale
  popupWindow.on("closed", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("refresh-structure");
    }
  });
}

ipcMain.on("open-popup", (e, selected_element) => {
  createPopupWindow(selected_element);
});

ipcMain.on("refresh-structure", (event) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("refresh-structure");
  });
});

// Gérer le menu contextuel personnalisé
ipcMain.handle("show-context-menu", (event, contextType, contextData) => {
  const template = [];

  if (contextType === "folder") {
    template.push(
      {
        label: "Ajouter une session",
        click: () => {
          event.sender.send("context-action", {
            action: "add-session",
            ...contextData,
          });
        },
      },
      {
        label: "Renommer le dossier",
        click: () => {
          event.sender.send("context-action", {
            action: "rename-folder",
            ...contextData,
          });
        },
      },
      {
        label: "Supprimer le dossier",
        click: () => {
          event.sender.send("context-action", {
            action: "delete-folder",
            ...contextData,
          });
        },
      }
    );
  }

  if (contextType === "session") {
    template.push(
      {
        label: "Renommer la session",
        click: () => {
          event.sender.send("context-action", {
            action: "rename-session",
            ...contextData,
          });
        },
      },
      {
        label: "Supprimer la session",
        click: () => {
          event.sender.send("context-action", {
            action: "delete-session",
            ...contextData,
          });
        },
      }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});
