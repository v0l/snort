# Preact + HTM — Nostr Firehose

A single-file Nostr firehose showing recent kind 1 events from multiple relays.

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nostr Firehose</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      min-height: 100vh;
    }

    .app {
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      margin-bottom: 20px;
      color: #fff;
    }

    .feed {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .note {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #3a3a3a;
    }

    .note-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #444;
      object-fit: cover;
    }

    .author-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .author-name {
      font-weight: 600;
      color: #fff;
      font-size: 14px;
    }

    .pubkey {
      font-family: monospace;
      font-size: 11px;
      color: #888;
    }

    .note-text {
      line-height: 1.5;
      color: #e0e0e0;
      word-break: break-word;
    }

    .relay {
      color: #64b5f6;
      font-size: 11px;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #888;
    }
  </style>

  <script type="importmap">
    {
      "imports": {
        "preact": "https://esm.sh/preact",
        "preact/": "https://esm.sh/preact/",
        "htm/preact": "https://esm.sh/htm/preact?external=preact",
        "@snort/system": "https://esm.sh/@snort/system"
      }
    }
  </script>
</head>

<body>
  <div id="app"></div>

  <script type="module">
    import { h, render } from 'preact';
    import { html } from 'htm/preact';
    import { useState, useEffect } from 'preact/hooks';
    import { NostrSystem, RequestBuilder, EventExt } from '@snort/system';

    const POPULAR_RELAYS = [
      'wss://relay.snort.social',
      'wss://nos.lol',
      'wss://relay.damus.io',
      'wss://relay.primal.net'
    ];

    const system = new NostrSystem({});

    // Profile component that subscribes to cache updates
    function Profile({ pubkey }) {
      const [profile, setProfile] = useState(system.profileCache.getFromCache(pubkey));

      useEffect(() => {
        // Subscribe to profile cache updates for this pubkey
        const unsubscribe = system.profileCache.subscribe(pubkey, () => {
          setProfile(system.profileCache.getFromCache(pubkey));
        });

        return () => {
          unsubscribe();
        };
      }, [pubkey]);

      const displayName = profile?.display_name || profile?.name || pubkey.slice(0, 12) + '...';
      const avatar = profile?.picture || 'https://via.placeholder.com/32';

      return html`
        <div class="note-header">
          <img class="avatar" src="${avatar}" alt="" />
          <div class="author-info">
            <span class="author-name">${displayName}</span>
            <span class="pubkey">${pubkey.slice(0, 12)}...</span>
          </div>
        </div>
      `;
    }

    function App() {
      const [events, setEvents] = useState([]);

      useEffect(() => {
        const rb = new RequestBuilder('firehose');
        rb.withOptions({leaveOpen: true});
        rb.withFilter().kinds([1]).limit(10);
        rb.withRelays(POPULAR_RELAYS);

        const q = system.Query(rb);
        q.on("event", (evs) => {
          setEvents(prev => [...evs, ...prev].slice(0, 100).sort((a, b) => b.created_at - a.created_at));
          
          // Request profiles for new authors - profileLoader handles fetching automatically
          const pubkeys = evs.map(ev => ev.pubkey);
          system.profileLoader.TrackKeys(pubkeys);
        });
        q.start();
      }, []);

      return html`
        <div class="app">
          <h1>Nostr Firehose</h1>
          <div class="feed">
            ${events.map(ev => html`
              <div class="note" key=${ev.id}>
                <${Profile} pubkey=${ev.pubkey} />
                <div class="note-text">${ev.content}</div>
              </div>
            `)}
          </div>
        </div>
      `;
    }

    render(html`<${App} />`, document.getElementById('app'));
  </script>
</body>

</html>
```

Save as `.html` and open in browser — shows live kind 1 events from 5 popular relays.
