const { contextBridge } = require("electron");
const { Terminal } = require("xterm");

contextBridge.exposeInMainWorld("xterm", {
  Terminal,
});
