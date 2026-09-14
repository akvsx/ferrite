export class InvalidAdjustmentError extends Error {
	readonly _tag = 'InvalidAdjustmentError';

	constructor(message: string) {
		super(message);
	}
}
