import {
  Body,
  Controller,
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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@ApiTags('teacher/classes')
@ApiBearerAuth()
@Controller('teacher/classes')
@Roles('teacher')
export class TeacherClassesController {
  constructor(@Inject(ClassesService) private readonly classesService: ClassesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new class with auto-generated 8-char code' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClassDto,
  ) {
    return this.classesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all classes owned by authenticated teacher' })
  listOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.classesService.findMyClasses(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class detail with student roster' })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.classesService.findById(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update class information' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.update(id, user.id, dto);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a class' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.classesService.archive(id, user.id);
  }

  @Post(':id/enrollment-code/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate 8-character enrollment code' })
  regenerateCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.classesService.regenerateCode(id, user.id);
  }
}
