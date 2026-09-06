import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {
  @Input() coverImage = 'login-cover';
}
