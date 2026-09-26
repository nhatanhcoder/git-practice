import { Module } from '@nestjs/common';
import { GrammarModule } from '../grammar/grammar.module';
import { LearningCatalogModule } from '../learning-catalog/learning-catalog.module';
import { SupplementsService } from './supplements.service';
import { TeacherSupplementsController } from './teacher-supplements.controller';

/**
 * Lesson↔catalog links (API-020). Reads catalog visibility through the owning
 * domain services; writes touch only the link table.
 */
@Module({
  imports: [GrammarModule, LearningCatalogModule],
  controllers: [TeacherSupplementsController],
  providers: [SupplementsService],
  exports: [SupplementsService],
})
export class SupplementsModule {}
