import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, ActivatedRoute, NavigationExtras } from '@angular/router';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import { Chart } from 'chart.js';
declare var $: any;
import * as data from '../../../../config'
import { ToastrService } from '../../services/toastr.service' ;

@Component({
  selector: 'home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  user: string;
  vmUrl: string;
  constructor(private toastrService: ToastrService,public router: Router, private route: ActivatedRoute, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
    this.user = JSON.parse(localStorage.getItem('user'));
    this.vmUrl = data.configData.vmUrl;
  }

  ngOnInit() {
  }

  connectCamera() {    
    this.http.get<any[]>(this.vmUrl + '/aggregators?status=0,2'
    ).subscribe(data => {
      console.log("Aggregators:", data);
      var aggrLength = data.length;
      this.http.get<any[]>(this.vmUrl + '/computeengines?status=0,2'
    ).subscribe(data => {
      console.log("Compute engines:", data);
      var compLength = data.length;
      if (aggrLength != 0 && compLength != 0) {
        this.router.navigateByUrl('/connectCameraSlider'); 
        
      }
      else {
        this.toastrService.Warning("","Add aggregator and compute engine before connecting the camera");
        this.router.navigateByUrl('/layout/dashboard');
      }
    });

    });
  }

}
