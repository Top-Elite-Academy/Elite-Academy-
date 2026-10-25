/**
 * Runs in the browser after the HTML loads and before React hydrates
 * (Next.js client instrumentation).
 *
 * Development only: some browser extensions write attributes into every
 * element before React loads (Bitdefender TrafficLight adds
 * bis_skin_checked="1"). React then reports a hydration mismatch that has
 * nothing to do with the app. This removes those attributes as soon as they
 * appear, so the error overlay shows only real problems. Production builds
 * leave the page untouched.
 */
const EXTENSION_ATTRIBUTES = ['bis_skin_checked', 'bis_register'];

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

if (process.env.NODE_ENV === 'development') stripExtensionAttributes();
