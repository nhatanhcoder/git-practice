import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsQuery } from './dto/list-questions.query';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

/**
 * Teacher question bank — the five endpoints in `API_TEACHER.md` § Question Bank.
 *
 * This is the only module backed by MongoDB. Ownership is enforced in the service
 * on every read and write, not here: a `@Roles('teacher')` guard proves the caller
 * is *a* teacher, never that they own *this* question.
 */
@ApiTags('teacher/questions')
@ApiBearerAuth()
@Controller('teacher/questions')
@Roles('teacher')
export class TeacherQuestionsController {
  constructor(@Inject(QuestionsService) private readonly questions: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'List own questions, filtered by skill, sub-type, HSK level' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQuestionsQuery) {
    return this.questions.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One question, if the caller created it' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.questions.findById(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a question' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateQuestionDto) {
    return this.questions.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question the caller created' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questions.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question the caller created' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.questions.remove(user.id, id);
  }
}
