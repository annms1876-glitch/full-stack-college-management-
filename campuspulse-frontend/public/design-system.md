---
name: "CampusPulse — Smart Campus Social System"
description: "Mobile-first college social and academic management design system combining Instagram's familiar feed ergonomics with institute-grade clarity."
---

## Overview

CampusPulse uses one shared visual system across the homepage, student app, faculty portal, and admin portal. The style is warm, clear, and campus-focused: soft paper backgrounds, deep forest-green actions, lime highlights, and Manrope/DM Sans typography.

- **Audience:** Students, faculty, and administrators using the platform on mobile and desktop.
- **Design Style:** Editorial minimalism with familiar social-feed ergonomics, restrained color, rounded cards, and legible academic metadata.

## Colors

The shared palette is defined in `home.css`, the Tailwind config, and both portal stylesheets. Green anchors navigation and primary actions; lime marks primary containers and highlights; orange is a secondary accent. Paper, white, and muted green-grey surfaces provide contrast without switching to a separate portal palette.

```yaml
colors:
  ink: "#17241e"
  paper: "#f7f6f1"
  surface: "#fffefa"
  line: "#dedfd6"
  muted: "#68746d"
  green: "#345f47"
  lime: "#d8f078"
  orange: "#f2a176"
  success: "#345f47"
  warning: "#a35d38"
  error: "#a64335"
  dark:
    background: "#17241e"
    surface: "#203428"
    line: "#46524a"
    primary: "#d8f078"
```

## Typography

Use **Manrope** for display and heading text and **DM Sans** for body copy, navigation, controls, labels, and metadata. Keep the same pair in every portal; do not introduce a separate faculty/admin font stack. The student Tailwind theme maps its `display` and `headline` families to Manrope and its remaining families to DM Sans.

```yaml
typography:
  display-lg: { fontFamily: "Manrope", fontSize: 36px, lineHeight: 44px, fontWeight: 400 }
  display-lg-mobile: { fontFamily: "Manrope", fontSize: 28px, lineHeight: 34px, fontWeight: 400 }
  headline-lg: { fontFamily: "Manrope", fontSize: 24px, lineHeight: 30px, fontWeight: 400 }
  headline-md: { fontFamily: "Manrope", fontSize: 20px, lineHeight: 26px, fontWeight: 400 }
  title-lg: { fontFamily: "DM Sans", fontSize: 18px, lineHeight: 24px, fontWeight: 600 }
  title-md: { fontFamily: "DM Sans", fontSize: 16px, lineHeight: 22px, fontWeight: 600 }
  title-sm: { fontFamily: "DM Sans", fontSize: 14px, lineHeight: 20px, fontWeight: 600 }
  body-md: { fontFamily: "DM Sans", fontSize: 14px, lineHeight: 20px, fontWeight: 400 }
  body-sm: { fontFamily: "DM Sans", fontSize: 12px, lineHeight: 16px, fontWeight: 400 }
  label-md: { fontFamily: "DM Sans", fontSize: 12px, lineHeight: 16px, fontWeight: 600 }
```

## Layout & Spacing

Mobile-first single-column fluid layout (`390px` primary viewport, scaling cleanly up to a centered `480px` mobile shell or responsive multi-column grid on larger viewports). Built on a strict **4px / 8px** spacing scale.

- **Top Header:** Sticky `56px` compact bar with institute logo/wordmark on the left and Notification Bell + Direct Messages on the right.
- **Bottom Navigation Bar:** Sticky `64px` five-icon bar (`Home`, `Clubs`, `Study` [elevated center], `Search`, `Profile`) with clear active state highlighting.
- **Feed & Cards:** Edge-to-edge or `16px` horizontal padding with `12px–16px` vertical gaps between feed posts.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 12px
  gutter-lg: 16px
  gutter-xl: 24px
  section: 32px
  page-margin: 16px
```

## Elevation & Depth

Depth is communicated through **tonal surface layering** and **hairline outlines** (`1px solid` using `outline-variant` at subtle opacity) rather than heavy drop shadows. The sticky top header and bottom navigation bar use clean surface-lowest (`#fffefa`) backgrounds with subtle `1px` borders, while the prominent center **Study** button uses a soft primary-tinted elevation to anchor the navigation bar.

## Shapes

Generous, friendly corner radii that echo modern social apps: pill-shaped filter chips and buttons (`full`), softly rounded feed cards and media attachments (`lg` / `xl`), and circular avatars (`full`) with `2px` inner white rings inside story gradients.

```yaml
rounded:
  sm: 6px
  DEFAULT: 10px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
```

## Motion & Micro-interaction

Micro-interactions are snappy and tactile—like double-tap heart feedback, bookmark toggles, filter chip selection, and story ring transitions. Interactive state changes resolve in `120ms`, while story viewers and bottom sheets enter smoothly in `240ms`. All motion honors `prefers-reduced-motion` and animates only `transform`, `opacity`, and color.

```yaml
motion:
  state-change:
    duration: 120ms
    delay: 0ms
    timingFunction: ease-out
  surface-enter:
    duration: 240ms
    delay: 0ms
    timingFunction: cubic-bezier(0.2, 0, 0, 1)
  surface-exit:
    duration: 160ms
    delay: 0ms
    timingFunction: cubic-bezier(0.3, 0, 1, 1)
```

## Voice & Content Strategy

- **Tone:** Friendly, concise, campus-authentic. Official notices sound clear and direct ("Mid-Sem Exam Schedule Released"), while student and club posts feel natural and energetic ("HackVIT 2026 registrations close tonight!").
- **Capitalisation:** Sentence case for feed descriptions, notifications, and filter chips; Title Case for club names, course titles, and official notice headers.
- **Timestamps & Numbers:** Relative time on social posts (`2h`, `5h`, `1d`) and `tabular-nums` for counts, dates, and roll numbers (`23CSE1042`).

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Avatar** → `@components/avatar.html`: `avatar-image`, `avatar-editable`
- **Button** → `@components/button.html`: `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html`: `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Chip** → `@components/chip.html`: `chip-action`, `chip-input`, `chip-with-icon`
