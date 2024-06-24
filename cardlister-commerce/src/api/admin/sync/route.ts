import { BatchJob, BatchJobService, MedusaRequest, MedusaResponse } from '@medusajs/medusa';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.json({ status: 'ok' });
  res.sendStatus(200);
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const batchJobService: BatchJobService = req.scope.resolve('batchJobService');
  const responses: BatchJob[] = [];

  if (!req.body.only || req.body.only.includes('sportlots')) {
    responses.push(
      await batchJobService.create({
        type: 'sportlots-sync',
        context: { category_id: req.body.category },
        dry_run: false,
        created_by: req.user.id,
      }),
    );
  }

  if (!req.body.only || req.body.only.includes('bsc')) {
    responses.push(
      await batchJobService.create({
        type: 'bsc-sync',
        context: { category_id: req.body.category },
        dry_run: false,
        created_by: req.user.id,
      }),
    );
  }

  res.json({ status: 'ok', category: req.body.category, job: responses });
}
