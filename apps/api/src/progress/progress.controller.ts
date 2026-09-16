import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ProgressService } from './progress.service';

@ApiTags('student progress')
@ApiBearerAuth()
@Roles('student')
@Controller('student/progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  @ApiOperation({ summary: "Read the signed-in student's graded-attempt analytics" })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.overview(user.id);
  }

  @Get('chart')
  @ApiOperation({ summary: "Read the signed-in student's 12-week score series" })
  chart(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.chart(user.id);
  }
}
