import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListFlashcardsQuery } from './dto/list-flashcards.query';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';
import { FlashcardsService } from './flashcards.service';

@ApiTags('student/flashcards')
@ApiBearerAuth()
@Controller('student/flashcards')
@Roles('student')
export class StudentFlashcardsController {
  constructor(@Inject(FlashcardsService) private readonly flashcards: FlashcardsService) {}

  @Get()
  @ApiOperation({ summary: 'Browse flashcards by HSK level' })
  browse(@CurrentUser() user: AuthenticatedUser, @Query() query: ListFlashcardsQuery) {
    return this.flashcards.browse(user.id, query);
  }

  @Get('due')
  @ApiOperation({ summary: 'Get up to 20 due cards, most overdue first' })
  due(@CurrentUser() user: AuthenticatedUser) {
    return this.flashcards.due(user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get private SRS statistics for the signed-in student' })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.flashcards.stats(user.id);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Apply Again, Hard, Good or Easy using SM-2' })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewFlashcardDto,
  ) {
    return this.flashcards.review(user.id, id, dto.rating);
  }
}

