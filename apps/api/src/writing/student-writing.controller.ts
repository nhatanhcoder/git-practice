import { Body, Controller, Get, HttpCode, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SaveWritingProgressDto } from './dto/writing.dto';
import { WritingService } from './writing.service';

@ApiTags('student/writing')
@ApiBearerAuth()
@Controller('student/writing')
@Roles('student')
export class StudentWritingController {
  constructor(private readonly writing: WritingService) {}

  @Get()
  @ApiOperation({ summary: 'Browse the accepted HSK 1–9 character corpus' })
  browse() {
    return this.writing.browse();
  }

  @Get('progress')
  @ApiOperation({ summary: 'Read my explicitly practised characters' })
  progress(@CurrentUser() user: AuthenticatedUser) {
    return this.writing.getProgress(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one character and optional stroke paths' })
  detail(@Param('id') id: string) {
    return this.writing.findOne(id);
  }

  @Put(':id/progress')
  @HttpCode(200)
  @ApiOperation({ summary: 'Idempotently record explicit canvas practice' })
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SaveWritingProgressDto,
  ) {
    void dto;
    return this.writing.markPractised(user.id, id);
  }
}
