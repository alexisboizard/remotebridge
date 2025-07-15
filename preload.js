// preload.js
const { contextBridge, ipcRenderer } = require("electron");
const { Terminal } = require("xterm");

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
  createTerminal: (options = {}) => {
    const term = new Terminal(options);
    return {
      open: (element) => term.open(element),
      write: (data) => term.write(data),
      onData: (callback) => term.onData(callback),
      dispose: () => term.dispose(),
      fit: () => {
        // Tu peux ajouter un fit si tu utilises xterm-addon-fit
      },
    };
  },
  startSshSession: (session) =>
    ipcRenderer.invoke("start-ssh-session", session),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) =>
    ipcRenderer.on(channel, (_, data) => callback(data)),
  startSftpSession: (session) =>
    ipcRenderer.invoke("start-sftp-session", session),
  readDir: (sessionId, path) =>
    ipcRenderer.invoke("sftp-read-dir", sessionId, path),
  download: (sessionId, remotePath, localPath) =>
    ipcRenderer.invoke("sftp-download", sessionId, remotePath, localPath),
  upload: (sessionId, localPath, remotePath) =>
    ipcRenderer.invoke("sftp-upload", sessionId, localPath, remotePath),
});
