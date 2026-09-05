import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ListUsersQuery } from './dto/list-users.query';
import { UsersService } from './users.service';

/**
 * Admin user administration — `docs/api/modules/02-users.md`.
 *
 * **Read half only.** `approve`, `suspend` and `activate` are deliberately absent:
 * `02-users.md` §16 blocks them on C3, the missing `rejected` value in `User.status`
 * (`DOC-005`). Without it a rejected application has no exit from `pending` and sits
 * in the approval queue for ever, and the fix is an enum migration that needs ADR-011.
 * Adding the endpoints before that decision would bake the wrong state machine in.
 *
 * `@Roles('admin')` plus `JwtAuthGuard`'s active-status check together are INV-USERS-01:
 * the actor must be an admin *and* active, refused before any user data is read.
 */
@ApiTags('admin/users')
@ApiBearerAuth()
@Controller('admin/users')
@Roles('admin')
export class AdminUsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users, filtered by role, status and keyword' })
  list(@Query() query: ListUsersQuery) {
    // Returned as-is: the envelope interceptor leaves a `{ data, meta }` pair alone
    // so pagination meta survives.
    return this.users.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One user, with the role-specific profile fields' })
  detail(@Param('id') id: string) {
    return this.users.findById(id);
  }
}
