import type { Request } from '@common/types/request';

export const extractCookie = (
	request: Request,
	cookieName: string
): string | undefined => {
	if (request.cookies?.[cookieName]) {
		return request.cookies[cookieName];
	}
	const cookieHeader = request.headers.cookie;
	if (cookieHeader) {
		const match = cookieHeader.match(
			new RegExp(`(?:^|; )${cookieName}=([^;]*)`)
		);
		if (match) {
			return decodeURIComponent(match[1]);
		}
	}
	return undefined;
};
