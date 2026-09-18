import { Module } from '@nestjs/common';
import { StudentWritingController } from './student-writing.controller';
import { WritingService } from './writing.service';

/**
 * F11 — character writing catalogue.
 *
 * Stateless and file-backed, so it imports nothing: no Prisma (global), no
 * Mongo. Exported because the catalogue is content other self-study modules
 * will want to reference once F9/F10 land.
 */
@Module({
  controllers: [StudentWritingController],
  providers: [WritingService],
  exports: [WritingService],
})
export class WritingModule {}
