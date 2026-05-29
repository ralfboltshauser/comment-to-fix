export const LIVE_RELOAD_CLIENT = `(function () {
  var PENDING_KEY = "ctf-pending-reload";
  var reconnectDelay = 1000;

  function isFeedbackActive() {
    return document.documentElement.hasAttribute("data-ctf-feedback");
  }

  function hotSwapCss(path) {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.endsWith(path) || href.indexOf(path + "?") !== -1) {
        var base = href.split("?")[0];
        links[i].setAttribute("href", base + "?t=" + Date.now());
        return;
      }
    }
  }

  function queueReload() {
    try {
      sessionStorage.setItem(PENDING_KEY, "1");
      window.dispatchEvent(new Event("ctf-pending-reload"));
    } catch (e) {}
  }

  function handleMessage(data) {
    var event;
    try {
      event = JSON.parse(data);
    } catch (e) {
      if (!isFeedbackActive()) location.reload();
      else queueReload();
      return;
    }
    if (event.kind === "css") {
      hotSwapCss(event.path);
      return;
    }
    if (event.kind === "processed") {
      window.dispatchEvent(new CustomEvent("ctf-processed", { detail: event }));
      return;
    }
    if (event.kind === "html" || event.kind === "js") {
      if (isFeedbackActive()) queueReload();
      else location.reload();
    }
  }

  function connect() {
    var source = new EventSource("/__ctf__/events");
    source.onmessage = function (e) {
      handleMessage(e.data);
    };
    source.onopen = function () {
      reconnectDelay = 1000;
    };
    source.onerror = function () {
      source.close();
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    };
  }

  connect();
})();`;

export const INJECT_SNIPPET = (root: string) => `<script src="/__ctf__/live.js" defer></script>
<script src="/__ctf__/overlay.js" data-api="/__ctf__/comment" data-root="${root.replace(/"/g, "&quot;")}" defer></script>`;

export function injectHtml(html: string, root: string): string {
  const snippet = INJECT_SNIPPET(root);
  const lower = html.toLowerCase();
  const bodyClose = lower.lastIndexOf("</body>");

  if (bodyClose !== -1) {
    return `${html.slice(0, bodyClose)}${snippet}\n${html.slice(bodyClose)}`;
  }

  return `${html}\n${snippet}`;
}
