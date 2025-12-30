# PolyDebate Design System

This document is the single source of truth for the PolyDebate application design system. It defines the "Airy Glass" aesthetic, combining modern fintech precision with the depth and layering principles of the "Apple Method."

## 1. Core Philosophy: "Airy Glass"

The PolyDebate aesthetic is built on **precision, clarity, and breathability**.
- **Airy Space**: Ample whitespace to reduce cognitive load and visual noise.
- **Micro-Contrast**: Using subtle grays and borders (0.05 opacity) instead of heavy shadows to define hierarchy.
- **Translucency**: Frosted glass effects (`backdrop-filter: blur(12px)`) that feel light and premium.
- **Typography as Design**: When color is absent, typography provides the structure and character.

## 2. Visual Identity

- **Font**: **Satoshi** (fallback: Inter, sans-serif). A clean, geometric sans-serif that balances quantifiable precision with approachable modernism.
- **Inspiration**: Apple (depth), Vercel (monochrome precision), Perplexity (interaction patterns).

## 3. Color System

Uses HSL for precise control over hierarchy and light/dark theme consistency.

### 3.1 Brand Colors
| Token | Hex | Use Case |
| :--- | :--- | :--- |
| `primary` | `#1652f0` | Primary actions, links, active selections. |
| `brand-cyan` | `#00c2ff` | User queries, search inputs. |
| `brand-coral` | `#ff6f59` | AI responses, internal indicators. |
| `brand-green` | `#27ae60` | Confidence percentages, positive market indicators. |
| `brand-yellow` | `#f9c74f` | Highlights and important notifications. |
| `charcoal` | `#1a1a1a` | High-contrast actions (e.g., Start AI Debate button). |

### 3.2 Neutrals (The "Almost White" Scale)
Built on "Black Opacity" to ensure natural rendering on any background.
- **Background**: `hsl(0, 0%, 100%)` (Pure White foundation).
- **Surface Apple White**: `rgba(0, 0, 0, 0.02)` (Search bars, subtle card backgrounds).
- **Surface Elevated**: `rgba(0, 0, 0, 0.05)` (Inactive components, secondary tabs).
- **Border Subtle**: `hsla(0, 0%, 0%, 0.05)` (The standard atmospheric separator).
- **Text Principal**: `rgba(0, 0, 0, 0.90)` (High readability for body and titles).
- **Text Secondary**: `rgba(0, 0, 0, 0.60)` (Supporting info, meta text).

## 4. Typography Hierarchy

| Element | Size | Weight | Letter Spacing | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Heading** | 32px | 700 (Bold) | `-0.025em` | Main page titles. |
| **Section Header** | 18px | 600 (Semibold) | `normal` | Component/Section titles. |
| **Body (Base)** | 14px | 400 (Regular) | `normal` | Standard readable content. |
| **Metadata** | 13px | 500 (Medium) | `normal` | Values, dates, tags. |
| **Labels** | 10px | 700 (Bold) | `0.4em` (widest) | Uppercase badges/tags. |

## 5. Depth and Layering (The Apple Method)

Creating a "3D" feel with light and shadow rather than harsh lines.
1. **Level 0 (The Floor)**: Page background (#f2f2f2).
2. **Level 1 (The Card)**: White background, 1px subtle border, soft `shadow-sm`.
3. **Level 2 (The Interactive)**: Hover state. Increased shadow spread (`shadow-md`), removal of `translateY` to maintain boundary integrity.

## 6. Component Standards

### 6.1 Navigation
- **Aesthetic**: Translucent "Frosted Glass" (`backdrop-filter: blur(12px)`).
- **Logo**: Integrated brand icon (speech bubble) with sharp, branded rendering.
- **Search**: Minimalist input with `0.02` background opacity.

### 6.2 Market Cards
- **Interaction**: Button slides **up** into the card boundary on hover.
- **Containment**: Use `overflow: hidden` with matched `borderRadius` (12px) and 1px internal padding to ensure borders are never clipped.
- **Border Logic**: Static cards use `border-subtle`; Hovered cards use `rgba(0,0,0,0.15)` for clear definition without high-contrast "blue" outlines.

### 6.3 AI Debate Chat
- **Atmospheric Layering**: Messages use light translucency and subtle shadows.
- **Dynamic Motion**: 150ms transitions for all hover and active states.
