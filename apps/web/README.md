# apps/web — depthfolio frontend

Angular 17+ single-page application. Standalone components, signals, deferrable views.

## Local development

> The actual Angular project files are added in a follow-up commit. This README documents the intended layout and commands.

```bash
cd apps/web
npm install
npm start              # ng serve on http://localhost:4200
npm run build          # production build to dist/web/browser
npm test               # karma + jasmine
npm run lint
```

## Folder layout

```
src/app/
├── core/
│   ├── services/          # singleton services: camera, depth-estimation, i18n
│   ├── tokens/            # InjectionToken declarations
│   └── guards/            # route guards
├── shared/
│   ├── components/        # reusable presentational components
│   ├── pipes/
│   └── directives/
├── features/
│   ├── depth-scene/       # the centerpiece
│   │   ├── components/    # Angular components
│   │   ├── three/         # framework-agnostic Three.js code
│   │   │   └── shaders/   # GLSL vertex + fragment shaders
│   │   └── ml/            # framework-agnostic ONNX wrapper
│   ├── about/
│   ├── projects/
│   ├── experience/
│   └── contact/
└── layout/                # header, footer, app shell
```

## The framework-agnostic boundary

Code under `features/depth-scene/three/` and `features/depth-scene/ml/` must not import from `@angular/*`. This is a hard rule. The day we port this to React or to a different framework, those folders move untouched.
