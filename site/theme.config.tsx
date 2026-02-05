import React from 'react'
import { useRouter } from 'next/router'
import { DocsThemeConfig, useConfig } from 'nextra-theme-docs'

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
    const { asPath } = useRouter()
    return {
      titleTemplate: asPath === '/' ? 'SpecFlow - AI Development Methodology' : '%s - SpecFlow'
    }
  },
  head: function Head() {
    const { frontMatter, title } = useConfig()

    const defaultDescription = 'Security-first, cost-aware, test-driven AI development methodology'
    const description = frontMatter.description || defaultDescription
    const pageTitle = title ? `${title} - SpecFlow` : 'SpecFlow - AI Development Methodology'

    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:site_name" content="SpecFlow" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />

        {/* Additional SEO */}
        <meta name="author" content="Dean Banik" />
        <meta name="keywords" content="AI development, software methodology, security, testing, TDD, code review, Claude, automation" />
        <link rel="icon" href="/favicon.ico" />
      </>
    )
  },
}

export default config
