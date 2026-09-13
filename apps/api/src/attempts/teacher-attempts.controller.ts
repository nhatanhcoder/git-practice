import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GradingService } from './grading.service';
import { GradeAttemptDto, ListAttemptsQuery } from './dto/grading.dto';
import { AiSuggestDto } from './dto/ai-suggest.dto';

@ApiTags('teacher/attempts')
@ApiBearerAuth()
@Controller('teacher/attempts')
@Roles('teacher')
export class TeacherAttemptsController {
  constructor(@Inject(GradingService) private readonly grading: GradingService) {}

  @Get()
  @ApiOperation({ summary: 'Grading queue — attempts on my assignments (T-GRADE-1)' })
  queue(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAttemptsQuery) {
    return this.grading.queue(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Attempt + answers + question data for grading (T-GRADE-2)' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.grading.detail(user.id, id);
  }

  @Patch(':id/grade')
  @ApiOperation({ summary: 'Submit grades + feedback — attempt graded (T-GRADE-4/5)' })
  grade(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GradeAttemptDto,
  ) {
    return this.grading.grade(user.id, id, dto);
  }

  @Post(':id/ai-suggest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gemini score suggestions for Writing answers — suggestion only (T-GRADE-3)' })
  aiSuggest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AiSuggestDto,
  ) {
    return this.grading.suggest(user.id, id, dto.questionIds);
  }
}
