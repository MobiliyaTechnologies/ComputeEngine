import { NgModule } from '@angular/core';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { CameraMappingComponent } from '../../components/camera-mapping/camera-mapping.component';

@NgModule({
    imports: [
        NavbarComponent,CameraMappingComponent
    ],
    declarations: [NavbarComponent,CameraMappingComponent],
})
export class cameraMappingSliderModule { }