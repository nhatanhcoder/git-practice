import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RevealWorkplaceTurnDto } from './dto/workplace.dto';
import { WorkplaceService } from './workplace.service';

@ApiTags('student/workplace')
@ApiBearerAuth()
@Controller('student/workplace')
@Roles('student')
export class StudentWorkplaceController {
  constructor(private readonly workplace: WorkplaceService) {}

  @Get()
  @ApiOperation({ summary: 'List workplace scenarios with my completion state' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workplace.list(user.id);
  }

  @Get(':scenarioId')
  @ApiOperation({ summary: 'Read one scenario without model answers' })
  detail(@Param('scenarioId') scenarioId: string) {
    return this.workplace.detail(scenarioId);
  }

  @Post(':scenarioId/turns/:turnId/reveal')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit a reply and reveal reviewed comparison material' })
  reveal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scenarioId') scenarioId: string,
    @Param('turnId') turnId: string,
    @Body() dto: RevealWorkplaceTurnDto,
  ) {
    void dto;
    return this.workplace.reveal(user.id, scenarioId, turnId);
  }
}
