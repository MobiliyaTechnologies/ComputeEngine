import { Component, OnInit, NgZone, NgModule, ElementRef, ViewChild, Input, Output, EventEmitter, HostListener } from '@angular/core';
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

declare var $:any;

@Component({
    selector: 'notifications-cmp',
    moduleId: module.id,
    templateUrl: 'notifications.component.html',
    styleUrls: ['./notifications.component.css']
})

export class NotificationsComponent{
    vmUrl: String;
    notifications: any[];
    notificationsFlag: boolean;
    constructor(public router: Router, private http: HttpClient, private zone: NgZone, public domSanitizer: DomSanitizer) {
        this.vmUrl = data.configData.vmUrl;
        this.notifications = [];
    }
    ngOnInit() {
        sessionStorage.setItem("selectedCamIndex", "0");
        sessionStorage.setItem("selectedAggrIndex", "0");
        this.getNotifications();    
    }

    getNotifications(){
        this.notifications = [];
        this.http.get<any[]>(this.vmUrl + '/notifications'
        ).subscribe(
      res => {
        
        if(res.length!=0){
            this.notificationsFlag = true;
            this.notifications = res;
            console.log("Notifications", this.notifications);
        }
        else{
            this.notificationsFlag = false;
        }
        
      },
      err => {
        console.log("Error occured");
      });
    };
}
