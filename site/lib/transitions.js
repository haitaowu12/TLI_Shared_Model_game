const ANIMATION_MAP = {
  forward: { exit: "slide-left", enter: "slide-right" },
  back: { exit: "slide-right", enter: "slide-left" },
  submit: { exit: "slide-down", enter: "slide-up" },
  reset: { exit: "scale", enter: "scale" },
};

export class TransitionManager {
  constructor(options = {}) {
    this.duration = options.duration ?? 300;
    this._pending = null;
  }

  transition(fromEl, toEl, type) {
    this._cancel();
    const mapping = ANIMATION_MAP[type] || ANIMATION_MAP.forward;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      if (fromEl) fromEl.remove();
      if (toEl) this._moveFocus(toEl);
      return Promise.resolve();
    }

    let p = Promise.resolve();

    if (fromEl) {
      p = p.then(() => this._run(fromEl, "exit", mapping.exit)).then(() => {
        if (fromEl.parentNode) fromEl.remove();
      });
    }

    if (toEl) {
      p = p.then(() => this._run(toEl, "enter", mapping.enter)).then(() => {
        this._moveFocus(toEl);
      });
    }

    return p;
  }

  exit(el, type) {
    this._cancel();
    const mapping = ANIMATION_MAP[type] || ANIMATION_MAP.forward;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      el.remove();
      return Promise.resolve();
    }

    return this._run(el, "exit", mapping.exit).then(() => {
      if (el.parentNode) el.remove();
    });
  }

  enter(el, type) {
    const mapping = ANIMATION_MAP[type] || ANIMATION_MAP.forward;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      this._moveFocus(el);
      return Promise.resolve();
    }

    return this._run(el, "enter", mapping.enter).then(() => {
      this._moveFocus(el);
    });
  }

  _run(el, phase, animation) {
    return new Promise((resolve) => {
      const phaseClass = `screen-${phase}`;
      const animClass = `screen-${phase}--${animation}`;
      el.style.setProperty("--screen-transition-duration", `${this.duration}ms`);
      el.classList.add(phaseClass, animClass);

      const handler = (e) => {
        if (e.target !== el) return;
        el.removeEventListener("animationend", handler);
        el.classList.remove(phaseClass, animClass);
        el.style.removeProperty("--screen-transition-duration");
        this._pending = null;
        resolve();
      };

      this._pending = { el, phaseClass, animClass, handler, resolve };
      el.addEventListener("animationend", handler);
    });
  }

  _cancel() {
    if (!this._pending) return;
    const { el, phaseClass, animClass, handler, resolve } = this._pending;
    el.removeEventListener("animationend", handler);
    el.classList.remove(phaseClass, animClass);
    el.style.removeProperty("--screen-transition-duration");
    this._pending = null;
    resolve();
  }

  _moveFocus(el) {
    const target = el.querySelector(
      "button, textarea, [tabindex]:not([tabindex='-1'])",
    );
    if (target) target.focus();
  }
}
