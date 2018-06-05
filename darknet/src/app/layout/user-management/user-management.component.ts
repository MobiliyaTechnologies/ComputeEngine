import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../../config'
import { concat } from 'rxjs/operators/concat';
import { concatAll } from 'rxjs/operators/concatAll';
@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  vmUrl: string;
  public loading;
  userDetails: any[];
  userFlag: boolean;
  role: string;
  _id: string;
  constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) { 
    this.vmUrl = data.configData.vmUrl;
    this.userDetails = [];
    this.role='';
    this._id='';
  }

  ngOnInit() {
    this.loading = true;
    sessionStorage.setItem("selectedCamIndex", "0");
    sessionStorage.setItem("selectedAggrIndex", "0");
    this.getUsers();
  }

  getUsers(){
    this.userDetails = [];
    this.http.get<any[]>(this.vmUrl + '/roles'
  ).subscribe(

    res => {
      console.log("response", res);
      this.loading = false;
      res.forEach(item => {
        this.userDetails.push({"_id":item._id, "emailId":item.emailId, "firstname": item.firstName,"lastname":item.lastName,"role":item.role });
      });
      //console.log("camRtspUrls: ", this.camRtspUrls);
      console.log("Cameras: ", this.userDetails);
    },
    err => {
      this.loading = false;
      console.log("Error occured");
    }
    );  
  };

  editUser(item){
    this.role = item.role;
    this._id = item._id;
  };

  updateUser(){
    console.log("ID:",this._id ,"Role:", this.role);
    var requestData = {'role': this.role};
    this.http.put(this.vmUrl + '/roles/'+this._id, requestData, 
    )
    .subscribe(
    res => {
      console.log("In updated role data", JSON.stringify(res));
      this.getUsers();
    },
    err => {
      console.log("Error occured");
      console.log("error response", err);
      if (err.status == 409) {
        window.alert("cannot update role");
      }
    }
    );
  };

  deleteUser(item){
    this.http.delete(this.vmUrl + '/users/' + item.emailId,
    { observe: 'response' }
    ).subscribe(
    (res: any) => {
      console.log("Userremove:");
      console.log(res.status);
      if (res.status == 204) {
        this.getUsers();
      }
    },
    err => {
      console.log("Error response", err);
      if (err.status == 500) {
        window.alert(err);
      }
    }
    )

  };
}
