import { Module } from '@nestjs/common';
import { StudentWorkplaceController } from './student-workplace.controller';
import { WorkplaceService } from './workplace.service';

@Module({
  controllers: [StudentWorkplaceController],
  providers: [WorkplaceService],
  exports: [WorkplaceService],
})
export class WorkplaceModule {}
