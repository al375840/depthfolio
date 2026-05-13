import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between
                   px-6 md:px-12 bg-page/70 backdrop-blur-sm">
      <a routerLink="/" class="text-sm font-medium tracking-tight text-neutral-900">
        depthfolio
      </a>
      <span class="text-[10px] uppercase tracking-[0.25em] text-neutral-500
                   font-mono select-none">
        portfolio · 2026
      </span>
    </header>
    <div class="h-14"></div>
  `,
})
export class Header {}
