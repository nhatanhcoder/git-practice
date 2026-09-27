import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminLearningPathQuery, AdminPublishedLearningUnitQuery, EmptyBodyDto, RejectLearningPathDto } from './dto/learning-catalog.dto';
import { LearningCatalogService } from './learning-catalog.service';

@ApiTags('admin/learning-catalog')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminLearningCatalogController {
  constructor(private readonly service: LearningCatalogService) {}

  @Get('learning-paths')
  listPaths(@Query() query: AdminLearningPathQuery) {
    return this.service.listAdminPaths(query);
  }

  @Get('learning-paths/:pathId')
  pathDetail(@Param('pathId') pathId: string) {
    return this.service.adminPathDetail(pathId);
  }

  @Patch('learning-paths/:pathId/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string, @Body() _body: EmptyBodyDto) {
    void _body;
    return this.service.approvePath(user.id, pathId);
  }

  @Patch('learning-paths/:pathId/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string, @Body() dto: RejectLearningPathDto) {
    return this.service.rejectPath(user.id, pathId, dto.rejectionReason);
  }

  @Patch('learning-paths/:pathId/suspend')
  suspend(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string, @Body() _body: EmptyBodyDto) {
    void _body;
    return this.service.suspendPath(user.id, pathId);
  }

  @Patch('learning-paths/:pathId/restore')
  restore(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string, @Body() _body: EmptyBodyDto) {
    void _body;
    return this.service.restorePath(user.id, pathId);
  }

  @Get('learning-units')
  publishedUnits(@Query() query: AdminPublishedLearningUnitQuery) {
    return this.service.listPublishedUnits(query, true);
  }

  @Patch('learning-units/:unitId/unpublish')
  unpublishUnit(@CurrentUser() user: AuthenticatedUser, @Param('unitId') unitId: string, @Body() _body: EmptyBodyDto) {
    void _body;
    return this.service.adminUnpublishUnit(user.id, unitId);
  }
}
