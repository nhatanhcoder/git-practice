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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, ListAssignmentsQuery, UpdateAssignmentDto } from './dto/assignment.dto';

@ApiTags('teacher-assignments')
@ApiBearerAuth()
@Roles('teacher')
@Controller('teacher/assignments')
export class TeacherAssignmentsController {
  constructor(@Inject(AssignmentsService) private readonly assignments: AssignmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an assignment for one of the teacher\u2019s own classes (T-ASGN-1/2)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List the teacher\u2019s assignments, filterable by class/status/type (T-ASGN-4)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAssignmentsQuery) {
    return this.assignments.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Assignment detail with read-time submission stats (T-ASGN-4)' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.assignments.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft assignment — frozen once any attempt exists (T-ASGN-3)' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignments.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft assignment — 204, or 409 when attempts exist (T-ASGN-5)' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assignments.remove(user.id, id);
  }
}

@ApiTags('student-assignments')
@ApiBearerAuth()
@Roles('student')
@Controller('student/assignments')
export class StudentAssignmentsController {
  constructor(@Inject(AssignmentsService) private readonly assignments: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Published assignments of the student\u2019s active classes (S-ASGN-1)' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.assignments.listForStudent(user.id);
  }
}
