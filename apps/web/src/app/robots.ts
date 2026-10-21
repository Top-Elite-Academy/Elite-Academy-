import type { MetadataRoute } from 'next';

/** Private areas are never indexed (spec §10 SEO). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*/app',
        '/*/admin',
        '/*/crm',
        '/*/login',
        '/*/invite',
        '/*/reset-password',
        '/api/',
      ],
    },
  };
}
