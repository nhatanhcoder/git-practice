import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PlacementService } from './placement.service';
import { SubmitPlacementDto } from './dto/placement.dto';

/**
 * The placement check (04-placement.md). Self-scoped: both routes act on the token
 * subject only; no id from the wire ever selects data (INV-PLC-08).
 */
@ApiTags('student/placement')
@ApiBearerAuth()
@Controller('student/placement')
@Roles('student')
export class PlacementController {
  constructor(private readonly placement: PlacementService) {}

  @Get()
  @ApiOperation({ summary: 'The placement paper (answers stripped) + my saved level' })
  paper(@CurrentUser() user: AuthenticatedUser) {
    return this.placement.getPaper(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit answers; server grades and saves the level' })
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitPlacementDto) {
    return this.placement.submit(user.id, dto);
  }
}
