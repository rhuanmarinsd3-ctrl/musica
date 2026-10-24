(function () {
  'use strict';
  if (!window.NativeBridge || typeof window.NativeBridge.subscribe !== 'function') return;
  window.NativeBridge.subscribe(function (type, payload) {
    if (window.App && typeof window.App.onNativeEvent === 'function') window.App.onNativeEvent(type, payload);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      window.NativeBridge.stopListening();
      window.NativeBridge.stopSpeaking();
    }
  });
})();
