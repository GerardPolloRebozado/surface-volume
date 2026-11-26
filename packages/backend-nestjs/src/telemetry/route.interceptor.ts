import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import {
  context,
  SpanKind,
  SpanStatusCode,
  trace,
  type Tracer,
} from '@opentelemetry/api';
import { Observable } from 'rxjs';

/**
 * The OTel Express instrumentation cannot see Nest 12's routes, so incoming HTTP
 * spans arrive as "GET" with no route. Open a server-named span around each
 * handler instead; service-level spans then nest under a readable operation.
 */
@Injectable()
export class TelemetryRouteInterceptor implements NestInterceptor {
  private readonly tracer: Tracer = trace.getTracer('surface-volume-backend');

  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (executionContext.getType() !== 'http') return next.handle();

    const request = executionContext.switchToHttp().getRequest<{
      method?: string;
      baseUrl?: string;
      route?: { path?: string };
    }>();
    const route = request.route?.path;
    if (!route) return next.handle();

    const name = `${request.method ?? 'HTTP'} ${request.baseUrl ?? ''}${route}`.replace(
      /\/{2,}/g,
      '/',
    );

    return new Observable((subscriber) => {
      const span = this.tracer.startSpan(name, {
        kind: SpanKind.SERVER,
        attributes: { 'http.route': name },
      });
      let ended = false;
      const end = () => {
        if (!ended) {
          ended = true;
          span.end();
        }
      };

      const subscription = context.with(
        trace.setSpan(context.active(), span),
        () =>
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (error) => {
              span.recordException(error as Error);
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : String(error),
              });
              end();
              subscriber.error(error);
            },
            complete: () => {
              end();
              subscriber.complete();
            },
          }),
      );

      return () => {
        subscription.unsubscribe();
        end();
      };
    });
  }
}
