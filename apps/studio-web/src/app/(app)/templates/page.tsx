import { TemplateGallery } from '@/src/components/templates/template-gallery';

export default function TemplatesPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return (
    <div className="h-full overflow-auto px-6 py-8">
      <TemplateGallery initialTemplateId={searchParams['id']} />
    </div>
  );
}
