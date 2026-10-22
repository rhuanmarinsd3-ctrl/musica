(() => {
  'use strict';
  const button = document.getElementById('download-apk');
  const status = document.getElementById('download-status');
  const apk = 'downloads/voz-e-sinais-demo.apk';
  if (!button || !status) return;

  const unavailable = () => {
    button.disabled = true;
    status.textContent = 'O APK ainda não está disponível neste site.';
  };
  if (!/^https?:$/.test(window.location.protocol)) {
    unavailable();
    return;
  }

  fetch(apk, { method: 'HEAD', cache: 'no-store' })
    .then(response => {
      const type = (response.headers.get('content-type') || '').toLowerCase();
      const size = Number(response.headers.get('content-length') || '0');
      // A página HTML de erro de uma hospedagem não é um APK.
      if (response.status !== 200 || size <= 0 || /text\/html/.test(type)) {
        unavailable();
        return;
      }
      button.disabled = false;
      status.textContent = 'APK de demonstração disponível, com modelo de transcrição em português incluído. A leitura em voz alta requer uma voz pt-BR offline no Android.';
      button.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = apk;
        link.download = 'voz-e-sinais-demo.apk';
        document.body.append(link);
        link.click();
        link.remove();
      });
    })
    .catch(unavailable);
})();
