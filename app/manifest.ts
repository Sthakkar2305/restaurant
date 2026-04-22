import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KhataPeeta',
    short_name: 'KhataPeeta',
    description: 'Smart Restaurant Management System',
    start_url: '/',
    display: 'standalone', 
    background_color: '#ffffff',
    theme_color: '#f97316',
    icons: [
      {
        src: '/icon-912.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512.jpeg',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-912.png', // <-- THIS WAS MISSING IN YOUR SCREENSHOT!
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.jpeg',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  }
}