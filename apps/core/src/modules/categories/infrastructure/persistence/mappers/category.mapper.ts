import type { categories } from '@core/database/schema/category.schema';
import { type Category, CategorySchema } from '@ferrite/schema';

export class CategoryMapper {
	static toDomain(row: typeof categories.$inferSelect): Category {
		return CategorySchema.parse({
			id: row.id,
			storeId: row.storeId,
			parentId: row.parentId,
			name: row.name,
			slug: row.slug,
			description: row.description,
			sortOrder: row.sortOrder,
			isActive: row.isActive,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		});
	}
}
