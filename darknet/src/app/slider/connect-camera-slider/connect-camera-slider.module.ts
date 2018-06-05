import { NgModule } from '@angular/core';
//import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ConnectCameraComponent } from '../../components/connect-camera/connect-camera.component';

@NgModule({
    imports: [
        NavbarComponent,ConnectCameraComponent
    ],
    declarations: [NavbarComponent,ConnectCameraComponent],
})
export class connectCameraSliderModule { }