import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';


@Component({
  selector: 'cameraAdded',
  templateUrl: './camera-added.component.html',
  styleUrls: ['./camera-added.component.css']
})
export class CameraAddedComponent implements OnInit {

  constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer)  { }

  ngOnInit() {
  }

  goToDashboard()
  {
    this.router.navigate(["/layout/dashboard"]);
  }
}
