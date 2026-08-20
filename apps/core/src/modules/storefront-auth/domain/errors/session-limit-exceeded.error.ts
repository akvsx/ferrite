export class SessionLimitExceededError extends Error {
	readonly _tag = 'SessionLimitExceededError';
	constructor() {
		super(
			'You have reached the maximum number of active sessions. Please log out from other devices.'
		);
	}
}
