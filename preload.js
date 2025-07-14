// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  loadData: () => ipcRenderer.invoke("load-data"),
  saveData: (data) => ipcRenderer.send("save-data", data),
  onContextAction: (callback) =>
    ipcRenderer.on("context-action", (event, args) => callback(args)),
  showContextMenu: (type, data) =>
    ipcRenderer.invoke("show-context-menu", type, data),
  onRefreshStructure: (callback) =>
    ipcRenderer.on("refresh-structure", callback),
  openPopup: (data) => ipcRenderer.postMessage("open-popup", data),
  sendSSHInput: (data) => ipcRenderer.send("ssh-input", data),
  startSSHSession: (session) =>
    ipcRenderer.invoke("start-ssh-session", session),
});
