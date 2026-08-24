export class SessionCreationAfterRegisterError extends Error {
	readonly _tag = 'SessionCreationAfterRegisterError';
	constructor(public readonly userId: string) {
		super(
			`User ${userId} was registered successfully but session creation failed.`
		);
	}
}
