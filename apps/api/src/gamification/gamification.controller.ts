import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GamificationService } from './gamification.service';

@ApiTags('student gamification')
@ApiBearerAuth()
@Roles('student')
@Controller('student')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Read the anonymized official-grade leaderboard' })
  leaderboard(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.leaderboard(user.id);
  }

  @Get('badges')
  @ApiOperation({ summary: "Read the signed-in student's server-computed attempt badges" })
  badges(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.badges(user.id);
  }
}
