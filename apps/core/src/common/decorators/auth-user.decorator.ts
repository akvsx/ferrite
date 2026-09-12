import type { AuthUser } from '@ferrite/schema/auth/auth-user.zodschema';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * The `AuthGuard` must run before this decorator — it attaches the verified
 * `authUser` object to `request.authUser`.
 *
 * @example
 * ```ts
 * @Get('me')
 * getMe(@AuthUserParam() user: AuthUser) { … }
 * ```
 */
const PlatformUserParam = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): AuthUser => {
		const request = ctx.switchToHttp().getRequest();
		return request.authUser as AuthUser;
	}
);

export {
	/**
	 * @deprecated Use `PlatformUser` instead.
	 */
	PlatformUserParam as AuthUserParam,
	PlatformUserParam,
};
