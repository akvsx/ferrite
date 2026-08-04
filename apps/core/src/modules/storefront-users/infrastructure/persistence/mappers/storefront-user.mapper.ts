import { type StorefrontUserTable } from '@core/database/schema/storefront-user.schema';
import { type StorefrontUser, StorefrontUserSchema } from '@ferrite/schema';

export class StorefrontUserMapper {
	static toDomain(row: StorefrontUserTable): StorefrontUser {
		return StorefrontUserSchema.parse({
			...row,
		});
	}
}
