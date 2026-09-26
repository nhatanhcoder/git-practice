import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LearningUnit, LearningUnitSchema } from '../mongodb/schemas/learning-unit.schema';
import {
  UserLearningProgress,
  UserLearningProgressSchema,
} from '../mongodb/schemas/user-learning-progress.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminLearningCatalogController } from './admin-learning-catalog.controller';
import { LearningCatalogService } from './learning-catalog.service';
import { TeacherLearningCatalogController } from './teacher-learning-catalog.controller';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: LearningUnit.name, schema: LearningUnitSchema },
      { name: UserLearningProgress.name, schema: UserLearningProgressSchema },
    ]),
  ],
  controllers: [TeacherLearningCatalogController, AdminLearningCatalogController],
  providers: [LearningCatalogService],
  exports: [LearningCatalogService],
})
export class LearningCatalogModule {}
