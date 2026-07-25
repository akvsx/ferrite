export class InvalidLoginMethodError extends Error {
	constructor() {
		super('Invalid login method');
	}
}
