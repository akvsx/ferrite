import { z } from 'zod/v4';

const argon2Schema = z.object({
	memoryCost: z.coerce.number().int().positive().default(19456),
	timeCost: z.coerce.number().int().positive().default(2),
	parallelism: z.coerce.number().int().positive().default(1),
	outputLen: z.coerce.number().int().positive().default(32),
	salt: z.string().optional(),
	saltLen: z.coerce.number().int().positive().default(16),
});

const redisSchema = z.object({
	db: z.coerce.number().int().nonnegative().default(0),
	tls: z.boolean().default(false),
});

const rateLimitConfigSchema = z.object({
	windowMs: z.coerce
		.number()
		.int()
		.positive()
		.default(15 * 60 * 1000),
	maxAttempts: z.coerce.number().int().positive().default(5),
});

const rateLimitingSchema = z.object({
	login: rateLimitConfigSchema.default(() => rateLimitConfigSchema.parse({})),
	loginIp: z
		.object({
			windowMs: z.coerce
				.number()
				.int()
				.positive()
				.default(15 * 60 * 1000),
			maxAttempts: z.coerce.number().int().positive().default(20),
		})
		.default(() =>
			z
				.object({
					windowMs: z.coerce
						.number()
						.int()
						.positive()
						.default(15 * 60 * 1000),
					maxAttempts: z.coerce.number().int().positive().default(20),
				})
				.parse({})
		),
	registerIp: z
		.object({
			windowMs: z.coerce
				.number()
				.int()
				.positive()
				.default(60 * 60 * 1000),
			maxAttempts: z.coerce.number().int().positive().default(10),
		})
		.default(() =>
			z
				.object({
					windowMs: z.coerce
						.number()
						.int()
						.positive()
						.default(60 * 60 * 1000),
					maxAttempts: z.coerce.number().int().positive().default(10),
				})
				.parse({})
		),
	passwordReset: z
		.object({
			windowMs: z.coerce
				.number()
				.int()
				.positive()
				.default(60 * 60 * 1000),
			maxAttempts: z.coerce.number().int().positive().default(3),
		})
		.default(() =>
			z
				.object({
					windowMs: z.coerce
						.number()
						.int()
						.positive()
						.default(60 * 60 * 1000),
					maxAttempts: z.coerce.number().int().positive().default(3),
				})
				.parse({})
		),
	verifyEmail: rateLimitConfigSchema.default(() =>
		rateLimitConfigSchema.parse({
			windowMs: 60 * 1000,
			maxAttempts: 10,
		})
	),
	mfaVerify: rateLimitConfigSchema.default(() =>
		rateLimitConfigSchema.parse({})
	),
	/** Minimum milliseconds a user must wait before requesting another verification email. */
	resendCooldownMs: z.coerce.number().int().positive().default(60_000),
});

const sessionSchema = z.object({
	/** Sliding-window idle timeout in milliseconds. Default: 7 days */
	idleLifetimeMs: z.coerce
		.number()
		.int()
		.positive()
		.default(7 * 24 * 60 * 60 * 1000),
	/** Hard ceiling for session lifetime in milliseconds. Default: 30 days */
	absoluteLifetimeMs: z.coerce
		.number()
		.int()
		.positive()
		.default(30 * 24 * 60 * 60 * 1000),
	/**
	 * Fraction of idleLifetimeMs that must have elapsed before the TTL is renewed.
	 * Avoids a Redis write on every single request.
	 * Default: 0.5 (renew when >50% of idle window has elapsed)
	 */
	renewalThreshold: z.coerce.number().positive().max(1).default(0.5),
	/** Cookie name for the session ID. Default: __sf_session */
	cookieName: z.string().default('__sf_session'),
});

const securitySchema = z.object({
	/** Maximum failed attempts before an account lockout is triggered. Default: 5 */
	lockoutThreshold: z.coerce.number().int().positive().default(5),
	/** Duration of the account lockout in milliseconds. Default: 15 minutes */
	lockoutDurationMs: z.coerce
		.number()
		.int()
		.positive()
		.default(15 * 60 * 1000),
});

const storefrontAuthSchema = z.object({
	argon2: argon2Schema.default(() => argon2Schema.parse({})),
	redis: redisSchema.default(() => redisSchema.parse({})),
	rateLimiting: rateLimitingSchema.default(() => rateLimitingSchema.parse({})),
	session: sessionSchema.default(() => sessionSchema.parse({})),
	security: securitySchema.default(() => securitySchema.parse({})),
});

export const storefrontAuth = storefrontAuthSchema.default(() =>
	storefrontAuthSchema.parse({})
);
