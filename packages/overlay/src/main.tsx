import { render } from "preact";
import { App } from "./App.js";

const mount = document.createElement("div");
mount.id = "ctf-overlay-root";
document.documentElement.appendChild(mount);

render(<App />, mount);
