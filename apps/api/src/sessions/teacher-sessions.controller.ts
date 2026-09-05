import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { TeacherListSessionsQuery } from './dto/teacher-list-sessions.query';

@ApiTags('teacher/sessions')
@ApiBearerAuth()
@Controller('teacher/sessions')
@Roles('teacher')
export class TeacherSessionsController {
  constructor(@Inject(SessionsService) private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List sessions of teacher own classes' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TeacherListSessionsQuery,
  ) {
    return this.sessionsService.teacherListSessions(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Schedule a new class session' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.teacherCreateSession(user.id, dto);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Start a scheduled session' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sessionsService.teacherStartSession(user.id, id);
  }

  @Patch(':id/end')
  @ApiOperation({ summary: 'End an in-progress session' })
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sessionsService.teacherEndSession(user.id, id);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit session for admin review' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sessionsService.teacherSubmitSession(user.id, id);
  }

  @Post(':id/attendance')
  @ApiOperation({ summary: 'Record attendance for a session' })
  attendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.sessionsService.teacherMarkAttendance(user.id, id, dto);
  }
}
