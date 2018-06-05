import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AggregatorComponent } from './aggregator/aggregator.component';
import { ComputeEngineComponent } from './compute-engine/compute-engine.component';
import { FloorMapComponent } from './floor-map/floor-map.component';
import { PlotCameraComponent } from './plot-camera/plot-camera.component';
import { ConfigurationComponent } from './configuration.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  declarations: [
    AggregatorComponent,
    ComputeEngineComponent,
    FloorMapComponent,
    PlotCameraComponent,
    ConfigurationComponent]
})
export class ConfigurationModule { }
