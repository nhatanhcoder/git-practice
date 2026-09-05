import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ClassesService } from './classes.service';
import { JoinClassDto } from './dto/join-class.dto';

@ApiTags('student/classes')
@ApiBearerAuth()
@Controller('student/classes')
@Roles('student')
export class StudentClassesController {
  constructor(@Inject(ClassesService) private readonly classesService: ClassesService) {}

  // Declared before the ':id' route on purpose. Nest matches in declaration order, and while
  // these two do not collide today (different verbs), moving a GET onto 'join' later would
  // silently be swallowed by ':id' if the parameterised route came first.
  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Join a class using its 8-character enrollment code (F2.3)' })
  join(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinClassDto) {
    return this.classesService.joinByCode(user.id, dto.enrollmentCode);
  }

  @Get()
  @ApiOperation({ summary: 'List classes the authenticated student is enrolled in (F2.6)' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.classesService.findMyEnrolledClasses(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Class detail with lessons, for an enrolled student (F2.6)' })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.classesService.findEnrolledClassDetail(user.id, id);
  }

  // DELETE, matching API_STUDENT.md. It is not a destructive delete: the service flips the
  // enrollment to `dropped` and keeps the row (INV-CLASS-06). The verb describes the student's
  // intent, not the storage operation.
  @Delete(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a class — sets enrollment status to dropped (F2.4)' })
  leave(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.classesService.leave(user.id, id);
  }
}
