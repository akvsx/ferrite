# Products Module

Handles product catalog management: creation, updates, reads, and soft deletion.

## Directory Structure

```
products/
├── domain/
│   ├── errors/              # Domain errors (not-found, slug conflict, SKU conflict)
│   └── ports/               # Repository & use-case interfaces
├── application/
│   └── use-cases/           # Orchestration: create, update, delete, get, list, get-by-slug
├── infrastructure/
│   ├── http/
│   │   ├── controllers/     # Admin + Storefront HTTP controllers
│   │   ├── dto/             # NestJS validation DTOs
│   │   └── docs/            # Swagger decorators
│   └── persistence/
│       ├── mappers/         # DB row → ProductDetail aggregate
│       └── repositories/
│           ├── drizzle-product.repository.ts
│           └── queries/     # Per-operation query functions
└── products.module.ts
```

## Cross-Module Integration

The `Products` module aggregates inventory data for its administrative views (often referred to as the "Medusa Approach" for clean module separation). 

- **Internal Port**: It defines an `IInventoryService` port within its own domain layer.
- **Adapter**: It implements an `InventoryAdapter` in the infrastructure layer that calls the `InventoryModule` to fetch stock levels.
- **Usage**: The `AdminGetProductUseCase` fetches the base product details, then uses the `IInventoryService` port to fetch `inventoryItems` for all variants, merging them into an `AdminProductDetail` object.

### Admin Get Product Aggregation Flow

The `GET /admin/:productId` endpoint orchestrates the assembly of the `AdminProductDetail` aggregate by querying the database for product data and reaching out to the inventory module.

```mermaid
sequenceDiagram
    participant Controller as Admin Controller
    participant UC as AdminGetProductUseCase
    participant Repo as ProductRepository
    participant Adapter as InventoryAdapter
    participant InvMod as InventoryModule

    Controller->>UC: execute(id, storeId)
    UC->>Repo: findAdminByIdAndStore(id, storeId)
    Repo-->>UC: product (ProductDetail)
    
    note over UC: Extract all variant IDs
    
    UC->>Adapter: getInventoryForVariants(storeId, variantIds)
    Adapter->>InvMod: GET_VARIANTS_INVENTORY_UC.execute()
    InvMod-->>Adapter: Record<variantId, InventoryItem[]>
    Adapter-->>UC: inventoryMap
    
    note over UC: Merge inventory items into variant.inventoryItems array
    
    UC->>UC: AdminProductDetailSchema.safeParse()
    UC-->>Controller: AdminProductDetail
```

## Domain Errors

| Error | Trigger |
|---|---|
| `ProductNotFoundError` | Product ID not found or wrong store |
| `ProductSlugInUseError` | Slug already taken within same store |
| `SkuAlreadyExistsError` | SKU globally conflicts with another product's variant |

## Controllers

Two controllers serve different audiences from the same shared use cases.

### Admin (`product.admin.controller.ts`)

- **Base path:** `stores/:storeId/products/admin`
- **Auth:** Platform realm (`@UseRealm('platform')`) + `StorePermissionGuard`
- **Permissions:** `products.read`, `products.create`, `products.update`, `products.delete`
- **Endpoints:** `GET /`, `GET /:productId`, `POST /`, `PATCH /:productId`, `DELETE /:productId`
- `GET /:productId` orchestrates `AdminGetProductUseCase` to return an `AdminProductDetail`, which includes `costPrice` on variants **and** an array of `inventoryItems` from the `Inventory` module.

### Storefront (`product.storefront.controller.ts`)

- **Base path:** `stores/:storeId/products`
- **Auth:** `@PublicRoute()` — no authentication required
- **Endpoints:** `GET /`, `GET /:productId`, `GET /slug/:slug`
- Enforces `status = 'active'` by passing `query.status = 'active'` — drafts and archived products are invisible.
- Strips `costPrice` from all variant responses via `omitCostPrice()`.

## Create Flow (`POST /admin`)

Creates a product with its images, variants (with labels/images), and category associations in a single atomic transaction.

```mermaid
flowchart TD
    A([POST /admin]) --> B[findBySlugAndStore]
    B -->|conflict| E1([409 ProductSlugInUseError])
    B -->|ok| C[findExistingSkus]
    C -->|conflict| E2([409 SkuAlreadyExistsError])
    C -->|ok| D[uow.execute — transaction]

    D --> D1[INSERT products]
    D1 --> D2[INSERT product_images]
    D2 --> D3[INSERT product_variants]
    D3 --> D4[INSERT variant_labels & variant_images]
    D4 --> D5{categoryIds provided?}
    D5 -->|yes| D6[Validate category ownership\nINSERT product_categories]
    D5 -->|no| D7
    D6 --> D7([Return ProductDetail])
```

## Update Flow (`PATCH /admin/:productId`)

The update use case applies a **partial patch** — only fields present in the request body are changed.

```mermaid
flowchart TD
    A([PATCH /admin/:productId]) --> B[findByIdAndStore]
    B -->|not found| E1([404 ProductNotFoundError])
    B -->|found| C{slug changed?}
    C -->|yes| D[findBySlugAndStore]
    D -->|conflict| E2([409 ProductSlugInUseError])
    D -->|ok| F
    C -->|no| F{variants provided?}
    F -->|yes| G[findExistingSkus]
    G -->|conflict| E3([409 SkuAlreadyExistsError])
    G -->|ok| H
    F -->|no| H[uow.execute — transaction]

    H --> I[UPDATE products\nchanged fields only]
    I --> J{images provided?}
    J -->|yes| J1[DELETE all images\nINSERT new images]
    J -->|no| K
    J1 --> K{variants provided?}
    K -->|yes| L[Fetch existing variants\nid + sku]
    L --> M[Partition input\nby id match → sku fallback]
    M --> N[UPDATE matched variants in place\nreplace labels + images]
    M --> O[INSERT new variants\n+ labels + images]
    M --> P[DELETE absent variants\ncascades → inventory_items]
    N & O & P --> Q
    K -->|no| Q{categoryIds provided?}
    Q -->|yes| Q1[DELETE all categories\nINSERT new categories]
    Q -->|no| R
    Q1 --> R([Return ProductDetail])
```

### Variant Identity Preservation

Variants are matched by `id` first, then by `sku` as a fallback. Matched variants are **updated in place** — their UUID is preserved, which keeps `inventory_items` FK references intact. Only variants absent from the input payload are deleted (which cascades inventory). Labels and images on surviving variants are still replaced (they are value objects with no external FK dependents).

> **Rule:** Never omit `variants` from the payload unless you want them left untouched. Sending `variants: [...]` is a declarative statement of the full desired variant set.

## Delete Flow (`DELETE /admin/:productId`)

Soft delete — the product is **never hard-deleted**.

```mermaid
flowchart TD
    A([DELETE /admin/:productId]) --> B["softDelete(id, storeId)"]
    B -->|not found / already deleted| E([404 ProductNotFoundError])
    B -->|found| C[BEGIN transaction]
    C --> D["UPDATE products SET
    deletedAt = now()
    status = 'archived'
    slug = slug.archive.timestamp"]
    D -->|row returned| F["UPDATE product_variants SET
    sku = sku.archive.timestamp
    (all variants for this product)"]
    D -->|no row| G([return false → 404])
    F --> H([return true → 204 No Content])
```

The slug and SKU suffix appended on deletion frees the unique constraints immediately, allowing the same slug/SKU to be reused on a new product without any delay.

## Read Paths

| Context | Filter | Output Type |
|---|---|---|
| Admin `GET /:productId` | any status, not deleted | `AdminProductDetail` (includes `costPrice` & `inventoryItems`) |
| Admin `GET /` (list) | filter by status optional | `ProductDetail` (includes `costPrice`) |
| Storefront `GET /:productId` | `status = active` only | `ProductDetail` (cost stripped) |
| Storefront `GET /slug/:slug` | `status = active` only | `ProductDetail` (cost stripped) |
| Storefront `GET /` (list) | `status = active` only | `ProductDetail` (cost stripped) |

All reads are scoped to `storeId` — cross-tenant access is not possible.

## Schema Package

Input/output types live in `@ferrite/schema` (not in this module):

| Schema | Purpose |
|---|---|
| `CreateProductInput` | POST body |
| `UpdateProductInput` | PATCH body (all fields optional) |
| `UpdateVariantSchema` | Variant entry within update payload; adds optional `id` for identity matching |
| `ProductDetail` | Full aggregate response (product + images + variants + categories) |
| `AdminProductDetail` | Admin aggregate response (adds `inventoryItems` array to variants) |
