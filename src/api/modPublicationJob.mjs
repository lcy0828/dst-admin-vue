import { adapterError } from './adapterProtocol.mjs'

const PUBLICATION_PAGE_SIZE = 100

export async function resolveModPublicationJob({
  roomId,
  job,
  timeout,
  onProgress,
  waitForJob,
  listPublications,
  existingPublicationId,
  getPublication
}) {
  const completedJob = await waitForJob(job, timeout, onProgress)
  const sourceJobId = completedJob?.id

  if (existingPublicationId && getPublication) {
    return getPublication(existingPublicationId)
  }

  let offset = 0

  while (sourceJobId) {
    const response = await listPublications({ limit: PUBLICATION_PAGE_SIZE, offset })
    const items = Array.isArray(response?.items) ? response.items : []
    const publication = items.find(item => item?.sourceJobId === sourceJobId)
    if (publication) return publication

    const total = Number(response?.total)
    const hasMore = Number.isInteger(total) && offset + items.length < total
    if (!hasMore || items.length === 0) break
    offset += items.length
  }

  throw adapterError('MOD_PUBLICATION_RESULT_MISSING', {
    context: { roomId, jobId: sourceJobId || job?.id || '' }
  })
}
