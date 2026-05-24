import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DepthScene } from '../../features/depth-scene/components/depth-scene';

/**
 * Editorial / brutalist hero. The depth scene is framed centrally as if it
 * were a photographic plate; large display type and a section numeral
 * surround it to compose the page.
 *
 * Layout zones (absolute over a `calc(100vh - header)` section):
 *   - top-left:    "01" section numeral + hairline
 *   - centre:      the framed depth scene (16:9 inside a thin border)
 *   - bottom-right: SOFTWARE / ENGINEER display stack overlapping the scene
 *   - bottom strip: small mono meta caption + lang indicator
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DepthScene],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="relative w-full overflow-hidden"
      style="min-height: calc(100vh - 3.5rem)">

      <!-- 01 — section numeral, top-left -->
      <div class="absolute top-8 left-6 md:left-12 z-20 select-none">
        <div class="text-6xl md:text-7xl font-extralight leading-none tracking-tight
                    text-neutral-900">01</div>
        <div class="w-12 h-px bg-neutral-900 mt-3"></div>
      </div>

      <!-- centred depth scene, framed -->
      <div class="absolute inset-0 flex items-center justify-center
                  px-6 md:px-20 lg:px-32 pt-24 pb-32">
        <div class="relative w-full aspect-video
                    max-w-[1400px] max-h-[calc(100vh-14rem)]
                    border border-neutral-900">
          @defer (on viewport; prefetch on idle) {
            <app-depth-scene />
          } @placeholder {
            <div class="w-full h-full animate-pulse bg-neutral-800"></div>
          } @loading (after 200ms; minimum 500ms) {
            <div class="w-full h-full flex items-center justify-center bg-neutral-900">
              <span class="text-sm text-white/40">cargando escena…</span>
            </div>
          }
        </div>
      </div>

      <!-- SOFTWARE / ENGINEER display stack — sits over the scene's bottom-right
           corner, so the words read as the foreground "label" of the plate. -->
      <div class="absolute right-4 md:right-10 bottom-16 md:bottom-20 z-30
                  text-right select-none pointer-events-none mix-blend-difference">
        <div class="font-black leading-[0.85] tracking-tight text-white
                    text-3xl md:text-5xl lg:text-[5rem]">SOFTWARE</div>
        <div class="font-black leading-[0.85] tracking-tight text-white
                    text-3xl md:text-5xl lg:text-[5rem]">ENGINEER</div>
        <div class="w-20 h-px bg-white mt-4 ml-auto"></div>
      </div>

      <!-- bottom meta strip -->
      <div class="absolute bottom-4 inset-x-0 px-6 md:px-12 z-20
                  flex items-center justify-between
                  text-[11px] font-mono uppercase tracking-[0.25em]
                  text-neutral-500 select-none">
        <span>Adrián León · 2026 · señala con el índice</span>
        <span class="text-neutral-400">[ ES&nbsp;|&nbsp;EN ]</span>
      </div>
    </section>
  `,
})
export class Home {}
