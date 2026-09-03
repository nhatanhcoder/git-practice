import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';

@ApiTags('teacher/lessons')
@ApiBearerAuth()
@Controller('teacher')
@Roles('teacher')
export class TeacherLessonsController {
  constructor(@Inject(LessonsService) private readonly lessonsService: LessonsService) {}

  @Post('classes/:classId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lesson in a class (orderIndex auto-assigned)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(classId, user.id, dto);
  }

  @Get('classes/:classId/lessons')
  @ApiOperation({ summary: 'List all lessons in a class ordered by orderIndex' })
  listByClass(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
  ) {
    return this.lessonsService.findByClass(classId, user.id);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Get lesson detail' })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.lessonsService.findById(id, user.id);
  }

  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, user.id, dto);
  }

  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Delete a lesson and re-pack order indices' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.lessonsService.delete(id, user.id);
  }

  @Patch('classes/:classId/lessons/reorder')
  @ApiOperation({ summary: 'Reorder lessons within class' })
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId') classId: string,
    @Body() dto: ReorderLessonsDto,
  ) {
    return this.lessonsService.reorder(classId, user.id, dto.items);
  }
}
