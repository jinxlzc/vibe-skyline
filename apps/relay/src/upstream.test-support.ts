import { vi } from 'vitest';
import { request, type RequestOptions } from 'node:https';
import type { IncomingMessage, ClientRequest } from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

export function respond(status = 200, body = 'synthetic') {
  vi.mocked(request).mockImplementation(((url: URL, options: RequestOptions, callback: (res: IncomingMessage) => void) => {
    const stream = new PassThrough();
    const res = stream as unknown as IncomingMessage;
    res.statusCode = status;
    const req = new EventEmitter() as ClientRequest;
    req.end = (() => {
      queueMicrotask(() => { callback(res); stream.end(body); });
      return req;
    }) as ClientRequest['end'];
    req.destroy = (error?: Error) => {
      res.destroy();
      if (error) queueMicrotask(() => req.emit('error', error));
      return req;
    };
    return req;
  }) as typeof request);
}
