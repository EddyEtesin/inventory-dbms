import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermissions } from './decorators/permissions.decorator';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.getCurrentUser(
      request.user,
    );
  }

  @Get('setup/progress')
  @UseGuards(JwtAuthGuard)
  getSetupProgress(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.getSetupProgress(
      request.user,
    );
  }

  @Post('setup/start')
  @UseGuards(JwtAuthGuard)
  startSetup(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.startSetup(
      request.user,
    );
  }

  @Post('setup/complete')
  @UseGuards(JwtAuthGuard)
  completeSetup(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.completeSetup(
      request.user,
    );
  }
  @Get('rbac-test')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @RequirePermissions(
    'organization.update',
  )
  testRbac(
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      status: 'ok',
      message:
        'You have organization.update permission.',
      user: request.user,
    };
  }
}