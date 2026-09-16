import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ContentRevision,
  ContentRevisionSchema,
} from '../mongodb/schemas/content-revision.schema';
import {
  FoundationItem,
  FoundationItemSchema,
} from '../mongodb/schemas/foundation-item.schema';
import { FoundationController } from './foundation.controller';
import { FoundationService } from './foundation.service';

/**
 * Foundation catalog (Mongo, read-only at runtime) + studied-state (PG).
 * Writes touch PG only; Mongo is written solely by the offline importer.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FoundationItem.name, schema: FoundationItemSchema },
      { name: ContentRevision.name, schema: ContentRevisionSchema },
    ]),
  ],
  controllers: [FoundationController],
  providers: [FoundationService],
})
export class FoundationModule {}
