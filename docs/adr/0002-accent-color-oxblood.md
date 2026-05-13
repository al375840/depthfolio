# ADR 0002 — Accent colour: oxblood

**Date**: 2026-05-12
**Status**: Accepted

## Context

The site uses a minimalist monochrome aesthetic. A single accent colour carries every interactive cue: hover states, active language indicator, primary CTA, status indicators. The choice of that single colour effectively defines the brand.

Candidates considered:

- **Cobalt blue (#1F5BFF)** — safe, professional, but visually identical to the majority of tech portfolios.
- **Signal orange (#FF5A1F)** — distinctive, energetic, but reads "playful start-up" more than "Senior engineer".
- **Pure mono (#0A0A0A)** — sophisticated but removes the ability to mark CTAs with a visual signal.
- **Forest green (#1FAA59)** — pleasant, but loses tech rigour and trends "wellness brand".
- **Oxblood (#A8324A)** — editorial, mature, distinctive.

## Decision

**Oxblood `#A8324A`**, used sparingly (target: visible on <5% of pixels at any time).

Derived palette tokens, defined in `tailwind.config.ts`:

| Token | Hex | Use |
|---|---|---|
| `accent.DEFAULT` | `#A8324A` | Primary accent: hover borders, active state, CTA backgrounds |
| `accent.soft` | `#F5E4E8` | Subtle backgrounds: tag pills, hover surfaces |
| `accent.strong` | `#842738` | CTA hover state (one step darker) |
| `accent.fg` | `#FFFFFF` | Text on accent backgrounds (always white) |

Page background fixed at `#FAFAFA` (off-white), not `#FFFFFF`, both for visual comfort and for accent contrast on small text (oxblood on `#FAFAFA` ≈ 6.1:1, passes WCAG AA).

## Consequences

**Discipline required**: oxblood reads as "danger" in default UI conventions. Validation errors must use a distinct red (`#DC2626`) so users never confuse brand-accent with system-error.

**Visual coherence**: depth maps are natively grayscale. A monochrome palette with one warm accent means the depth visualisation integrates without colorisation hacks.

**Maintenance cost**: low. Four design tokens covering every accent need.
