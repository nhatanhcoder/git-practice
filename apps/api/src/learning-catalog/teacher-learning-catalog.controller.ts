import { Body, Controller, Delete, Get, HttpCode, Param, ParseArrayPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateLearningPathDto,
  CreateLearningUnitDto,
  EmptyBodyDto,
  TeacherPublishedLearningUnitQuery,
  ReorderLearningUnitItemDto,
  TeacherLearningPathQuery,
  UpdateLearningPathDto,
  UpdateLearningUnitDto,
} from './dto/learning-catalog.dto';
import { LearningCatalogService } from './learning-catalog.service';

@ApiTags('teacher/learning-catalog')
@ApiBearerAuth()
@Roles('teacher')
@Controller('teacher')
export class TeacherLearningCatalogController {
  constructor(private readonly service: LearningCatalogService) {}

  @Post('learning-paths')
  createPath(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLearningPathDto) {
    return this.service.createPath(user.id, dto);
  }

  @Get('learning-paths')
  listPaths(@CurrentUser() user: AuthenticatedUser, @Query() query: TeacherLearningPathQuery) {
    return this.service.listTeacherPaths(user.id, query);
  }

  @Get('learning-paths/:pathId')
  pathDetail(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string) {
    return this.service.teacherPathDetail(user.id, pathId);
  }

  @Patch('learning-paths/:pathId')
  updatePath(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string, @Body() dto: UpdateLearningPathDto) {
    return this.service.updatePath(user.id, pathId, dto);
  }

  @Delete('learning-paths/:pathId')
  removePath(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string) {
    return this.service.removePath(user.id, pathId);
  }

  @Post('learning-paths/:pathId/submit')
  @HttpCode(200)
  submitPath(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string, @Body() _body: EmptyBodyDto) {
    void _body;
    return this.service.submitPath(user.id, pathId);
  }

  @Patch('learning-paths/:pathId/units/reorder')
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('pathId') pathId: string,
    @Body(new ParseArrayPipe({ items: ReorderLearningUnitItemDto, whitelist: true, forbidNonWhitelisted: true }))
    items: ReorderLearningUnitItemDto[],
  ) {
    return this.service.reorderUnits(user.id, pathId, items);
  }

  @Post('learning-paths/:pathId/units')
  createUnit(@CurrentUser() user: AuthenticatedUser, @Param('pathId') pathId: string, @Body() dto: CreateLearningUnitDto) {
    return this.service.createUnit(user.id, pathId, dto);
  }

  @Get('learning-units')
  publishedUnits(@Query() query: TeacherPublishedLearningUnitQuery) {
    return this.service.listPublishedUnits(query);
  }

  @Patch('learning-units/:unitId')
  updateUnit(@CurrentUser() user: AuthenticatedUser, @Param('unitId') unitId: string, @Body() dto: UpdateLearningUnitDto) {
    return this.service.updateUnit(user.id, unitId, dto);
  }

  @Delete('learning-units/:unitId')
  removeUnit(@CurrentUser() user: AuthenticatedUser, @Param('unitId') unitId: string) {
    return this.service.removeUnit(user.id, unitId);
  }

  @Post('learning-units/:unitId/publish')
  @HttpCode(200)
  publishUnit(@CurrentUser() user: AuthenticatedUser, @Param('unitId') unitId: string, @Body() _body: EmptyBodyDto) {
    void _body;
    return this.service.publishUnit(user.id, unitId);
  }

  @Post('learning-units/:unitId/unpublish')
  @HttpCode(200)
  unpublishUnit(@CurrentUser() user: AuthenticatedUser, @Param('unitId') unitId: string, @Body() _body: EmptyBodyDto) {
    void _body;
    return this.service.teacherUnpublishUnit(user.id, unitId);
  }
}
