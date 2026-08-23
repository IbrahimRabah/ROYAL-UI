export enum AttributeDataType {
  LIST = 'LIST',
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
}

// Single source of truth for translating a data type wherever it's shown (the attribute
// list's badge, the attribute form's select) — derived from the enum value, same pattern
// as stock-movement.ts's movementTypeLabelKey.
export function attributeDataTypeLabelKey(type: AttributeDataType): string {
  return `admin.attributes.dataType.${type}`;
}
