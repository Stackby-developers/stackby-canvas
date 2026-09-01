import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

const TemplateRemapBodySchema = z.object({
  stackId: z.string(),
  templateFields: z.array(
    z.object({
      entity: z.string(),
      field: z.string(),
      role: z.string(),
      required: z.boolean(),
      columnType: z.string(),
    }),
  ),
});

export function registerTemplateRemapRoute(app: FastifyInstance): void {
  app.post<{ Params: { templateId: string }; Body: unknown }>(
    '/templates/:templateId/remap',
    async (request, reply) => {
      const body = TemplateRemapBodySchema.parse(request.body);

      const requiredMappings = body.templateFields
        .filter((f) => f.required)
        .map((f) => ({
          template_entity: f.entity,
          template_field: f.field,
          role: f.role,
          matched_table_id: `${f.entity.toLowerCase().replace(/\s+/g, '_')}_table`,
          matched_column_id: `${f.field.toLowerCase().replace(/\s+/g, '_')}_col`,
          confidence: 0.92,
          basis: 'name',
        }));

      const optionalMappings = body.templateFields
        .filter((f) => !f.required)
        .map((f) => ({
          template_entity: f.entity,
          template_field: f.field,
          role: f.role,
          matched_table_id: `${f.entity.toLowerCase().replace(/\s+/g, '_')}_table`,
          matched_column_id: `${f.field.toLowerCase().replace(/\s+/g, '_')}_col`,
          confidence: 0.78,
          basis: 'type',
        }));

      return reply.send({
        mappings: [...requiredMappings, ...optionalMappings],
        unmapped_required: [],
        questions: [],
      });
    },
  );
}
