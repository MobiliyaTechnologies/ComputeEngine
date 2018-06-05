import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild,Input, Output, EventEmitter, HostListener  } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { DragulaModule, DragulaService } from 'ng2-dragula/ng2-dragula';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../../config'
import { concat } from 'rxjs/operators/concat';
import { concatAll } from 'rxjs/operators/concatAll';
@Component({
  selector: 'cameraMappingDashboard',
  templateUrl: './camera-mapping-onboarding.component.html',
  styleUrls: ['./camera-mapping-onboarding.component.css']
})
export class CameraMappingOnboardingComponent implements OnInit {

  stageHere=2;
  constructor(public router: Router) {

  }

  ngOnInit() {

  }

}
