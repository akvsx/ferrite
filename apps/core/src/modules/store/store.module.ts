import { NotificationsModule } from '@modules/notifications';
import { UsersModule } from '@modules/platform-users/users.module';
import { Module } from '@nestjs/common';
import {
	AcceptStoreInvitationUseCase,
	AddStoreMemberUseCase,
	CheckStorePermissionUseCase,
	CreateStoreRoleUseCase,
	CreateStoreUseCase,
	DeleteStoreRoleUseCase,
	DeleteStoreUseCase,
	GetPublicStoreUseCase,
	GetRoleMembersUseCase,
	GetRolePermissionsUseCase,
	GetStoreInvitationUseCase,
	GetStoreRolesUseCase,
	GetStoresUseCase,
	InitializeStoreOrchestratorUseCase,
	InviteStoreMemberUseCase,
	RemoveStoreMemberUseCase,
	SuspendStoreMemberUseCase,
	UnsuspendStoreMemberUseCase,
	UpdateRolePermissionsUseCase,
	UpdateStoreUseCase,
} from './application/use-cases';
import { GetStoreConfigUseCase } from './application/use-cases/config/get-store-config.usecase';
import { UpdateStoreConfigUseCase } from './application/use-cases/config/update-store-config.usecase';
import {
	ACCEPT_STORE_INVITATION_UC,
	ADD_STORE_MEMBER_UC,
	GET_STORE_INVITATION_UC,
	INVITE_STORE_MEMBER_UC,
	REMOVE_STORE_MEMBER_UC,
	SUSPEND_STORE_MEMBER_UC,
	UNSUSPEND_STORE_MEMBER_UC,
} from './domain/ports/member-use-cases.port';
import {
	CHECK_STORE_PERMISSION_UC,
	CREATE_STORE_ROLE_UC,
	DELETE_STORE_ROLE_UC,
	GET_ROLE_MEMBERS_UC,
	GET_ROLE_PERMISSIONS_UC,
	GET_STORE_ROLES_UC,
	UPDATE_ROLE_PERMISSIONS_UC,
} from './domain/ports/role-use-cases.port';
import { STORE_REPOSITORY } from './domain/ports/store.repository.port';
import { STORE_CONFIG_REPOSITORY } from './domain/ports/store-config.repository.port';
import {
	GET_STORE_CONFIG_UC,
	UPDATE_STORE_CONFIG_UC,
} from './domain/ports/store-config-usecase.port';
import { STORE_PERMISSION_CHECKER } from './domain/ports/store-permission-checker.port';
import {
	CREATE_STORE_UC,
	DELETE_STORE_UC,
	GET_OWN_STORES_UC,
	GET_PUBLIC_STORE_UC,
	INITIALIZE_STORE_ORCHESTRATOR_UC,
	UPDATE_STORE_UC,
} from './domain/ports/store-use-cases.port';
import { ConfigController } from './infrastructure/http/controllers/config.controller';
import { InvitationController } from './infrastructure/http/controllers/invitation.controller';
import { RoleController } from './infrastructure/http/controllers/role.controller';
import { StoreController } from './infrastructure/http/controllers/store.controller';
import { StorePermissionGuard } from './infrastructure/http/guards/store-permission.guard';
import { DrizzleStoreRepository } from './infrastructure/persistance/repositories/drizzle-store.repository';
import { DrizzleStoreConfigRepository } from './infrastructure/persistance/repositories/drizzle-store-config.repository';
import { DrizzleStorePermissionRepository } from './infrastructure/persistance/repositories/drizzle-store-permission.repository';

@Module({
	imports: [NotificationsModule, UsersModule],
	controllers: [
		StoreController,
		RoleController,
		InvitationController,
		ConfigController,
	],
	providers: [
		{
			provide: STORE_REPOSITORY,
			useClass: DrizzleStoreRepository,
		},
		{
			provide: STORE_PERMISSION_CHECKER,
			useClass: DrizzleStorePermissionRepository,
		},
		{
			provide: CHECK_STORE_PERMISSION_UC,
			useClass: CheckStorePermissionUseCase,
		},
		StorePermissionGuard,
		{
			provide: CREATE_STORE_UC,
			useClass: CreateStoreUseCase,
		},
		{
			provide: CREATE_STORE_ROLE_UC,
			useClass: CreateStoreRoleUseCase,
		},
		{
			provide: ADD_STORE_MEMBER_UC,
			useClass: AddStoreMemberUseCase,
		},
		{
			provide: GET_STORE_INVITATION_UC,
			useClass: GetStoreInvitationUseCase,
		},
		{
			provide: ACCEPT_STORE_INVITATION_UC,
			useClass: AcceptStoreInvitationUseCase,
		},
		{
			provide: INVITE_STORE_MEMBER_UC,
			useClass: InviteStoreMemberUseCase,
		},
		{
			provide: INITIALIZE_STORE_ORCHESTRATOR_UC,
			useClass: InitializeStoreOrchestratorUseCase,
		},
		{
			provide: GET_OWN_STORES_UC,
			useClass: GetStoresUseCase,
		},
		{
			provide: GET_PUBLIC_STORE_UC,
			useClass: GetPublicStoreUseCase,
		},
		{
			provide: GET_STORE_ROLES_UC,
			useClass: GetStoreRolesUseCase,
		},
		{
			provide: GET_ROLE_PERMISSIONS_UC,
			useClass: GetRolePermissionsUseCase,
		},
		{
			provide: GET_ROLE_MEMBERS_UC,
			useClass: GetRoleMembersUseCase,
		},
		{
			provide: UPDATE_STORE_UC,
			useClass: UpdateStoreUseCase,
		},
		{
			provide: DELETE_STORE_UC,
			useClass: DeleteStoreUseCase,
		},
		{
			provide: DELETE_STORE_ROLE_UC,
			useClass: DeleteStoreRoleUseCase,
		},
		{
			provide: REMOVE_STORE_MEMBER_UC,
			useClass: RemoveStoreMemberUseCase,
		},
		{
			provide: UPDATE_ROLE_PERMISSIONS_UC,
			useClass: UpdateRolePermissionsUseCase,
		},
		{
			provide: SUSPEND_STORE_MEMBER_UC,
			useClass: SuspendStoreMemberUseCase,
		},
		{
			provide: UNSUSPEND_STORE_MEMBER_UC,
			useClass: UnsuspendStoreMemberUseCase,
		},
		{
			provide: STORE_CONFIG_REPOSITORY,
			useClass: DrizzleStoreConfigRepository,
		},
		{
			provide: GET_STORE_CONFIG_UC,
			useClass: GetStoreConfigUseCase,
		},
		{
			provide: UPDATE_STORE_CONFIG_UC,
			useClass: UpdateStoreConfigUseCase,
		},
	],
	exports: [
		STORE_REPOSITORY,
		STORE_PERMISSION_CHECKER,
		CHECK_STORE_PERMISSION_UC,
		StorePermissionGuard,
		INITIALIZE_STORE_ORCHESTRATOR_UC,
		GET_STORE_CONFIG_UC,
	],
})
export class StoreModule {}
