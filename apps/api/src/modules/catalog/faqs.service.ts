import { Injectable } from '@nestjs/common';
import { type FaqItem, type Locale, localize } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FaqsService {
  constructor(private readonly prisma: PrismaService) {}

  /** General FAQ shown on the landing page (program FAQs come with course details). */
  async listGeneral(locale: Locale): Promise<FaqItem[]> {
    const faqs = await this.prisma.faq.findMany({
      where: { published: true, programId: null },
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      select: { key: true, question: true, answer: true },
    });
    return faqs.map((faq) => ({
      key: faq.key,
      question: localize(faq.question, locale),
      answer: localize(faq.answer, locale),
    }));
  }
}
