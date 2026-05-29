const EXCLUDE_ATTRS = ["data-ctf-toolbar", "data-ctf-popup", "data-ctf-marker", "data-ctf-root"];
const NOT_SELECTORS = EXCLUDE_ATTRS.flatMap((a) => [`:not([${a}])`, `:not([${a}] *)`]).join("");
const STYLE_ID = "ctf-freeze-styles";
const STATE_KEY = "__ctf_freeze";

type FreezeState = {
  frozen: boolean;
  installed: boolean;
  origSetTimeout: typeof setTimeout;
  origSetInterval: typeof setInterval;
  origRAF: typeof requestAnimationFrame;
  pausedAnimations: Animation[];
  frozenTimeoutQueue: Array<() => void>;
  frozenRAFQueue: FrameRequestCallback[];
};

function getState(): FreezeState {
  if (typeof window === "undefined") {
    return {
      frozen: false,
      installed: true,
      origSetTimeout: setTimeout,
      origSetInterval: setInterval,
      origRAF: (cb: FrameRequestCallback) => 0 as unknown as number,
      pausedAnimations: [],
      frozenTimeoutQueue: [],
      frozenRAFQueue: [],
    };
  }
  const w = window as Window & { [STATE_KEY]?: FreezeState };
  if (!w[STATE_KEY]) {
    w[STATE_KEY] = {
      frozen: false,
      installed: false,
      origSetTimeout: null!,
      origSetInterval: null!,
      origRAF: null!,
      pausedAnimations: [],
      frozenTimeoutQueue: [],
      frozenRAFQueue: [],
    };
  }
  return w[STATE_KEY]!;
}

const _s = getState();

if (typeof window !== "undefined" && !_s.installed) {
  _s.origSetTimeout = window.setTimeout.bind(window);
  _s.origSetInterval = window.setInterval.bind(window);
  _s.origRAF = window.requestAnimationFrame.bind(window);

  window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    if (typeof handler === "string") return _s.origSetTimeout(handler, timeout);
    return _s.origSetTimeout(
      (...a: unknown[]) => {
        if (_s.frozen) {
          _s.frozenTimeoutQueue.push(() => (handler as (...args: unknown[]) => void)(...a));
        } else {
          (handler as (...args: unknown[]) => void)(...a);
        }
      },
      timeout,
      ...args,
    );
  }) as typeof setTimeout;

  window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    if (typeof handler === "string") return _s.origSetInterval(handler, timeout);
    return _s.origSetInterval(
      (...a: unknown[]) => {
        if (!_s.frozen) (handler as (...args: unknown[]) => void)(...a);
      },
      timeout,
      ...args,
    );
  }) as typeof setInterval;

  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    return _s.origRAF((timestamp: number) => {
      if (_s.frozen) {
        _s.frozenRAFQueue.push(callback);
      } else {
        callback(timestamp);
      }
    });
  }) as typeof requestAnimationFrame;

  _s.installed = true;
}

export const originalSetTimeout = _s.origSetTimeout;
export const originalSetInterval = _s.origSetInterval;
export const originalRequestAnimationFrame = _s.origRAF;

function isOverlayElement(el: Element | null): boolean {
  if (!el) return false;
  return EXCLUDE_ATTRS.some((attr) => !!el.closest?.(`[${attr}]`));
}

export function freezeAnimations(): void {
  if (typeof document === "undefined" || _s.frozen) return;
  _s.frozen = true;
  _s.frozenTimeoutQueue = [];
  _s.frozenRAFQueue = [];

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
  }
  style.textContent = `
    *${NOT_SELECTORS},
    *${NOT_SELECTORS}::before,
    *${NOT_SELECTORS}::after {
      animation-play-state: paused !important;
      transition: none !important;
    }
  `;
  document.head.appendChild(style);

  _s.pausedAnimations = [];
  try {
    document.getAnimations().forEach((anim) => {
      if (anim.playState !== "running") return;
      const target = (anim.effect as KeyframeEffect | null)?.target as Element | null;
      if (!isOverlayElement(target)) {
        anim.pause();
        _s.pausedAnimations.push(anim);
      }
    });
  } catch {
    // ignore
  }

  document.querySelectorAll("video").forEach((video) => {
    if (!video.paused) {
      video.dataset.ctfWasPaused = "false";
      video.pause();
    }
  });
}

export function unfreezeAnimations(): void {
  if (typeof document === "undefined" || !_s.frozen) return;
  _s.frozen = false;

  const timeoutQueue = _s.frozenTimeoutQueue;
  _s.frozenTimeoutQueue = [];
  for (const cb of timeoutQueue) {
    _s.origSetTimeout(() => {
      if (_s.frozen) {
        _s.frozenTimeoutQueue.push(cb);
        return;
      }
      try {
        cb();
      } catch {
        // ignore
      }
    }, 0);
  }

  const rafQueue = _s.frozenRAFQueue;
  _s.frozenRAFQueue = [];
  for (const cb of rafQueue) {
    _s.origRAF((ts: number) => {
      if (_s.frozen) {
        _s.frozenRAFQueue.push(cb);
        return;
      }
      cb(ts);
    });
  }

  for (const anim of _s.pausedAnimations) {
    try {
      anim.play();
    } catch {
      // ignore
    }
  }
  _s.pausedAnimations = [];

  document.getElementById(STYLE_ID)?.remove();

  document.querySelectorAll("video").forEach((video) => {
    if (video.dataset.ctfWasPaused === "false") {
      video.play().catch(() => {});
      delete video.dataset.ctfWasPaused;
    }
  });
}

export function isFrozen(): boolean {
  return _s.frozen;
}

export function toggleFreeze(): boolean {
  if (_s.frozen) {
    unfreezeAnimations();
    return false;
  }
  freezeAnimations();
  return true;
}
