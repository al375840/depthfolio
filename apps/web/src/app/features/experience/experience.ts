import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-experience',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-2xl mx-auto px-6 py-16">
      <h1 class="text-3xl font-semibold tracking-tight text-neutral-900 mb-6">Experience</h1>
      <p class="text-neutral-600 leading-relaxed">Próximamente.</p>
    </section>
  `,
})
export class Experience {}
