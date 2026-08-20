import { AuthUserParam } from '@common/decorators/auth-user.decorator';
import { SkipPermissions } from '@common/decorators/skip-permissions.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { AuthUser } from '@ferrite/schema/auth/auth-user.zodschema';
import type { GetStoreInvitationResponse } from '@ferrite/schema/stores/get-store-invitation.zodschema';
import { InvitationExpiredError } from '@modules/store/domain/errors/invitation-expired.error';
import { InvitationNotFoundError } from '@modules/store/domain/errors/invitation-not-found.error';
import {
	ACCEPT_STORE_INVITATION_UC,
	GET_STORE_INVITATION_UC,
	type IAcceptStoreInvitationUseCase,
	type IGetStoreInvitationUseCase,
} from '@modules/store/domain/ports/member-use-cases.port';
import { StorePermissionGuard } from '@modules/store/infrastructure/http/guards/store-permission.guard';
import { SkipCsrf } from '@modules/storefront-auth/infrastructure/http/decorators/skip-csrf.decorator';
import {
	Controller,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Post,
	UnprocessableEntityException,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
	AcceptStoreInvitationDocs,
	GetStoreInvitationDocs,
} from './docs/invitation.swaggerdocs';

@ApiTags('Invitations')
@ApiBearerAuth('swagger-access-token')
@UseGuards(StorePermissionGuard)
@SkipCsrf()
@Controller('stores/invitations')
export class InvitationController {
	constructor(
		@Inject(GET_STORE_INVITATION_UC)
		private readonly getStoreInvitationUc: IGetStoreInvitationUseCase,
		@Inject(ACCEPT_STORE_INVITATION_UC)
		private readonly acceptStoreInvitationUc: IAcceptStoreInvitationUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Get(':invitationId')
	@GetStoreInvitationDocs()
	@SkipPermissions() // We don't need store permission as it's an invite
	async getInvitation(
		@AuthUserParam() user: AuthUser,
		@Param('invitationId', ParseUUIDPipe) invitationId: string
	): Promise<GetStoreInvitationResponse> {
		return this.tracer.withSpan('http.get-store-invitation', async () => {
			const result = await this.getStoreInvitationUc.execute({
				invitationId,
				userEmail: user.email,
			});

			if (result.isErr()) {
				if (result.error instanceof InvitationNotFoundError) {
					// Either wrong email, already accepted, or really not found
					throw new NotFoundException('Invitation not found or not accessible');
				}
				if (result.error instanceof InvitationExpiredError) {
					throw new ForbiddenException('Invitation has expired');
				}
				throw new UnprocessableEntityException('Failed to get invitation');
			}

			return result.value;
		});
	}

	@Post(':invitationId/accept')
	@HttpCode(HttpStatus.OK)
	@AcceptStoreInvitationDocs()
	@SkipPermissions() // We don't need store permission as it's an invite
	async acceptInvitation(
		@AuthUserParam() user: AuthUser,
		@Param('invitationId', ParseUUIDPipe) invitationId: string
	): Promise<void> {
		return this.tracer.withSpan('http.accept-store-invitation', async () => {
			const result = await this.acceptStoreInvitationUc.execute({
				invitationId,
				userId: user.id,
				userEmail: user.email,
			});

			if (result.isErr()) {
				if (result.error instanceof InvitationNotFoundError) {
					throw new NotFoundException('Invitation not found or not accessible');
				}
				if (result.error instanceof InvitationExpiredError) {
					throw new ForbiddenException('Invitation has expired');
				}
				throw new UnprocessableEntityException('Failed to accept invitation');
			}
		});
	}
}
