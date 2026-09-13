import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { WordBankService } from './word-bank.service';
import { ListWordBankQuery, SaveWordDto } from './dto/word-bank.dto';

/**
 * The personal word bank (S-SRS-6/7, 02-word-bank.md). Student-only; every service
 * method scopes by the authenticated id. No POST other than save, no bulk, no share.
 */
@ApiTags('student/word-bank')
@ApiBearerAuth()
@Controller('student/word-bank')
@Roles('student')
export class WordBankController {
  constructor(private readonly wordBank: WordBankService) {}

  // Declared before ':id' routes on purpose — a future verb beside them must not be
  // swallowed by the parameterised match (same reasoning as student-classes.controller).
  //
  // 201 for both first save and re-save: the upsert is one atomic operation and its
  // response body is identical either way (the row with a bumped savedAt), and an
  // injected @Res for a dynamic status would bypass the envelope interceptor. The
  // FE distinguishes nothing on this status, and the spec records the choice.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save one word to my bank — upsert on duplicate (S-SRS-6)' })
  save(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveWordDto) {
    return this.wordBank.save(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my saved words, newest first (S-SRS-7)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListWordBankQuery) {
    return this.wordBank.list(user.id, query);
  }

  @Get('review')
  @ApiOperation({
    summary: 'My banked words as reviewable card payloads — starts a bank review session (S-SRS-7)',
  })
  reviewSession(@CurrentUser() user: AuthenticatedUser) {
    return this.wordBank.reviewSession(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove one saved word from my bank (S-SRS-7)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.wordBank.remove(user.id, id);
  }
}
