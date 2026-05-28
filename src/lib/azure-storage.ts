import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  type ContainerClient,
  type BlockBlobUploadOptions,
} from "@azure/storage-blob";

let _blobServiceClient: BlobServiceClient | null = null;

function getConfig() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
  const folderName = process.env.AZURE_STORAGE_FOLDER_NAME;

  if (!accountName || !accountKey || !containerName) {
    throw new Error(
      "Missing Azure Storage configuration. Set AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, and AZURE_STORAGE_CONTAINER_NAME."
    );
  }

  return { accountName, accountKey, containerName, folderName };
}

function getBlobServiceClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    const { accountName, accountKey } = getConfig();
    const cred = new StorageSharedKeyCredential(accountName, accountKey);
    _blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      cred
    );
  }
  return _blobServiceClient;
}

function getContainerClient(): ContainerClient {
  const { containerName } = getConfig();
  return getBlobServiceClient().getContainerClient(containerName);
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w\u0590-\u05FF\u0600-\u06FF.\-_ ]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[./\\]+/, "")
    .slice(0, 200);
}

function sanitizeAsciiHeaderFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 200) || "file";
}

function createContentDisposition(fileName: string): string {
  const fallbackFileName = sanitizeAsciiHeaderFileName(fileName);
  return `inline; filename="${fallbackFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function buildBlobPath(params: {
  projectId?: string;
  stepId?: string;
  fieldName?: string;
  fileName: string;
  isSummary?: boolean;
  clientName?: string;
  requestedAgentName?: string;
  documentAuthorName?: string;
}): string {
  const {
    projectId,
    stepId,
    fileName,
    isSummary,
    clientName,
    requestedAgentName,
    documentAuthorName,
  } = params;
  const timestamp = Date.now();
  const safe = sanitizeFileName(fileName);

  const { folderName } = getConfig();
  const basePath = folderName ? `${folderName}/` : "";

  if (isSummary) {
    const safeClientName = sanitizeFileName(clientName || "unknown-client");
    const safeAgentName = sanitizeFileName(requestedAgentName || "unknown-agent");
    const safeAuthorName = sanitizeFileName(documentAuthorName || "unknown-author");
    const summaryRoot = basePath || "lior/";
    const summaryFileName = `${safeAgentName}-${safeAuthorName}.docx`;

    return `${summaryRoot}${safeClientName}/${safeAgentName}/${summaryFileName}`;
  }

  const id = projectId || "draft";
  const step = stepId || "general";
  return `${basePath}inquiries/${id}/uploads/${step}/${timestamp}-${safe}`;
}

export interface UploadFileToBlobParams {
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
  projectId?: string;
  stepId?: string;
  fieldName?: string;
  isSummary?: boolean;
  clientName?: string;
  requestedAgentName?: string;
  documentAuthorName?: string;
  overrideBlobPath?: string;
}

export interface UploadFileToBlobResult {
  blobPath: string;
  blobUrl: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export async function uploadFileToBlob(
  params: UploadFileToBlobParams
): Promise<UploadFileToBlobResult> {
  const {
    buffer,
    originalFileName,
    mimeType,
    projectId,
    stepId,
    fieldName,
    isSummary,
    clientName,
    requestedAgentName,
    documentAuthorName,
    overrideBlobPath,
  } = params;

  const blobPath = overrideBlobPath || buildBlobPath({
    projectId,
    stepId,
    fieldName,
    fileName: originalFileName,
    isSummary,
    clientName,
    requestedAgentName,
    documentAuthorName,
  });
  const savedFileName = blobPath.split("/").pop() || originalFileName;

  const containerClient = getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  const options: BlockBlobUploadOptions = {
    blobHTTPHeaders: {
      blobContentType: mimeType,
      blobContentDisposition: createContentDisposition(savedFileName),
    },
  };

  await blockBlobClient.uploadData(buffer, options);

  return {
    blobPath,
    blobUrl: blockBlobClient.url,
    fileName: savedFileName,
    mimeType,
    size: buffer.length,
  };
}

export async function copyBlobInContainer(
  sourceBlobPath: string,
  destinationBlobPath: string
): Promise<{ blobPath: string; blobUrl: string }> {
  if (sourceBlobPath.includes("..") || destinationBlobPath.includes("..")) {
    throw new Error("Invalid blob path");
  }

  const containerClient = getContainerClient();
  const sourceBlob = containerClient.getBlobClient(sourceBlobPath);
  const sourceProperties = await sourceBlob.getProperties();

  const downloadResponse = await sourceBlob.download(0);
  const stream = downloadResponse.readableStreamBody;
  if (!stream) throw new Error("Failed to download source blob");

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  const destBlockBlob = containerClient.getBlockBlobClient(destinationBlobPath);
  await destBlockBlob.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType:
        sourceProperties.contentType || "application/octet-stream",
      blobContentDisposition: createContentDisposition(
        destinationBlobPath.split("/").pop() || "file"
      ),
    },
  });

  return {
    blobPath: destinationBlobPath,
    blobUrl: destBlockBlob.url,
  };
}

export async function deleteBlobByPath(blobPath: string): Promise<void> {
  if (blobPath.includes("..") || blobPath.startsWith("/")) {
    throw new Error("Invalid blob path");
  }
  const containerClient = getContainerClient();
  const blobClient = containerClient.getBlobClient(blobPath);
  await blobClient.deleteIfExists();
}

export async function deleteBlobsByPrefix(prefix: string): Promise<number> {
  if (prefix.includes("..") || prefix.startsWith("/")) {
    throw new Error("Invalid blob prefix");
  }
  const containerClient = getContainerClient();
  let count = 0;
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    await containerClient.getBlobClient(blob.name).deleteIfExists();
    count++;
  }
  return count;
}

export async function getBlobStream(blobPath: string) {
  if (blobPath.includes("..") || blobPath.startsWith("/")) {
    throw new Error("Invalid blob path");
  }

  const containerClient = getContainerClient();
  const blobClient = containerClient.getBlobClient(blobPath);

  const exists = await blobClient.exists();
  if (!exists) {
    return null;
  }

  const downloadResponse = await blobClient.download(0);
  const properties = await blobClient.getProperties();

  return {
    stream: downloadResponse.readableStreamBody,
    contentType: properties.contentType || "application/octet-stream",
    contentLength: properties.contentLength || 0,
    fileName: blobPath.split("/").pop() || "file",
  };
}
