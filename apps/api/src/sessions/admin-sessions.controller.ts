import { Body, Controller, Get, Inject, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { SessionsService } from './sessions.service';
import { PendingSessionsQuery } from './dto/pending-sessions.query';
import { RejectSessionDto } from './dto/reject-session.dto';

@ApiTags('admin/sessions')
@ApiBearerAuth()
@Controller('admin/sessions')
@Roles('admin')
export class AdminSessionsController {
  constructor(@Inject(SessionsService) private readonly sessionsService: SessionsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List sessions awaiting review' })
  listPending(@Query() query: PendingSessionsQuery) {
    return this.sessionsService.listPending(query);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a session (one-way gate)' })
  approve(@Param('id') id: string) {
    return this.sessionsService.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a session with reason' })
  reject(@Param('id') id: string, @Body() dto: RejectSessionDto) {
    return this.sessionsService.reject(id, dto);
  }
}
