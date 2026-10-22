import type { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import type { CreateVideoInput, CreateVideoResponse, LessonVideoView } from '@eta/shared';
import type { AuthUser } from '../../common/authz/auth-context';
import { ApiException } from '../../common/errors/api.exception';
import type { ClientInfo } from '../../common/http/client-info';
import { FileStorage } from '../../common/files/file-storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { toVideoView } from './lessons.mapper';
import { TeachLessonsService } from './teach-lessons.service';
import { VideoProvider } from './video/video-provider';

/** The local stand-in keeps videos in our own storage: limit them (production uses Cloudflare). */
export const MAX_LOCAL_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

/** Lesson videos: reserve an upload, receive it (local), follow processing (Cloudflare). */
@Injectable()
export class LessonVideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lessons: TeachLessonsService,
    private readonly provider: VideoProvider,
    private readonly storage: FileStorage,
    private readonly audit: AuditService,
  ) {}

  async create(
    user: AuthUser,
    lessonId: string,
    input: CreateVideoInput,
    client: ClientInfo,
  ): Promise<CreateVideoResponse> {
    const lesson = await this.lessons.lessonRecord(user, lessonId);
    if (this.provider.name === 'local' && input.sizeBytes > MAX_LOCAL_VIDEO_BYTES)
      throw ApiException.badRequest('video.tooLarge');

    const video = await this.prisma.lessonVideo.create({
      data: {
        lessonId: lesson.id,
        provider: this.provider.name,
        providerVideoId: 'pending',
        fileName: input.fileName,
        sizeBytes: BigInt(input.sizeBytes),
        position: lesson.videos.length + 1,
      },
    });
    try {
      const { providerVideoId, upload } = await this.provider.createUpload({
        videoId: video.id,
        fileName: input.fileName,
        sizeBytes: input.sizeBytes,
      });
      const saved = await this.prisma.lessonVideo.update({
        where: { id: video.id },
        data: { providerVideoId },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'lessonVideo.created',
        entity: 'lessonVideo',
        entityId: video.id,
        after: { lessonId, fileName: input.fileName, provider: this.provider.name },
        client,
      });
      return { video: toVideoView(saved), upload };
    } catch (error) {
      await this.prisma.lessonVideo.delete({ where: { id: video.id } });
      throw error;
    }
  }

  private async ownVideo(user: AuthUser, videoId: string) {
    const video = await this.prisma.lessonVideo.findUnique({ where: { id: videoId } });
    if (!video) throw ApiException.notFound();
    await this.lessons.lessonRecord(user, video.lessonId);
    return video;
  }

  /** Local stand-in: the whole file in one PUT, streamed to storage. */
  async receiveLocal(
    user: AuthUser,
    videoId: string,
    body: Readable,
    size: number,
  ): Promise<LessonVideoView> {
    const video = await this.ownVideo(user, videoId);
    if (video.provider !== 'local' || video.status !== 'uploading')
      throw ApiException.conflict('video.notUploading');
    if (size !== Number(video.sizeBytes)) throw ApiException.badRequest('video.sizeMismatch');
    await this.storage.put(video.providerVideoId, body, { size, contentType: 'video/mp4' });
    const saved = await this.prisma.lessonVideo.update({
      where: { id: video.id },
      data: { status: 'ready' },
    });
    return toVideoView(saved);
  }

  /** After a direct upload (Cloudflare): ask the provider whether it is ready. */
  async refresh(user: AuthUser, videoId: string): Promise<LessonVideoView> {
    const video = await this.ownVideo(user, videoId);
    if (video.provider === 'local' || video.status === 'ready') return toVideoView(video);
    const state = await this.provider.state(video.providerVideoId);
    const saved = await this.prisma.lessonVideo.update({
      where: { id: video.id },
      data: { status: state.status, durationSec: state.durationSec },
    });
    return toVideoView(saved);
  }

  async remove(user: AuthUser, videoId: string, client: ClientInfo): Promise<void> {
    const video = await this.ownVideo(user, videoId);
    await this.removeRecord(video);
    await this.audit.record({
      actorId: user.id,
      action: 'lessonVideo.deleted',
      entity: 'lessonVideo',
      entityId: video.id,
      after: { lessonId: video.lessonId },
      client,
    });
  }

  /** Removes the hosted file too (a failure there must not keep the row). */
  async removeRecord(video: { id: string; providerVideoId: string }): Promise<void> {
    await this.prisma.lessonVideo.delete({ where: { id: video.id } });
    if (video.providerVideoId !== 'pending')
      await this.provider.remove(video.providerVideoId).catch(() => undefined);
  }
}
