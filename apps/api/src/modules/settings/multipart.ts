import type { Request } from "express";

type MultipartFile = {
  fieldName: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

function parseContentDisposition(header: string): { name: string | null; filename: string | null } {
  const nameMatch = header.match(/name="([^"]+)"/i);
  const filenameMatch = header.match(/filename="([^"]*)"/i);

  return {
    name: nameMatch?.[1] ?? null,
    filename: filenameMatch?.[1] ?? null
  };
}

export async function parseMultipartFile(request: Request, expectedField: string): Promise<MultipartFile> {
  const contentType = request.headers["content-type"];

  if (!contentType || !contentType.includes("multipart/form-data")) {
    throw new Error("Content-Type must be multipart/form-data");
  }

  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) {
    throw new Error("Multipart boundary is missing");
  }

  const boundary = `--${boundaryMatch[1]}`;

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks);
  const bodyText = body.toString("binary");
  const parts = bodyText.split(boundary).slice(1, -1);

  for (const rawPart of parts) {
    const part = rawPart.startsWith("\r\n") ? rawPart.slice(2) : rawPart;
    const headerEnd = part.indexOf("\r\n\r\n");

    if (headerEnd === -1) {
      continue;
    }

    const headerBlock = part.slice(0, headerEnd);
    const contentBlock = part.slice(headerEnd + 4);
    const trimmedContent = contentBlock.endsWith("\r\n") ? contentBlock.slice(0, -2) : contentBlock;

    const headers = headerBlock.split("\r\n");
    const disposition = headers.find((header) => header.toLowerCase().startsWith("content-disposition:"));
    const typeHeader = headers.find((header) => header.toLowerCase().startsWith("content-type:"));

    if (!disposition) {
      continue;
    }

    const parsedDisposition = parseContentDisposition(disposition);

    if (parsedDisposition.name !== expectedField || !parsedDisposition.filename) {
      continue;
    }

    const mimeType = typeHeader?.split(":")[1]?.trim() ?? "application/octet-stream";

    return {
      fieldName: expectedField,
      fileName: parsedDisposition.filename,
      mimeType,
      buffer: Buffer.from(trimmedContent, "binary")
    };
  }

  throw new Error(`No file was uploaded in field '${expectedField}'`);
}
