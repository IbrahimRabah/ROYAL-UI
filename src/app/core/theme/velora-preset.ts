import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Points Aura's semantic design tokens at VELORA's own tokens (src/styles/_tokens.scss)
 * instead of redefining component-level CSS. Values are `var(--...)` references, not
 * literal colors — verified directly against the installed
 * node_modules/@primeuix/themes/dist/aura/base/index.mjs, which is where these semantic
 * paths (primary.*, text.*, content.*, formField.*, overlay.*.*, mask.background,
 * highlight.*) and `primitive.borderRadius.md` are actually defined and referenced from
 * (Aura's own component styles read them as `{primary.color}`, `{border.radius.md}`, etc.).
 *
 * Deliberately NOT redefining the full primary/surface 50–950 color scales — VELORA's
 * tokens only have three gold shades (--gold-lt/--gold/--gold-dp) and two surface shades
 * (--surface/--surface-alt), not a ten-step ramp, and fabricating one would mean
 * inventing colors that aren't in the token file. Every semantic leaf that Aura derives
 * from those scales for things this preset cares about (highlight, form fields, overlay
 * panels) is overridden directly with a real token instead.
 */
export const VeloraPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      md: 'var(--r-md)',
    },
  },
  semantic: {
    typography: {
      fontFamily: 'var(--body)',
    },
    primary: {
      color: 'var(--brand)',
      hoverColor: 'var(--brand-hover)',
      activeColor: 'var(--brand-hover)',
      contrastColor: 'var(--ink)',
    },
    text: {
      color: 'var(--text)',
      hoverColor: 'var(--text)',
      mutedColor: 'var(--text-muted)',
      hoverMutedColor: 'var(--text-muted)',
    },
    content: {
      background: 'var(--surface)',
      hoverBackground: 'var(--surface-alt)',
      borderColor: 'var(--border)',
      color: 'var(--text)',
      hoverColor: 'var(--text)',
    },
    formField: {
      background: 'var(--surface)',
      borderColor: 'var(--border)',
      hoverBorderColor: 'var(--brand)',
      color: 'var(--text)',
    },
    overlay: {
      select: {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      },
      popover: {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      },
      modal: {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      },
    },
    mask: {
      background: 'var(--overlay)',
    },
    highlight: {
      background: 'var(--cream)',
      focusBackground: 'var(--cream)',
      color: 'var(--gold-dp)',
      focusColor: 'var(--gold-dp)',
    },
  },
});
