import { RouterModule } from '@angular/router';
import { Component, OnInit, Renderer, ViewChild, ElementRef,NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MsalService }  from '../services/msal.service';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Socket } from 'ng-socket-io';
import * as io from 'socket.io-client';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import * as data from '../../../config'
import { concat } from 'rxjs/operators/concat';
import { concatAll } from 'rxjs/operators/concatAll';

declare var $:any;
export interface RouteInfo {
    path: string;
    title: string;
    icon: string;
    class: string;
}

export const ROUTES: RouteInfo[] = [
    { path: 'dashboard', title: 'Dashboard',  icon: 'ti-dashboard', class: '' },
    { path: 'cameras', title: 'Cameras',  icon: 'ti-video-camera', class: '' },
    { path: 'configuration', title: 'Configuration',  icon:'ti-settings', class: '' },
    { path: 'reports', title: 'Reports',  icon:'ti-bar-chart-alt', class: '' },  
    // { path: 'notifications', title: 'Notifications',  icon:'ti-bell', class: '' }
];

@Component({
    moduleId: module.id,
    selector: 'sidebar-cmp',
    templateUrl: 'sidebar.component.html',
    styleUrls:['./sidebar.component.scss']
})

export class SidebarComponent  {
    vmUrl: string;
    role: string;
    isActive: boolean = false;
    showMenu: string = '';
    pushRightClass: string = 'push-right';
    socket: SocketIOClient.Socket;
    notifyFlag: boolean;

    addExpandClass(element: any) {
        if (element === this.showMenu) {
            this.showMenu = '0';
        } else {
            this.showMenu = element;
        }
    }

    // isToggled(): boolean {
    //     const dom: Element = document.querySelector('body');
    //     return dom.classList.contains(this.pushRightClass);
    // }
    constructor(private msalService: MsalService, public router: Router,private zone: NgZone, private http: HttpClient, public domSanitizer: DomSanitizer) {
        this.vmUrl = data.configData.vmUrl;
        this.socket = io.connect(this.vmUrl, { secure: true });
        this.notifyFlag = false;
        // this.location = location;
        // this.nativeElement = element.nativeElement;
        // this.sidebarVisible = false;
    }
    public menuItems: any[];
    ngOnInit() {
        this.menuItems = ROUTES.filter(menuItem => menuItem);
        this.getUser();
        this.socketConnection();
    }

    socketConnection(){
        this.socket.on('notification', (data: any) => {
            console.log("Notification:",data.message); 
            if(data.message){
                this.changeIcon();
            }               
        });
    };

    getUser(){
        this.http.get<any>(this.vmUrl + '/users', 
        ).subscribe(
      res => {
        console.log("Sidebar response:",res);
        this.role = res.role;
      },
      err => {
        console.log("Error occured");
      });
    };

    changeIcon(){
        this.notifyFlag = true;
    };
    isNotMobileMenu(){
        if($(window).width() > 991){
            return false;
        }
        return true;
    }
    logout(): void {
        this.msalService.logout();
    };



}


    