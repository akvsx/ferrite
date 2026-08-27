export class InvalidTransferError extends Error {
	readonly _tag = 'InvalidTransferError';

	constructor(reason: string) {
		super(`Invalid inventory transfer: ${reason}`);
	}
}
