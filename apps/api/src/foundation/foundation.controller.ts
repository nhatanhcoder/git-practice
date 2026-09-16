import { Body, Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FoundationService } from './foundation.service';
import { SetFoundationProgressDto } from './dto/foundation.dto';

/**
 * Foundation catalog + studied-state (02-foundation-grammar.md §2).
 * Self-scoped: every route acts on the token subject only.
 */
@ApiTags('student/foundation')
@ApiBearerAuth()
@Controller('student/foundation')
@Roles('student')
export class FoundationController {
  constructor(private readonly foundation: FoundationService) {}

  @Get()
  @ApiOperation({ summary: 'Versioned catalog: revision + 8 source-verbatim groups' })
  catalog() {
    return this.foundation.getCatalog();
  }

  @Get('progress')
  @ApiOperation({ summary: "My studied-state (absent = never studied, not zero)" })
  progress(@CurrentUser() user: AuthenticatedUser) {
    return this.foundation.getProgress(user.id);
  }

  @Put('progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Explicit idempotent set of one studied-state row' })
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetFoundationProgressDto,
  ) {
    return this.foundation.setProgress(user.id, dto);
  }
}
