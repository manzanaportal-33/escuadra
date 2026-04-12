/**
 * Polyfill de Node 'util' para web.
 * Metro/Expo en web no provee util.inherits; varios paquetes lo usan.
 */
function inherits(ctor, superCtor) {
  if (ctor === superCtor) return;
  if (superCtor === null || typeof superCtor !== 'function') {
    throw new TypeError('Super constructor must be a function');
  }
  ctor.super_ = superCtor;
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
  } else {
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: { value: ctor, writable: true, configurable: true },
    });
  }
}

module.exports = {
  inherits,
  inspect: (v) => (v === undefined ? 'undefined' : JSON.stringify(v)),
};
