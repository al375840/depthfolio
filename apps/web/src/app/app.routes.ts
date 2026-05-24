import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/home/home').then(m => m.Home),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then(m => m.About),
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/projects').then(m => m.Projects),
  },
  {
    path: 'experience',
    loadComponent: () => import('./features/experience/experience').then(m => m.Experience),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then(m => m.Contact),
  },
  { path: '**', redirectTo: '' },
];
