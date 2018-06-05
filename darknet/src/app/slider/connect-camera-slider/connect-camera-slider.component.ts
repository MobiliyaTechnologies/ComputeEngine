import { Component, OnInit ,NgZone, NgModule } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ng-socket-io';

@Component({
  selector: 'connectCameraSlider',
  templateUrl: './connect-camera-slider.component.html',
  styleUrls: ['./connect-camera-slider.component.css']
})
export class ConnectCameraSliderComponent implements OnInit {

  stageHere=1;
 constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
 }
  ngOnInit() {
  }

}
