import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { GrammarService } from './grammar.service';
import { ListGrammarQueryDto } from './dto/grammar.dto';

/**
 * Teacher picker reads (API-020 §2): published grammar summaries for attaching
 * as lesson supplements. Same public projection as the student list (no
 * `tokens`), teacher role guard. `assignedOnly` is student-contextual: without
 * enrollments it honestly yields an empty set.
 */
@ApiTags('teacher/catalog')
@ApiBearerAuth()
@Controller('teacher/catalog')
@Roles('teacher')
export class TeacherGrammarController {
  constructor(private readonly grammar: GrammarService) {}

  @Get('grammar')
  @ApiOperation({ summary: 'Published grammar summaries for the supplement picker' })
  picker(@Query() query: ListGrammarQueryDto) {
    return this.grammar.list(query);
  }
}
