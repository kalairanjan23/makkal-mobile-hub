CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL,
	CONSTRAINT "limit_cap" CHECK("limits"."count"<=5)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer` text NOT NULL,
	`checkout_key` text NOT NULL,
	`token` text NOT NULL,
	`data` text NOT NULL,
	`total` integer NOT NULL,
	`status` text NOT NULL,
	`payment` text NOT NULL,
	`courier` text DEFAULT '' NOT NULL,
	`tracking` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`history` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_checkout_key_unique` ON `orders` (`checkout_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_token_unique` ON `orders` (`token`);--> statement-breakpoint
CREATE INDEX `orders_customer_created` ON `orders` (`customer`,`created`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`compatibility` text NOT NULL,
	`color` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`stock` integer NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`updated` text NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("products"."stock">=0),
	CONSTRAINT "price_positive" CHECK("products"."price">0)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
