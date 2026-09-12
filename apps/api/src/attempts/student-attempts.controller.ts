import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AttemptsService } from './attempts.service';
import { SaveAnswerDto } from './dto/attempt.dto';

@ApiTags('student/attempts')
@ApiBearerAuth()
@Controller('student')
@Roles('student')
export class StudentAttemptsController {
  constructor(@Inject(AttemptsService) private readonly attempts: AttemptsService) {}

  // Fixed 201 with a `resumed` flag in the body — a dynamic 201/200 would need
  // `@Res` and bypass the envelope interceptor (03-attempt-lifecycle §3).
  @Post('assignments/:assignmentId/attempts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start (or re-enter) the official attempt (S-ASGN-2)' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.attempts.start(user.id, assignmentId);
  }

  @Get('attempts/:id')
  @ApiOperation({ summary: 'Attempt state + questions for taking (S-ASGN-2/5)' })
  state(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attempts.getState(user.id, id);
  }

  @Patch('attempts/:id/answers')
  @ApiOperation({ summary: 'Auto-save one answer — upsert (S-ASGN-3)' })
  saveAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.attempts.saveAnswer(user.id, id, dto);
  }

  @Post('attempts/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit + server-side MCQ grading (S-ASGN-6)' })
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attempts.submit(user.id, id);
  }

  @Get('attempts/:id/result')
  @ApiOperation({ summary: 'View the result once available (S-ASGN-7/8)' })
  result(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attempts.getResult(user.id, id);
  }
}
