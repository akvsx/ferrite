export class AccountBannedError extends Error {
	readonly _tag = 'AccountBannedError';
	constructor() {
		super('Account is banned.');
	}
}
