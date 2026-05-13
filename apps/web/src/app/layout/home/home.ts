import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DepthScene } from '../../features/depth-scene/components/depth-scene';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DepthScene],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full">
      @defer (on viewport; prefetch on idle) {
        <app-depth-scene />
      } @placeholder {
        <div class="w-full aspect-video animate-pulse bg-neutral-800"></div>
      } @loading (after 200ms; minimum 500ms) {
        <div class="w-full aspect-video flex items-center justify-center bg-neutral-900">
          <span class="text-sm text-white/40">cargando escena…</span>
        </div>
      }
    </section>
  `,
})
export class Home {}
