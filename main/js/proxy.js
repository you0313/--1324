window.UtopiaProxy = (() => {
  function normalizeUrl(value) {
    const input = String(value || '').trim();
    if (!input) throw new Error('URLまたは検索語を入力してください。');
    if (/^(?:javascript|data|file|ftp|ws|wss|blob|about):/i.test(input)) {
      throw new Error('HTTPSのWebサイトのみ利用できます。');
    }
    const address = /^https?:\/\//i.test(input) ? input
      : input.startsWith('//') ? 'https:' + input
      : input.includes('.') && !/\s/.test(input) ? 'https://' + input
      : 'https://www.google.com/search?q=' + encodeURIComponent(input);
    let url;
    try {
      url = new URL(address);
    } catch {
      throw new Error('URLの形式を確認してください。');
    }
    if (url.username || url.password || (url.port && url.port !== '443')) {
      throw new Error('認証情報付きURLや標準以外のポートは利用できません。');
    }
    url.protocol = 'https:';
    return url.href;
  }

  async function prepare() {
    if (!window.isSecureContext || !('serviceWorker' in navigator)) {
      throw new Error('HTTPS接続とService Worker対応ブラウザーが必要です。');
    }
    const response = await fetch('/bare/', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('中継サーバーを利用できません。時間をおいて再試行してください。');
    const manifest = await response.json();
    if (!manifest.versions || !manifest.versions.includes('v1')) {
      throw new Error('中継サーバーの設定を確認してください。');
    }
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/service/',
      updateViaCache: 'none',
    });
    if (registration.active) return;
    const worker = registration.installing || registration.waiting;
    if (!worker) throw new Error('Service Workerを起動できませんでした。');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finish(new Error('Service Workerの起動がタイムアウトしました。')), 15000);
      function finish(error) {
        clearTimeout(timeout);
        worker.removeEventListener('statechange', changed);
        if (error) reject(error);
        else resolve();
      }
      function changed() {
        if (worker.state === 'activated') finish();
        else if (worker.state === 'redundant') finish(new Error('Service Workerの起動に失敗しました。'));
      }
      worker.addEventListener('statechange', changed);
      changed();
    });
  }

  function showError(error) {
    let output = document.getElementById('proxy-error');
    if (!output) {
      output = document.createElement('p');
      output.id = 'proxy-error';
      output.setAttribute('role', 'alert');
      (document.getElementById('mainContent') || document.body).appendChild(output);
    }
    output.textContent = error && error.name === 'TimeoutError'
      ? '接続がタイムアウトしました。時間をおいて再試行してください。'
      : error.message || 'プロキシを起動できませんでした。';
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }

  async function navigate(value, hiddenMode = false) {
    const url = normalizeUrl(value);
    const tab = hiddenMode ? window.open('about:blank', '_blank') : null;
    if (hiddenMode && !tab) throw new Error('ポップアップがブロックされました。Hidden Modeを無効にしてください。');
    if (tab) tab.opener = null;
    try {
      await prepare();
      const encoded = encodeURIComponent(url.split('').map((character, index) => index % 2
        ? String.fromCharCode(character.charCodeAt(0) ^ 2) : character).join(''));
      const destination = '/service/' + encoded;
      if (tab) {
        tab.document.title = 'Utopia';
        tab.document.body.style.margin = '0';
        const frame = tab.document.createElement('iframe');
        frame.src = window.location.origin + destination;
        frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0';
        frame.referrerPolicy = 'no-referrer';
        tab.document.body.replaceChildren(frame);
        window.top.location.replace('https://www.google.com');
      } else {
        window.location.href = destination;
      }
    } catch (error) {
      if (tab) tab.close();
      throw error;
    }
  }

  return { normalizeUrl, prepare, navigate, showError };
})();
