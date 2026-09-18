import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SubmitLegoAttemptDto } from './dto/lego.dto';
import { LegoService } from './lego.service';

@ApiTags('student/lego')
@ApiBearerAuth()
@Controller('student/lego')
@Roles('student')
export class StudentLegoController {
  constructor(private readonly lego: LegoService) {}

  @Get()
  @ApiOperation({ summary: 'List Lego stations with my derived progress' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.lego.list(user.id);
  }

  @Get('stations/:stationId')
  @ApiOperation({ summary: 'Read one station with shuffled blocks' })
  station(@Param('stationId') stationId: string) {
    return this.lego.getStation(stationId);
  }

  @Post('stations/:stationId/attempt')
  @HttpCode(200)
  @ApiOperation({ summary: 'Grade a complete station attempt on the server' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('stationId') stationId: string,
    @Body() dto: SubmitLegoAttemptDto,
  ) {
    return this.lego.submit(user.id, stationId, dto);
  }
}

