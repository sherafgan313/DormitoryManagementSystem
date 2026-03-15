import { NgModule } from '@angular/core';
import { AppComponent } from './app';
import { CoreModule } from './core.module';
import { StudentModule } from './modules/student.module';
import { AdminModule } from './modules/admin.module';

/**
 * AppModule — root Angular module responsible for bootstrapping the application
 * and registering core components and feature modules.
 *
 * Note: This project uses the Angular 17+ standalone bootstrapApplication()
 * pattern in main.ts. This module exists as the NgModule-based equivalent
 * of the app configuration, grouping all feature modules for reference.
 */
@NgModule({
  imports: [
    AppComponent,
    CoreModule,
    StudentModule,
    AdminModule,
  ],
})
export class AppModule {}
