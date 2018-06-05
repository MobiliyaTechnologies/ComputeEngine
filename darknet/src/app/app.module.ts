import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {HTTP_INTERCEPTORS} from '@angular/common/http';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { AppRoutes } from './app.routing';
import { SidebarModule } from './sidebar/sidebar.module';
import { FooterModule } from './shared/footer/footer.module';
import { NavbarModule} from './shared/navbar/navbar.module';
import { NguiMapModule} from '@ngui/map';
import { onBoardingComponent }   from './layout/on-boarding/on-boarding.component';
import { AlertsComponent }   from './alert/alerts.component';
import { IconsComponent }   from './icons/icons.component';
import { NotificationsComponent }   from './layout/notifications/notifications.component';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { CamerasComponent } from './layout/cameras/cameras.component';
import { ConfigurationModule } from './layout/configuration/configuration.module';
import { DisplayResultsComponent } from './layout/display-results/display-results.component';
import { ReportsComponent } from './layout/reports/reports.component';
import { TodoComponent } from './login/todo.component';
import { TodoService } from './services/todo.service';
import { MsalService } from './services/msal.service';
import { AuthInterceptor } from './services/auth.interceptor';
import { ChartsModule } from 'ng2-charts';
import * as data from '../../config';
import { SocketIoModule, SocketIoConfig } from 'ng-socket-io';
import {ImageCropperComponent} from 'ng2-img-cropper';
// import {ReactiveFormsModule, FormsModule, FormBuilder, Validators} from '@angular/forms';



// import { ConnectCameraComponent } from './layout/on-boarding/connect-camera/connect-camera.component';
// import { CameraMappingComponent } from './layout/on-boarding/camera-mapping/camera-mapping.component';
// import { AreaMarkingComponent } from './layout/on-boarding/area-marking/area-marking.component';
// import { NavbarComponent } from './layout/on-boarding/navbar/navbar.component';
import { HomepageComponent } from './layout/homepage/homepage.component';
import { DeviceManagementComponent } from './layout/device-management/device-management.component';
import { CameraManagementComponent } from './layout/device-management/camera-management/camera-management.component';
import { AggregatorManagementComponent } from './layout/device-management/aggregator-management/aggregator-management.component';
import { ComputeManagementComponent } from './layout/device-management/compute-management/compute-management.component';
import { UserManagementComponent } from './layout/user-management/user-management.component';
import { FloorMapComponent } from './layout/floor-map/floor-map.component';
import { DashboardComponent } from './layout/dashboard/dashboard.component';


import { Slide1Component } from './slider/slide1/slide1.component';
import { Slide2Component } from './slider/slide2/slide2.component';
import { Slide3Component } from './slider/slide3/slide3.component';
import { HomeComponent } from './slider/home/home.component';
import { ConnectCameraSliderComponent } from './slider/connect-camera-slider/connect-camera-slider.component';import { CameraMappingSliderComponent } from './slider/camera-mapping-slider/camera-mapping-slider.component';
import { AreaMarkingSliderComponent } from './slider/area-marking-slider/area-marking-slider.component';

import { NavbarComponent } from './components/navbar/navbar.component';
import { ConnectCameraComponent } from './components/connect-camera/connect-camera.component';
import { CameraMappingComponent } from './components/camera-mapping/camera-mapping.component';
import { AreaMarkingComponent } from './components/area-marking/area-marking.component';

import { ConnectCameraOnboardingComponent } from './layout/on-boarding/connect-camera-onboarding/connect-camera-onboarding.component';
import { CameraMappingOnboardingComponent } from './layout/on-boarding/camera-mapping-onboarding/camera-mapping-onboarding.component';
import { AreaMarkingOnboardingComponent } from './layout/on-boarding/area-marking-onboarding/area-marking-onboarding.component';
import { AngularDraggableModule } from 'angular2-draggable';
import { CameraAddedComponent } from './slider/camera-added/camera-added.component';
import { NavbarsliderComponent } from './slider/navbarslider/navbarslider.component';

import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown/angular2-multiselect-dropdown';
import { LoadingModule } from 'ngx-loading';
import { ToastrService } from './services/toastr.service';
import { FacedetectionComponent } from './layout/facedetection/facedetection.component';
import { DynamicComponent } from './layout/facedetection/dynamic/dynamic.component';
import { VideoIndexingComponent } from './layout/video-indexing/video-indexing.component';

const config: SocketIoConfig = { url: data.configData.vmUrl, options: {} };


@NgModule({
  declarations: [
    AppComponent,
    onBoardingComponent,
    AlertsComponent,
    IconsComponent,
    NotificationsComponent,
    LoginComponent,
    LayoutComponent,
    DisplayResultsComponent,
    CamerasComponent,
    ReportsComponent,
    CameraMappingComponent,
    AreaMarkingComponent,
    // NavbarComponent,
    HomepageComponent,
    DeviceManagementComponent,
    CameraManagementComponent,
    AggregatorManagementComponent,
    ComputeManagementComponent,
    UserManagementComponent,
    FloorMapComponent,
    DashboardComponent,
    Slide1Component,
    Slide2Component,
    Slide3Component,
    HomeComponent,
    ConnectCameraSliderComponent,NavbarComponent,
    ConnectCameraComponent,
    ConnectCameraOnboardingComponent,
    CameraMappingOnboardingComponent,
    AreaMarkingOnboardingComponent,
    CameraMappingSliderComponent,
    AreaMarkingSliderComponent,
    CameraAddedComponent,
    NavbarsliderComponent,FacedetectionComponent,DynamicComponent
    ,
    VideoIndexingComponent
    
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(AppRoutes),
    SidebarModule,
    NavbarModule,
    FormsModule,
    FooterModule,ReactiveFormsModule,
    NguiMapModule.forRoot({apiUrl: 'https://maps.google.com/maps/api/js?key=YOUR_KEY_HERE'}),
    HttpClientModule,
    ConfigurationModule,
    SocketIoModule.forRoot(config),
    ChartsModule,
    AngularDraggableModule,LoadingModule,
    AngularMultiSelectModule
  ],
  providers: [
    ToastrService,
    MsalService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
