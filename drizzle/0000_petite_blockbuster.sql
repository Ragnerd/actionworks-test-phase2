CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`type` text NOT NULL,
	`source_account` text,
	`from_account` text,
	`to_account` text,
	`amount` text,
	`asset` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `op_tx_idx` ON `operations` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `posts_name_idx` ON `posts` (`name`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`source_account` text NOT NULL,
	`ledger` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`fee_charged` text NOT NULL,
	`successful` integer NOT NULL,
	`memo` text,
	`memo_type` text,
	`envelope_xdr` text,
	`result_xdr` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `tx_source_idx` ON `transactions` (`source_account`);--> statement-breakpoint
CREATE INDEX `tx_time_idx` ON `transactions` (`timestamp`);