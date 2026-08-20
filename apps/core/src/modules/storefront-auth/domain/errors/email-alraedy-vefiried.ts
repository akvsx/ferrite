export class EmailAlreadyVerifiedError extends Error {
	readonly _tag = 'EmailAlreadyVerifiedError';

	constructor(message: string = 'Email already verified') {
		super(message);
		this.name = 'EmailAlreadyVerifiedError';
	}
}
