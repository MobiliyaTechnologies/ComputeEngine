import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { MsalService } from '../services/msal.service';

import * as data from '../../../config';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from '../services/toastr.service';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginFlag: boolean;
  vmUrl: string;
  role: string;
  public loading = false;

  constructor(private router: Router, private http: HttpClient, private location: Location,
    private msalService: MsalService,private toastrService: ToastrService) {
    //this.loginFlag= false;
    //this.loading = false;
    
    this.vmUrl = data.configData.vmUrl;
  }

  ngOnInit() {
    if (this.isOnline()) {
      if(sessionStorage.getItem('loaderflag') === 'true'){
        this.loading = true;
      }
      else{
        this.loading = false;
      }
      setTimeout(() => {    //<<<---    using ()=> syntax
        this.getUser();
      }, 4000);
      //this.router.navigate(["/connectcamera"]);
    }
  }

  getUser() {
    this.http.get<any>(this.vmUrl + '/users',
    ).subscribe(
      res => {
        console.log(res);
        this.cameraGet(res.role);
        sessionStorage.setItem("userId", res.email);
        sessionStorage.setItem("role", res.role);
      },
      err => {
        console.log("Error occured");
        //this.toastrService.Error("","Backend server is not connected");
        sessionStorage.setItem('loaderflag','false');
      }
      );
  };

  cameraGet(role){
    var substring = '';
    this.http.get<any[]>(this.vmUrl + '/cameras?deviceName=' + substring
    ).subscribe(
      res => {
        sessionStorage.setItem('loaderflag','false');
        console.log("CAM response:", res);
        if (res.length === 0 && (role === 'SuperAdmin' || role=== 'Admin')) {
          this.router.navigate(["/connectcameras"]);
        }
        else {
          this.router.navigate(["/layout/dashboard"]);
        }

      },
      err => {
        console.log("Error occured");
        this.router.navigate(["/layout/dashboard"]);
        //this.toastrService.Error("","Cannot get the camera list. redirecting to dashboard");
        sessionStorage.setItem('loaderflag','false');
      });
  }

  signIn(): void {
    //this.loginFlag = true;
    this.loading = true;
    this.msalService.login();
  }

  // signUp(): void{
  //   this.msalService.signup();
  // }
  isActive(viewLocation: any): boolean {
    return viewLocation === this.location.path();
  };

  isOnline(): boolean {
    return this.msalService.isOnline();
  };

   
}
