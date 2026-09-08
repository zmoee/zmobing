import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class R2StorageService {
  private readonly bucket = process.env.R2_BUCKET_NAME;
  private readonly client = this.createClient();

  private createClient() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucket) return null;
    return new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private requireConfigured() {
    if (!this.client || !this.bucket)
      throw new BadRequestException('R2 存储尚未配置');
    return { client: this.client, bucket: this.bucket };
  }

  async uploadDataUrl(key: string, dataUrl: string) {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) throw new BadRequestException('导出图片格式无效');
    const [, contentType, encoded] = match;
    const { client, bucket } = this.requireConfigured();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(encoded, 'base64'),
        ContentType: contentType,
      }),
    );
    return { key, contentType };
  }

  async getSignedUrl(key: string, expiresIn = 600) {
    const { client, bucket } = this.requireConfigured();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn },
    );
  }

  async delete(key: string) {
    const { client, bucket } = this.requireConfigured();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}
