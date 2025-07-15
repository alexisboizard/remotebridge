const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { Client } = require("ssh2");
//const pty = require("node-pty");
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
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
      nodeIntegration: false,
      contextIsolation: true,
      preload: "preload.js",
    },
  });
  popupWindow.webContents.on("did-finish-load", () => {
    popupWindow.webContents.send("selected-element", selectedElement);
  });
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
  popupWindow.loadFile("ui/html/create_session.html");
}

ipcMain.on("open-popup", (e, selected_element) => {
  createPopupWindow(selected_element);
});

// Permet de rafraîchir la structure dans toutes les fenêtres
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
        label: "Ouvrir la session",
        click: () => {
          event.sender.send("context-action", {
            action: "open-session",
            ...contextData,
          });
        },
      },
      {
        label: "Editer la session",
        click: () => {
          event.sender.send("context-action", {
            action: "edit-session",
            ...contextData,
          });
        },
      },
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

// Gérer les connexions SSH
ipcMain.handle("start-ssh-session", async (event, session) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      const shell = conn.shell({ term: "xterm-color" }, (err, stream) => {
        if (err) return reject(err);

        const sessionId = `ssh-${Date.now()}`;
        resolve(sessionId);

        stream.on("data", (data) => {
          event.sender.send(`ssh-data-${sessionId}`, data.toString());
        });

        ipcMain.on(`ssh-input-${sessionId}`, (_, input) => {
          stream.write(input);
        });

        conn.on("close", () => {
          event.sender.send(`ssh-end-${sessionId}`);
        });
      });
    });

    conn.on("error", (err) => {
      reject(err);
    });

    conn.connect({
      host: session.host,
      port: parseInt(session.port, 10),
      username: session.username,
      password: session.password,
    });
  });
});

const sftpClients = {}; // clé : sessionId, valeur : {conn, sftp}

ipcMain.handle("start-sftp-session", async (event, session) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        const sessionId = `sftp-${Date.now()}`;
        sftpClients[sessionId] = { conn, sftp };

        resolve(sessionId);
      });
    });

    conn.on("error", (err) => reject(err));

    conn.connect({
      host: session.host,
      port: parseInt(session.port, 10),
      username: session.username,
      password: session.password,
    });
  });
});

ipcMain.handle("sftp-read-dir", async (_, sessionId, remotePath) => {
  const { sftp } = sftpClients[sessionId];
  return new Promise((resolve, reject) => {
    sftp.readdir(remotePath, (err, list) => {
      if (err) return reject(err);
      resolve(
        list.map((item) => ({
          filename: item.filename,
          longname: item.longname,
        }))
      );
    });
  });
});

ipcMain.handle("sftp-download", async (_, sessionId, remotePath, localPath) => {
  const { sftp } = sftpClients[sessionId];
  return new Promise((resolve, reject) => {
    sftp.fastGet(remotePath, localPath, {}, (err) => {
      if (err) return reject(err);
      resolve("Download complete");
    });
  });
});

ipcMain.handle("sftp-upload", async (_, sessionId, localPath, remotePath) => {
  const { sftp } = sftpClients[sessionId];
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, {}, (err) => {
      if (err) return reject(err);
      resolve("Upload complete");
    });
  });
});

// Gérer la sauvegarde des sessions
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

// Gérer le chargmement des sessions
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
