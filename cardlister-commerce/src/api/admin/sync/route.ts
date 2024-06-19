import { BatchJob, BatchJobService, MedusaRequest, MedusaResponse } from '@medusajs/medusa';

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.json({ status: 'ok' });
  res.sendStatus(200);
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  console.log('starting batch for ', req.user);
  const batchJobService: BatchJobService = req.scope.resolve('batchJobService');
  const response: BatchJob = await batchJobService.create({
    type: 'sportlots-sync',
    context: { category_id: req.body.category },
    dry_run: false,
    created_by: req.user.id,
  });
  res.json({ status: 'ok', category: req.body.category, job: response });
  // res.sendStatus(200);
}
