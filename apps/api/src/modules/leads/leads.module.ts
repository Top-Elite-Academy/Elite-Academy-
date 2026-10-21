import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadAssignmentService } from './lead-assignment.service';
import { LeadsController } from './leads.controller';
import { WebsiteLeadService } from './website-lead.service';

/** CRM leads. Milestone 3 starts with the public website form; staff screens follow. */
@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [WebsiteLeadService, LeadAssignmentService],
})
export class LeadsModule {}
