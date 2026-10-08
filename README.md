# IRC Engineering Interview repo

This template comes configured with the bare minimum to get started on anything you need.
We are using [Payload CMS](https://github.com/payloadcms/payload) as the basis for this
interview project to provide a basic framework.

## Quick Start - local setup

To spin up this project locally, follow these steps:

### Clone

You'll want to have standalone copy of this repo on your machine. If you've already cloned
this repo, skip to [Development](#development).

### Development

1. First [clone the repo](#clone) if you have not done so already
2. `cd my-project && cp .env.example .env` to copy the example environment variables.
2. `cp example.db product-configurator-interview.db` to copy the example database.

3. `pnpm install && pnpm dev` to install dependencies and start the dev server
4. open `http://localhost:3000` to open the app in your browser. Follow the on-screen
   instructions to login and create your first admin user.
5. `pnpm run seed` after you've set up your admin user to seed initial data.

## How it works

The Payload config is tailored specifically to the needs this interview. It is
pre-configured in the following ways:

### Collections

See the Payload [Collections docs](https://payloadcms.com/docs/configuration/collections)
for details on how to extend this functionality.

- #### Clients

  In a B2B2C relationship, clients are the direct customers of the business. They have a
  name and sub-groupings called Organizations.

- #### Organizations

  Organizations are arbitrary groupings of locations, usually tied to a Client's business
  structure.

- #### Locations

  Locations are similar to stores or venues, this is where the product is being provided.

- #### Products

  The ecommerce product being sold. Examples: insurance coverage or a t-shirt.

- #### Product Options

  Defines an option for a product, such as size or colour.

- #### Product Option Values

  Defines a specific value of a product option. For example, values for a "colour" product
  option could be "red" or "black", and values for a size option could be "small" or
  "medium".

- #### SKUs

  The individual variants of a product, a unique combination of product option values of
  all of a product's options.

- #### Product Listings

  A product offered at a specific location, plus which of its option values that location
  offers. See [Per-location product configuration](#per-location-product-configuration).

- #### Users (Authentication)

  Users are auth-enabled collections that have access to the admin panel.

- #### Media

  This is the uploads enabled collection. It features pre-configured sizes, focal point
  and manual resizing to help you manage your pictures.


## Per-location product configuration

The task was to allow product configuration per location. I interpreted this as letting
admins decide, for each location, **which products it sells** and **which option values
of each product it offers**, e.g. an outlet that doesn't carry Large, or a mall store
that only sells Black.

```
Client ──< Organization ──< Location ──< Product Listing >── Product
                                               │
                                               └── option value rule + list ──> Product Option Values
```

Each Product Listing has a rule that says how to read its list of option values:

| Rule     | Meaning                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| `all`    | Every value is offered (default)                                                                             |
| `except` | Every value except the listed ones is offered                                                                |
| `only`   | Per option: an option with listed values offers just those; an option with no listed values is unrestricted |

### Changes by file

#### `src/collections/ProductListings.ts` (new)

The new collection, one record per product per location:

- `product` and `location` relationships, both required, with a unique index on the pair
  so a product can't be listed twice at the same location.
- `status` (`draft` / `active` / `archived`), shared with the other collections.
- `optionValueRule` (`all` / `only` / `except`) and `optionValues`, the list the rule
  applies to.
- In the admin, `optionValues` is hidden when the rule is `all`, and its dropdown only
  offers values belonging to the listing's product.
- A `beforeChange` hook clears `optionValues` when the rule is `all`, so no stale values
  are left behind.
- A field validator rejects a listing when the rule is `only` with no values, a value
  belongs to a different product, or the rule leaves an option with no available values
  (only possible with `except`). It runs on the server, so it applies to the admin, REST,
  GraphQL and the Local API alike.

#### `src/lib/optionValueRule.ts` (new)

The rule logic, shared by the validator above and by anything that needs to know what a
location offers, so the two can't disagree:

- `createOptionValueFilter(listing, optionIdByValueId)` returns a check for whether a
  single option value is offered. `only` needs to know which option each value belongs
  to, hence the map.
- `getOptionIdByValueId(payload, productId)` loads that map for a product.
- `filterAvailableSkus(listing, skus, optionIdByValueId)` keeps the SKUs whose values are
  all offered.
- `getAvailableSkus(payload, listingId)` loads a listing and returns the SKUs available
  at its location.
- `toId` normalises relationship values, which may be IDs or populated documents.

#### `src/collections/Products.ts` and `src/collections/Locations.ts`

Each gets a `listings` join field, so a product shows where it's sold and a location
shows what it sells. Join fields are virtual; nothing extra is stored.

#### `src/payload.config.ts`

Registers the new collection in the admin's "Product" group.

#### `src/payload-types.ts`

Regenerated with `pnpm generate:types` to add the `ProductListing` type and the new join
fields.

#### `scripts/seed.ts`

Adds one listing per rule for the Moose T-Shirt:

- Maple & Birch - Flagship Store: `all`
- Maple & Birch - Outlet Store 1: `except` Large
- Harbour St - Vancouver Mall: `only` Black (size and style stay unrestricted)

Locations have no handle, so the seed now records location IDs by title and listings
refer to locations by title.

#### `tests/int/productListings.int.spec.ts` (new)

Covers the listing itself: creating one, rejecting a duplicate product and location,
the join fields on both sides, and finding a client's listings through
`location.organization.client`.

#### `tests/int/listingOptionValues.int.spec.ts` (new)

Covers the rules, using its own product with two options and four SKUs:

- the SKUs available under `all`, `except` and `only`, including `only` restricting one
  option and two options at once
- the list being cleared when switching back to `all`
- each validation error, asserting the exact field and message
- a rejected update leaving the listing unchanged

#### `vitest.config.mts`

Sets `fileParallelism: false`. Every test file starts its own Payload instance on the
same SQLite database, and running the files in parallel caused intermittent
`SQLITE_BUSY` errors.

Both test files create and delete their own data. Run them with `pnpm run test:int`.

### Key decisions

- **A separate collection rather than relationship fields on Product.** Fields for
  clients and locations on Product could disagree with each other, and would leave
  nowhere to store per-location data such as price.
- **The client is derived, not stored.** A listing only references a location, and the
  client is found through location → organization → client, so the two can't
  contradict each other.
- **One list plus a rule, rather than separate allow and exclude lists.** Two lists can
  conflict, and once an allow list exists an exclude list adds nothing. A single list
  with an explicit rule makes conflicting data impossible to store.
- **`only` applies per option.** My first version applied it across all options, which
  meant listing every size and style just to restrict colour, and hid newly added sizes
  at every `only` location.
- **Availability is computed, not stored.** It depends on the listing, the SKUs, options
  and values, so a stored copy would need updating whenever any of them changed. The
  rule is the single source of truth.

### Known limitations and next steps

- **SKUs aren't validated.** Nothing checks for one value per option, values from the
  same product, or duplicate combinations.
- **Listings are only validated when saved.** If a product's options or values change
  later, an existing listing can become invalid without being flagged.
- **Configuration is per location only.** Offering a product at all of a client's
  locations takes one listing each; client- or organization-level defaults would remove
  that repetition.
- **No rules for specific combinations** (e.g. Red only in Babydoll); that would need
  SKU-level restrictions.
- **No shopper-facing API.** An endpoint for client storefronts would build on
  `getAvailableSkus`. A demo storefront is available on the `shop-demo` branch.
- **Access control** uses Payload's defaults, so any admin can edit any client's data.


## Questions

If you have any issues or questions, please reach out to your interview coordinator.
