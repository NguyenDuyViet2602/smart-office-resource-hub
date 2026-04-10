import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const logger = new Logger('RedisModule');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          // Retry up to 5 times with increasing delay, then stop retrying
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => (times <= 5 ? Math.min(times * 200, 2000) : null),
          lazyConnect: true,
        });

        client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
        client.on('connect', () => logger.log('Redis connected'));

        // Non-fatal ping: log a warning if Redis is down but let the app start
        try {
          await client.connect();
          await client.ping();
          logger.log('Redis ping OK');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`Redis unavailable on startup — features requiring Redis will fail: ${msg}`);
        }

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
