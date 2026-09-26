import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ContentRevision,
  ContentRevisionSchema,
} from '../mongodb/schemas/content-revision.schema';
import { GrammarItem, GrammarItemSchema } from '../mongodb/schemas/grammar-item.schema';
import { GrammarController } from './grammar.controller';
import { TeacherGrammarController } from './teacher-grammar.controller';
import { GrammarService } from './grammar.service';

/**
 * Grammar catalog (Mongo, read-only at runtime) + studied-state (PG).
 * Writes touch PG only; Mongo is written solely by the offline importer.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GrammarItem.name, schema: GrammarItemSchema },
      { name: ContentRevision.name, schema: ContentRevisionSchema },
    ]),
  ],
  controllers: [GrammarController, TeacherGrammarController],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
