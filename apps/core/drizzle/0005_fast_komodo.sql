ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_outcome_check" CHECK ("audit_log"."outcome" in ('success', 'denied', 'failure'));--> statement-breakpoint
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_status_check" CHECK ("outbox_event"."status" in ('pending', 'dispatched', 'dead'));--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_principal_check" CHECK ("session"."principal" in ('user', 'platform'));--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_kind_check" CHECK ("session"."kind" in ('normal', 'impersonation'));--> statement-breakpoint
ALTER TABLE "login_event" ADD CONSTRAINT "login_event_outcome_check" CHECK ("login_event"."outcome" in ('success', 'failure', 'locked'));--> statement-breakpoint
ALTER TABLE "login_event" ADD CONSTRAINT "login_event_reason_check" CHECK ("login_event"."reason" is null or "login_event"."reason" in ('bad_credentials', 'status_rejected', 'account_locked', 'ip_locked'));--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_status_check" CHECK ("app_user"."status" in ('active', 'disabled', 'unactivated', 'left'));