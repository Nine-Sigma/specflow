import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: (
    <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
      <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>SpecFlow</span>
      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>This site was built, reviewed and shipped by SpecFlow in under 10 minutes</span>
    </span>
  ),
  project: {
    link: 'https://github.com/Nine-Sigma/specflow',
  },
  docsRepositoryBase: 'https://github.com/Nine-Sigma/specflow/tree/main/site',
  footer: {
    text: 'SpecFlow Documentation',
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
