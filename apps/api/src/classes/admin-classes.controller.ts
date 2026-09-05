import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ClassesService } from './classes.service';

@ApiTags('admin/classes')
@ApiBearerAuth()
@Controller('admin/classes')
@Roles('admin')
export class AdminClassesController {
  constructor(@Inject(ClassesService) private readonly classesService: ClassesService) {}

  @Get()
  @ApiOperation({ summary: 'List all classes across the system' })
  listAll() {
    return this.classesService.adminListAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'View any class detail and student roster' })
  detail(@Param('id') id: string) {
    return this.classesService.findById(id, undefined, true);
  }
}
