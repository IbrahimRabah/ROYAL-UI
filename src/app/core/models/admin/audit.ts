export interface AuditEntryResponse {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  actorId: number;
  actorName: string;
  createdAt: string;
}
