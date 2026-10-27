import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
@Catch()
export class ApiErrors implements ExceptionFilter {
 catch(error:unknown,host:ArgumentsHost){
 let status=500,code='INTERNAL_ERROR',message='An unexpected error occurred';
 if(error instanceof ZodError){status=400;code='VALIDATION_ERROR';message=error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ');}
 else if(error instanceof HttpException){status=error.getStatus();code='HTTP_'+status;message=error.message;}
 else if(error instanceof Prisma.PrismaClientKnownRequestError){status=error.code==='P2025'?404:error.code==='P2002'?409:error.code==='P2034'?409:400;code='DATA_'+error.code;message=status===404?'Record not found':status===409?'Write conflict; reload and retry':'Invalid data reference';}
 if(status===500)console.error(JSON.stringify({level:'error',event:'request.failed',kind:error instanceof Error?error.name:'unknown'}));
 host.switchToHttp().getResponse().status(status).json({error:{code,message}});
 }
}
