import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { enrollSchema } from '@eta/shared';
import { createZodDto } from 'nestjs-zod';
import { Public } from '../../common/authz/decorators';
import { Client, type ClientInfo } from '../../common/http/client-info';
import { WebsiteLeadService } from './website-lead.service';

class EnrollDto extends createZodDto(enrollSchema) {}

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly websiteLeads: WebsiteLeadService) {}

  /** Public enroll form (spec §3.6). CSRF-protected like every form; no account needed. */
  @Public()
  @Post('website')
  @HttpCode(HttpStatus.ACCEPTED)
  async submitWebsiteForm(@Body() body: EnrollDto, @Client() client: ClientInfo): Promise<void> {
    await this.websiteLeads.submit(body, client);
  }
}
