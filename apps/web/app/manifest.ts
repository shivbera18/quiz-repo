import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Stable identity so updates to start_url/scope never spawn a second
    // installed app on the same device.
    id: '/',
    name: 'Quizzy - Master Your Knowledge',
    short_name: 'Quizzy',
    description: 'A comprehensive quiz application for students and professionals.',
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    // Matches layout.tsx viewport themeColor -- a mismatch shows one color in
    // the browser bar and another in the installed app's splash screen.
    theme_color: '#7c3aed',
    categories: ['education'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/dashboard',
      },
      {
        name: 'Attempt History',
        url: '/history',
      },
      {
        name: 'Notebook',
        url: '/dashboard/notebook',
      },
    ],
  }
}
