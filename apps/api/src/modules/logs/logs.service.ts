import prisma from "../../config/prisma";
import type { ListLogsQuery } from "./logs.schema";

export type LogsListResponse = {
  items: Array<{
    id: string;
    invoiceId: string | null;
    level: string;
    source: string;
    message: string;
    context: unknown;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export class LogsService {
  async list(query: ListLogsQuery): Promise<LogsListResponse> {
    const where = {
      ...(query.level ? { level: query.level } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.invoiceId ? { sageInvoiceId: query.invoiceId } : {})
    };
    const skip = (query.page - 1) * query.pageSize;

    const [totalItems, logs] = await prisma.$transaction([
      prisma.syncLog.count({ where }),
      prisma.syncLog.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          sageInvoiceId: true,
          level: true,
          source: true,
          message: true,
          context: true,
          createdAt: true
        }
      })
    ]);

    return {
      items: logs.map((log) => ({
        id: log.id,
        invoiceId: log.sageInvoiceId,
        level: log.level,
        source: log.source,
        message: log.message,
        context: log.context,
        createdAt: log.createdAt.toISOString()
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize)
      }
    };
  }
}
