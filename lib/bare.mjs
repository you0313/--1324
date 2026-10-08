import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { validateHeaderName, validateHeaderValue } from 'node:http';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import ipaddr from 'ipaddr.js';

class ProxyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function responseHeaders() {
  return {
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
}

export function isPublicAddress(address) {
  try {
    const parsed = ipaddr.process(address);
    if (parsed.range() !== 'unicast') return false;
    return parsed.kind() === 'ipv4' || parsed.match(ipaddr.parse('2000::'), 3);
  } catch {
    return false;
  }
}

function assertSameOrigin(request) {
  const origin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (suppliedOrigin && suppliedOrigin !== origin) {
    throw new ProxyError(403, 'このサイト以外からの中継リクエストは許可されていません。');
  }
  if (fetchSite && fetchSite !== 'same-origin') {
    throw new ProxyError(403, 'このサイト以外からの中継リクエストは許可されていません。');
  }
  if (fetchSite === 'same-origin' || suppliedOrigin === origin) return;
  try {
    if (new URL(request.headers.get('referer')).origin === origin) return;
  } catch {}
  throw new ProxyError(403, 'このサイトの検索欄からプロキシを開いてください。');
}

export function readTarget(request) {
  const protocol = request.headers.get('x-bare-protocol');
  const port = request.headers.get('x-bare-port');
  const host = request.headers.get('x-bare-host');
  const path = request.headers.get('x-bare-path');
  if (protocol !== 'https:' || port !== '443') {
    throw new ProxyError(403, '安全な接続のため、HTTPS（ポート443）のみ利用できます。');
  }
  if (!host || !path || !path.startsWith('/') || /[\s#\\]/.test(host) || /[\r\n#]/.test(path)) {
    throw new ProxyError(400, '接続先のURLが不正です。');
  }
  let url;
  try {
    url = new URL(`https://${host}/`);
  } catch {
    throw new ProxyError(400, '接続先のURLが不正です。');
  }
  if (url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new ProxyError(400, '接続先のURLが不正です。');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (hostname === new URL(request.url).hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '')) {
    throw new ProxyError(403, 'プロキシ自身への中継は許可されていません。');
  }
  if (isIP(hostname) && !isPublicAddress(hostname)) {
    throw new ProxyError(403, '内部ネットワークや予約済みアドレスへの接続は許可されていません。');
  }
  return { hostname, host: url.host, path };
}

export function readUpstreamHeaders(request, target) {
  const serialized = request.headers.get('x-bare-headers');
  if (!serialized || Buffer.byteLength(serialized) > 12000) {
    throw new ProxyError(400, '中継ヘッダーが不正、または大きすぎます。');
  }
  let input;
  try {
    input = JSON.parse(serialized);
  } catch {
    throw new ProxyError(400, '中継ヘッダーが不正です。');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ProxyError(400, '中継ヘッダーが不正です。');
  }
  const blocked = new Set([
    'host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'te', 'trailer',
    'content-length', 'accept-encoding', 'proxy-authorization', 'proxy-authenticate',
  ]);
  const connection = Object.entries(input).find(([name]) => name.toLowerCase() === 'connection');
  if (connection && typeof connection[1] === 'string') {
    for (const name of connection[1].split(',')) blocked.add(name.trim().toLowerCase());
  }
  const headers = Object.create(null);
  for (const [name, value] of Object.entries(input)) {
    const normalized = name.toLowerCase();
    if (blocked.has(normalized) || /^(?:sec-|proxy-|x-forwarded-|x-netlify-|x-bare-)/.test(normalized) || normalized === 'forwarded') continue;
    if (typeof value !== 'string' && !(Array.isArray(value) && value.every(item => typeof item === 'string'))) {
      throw new ProxyError(400, '中継ヘッダーが不正です。');
    }
    try {
      validateHeaderName(name);
      for (const item of Array.isArray(value) ? value : [value]) validateHeaderValue(name, item);
    } catch {
      throw new ProxyError(400, '中継ヘッダーが不正です。');
    }
    headers[normalized] = value;
  }
  for (const name of ['content-type', 'user-agent']) {
    if (!headers[name] && request.headers.has(name)) headers[name] = request.headers.get(name);
  }
  headers.host = target.host;
  headers['accept-encoding'] = 'gzip, deflate, br';
  return headers;
}

export async function readLimited(stream, signal, maximum = 4 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    signal.throwIfAborted();
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maximum) throw new ProxyError(413, '通信データが上限の4 MiBを超えました。');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
}

async function publicDestination(hostname, signal) {
  if (isIP(hostname)) return { address: hostname, family: isIP(hostname) };
  const addresses = await new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    lookup(hostname, { all: true }).then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
    if (signal.aborted) onAbort();
  });
  if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) {
    throw new ProxyError(403, '内部ネットワークや予約済みアドレスへの接続は許可されていません。');
  }
  return addresses.find(entry => entry.family === 4) || addresses[0];
}

async function relay(request, target, headers, body, signal) {
  const destination = await publicDestination(target.hostname, signal);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const upstream = httpsRequest({
      hostname: target.hostname,
      port: 443,
      path: target.path,
      method: request.method,
      headers,
      signal,
      agent: false,
      rejectUnauthorized: true,
      lookup: (hostname, options, callback) => {
        if (options.all) callback(null, [destination]);
        else callback(null, destination.address, destination.family);
      },
    }, async response => {
      const metadata = { ...response.headers };
      let stream = response;
      try {
        if (request.method !== 'HEAD' && ![204, 304].includes(response.statusCode)) {
          const encoding = metadata['content-encoding'];
          if (encoding === 'gzip') stream = response.pipe(createGunzip());
          else if (encoding === 'deflate') stream = response.pipe(createInflate());
          else if (encoding === 'br') stream = response.pipe(createBrotliDecompress());
          else if (encoding && encoding !== 'identity') throw new ProxyError(502, '接続先の圧縮形式に対応していません。');
        }
        if (stream !== response) response.on('error', error => stream.destroy(error));
        const payload = await readLimited(stream, signal);
        for (const name of ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'trailer']) delete metadata[name];
        const serialized = JSON.stringify(metadata);
        if (Buffer.byteLength(serialized) > 12000) throw new ProxyError(502, '接続先の応答ヘッダーが大きすぎます。');
        resolve(new Response(request.method === 'HEAD' ? null : payload, {
          headers: {
            ...responseHeaders(),
            'Content-Type': 'application/octet-stream',
            'x-bare-status': String(response.statusCode),
            'x-bare-status-text': response.statusMessage || '',
            'x-bare-headers': serialized,
          },
        }));
      } catch (error) {
        reject(error);
        stream.destroy();
        response.destroy();
        upstream.destroy();
      }
    });
    upstream.on('error', reject);
    upstream.end(body);
  });
}

export async function handleBareRequest(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort, { once: true });
  try {
    if (request.signal.aborted) controller.abort();
    assertSameOrigin(request);
    const path = new URL(request.url).pathname;
    if (path === '/bare/' || path === '/bare') {
      if (request.method !== 'GET' && request.method !== 'HEAD') throw new ProxyError(405, 'このメソッドは利用できません。');
      return new Response(request.method === 'HEAD' ? null : JSON.stringify({ versions: ['v1'], websocket: false, httpsOnly: true }), {
        headers: { ...responseHeaders(), 'Content-Type': 'application/json' },
      });
    }
    if (path.includes('/ws-')) throw new ProxyError(501, 'この構成ではWebSocket通信には対応していません。');
    if (path !== '/bare/v1/' && path !== '/bare/v1') throw new ProxyError(404, '中継先が見つかりません。');
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(request.method)) {
      throw new ProxyError(405, 'このメソッドは利用できません。');
    }
    const target = readTarget(request);
    const headers = readUpstreamHeaders(request, target);
    const body = request.body ? await readLimited(request.body, controller.signal) : undefined;
    return await relay(request, target, headers, body, controller.signal);
  } catch (error) {
    const status = error instanceof ProxyError ? error.status : controller.signal.aborted ? 504 : 502;
    const message = error instanceof ProxyError ? error.message : status === 504
      ? '接続がタイムアウトしました。時間をおいて再試行してください。'
      : '接続先に安全に接続できませんでした。URLやHTTPS対応を確認してください。';
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ message }), {
      status,
      headers: { ...responseHeaders(), 'Content-Type': 'application/json; charset=utf-8' },
    });
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abort);
  }
}
