/**
 * Runs in the browser after the HTML loads and before React hydrates
 * (Next.js client instrumentation).
 *
 * Development only: some browser extensions write attributes into every
 * element before React loads (Bitdefender TrafficLight adds
 * bis_skin_checked="1"; an image extension adds data-first-enter-image to
 * <img> tags). React then reports a hydration mismatch that has
 * nothing to do with the app. This removes those attributes as soon as they
 * appear, so the error overlay shows only real problems. Production builds
 * leave the page untouched.
 *
 * Extensions also throw their own errors inside the page. An error whose
 * stack lines all point to an extension script is dropped before the error
 * overlay and the terminal see it; anything with a line from the app is kept.
 */
const EXTENSION_ATTRIBUTES = ['bis_skin_checked', 'bis_register', 'data-first-enter-image'];

function stripExtensionAttributes() {
  const selector = EXTENSION_ATTRIBUTES.map((name) => `[${name}]`).join(',');
  for (const element of document.querySelectorAll(selector))
    for (const name of EXTENSION_ATTRIBUTES) element.removeAttribute(name);

  new MutationObserver((records) => {
    for (const record of records)
      if (record.target instanceof Element && record.attributeName)
        record.target.removeAttribute(record.attributeName);
  }).observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: EXTENSION_ATTRIBUTES,
  });
}

const EXTENSION_SCRIPT = /(chrome|moz|safari-web)-extension:\/\//;
/** A stack line that names a script ("at f (url:1:2)" or "f@url:1:2"). */
const STACK_FRAME = /^\s*at |@\S+:\d+:\d+$/;

/** True only when every frame of the stack is in an extension script. */
function onlyFromExtensions(reason: unknown): boolean {
  const stack = reason instanceof Error ? reason.stack : undefined;
  const frames = stack?.split('\n').filter((line) => STACK_FRAME.test(line)) ?? [];
  return frames.length > 0 && frames.every((line) => EXTENSION_SCRIPT.test(line));
}

function ignoreExtensionErrors() {
  // Registered before Next.js starts, so these listeners run first and can
  // stop the event from reaching the error overlay.
  const drop = (event: Event, reason: unknown) => {
    if (!onlyFromExtensions(reason)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  window.addEventListener('error', (event) => {
    drop(event, event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    drop(event, event.reason);
  });
}

if (process.env.NODE_ENV === 'development') {
  stripExtensionAttributes();
  ignoreExtensionErrors();
}
