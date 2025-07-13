const { Terminal } = require("xterm");

document.addEventListener("DOMContentLoaded", () => {
  const terminalContainer = document.getElementById("terminal");
  const term = new Terminal();
  term.open(terminalContainer);
  term.write("Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ");
});
