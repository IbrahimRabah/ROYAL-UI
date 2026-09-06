import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBarComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  readonly query: FormControl<string> = this.fb.control('');
  readonly isOpen = signal(false);

  openSearch(): void {
    this.isOpen.set(true);
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  closeSearch(): void {
    this.isOpen.set(false);
  }

  submit(): void {
    const q = this.query.value.trim();
    if (!q) {
      return;
    }
    this.router.navigate(['/products'], { queryParams: { q } });
    this.closeSearch();
  }
}
