import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AttributeGroupResponse } from '../../../../core/models';

@Component({
  selector: 'app-variant-selector',
  templateUrl: './variant-selector.component.html',
  styleUrl: './variant-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariantSelectorComponent {
  /** The colour options (values that carry a hex), shown as dot + name chips. */
  @Input() colorGroup: AttributeGroupResponse | null = null;
  @Input() selectedValueId: number | null = null;
  @Output() readonly selectedValueIdChange = new EventEmitter<number>();

  /** Every other option the customer chooses between (size, finish...), shown as text chips. */
  @Input() optionGroups: AttributeGroupResponse[] = [];
  /** The chosen value of each option group, by attribute id. */
  @Input() selectedOptionIds: Record<number, number> = {};
  @Output() readonly optionSelect = new EventEmitter<{ groupId: number; valueId: number }>();

  get selectedValueName(): string | null {
    return this.colorGroup?.values.find((value) => value.id === this.selectedValueId)?.name ?? null;
  }

  selectedOptionName(group: AttributeGroupResponse): string | null {
    return group.values.find((value) => value.id === this.selectedOptionIds[group.attributeId])?.name ?? null;
  }

  select(valueId: number): void {
    this.selectedValueIdChange.emit(valueId);
  }

  selectOption(group: AttributeGroupResponse, valueId: number): void {
    this.optionSelect.emit({ groupId: group.attributeId, valueId });
  }
}
