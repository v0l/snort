import { defineConfig } from 'vitepress'

const systemItems = [
  { text: 'Overview', link: '/packages/system' },
  { text: 'NostrSystem', link: '/packages/system/nostr-system' },
  { text: 'Relay Management', link: '/packages/system/relays' },
  { text: 'Query System', link: '/packages/system/queries' },
  { text: 'Caching', link: '/packages/system/caching' },
  { text: 'Signers', link: '/packages/system/signers' },
  { text: 'Event Builder & Publisher', link: '/packages/system/events' },
  { text: 'NostrLink', link: '/packages/system/nostr-link' },
  { text: 'NIP Implementations', link: '/packages/system/nips' },
  { text: 'Text Parsing', link: '/packages/system/text' },
  { text: 'User State', link: '/packages/system/user-state' },
]

export default defineConfig({
  srcDir: '.',
  title: "Snort",
  description: "Snort is a suite of nostr TypeScript libraries which powers snort.social, zap.stream, dtan.xyz, nwb.tf, lnvps.net and many other popular Nostr applications",
  base: '/',
  lang: 'en-US',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Packages', link: '/packages/system' },
      { text: 'GitHub', link: 'https://github.com/v0l/snort' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/installation' },
          { text: 'Quick Start', link: '/quick-start' }
        ]
      },
      {
        text: '@snort/system',
        collapsed: false,
        items: systemItems
      },
      {
        text: 'Other Packages',
        collapsed: false,
        items: [
          { text: '@snort/system-react', link: '/packages/system-react' },
          { text: '@snort/shared', link: '/packages/shared' },
          { text: '@snort/wallet', link: '/packages/wallet' },
          { text: '@snort/worker-relay', link: '/packages/worker-relay' },
          { text: '@snort/bot', link: '/packages/bot' },
          { text: '@snort/system-wasm', link: '/packages/system-wasm' },
          { text: '@snort/system-svelte', link: '/packages/system-svelte' }
        ]
      },
      {
        text: 'Examples',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/examples/' },
          { text: 'React Hooks', link: '/examples/system-react' },
          { text: 'Event Builder & Publisher', link: '/examples/events' },
          { text: 'NostrLink', link: '/examples/nostr-link' },
          { text: 'Query System', link: '/examples/queries' },
          { text: 'NIP Implementations', link: '/examples/nips' },
          { text: 'User State', link: '/examples/user-state' },
          { text: 'Signers', link: '/examples/signers' },
          { text: 'Text Parsing', link: '/examples/text' },
          { text: 'Shared Utilities', link: '/examples/shared' },
          { text: 'Wallet Integration', link: '/examples/wallet' },
          { text: 'Worker Relay', link: '/examples/worker-relay' },
          { text: 'Preact + HTM + Unpkg', link: '/examples/preact-htm-unkpkg' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/v0l/snort' }
    ],

    search: {
      provider: 'local'
    }
  }
})
