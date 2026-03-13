import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PropertySecurityService } from './property-security.service';

@Injectable()
export class PropertySecurityInterceptor implements NestInterceptor {
  constructor(private readonly propertySecurity: PropertySecurityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const clearance = this.propertySecurity.getClearanceLevel(request);
    const method = request.method.toUpperCase() as string;

    // POST / PUT / PATCH — block before the handler runs if a body property
    // has a security level that exceeds the caller's clearance.
    if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
      return from(
        this.propertySecurity.findBlockedWriteProperty(request.body, clearance),
      ).pipe(
        switchMap(blockedKey => {
          if (blockedKey) {
            throw new ForbiddenException(
              `Insufficient clearance to write property: ${blockedKey}`,
            );
          }
          // After passing the write check, still mask the response for consistency.
          return next.handle().pipe(
            switchMap(data => from(this.propertySecurity.maskObject(data, clearance))),
          );
        }),
      );
    }

    // GET — mask any property values that exceed clearance.
    if (method === 'GET') {
      return next.handle().pipe(
        switchMap(data => from(this.propertySecurity.maskObject(data, clearance))),
      );
    }

    // DELETE and other methods — no property-level check needed.
    return next.handle();
  }
}
