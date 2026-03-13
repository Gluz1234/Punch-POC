import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AuthzGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const isAdmin = request.headers['x-authz-is-admin'] === 'true';
    if (isAdmin) return true;

    const method = request.method.toUpperCase();

    if (method === 'GET') {
      if (request.headers['x-authz-read'] !== 'true') {
        throw new ForbiddenException('Read access denied');
      }
    } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      if (request.headers['x-authz-write'] !== 'true') {
        throw new ForbiddenException('Write access denied');
      }
    }

    return true;
  }
}
