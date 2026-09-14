import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from '../mongodb/schemas/question.schema';
import { PlacementController } from './placement.controller';
import { PlacementService } from './placement.service';

/**
 * The placement check (04-placement.md). Mongo is read-only here (sampling); the only
 * write in the module is Postgres `User.hskLevelGoal`.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }])],
  controllers: [PlacementController],
  providers: [PlacementService],
})
export class PlacementModule {}
