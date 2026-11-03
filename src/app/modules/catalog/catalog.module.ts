import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { SelectModule } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { CheckboxModule } from 'primeng/checkbox';

import { CatalogRoutingModule } from './catalog-routing.module';
import { ProductReviewsComponent } from './components/product-reviews/product-reviews.component';
import { ProductListPageComponent } from './pages/product-list-page/product-list-page.component';
import { ProductDetailsPageComponent } from './pages/product-details-page/product-details-page.component';
import { FilterSidebarComponent } from './components/filter-sidebar/filter-sidebar.component';
import { FilterPriceRangeComponent } from './components/filter-price-range/filter-price-range.component';
import { FilterColorSwatchesComponent } from './components/filter-color-swatches/filter-color-swatches.component';
import { FilterBrandListComponent } from './components/filter-brand-list/filter-brand-list.component';
import { FilterAttributeGroupComponent } from './components/filter-attribute-group/filter-attribute-group.component';
import { ActiveFiltersBarComponent } from './components/active-filters-bar/active-filters-bar.component';
import { SortDropdownComponent } from './components/sort-dropdown/sort-dropdown.component';
import { ProductGridComponent } from './components/product-grid/product-grid.component';
import { ResultsHeaderComponent } from './components/results-header/results-header.component';
import { ProductGalleryComponent } from './components/product-gallery/product-gallery.component';
import { VariantSelectorComponent } from './components/variant-selector/variant-selector.component';
import { ProductSpecsTableComponent } from './components/product-specs-table/product-specs-table.component';
import { ProductTabsComponent } from './components/product-tabs/product-tabs.component';
import { AddToCartBoxComponent } from './components/add-to-cart-box/add-to-cart-box.component';
import { RelatedProductsComponent } from './components/related-products/related-products.component';
import { ProductPriceBlockComponent } from './components/product-price-block/product-price-block.component';
import { MobileFilterDrawerComponent } from './components/mobile-filter-drawer/mobile-filter-drawer.component';
import { CategoryCardGridComponent } from './components/category-card-grid/category-card-grid.component';


@NgModule({
  declarations: [
    ProductReviewsComponent,
    ProductListPageComponent,
    ProductDetailsPageComponent,
    FilterSidebarComponent,
    FilterPriceRangeComponent,
    FilterColorSwatchesComponent,
    FilterBrandListComponent,
    FilterAttributeGroupComponent,
    ActiveFiltersBarComponent,
    SortDropdownComponent,
    ProductGridComponent,
    ResultsHeaderComponent,
    ProductGalleryComponent,
    VariantSelectorComponent,
    ProductSpecsTableComponent,
    ProductTabsComponent,
    AddToCartBoxComponent,
    RelatedProductsComponent,
    ProductPriceBlockComponent,
    MobileFilterDrawerComponent,
    CategoryCardGridComponent
  ],
  imports: [
    CommonModule,
    CatalogRoutingModule,
    SharedModule,
    SelectModule,
    SliderModule,
    CheckboxModule
  ]
})
export class CatalogModule { }
