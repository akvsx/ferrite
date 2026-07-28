import { UNIT_OF_WORK } from '@common/interfaces/unit-of-work.interface';
import { DB } from '@core/database/db.provider';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import { storefrontUsers } from '@core/database/schema/storefront-user.schema';
import {
	createDrizzleQueryBuilderMock,
	createTracerMock,
	createUowMock,
	setupDrizzleUowMock,
} from '@core/testing/repository-mock';
import { OTEL_TRACER } from '@core/tracer/tracer.constraint';
import { Test, TestingModule } from '@nestjs/testing';
import { StorefrontUserMapper } from '../mappers/storefront-user.mapper';
import { DrizzleStorefrontUserRepository } from './drizzle-storefront-user.repository';

describe('DrizzleStorefrontUserRepository', () => {
	let repository: DrizzleStorefrontUserRepository;

	const mockQueryBuilder = createDrizzleQueryBuilderMock();
	const mockTracer = createTracerMock();
	const mockUow = createUowMock();

	beforeEach(async () => {
		jest.clearAllMocks();

		setupDrizzleUowMock(mockQueryBuilder);

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DrizzleStorefrontUserRepository,
				{
					provide: DB,
					useValue: mockQueryBuilder,
				},
				{
					provide: OTEL_TRACER,
					useValue: mockTracer,
				},
				{
					provide: UNIT_OF_WORK,
					useValue: mockUow,
				},
			],
		}).compile();

		repository = module.get<DrizzleStorefrontUserRepository>(
			DrizzleStorefrontUserRepository
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('create', () => {
		it('should execute inside UOW, insert, and return mapped user', async () => {
			const newUserData = {
				id: 'usr_123',
				email: 'new@example.com',
				storeId: 'store_123',
			} as any;
			const mockDbUser = { id: 'usr_123', ...newUserData };

			mockQueryBuilder.returning.mockResolvedValue([mockDbUser]);
			const toDomainSpy = jest
				.spyOn(StorefrontUserMapper, 'toDomain')
				.mockReturnValue('MAPPED_DOMAIN_USER' as any);

			const result = await repository.create(newUserData);

			expect(mockTracer.withSpan).toHaveBeenCalledWith(
				'db.storefrontUsers.create',
				expect.any(Function),
				expect.objectContaining({ 'db.operation': 'insert' })
			);

			expect(mockUow.execute).toHaveBeenCalled();
			expect(DrizzleUnitOfWork.unwrap).toHaveBeenCalledWith('mock_tx_context');
			expect(mockQueryBuilder.insert).toHaveBeenCalledWith(storefrontUsers);
			expect(mockQueryBuilder.values).toHaveBeenCalledWith(newUserData);
			expect(toDomainSpy).toHaveBeenCalledWith(mockDbUser);
			expect(result).toBe('MAPPED_DOMAIN_USER');
		});

		it('should use provided transaction context if passed', async () => {
			const newUserData = {
				id: 'usr_123',
				email: 'new@example.com',
				storeId: 'store_123',
			} as any;
			const mockDbUser = { id: 'usr_123', ...newUserData };

			mockQueryBuilder.returning.mockResolvedValue([mockDbUser]);
			jest
				.spyOn(StorefrontUserMapper, 'toDomain')
				.mockReturnValue('MAPPED_DOMAIN_USER' as any);

			const customTx = { custom: 'tx' } as any;

			await repository.create(newUserData, customTx);

			expect(mockUow.execute).not.toHaveBeenCalled();
			expect(DrizzleUnitOfWork.unwrap).toHaveBeenCalledWith(customTx);
		});
	});

	describe('findByStoreIdAndEmail', () => {
		it('should return a mapped user when found', async () => {
			const mockDbUser = {
				id: 'usr_123',
				storeId: 'store_123',
				email: 'test@example.com',
			};
			mockQueryBuilder.limit.mockResolvedValue([mockDbUser]);
			const toDomainSpy = jest
				.spyOn(StorefrontUserMapper, 'toDomain')
				.mockReturnValue('MAPPED_DOMAIN_USER' as any);

			const result = await repository.findByStoreIdAndEmail(
				'store_123',
				'test@example.com'
			);

			expect(mockQueryBuilder.select).toHaveBeenCalled();
			expect(mockQueryBuilder.from).toHaveBeenCalledWith(storefrontUsers);
			expect(toDomainSpy).toHaveBeenCalledWith(mockDbUser);
			expect(result).toBe('MAPPED_DOMAIN_USER');
		});

		it('should return null when no user is found', async () => {
			mockQueryBuilder.limit.mockResolvedValue([]);

			const result = await repository.findByStoreIdAndEmail(
				'store_123',
				'test@example.com'
			);

			expect(result).toBeNull();
		});
	});

	describe('findByIdAndStoreId', () => {
		it('should return a mapped user when found', async () => {
			const mockDbUser = { id: 'usr_123', storeId: 'store_123' };
			mockQueryBuilder.limit.mockResolvedValue([mockDbUser]);
			jest
				.spyOn(StorefrontUserMapper, 'toDomain')
				.mockReturnValue('MAPPED_DOMAIN_USER' as any);

			const result = await repository.findByIdAndStoreId(
				'usr_123',
				'store_123'
			);

			expect(mockQueryBuilder.select).toHaveBeenCalled();
			expect(result).toBe('MAPPED_DOMAIN_USER');
		});

		it('should return null when no user is found', async () => {
			mockQueryBuilder.limit.mockResolvedValue([]);

			const result = await repository.findByIdAndStoreId(
				'usr_nonexistent',
				'store_123'
			);

			expect(result).toBeNull();
		});
	});

	describe('incrementFailedLogins', () => {
		it('should increment failed logins inside UOW', async () => {
			mockQueryBuilder.returning.mockResolvedValue([{ failedLoginCount: 3 }]);
			const result = await repository.incrementFailedLogins(
				'usr_123',
				'store_123'
			);

			expect(result).toBe(3);
			expect(mockUow.execute).toHaveBeenCalled();
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(storefrontUsers);
			expect(mockQueryBuilder.set).toHaveBeenCalled();
			expect(mockQueryBuilder.where).toHaveBeenCalled();
			expect(mockQueryBuilder.returning).toHaveBeenCalledWith({
				failedLoginCount: storefrontUsers.failedLoginCount,
			});
		});
	});

	describe('resetFailedLogins', () => {
		it('should reset failed logins inside UOW', async () => {
			await repository.resetFailedLogins('usr_123', 'store_123');

			expect(mockUow.execute).toHaveBeenCalled();
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(storefrontUsers);
			expect(mockQueryBuilder.set).toHaveBeenCalledWith(
				expect.objectContaining({ failedLoginCount: 0, lockedUntil: null })
			);
			expect(mockQueryBuilder.where).toHaveBeenCalled();
		});
	});

	describe('updateLockedUntil', () => {
		it('should update lockedUntil inside UOW', async () => {
			const date = new Date();
			await repository.updateLockedUntil('usr_123', 'store_123', date);

			expect(mockUow.execute).toHaveBeenCalled();
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(storefrontUsers);
			expect(mockQueryBuilder.set).toHaveBeenCalledWith(
				expect.objectContaining({ lockedUntil: date })
			);
			expect(mockQueryBuilder.where).toHaveBeenCalled();
		});
	});

	describe('ban', () => {
		it('should update bannedAt inside UOW', async () => {
			await repository.ban('usr_123', 'store_123');

			expect(mockUow.execute).toHaveBeenCalled();
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(storefrontUsers);
			expect(mockQueryBuilder.set).toHaveBeenCalledWith(
				expect.objectContaining({ bannedAt: expect.any(Date) })
			);
			expect(mockQueryBuilder.where).toHaveBeenCalled();
		});
	});

	describe('softDelete', () => {
		it('should soft delete user inside UOW', async () => {
			await repository.softDelete('usr_123', 'store_123');

			expect(mockUow.execute).toHaveBeenCalled();
			expect(mockQueryBuilder.update).toHaveBeenCalledWith(storefrontUsers);
			expect(mockQueryBuilder.set).toHaveBeenCalledWith(
				expect.objectContaining({ deletedAt: expect.any(Date) })
			);
			expect(mockQueryBuilder.where).toHaveBeenCalled();
		});
	});

	describe('getAllByStoreId', () => {
		it('should return list of mapped users', async () => {
			const mockDbUser1 = { id: 'usr_1', storeId: 'store_123' };
			const mockDbUser2 = { id: 'usr_2', storeId: 'store_123' };

			const whereMock = jest.fn().mockResolvedValue([mockDbUser1, mockDbUser2]);
			mockQueryBuilder.from.mockReturnValue({ where: whereMock });

			const toDomainSpy = jest
				.spyOn(StorefrontUserMapper, 'toDomain')
				.mockReturnValue('MAPPED_DOMAIN_USER' as any);

			const result = await repository.getAllByStoreId('store_123');

			expect(mockQueryBuilder.select).toHaveBeenCalled();
			expect(whereMock).toHaveBeenCalled();
			expect(toDomainSpy).toHaveBeenCalledTimes(2);
			expect(result).toEqual(['MAPPED_DOMAIN_USER', 'MAPPED_DOMAIN_USER']);
		});
	});
});
