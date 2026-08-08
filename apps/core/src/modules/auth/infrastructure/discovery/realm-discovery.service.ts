import {
	type IRealmAuthAdapter,
	REALM_ADAPTER_MAP,
} from '@auth/domain/ports/realm-auth-adapter.port';
import { AppLogger } from '@core/logger/logger.service';
import {
	AUTH_REALM_KEY,
	type AuthRealm,
} from '@modules/auth/infrastructure/http/decorators/use-realm.decorator';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, Reflector } from '@nestjs/core';

/**
 * Boot-time validator for realm ↔ route path consistency.
 *
 * Scans all controllers decorated with `@UseRealm()` and enforces:
 *   1. `@UseRealm('storefront')` must NOT be on an `/admin` path.
 *   2. `@UseRealm('platform')` on a `stores/` path MUST include `/admin`.
 *   3. Every `@UseRealm(realm)` value must have a registered adapter in the `REALM_ADAPTER_MAP`.
 *   4. Controllers with an `/admin` path MUST be decorated with `@UseRealm('platform')`.
 *
 * Follows the same fail-fast pattern as `GraphileDiscoveryService`:
 * errors are collected first, then thrown via `process.nextTick` to crash the
 * process with a clear message instead of silently booting a broken app.
 */
@Injectable()
export class RealmDiscoveryService implements OnModuleInit {
	constructor(
		private readonly discovery: DiscoveryService,
		private readonly reflector: Reflector,
		@Inject(REALM_ADAPTER_MAP)
		private readonly realmAdapters: Map<AuthRealm, IRealmAuthAdapter>,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(RealmDiscoveryService.name);
	}

	/**
	 * Intentionally uses `process.nextTick(() => { throw err })` instead of a
	 * simple re-throw inside `.catch()` to escape the Promise chain. A re-throw
	 * inside `.catch()` would produce an unhandled rejection that NestJS silently
	 * ignores, allowing the app to boot with a broken realm configuration.
	 * Scheduling the throw via `process.nextTick` promotes it to an uncaught
	 * exception, which crashes the process and enforces fail-fast behaviour.
	 */
	async onModuleInit() {
		this.validateRealms().catch((err) => {
			process.nextTick(() => {
				throw err;
			});
		});
	}

	private async validateRealms(): Promise<void> {
		const errors: string[] = [];
		const controllers = this.discovery.getControllers();

		for (const wrapper of controllers) {
			const { instance } = wrapper;
			if (!instance) continue;

			const controllerClass = instance.constructor;
			const path = this.reflector.get<string>(PATH_METADATA, controllerClass);
			if (!path) continue;

			const realm = this.reflector.get<AuthRealm>(
				AUTH_REALM_KEY,
				controllerClass
			);

			// Rule 1: Admin paths must be decorated with the platform realm
			if (this.isAdminPath(path) && realm !== 'platform') {
				errors.push(
					`${controllerClass.name} has admin path "${path}" but is not decorated with @UseRealm('platform'). All admin controllers must use the platform realm.`
				);
			}

			if (!realm) continue;

			// Rule 2: Every declared realm must have a registered adapter
			if (!this.realmAdapters.has(realm)) {
				errors.push(
					`${controllerClass.name} declares @UseRealm('${realm}') but no adapter ` +
						`is registered for realm "${realm}". Register an IRealmAuthAdapter ` +
						`for this realm in the REALM_ADAPTER_MAP.`
				);
			}

			// Rule 3: @UseRealm('platform') on a store path MUST include /admin
			if (
				realm === 'platform' &&
				this.isStorePath(path) &&
				!this.isAdminPath(path)
			) {
				errors.push(
					`${controllerClass.name} is @UseRealm('platform') on store path "${path}" ` +
						`but missing /admin segment. Platform store controllers must use ` +
						`stores/:storeId/admin/*.`
				);
			}
		}

		if (errors.length > 0) {
			const msg = `Realm configuration has ${errors.length} error(s):\n  - ${errors.join('\n  - ')}`;
			this.logger.error(msg);
			throw new Error(msg);
		}

		this.logger.log('Realm validation passed for all controllers');
	}

	private isAdminPath(path: string): boolean {
		return /\/admin(\/|$)/.test(path);
	}

	private isStorePath(path: string): boolean {
		return /stores\//.test(path);
	}
}
