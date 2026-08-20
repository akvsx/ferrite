import { RequirePermission } from '@common/decorators/require-permission.decorator';
import type {
	StoreMember,
	StoreRole,
} from '@core/database/schema/store.schema';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { PermissionKey } from '@ferrite/schema/common/permissions.zodschema';
import { MemberAlreadySuspendedError } from '@modules/store/domain/errors/member-already-suspended.error';
import { MemberNotFoundError } from '@modules/store/domain/errors/member-not-found.error';
import { MemberNotSuspendedError } from '@modules/store/domain/errors/member-not-suspended.error';
import { OwnerProtectedError } from '@modules/store/domain/errors/owner-protected.error';
import { RoleHasMembersError } from '@modules/store/domain/errors/role-has-members.error';
import { RoleNotFoundError } from '@modules/store/domain/errors/role-not-found.error';
import { StoreNotFoundError } from '@modules/store/domain/errors/store-not-found.error';
import { SystemRoleProtectedError } from '@modules/store/domain/errors/system-role-protected.error';
import {
	type IRemoveStoreMemberUseCase,
	type ISuspendStoreMemberUseCase,
	type IUnsuspendStoreMemberUseCase,
	REMOVE_STORE_MEMBER_UC,
	SUSPEND_STORE_MEMBER_UC,
	UNSUSPEND_STORE_MEMBER_UC,
} from '@modules/store/domain/ports/member-use-cases.port';
import {
	CREATE_STORE_ROLE_UC,
	DELETE_STORE_ROLE_UC,
	GET_ROLE_MEMBERS_UC,
	GET_ROLE_PERMISSIONS_UC,
	GET_STORE_ROLES_UC,
	type ICreateStoreRoleUseCase,
	type IDeleteStoreRoleUseCase,
	type IGetRoleMembersUseCase,
	type IGetRolePermissionsUseCase,
	type IGetStoreRolesUseCase,
	type IUpdateRolePermissionsUseCase,
	UPDATE_ROLE_PERMISSIONS_UC,
} from '@modules/store/domain/ports/role-use-cases.port';
import { SkipCsrf } from '@modules/storefront-auth/infrastructure/http/decorators/skip-csrf.decorator';
import {
	Body,
	ConflictException,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	UnprocessableEntityException,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateStoreRoleDto, UpdateRolePermissionsDto } from '../dto/role.dto';
import { StorePermissionGuard } from '../guards/store-permission.guard';
import {
	CreateStoreRoleDocs,
	DeleteStoreRoleDocs,
	GetRoleMembersDocs,
	GetRolePermissionsDocs,
	GetStoreRolesDocs,
	RemoveRoleMemberDocs,
	SuspendRoleMemberDocs,
	UnsuspendRoleMemberDocs,
	UpdateRolePermissionsDocs,
} from './docs/role.swaggerdocs';

@ApiTags('Store Roles')
@ApiBearerAuth('swagger-access-token')
@UseGuards(StorePermissionGuard)
@SkipCsrf()
@Controller('stores/:storeId/roles')
export class RoleController {
	constructor(
		@Inject(CREATE_STORE_ROLE_UC)
		private readonly createStoreRoleUc: ICreateStoreRoleUseCase,
		@Inject(GET_STORE_ROLES_UC)
		private readonly getStoreRolesUc: IGetStoreRolesUseCase,
		@Inject(GET_ROLE_PERMISSIONS_UC)
		private readonly getRolePermissionsUc: IGetRolePermissionsUseCase,
		@Inject(GET_ROLE_MEMBERS_UC)
		private readonly getRoleMembersUc: IGetRoleMembersUseCase,
		@Inject(DELETE_STORE_ROLE_UC)
		private readonly deleteStoreRoleUc: IDeleteStoreRoleUseCase,
		@Inject(REMOVE_STORE_MEMBER_UC)
		private readonly removeStoreMemberUc: IRemoveStoreMemberUseCase,
		@Inject(UPDATE_ROLE_PERMISSIONS_UC)
		private readonly updateRolePermissionsUc: IUpdateRolePermissionsUseCase,
		@Inject(SUSPEND_STORE_MEMBER_UC)
		private readonly suspendStoreMemberUc: ISuspendStoreMemberUseCase,
		@Inject(UNSUSPEND_STORE_MEMBER_UC)
		private readonly unsuspendStoreMemberUc: IUnsuspendStoreMemberUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Post()
	@CreateStoreRoleDocs()
	@RequirePermission('staff.create')
	async createRole(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: CreateStoreRoleDto
	): Promise<StoreRole> {
		return this.tracer.withSpan('http.create-store-role', async () => {
			const result = await this.createStoreRoleUc.execute({
				storeId,
				name: payload.name,
				description: payload.description ?? null,
				isSystem: false,
				permissions: payload.permissions,
			});

			if (result.isErr()) {
				if (result.error instanceof StoreNotFoundError) {
					throw new NotFoundException(result.error.message);
				}

				throw new UnprocessableEntityException(result.error.message);
			}

			return result.value;
		});
	}

	@Get()
	@GetStoreRolesDocs()
	@RequirePermission('staff.read')
	async getRoles(
		@Param('storeId', ParseUUIDPipe) storeId: string
	): Promise<StoreRole[]> {
		return this.tracer.withSpan('http.get-store-roles', async () => {
			const result = await this.getStoreRolesUc.execute(storeId);
			if (result.isErr()) {
				throw new NotFoundException('Store not found');
			}
			return result.value;
		});
	}

	@Get(':roleId/permissions')
	@GetRolePermissionsDocs()
	@RequirePermission('staff.read')
	async getRolePermissions(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('roleId', ParseUUIDPipe) roleId: string
	): Promise<PermissionKey[]> {
		return this.tracer.withSpan('http.get-role-permissions', async () => {
			const result = await this.getRolePermissionsUc.execute({
				storeId,
				roleId,
			});
			if (result.isErr()) {
				throw new NotFoundException('Role not found');
			}
			return result.value;
		});
	}

	@Get(':roleId/members')
	@GetRoleMembersDocs()
	@RequirePermission('staff.read')
	async getRoleMembers(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('roleId', ParseUUIDPipe) roleId: string
	): Promise<StoreMember[]> {
		return this.tracer.withSpan('http.get-role-members', async () => {
			const result = await this.getRoleMembersUc.execute({ storeId, roleId });
			if (result.isErr()) {
				throw new NotFoundException('Role not found');
			}
			return result.value;
		});
	}

	@Delete(':roleId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@DeleteStoreRoleDocs()
	@RequirePermission('staff.delete')
	async deleteRole(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('roleId', ParseUUIDPipe) roleId: string
	): Promise<void> {
		return this.tracer.withSpan('http.delete-store-role', async () => {
			const result = await this.deleteStoreRoleUc.execute({ storeId, roleId });

			if (result.isErr()) {
				if (result.error instanceof RoleNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof SystemRoleProtectedError) {
					throw new ForbiddenException(result.error.message);
				}
				if (result.error instanceof RoleHasMembersError) {
					throw new ConflictException(result.error.message);
				}
				throw new UnprocessableEntityException(result.error.message);
			}
		});
	}

	@Delete(':roleId/members/:userId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@RemoveRoleMemberDocs()
	@RequirePermission('staff.delete')
	async removeMember(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('roleId', ParseUUIDPipe) roleId: string,
		@Param('userId', ParseUUIDPipe) userId: string
	): Promise<void> {
		return this.tracer.withSpan('http.remove-store-member', async () => {
			const result = await this.removeStoreMemberUc.execute({
				storeId,
				roleId,
				userId,
			});

			if (result.isErr()) {
				if (result.error instanceof MemberNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof OwnerProtectedError) {
					throw new ForbiddenException(result.error.message);
				}
				throw new UnprocessableEntityException(result.error.message);
			}
		});
	}

	@Patch(':roleId/permissions')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UpdateRolePermissionsDocs()
	@RequirePermission('staff.update')
	async updateRolePermissions(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('roleId', ParseUUIDPipe) roleId: string,
		@Body() payload: UpdateRolePermissionsDto
	): Promise<void> {
		return this.tracer.withSpan('http.update-role-permissions', async () => {
			const result = await this.updateRolePermissionsUc.execute({
				storeId,
				roleId,
				permissions: payload.permissions,
			});

			if (result.isErr()) {
				if (result.error instanceof RoleNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof SystemRoleProtectedError) {
					throw new ForbiddenException(result.error.message);
				}
				throw new UnprocessableEntityException(result.error.message);
			}
		});
	}

	@Post(':roleId/members/:userId/suspend')
	@HttpCode(HttpStatus.NO_CONTENT)
	@SuspendRoleMemberDocs()
	@RequirePermission('staff.update')
	async suspendMember(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('roleId', ParseUUIDPipe) roleId: string,
		@Param('userId', ParseUUIDPipe) userId: string
	): Promise<void> {
		return this.tracer.withSpan('http.suspend-store-member', async () => {
			const result = await this.suspendStoreMemberUc.execute({
				storeId,
				roleId,
				userId,
			});

			if (result.isErr()) {
				if (result.error instanceof MemberNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof OwnerProtectedError) {
					throw new ForbiddenException(result.error.message);
				}
				if (result.error instanceof MemberAlreadySuspendedError) {
					throw new ConflictException(result.error.message);
				}
				throw new UnprocessableEntityException(result.error.message);
			}
		});
	}

	@Post(':roleId/members/:userId/unsuspend')
	@HttpCode(HttpStatus.NO_CONTENT)
	@UnsuspendRoleMemberDocs()
	@RequirePermission('staff.update')
	async unsuspendMember(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('roleId', ParseUUIDPipe) roleId: string,
		@Param('userId', ParseUUIDPipe) userId: string
	): Promise<void> {
		return this.tracer.withSpan('http.unsuspend-store-member', async () => {
			const result = await this.unsuspendStoreMemberUc.execute({
				storeId,
				roleId,
				userId,
			});

			if (result.isErr()) {
				if (result.error instanceof MemberNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof MemberNotSuspendedError) {
					throw new ConflictException(result.error.message);
				}
				throw new UnprocessableEntityException(result.error.message);
			}
		});
	}
}
