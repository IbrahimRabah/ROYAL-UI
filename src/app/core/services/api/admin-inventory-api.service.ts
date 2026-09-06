import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_ROUTES } from '../../constants/api-routes';
import { APP_CONFIG } from '../../constants/app-config';
import {
  AdjustStockRequest,
  InventoryAdminResponse,
  InventoryListParams,
  InventoryMovementsParams,
  PageResponse,
  ReceiveStockRequest,
  StockMovementResponse,
  StockPositionResponse,
} from '../../models';
import { buildHttpParams } from './http-params.util';

@Injectable({
  providedIn: 'root',
})
export class AdminInventoryApiService {
  private readonly http = inject(HttpClient);

  list(params: InventoryListParams): Observable<PageResponse<InventoryAdminResponse>> {
    const httpParams = buildHttpParams({
      q: params.q,
      lowStockOnly: params.lowStockOnly ? true : undefined,
      outOfStockOnly: params.outOfStockOnly ? true : undefined,
      categoryId: params.categoryId,
      sort: params.sort,
      page: params.page,
      size: params.size ?? APP_CONFIG.pagination.inventory.size,
    });
    return this.http.get<PageResponse<InventoryAdminResponse>>(API_ROUTES.admin.inventory.list(), { params: httpParams });
  }

  getPosition(variantId: number): Observable<StockPositionResponse> {
    return this.http.get<StockPositionResponse>(API_ROUTES.admin.inventory.position(variantId));
  }

  lowStock(): Observable<StockPositionResponse[]> {
    return this.http.get<StockPositionResponse[]>(API_ROUTES.admin.inventory.lowStock());
  }

  receive(variantId: number, body: ReceiveStockRequest): Observable<StockPositionResponse> {
    return this.http.post<StockPositionResponse>(API_ROUTES.admin.inventory.receive(variantId), body);
  }

  adjust(variantId: number, body: AdjustStockRequest): Observable<StockPositionResponse> {
    return this.http.post<StockPositionResponse>(API_ROUTES.admin.inventory.adjust(variantId), body);
  }

  movements(params: InventoryMovementsParams = {}): Observable<PageResponse<StockMovementResponse>> {
    const httpParams = buildHttpParams({
      variantId: params.variantId,
      movementType: params.movementType,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page: params.page,
      size: params.size ?? APP_CONFIG.pagination.inventoryMovements.size,
    });
    return this.http.get<PageResponse<StockMovementResponse>>(API_ROUTES.admin.inventory.movements(), { params: httpParams });
  }
}
