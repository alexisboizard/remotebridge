const { app, BrowserWindow, ipcMain } = require("electron");
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

function createPopupWindow() {
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

  popupWindow.loadFile("ui/create_session.html");

  // À la fermeture de la popup, notifier la fenêtre principale
  popupWindow.on("closed", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("refresh-structure");
    }
  });
}

ipcMain.on("open-popup", (event) => {
  createPopupWindow();
});

// Ajout : relayer le message de refresh à toutes les fenêtres
ipcMain.on("refresh-structure", (event) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("refresh-structure");
  });
});
