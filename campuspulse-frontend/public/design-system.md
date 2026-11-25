---
name: "CampusPulse — Smart Campus Social System"
description: "Mobile-first college social and academic management design system combining Instagram's familiar feed ergonomics with institute-grade clarity."
---

## Overview

CampusPulse is a mobile-first student platform for Vanguard Institute of Technology (VIT) that blends the effortless social rhythm of Instagram with the structured utility of a smart campus hub. The interface feels immediate, warm, and student-centric rather than administrative or bureaucratic.

- **Audience:** Undergraduate and postgraduate students checking notices, classes, doubts, and campus life on their phones between lectures.
- **Design Style:** **Minimalism paired with Modern Mobile Ergonomics** — crisp white and soft neutral surfaces, generous breathing room, rounded cards and avatars, subtle hairline dividers, and a restrained institute-branded navy-indigo primary accent.

## Colors

The palette is anchored in Vanguard Institute of Technology's deep **Academic Navy** (`#00236F` / `#1E3A8A`), which conveys institutional trust without feeling heavy. Clean off-white and subtle grey surface tiers separate feed cards, story trays, and navigation chrome without visual clutter. Warm **Amber Gold** (`#D97706`) and **Crimson Rose** (`#E11D48`) are reserved strictly for story rings, live status indicators, and verified official badges.

- **Primary:** Institute navy for active navigation states, primary CTAs, and verified official notice badges.
- **Surface Tiers:** Crisp white (`#FFFFFF`) for elevated post cards and modals over a soft neutral canvas (`#FAF8FF`) and subtle grey containers (`#F4F3FA` / `#EEEDF4`).
- **Semantic Status:** Used strictly for academic alerts, attendance thresholds, and complaint tracking—never decoratively.

```yaml
colors:
  accent: "#D97706"
  on-accent: "#2A2A2A"
  story-rose: "#E11D48"
  success: "#15803D"
  on-success: "#FFFFFF"
  success-container: "#DCFCE7"
  on-success-container: "#14532D"
  warning: "#B45309"
  on-warning: "#FFFFFF"
  warning-container: "#FEF3C7"
  on-warning-container: "#78350F"
  light:
    primary: "#00236F"
    on-primary: "#FFFFFF"
    primary-container: "#1E3A8A"
    on-primary-container: "#DCE1FF"
    secondary: "#555D7E"
    on-secondary: "#FFFFFF"
    secondary-container: "#D0D8FF"
    on-secondary-container: "#111A37"
    tertiary: "#4B1C00"
    on-tertiary: "#FFFFFF"
    tertiary-container: "#6E2C00"
    on-tertiary-container: "#FFDBCB"
    error: "#BA1A1A"
    on-error: "#FFFFFF"
    error-container: "#FFDAD6"
    on-error-container: "#93000A"
    background: "#FAF8FF"
    on-background: "#1A1B21"
    surface: "#FAF8FF"
    surface-dim: "#DAD9E1"
    surface-bright: "#FFFFFF"
    surface-container-lowest: "#FFFFFF"
    surface-container-low: "#F4F3FA"
    surface-container: "#EEEDF4"
    surface-container-high: "#E9E7EF"
    surface-container-highest: "#E3E1E9"
    on-surface: "#1A1B21"
    surface-variant: "#E1E1EF"
    on-surface-variant: "#444651"
    outline: "#757682"
    outline-variant: "#C5C5D3"
    inverse-surface: "#2F3036"
    inverse-on-surface: "#F1F0F7"
    inverse-primary: "#B6C4FF"
  dark:
    primary: "#B6C4FF"
    on-primary: "#05297A"
    primary-container: "#1E3A8A"
    on-primary-container: "#DCE1FF"
    secondary: "#BDC5EB"
    on-secondary: "#262F4D"
    secondary-container: "#3D4565"
    on-secondary-container: "#DCE1FF"
    tertiary: "#FFB691"
    on-tertiary: "#552000"
    tertiary-container: "#6E2C00"
    on-tertiary-container: "#FFDBCB"
    error: "#FFB4AB"
    on-error: "#690005"
    error-container: "#93000A"
    on-error-container: "#FFDAD6"
    background: "#121318"
    on-background: "#E3E1E9"
    surface: "#121318"
    surface-dim: "#121318"
    surface-bright: "#38393F"
    surface-container-lowest: "#0D0E13"
    surface-container-low: "#1A1B21"
    surface-container: "#1E1F25"
    surface-container-high: "#292A2F"
    surface-container-highest: "#34343A"
    on-surface: "#E3E1E9"
    surface-variant: "#444651"
    on-surface-variant: "#C5C5D3"
    outline: "#8F909D"
    outline-variant: "#444651"
    inverse-surface: "#E3E1E9"
    inverse-on-surface: "#2F3036"
    inverse-primary: "#4059AA"
```

## Typography

CampusPulse pairs **Alata** for crisp, geometric display and section titles with **Instrument Sans** for ultra-legible mobile body copy, captions, and academic metadata. **Spline Sans Mono** is used for roll numbers, timestamps, and course codes with tabular numerals.

```yaml
typography:
  display-lg:
    fontFamily: "Alata"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 44px
    letterSpacing: -0.5px
  display-lg-mobile:
    fontFamily: "Alata"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 34px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Alata"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 30px
    letterSpacing: -0.2px
  headline-md:
    fontFamily: "Alata"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 26px
    letterSpacing: 0px
  title-lg:
    fontFamily: "Instrument Sans"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  title-md:
    fontFamily: "Instrument Sans"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
  title-sm:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  body-lg:
    fontFamily: "Instrument Sans"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
  body-md:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  body-sm:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0.1px
  label-lg:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 18px
    letterSpacing: 0.1px
  label-md:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.2px
  label-sm:
    fontFamily: "Instrument Sans"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.2px
  mono-sm:
    fontFamily: "Spline Sans Mono"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.2px
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

Depth is communicated through **tonal surface layering** and **hairline outlines** (`1px solid` using `outline-variant` at subtle opacity) rather than heavy drop shadows. The sticky top header and bottom navigation bar use clean surface-lowest (`#FFFFFF`) backgrounds with subtle `1px` borders, while the prominent center **Study** button uses a soft primary-tinted elevation to anchor the navigation bar.

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
