import type {
	NewStorefrontSession,
	StorefrontSession,
} from '@ferrite/schema/storefront-auth/session.zodschema';

export const STOREFRONT_SESSION_REPOSITORY = Symbol(
	'IStorefrontSessionRepository'
);

export interface IStorefrontSessionRepository {
	/** Generate a session ID, store in Redis hash, set idle TTL */
	create(session: NewStorefrontSession): Promise<StorefrontSession>;

	/** Lookup session by ID, return null if not found or storeId mismatch */
	findByIdAndStoreId(
		id: string,
		storeId: string
	): Promise<StorefrontSession | null>;

	/** Get all active sessions for a user within a store */
	findAllByUserIdAndStoreId(
		userId: string,
		storeId: string
	): Promise<StorefrontSession[]>;

	/** Count live (non-expired) sessions for a user within a store.
	 * Checks each member of the user-session set against its hash key;
	 * stale IDs whose hashes no longer exist are pruned from the set as a
	 * side-effect, so the returned count reflects only sessions currently
	 * alive in Redis.
	 */
	countByUserIdAndStoreId(userId: string, storeId: string): Promise<number>;

	/**
	 * Sliding-window renewal: check PTTL and PEXPIRE if past renewal threshold.
	 * O(1) Redis ops; at most one write per renewal window.
	 */
	renewIfNeeded(sessionId: string): Promise<void>;

	/**
	 * Pure calculation: returns true if session has exceeded the absolute lifetime.
	 * Does NOT delete the session — caller is responsible for that.
	 */
	checkAbsoluteExpiry(session: StorefrontSession): boolean;

	/** DEL session key + SREM from the user's active-sessions set
	 * @returns true if session was deleted, false otherwise
	 */
	deleteById(id: string): Promise<boolean>;

	/** Delete every session for a user within a store (logout all devices)
	 * @returns true if any sessions were deleted, false otherwise
	 */
	deleteAllByUserId(userId: string, storeId: string): Promise<boolean>;
}
