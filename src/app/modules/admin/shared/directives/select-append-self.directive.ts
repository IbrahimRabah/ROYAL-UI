import { Directive, OnInit, inject } from '@angular/core';
import { Select } from 'primeng/select';

/**
 * Forces every `p-select` in the admin to position its overlay via `appendTo="self"`,
 * unconditionally overriding whatever the template says (including no attribute at all,
 * which defaults to unset/"self"-equivalent-but-fragile).
 *
 * Root cause (see the full writeup in src/styles/_rtl.scss): `appendTo="self"` positions
 * the overlay via @primeuix/utils' `relativePosition()`, which only ever sets the logical
 * `insetInlineStart` — direction-agnostic by construction, the browser resolves it
 * correctly either way. Any other `appendTo` value (`"body"`, an element ref, etc.) goes
 * through `absolutePosition()` instead, which computes the horizontal offset from
 * `getBoundingClientRect().left` — a physical, LTR-only measurement — and then assigns
 * that same number to the *logical* `insetInlineEnd` property whenever the computed
 * direction is `rtl`. Mixing a physical measurement into a logical property placement is
 * the bug: the overlay lands wherever "the trigger's left edge, measured as if the page
 * were LTR" happens to map to "distance from the right edge" in RTL, which is nowhere
 * near the trigger. This has now broken three separate admin screens (orders filters,
 * the variant picker, the spec value select) because each one picked `appendTo` locally
 * instead of there being one enforced answer — hence this directive instead of another
 * per-screen `appendTo="self"` edit that the next screen won't know to copy.
 *
 * `appendTo="self"` has its own failure mode — its overlay is a normal descendant in the
 * component's own DOM subtree, so an ancestor with `overflow: hidden` (e.g. a rounded-
 * corner container clipping its children) will clip it. That is a *layout* bug to fix at
 * the call site (don't wrap a p-select in an overflow:hidden ancestor — use per-child
 * border-radius instead), not a reason to reach for `appendTo="body"` again.
 */
@Directive({
  selector: 'p-select',
})
export class SelectAppendSelfDirective implements OnInit {
  private readonly select = inject(Select, { self: true });

  ngOnInit(): void {
    this.select.appendTo = 'self';
  }
}
