import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SupplementsService } from './supplements.service';
import { AttachSupplementDto } from './dto/attach-supplement.dto';
import { ReorderSupplementItemDto } from './dto/reorder-supplements.dto';

@ApiTags('teacher/lessons/supplements')
@ApiBearerAuth()
@Controller('teacher/lessons')
@Roles('teacher')
export class TeacherSupplementsController {
  constructor(@Inject(SupplementsService) private readonly supplements: SupplementsService) {}

  @Post(':id/supplements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach a published unit/grammar point (order server-assigned)' })
  attach(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AttachSupplementDto,
  ) {
    return this.supplements.attach(id, user.id, dto);
  }

  @Delete(':id/supplements/:supplementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove the link only — never the source, never progress' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('supplementId') supplementId: string,
  ): Promise<void> {
    await this.supplements.remove(id, user.id, supplementId);
  }

  @Patch(':id/supplements/reorder')
  @ApiOperation({ summary: 'Reorder supplements: complete dense 1..N permutation in one transaction' })
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ParseArrayPipe({ items: ReorderSupplementItemDto, whitelist: true, forbidNonWhitelisted: true }))
    items: ReorderSupplementItemDto[],
  ) {
    return this.supplements.reorder(id, user.id, items);
  }
}
