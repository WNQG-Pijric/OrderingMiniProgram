import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CosModule } from '../cos/cos.module';
import { AdminCategoryController } from './admin-category.controller';
import { AdminCosController } from './admin-cos.controller';
import { AdminMenuController } from './admin-menu.controller';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [AdminModule, CosModule],
  controllers: [
    MenuController,
    AdminMenuController,
    AdminCategoryController,
    AdminCosController,
  ],
  providers: [MenuService],
})
export class MenuModule {}
