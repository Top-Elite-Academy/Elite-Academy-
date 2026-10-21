import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

/** Student area: own sessions, mentoring plans and orders (spec §4). */
@Module({
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
