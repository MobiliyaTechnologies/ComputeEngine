import { Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { onBoardingComponent } from './layout/on-boarding/on-boarding.component';
import { AlertsComponent } from './alert/alerts.component';
import { IconsComponent } from './icons/icons.component';
import { NotificationsComponent } from './layout/notifications/notifications.component';
import { ConfigurationComponent } from './layout/configuration/configuration.component';
import { AggregatorComponent } from './layout/configuration/aggregator/aggregator.component';
import { ComputeEngineComponent } from './layout/configuration/compute-engine/compute-engine.component';
import { CamerasComponent } from './layout/cameras/cameras.component';
import { FloorMapComponent } from './layout/floor-map/floor-map.component';
import { PlotCameraComponent } from './layout/configuration/plot-camera/plot-camera.component';
import { DisplayResultsComponent } from './layout/display-results/display-results.component';
import { ReportsComponent } from './layout/reports/reports.component';
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
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { Slide1Component } from './slider/slide1/slide1.component';
import { Slide2Component } from './slider/slide2/slide2.component';
import { Slide3Component } from './slider/slide3/slide3.component';
import { HomeComponent } from './slider/home/home.component';
import { ConnectCameraSliderComponent } from './slider/connect-camera-slider/connect-camera-slider.component';
import { CameraMappingSliderComponent } from './slider/camera-mapping-slider/camera-mapping-slider.component';
import { AreaMarkingSliderComponent } from './slider/area-marking-slider/area-marking-slider.component';
import { CameraAddedComponent } from './slider/camera-added/camera-added.component'

import {NavbarComponent } from './components/navbar/navbar.component'; 
import { ConnectCameraComponent } from './components/connect-camera/connect-camera.component';
import { CameraMappingComponent } from './components/camera-mapping/camera-mapping.component';
import { AreaMarkingComponent } from './components/area-marking/area-marking.component';

import { ConnectCameraOnboardingComponent } from './layout/on-boarding/connect-camera-onboarding/connect-camera-onboarding.component';
import { CameraMappingOnboardingComponent } from './layout/on-boarding/camera-mapping-onboarding/camera-mapping-onboarding.component';
import { AreaMarkingOnboardingComponent } from './layout/on-boarding/area-marking-onboarding/area-marking-onboarding.component';
import { NavbarsliderComponent } from './slider/navbarslider/navbarslider.component';
import { FacedetectionComponent } from './layout/facedetection/facedetection.component';
import { DynamicComponent } from './layout/facedetection/dynamic/dynamic.component';
import { VideoIndexingComponent } from './layout/video-indexing/video-indexing.component';

export const AppRoutes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
    },
    {
        path: 'login',
        component: LoginComponent
    },
            {
        path: 'navbarslider',
        component: NavbarsliderComponent
    },
        {
        path: 'connectcameras',
        component: Slide1Component
    },
        {
        path: 'cameramapping',
        component: Slide2Component
    },
        {
        path: 'areamarking',
        component: Slide3Component
    },
        {
        path: 'home',
        component: HomeComponent
    },
        {
        path: 'connectCameraSlider',
        component: ConnectCameraSliderComponent
    },
            {
        path: 'cameraMappingSlider',
        component: CameraMappingSliderComponent
    },
            {
        path: 'areaMarkingSlider',
        component: AreaMarkingSliderComponent
    },
            {
        path: 'cameraAdded',
        component: CameraAddedComponent
    },

        {
        path: 'navbar',
        component: NavbarComponent
    },
        {
        path: 'connectCamera',
        component: ConnectCameraComponent
    },
            {
        path: 'cameraMapping',
        component: CameraMappingComponent
    },
            {
        path: 'areaMarking',
        component: AreaMarkingComponent
    },
    {
        path: 'layout',
        component: LayoutComponent,
        children: [
            {
                path: '',
                component: HomepageComponent
            },
            {
                path: 'homepage',
                component: HomepageComponent
            },
            {
                path: 'dashboard',
                component: DashboardComponent
            },
                        {
                path: 'facedetection',
                component: FacedetectionComponent
            },
                                    {
                path: 'dynamic',
                component: DynamicComponent
            },
            {
                path: 'facedetection',
                component: FacedetectionComponent
            },
            {
                path: 'deviceManagement',
                component: onBoardingComponent,
                children: [
                    {
                        path: '',
                        component: ConnectCameraOnboardingComponent
                    },
                    {
                        path: 'connectCameraDashboard',
                        component: ConnectCameraOnboardingComponent
                    },
                    {
                        path: 'cameraMappingDashboard',
                        component: CameraMappingOnboardingComponent
                    },
                    {
                        path: 'areaMarkingDashboard',
                        component: AreaMarkingOnboardingComponent
                    }
                 ]
             },
            {
                path: 'displayResults',
                component: DisplayResultsComponent
            },
            {
                path: 'userManagement',
                component: UserManagementComponent
            },
            {
                path: 'floorMap',
                component: FloorMapComponent
            },
            {
                path: 'cameras',
                component: CamerasComponent
            },
            {
                path: 'reports',
                component: ReportsComponent
            },
            {
                path: 'videoIndexing',
                component: VideoIndexingComponent
            },
            {
                path: 'notifications',
                component: NotificationsComponent
            },
            {
                path: 'devices',
                component: DeviceManagementComponent,
                children: [
                    {
                        path: 'Cameras',
                        component: CameraManagementComponent
                    },
                    {
                        path: 'aggregators',
                        component: AggregatorManagementComponent
                    },
                    {
                        path: 'computeEngines',
                        component: ComputeManagementComponent
                    }
                ]
            }
        ]
    },
]
