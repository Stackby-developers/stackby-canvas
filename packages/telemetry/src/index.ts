import { trace, type Tracer, type Span, SpanStatusCode, context } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { SPANS, ATTRS } from './spans.js';

export { SPANS, ATTRS };
export type { SpanName } from './spans.js';

let _tracer: Tracer | null = null;

export function initTelemetry(serviceName: string, version = '0.0.1', otlpEndpoint?: string): void {
  const exporter = new OTLPTraceExporter({
    url: otlpEndpoint ?? process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4318/v1/traces',
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: version,
    }),
    traceExporter: exporter,
  });

  sdk.start();
  _tracer = trace.getTracer(serviceName, version);
}

export function getTracer(): Tracer {
  return _tracer ?? trace.getTracer('studio-noop');
}

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}

export { SpanStatusCode, context, trace };
