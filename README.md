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

### Interpretation

The task was to allow product configuration per location. I interpreted this as letting
admins decide, for each location:

1. **which products it sells**, and
2. **which option values of each product it offers**, e.g. an outlet that doesn't carry
   Large, or a mall store that only sells Black.

Shoppers at a location should only be able to configure, and end up with, SKUs that the
location actually offers.

### Data model

```
Client ──< Organization ──< Location ──< Product Listing >── Product
                                               │
                                               └── option value rule + list ──> Product Option Values
```

A new **Product Listings** collection (`src/collections/ProductListings.ts`) represents
"this product at this location":

| Field             | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `product`         | The product being offered                                      |
| `location`        | Where it is offered                                            |
| `status`          | `draft` / `active` / `archived`, like the other collections    |
| `optionValueRule` | `all`, `only` or `except`; how to read `optionValues`          |
| `optionValues`    | The option values the rule applies to                          |

A unique index on `(product, location)` prevents a product being listed twice at the same
location. Products and Locations each have a `listings` join field so both sides show
their listings in the admin.

### Key decisions

**A separate listings collection rather than relationship fields on Product.**
Putting `clients` and `locations` relationships directly on Product was simpler, but the
two lists could disagree (a location whose client isn't selected), and there would be
nowhere to store per-location data. A listing gives availability its own record, which
is also the natural home for future per-location data such as price or availability
dates.

**The client is derived, not stored.** A listing only references a location; its client
is found through location → organization → client. Storing the client as well would
duplicate data that could drift out of sync. Querying a client's listings works through
the nested path: `where: { "location.organization.client": { equals: clientId } }`.

**One list plus a rule, instead of separate allow and exclude lists.** With both lists,
the two can contradict each other, and once an allow list exists an exclude list adds
nothing. A single list with an explicit rule makes conflicting data impossible to store,
rather than detecting it after the fact:

| Rule     | Meaning                                                                       |
| -------- | ----------------------------------------------------------------------------- |
| `all`    | Every value is offered (default; the list is cleared on save)                 |
| `except` | Every value except the listed ones is offered                                 |
| `only`   | Per option: an option with listed values offers just those; an option with no listed values is unrestricted |

The rules also give different defaults when a product changes: under `except`, a newly
added value is offered automatically; under `only`, a restricted option stays restricted.

**`only` applies per option.** My first version applied `only` across all options, which
meant listing every size and style just to restrict colour, and silently hid any newly
added size at every `only` location. Applying it per option means a location only
constrains the options it cares about: `only [Black]` restricts colour and leaves size and
style open.

**Availability is computed, not stored.** Nothing is copied onto SKUs. The available
SKUs are derived from the listing's rule when needed, so there is a single source of
truth.

### Validation

Rules are enforced in a server-side field validator, so they apply to the admin, REST,
GraphQL and the Local API alike. The admin's filtered dropdown (only this product's
values) is a convenience, not a safeguard. A listing is rejected when:

- the rule is `only` and no values are selected,
- a selected value belongs to a different product, or
- the rule leaves an option with no available values (only reachable with `except`).

The validator and the SKU availability helpers share the same logic
(`src/lib/optionValueRule.ts`), so what can be saved and what is offered can't drift
apart.

### Checking what a location offers

`getAvailableSkus(payload, listingId)` in `src/lib/optionValueRule.ts` returns the SKUs a
listing makes available at its location, applying the listing's rule. This is the
starting point for any shopper-facing API or UI.

A demo storefront built on this configuration is available on the `shop-demo` branch.

### Testing

`pnpm run test:int` runs integration tests against Payload and SQLite: listing
uniqueness, join fields, client lookups, the SKUs available under each option value rule,
and every validation error (asserting the exact field and message).

Tests create and clean up their own data. Integration test files run one at a time
(`fileParallelism: false`) because they share one SQLite database.

### Assumptions

- Configuration is set per location only; there is no inheritance from the client or
  organization.
- A listing restricts option values, not specific combinations of them.
- An option value's own `status` turns it off everywhere; listings handle per-location
  differences.

### Known limitations and next steps

- **SKU validation.** SKUs are not yet checked for one value per option, values from the
  same product, or duplicate combinations; malformed SKUs should be rejected on save.
- **Listings are validated only when saved.** If a product's options or values change
  later, an existing listing can become invalid without being flagged. For example,
  deleting every value in an `only` list leaves an empty list, which then behaves like
  `all`. A hook on option value changes could re-check affected listings.
- **One listing per location.** Offering a product at all of a client's locations takes
  one listing each. Client- or organization-level rules, combined with location rules,
  would remove that repetition.
- **Combination rules** (e.g. Red only in Babydoll) would need SKU-level restrictions.
- **No shopper-facing API.** Clients with their own storefronts would need an endpoint
  that returns the available values for a location and resolves a selection to a SKU,
  built on `getAvailableSkus`. The `shop-demo` branch shows this as a storefront.
- **Per-location product data** such as price would naturally live on the listing.
- **No cart or checkout.** Any checkout would need to re-check the SKU against the
  listing on the server.
- **Access control.** All collections use Payload's defaults, so any admin can edit any
  client's data. Client-scoped admin access would need access rules.


## Questions

If you have any issues or questions, please reach out to your interview coordinator.
