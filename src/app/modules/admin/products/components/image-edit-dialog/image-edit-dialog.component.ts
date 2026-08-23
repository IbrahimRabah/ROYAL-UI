import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';

import { AdminImageResponse, VariantAdminResponse } from '../../../../../core/models';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';

export interface ImageEditSave {
  altTextAr: string;
  altTextEn: string;
  variantId: number | null;
  setMain: boolean;
}

interface Draft {
  altTextAr: string;
  altTextEn: string;
  variantId: number | null;
  setMain: boolean;
}

@Component({
  selector: 'app-image-edit-dialog',
  templateUrl: './image-edit-dialog.component.html',
  styleUrl: './image-edit-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageEditDialogComponent extends DialogPortalBase implements OnChanges {
  @Input() image: AdminImageResponse | null = null;
  @Input() variants: VariantAdminResponse[] = [];
  @Input() saving = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<ImageEditSave>();

  readonly draft = signal<Draft>({ altTextAr: '', altTextEn: '', variantId: null, setMain: false });

  get open(): boolean {
    return this.image !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('image' in changes)) {
      return;
    }
    if (this.image) {
      this.draft.set({
        altTextAr: this.image.altTextAr,
        altTextEn: this.image.altTextEn,
        variantId: this.image.variantId,
        setMain: this.image.main,
      });
      this.onOpen();
    } else {
      this.onClose();
    }
  }

  cancel(): void {
    if (this.saving) {
      return;
    }
    this.closed.emit();
  }

  updateDraft(patch: Partial<Draft>): void {
    this.draft.update((d) => ({ ...d, ...patch }));
  }

  localizedVariantLabel(variant: VariantAdminResponse): string {
    return `${variant.summary} — ${variant.sku}`;
  }

  submitSave(): void {
    if (this.saving) {
      return;
    }
    this.save.emit(this.draft());
  }
}
