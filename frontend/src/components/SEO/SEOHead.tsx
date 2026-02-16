import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  siteName?: string;
  twitterHandle?: string;
  noindex?: boolean;
  nofollow?: boolean;
  canonicalUrl?: string;
  alternateLanguages?: { lang: string; url: string }[];
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = '',
  keywords = [],
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  siteName = 'Blog CMS',
  twitterHandle,
  noindex = false,
  nofollow = false,
  canonicalUrl,
  alternateLanguages = [],
}) => {
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultImage = image || '/og-default.jpg';
  const currentUrl = url || window.location.href;

  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow',
  ].join(', ');

  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle]);

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : 'WebSite',
    name: title,
    description,
    url: currentUrl,
    image: defaultImage,
    ...(type === 'article' && {
      author: {
        '@type': 'Person',
        name: author,
      },
      datePublished: publishedTime,
      dateModified: modifiedTime || publishedTime,
      articleSection: section,
      keywords: tags.join(', '),
      publisher: {
        '@type': 'Organization',
        name: siteName,
        logo: {
          '@type': 'ImageObject',
          url: `${window.location.origin}/logo.png`,
        },
      },
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: window.location.origin,
      },
      ...(section ? [{
        '@type': 'ListItem',
        position: 2,
        name: section,
        item: `${window.location.origin}/category/${section.toLowerCase()}`,
      }] : []),
      ...(title ? [{
        '@type': 'ListItem',
        position: section ? 3 : 2,
        name: title,
        item: currentUrl,
      }] : []),
    ],
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <meta name="robots" content={robotsContent} />
      {author && <meta name="author" content={author} />}
      
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {alternateLanguages.map(({ lang, url: langUrl }) => (
        <link key={lang} rel="alternate" hrefLang={lang} href={langUrl} />
      ))}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="de_DE" />
      
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && section && (
        <meta property="article:section" content={section} />
      )}
      {tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}

      <script type="application/ld+json">{JSON.stringify(schemaOrg)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
    </Helmet>
  );
};

export default SEOHead;
