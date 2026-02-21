import { defineConfig } from 'vitepress';

export default defineConfig({
  base: '/mmps/',
  title: 'MMPS',
  description: 'Multi-Purpose Telegram Bots Documentation',
  lang: 'en-US',

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3c3c3c' }],
  ],

  lastUpdated: true,

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'MMPS Docs',

    search: {
      provider: 'local',
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Bots', link: '/bots/overview' },
      { text: 'Development', link: '/development/contributing' },
      {
        text: 'Deploy',
        link: '/deployment/production',
      },
      {
        text: 'GitHub',
        link: 'https://github.com/matansocher/mmps',
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Quick Start', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/environment-setup' },
            { text: 'Running Locally', link: '/guide/running-locally' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Project Structure', link: '/architecture/project-structure' },
            { text: 'Code Style', link: '/architecture/code-style' },
            { text: 'Naming Conventions', link: '/architecture/naming-conventions' },
            { text: 'Patterns', link: '/architecture/patterns' },
            { text: 'Database', link: '/architecture/database' },
          ],
        },
      ],
      '/bots/': [
        {
          text: 'Bots',
          items: [
            { text: 'Overview', link: '/bots/overview' },
            { text: 'Chatbot', link: '/bots/chatbot' },
            { text: 'Coach', link: '/bots/coach' },
            { text: 'Langly', link: '/bots/langly' },
            { text: 'Magister', link: '/bots/magister' },
            { text: 'Wolt', link: '/bots/wolt' },
            { text: 'Worldly', link: '/bots/worldly' },
          ],
        },
      ],
      '/development/': [
        {
          text: 'Development',
          items: [
            { text: 'Contributing', link: '/development/contributing' },
            { text: 'Testing', link: '/development/testing' },
            { text: 'Adding Features', link: '/development/adding-features' },
            { text: 'AI Tools', link: '/development/ai-tools' },
          ],
        },
      ],
      '/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Production Setup', link: '/deployment/production' },
            { text: 'Environment Variables', link: '/deployment/environment-variables' },
            { text: 'Monitoring', link: '/deployment/monitoring' },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/matansocher/mmps',
      },
    ],

    footer: {
      message: 'MIT License',
      copyright: 'Copyright © 2024 MMPS Contributors',
    },
  },
});
