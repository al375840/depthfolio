import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-page/80 backdrop-blur-sm border-b border-neutral-200/50">
      <a routerLink="/" class="text-lg font-semibold tracking-tight text-neutral-900">
        depthfolio
      </a>
      <nav class="flex items-center gap-6 text-sm text-neutral-600">
        <a routerLink="/about"      routerLinkActive="text-oxblood font-medium" class="hover:text-neutral-900 transition-colors">About</a>
        <a routerLink="/projects"   routerLinkActive="text-oxblood font-medium" class="hover:text-neutral-900 transition-colors">Projects</a>
        <a routerLink="/experience" routerLinkActive="text-oxblood font-medium" class="hover:text-neutral-900 transition-colors">Experience</a>
        <a routerLink="/contact"    routerLinkActive="text-oxblood font-medium" class="hover:text-neutral-900 transition-colors">Contact</a>
      </nav>
    </header>
    <div class="h-[69px]"></div>
  `,
})
export class Header {}
