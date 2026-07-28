export class RateLimitedError extends Error {
	readonly _tag = 'RateLimitedError';
	constructor(public readonly retryAfter?: number) {
		super('Too many attempts, please try again later');
	}
}
