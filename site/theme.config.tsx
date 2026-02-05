import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 'bold' }}>SpecFlow</span>,
  project: {
    link: 'https://github.com/anthropics/specflow',
  },
  docsRepositoryBase: 'https://github.com/anthropics/specflow/tree/main/site',
  footer: {
    content: 'SpecFlow Documentation',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s - SpecFlow'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="SpecFlow" />
      <meta property="og:description" content="Security-first, cost-aware, test-driven AI development methodology" />
    </>
  ),
}

export default config
