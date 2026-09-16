import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GrammarService } from './grammar.service';
import { ListGrammarQueryDto, SetGrammarProgressDto } from './dto/grammar.dto';

/**
 * Grammar catalog + studied-state (02-foundation-grammar.md §2).
 * Self-scoped: every route acts on the token subject only.
 * Practice exercises (G-practice) are intentionally absent — deferred, not forgotten.
 */
@ApiTags('student/grammar')
@ApiBearerAuth()
@Controller('student/grammar')
@Roles('student')
export class GrammarController {
  constructor(private readonly grammar: GrammarService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated grammar list (HSK/category/search filters)' })
  list(@Query() query: ListGrammarQueryDto) {
    return this.grammar.list(query);
  }

  @Get('progress')
  @ApiOperation({ summary: "My studied-state (absent = never studied, not zero)" })
  progress(@CurrentUser() user: AuthenticatedUser) {
    return this.grammar.getProgress(user.id);
  }

  @Put('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Explicit idempotent set of one studied-state row' })
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetGrammarProgressDto,
  ) {
    return this.grammar.setProgress(user.id, dto.grammarId, dto.studied);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One grammar record (GRAMMAR_NOT_FOUND when absent)' })
  one(@Param('id') id: string) {
    return this.grammar.getOne(id);
  }
}
