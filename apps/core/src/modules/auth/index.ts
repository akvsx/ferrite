// auth/index.ts

export * from '@ferrite/schema/auth/index';
export type {
	ITokenAuth,
	IWebhookAuth,
} from './domain/ports/auth-provider.port';
export {
	TOKEN_AUTH,
	WEBHOOK_AUTH,
} from './domain/ports/auth-provider.tokens';
// Decorators
export {
	AUTH_REALM_KEY,
	type AuthRealm,
	UseRealm,
} from './infrastructure/http/decorators/use-realm.decorator';
// Guards
export { AuthGuard } from './infrastructure/http/guards/auth.guard';
export { PlatformRBACGuard } from './infrastructure/http/guards/platform-rbac.guard';
export { WebhookGuard } from './infrastructure/http/guards/webhook.guard';
