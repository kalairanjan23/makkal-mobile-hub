# Makkal Mobile Hub — operating the store

This release replaces the visual prototype with a persistent storefront. It uses React/Vinext, a Cloudflare-compatible serverless Worker, D1 for products/orders/customer records and R2 for uploaded photographs. No payment provider, paid hosting subscription, purchased domain or automatic notification service is configured by this release. Platform usage and commercial terms still govern hosting; no unlimited or permanent zero-cost promise is made.

## First launch

1. Open **Store admin** in the footer, then sign in with the owner's ChatGPT account (the email configured in OWNER_EMAIL).
2. In Products, add real product photographs, model compatibility, colour, descriptions, prices and stock. Use one product per sellable variant. Publish products individually. There are no seeded products or fake reviews.
3. In Settings, add the business address, WhatsApp number in 91XXXXXXXXXX format, serviceable pincodes, delivery charge, optional free-delivery threshold and your actual delivery, return and privacy policies. State how customer information is handled and how customers can request deletion. Review these policies against your business obligations before accepting orders.
4. Enable **Open the store for order requests** and save. Public browsing is available before ordering opens. Availability is checked server-side at checkout.
5. Perform a small real-device order walkthrough, update it in admin, verify the tracking code, then cancel it to restore stock. Avoid placing fabricated orders in customer records.

## Daily operations

- Review Requested orders. Confirm availability and contact customers to arrange fulfilment/payment. No money is collected online.
- Statuses: Requested → Confirmed → Packed → Shipped → Out for delivery → Delivered. Add a courier and tracking reference before shipping.
- Cancellation is available before shipment and restores reserved stock once. Shipped/delivered orders can enter Return in transit; mark Returned only after receipt and inspection, because that transition restores stock. Damaged returned stock should be adjusted in Products before republishing availability.
- Payment records are separate: Not collected, Collected offline, Refund pending, Refunded. Updating them only records an action taken outside the website; it does not move money.
- Refresh the admin screen for new orders. Reports exports the latest 200 orders; totals are separated by payment state. This is an operational summary, not an accounting ledger.
- Product edits use optimistic concurrency so an old editor cannot overwrite stock reserved by a newly placed order.
- Keep periodic database backups/exports using the hosting provider's database tools. The customer CSV is not a full database backup.

## Customer journeys

Customers can browse, filter by category/model, sort by price, save items and place guest order requests without ChatGPT sign-in. A random HTTP-only cookie links guest baskets, delivery details and orders to their browser for 30 days. Clearing cookies or using another device loses access to that guest history; orders remain available through the private order tracking code. Signing in uses a separate account and does not automatically merge guest history. Customers must keep the order ID and secret tracking code; only the owner and the customer's original session/account see contact details.

There is no automatic WhatsApp, SMS, email or courier integration. Contact links open the store's WhatsApp or Instagram. Tracking reflects updates entered by the owner. Account sign-in is optional and currently uses ChatGPT; separate email/phone authentication is not implemented.

## Verification and operating limits

Run `node tests/store-integrity.mjs` and `node node_modules/typescript/bin/tsc --noEmit` before releases. The integration test executes the real request handlers with SQLite and simulated platform identities in memory, covering authorization, origin checks, invalid quantities, delivery eligibility, authoritative totals, duplicate checkout, private tracking, stale stock edits, status transitions, restocking and transactional rollback. These are not browser or live-provider tests.

Current bounded lists: 500 products, 200 owner orders, 50 customer orders; 100 saved items; 30 distinct items per cart and 10 units per item. Uploaded photos accept JPG/PNG/WebP up to 3 MB. Order requests are limited to five per hour per platform-supplied client IP, falling back to session identity when absent. Shared networks may share this limit. A larger catalogue/order history needs pagination before those boundaries become operationally restrictive.

The homepage renders catalogue content on the server. The hero is compressed to WebP; product images load lazily. No product data or orders are stored solely in browser localStorage.

Remaining integrations: online payment gateway, automatic courier updates, messaging, customer phone/email authentication, coupon campaigns and advanced accounting/reporting. A store announcement and configurable free-delivery threshold are available now. Full return/refund automation and partial returns are not implemented.
