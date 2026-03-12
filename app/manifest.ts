import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KhataPeeta',
    short_name: 'KhataPeeta',
    description: 'Smart Restaurant Management System',
    start_url: '/',
    display: 'standalone', // This forces the app to open without the browser search bar
    background_color: '#ffffff',
    theme_color: '#f97316',
    icons: [
      {
        src: '/icon.png?v=2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon.png?v=2',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon.png?v=2',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  }
}