import type { Request } from '@common/types/request';

export const extractCookie = (
	request: Request,
	cookieName: string
): string | undefined => {
	if (request.cookies?.[cookieName] !== undefined) {
		return request.cookies[cookieName];
	}
	const cookieHeader = request.headers.cookie;
	if (cookieHeader) {
		const escapedName = cookieName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
		const match = cookieHeader.match(
			new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`)
		);
		if (match) {
			try {
				return decodeURIComponent(match[1]);
			} catch {
				return undefined;
			}
		}
	}
	return undefined;
};
