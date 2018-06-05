import { Component, OnInit ,NgZone, NgModule } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders,HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable'
 
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as Chartist from 'chartist';
declare var $:any;
import * as data from '../../../../config'

@Component({
  selector: 'connectcameras',
  templateUrl: './slide1.component.html',
  styleUrls: ['./slide1.component.css']
})
export class Slide1Component implements OnInit {

  text1 = "Connect your installed camera with its unique aggregator ";
  text2 = "and evaluate the situation";
  vmUrl: string;
  user: string;
  homepageFlag:boolean;
  constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) { 
    this.vmUrl = data.configData.vmUrl;
    this.homepageFlag = false;
    this.user = JSON.parse(localStorage.getItem('user'));
  }

  ngOnInit() {
    sessionStorage.setItem("selectedCamIndex", "0");
    sessionStorage.setItem("selectedAggrIndex", "0");
     //this.getCameras();
    }



   public myfunc(event: Event) {

  }

  skip()
  {
     this.router.navigateByUrl('/home');
  }
  next()
  {
     this.router.navigateByUrl('/cameramapping');
  }

    getCameras(){
    var substring = '';
    this.http.get<any[]>(this.vmUrl + '/cameras?deviceName='+substring
    ).subscribe(
    res => {
      console.log("Response:",res);
      if(res === null)
      {
        this.router.navigate(["/connectcamera"]);
        this.homepageFlag = true;
        
      }
      else
      {
        this.router.navigate(["/layout/dashboard"]);
        //below two lines to be commented
        // this.homepageFlag = true;
        // this.router.navigate(["/layout/homepage"]);
      }
     
    },
    err => {
      console.log("Error occured");
    });
  };

}
