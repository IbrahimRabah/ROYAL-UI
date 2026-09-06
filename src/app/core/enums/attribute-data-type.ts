export enum AttributeDataType {
  LIST = 'LIST',
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
}

export function attributeDataTypeLabelKey(type: AttributeDataType): string {
  return `admin.attributes.dataType.${type}`;
}
