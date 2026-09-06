import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { passwordStrengthScore } from '../../../../shared/validators/strong-password.validator';

type StrengthLevel = 0 | 1 | 2 | 3;

const LEVEL_LABEL_KEYS: Record<StrengthLevel, string> = {
  0: 'auth.passwordStrength.weak',
  1: 'auth.passwordStrength.fair',
  2: 'auth.passwordStrength.good',
  3: 'auth.passwordStrength.strong',
};

const LEVEL_COLOR_VAR: Record<StrengthLevel, string> = {
  0: 'var(--stop)',
  1: 'var(--warn)',
  2: 'var(--warn)',
  3: 'var(--ok)',
};

@Component({
  selector: 'app-password-strength-meter',
  templateUrl: './password-strength-meter.component.html',
  styleUrl: './password-strength-meter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordStrengthMeterComponent {
  @Input() password = '';

  readonly segmentIndexes = [0, 1, 2, 3];

  get level(): StrengthLevel {
    const score = passwordStrengthScore(this.password);
    if (score <= 1) return 0;
    if (score === 2) return 1;
    if (score <= 4) return 2;
    return 3;
  }

  get filledCount(): number {
    return this.level + 1;
  }

  get color(): string {
    return LEVEL_COLOR_VAR[this.level];
  }

  get labelKey(): string {
    return LEVEL_LABEL_KEYS[this.level];
  }
}
