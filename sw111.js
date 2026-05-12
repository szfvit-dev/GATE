const CACHE_NAME = 'ai-gate-v1.0.3';
const CACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './R0.png',
    './app1.png',
    './app2.png',
    './app3.png',
    './app4.png',
    './app5.png',
    './app7.png',
    './app8.png',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600;700&display=swap'
];

// 安裝事件 - 預快取資源
self.addEventListener('install', (event) => {
    console.log('[SW] 🔧 安裝中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] 📦 開始快取檔案');
                return cache.addAll(CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
            })
            .then(() => {
                console.log('[SW] ✅ 快取完成');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] ❌ 快取失敗:', err);
            })
    );
});

// 啟用事件 - 清理舊快取
self.addEventListener('activate', (event) => {
    console.log('[SW] 🚀 啟用中...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] 🗑️ 刪除舊快取:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] ✅ 啟用完成');
                return self.clients.claim();
            })
    );
});

// Fetch 事件 - 攔截請求
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳過 Chrome Extension 請求
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // 跳過非 GET 請求
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log('[SW] 📦 從快取載入:', url.pathname);
                    return cachedResponse;
                }

                console.log('[SW] 🌐 從網路載入:', url.pathname);
                return fetch(request)
                    .then(response => {
                        // 只快取成功的回應
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // 複製回應並存入快取
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseToCache);
                            });

                        return response;
                    })
                    .catch(err => {
                        console.error('[SW] ❌ Fetch 失敗:', err);
                        
                        // 返回離線頁面
                        return new Response(
                            `<!DOCTYPE html>
                            <html lang="zh-TW">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>離線模式</title>
                                <style>
                                    body {
                                        font-family: 'Noto Sans TC', sans-serif;
                                        background: #0a0e27;
                                        color: #00ffff;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100vh;
                                        margin: 0;
                                        text-align: center;
                                    }
                                    .offline-container {
                                        padding: 40px;
                                    }
                                    .offline-icon {
                                        font-size: 5rem;
                                        margin-bottom: 20px;
                                    }
                                    .offline-title {
                                        font-size: 2rem;
                                        margin-bottom: 10px;
                                    }
                                    .offline-desc {
                                        opacity: 0.8;
                                        margin-bottom: 30px;
                                    }
                                    .retry-button {
                                        background: linear-gradient(135deg, #0064ff 0%, #00ffff 100%);
                                        color: white;
                                        border: none;
                                        padding: 15px 40px;
                                        font-size: 1.1rem;
                                        font-weight: bold;
                                        cursor: pointer;
                                        border-radius: 5px;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="offline-container">
                                    <div class="offline-icon">📡</div>
                                    <div class="offline-title">離線模式</div>
                                    <div class="offline-desc">目前無法連線，請檢查網路連線</div>
                                    <button class="retry-button" onclick="location.reload()">重新載入</button>
                                </div>
                            </body>
                            </html>`,
                            {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: new Headers({
                                    'Content-Type': 'text/html; charset=utf-8'
                                })
                            }
                        );
                    });
            })
    );
});

// 訊息事件 - 接收來自頁面的訊息
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
