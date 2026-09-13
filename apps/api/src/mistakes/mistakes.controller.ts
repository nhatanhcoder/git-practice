import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MistakesService } from './mistakes.service';
import { ListMistakesQuery, ReviewMistakeDto } from './mistakes.dto';
@Controller('student/mistakes')
@Roles('student')
export class MistakesController {
 constructor(private readonly mistakes: MistakesService) {}
 @Get() list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListMistakesQuery) {
  return this.mistakes.list(u.id, q);
 }
 @Get('review') session(@CurrentUser() u: AuthenticatedUser) {
  return this.mistakes.session(u.id);
 }
 @Post(':id/review') @HttpCode(200)
 review(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReviewMistakeDto) {
  return this.mistakes.review(u.id, id, dto);
 }
}
