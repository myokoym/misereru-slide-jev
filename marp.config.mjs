import { defineConfig } from '@marp-team/marp-cli'

export default defineConfig({
  lang: 'ja',
  themeSet: ['./themes/misereru-ja.css'],
  theme: 'misereru-ja',
  options: {
    markdown: {
      breaks: false,
    },
  },
})
