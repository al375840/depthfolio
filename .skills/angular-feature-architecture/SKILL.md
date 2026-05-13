---
name: angular-feature-architecture
description: Lay out a modern Angular 17+ application with standalone components, signals, deferrable views, and a strict core/shared/features/layout folder split where framework-agnostic logic lives separately from Angular bindings.
---

# Angular feature-architecture

## What and why

Angular's NgModule era is over. Modern Angular (v17+) is standalone-first, signal-driven, and supports lazy-loading and deferral natively. This skill captures the layout that scales from a portfolio to a small SaaS without rewrites.

## Top-level layout

```
src/app/
├── core/         singletons: services, interceptors, guards, tokens, http clients
├── shared/       reusable: pipes, directives, generic components, no state
├── features/     bounded contexts: each feature is its own folder, self-contained
└── layout/       application shell: header, footer, page chrome
```

**Hard rule**: no feature ever imports from another feature. Cross-feature needs go through `core/` or `shared/`. If you find yourself needing it, that's a signal — extract the dependency upward.

## Inside a feature

```
features/depth-scene/
├── components/             # Angular components, use Angular APIs
├── three/                  # PURE TypeScript — no Angular imports
│   ├── scene-builder.ts
│   ├── displacement-material.ts
│   └── shaders/
└── ml/                     # PURE TypeScript — no Angular imports
    ├── depth-model.ts
    └── preprocessing.ts
```

The `three/` and `ml/` folders are the **framework-agnostic core**. They must not import from `@angular/*`. If they need to publish events back to Angular, they expose plain callbacks or use observables from `rxjs` (which is framework-agnostic).

This boundary is the test: copy `three/` and `ml/` into a Vite + React project unchanged, and they should still build.

## Standalone component pattern

```typescript
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-depth-scene',
  standalone: true,
  imports: [],
  template: `
    <div class="relative">
      <canvas #canvas></canvas>
      @if (isFallback()) {
        <span class="absolute top-2 left-2 text-xs">static demo</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepthSceneComponent {
  readonly isFallback = signal(false);
  // ...
}
```

`ChangeDetectionStrategy.OnPush` everywhere by default. With signals, this is the natural fit and gives you free perf wins.

## Routing with lazy features

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./layout/home.component').then(m => m.HomeComponent) },
  { path: 'about', loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent) },
  { path: 'projects', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
  { path: 'experience', loadComponent: () => import('./features/experience/experience.component').then(m => m.ExperienceComponent) },
  { path: 'contact', loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent) },
];
```

## Deferring heavy chunks

The depth scene is the biggest chunk (Three.js + ONNX Runtime). Defer it so the first paint isn't blocked:

```html
@defer (on viewport; prefetch on idle) {
  <app-depth-scene />
} @placeholder {
  <div class="aspect-video animate-pulse bg-neutral-200"></div>
} @loading (after 200ms; minimum 500ms) {
  <span>cargando escena…</span>
}
```

This single template change can shave 60% off your initial bundle.

## Signals over RxJS for component state

Signals are cheaper, simpler, and more debuggable than RxJS for component-local state. Keep RxJS for streams (HTTP, WebSocket, gesture detection); use signals for everything else.

```typescript
readonly hotspotCount = signal(0);
readonly fpsTarget = computed(() => this.lowPowerMode() ? 15 : 30);
readonly cameraStatus = signal<'idle' | 'live' | 'fallback' | 'denied'>('idle');
```

## Injection tokens for configurable dependencies

```typescript
export const DEPTH_MODEL_URL = new InjectionToken<string>('DEPTH_MODEL_URL', {
  providedIn: 'root',
  factory: () => '/models/midas-small.onnx',
});
```

This lets you swap the model URL in tests, swap to a stub model, or load it from environment config.

## i18n setup

Two viable approaches:

**`@angular/localize`** (compile-time): generates one bundle per locale. Best for SEO. Switching languages reloads the page.

```bash
ng add @angular/localize
ng extract-i18n --output-path src/locale
```

Then deploy each locale to a sub-path: `/es/`, `/en/`.

**`@ngx-translate/core`** (runtime): one bundle, JSON files per locale, switches without reload. Worse SEO.

For depthfolio we use `@angular/localize` because SEO matters for a portfolio.

## Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { DepthSceneComponent } from './depth-scene.component';

describe('DepthSceneComponent', () => {
  it('starts in idle state', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [DepthSceneComponent],
    }).createComponent(DepthSceneComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.cameraStatus()).toBe('idle');
  });
});
```

For the framework-agnostic `three/` and `ml/` code, plain vitest or jest works — no Angular test bed needed. That's another payoff of the boundary.

## Gotchas

- **Don't put state in `core/` services that's owned by a feature.** Singleton state in a feature module belongs to the feature.
- **Don't reach into `shared/` from `core/`.** Direction is core → nothing, shared → nothing, features → core+shared, layout → core+shared. One-way edges only.
- **`provideRouter` and `provideHttpClient` go in `app.config.ts`**, not in components.
- **Standalone components import everything they need themselves.** No more "I forgot to add it to declarations" — but now you can forget to import in the component itself. ESLint with `@angular-eslint` catches this.
