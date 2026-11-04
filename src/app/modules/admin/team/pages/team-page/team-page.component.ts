import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { StaffRole, TeamMember } from '../../../../../core/models';
import { AdminSeoApiService } from '../../../../../core/services/api/admin-seo-api.service';
import { AuthStoreService } from '../../../../../core/state/auth-store.service';
import { ToastService } from '../../../../../core/services/toast.service';

const ROLES: StaffRole[] = ['ADMIN', 'SEO_EDITOR'];

/**
 * Who may use the admin. The owner gives a person's OWN account a role instead of sharing a login, so the audit
 * log names the person and one account can be removed alone. A role reaches the person's session at their next
 * sign-in. You cannot change your own roles, and the last administrator cannot be demoted.
 */
@Component({
  selector: 'app-team-page',
  templateUrl: './team-page.component.html',
  styleUrl: './team-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPageComponent {
  private readonly api = inject(AdminSeoApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthStoreService);

  readonly roles = ROLES;

  readonly members = signal<TeamMember[]>([]);
  readonly found = signal<TeamMember | null>(null);
  readonly lookupError = signal(false);
  readonly drafts = signal<Record<number, StaffRole[]>>({});
  readonly saving = signal<number | null>(null);
  readonly looking = signal(false);
  readonly loading = signal(true);
  readonly failed = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.team().subscribe({
      next: (list) => {
        this.members.set(list);
        this.drafts.set(Object.fromEntries(list.map((m) => [m.id, [...m.roles]])));
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  /** The signed-in person: their own row is read-only. */
  isMe(member: TeamMember): boolean {
    return this.auth.user()?.id === member.id;
  }

  lookup(email: string): void {
    const value = email.trim();
    if (!value || this.looking()) return;
    this.looking.set(true);
    this.lookupError.set(false);
    this.found.set(null);
    this.api.lookupMember(value).subscribe({
      next: (m) => {
        this.looking.set(false);
        this.found.set(m);
        this.drafts.update((all) => ({ ...all, [m.id]: all[m.id] ?? [...m.roles] }));
      },
      error: () => {
        this.looking.set(false);
        this.lookupError.set(true);
      },
    });
  }

  has(member: TeamMember, role: StaffRole): boolean {
    return (this.drafts()[member.id] ?? member.roles).includes(role);
  }

  toggle(member: TeamMember, role: StaffRole): void {
    const current = this.drafts()[member.id] ?? [...member.roles];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    this.drafts.update((all) => ({ ...all, [member.id]: next }));
  }

  dirty(member: TeamMember): boolean {
    const draft = [...(this.drafts()[member.id] ?? member.roles)].sort().join(',');
    return draft !== [...member.roles].sort().join(',');
  }

  save(member: TeamMember): void {
    if (this.saving() !== null || !this.dirty(member)) return;
    this.saving.set(member.id);
    this.api.setRoles(member.id, this.drafts()[member.id] ?? []).subscribe({
      next: (saved) => {
        this.saving.set(null);
        this.toast.success(this.translate.instant('team.saved'));
        this.found.set(null);
        this.load();
        void saved;
      },
      error: () => this.saving.set(null),
    });
  }
}
