import { Injectable } from '@nestjs/common';
import type { Prisma } from '@eta/db';
import { type Locale, localize, type StoryItem } from '@eta/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Spec §9.10: a story is public only when it is published AND written consent is recorded.
   * Illustrative examples are added only when SHOW_EXAMPLE_CONTENT is on (refused in production).
   */
  async listPublic(locale: Locale): Promise<StoryItem[]> {
    const visible: Prisma.SuccessStoryWhereInput[] = [
      { published: true, isExample: false, consentId: { not: null } },
    ];
    if (this.config.showExampleContent) visible.push({ isExample: true });

    const stories = await this.prisma.successStory.findMany({
      where: { OR: visible },
      orderBy: [{ isExample: 'asc' }, { createdAt: 'desc' }],
      take: 6,
    });
    return stories.map((story) => {
      const outcome = story.outcome ? localize(story.outcome, locale) : '';
      return {
        key: story.key,
        personName: story.personName,
        programLabel: localize(story.programLabel, locale),
        outcome: outcome || null,
        quote: localize(story.quote, locale),
        photoPath: story.photoPath,
      };
    });
  }
}
