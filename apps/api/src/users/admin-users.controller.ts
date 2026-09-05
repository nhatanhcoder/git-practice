import { Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ListUsersQuery } from './dto/list-users.query';
import { UsersService } from './users.service';

/**
 * Admin user administration — `docs/api/modules/02-users.md`.
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
    return this.users.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One user, with the role-specific profile fields' })
  detail(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a pending account to active' })
  approve(@Param('id') id: string) {
    return this.users.approve(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend an active account' })
  suspend(@Param('id') id: string) {
    return this.users.suspend(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Re-activate a suspended account' })
  activate(@Param('id') id: string) {
    return this.users.activate(id);
  }
}

